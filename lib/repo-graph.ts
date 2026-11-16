export type NodeCategory =
  | "api"
  | "database"
  | "service"
  | "source"
  | "pipeline"
  | "ci"
  | "artifact"
  | "deployment"
  | "ui"
  | "frontend"
  | "config"
  | "security"
  | "testing";

export const VALID_NODE_CATEGORIES: ReadonlySet<NodeCategory> = new Set([
  "api",
  "database",
  "service",
  "source",
  "pipeline",
  "ci",
  "artifact",
  "deployment",
  "ui",
  "frontend",
  "config",
  "security",
  "testing",
]);

export interface CustomNodeData {
  label: string;
  category?: NodeCategory;
  sublabel?: string;
  filePath?: string;
  color?: string;
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
  label?: string;
  labelShowBg?: boolean;
  labelStyle?: Record<string, string | number>;
  labelBgStyle?: Record<string, string | number>;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  className: string;
  style?: Record<string, string | number>;
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
      const filePath =
        typeof dataObj.filePath === "string" && dataObj.filePath.trim()
          ? dataObj.filePath.trim()
          : undefined;
      const color =
        typeof dataObj.color === "string" && dataObj.color.trim()
          ? dataObj.color.trim()
          : undefined;
      const rawCategory =
        typeof dataObj.category === "string"
          ? (dataObj.category.trim().toLowerCase() as NodeCategory)
          : undefined;
      const explicitCategory =
        rawCategory && VALID_NODE_CATEGORIES.has(rawCategory)
          ? rawCategory
          : undefined;
      const inferredPathCandidate =
        filePath ??
        (sublabel && (sublabel.includes("/") || sublabel.includes("."))
          ? sublabel
          : undefined) ??
        extractPathFromLabel(label);
      const category =
        explicitCategory ??
        (nodeType === "custom" && inferredPathCandidate
          ? assignCategoryFromFilePath(inferredPathCandidate)
          : undefined);
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
          ...(filePath ? { filePath } : {}),
          ...(color ? { color } : {}),
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
  const fileNodes = parsedNodes.filter((n) => n.type !== "group");
  const referencedGroupIds = new Set(
    fileNodes
      .map((n) => n.parentNode)
      .filter((pid): pid is string => Boolean(pid))
  );

  // Keep only group containers that actually contain at least one child node
  const groupNodes = [
    ...parsedNodes.filter((n) => n.type === "group"),
    ...autoGroups,
  ].filter((g) => referencedGroupIds.has(g.id));

  const nodes: FlowNodeItem[] = [...groupNodes, ...fileNodes];

  // Build lookups so edges referencing group IDs, file paths, or labels resolve cleanly to custom child nodes
  const groupToChildren = new Map<string, FlowNodeItem[]>();
  for (const child of fileNodes) {
    if (child.parentNode) {
      const list = groupToChildren.get(child.parentNode) ?? [];
      list.push(child);
      groupToChildren.set(child.parentNode, list);
    }
  }

