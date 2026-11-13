"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  ControlButton,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Plus,
  RotateCcw,
  GitBranch,
  ArrowRight,
  Loader2,
  FolderTree,
  X,
  Network,
  Sparkles,
  ChevronLeft,
  Download,
  ImageDown,
  FileCode,
  ChevronDown,
  Check,
  Github,
  Search,
} from "lucide-react";
import CustomNode from "@/components/CustomNode";
import GroupNode from "@/components/GroupNode";
import NodeInspectorPanel from "@/components/NodeInspectorPanel";
import ContextMenu from "@/components/ContextMenu";
import { getLayoutedElements } from "@/utils/layout";
import { exportReactFlowAsImage } from "@/utils/react-flow-export";
import {
  snapEdgesToNearestConnectionPoints,
  getNearestConnectionHandles,
} from "@/src/utils/edge-snapping";
import { getNodeCategoryStyle } from "@/src/utils/node-category-styles";
import { resolveNodeCollisions } from "@/src/utils/node-collision";
import {
  clampContextMenuPosition,
  type ContextMenuState,
} from "@/src/utils/context-menu-utils";
import {
  initialNodes,
  initialEdges,
  parseGitHubRepoUrl,
  buildRepoTopology,
  computeGraphMetrics,
  createDownstreamNode,
  deriveArchitectureFromFiles,
  type CustomNodeData,
  type NodeCategory,
  type TopologyPreset,
} from "@/lib/repo-graph";

const STATIC_NODE_TYPES = { custom: CustomNode, group: GroupNode };

const BG_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4";
const BG_POSTER_URL =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp";

const DEFAULT_REPO_FILES: string[] = [
  "package.json",
  "next.config.ts",
  "tsconfig.json",
  "tailwind.config.ts",
  "README.md",
  "Dockerfile",
  "docker-compose.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/globals.css",
  "src/app/api/generate/route.ts",
  "src/app/api/github/route.ts",
  "src/components/CustomNode.tsx",
  "src/components/GroupNode.tsx",
  "src/components/NodeInspectorPanel.tsx",
  "src/lib/repo-graph.ts",
  "src/utils/layout.ts",
  "src/utils/react-flow-export.ts",
  "docs/architecture.md",
  "docs/pipeline-guide.md",
  "tests/topology.test.ts",
  "tests/export.test.ts",
];

function renderHighlightedFilePath(filePath: string, query: string) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return filePath;
  const lowerPath = filePath.toLowerCase();
  const matchIndex = lowerPath.indexOf(trimmed);
  if (matchIndex === -1) return filePath;

  const before = filePath.slice(0, matchIndex);
  const matched = filePath.slice(matchIndex, matchIndex + trimmed.length);
  const after = filePath.slice(matchIndex + trimmed.length);

  return (
    <>
      {before}
      <span className="bg-[#00f3ff]/25 text-[#00f3ff] font-semibold rounded-xs px-0.5">
        {matched}
      </span>
      {after}
    </>
  );
}

