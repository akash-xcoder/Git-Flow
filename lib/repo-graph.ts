export type NodeCategory =
  | "api"
  | "database"
  | "service"
  | "source"
  | "pipeline"
  | "artifact"
  | "deployment"
  | "ui"
  | "config"
  | "security"
  | "testing";

export const VALID_NODE_CATEGORIES: ReadonlySet<NodeCategory> = new Set([
  "api",
  "database",
  "service",
  "source",
  "pipeline",
  "artifact",
  "deployment",
  "ui",
  "config",
  "security",
  "testing",
]);

export interface CustomNodeData {
  label: string;
  category?: NodeCategory;
  sublabel?: string;
  latencyMs?: number;
  status?: "nominal" | "warning" | "Running";
}

export interface FlowNodeItem {
  id: string;
  type: "custom" | "group";
  parentNode?: string;
  extent?: "parent";
  style?: Record<string, string | number>;
  position: { x: number; y: number };
  data: CustomNodeData;
}

export interface FlowEdgeItem {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: "smoothstep";
  animated: boolean;
  className: string;
}

export type TopologyPreset = "starter" | "nextjs-edge" | "microservices" | "security-gate";

export const IGNORED_TREE_PATHS = [
  "node_modules",
  ".png",
  ".jpg",
  ".svg",
  ".ico",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "dist",
  "build",
  ".git/",
];

// Set up the default two nodes to demonstrate the data flow as requested
export const initialNodes: FlowNodeItem[] = [
  {
    id: "node-1",
    type: "custom",
    position: { x: 150, y: 200 },
    data: {
      label: "GitHub Repository",
      category: "source",
      sublabel: "main · origin",
      latencyMs: 18,
      status: "nominal",
    },
  },
  {
    id: "node-2",
    type: "custom",
    position: { x: 500, y: 200 },
    data: {
      label: "CI/CD Pipeline",
      category: "pipeline",
      sublabel: "workflow · build-test",
      latencyMs: 64,
      status: "nominal",
    },
  },
];

export const initialEdges: FlowEdgeItem[] = [
  {
    id: "edge-1",
    source: "node-1",
    target: "node-2",
    sourceHandle: "source-right",
    targetHandle: "target-left",
    type: "smoothstep",
    animated: true,
    className: "electric-edge",
  },
];

export interface ParsedGitHubRepo {
  valid: boolean;
  owner?: string;
  repo?: string;
  cleanUrl?: string;
  error?: string;
}

export function parseGitHubRepoUrl(input: string): ParsedGitHubRepo {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: "Please enter a GitHub repository URL or owner/repo shorthand.",
    };
  }

  // Match full github URL: https://github.com/owner/repo or github.com/owner/repo
  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git|\/.*)?$/i
  );
  if (urlMatch) {
    const [, owner, repo] = urlMatch;
    return {
      valid: true,
      owner,
      repo,
      cleanUrl: `https://github.com/${owner}/${repo}`,
    };
  }

  // Match shorthand: owner/repo
  const shortMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shortMatch) {
    const [, owner, repo] = shortMatch;
    return {
      valid: true,
      owner,
      repo,
      cleanUrl: `https://github.com/${owner}/${repo}`,
    };
  }

  return {
    valid: false,
    error: "Invalid format. Use https://github.com/owner/repo or owner/repo.",
  };
}

export function filterGitHubTree(
  treeNodes: Array<{ type?: string; path?: string }>,
  maxFiles = 350
): string[] {
  if (!Array.isArray(treeNodes)) return [];
  return treeNodes
    .filter((node) => node && node.type === "blob" && typeof node.path === "string")
    .map((node) => node.path as string)
    .filter(
      (path) => !IGNORED_TREE_PATHS.some((ignored) => path.includes(ignored))
    )
    .slice(0, maxFiles);
}