  const fileNodeIdSet = new Set(fileNodes.map((n) => n.id));
  const groupIdSet = new Set(groupNodes.map((g) => g.id));
  const aliasToNodeId = new Map<string, string>();
  for (const child of fileNodes) {
    aliasToNodeId.set(child.id.toLowerCase(), child.id);
    if (child.data.filePath) {
      aliasToNodeId.set(child.data.filePath.toLowerCase(), child.id);
    }
    if (child.data.sublabel) {
      aliasToNodeId.set(child.data.sublabel.toLowerCase(), child.id);
    }
    const primaryLabel = child.data.label.split(/\s+\(/)[0]?.trim().toLowerCase();
    if (primaryLabel && !aliasToNodeId.has(primaryLabel)) {
      aliasToNodeId.set(primaryLabel, child.id);
    }
  }

  const resolveEndpointToCustomNode = (
    rawEndpoint: string,
    preferDifferentFrom?: string
  ): string | null => {
    if (!rawEndpoint) return null;
    if (fileNodeIdSet.has(rawEndpoint)) return rawEndpoint;
    if (groupIdSet.has(rawEndpoint)) {
      const children = groupToChildren.get(rawEndpoint) ?? [];
      if (children.length === 0) return null;
      const alt = preferDifferentFrom
        ? children.find((c) => c.id !== preferDifferentFrom)
        : undefined;
      return (alt ?? children[0]).id;
    }
    const byAlias = aliasToNodeId.get(rawEndpoint.toLowerCase());
    if (byAlias && fileNodeIdSet.has(byAlias)) return byAlias;
    return null;
  };

  const seenEdgePairs = new Set<string>();
  const edges: FlowEdgeItem[] = rawEdges
    .map((item, idx): FlowEdgeItem | null => {
      if (!item || typeof item !== "object") return null;
      const e = item as Record<string, unknown>;
      const rawSource = typeof e.source === "string" ? e.source.trim() : "";
      const rawTarget = typeof e.target === "string" ? e.target.trim() : "";
      const source = resolveEndpointToCustomNode(rawSource);
      const target = resolveEndpointToCustomNode(rawTarget, source ?? undefined);
      if (!source || !target || source === target) {
        return null;
      }
      const pairKey = `${source}->${target}`;
      if (seenEdgePairs.has(pairKey)) {
        return null;
      }
      seenEdgePairs.add(pairKey);

      const id =
        typeof e.id === "string" && e.id.trim()
          ? e.id.trim()
          : `e-${source}-${target}-${idx}`;

      const edgeLabel =
        typeof e.label === "string" && e.label.trim()
          ? e.label.trim()
          : undefined;

      return {
        id,
        source,
        target,
        type: "smoothstep",
        animated: true,
        ...(edgeLabel
          ? {
              label: edgeLabel,
              labelShowBg: true,
              labelStyle: {
                fill: "#e2e8f0",
                fontSize: 11,
                fontWeight: 500,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              },
              labelBgStyle: {
                fill: "#090d16",
                fillOpacity: 0.92,
                stroke: "#334155",
                strokeWidth: 1,
              },
              labelBgPadding: [8, 4] as [number, number],
              labelBgBorderRadius: 6,
            }
          : {}),
        className: "electric-edge",
      };
    })
    .filter((e): e is FlowEdgeItem => e !== null);

  // Ensure every container / connected component is linked into a unified flow graph
  // so no container gets isolated or separated with missing inter-container paths
  if (fileNodes.length > 1) {
    const adjacency = new Map<string, Set<string>>();
    for (const node of fileNodes) {
      adjacency.set(node.id, new Set());
    }
    for (const edge of edges) {
      adjacency.get(edge.source)?.add(edge.target);
      adjacency.get(edge.target)?.add(edge.source);
    }

    const visited = new Set<string>();
    const components: FlowNodeItem[][] = [];

    for (const node of fileNodes) {
      if (visited.has(node.id)) continue;
      const component: FlowNodeItem[] = [];
      const queue: FlowNodeItem[] = [node];
      visited.add(node.id);
      while (queue.length > 0) {
        const current = queue.shift()!;
        component.push(current);
        for (const neighborId of adjacency.get(current.id) ?? []) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            const neighbor = fileNodes.find((n) => n.id === neighborId);
            if (neighbor) queue.push(neighbor);
          }
        }
      }
      components.push(component);
    }

    if (components.length > 1) {
      // Prefer the largest component (or the one with a source/config node) as the primary hub
      let primaryIndex = 0;
      let bestScore = -1;
      components.forEach((comp, idx) => {
        const hasRoot = comp.some(
          (n) => n.data.category === "source" || n.id.includes("root")
        );
        const score = comp.length + (hasRoot ? 1000 : 0);
        if (score > bestScore) {
          bestScore = score;
          primaryIndex = idx;
        }
      });

      const primaryComp = components[primaryIndex];
      const primaryAnchor =
        primaryComp.find(
          (n) => n.data.category === "source" || n.id.includes("root")
        ) ?? primaryComp[0];

      components.forEach((comp, idx) => {
        if (idx === primaryIndex || comp.length === 0) return;
        const targetNode = comp[0];
        const pairKey = `${primaryAnchor.id}->${targetNode.id}`;
        if (!seenEdgePairs.has(pairKey)) {
          seenEdgePairs.add(pairKey);
          edges.push({
            id: `e-bridge-${primaryAnchor.id}-${targetNode.id}`,
            source: primaryAnchor.id,
            target: targetNode.id,
            type: "smoothstep",
            animated: true,
            className: "electric-edge",
          });
        }
      });
    }
  }

  return { nodes, edges };
}