export default function RepoFlowApp() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<CustomNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [repoInput, setRepoInput] = useState(
    "https://github.com/vercel/next.js"
  );
  const [activePreset, setActivePreset] = useState<TopologyPreset>("starter");
  const [layoutDirection, setLayoutDirection] = useState<"LR" | "TB">("TB");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string | null>(null);
  const [isVisualizerActive, setIsVisualizerActive] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scannedRepoInfo, setScannedRepoInfo] = useState<{
    owner: string;
    repo: string;
    defaultBranch: string;
    files: string[];
  }>({
    owner: "vercel",
    repo: "next.js",
    defaultBranch: "canary",
    files: DEFAULT_REPO_FILES,
  });
  const [showFilesDrawer, setShowFilesDrawer] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [copiedFilePath, setCopiedFilePath] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<"png" | "svg" | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [menu, setMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    id: "",
    type: "node",
  });

  const filteredFiles = useMemo(() => {
    if (!scannedRepoInfo?.files) return [];
    const query = fileSearchQuery.trim().toLowerCase();
    if (!query) return scannedRepoInfo.files;
    return scannedRepoInfo.files.filter((filePath) =>
      filePath.toLowerCase().includes(query)
    );
  }, [scannedRepoInfo, fileSearchQuery]);

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const nodeTypes = useMemo(() => STATIC_NODE_TYPES, []);

  // Close export menu on outside click or Escape
  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as globalThis.Node;
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setExportMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportMenuOpen(false);
    };
    document.addEventListener("click", handleDocClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [exportMenuOpen]);

  const handleExport = useCallback(
    async (format: "png" | "svg") => {
      setIsExporting(format);
      setExportMenuOpen(false);
      try {
        const parsed = parseGitHubRepoUrl(repoInput);
        const fileName =
          parsed.valid && parsed.repo
            ? `${parsed.owner}-${parsed.repo}-architecture`
            : "repoflow-architecture";
        await exportReactFlowAsImage({
          nodes,
          format,
          fileName,
          pixelRatio: format === "png" ? 2 : 1,
          backgroundColor: "#050508",
        });
        setExportSuccessMessage(`Exported ${format.toUpperCase()} image`);
        setTimeout(() => setExportSuccessMessage(null), 3200);
      } catch (err: unknown) {
        console.error("Export error:", err);
        setUrlError(
          err instanceof Error ? err.message : "Failed to export canvas image."
        );
      } finally {
        setIsExporting(null);
      }
    },
    [nodes, repoInput]
  );

  // Mobile menu outside-click and Escape handler
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as globalThis.Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        burgerRef.current &&
        !burgerRef.current.contains(target)
      ) {
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        burgerRef.current?.focus();
      }
    };

    document.addEventListener("click", handleDocClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const triggerFitView = useCallback(() => {
    setTimeout(() => {
      rfInstanceRef.current?.fitView({
        padding: 0.2,
        minZoom: 0.02,
        maxZoom: 1.1,
        duration: 300,
      });
    }, 80);
  }, []);

  const handleApplyLayout = useCallback(
    (direction: "LR" | "TB") => {
      setLayoutDirection(direction);
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, direction);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      triggerFitView();
    },
    [nodes, edges, setNodes, setEdges, triggerFitView]
  );

  // Connect two handles with an electric glowing smoothstep edge and nearest handle fallback
  const onConnect = useCallback(
    (connection: Connection | Edge) => {
      let sourceHandle = connection.sourceHandle;
      let targetHandle = connection.targetHandle;

      if ((!sourceHandle || !targetHandle) && connection.source && connection.target) {
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);
        if (sourceNode && targetNode) {
          const nodesMap = new Map(nodes.map((n) => [n.id, n]));
          const nearest = getNearestConnectionHandles(sourceNode, targetNode, nodesMap);
          sourceHandle = sourceHandle || nearest.sourceHandle;
          targetHandle = targetHandle || nearest.targetHandle;
        }
      }

      if (connection.source && connection.target) {
        const edgeToAdd: Edge = {
          id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: sourceHandle || undefined,
          targetHandle: targetHandle || undefined,
          type: "smoothstep",
          animated: true,
          className: "electric-edge",
        };
        setEdges((eds) => addEdge(edgeToAdd, eds));
      }
    },
    [nodes, setEdges]
  );

  const snapForDraggedNodes = useCallback(
    (draggedList: Node[]) => {
      if (!Array.isArray(draggedList) || draggedList.length === 0) return;

      const draggedById = new Map<string, Node>();
      for (const dn of draggedList) {
        if (dn?.id) draggedById.set(dn.id, dn);
      }
      if (draggedById.size === 0) return;

      // Merge updated positions of dragged nodes with the full nodes array
      const mergedNodes = nodes.map((n) => (n?.id ? draggedById.get(n.id) ?? n : n));
      const draggedIds = new Set(draggedById.keys());

      // Prevent node collisions and intersections (non-collidable nodes)
      const { nodes: collisionResolvedNodes, hasChanges: collisionChanged } =
        resolveNodeCollisions(mergedNodes, draggedIds);

      if (collisionChanged) {
        setNodes(collisionResolvedNodes);
      }

      setEdges((prevEdges) => {
        const { updatedEdges, hasChanges } = snapEdgesToNearestConnectionPoints(
          prevEdges,
          collisionResolvedNodes,
          draggedIds
        );
        return hasChanges ? updatedEdges : prevEdges;
      });
    },
    [nodes, setNodes, setEdges]
  );

  // Dynamic edge snapping as nodes are dragged across the canvas
  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node?: Node, draggedNodes?: Node[]) => {
      const list =
        Array.isArray(draggedNodes) && draggedNodes.length > 0
          ? draggedNodes
          : node?.id
          ? [node]
          : [];
      snapForDraggedNodes(list);
    },
    [snapForDraggedNodes]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node?: Node, draggedNodes?: Node[]) => {
      const list =
        Array.isArray(draggedNodes) && draggedNodes.length > 0
          ? draggedNodes
          : node?.id
          ? [node]
          : [];
      snapForDraggedNodes(list);
    },
    [snapForDraggedNodes]
  );

  const onSelectionDrag = useCallback(
    (_event: React.MouseEvent, selectedNodes?: Node[]) => {
      if (Array.isArray(selectedNodes) && selectedNodes.length > 0) {
        snapForDraggedNodes(selectedNodes);
      }
    },
    [snapForDraggedNodes]
  );

  const onSelectionDragStop = useCallback(
    (_event: React.MouseEvent, selectedNodes?: Node[]) => {
      if (Array.isArray(selectedNodes) && selectedNodes.length > 0) {
        snapForDraggedNodes(selectedNodes);
      }
    },
    [snapForDraggedNodes]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<CustomNodeData>) => {
      event.preventDefault();
      if (node.type === "group") return;
      const bounds = canvasWrapperRef.current?.getBoundingClientRect();
      const rawX = bounds ? event.clientX - bounds.left : event.clientX;
      const rawY = bounds ? event.clientY - bounds.top : event.clientY;
      const { x, y } = clampContextMenuPosition(
        rawX,
        rawY,
        bounds?.width ?? 1200,
        bounds?.height ?? 800
      );
      setMenu({
        show: true,
        x,
        y,
        id: node.id,
        type: "node",
      });
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      const bounds = canvasWrapperRef.current?.getBoundingClientRect();
      const rawX = bounds ? event.clientX - bounds.left : event.clientX;
      const rawY = bounds ? event.clientY - bounds.top : event.clientY;
      const { x, y } = clampContextMenuPosition(
        rawX,
        rawY,
        bounds?.width ?? 1200,
        bounds?.height ?? 800
      );
      setMenu({
        show: true,
        x,
        y,
        id: edge.id,
        type: "edge",
      });
    },
    []
  );

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const found = nodes.find((n) => n.id === selectedNodeId);
    if (!found) return null;
    return {
      id: found.id,
      data: found.data,
      position: found.position,
    };
  }, [nodes, selectedNodeId]);

  const metrics = useMemo(
    () => computeGraphMetrics(nodes, edges),
    [nodes, edges]
  );

  const runTwoStepRepoFlow = async (targetUrl: string) => {
    const parsed = parseGitHubRepoUrl(targetUrl);
    if (!parsed.valid || !parsed.owner || !parsed.repo) {
      setUrlError(parsed.error || "Invalid GitHub URL provided.");
      return;
    }

    setUrlError(null);
    setSelectedNodeId(null);
    // Activate the transparent React Flow Visualizer over the dimmed & blurred video
    setIsVisualizerActive(true);

    try {
      // Step 1: POST /api/github with the repository URL to get the file tree
      setLoadingStage("Fetching GitHub file tree...");
      const githubRes = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: parsed.cleanUrl }),
      });

      const githubData = await githubRes.json();
      if (!githubRes.ok) {
        throw new Error(
          githubData.error || "Failed to fetch GitHub repository tree."
        );
      }

      const resolvedOwner = githubData.owner || parsed.owner;
      const resolvedRepo = githubData.repo || parsed.repo;
      const files: string[] = Array.isArray(githubData.files)
        ? githubData.files
        : [];

      setScannedRepoInfo({
        owner: resolvedOwner,
        repo: resolvedRepo,
        defaultBranch: githubData.defaultBranch || "main",
        files,
      });

      // Immediately render Dagre-layouted file-tree topology while Gemini maps full architecture
      const initialDerived = deriveArchitectureFromFiles(
        files,
        resolvedOwner,
        resolvedRepo
      );
      const initialLayouted = getLayoutedElements(
        initialDerived.nodes,
        initialDerived.edges,
        layoutDirection
      );
      setNodes(initialLayouted.nodes);
      setEdges(initialLayouted.edges);
      setActivePreset("nextjs-edge");
      triggerFitView();

      // Step 2: POST /api/generate with the file tree to get React Flow nodes and edges
      setLoadingStage("Mapping architecture with Gemini...");
      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files,
          owner: resolvedOwner,
          repo: resolvedRepo,
          repoUrl: parsed.cleanUrl,
        }),
      });

      const rawAiData = await generateRes.json();
      if (!generateRes.ok) {
        throw new Error(
          rawAiData.error || "Failed to generate architecture diagram."
        );
      }

      // Step 3: Fix the AI's coordinates with compound Dagre and render the glowing diagram
      if (Array.isArray(rawAiData.nodes) && Array.isArray(rawAiData.edges)) {
        const { nodes: layoutedNodes, edges: layoutedEdges } =
          getLayoutedElements(
            rawAiData.nodes,
            rawAiData.edges,
            layoutDirection
          );
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        triggerFitView();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to analyze repository.";
      setUrlError(msg);
    } finally {
      setLoadingStage(null);
    }
  };

  const handleLoadRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    await runTwoStepRepoFlow(repoInput);
  };

  const handleSwitchPreset = (preset: TopologyPreset) => {
    setActivePreset(preset);
    setUrlError(null);
    setIsVisualizerActive(true);
    setMobileMenuOpen(false);

    if (preset === "starter") {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(initialNodes, initialEdges, layoutDirection);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setSelectedNodeId(null);
      triggerFitView();
      return;
    }

    const parsed = parseGitHubRepoUrl(repoInput);
    const owner = parsed.valid && parsed.owner ? parsed.owner : "vercel";
    const repo = parsed.valid && parsed.repo ? parsed.repo : "next.js";
    const topology = buildRepoTopology(owner, repo, preset);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      topology.nodes,
      topology.edges,
      layoutDirection
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setSelectedNodeId(null);
    triggerFitView();
  };

  const handleQuickAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    const labelToAdd = newNodeName.trim() || `Stage ${nodes.length + 1}`;
    const lastNodeId = selectedNodeId || nodes[nodes.length - 1]?.id;
    const { node, edge } = createDownstreamNode(
      nodes,
      labelToAdd,
      "pipeline",
      lastNodeId
    );
    const nextNodes = [...nodes, node];
    const nextEdges = edge ? [...edges, edge] : edges;
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nextNodes,
      nextEdges,
      layoutDirection
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setNewNodeName("");
    setSelectedNodeId(node.id);
    triggerFitView();
  };

  const handleUpdateNode = useCallback(
    (id: string, updates: Partial<CustomNodeData>) => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, ...updates } }
            : node
        )
      );
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) =>
        prev.filter((e) => e.source !== id && e.target !== id)
      );
      setSelectedNodeId(null);
    },
    [setNodes, setEdges]
  );

  const handleAddDownstreamFromInspector = useCallback(
    (sourceId: string, label: string, category: NodeCategory) => {
      const { node, edge } = createDownstreamNode(
        nodes,
        label,
        category,
        sourceId
      );
      setNodes((prev) => [...prev, node]);
      if (edge) {
        setEdges((prev) => [...prev, edge]);
      }
      setSelectedNodeId(node.id);
      triggerFitView();
    },
    [nodes, setNodes, setEdges, triggerFitView]
  );

  const handleDropUrl = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const droppedText = e.dataTransfer.getData("text/plain");
    if (droppedText) {
      setRepoInput(droppedText);
      await runTwoStepRepoFlow(droppedText);
    }
  };

  return (
    <main
      className="relative w-screen h-dvh overflow-hidden select-none"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDropUrl}
    >
      {/* ============================================================
          1. GLOBAL VIDEO BACKGROUND (Always underlying the app at z-0)
          ============================================================ */}
      <video
        src={BG_VIDEO_URL}
        poster={BG_POSTER_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-[51%_8%] z-0 pointer-events-none"
      />

      {/* ============================================================
          2. DYNAMIC GLASSMORPHISM OVERLAY (1-second CSS transition)
          - Hero view (isVisualizerActive === false): bg-black/30
          - Canvas view (isVisualizerActive === true): bg-black/45 backdrop-blur-xl
          ============================================================ */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-[1] pointer-events-none transition-all duration-1000 ease-in-out ${
          isVisualizerActive
            ? "bg-black/45 backdrop-blur-xl"
            : "bg-black/30"
        }`}
      />

      {/* ============================================================
          3. TRANSPARENT APP & REACT FLOW CONTAINER (z-10)
          ============================================================ */}
      <div className="relative z-10 w-full h-full flex flex-col bg-transparent">
        {/* Top Navigation Bar (Reference-pixel scaled with --u) */}
        <header className="relative h-[max(56px,calc(67*var(--u)))] flex items-center pl-[max(20px,calc(24.5*var(--u)))] pr-[max(20px,calc(50.7*var(--u)))] z-30 shrink-0 bg-transparent">
          {/* Brand Logo: RepoFlow */}
          <button
            type="button"
            onClick={() => setIsVisualizerActive(false)}
            className="font-extrabold text-[max(22px,calc(26*var(--u)))] tracking-[calc(0.45*var(--u))] leading-none text-[var(--ink)] no-underline whitespace-nowrap bg-transparent border-0 cursor-pointer flex items-baseline animate-logoIn [animation-delay:0.46s]"
          >
            <span>RepoFlow</span>
          </button>

          {/* Center Navigation Links (Desktop >= 1160px) */}
          <nav
            aria-label="Primary"
            className="hidden min-[1161px]:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -ml-[calc(23*var(--u))] items-center gap-[calc(24.3*var(--u))] whitespace-nowrap"
          >
            <button
              type="button"
              onClick={() => handleSwitchPreset("starter")}
              className={`bg-transparent border-0 cursor-pointer text-[calc(11.5*var(--u))] font-medium tracking-[calc(-0.15*var(--u))] leading-none transition-colors duration-180 animate-liftIn [animation-delay:0.54s] ${
                isVisualizerActive && activePreset === "starter"
                  ? "text-white"
                  : "text-[var(--ink-muted)] hover:text-white"
              }`}
            >
              Starter Flow
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPreset("nextjs-edge")}
              className={`bg-transparent border-0 cursor-pointer text-[calc(11.5*var(--u))] font-medium tracking-[calc(-0.15*var(--u))] leading-none transition-colors duration-180 animate-liftIn [animation-delay:0.585s] ${
                isVisualizerActive && activePreset === "nextjs-edge"
                  ? "text-white"
                  : "text-[var(--ink-muted)] hover:text-white"
              }`}
            >
              Edge Pipeline
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPreset("microservices")}
              className={`bg-transparent border-0 cursor-pointer text-[calc(11.5*var(--u))] font-medium tracking-[calc(-0.15*var(--u))] leading-none transition-colors duration-180 animate-liftIn [animation-delay:0.63s] ${
                isVisualizerActive && activePreset === "microservices"
                  ? "text-white"
                  : "text-[var(--ink-muted)] hover:text-white"
              }`}
            >
              Microservices
            </button>
            <button
              type="button"
              onClick={() => {
                setIsVisualizerActive(true);
                if (scannedRepoInfo) setShowFilesDrawer((prev) => !prev);
              }}
              className="bg-transparent border-0 cursor-pointer text-[var(--ink-muted)] hover:text-white text-[calc(11.5*var(--u))] font-medium tracking-[calc(-0.15*var(--u))] leading-none transition-colors duration-180 animate-liftIn [animation-delay:0.675s]"
            >
              Architecture
            </button>
            <button
              type="button"
              onClick={() => {
                setIsVisualizerActive(false);
                setTimeout(() => heroInputRef.current?.focus(), 60);
              }}
              className="bg-transparent border-0 cursor-pointer text-[var(--ink-muted)] hover:text-white text-[calc(11.5*var(--u))] font-medium tracking-[calc(-0.15*var(--u))] leading-none transition-colors duration-180 animate-liftIn [animation-delay:0.72s]"
            >
              Repository URL
            </button>
          </nav>

          {/* Right Actions (Desktop >= 1160px) */}
          <div className="hidden min-[1161px]:flex ml-auto items-center gap-[calc(6.8*var(--u))]">
            {/* GitHub Repo Link */}
            <a
              href="https://github.com/akash-xcoder/Git-Flow"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Git-Flow on GitHub"
              title="GitHub: akash-xcoder/Git-Flow"
              className="inline-flex items-center justify-center h-[calc(28*var(--u))] px-[calc(11.5*var(--u))] rounded-[calc(14*var(--u))] bg-[var(--panel)] text-[#e8e8e8] hover:bg-[#232323] hover:text-white text-[calc(11.5*var(--u))] font-medium tracking-[calc(-0.15*var(--u))] gap-[calc(6*var(--u))] transition-colors duration-180 no-underline cursor-pointer"
            >
              <Github className="w-[calc(13*var(--u))] h-[calc(13*var(--u))] shrink-0" />
              <span>GitHub</span>
            </a>

            {isVisualizerActive ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsVisualizerActive(false)}
                  className="inline-flex items-center justify-center h-[calc(28*var(--u))] px-[calc(12.9*var(--u))] rounded-[calc(14*var(--u))] bg-[var(--panel)] text-[#e8e8e8] hover:bg-[#232323] hover:text-white text-[calc(11.5*var(--u))] font-medium tracking-[calc(-0.15*var(--u))] gap-[calc(5*var(--u))] transition-colors duration-180 cursor-pointer"
                >
                  <ChevronLeft className="w-[calc(11*var(--u))] h-[calc(11*var(--u))]" />
                  <span>Hero View</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchPreset("starter")}
                  className="inline-flex items-center justify-center h-[calc(28*var(--u))] pl-[calc(13.5*var(--u))] pr-[calc(14.5*var(--u))] rounded-[calc(14*var(--u))] bg-[var(--white-btn)] text-[var(--btn-ink)] hover:bg-white text-[calc(11.1*var(--u))] font-medium gap-[calc(7*var(--u))] transition-colors duration-180 cursor-pointer"
                >
                  <RotateCcw className="w-[calc(10.5*var(--u))] h-[calc(10.5*var(--u))]" />
                  <span>Reset Canvas</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsVisualizerActive(true)}
                  className="inline-flex items-center justify-center h-[calc(28*var(--u))] px-[calc(12.9*var(--u))] rounded-[calc(14*var(--u))] bg-[var(--panel)] text-[#e8e8e8] hover:bg-[#232323] hover:text-white text-[calc(11.5*var(--u))] font-medium tracking-[calc(-0.15*var(--u))] transition-colors duration-180 cursor-pointer animate-pillIn [animation-delay:0.68s]"
                >
                  Open Canvas
                </button>
                <button
                  type="button"
                  onClick={() => runTwoStepRepoFlow(repoInput)}
                  className="inline-flex items-center justify-center h-[calc(28*var(--u))] pl-[calc(13.5*var(--u))] pr-[calc(14.5*var(--u))] rounded-[calc(14*var(--u))] bg-[var(--white-btn)] text-[var(--btn-ink)] hover:bg-white text-[calc(11.1*var(--u))] font-medium gap-[calc(7*var(--u))] transition-colors duration-180 cursor-pointer animate-pillIn [animation-delay:0.73s]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-[calc(11.5*var(--u))] h-[calc(9.6*var(--u))] shrink-0" />
                </button>
              </>
            )}
          </div>

          {/* Tablet/Mobile Burger (< 1160px) */}
          <button
            ref={burgerRef}
            id="burger"
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="menu"
            onClick={(e) => {
              e.stopPropagation();
              setMobileMenuOpen((prev) => !prev);
            }}
            className="flex min-[1161px]:hidden ml-auto w-[max(42px,calc(48*var(--u)))] h-[max(36px,calc(34*var(--u)))] items-center justify-center bg-[var(--panel)] rounded-full border-0 cursor-pointer p-0 animate-pillIn [animation-delay:0.68s]"
          >
            <span className="block w-4 h-[1.5px] bg-[#ededed] rounded-sm relative before:content-[''] before:absolute before:left-0 before:-top-[5px] before:w-4 before:h-[1.5px] before:bg-[#ededed] before:rounded-sm after:content-[''] after:absolute after:left-0 after:top-[5px] after:w-4 after:h-[1.5px] after:bg-[#ededed] after:rounded-sm" />
          </button>
        </header>

        {/* Mobile Dropdown Menu (< 1160px) */}
        {mobileMenuOpen && (
          <nav
            ref={menuRef}
            id="menu"
            aria-label="Mobile"
            className="flex min-[1161px]:hidden absolute top-[calc(max(58px,calc(67*var(--u)))-6px)] right-[max(20px,calc(28*var(--u)))] max-[552px]:left-4 max-[552px]:right-4 w-[min(320px,calc(100vw-48px))] max-[552px]:w-auto bg-[rgba(10,10,12,0.86)] backdrop-blur-[22px] border border-white/10 rounded-[20px] p-[10px_8px_12px] flex-col shadow-[0_24px_60px_rgba(0,0,0,0.55)] origin-top-right z-40 animate-menuIn"
          >
            <button
              type="button"
              onClick={() => handleSwitchPreset("starter")}
              className="text-left text-[var(--ink-muted)] hover:bg-white/6 hover:text-white text-[15px] font-medium p-[12px_14px] rounded-xl transition-colors"
            >
              Starter Flow
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPreset("nextjs-edge")}
              className="text-left text-[var(--ink-muted)] hover:bg-white/6 hover:text-white text-[15px] font-medium p-[12px_14px] rounded-xl transition-colors"
            >
              Edge Pipeline
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPreset("microservices")}
              className="text-left text-[var(--ink-muted)] hover:bg-white/6 hover:text-white text-[15px] font-medium p-[12px_14px] rounded-xl transition-colors"
            >
              Microservices
            </button>
            <button
              type="button"
              onClick={() => {
                setIsVisualizerActive(false);
                setMobileMenuOpen(false);
              }}
              className="text-left text-[var(--ink-muted)] hover:bg-white/6 hover:text-white text-[15px] font-medium p-[12px_14px] rounded-xl transition-colors"
            >
              Hero View
            </button>
            <button
              type="button"
              onClick={() => {
                setIsVisualizerActive(true);
                setShowFilesDrawer(true);
                setMobileMenuOpen(false);
              }}
              className="text-left text-[var(--ink-muted)] hover:bg-white/6 hover:text-white text-[15px] font-medium p-[12px_14px] rounded-xl transition-colors flex items-center justify-between"
            >
              <span>Repository Files</span>
              <span className="text-xs font-mono text-[#00f3ff] bg-[#00f3ff]/10 px-2 py-0.5 rounded-full">
                {scannedRepoInfo.files.length}
              </span>
            </button>
            <div className="h-px bg-white/8 my-2 mx-3.5" />
            <a
              href="https://github.com/akash-xcoder/Git-Flow"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-[var(--ink-muted)] hover:bg-white/6 hover:text-white text-[15px] font-medium p-[12px_14px] rounded-xl transition-colors no-underline"
            >
              <Github className="w-4 h-4 text-white shrink-0" />
              <span>GitHub: akash-xcoder/Git-Flow</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                runTwoStepRepoFlow(repoInput);
              }}
              className="flex items-center justify-center gap-2.5 bg-[var(--white-btn)] text-[var(--btn-ink)] hover:bg-white mt-1.5 mx-2 p-[13px_16px] rounded-[14px] font-semibold text-[15px]"
            >
              <span>Visualize Repo</span>
              <ArrowRight className="w-[13px] h-[11px]" />
            </button>
          </nav>
        )}

        {/* Hero Foreground Content (Visible when isVisualizerActive is false) */}
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[min(90vw,780px)] px-4 flex flex-col items-center justify-center text-center z-20 transition-all duration-700 ease-in-out ${
            isVisualizerActive
              ? "opacity-0 scale-95 pointer-events-none"
              : "opacity-100 scale-100 pointer-events-auto"
          }`}
        >
          {/* Two-line masked entrance headline */}
          <h1 className="m-0 font-medium text-[min(64px,calc((100vw-44px)/6.9))] min-[553px]:text-[calc(80*var(--u))] leading-[1.08] min-[553px]:leading-[calc(86*var(--u))] tracking-[-0.02em] min-[553px]:tracking-[calc(-1*var(--u))] text-[var(--ink)] text-center w-full">
            <span className="block overflow-hidden pt-[0.26em] -mt-[0.26em]">
              <span className="block will-change-transform animate-lineRise [animation-delay:0.12s] text-center">
                Visualize Codebases
              </span>
            </span>
            <span className="block overflow-hidden pt-[0.26em] -mt-[0.26em]">
              <span className="block will-change-transform animate-lineRise [animation-delay:0.22s] text-center">
                Instantly
              </span>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-4 min-[553px]:mt-[calc(18*var(--u))] mb-0 mx-auto max-w-[48ch] font-light text-[max(15px,calc(17*var(--u)))] leading-[max(24px,calc(26*var(--u)))] tracking-[calc(-0.25*var(--u))] text-[#f6f6f6] text-center will-change-[transform,opacity] animate-subIn [animation-delay:0.58s]">
            Drop a GitHub link to instantly map architecture, dependencies,
            <br className="hidden sm:inline" /> and CI/CD pipelines using Gemini AI.
          </p>

          {/* Sleek Glassmorphism URL Input & "Visualize" CTA */}
          <form
            onSubmit={handleLoadRepo}
            className="mt-6 min-[553px]:mt-[calc(24*var(--u))] flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xl mx-auto"
          >
            <div className="relative flex items-center bg-[var(--glass-fill)] border border-[var(--glass-line)] hover:border-white/20 focus-within:border-white/35 backdrop-blur-md rounded-full h-[max(44px,calc(42*var(--u)))] px-4 w-full sm:w-[380px] min-[1161px]:w-[calc(400*var(--u))] transition-colors duration-180 animate-pillInCta [animation-delay:0.90s]">
              <GitBranch className="w-4 h-4 text-white/55 shrink-0 mr-2.5" />
              <label htmlFor="hero-github-url" className="sr-only">
                GitHub Repository URL
              </label>
              <input
                ref={heroInputRef}
                id="hero-github-url"
                type="text"
                value={repoInput}
                disabled={Boolean(loadingStage)}
                onChange={(e) => {
                  setRepoInput(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                placeholder="https://github.com/vercel/next.js"
                className="w-full bg-transparent border-0 text-[#f6f6f6] placeholder:text-white/40 text-sm font-mono focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={Boolean(loadingStage)}
              className="inline-flex items-center justify-center h-[max(44px,calc(42*var(--u)))] rounded-full bg-[var(--white-btn)] hover:bg-white text-[var(--btn-ink)] px-6 text-sm font-medium tracking-tight gap-2.5 border-0 cursor-pointer transition-all duration-180 animate-pillInCta [animation-delay:0.97s] whitespace-nowrap shrink-0 shadow-lg"
            >
              {loadingStage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mapping...</span>
                </>
              ) : (
                <>
                  <span>Visualize</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </button>
          </form>

          {urlError && !isVisualizerActive && (
            <p
              role="alert"
              className="mt-4 text-xs font-mono text-red-400 bg-black/80 border border-red-500/30 rounded-full px-4 py-1.5 inline-block mx-auto"
            >
              {urlError}
            </p>
          )}

          {/* GitHub Repository link */}
          <a
            href="https://github.com/akash-xcoder/Git-Flow"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-xs font-mono text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-full px-4 py-2 transition-all duration-180 animate-subIn [animation-delay:1.05s] no-underline group shadow-sm"
          >
            <Github className="w-4 h-4 text-white/80 group-hover:text-white transition-colors" />
            <span>GitHub: akash-xcoder/Git-Flow</span>
            <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </a>
        </div>

        {/* Transparent React Flow Visualizer Section (Visible when isVisualizerActive is true) */}
        <section
          aria-label="Interactive Architecture Canvas"
          className={`flex-1 flex flex-col bg-transparent transition-opacity duration-1000 ease-in-out ${
            isVisualizerActive
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Glassmorphic Workspace Control Bar */}
          <div className="border-y border-white/10 bg-black/40 backdrop-blur-md px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20 shrink-0">
            <form
              onSubmit={handleLoadRepo}
              className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 min-w-fit max-w-2xl"
            >
              <label htmlFor="github-repo-url" className="sr-only">
                GitHub Repository URL
              </label>
              <div className="relative flex-1 min-w-[180px]">
                <GitBranch className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="github-repo-url"
                  type="text"
                  disabled={Boolean(loadingStage)}
                  value={repoInput}
                  onChange={(e) => {
                    setRepoInput(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  placeholder="Drop GitHub URL here (e.g. https://github.com/vercel/next.js)"
                  className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-white font-mono focus:outline-none focus:border-[#00f3ff] disabled:opacity-60 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={Boolean(loadingStage)}
                className="px-4 py-1.5 bg-[var(--white-btn)] text-[var(--btn-ink)] font-semibold text-xs rounded-full hover:bg-white disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                {loadingStage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{loadingStage}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Visualize Repo</span>
                  </>
                )}
              </button>
              {scannedRepoInfo && (
                <button
                  type="button"
                  onClick={() => setShowFilesDrawer((prev) => !prev)}
                  className={`px-3 py-1.5 border text-xs font-mono tabular-nums rounded-full transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    showFilesDrawer
                      ? "bg-[#00f3ff]/15 border-[#00f3ff] text-white shadow-[0_0_12px_rgba(0,243,255,0.2)]"
                      : "bg-white/5 border-white/10 hover:border-[#00f3ff] text-gray-200 hover:text-white"
                  }`}
                  title={showFilesDrawer ? "Close repository files drawer" : "Open repository files drawer"}
                >
                  <FolderTree className="w-3.5 h-3.5 text-[#00f3ff]" />
                  <span>{scannedRepoInfo.files.length} Files</span>
                </button>
              )}
              {urlError && (
                <span
                  role="alert"
                  className="text-xs text-red-400 font-mono whitespace-nowrap"
                >
                  {urlError}
                </span>
              )}
            </form>

            <div className="flex flex-wrap items-center gap-2.5">
              <div
                role="group"
                aria-label="Dagre Layout Direction"
                className="flex items-center gap-1 p-0.5 bg-white/5 border border-white/10 rounded-full"
              >
                <button
                  type="button"
                  onClick={() => handleApplyLayout("LR")}
                  className={`px-3 py-1 text-xs font-mono rounded-full transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer ${
                    layoutDirection === "LR"
                      ? "bg-white/15 text-[#00f3ff] font-medium"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Network className="w-3 h-3" />
                  <span>Layout LR</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyLayout("TB")}
                  className={`px-3 py-1 text-xs font-mono rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    layoutDirection === "TB"
                      ? "bg-white/15 text-[#00f3ff] font-medium"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Layout TB
                </button>
              </div>

              <form
                onSubmit={handleQuickAddNode}
                className="hidden md:flex items-center gap-2"
              >
                <label htmlFor="quick-add-node-input" className="sr-only">
                  New Stage Label
                </label>
                <input
                  id="quick-add-node-input"
                  type="text"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  placeholder="Add custom stage..."
                  className="w-36 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-white font-mono focus:outline-none focus:border-[#00f3ff]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-white/5 border border-white/10 hover:border-[#00f3ff] text-xs font-medium text-white rounded-full transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#00f3ff]" />
                  <span>Add Node</span>
                </button>
              </form>

              {/* Canvas Image Export Button Group */}
              <div className="relative" ref={exportMenuRef}>
                <div className="flex items-center p-0.5 bg-white/5 border border-white/10 rounded-full hover:border-[#00f3ff]/50 transition-colors">
                  <button
                    type="button"
                    onClick={() => handleExport("png")}
                    disabled={Boolean(isExporting)}
                    title="Export canvas as high-quality PNG (2x)"
                    className="px-3 py-1 text-xs font-mono text-gray-200 hover:text-white rounded-full transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isExporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f3ff]" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-[#00f3ff]" />
                    )}
                    <span>{isExporting ? `Exporting ${isExporting.toUpperCase()}...` : "Export"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportMenuOpen((prev) => !prev)}
                    disabled={Boolean(isExporting)}
                    aria-label="Export format options"
                    aria-expanded={exportMenuOpen}
                    className="pr-2 pl-1 py-1 text-gray-400 hover:text-white rounded-full transition-colors cursor-pointer"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${exportMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {exportMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-gray-950/95 border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50 backdrop-blur-2xl animate-menuIn">
                    <button
                      type="button"
                      onClick={() => handleExport("png")}
                      className="w-full text-left px-3 py-2 text-xs font-mono text-gray-200 hover:bg-white/10 hover:text-white rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <ImageDown className="w-4 h-4 text-[#00f3ff] shrink-0" />
                      <div>
                        <div className="font-semibold text-white">PNG Image (2x)</div>
                        <div className="text-[10px] text-gray-400">High-res raster for docs</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("svg")}
                      className="w-full text-left px-3 py-2 text-xs font-mono text-gray-200 hover:bg-white/10 hover:text-white rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">SVG Vector</div>
                        <div className="text-[10px] text-gray-400">Resolution-independent</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* GitHub Link in canvas bar */}
              <a
                href="https://github.com/akash-xcoder/Git-Flow"
                target="_blank"
                rel="noopener noreferrer"
                title="View Git-Flow on GitHub"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-mono text-gray-300 hover:text-white rounded-full transition-colors no-underline cursor-pointer"
              >
                <Github className="w-3.5 h-3.5 text-white" />
                <span>GitHub</span>
              </a>

              {exportSuccessMessage && (
                <div
                  role="status"
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#00f3ff]/15 border border-[#00f3ff]/40 text-[#00f3ff] rounded-full text-xs font-mono animate-fadeIn"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{exportSuccessMessage}</span>
                </div>
              )}

              <div
                aria-label="Pipeline Telemetry"
                className="hidden xl:flex items-center gap-2 text-xs text-gray-300 font-mono tabular-nums"
              >
                <span>{metrics.nodeCount} Nodes</span>
                <span aria-hidden="true">·</span>
                <span>{metrics.edgeCount} Electric Edges</span>
                <span aria-hidden="true">·</span>
                <span>Est. {metrics.totalLatencyMs}ms</span>
              </div>
            </div>
          </div>

          {/* Transparent React Flow Canvas Wrapper */}
          <div className="flex-1 flex relative overflow-hidden">
            {isDraggingOver && (
              <div className="absolute inset-4 border-2 border-dashed border-[#00f3ff] bg-black/60 z-30 rounded-2xl flex items-center justify-center pointer-events-none">
                <p className="text-[#00f3ff] font-mono text-sm tracking-wide">
                  Drop GitHub Repository URL to Generate Electric Flow Graph
                </p>
              </div>
            )}

            {showFilesDrawer && scannedRepoInfo && (
              <aside
                aria-label="Extracted Repository File Tree"
                className="w-80 bg-black/80 backdrop-blur-2xl border-r border-white/10 p-4 flex flex-col z-20 shrink-0 overflow-hidden shadow-2xl transition-all"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 shrink-0">
                  <div className="truncate pr-2">
                    <div className="flex items-center gap-1.5">
                      <FolderTree className="w-3.5 h-3.5 text-[#00f3ff] shrink-0" />
                      <h2 className="text-xs font-semibold text-white font-mono truncate">
                        {scannedRepoInfo.owner}/{scannedRepoInfo.repo}
                      </h2>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono tabular-nums mt-0.5">
                      branch: {scannedRepoInfo.defaultBranch} ·{" "}
                      {scannedRepoInfo.files.length} total files
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilesDrawer(false)}
                    aria-label="Close File Tree"
                    className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* File Search Input Bar */}
                <div className="relative mb-3 shrink-0">
                  <label htmlFor="repo-file-search-input" className="sr-only">
                    Filter repository files by name
                  </label>
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="repo-file-search-input"
                      type="text"
                      value={fileSearchQuery}
                      onChange={(e) => setFileSearchQuery(e.target.value)}
                      placeholder="Filter files (e.g. .tsx, api)..."
                      className="w-full pl-8 pr-7 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00f3ff] focus:ring-1 focus:ring-[#00f3ff]/40 transition-colors"
                    />
                    {fileSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setFileSearchQuery("")}
                        aria-label="Clear file search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Match count and filter status */}
                  <div className="flex items-center justify-between text-[10px] font-mono mt-1.5 px-0.5 text-gray-400">
                    <span>
                      {fileSearchQuery ? (
                        <>
                          <span className="text-[#00f3ff] font-semibold">{filteredFiles.length}</span>{" "}
                          {filteredFiles.length === 1 ? "file match" : "files match"}
                        </>
                      ) : (
                        <span>Showing all {filteredFiles.length} files</span>
                      )}
                    </span>
                    {fileSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setFileSearchQuery("")}
                        className="text-gray-400 hover:text-white underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* File List or Empty State */}
                {filteredFiles.length > 0 ? (
                  <ul className="flex-1 overflow-y-auto space-y-0.5 pr-1 font-mono text-[11px] text-gray-300">
                    {filteredFiles.map((filePath) => (
                      <li
                        key={filePath}
                        className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/10 hover:text-[#00f3ff] transition-colors cursor-pointer select-none"
                        title={`Click to copy: ${filePath}`}
                        onClick={() => {
                          if (typeof navigator !== "undefined" && navigator.clipboard) {
                            navigator.clipboard.writeText(filePath);
                            setCopiedFilePath(filePath);
                            setTimeout(
                              () =>
                                setCopiedFilePath((prev) =>
                                  prev === filePath ? null : prev
                                ),
                              1800
                            );
                          }
                        }}
                      >
                        <span className="truncate flex items-center gap-1.5 flex-1 pr-1">
                          <FileCode className="w-3 h-3 text-gray-400 group-hover:text-[#00f3ff] shrink-0" />
                          <span className="truncate">
                            {renderHighlightedFilePath(filePath, fileSearchQuery)}
                          </span>
                        </span>
                        {copiedFilePath === filePath ? (
                          <span className="text-[10px] text-[#00f3ff] font-sans font-medium shrink-0 pl-1">
                            Copied!
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-gray-400">
                    <Search className="w-6 h-6 text-gray-600 mb-2" />
                    <p className="text-xs font-mono text-gray-300">No matching files</p>
                    <p className="text-[11px] font-mono text-gray-500 mt-0.5 break-all">
                      No files match &quot;{fileSearchQuery}&quot;
                    </p>
                    <button
                      type="button"
                      onClick={() => setFileSearchQuery("")}
                      className="mt-3 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Clear search query
                    </button>
                  </div>
                )}
              </aside>
            )}

            <div
              ref={canvasWrapperRef}
              className="flex-1 w-full h-full relative z-10"
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                onSelectionDrag={onSelectionDrag}
                onSelectionDragStop={onSelectionDragStop}
                onNodeContextMenu={onNodeContextMenu}
                onEdgeContextMenu={onEdgeContextMenu}
                snapToGrid={true}
                snapGrid={[16, 16]}
                connectionRadius={30}
                onInit={(instance) => {
                  rfInstanceRef.current = instance;
                }}
                onNodeClick={(
                  _: React.MouseEvent,
                  node: Node<CustomNodeData>
                ) => {
                  setMenu((prev) => (prev.show ? { ...prev, show: false } : prev));
                  if (node.type !== "group") {
                    setSelectedNodeId(node.id);
                  }
                }}
                onPaneClick={() => {
                  setSelectedNodeId(null);
                  setMenu((prev) => (prev.show ? { ...prev, show: false } : prev));
                }}
                nodeTypes={nodeTypes}
                minZoom={0.02}
                maxZoom={2.5}
                fitView
                fitViewOptions={{ padding: 0.2, minZoom: 0.02, maxZoom: 1.1 }}
                className="dark bg-transparent"
                style={{
                  background: "transparent",
                  backgroundColor: "transparent",
                }}
              >
                <Background
                  color="#444"
                  gap={20}
                  size={1.5}
                  style={{ backgroundColor: "transparent" }}
                />
                <Controls
                  position="top-left"
                  className="bg-gray-900/90 border border-white/10 fill-white text-white shadow-lg"
                >
                  <ControlButton
                    onClick={() => handleExport("png")}
                    title="Export canvas as high-quality PNG"
                    aria-label="Export canvas as image"
                  >
                    {isExporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f3ff]" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-[#00f3ff]" />
                    )}
                  </ControlButton>
                </Controls>
                <MiniMap
                  nodeColor={(node) => {
                    if (node.type === "group") return "rgba(51, 65, 85, 0.35)";
                    const nodeData = node.data as CustomNodeData | undefined;
                    if (nodeData?.color) return nodeData.color;
                    return getNodeCategoryStyle(nodeData?.category).borderHex;
                  }}
                  maskColor="rgba(5, 5, 5, 0.78)"
                  nodeStrokeColor={(node) => {
                    if (node.type === "group") return "#475569";
                    const nodeData = node.data as CustomNodeData | undefined;
                    if (nodeData?.color) return nodeData.color;
                    return getNodeCategoryStyle(nodeData?.category).borderHex;
                  }}
                  className="bg-gray-950/90 border border-white/10"
                />
              </ReactFlow>

              <ContextMenu
                menu={menu}
                nodes={nodes}
                edges={edges}
                repoUrl={repoInput}
                defaultBranch={scannedRepoInfo?.defaultBranch || "main"}
                setNodes={setNodes}
                setEdges={setEdges}
                onClose={() =>
                  setMenu((prev) => (prev.show ? { ...prev, show: false } : prev))
                }
              />
            </div>

            <NodeInspectorPanel
              selectedNode={selectedNode}
              onClose={() => setSelectedNodeId(null)}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              onAddDownstream={handleAddDownstreamFromInspector}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