export function normalizeGeneratedGraph(raw: unknown): {
  nodes: FlowNodeItem[];
  edges: FlowEdgeItem[];
} {
  if (!raw || typeof raw !== "object") {
    return { nodes: initialNodes, edges: initialEdges };
  }

  const obj = raw as { nodes?: unknown[]; edges?: unknown[] };
  const rawNodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const rawEdges = Array.isArray(obj.edges) ? obj.edges : [];

  const parsedNodes: FlowNodeItem[] = rawNodes
    .map((item, idx): FlowNodeItem | null => {
      if (!item || typeof item !== "object") return null;
      const n = item as Record<string, unknown>;
      const id = typeof n.id === "string" && n.id.trim() ? n.id.trim() : `node-${idx + 1}`;
      const nodeType: "custom" | "group" = n.type === "group" ? "group" : "custom";
      const parentNode =
        nodeType === "custom" && typeof n.parentNode === "string" && n.parentNode.trim()
          ? n.parentNode.trim()
          : undefined;

      const posObj =
        n.position && typeof n.position === "object"
          ? (n.position as Record<string, unknown>)
          : {};
      const x = typeof posObj.x === "number" && Number.isFinite(posObj.x) ? posObj.x : 0;
      const y = typeof posObj.y === "number" && Number.isFinite(posObj.y) ? posObj.y : 0;

      const dataObj =
        n.data && typeof n.data === "object"
          ? (n.data as Record<string, unknown>)
          : {};
      const label =
        typeof dataObj.label === "string" && dataObj.label.trim()
          ? dataObj.label.trim()
          : `Component ${idx + 1}`;
      const sublabel =
        typeof dataObj.sublabel === "string" && dataObj.sublabel.trim()
          ? dataObj.sublabel.trim()
          : undefined;
      const rawCategory =
        typeof dataObj.category === "string"
          ? (dataObj.category.trim().toLowerCase() as NodeCategory)
          : undefined;
      const category =
        rawCategory && VALID_NODE_CATEGORIES.has(rawCategory)
          ? rawCategory
          : undefined;
      const latencyMs =
        typeof dataObj.latencyMs === "number" && Number.isFinite(dataObj.latencyMs)
          ? dataObj.latencyMs
          : undefined;

      return {
        id,
        type: nodeType,
        ...(parentNode ? { parentNode } : {}),
        position: { x, y },
        data: {
          label,
          sublabel,
          category,
          latencyMs,
          status: "nominal",
        },
      };
    })
    .filter((n): n is FlowNodeItem => n !== null);

  if (parsedNodes.length === 0) {
    return { nodes: initialNodes, edges: initialEdges };
  }

  // Ensure any parentNode referenced by a child has a corresponding group node
  const existingGroupIds = new Set(
    parsedNodes.filter((n) => n.type === "group").map((n) => n.id)
  );
  const autoGroups: FlowNodeItem[] = [];
  for (const node of parsedNodes) {
    if (node.parentNode && !existingGroupIds.has(node.parentNode)) {
      existingGroupIds.add(node.parentNode);
      const formattedLabel = node.parentNode
        .replace(/^group[-_]?/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      autoGroups.push({
        id: node.parentNode,
        type: "group",
        position: { x: 0, y: 0 },
        data: {
          label: formattedLabel || "Module Cluster",
          status: "nominal",
        },
      });
    }
  }

  // React Flow requires parent group nodes to appear before their children in the nodes array
  const groupNodes = [
    ...parsedNodes.filter((n) => n.type === "group"),
    ...autoGroups,
  ];
  const fileNodes = parsedNodes.filter((n) => n.type !== "group");
  const nodes: FlowNodeItem[] = [...groupNodes, ...fileNodes];

  const validNodeIds = new Set(nodes.map((n) => n.id));
  const edges: FlowEdgeItem[] = rawEdges
    .map((item, idx): FlowEdgeItem | null => {
      if (!item || typeof item !== "object") return null;
      const e = item as Record<string, unknown>;
      const source = typeof e.source === "string" ? e.source.trim() : "";
      const target = typeof e.target === "string" ? e.target.trim() : "";
      if (!source || !target || !validNodeIds.has(source) || !validNodeIds.has(target)) {
        return null;
      }
      const id =
        typeof e.id === "string" && e.id.trim()
          ? e.id.trim()
          : `e-${source}-${target}-${idx}`;

      return {
        id,
        source,
        target,
        type: "smoothstep",
        animated: true,
        className: "electric-edge",
      };
    })
    .filter((e): e is FlowEdgeItem => e !== null);

  // If LLM forgot edges between valid file nodes, chain them sequentially
  if (edges.length === 0 && fileNodes.length > 1) {
    for (let i = 0; i < fileNodes.length - 1; i++) {
      edges.push({
        id: `e-${fileNodes[i].id}-${fileNodes[i + 1].id}`,
        source: fileNodes[i].id,
        target: fileNodes[i + 1].id,
        type: "smoothstep",
        animated: true,
        className: "electric-edge",
      });
    }
  }

  return { nodes, edges };
}

function inferFilePurpose(filePath: string): {
  purpose: string;
  category: NodeCategory;
  groupId: string;
  groupLabel: string;
} {
  const lower = filePath.toLowerCase();
  if (lower.includes(".github/workflows/")) {
    return {
      purpose: "(CI/CD automation workflow)",
      category: "pipeline",
      groupId: "group-cicd",
      groupLabel: "CI/CD & Automation",
    };
  }
  if (lower.endsWith("package.json") || lower.endsWith("cargo.toml")) {
    return {
      purpose: "(Manifest & dependencies)",
      category: "config",
      groupId: "group-config",
      groupLabel: "Configuration & Manifests",
    };
  }
  if (lower.includes("next.config") || lower.includes("tsconfig")) {
    return {
      purpose: "(Compiler & build config)",
      category: "config",
      groupId: "group-config",
      groupLabel: "Configuration & Manifests",
    };
  }
  if (
    lower.includes("prisma") ||
    lower.includes("drizzle") ||
    lower.includes("schema") ||
    lower.includes("/db/") ||
    lower.includes("/models/") ||
    lower.endsWith(".sql")
  ) {
    return {
      purpose: "(Database schema & data layer)",
      category: "database",
      groupId: "group-database",
      groupLabel: "Data Persistence & Schemas",
    };
  }
  if (lower.includes("/api/") || lower.endsWith("route.ts") || lower.endsWith("route.js")) {
    return {
      purpose: "(Server API endpoint)",
      category: "api",
      groupId: "group-backend",
      groupLabel: "Backend API & Services",
    };
  }
  if (lower.endsWith("layout.tsx") || lower.endsWith("layout.js")) {
    return {
      purpose: "(Root application shell)",
      category: "ui",
      groupId: "group-frontend",
      groupLabel: "Frontend UI & Routing",
    };
  }
  if (lower.endsWith("page.tsx") || lower.endsWith("page.js") || lower.endsWith("index.ts")) {
    return {
      purpose: "(View entry & route module)",
      category: "ui",
      groupId: "group-frontend",
      groupLabel: "Frontend UI & Routing",
    };
  }
  if (lower.includes("component") || lower.includes("/ui/")) {
    return {
      purpose: "(UI component module)",
      category: "ui",
      groupId: "group-frontend",
      groupLabel: "Frontend UI & Routing",
    };
  }
  if (lower.includes("test") || lower.includes("spec") || lower.includes("bench")) {
    return {
      purpose: "(Verification & test suite)",
      category: "testing",
      groupId: "group-testing",
      groupLabel: "Verification & Tests",
    };
  }
  if (
    lower.includes("service") ||
    lower.includes("lib/") ||
    lower.includes("utils/") ||
    lower.includes("scripts/")
  ) {
    return {
      purpose: "(Core service & logic)",
      category: "service",
      groupId: "group-backend",
      groupLabel: "Backend API & Services",
    };
  }
  return {
    purpose: "(Core codebase module)",
    category: "artifact",
    groupId: "group-core",
    groupLabel: "Core Architecture",
  };
}

export function deriveArchitectureFromFiles(
  files: string[],
  owner = "github",
  repo = "repository"
): { nodes: FlowNodeItem[]; edges: FlowEdgeItem[] } {
  const rootId = "repo-root";
  const groupMap = new Map<string, FlowNodeItem>();

  // Create root group for repository entry & manifests
  groupMap.set("group-config", {
    id: "group-config",
    type: "group",
    position: { x: 0, y: 0 },
    data: {
      label: "Configuration & Manifests",
      status: "nominal",
    },
  });

  const childNodes: FlowNodeItem[] = [
    {
      id: rootId,
      type: "custom",
      parentNode: "group-config",
      position: { x: 0, y: 0 },
      data: {
        label: `${owner}/${repo} (Repository Root)`,
        category: "source",
        sublabel: `${files.length} tracked files`,
        latencyMs: 12,
        status: "nominal",
      },
    },
  ];
  const edges: FlowEdgeItem[] = [];

  // Select up to 11 representative code/workflow/config files from the repository
  const priorityMatchers = [
    (f: string) => f.endsWith("package.json") || f.endsWith("Cargo.toml"),
    (f: string) => f.includes(".github/workflows/"),
    (f: string) => f.includes("next.config") || f.includes("tsconfig.json"),
    (f: string) => f.endsWith("layout.tsx") || f.endsWith("layout.js"),
    (f: string) => f.endsWith("page.tsx") || f.endsWith("page.js"),
    (f: string) => f.includes("/api/") || f.includes("route."),
    (f: string) => f.includes("components/") || f.includes("/ui/"),
    (f: string) => f.includes("lib/") || f.includes("utils/") || f.includes("scripts/"),
    (f: string) => f.includes(".test.") || f.includes(".spec.") || f.includes("bench/"),
  ];

  const pickedFiles: string[] = [];
  const seen = new Set<string>();

  for (const matcher of priorityMatchers) {
    const matches = files.filter((f) => matcher(f) && !seen.has(f)).slice(0, 2);
    for (const m of matches) {
      if (pickedFiles.length < 11) {
        pickedFiles.push(m);
        seen.add(m);
      }
    }
  }

  for (const f of files) {
    if (pickedFiles.length >= 11) break;
    if (!seen.has(f)) {
      pickedFiles.push(f);
      seen.add(f);
    }
  }

  const tier1Ids: string[] = [];
  const tier2Ids: string[] = [];

  pickedFiles.forEach((filePath, idx) => {
    const shortName = filePath.split("/").slice(-2).join("/");
    const { purpose, category, groupId, groupLabel } = inferFilePurpose(filePath);
    const nodeId = `file-node-${idx + 1}`;

    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, {
        id: groupId,
        type: "group",
        position: { x: 0, y: 0 },
        data: {
          label: groupLabel,
          status: "nominal",
        },
      });
    }

    childNodes.push({
      id: nodeId,
      type: "custom",
      parentNode: groupId,
      position: { x: 0, y: 0 },
      data: {
        label: `${shortName} ${purpose}`,
        category,
        sublabel: filePath,
        latencyMs: 15 + ((idx * 7) % 35),
        status: "nominal",
      },
    });

    if (idx < 3) {
      tier1Ids.push(nodeId);
      edges.push({
        id: `e-${rootId}-${nodeId}`,
        source: rootId,
        target: nodeId,
        type: "smoothstep",
        animated: true,
        className: "electric-edge",
      });
    } else if (idx < 7) {
      tier2Ids.push(nodeId);
      const parentId = tier1Ids[idx % tier1Ids.length] || rootId;
      edges.push({
        id: `e-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: "smoothstep",
        animated: true,
        className: "electric-edge",
      });
    } else {
      const parentId = tier2Ids[idx % tier2Ids.length] || tier1Ids[0] || rootId;
      edges.push({
        id: `e-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: "smoothstep",
        animated: true,
        className: "electric-edge",
      });
    }
  });

  const nodes: FlowNodeItem[] = [...Array.from(groupMap.values()), ...childNodes];
  return { nodes, edges };
}