export const FILE_PATH_PREFIX_CATEGORIES: ReadonlyArray<{
  prefix: string;
  category: NodeCategory;
}> = [
  // CI / CD automation prefixes
  { prefix: ".github/workflows/", category: "ci" },
  { prefix: ".github/actions/", category: "ci" },
  { prefix: ".github/", category: "ci" },
  { prefix: ".gitlab-ci", category: "ci" },
  { prefix: ".circleci/", category: "ci" },
  { prefix: ".buildkite/", category: "ci" },
  { prefix: ".azure-pipelines", category: "ci" },
  { prefix: "ci/", category: "ci" },
  { prefix: ".ci/", category: "ci" },
  { prefix: "jenkins/", category: "ci" },
  { prefix: "jenkinsfile", category: "ci" },

  // Database & schema prefixes
  { prefix: "prisma/", category: "database" },
  { prefix: "drizzle/", category: "database" },
  { prefix: "db/", category: "database" },
  { prefix: "database/", category: "database" },
  { prefix: "databases/", category: "database" },
  { prefix: "migrations/", category: "database" },
  { prefix: "migration/", category: "database" },
  { prefix: "sql/", category: "database" },
  { prefix: "schema/", category: "database" },
  { prefix: "schemas/", category: "database" },
  { prefix: "models/", category: "database" },
  { prefix: "entities/", category: "database" },
  { prefix: "repositories/", category: "database" },
  { prefix: "supabase/", category: "database" },
  { prefix: "src/db/", category: "database" },
  { prefix: "src/database/", category: "database" },
  { prefix: "src/prisma/", category: "database" },
  { prefix: "src/drizzle/", category: "database" },
  { prefix: "src/models/", category: "database" },
  { prefix: "src/entities/", category: "database" },
  { prefix: "src/schemas/", category: "database" },
  { prefix: "server/db/", category: "database" },
  { prefix: "backend/db/", category: "database" },

  // API prefixes (matched before broader app/, pages/, server/, and backend/ prefixes)
  { prefix: "app/api/", category: "api" },
  { prefix: "src/app/api/", category: "api" },
  { prefix: "pages/api/", category: "api" },
  { prefix: "src/pages/api/", category: "api" },
  { prefix: "api/", category: "api" },
  { prefix: "apis/", category: "api" },
  { prefix: "routes/", category: "api" },
  { prefix: "controllers/", category: "api" },
  { prefix: "endpoints/", category: "api" },
  { prefix: "graphql/", category: "api" },
  { prefix: "trpc/", category: "api" },
  { prefix: "src/api/", category: "api" },
  { prefix: "src/routes/", category: "api" },
  { prefix: "src/controllers/", category: "api" },
  { prefix: "src/endpoints/", category: "api" },
  { prefix: "src/graphql/", category: "api" },
  { prefix: "src/trpc/", category: "api" },
  { prefix: "server/api/", category: "api" },
  { prefix: "server/routes/", category: "api" },
  { prefix: "backend/api/", category: "api" },
  { prefix: "backend/routes/", category: "api" },

  // Testing prefixes (matched before src/)
  { prefix: "tests/", category: "testing" },
  { prefix: "test/", category: "testing" },
  { prefix: "__tests__/", category: "testing" },
  { prefix: "e2e/", category: "testing" },
  { prefix: "cypress/", category: "testing" },
  { prefix: "playwright/", category: "testing" },
  { prefix: "spec/", category: "testing" },
  { prefix: "specs/", category: "testing" },
  { prefix: "bench/", category: "testing" },
  { prefix: "benchmarks/", category: "testing" },
  { prefix: "src/tests/", category: "testing" },
  { prefix: "src/test/", category: "testing" },
  { prefix: "src/__tests__/", category: "testing" },

  // Security & authentication prefixes (matched before src/)
  { prefix: "auth/", category: "security" },
  { prefix: "security/", category: "security" },
  { prefix: "policies/", category: "security" },
  { prefix: "middleware/", category: "security" },
  { prefix: "src/auth/", category: "security" },
  { prefix: "src/security/", category: "security" },
  { prefix: "src/middleware/", category: "security" },

  // Frontend UI & routing prefixes (matched before broader src/)
  { prefix: "frontend/", category: "frontend" },
  { prefix: "client/", category: "frontend" },
  { prefix: "web/", category: "frontend" },
  { prefix: "ui/", category: "frontend" },
  { prefix: "components/", category: "frontend" },
  { prefix: "pages/", category: "frontend" },
  { prefix: "views/", category: "frontend" },
  { prefix: "layouts/", category: "frontend" },
  { prefix: "app/", category: "frontend" },
  { prefix: "styles/", category: "frontend" },
  { prefix: "public/", category: "frontend" },
  { prefix: "assets/", category: "frontend" },
  { prefix: "hooks/", category: "frontend" },
  { prefix: "src/frontend/", category: "frontend" },
  { prefix: "src/ui/", category: "frontend" },
  { prefix: "src/components/", category: "frontend" },
  { prefix: "src/pages/", category: "frontend" },
  { prefix: "src/views/", category: "frontend" },
  { prefix: "src/layouts/", category: "frontend" },
  { prefix: "src/app/", category: "frontend" },
  { prefix: "src/styles/", category: "frontend" },
  { prefix: "src/hooks/", category: "frontend" },

  // Deployment & infrastructure prefixes
  { prefix: "deploy/", category: "deployment" },
  { prefix: "deployment/", category: "deployment" },
  { prefix: "infra/", category: "deployment" },
  { prefix: "infrastructure/", category: "deployment" },
  { prefix: "terraform/", category: "deployment" },
  { prefix: "k8s/", category: "deployment" },
  { prefix: "kubernetes/", category: "deployment" },
  { prefix: "helm/", category: "deployment" },
  { prefix: "charts/", category: "deployment" },
  { prefix: "ansible/", category: "deployment" },
  { prefix: "docker/", category: "deployment" },
  { prefix: "dockerfile", category: "deployment" },
  { prefix: "docker-compose", category: "deployment" },

  // Backend & shared service prefixes
  { prefix: "services/", category: "service" },
  { prefix: "service/", category: "service" },
  { prefix: "backend/", category: "service" },
  { prefix: "server/", category: "service" },
  { prefix: "workers/", category: "service" },
  { prefix: "worker/", category: "service" },
  { prefix: "jobs/", category: "service" },
  { prefix: "queues/", category: "service" },
  { prefix: "lib/", category: "service" },
  { prefix: "utils/", category: "service" },
  { prefix: "scripts/", category: "service" },
  { prefix: "core/", category: "service" },
  { prefix: "src/services/", category: "service" },
  { prefix: "src/service/", category: "service" },
  { prefix: "src/workers/", category: "service" },
  { prefix: "src/lib/", category: "service" },
  { prefix: "src/utils/", category: "service" },
  { prefix: "src/server/", category: "service" },
  { prefix: "src/", category: "service" },

  // Configuration & manifest prefixes
  { prefix: "config/", category: "config" },
  { prefix: "configs/", category: "config" },
  { prefix: ".vscode/", category: "config" },
  { prefix: ".husky/", category: "config" },
  { prefix: "package.json", category: "config" },
  { prefix: "tsconfig", category: "config" },
  { prefix: "next.config", category: "config" },
  { prefix: "tailwind.config", category: "config" },
  { prefix: "postcss.config", category: "config" },
  { prefix: "eslint", category: "config" },
  { prefix: ".eslintrc", category: "config" },
  { prefix: ".env", category: "config" },
  { prefix: "cargo.toml", category: "config" },
  { prefix: "pyproject.toml", category: "config" },
  { prefix: "go.mod", category: "config" },
  { prefix: "makefile", category: "config" },

  // Documentation / source prefixes
  { prefix: "docs/", category: "source" },
  { prefix: "readme", category: "source" },
];

