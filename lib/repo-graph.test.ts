import test from "node:test";
import assert from "node:assert/strict";
import {
  initialNodes,
  initialEdges,
  parseGitHubRepoUrl,
  buildRepoTopology,
  computeGraphMetrics,
  createDownstreamNode,
  filterGitHubTree,
  normalizeGeneratedGraph,
  deriveArchitectureFromFiles,
  assignCategoryFromFilePath,
} from "./repo-graph";

test("initialNodes and initialEdges match requested GitHub Repository -> CI/CD Pipeline setup", () => {
  assert.equal(initialNodes.length, 2);
  assert.equal(initialNodes[0].id, "node-1");
  assert.equal(initialNodes[0].type, "custom");
  assert.equal(initialNodes[0].data.label, "GitHub Repository");
  assert.equal(initialNodes[1].id, "node-2");
  assert.equal(initialNodes[1].type, "custom");
  assert.equal(initialNodes[1].data.label, "CI/CD Pipeline");

  assert.equal(initialEdges.length, 1);
  assert.equal(initialEdges[0].source, "node-1");
  assert.equal(initialEdges[0].target, "node-2");
  assert.equal(initialEdges[0].className, "electric-edge");
});

test("parseGitHubRepoUrl validates full URLs and owner/repo shorthand", () => {
  const full = parseGitHubRepoUrl("https://github.com/vercel/next.js");
  assert.equal(full.valid, true);
  assert.equal(full.owner, "vercel");
  assert.equal(full.repo, "next.js");

  const short = parseGitHubRepoUrl("facebook/react");
  assert.equal(short.valid, true);
  assert.equal(short.owner, "facebook");
  assert.equal(short.repo, "react");

  const empty = parseGitHubRepoUrl("   ");
  assert.equal(empty.valid, false);
  assert.ok(empty.error);

  const invalid = parseGitHubRepoUrl("not a valid url");
  assert.equal(invalid.valid, false);
});

test("filterGitHubTree keeps only blob files and filters ignored noise paths", () => {
  const rawTree = [
    { type: "tree", path: "src" },
    { type: "blob", path: "src/app/page.tsx" },
    { type: "blob", path: "node_modules/react/index.js" },
    { type: "blob", path: "public/logo.png" },
    { type: "blob", path: "package-lock.json" },
    { type: "blob", path: ".github/workflows/ci.yml" },
  ];
  const filtered = filterGitHubTree(rawTree);
  assert.deepEqual(filtered, ["src/app/page.tsx", ".github/workflows/ci.yml"]);
});

test("normalizeGeneratedGraph preserves group nodes, parentNode assignments, and electric-edge class", () => {
  const rawJson = {
    nodes: [
      { id: "n1", type: "custom", parentNode: "group-api", position: { x: 100, y: 150 }, data: { label: "API Gateway" } },
      { id: "group-api", type: "group", position: { x: 0, y: 0 }, data: { label: "API Cluster" } },
      { id: "n2", type: "custom", parentNode: "group-workers", position: { x: 350, y: 150 }, data: { label: "Worker Service" } },
    ],
    edges: [{ id: "e-n1-n2", source: "n1", target: "n2" }],
  };
  const normalized = normalizeGeneratedGraph(rawJson);
  // group-api + auto-created group-workers + n1 + n2 = 4 nodes
  assert.equal(normalized.nodes.length, 4);
  // Group nodes must come first
  assert.equal(normalized.nodes[0].type, "group");
  assert.equal(normalized.nodes[1].type, "group");
  const n1 = normalized.nodes.find((n) => n.id === "n1");
  assert.equal(n1?.type, "custom");
  assert.equal(n1?.parentNode, "group-api");
  assert.equal(normalized.edges.length, 1);
  assert.equal(normalized.edges[0].type, "smoothstep");
  assert.equal(normalized.edges[0].className, "electric-edge");
  assert.equal(normalized.edges[0].animated, true);
});

test("deriveArchitectureFromFiles maps repository files into grouped cluster nodes and edges", () => {
  const files = [
    "package.json",
    ".github/workflows/deploy.yml",
    "app/page.tsx",
    "app/api/github/route.ts",
    "lib/repo-graph.test.ts",
  ];
  const derived = deriveArchitectureFromFiles(files, "acme", "platform");
  const groupNodes = derived.nodes.filter((n) => n.type === "group");
  const fileNodes = derived.nodes.filter((n) => n.type === "custom");
  assert.ok(groupNodes.length >= 2);
  assert.ok(fileNodes.length >= 4);
  assert.ok(fileNodes.every((n) => typeof n.parentNode === "string"));
  assert.ok(derived.edges.length >= 3);
  assert.ok(derived.edges.every((e) => e.className === "electric-edge" && e.type === "smoothstep"));
});

