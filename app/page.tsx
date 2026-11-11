"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
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
} from "lucide-react";
import CustomNode from "@/components/CustomNode";
import GroupNode from "@/components/GroupNode";
import NodeInspectorPanel from "@/components/NodeInspectorPanel";
import { getLayoutedElements } from "@/utils/layout";
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
  } | null>(null);
  const [showFilesDrawer, setShowFilesDrawer] = useState(false);

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);

  const nodeTypes = useMemo(() => STATIC_NODE_TYPES, []);

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
        padding: 0.24,
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

  // Connect two handles with an electric glowing smoothstep edge
  const onConnect = useCallback(
    (connection: Connection | Edge) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: true,
            className: "electric-edge",
          },
          eds
        )
      );
    },
    [setEdges]
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
            <div className="h-px bg-white/8 my-2 mx-3.5" />
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
          <div className="border-y border-white/10 bg-black/40 backdrop-blur-md px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 z-20 shrink-0">
            <form
              onSubmit={handleLoadRepo}
              className="flex items-center gap-2 flex-1 max-w-2xl"
            >
              <label htmlFor="github-repo-url" className="sr-only">
                GitHub Repository URL
              </label>
              <div className="relative flex-1">
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
                  className="px-3 py-1.5 bg-white/5 border border-white/10 hover:border-[#00f3ff] text-xs font-mono tabular-nums text-gray-200 hover:text-white rounded-full transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
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

            <div className="flex items-center gap-4">
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
                className="w-72 bg-black/60 backdrop-blur-xl border-r border-white/10 p-4 flex flex-col z-20 shrink-0 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div>
                    <h2 className="text-xs font-semibold text-white font-mono">
                      {scannedRepoInfo.owner}/{scannedRepoInfo.repo}
                    </h2>
                    <p className="text-[11px] text-gray-400 font-mono tabular-nums mt-0.5">
                      branch: {scannedRepoInfo.defaultBranch} ·{" "}
                      {scannedRepoInfo.files.length} files
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilesDrawer(false)}
                    aria-label="Close File Tree"
                    className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ul className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-[11px] text-gray-300">
                  {scannedRepoInfo.files.map((filePath) => (
                    <li
                      key={filePath}
                      className="truncate py-1 px-2 rounded hover:bg-white/10 hover:text-[#00f3ff] transition-colors"
                      title={filePath}
                    >
                      {filePath}
                    </li>
                  ))}
                </ul>
              </aside>
            )}

            <div className="flex-1 w-full h-full relative z-10">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={(instance) => {
                  rfInstanceRef.current = instance;
                }}
                onNodeClick={(
                  _: React.MouseEvent,
                  node: Node<CustomNodeData>
                ) => {
                  if (node.type !== "group") {
                    setSelectedNodeId(node.id);
                  }
                }}
                onPaneClick={() => setSelectedNodeId(null)}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
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
                />
                <MiniMap
                  nodeColor="#00f3ff"
                  maskColor="rgba(5, 5, 5, 0.78)"
                  nodeStrokeColor="#00f3ff"
                  className="bg-gray-950/90 border border-white/10"
                />
              </ReactFlow>
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