function extractPathFromLabel(label: string): string | undefined {
  const firstToken = label.trim().split(/\s+/)[0];
  if (!firstToken) return undefined;
  if (firstToken.includes("/") || firstToken.includes(".")) {
    return firstToken;
  }
  return undefined;
}

/**
 * Automatically assigns a semantic NodeCategory based on a repository file path's
 * string prefix (normalized by trimming, converting backslashes, stripping leading
 * './' or '/', and lowercasing), falling back to filename/extension heuristics
 * when no top-level prefix matches.
 */
export function assignCategoryFromFilePath(filePath: string): NodeCategory {
  if (typeof filePath !== "string") return "artifact";
  const normalized = filePath
    .trim()
    .replace(/\\/g, "/")
    .replace(/^(?:\.\/|\/)+/, "")
    .toLowerCase();

  if (!normalized) return "artifact";

  for (const rule of FILE_PATH_PREFIX_CATEGORIES) {
    if (normalized.startsWith(rule.prefix)) {
      return rule.category;
    }
  }

  // Fallback heuristics for nested monorepo paths or unrecognized prefixes
  if (normalized.includes("/.github/workflows/")) return "ci";
  if (
    normalized.endsWith(".sql") ||
    normalized.includes("/prisma/") ||
    normalized.includes("/drizzle/") ||
    normalized.includes("/db/") ||
    normalized.includes("/models/") ||
    normalized.includes("schema.")
  ) {
    return "database";
  }
  if (
    normalized.includes("/api/") ||
    normalized === "route.ts" ||
    normalized === "route.js" ||
    normalized.endsWith("/route.ts") ||
    normalized.endsWith("/route.js")
  ) {
    return "api";
  }
  if (
    normalized.includes(".test.") ||
    normalized.includes(".spec.") ||
    normalized.includes("/__tests__/")
  ) {
    return "testing";
  }
  if (
    normalized.endsWith(".tsx") ||
    normalized.endsWith(".jsx") ||
    normalized.endsWith(".vue") ||
    normalized.endsWith(".svelte") ||
    normalized.endsWith(".css") ||
    normalized.includes("/components/") ||
    normalized.includes("/ui/")
  ) {
    return "frontend";
  }
  if (
    normalized.endsWith("package.json") ||
    normalized.endsWith("cargo.toml") ||
    normalized.includes("next.config") ||
    normalized.includes("tsconfig")
  ) {
    return "config";
  }

  return "artifact";
}