test("buildRepoTopology constructs electric-edge connected nodes", () => {
  const topo = buildRepoTopology("vercel", "next.js", "nextjs-edge");
  assert.equal(topo.nodes.length, 5);
  assert.equal(topo.edges.length, 4);
  assert.ok(topo.edges.every((e) => e.className === "electric-edge"));
  assert.equal(topo.nodes[0].data.label, "GitHub Repository");
  assert.equal(topo.nodes[1].data.label, "CI/CD Pipeline");
});

test("computeGraphMetrics calculates total latency and isolated nodes accurately", () => {
  const metrics = computeGraphMetrics(initialNodes, initialEdges);
  assert.equal(metrics.nodeCount, 2);
  assert.equal(metrics.edgeCount, 1);
  assert.equal(metrics.totalLatencyMs, 82);
  assert.equal(metrics.isolatedNodes, 0);
});

test("createDownstreamNode positions node downstream and attaches electric-edge", () => {
  const { node, edge } = createDownstreamNode(
    initialNodes,
    "Docker Registry",
    "artifact",
    "node-2"
  );
  assert.equal(node.data.label, "Docker Registry");
  assert.equal(node.type, "custom");
  assert.ok(node.position.x > initialNodes[1].position.x);
  assert.ok(edge);
  assert.equal(edge?.source, "node-2");
  assert.equal(edge?.target, node.id);
  assert.equal(edge?.className, "electric-edge");
});

test("normalizeGeneratedGraph and deriveArchitectureFromFiles preserve api, database, and service categories", () => {
  const normalized = normalizeGeneratedGraph({
    nodes: [
      { id: "n-api", type: "custom", position: { x: 0, y: 0 }, data: { label: "API Route", category: "API" } },
      { id: "n-db", type: "custom", position: { x: 200, y: 0 }, data: { label: "Postgres", category: "database" } },
      { id: "n-svc", type: "custom", position: { x: 400, y: 0 }, data: { label: "Worker", category: "service" } },
    ],
    edges: [],
  });

  assert.equal(normalized.nodes[0].data.category, "api");
  assert.equal(normalized.nodes[1].data.category, "database");
  assert.equal(normalized.nodes[2].data.category, "service");

  const derived = deriveArchitectureFromFiles([
    "app/api/users/route.ts",
    "prisma/schema.prisma",
    "lib/auth-service.ts",
  ]);
  const apiNode = derived.nodes.find((n) => n.data.sublabel === "app/api/users/route.ts");
  const dbNode = derived.nodes.find((n) => n.data.sublabel === "prisma/schema.prisma");
  const svcNode = derived.nodes.find((n) => n.data.sublabel === "lib/auth-service.ts");

  assert.equal(apiNode?.data.category, "api");
  assert.equal(dbNode?.data.category, "database");
  assert.equal(svcNode?.data.category, "service");
});

test("assignCategoryFromFilePath assigns categories based on file path string prefixes", () => {
  assert.equal(assignCategoryFromFilePath(".github/workflows/ci.yml"), "ci");
  assert.equal(assignCategoryFromFilePath("ci/release.sh"), "ci");
  assert.equal(assignCategoryFromFilePath("database/migrations/001.sql"), "database");
  assert.equal(assignCategoryFromFilePath("db/seed.ts"), "database");
  assert.equal(assignCategoryFromFilePath("prisma/schema.prisma"), "database");
  assert.equal(assignCategoryFromFilePath("frontend/src/App.tsx"), "frontend");
  assert.equal(assignCategoryFromFilePath("components/Navbar.tsx"), "frontend");
  assert.equal(assignCategoryFromFilePath("src/app/page.tsx"), "frontend");
  assert.equal(assignCategoryFromFilePath("src/app/api/auth/route.ts"), "api");
  assert.equal(assignCategoryFromFilePath("api/v1/users.ts"), "api");
  assert.equal(assignCategoryFromFilePath("services/billing.ts"), "service");
  assert.equal(assignCategoryFromFilePath("tests/e2e/login.spec.ts"), "testing");
  assert.equal(assignCategoryFromFilePath("auth/jwt.ts"), "security");
  assert.equal(assignCategoryFromFilePath("infra/main.tf"), "deployment");
  assert.equal(assignCategoryFromFilePath("config/env.ts"), "config");
  assert.equal(assignCategoryFromFilePath("./Frontend\\Components\\Card.tsx"), "frontend");
});