export function buildRepoTopology(
  owner: string,
  repo: string,
  preset: TopologyPreset = "nextjs-edge"
): { nodes: FlowNodeItem[]; edges: FlowEdgeItem[] } {
  const repoLabel = `${owner}/${repo}`;

  if (preset === "starter") {
    return {
      nodes: [
        {
          id: "node-1",
          type: "custom",
          position: { x: 150, y: 200 },
          data: {
            label: "GitHub Repository",
            category: "source",
            sublabel: repoLabel,
            latencyMs: 18,
            status: "nominal",
          },
        },
        {
          id: "node-2",
          type: "custom",
          position: { x: 500, y: 200 },
          data: {
            label: "CI/CD Pipeline",
            category: "pipeline",
            sublabel: "actions · build-test",
            latencyMs: 64,
            status: "nominal",
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-1",
          target: "node-2",
          type: "smoothstep",
          animated: true,
          className: "electric-edge",
        },
      ],
    };
  }

  if (preset === "microservices") {
    return {
      nodes: [
        {
          id: "node-1",
          type: "custom",
          position: { x: 80, y: 220 },
          data: {
            label: "GitHub Repository",
            category: "source",
            sublabel: repoLabel,
            latencyMs: 15,
            status: "nominal",
          },
        },
        {
          id: "node-2",
          type: "custom",
          position: { x: 400, y: 120 },
          data: {
            label: "CI/CD Pipeline",
            category: "pipeline",
            sublabel: "matrix · 4 runners",
            latencyMs: 92,
            status: "nominal",
          },
        },
        {
          id: "node-3",
          type: "custom",
          position: { x: 400, y: 320 },
          data: {
            label: "Security & SAST Scan",
            category: "security",
            sublabel: "CodeQL · Dependabot",
            latencyMs: 48,
            status: "nominal",
          },
        },
        {
          id: "node-4",
          type: "custom",
          position: { x: 740, y: 220 },
          data: {
            label: "Container Registry",
            category: "artifact",
            sublabel: "ghcr.io · sha256",
            latencyMs: 31,
            status: "nominal",
          },
        },
        {
          id: "node-5",
          type: "custom",
          position: { x: 1060, y: 220 },
          data: {
            label: "Production Cluster",
            category: "deployment",
            sublabel: "us-east · 6 replicas",
            latencyMs: 22,
            status: "nominal",
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-1",
          target: "node-2",
          type: "smoothstep",
          animated: true,
          className: "electric-edge",
        },
        {
          id: "edge-2",
          source: "node-1",
          target: "node-3",
          type: "smoothstep",
          animated: true,
          className: "electric-edge",
        },
        {
          id: "edge-3",
          source: "node-2",
          target: "node-4",
          type: "smoothstep",
          animated: true,
          className: "electric-edge",
        },
        {
          id: "edge-4",
          source: "node-3",
          target: "node-4",
          type: "smoothstep",
          animated: true,
          className: "electric-edge",
        },
        {
          id: "edge-5",
          source: "node-4",
          target: "node-5",
          type: "smoothstep",
          animated: true,
          className: "electric-edge",
        },
      ],
    };
  }

  // Default "nextjs-edge" or "security-gate" topology
  return {
    nodes: [
      {
        id: "node-1",
        type: "custom",
        position: { x: 100, y: 210 },
        data: {
          label: "GitHub Repository",
          category: "source",
          sublabel: repoLabel,
          latencyMs: 16,
          status: "nominal",
        },
      },
      {
        id: "node-2",
        type: "custom",
        position: { x: 430, y: 210 },
        data: {
          label: "CI/CD Pipeline",
          category: "pipeline",
          sublabel: "GitHub Actions · Turbo",
          latencyMs: 54,
          status: "nominal",
        },
      },
      {
        id: "node-3",
        type: "custom",
        position: { x: 760, y: 120 },
        data: {
          label: "Edge Build Artifact",
          category: "artifact",
          sublabel: "standalone · RSC bundle",
          latencyMs: 28,
          status: "nominal",
        },
      },
      {
        id: "node-4",
        type: "custom",
        position: { x: 760, y: 300 },
        data: {
          label: "Preview Environment",
          category: "deployment",
          sublabel: "PR #142 · branch-deploy",
          latencyMs: 19,
          status: "nominal",
        },
      },
      {
        id: "node-5",
        type: "custom",
        position: { x: 1090, y: 210 },
        data: {
          label: "Global Edge Network",
          category: "deployment",
          sublabel: "Production · 99.99% SLA",
          latencyMs: 11,
          status: "nominal",
        },
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "node-1",
        target: "node-2",
        type: "smoothstep",
        animated: true,
        className: "electric-edge",
      },
      {
        id: "edge-2",
        source: "node-2",
        target: "node-3",
        type: "smoothstep",
        animated: true,
        className: "electric-edge",
      },
      {
        id: "edge-3",
        source: "node-2",
        target: "node-4",
        type: "smoothstep",
        animated: true,
        className: "electric-edge",
      },
      {
        id: "edge-4",
        source: "node-3",
        target: "node-5",
        type: "smoothstep",
        animated: true,
        className: "electric-edge",
      },
    ],
  };
}

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  totalLatencyMs: number;
  isolatedNodes: number;
}

export function computeGraphMetrics(
  nodes: Array<{ id: string; type?: string; data?: CustomNodeData }>,
  edges: Array<{ source: string; target: string }>
): GraphMetrics {
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  const actionableNodes = nodes.filter((n) => n.type !== "group");
  let totalLatencyMs = 0;
  let isolatedNodes = 0;

  for (const node of actionableNodes) {
    const latency = node.data?.latencyMs ?? 25;
    totalLatencyMs += latency;
    if (!connectedIds.has(node.id)) {
      isolatedNodes += 1;
    }
  }

  return {
    nodeCount: actionableNodes.length,
    edgeCount: edges.length,
    totalLatencyMs,
    isolatedNodes,
  };
}

export function createDownstreamNode(
  existingNodes: Array<{ id: string; position: { x: number; y: number } }>,
  label: string,
  category: NodeCategory = "pipeline",
  sourceNodeId?: string
): { node: FlowNodeItem; edge?: FlowEdgeItem } {
  const cleanLabel = label.trim() || "New Pipeline Stage";
  const nextIndex = existingNodes.length + 1;
  const newId = `node-${Date.now()}-${nextIndex}`;

  const anchor = sourceNodeId
    ? existingNodes.find((n) => n.id === sourceNodeId)
    : existingNodes[existingNodes.length - 1];

  const posX = anchor ? anchor.position.x + 320 : 250;
  const offsetCount = existingNodes.filter(
    (n) => Math.abs(n.position.x - posX) < 60
  ).length;
  const posY = anchor ? anchor.position.y + offsetCount * 110 : 200;

  const node: FlowNodeItem = {
    id: newId,
    type: "custom",
    position: { x: posX, y: posY },
    data: {
      label: cleanLabel,
      category,
      sublabel: `${category} · active`,
      latencyMs: 35,
      status: "nominal",
    },
  };

  if (anchor) {
    return {
      node,
      edge: {
        id: `edge-${anchor.id}-${newId}`,
        source: anchor.id,
        target: newId,
        sourceHandle: "source-right",
        targetHandle: "target-left",
        type: "smoothstep",
        animated: true,
        className: "electric-edge",
      },
    };
  }

  return { node };
}