function inferFilePurpose(filePath: string): {
  purpose: string;
  category: NodeCategory;
  groupId: string;
  groupLabel: string;
} {
  const lower = filePath.toLowerCase();
  const category = assignCategoryFromFilePath(filePath);

  if (category === "ci" || category === "pipeline") {
    return {
      purpose: "(CI/CD automation workflow)",
      category,
      groupId: "group-cicd",
      groupLabel: "CI/CD & Automation",
    };
  }
  if (category === "config") {
    const isManifest =
      lower.endsWith("package.json") ||
      lower.endsWith("cargo.toml") ||
      lower.endsWith("pyproject.toml") ||
      lower.endsWith("go.mod");
    return {
      purpose: isManifest
        ? "(Manifest & dependencies)"
        : "(Compiler & build config)",
      category,
      groupId: "group-config",
      groupLabel: "Configuration & Manifests",
    };
  }
  if (category === "database") {
    return {
      purpose: "(Database schema & data layer)",
      category,
      groupId: "group-database",
      groupLabel: "Data Persistence & Schemas",
    };
  }
  if (category === "api") {
    return {
      purpose: "(Server API endpoint)",
      category,
      groupId: "group-backend",
      groupLabel: "Backend API & Services",
    };
  }
  if (category === "frontend" || category === "ui") {
    const purpose =
      lower.endsWith("layout.tsx") || lower.endsWith("layout.js")
        ? "(Root application shell)"
        : lower.endsWith("page.tsx") ||
            lower.endsWith("page.js") ||
            lower.endsWith("index.ts")
          ? "(View entry & route module)"
          : "(Frontend UI module)";
    return {
      purpose,
      category,
      groupId: "group-frontend",
      groupLabel: "Frontend UI & Routing",
    };
  }
  if (category === "testing") {
    return {
      purpose: "(Verification & test suite)",
      category,
      groupId: "group-testing",
      groupLabel: "Verification & Tests",
    };
  }
  if (category === "security") {
    return {
      purpose: "(Auth & security boundary)",
      category,
      groupId: "group-security",
      groupLabel: "Security & Auth",
    };
  }
  if (category === "deployment") {
    return {
      purpose: "(Infrastructure & deployment)",
      category,
      groupId: "group-deployment",
      groupLabel: "Infrastructure & Deployment",
    };
  }
  if (category === "service") {
    return {
      purpose: "(Core service & logic)",
      category,
      groupId: "group-backend",
      groupLabel: "Backend API & Services",
    };
  }
  return {
    purpose: "(Core codebase module)",
    category,
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
        filePath,
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
