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