test("deriveArchitectureFromFiles and normalizeGeneratedGraph automatically assign categories from file paths", () => {
  const derived = deriveArchitectureFromFiles([
    ".github/workflows/ci.yml",
    "database/schema.sql",
    "frontend/App.tsx",
    "api/health/route.ts",
  ]);
  const ciNode = derived.nodes.find((n) => n.data.filePath === ".github/workflows/ci.yml");
  const dbNode = derived.nodes.find((n) => n.data.filePath === "database/schema.sql");
  const feNode = derived.nodes.find((n) => n.data.filePath === "frontend/App.tsx");
  const apiNode = derived.nodes.find((n) => n.data.filePath === "api/health/route.ts");

  assert.equal(ciNode?.data.category, "ci");
  assert.equal(dbNode?.data.category, "database");
  assert.equal(feNode?.data.category, "frontend");
  assert.equal(apiNode?.data.category, "api");

  const normalized = normalizeGeneratedGraph({
    nodes: [
      {
        id: "n-ci",
        type: "custom",
        position: { x: 0, y: 0 },
        data: { label: "ci.yml", filePath: ".github/workflows/ci.yml" },
      },
      {
        id: "n-db",
        type: "custom",
        position: { x: 200, y: 0 },
        data: { label: "schema.sql", sublabel: "db/migrations/schema.sql" },
      },
      {
        id: "n-fe",
        type: "custom",
        position: { x: 400, y: 0 },
        data: { label: "frontend/pages/Home.tsx (Landing view)" },
      },
    ],
    edges: [],
  });

  assert.equal(normalized.nodes[0].data.category, "ci");
  assert.equal(normalized.nodes[1].data.category, "database");
  assert.equal(normalized.nodes[2].data.category, "frontend");
});

test("normalizeGeneratedGraph resolves group-to-group and alias edges, prunes empty groups, and bridges disconnected containers", () => {
  const normalized = normalizeGeneratedGraph({
    nodes: [
      { id: "group-empty", type: "group", position: { x: 0, y: 0 }, data: { label: "Unused Group" } },
      { id: "group-frontend", type: "group", position: { x: 0, y: 0 }, data: { label: "Frontend" } },
      { id: "group-api", type: "group", position: { x: 0, y: 0 }, data: { label: "API" } },
      { id: "group-db", type: "group", position: { x: 0, y: 0 }, data: { label: "Database" } },
      {
        id: "fe-page",
        type: "custom",
        parentNode: "group-frontend",
        position: { x: 0, y: 0 },
        data: { label: "app/page.tsx (Main page)", filePath: "app/page.tsx", category: "source" },
      },
      {
        id: "api-route",
        type: "custom",
        parentNode: "group-api",
        position: { x: 0, y: 0 },
        data: { label: "route.ts (API handler)", sublabel: "app/api/users/route.ts", category: "api" },
      },
      {
        id: "db-schema",
        type: "custom",
        parentNode: "group-db",
        position: { x: 0, y: 0 },
        data: { label: "schema.prisma (ORM schema)", filePath: "prisma/schema.prisma", category: "database" },
      },
    ],
    edges: [
      // Group-to-group edge must resolve to child custom nodes
      { id: "e-group", source: "group-frontend", target: "group-api" },
      // Filepath/sublabel aliases must resolve to node IDs (and db-schema stays disconnected until bridged!)
      { id: "e-alias-dup", source: "app/page.tsx", target: "app/api/users/route.ts" },
      // Self-loop should be dropped
      { id: "e-self", source: "group-api", target: "api-route" },
    ],
  });

  // Empty group must be pruned
  assert.equal(normalized.nodes.some((n) => n.id === "group-empty"), false);

  const customNodes = normalized.nodes.filter((n) => n.type === "custom");
  const customIdSet = new Set(customNodes.map((n) => n.id));

  // No edge may target a group node or be a self-loop
  assert.ok(normalized.edges.length >= 2);
  for (const edge of normalized.edges) {
    assert.ok(customIdSet.has(edge.source), `edge source ${edge.source} must be a custom node`);
    assert.ok(customIdSet.has(edge.target), `edge target ${edge.target} must be a custom node`);
    assert.notEqual(edge.source, edge.target);
    assert.equal(edge.type, "smoothstep");
    assert.equal(edge.className, "electric-edge");
  }

  // BFS reachability check: all custom nodes must form a single connected component
  const adj = new Map<string, Set<string>>();
  for (const n of customNodes) adj.set(n.id, new Set());
  for (const e of normalized.edges) {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  }
  const visited = new Set<string>();
  const queue = [customNodes[0].id];
  visited.add(customNodes[0].id);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nxt of adj.get(cur) ?? []) {
      if (!visited.has(nxt)) {
        visited.add(nxt);
        queue.push(nxt);
      }
    }
  }
  assert.equal(visited.size, customNodes.length, "All custom nodes across containers must be connected");
});


