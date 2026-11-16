import test from "node:test";
import assert from "node:assert/strict";
import { getLayoutedElements } from "./layout";
import type { Node, Edge } from "reactflow";

test("getLayoutedElements arranges connected nodes left-to-right (LR) without overlap", () => {
  const messyNodes: Node[] = [
    { id: "n1", type: "custom", position: { x: 999, y: 999 }, data: { label: "Repo" } },
    { id: "n2", type: "custom", position: { x: 0, y: 0 }, data: { label: "Build" } },
    { id: "n3", type: "custom", position: { x: 50, y: 50 }, data: { label: "Deploy" } },
  ];
  const edges: Edge[] = [
    { id: "e1", source: "n1", target: "n2" },
    { id: "e2", source: "n2", target: "n3" },
  ];

  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    messyNodes,
    edges,
    "LR"
  );

  assert.equal(layoutedNodes.length, 3);
  assert.equal(layoutedEdges.length, 2);

  const pos1 = layoutedNodes.find((n) => n.id === "n1")!.position;
  const pos2 = layoutedNodes.find((n) => n.id === "n2")!.position;
  const pos3 = layoutedNodes.find((n) => n.id === "n3")!.position;

  assert.ok(pos1.x < pos2.x, "n1 should be positioned to the left of n2");
  assert.ok(pos2.x < pos3.x, "n2 should be positioned to the left of n3");
});

test("getLayoutedElements defaults to top-to-bottom (TB) when direction is omitted", () => {
  const messyNodes: Node[] = [
    { id: "a", type: "custom", position: { x: 0, y: 500 }, data: { label: "Source.ts\n(Entry point)" } },
    { id: "b", type: "custom", position: { x: 0, y: 0 }, data: { label: "Target.ts\n(Core module)" } },
  ];
  const edges: Edge[] = [{ id: "e-ab", source: "a", target: "b" }];

  const { nodes: layoutedNodes } = getLayoutedElements(messyNodes, edges);
  const posA = layoutedNodes.find((n) => n.id === "a")!.position;
  const posB = layoutedNodes.find((n) => n.id === "b")!.position;

  assert.ok(posA.y < posB.y, "node a should be positioned above node b by default (TB)");
});

test("getLayoutedElements sizes group nodes and positions child nodes with parentNode using compound Dagre layout", () => {
  const nodes: Node[] = [
    {
      id: "file-worker",
      type: "custom",
      parentNode: "group-inference",
      position: { x: 0, y: 0 },
      data: { label: "worker.ts (Inference worker)" },
    },
    {
      id: "file-model",
      type: "custom",
      parentNode: "group-inference",
      position: { x: 0, y: 0 },
      data: { label: "model.ts (YOLO weights)" },
    },
    {
      id: "group-inference",
      type: "group",
      position: { x: 0, y: 0 },
      data: { label: "YOLO Inference" },
    },
  ];
  const edges: Edge[] = [
    { id: "e-worker-model", source: "file-worker", target: "file-model" },
  ];

  const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
  assert.equal(layouted[0].id, "group-inference", "group node must precede child nodes");
  assert.ok(layouted[0].style?.width && Number(layouted[0].style.width) >= 400);
  assert.equal(layouted[1].parentNode, "group-inference");
  assert.equal(layouted[1].extent, "parent");
  assert.equal(layoutedEdges[0].type, "smoothstep");
});

test("getLayoutedElements separates multiple containers cleanly, prevents Dagre crashes on group edges, and snaps cross-container handles", () => {
  const nodes: Node[] = [
    { id: "group-a", type: "group", position: { x: 0, y: 0 }, data: { label: "Frontend" } },
    { id: "group-b", type: "group", position: { x: 0, y: 0 }, data: { label: "Backend API" } },
    { id: "group-c", type: "group", position: { x: 0, y: 0 }, data: { label: "Database" } },
    { id: "a1", type: "custom", parentNode: "group-a", position: { x: 0, y: 0 }, data: { label: "page.tsx" } },
    { id: "a2", type: "custom", parentNode: "group-a", position: { x: 0, y: 0 }, data: { label: "layout.tsx" } },
    { id: "b1", type: "custom", parentNode: "group-b", position: { x: 0, y: 0 }, data: { label: "route.ts" } },
    { id: "c1", type: "custom", parentNode: "group-c", position: { x: 0, y: 0 }, data: { label: "schema.prisma" } },
  ];
  const edges: Edge[] = [
    { id: "e-ab", source: "a1", target: "b1", className: "electric-edge" },
    // Intentionally reference group IDs to verify layout sanitization never crashes Dagre
    { id: "e-bc-group", source: "group-b", target: "group-c", className: "electric-edge" },
  ];

  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, "TB");

  const groups = layoutedNodes.filter((n) => n.type === "group");
  assert.equal(groups.length, 3);

  // Verify zero container-to-container overlap (with CONTAINER_GAP = 48 clearance check)
  for (let i = 0; i < groups.length; i++) {
    const g1 = groups[i];
    const w1 = Number(g1.style?.width || 0);
    const h1 = Number(g1.style?.height || 0);
    for (let j = i + 1; j < groups.length; j++) {
      const g2 = groups[j];
      const w2 = Number(g2.style?.width || 0);
      const h2 = Number(g2.style?.height || 0);
      const overlaps =
        g1.position.x < g2.position.x + w2 &&
        g1.position.x + w1 > g2.position.x &&
        g1.position.y < g2.position.y + h2 &&
        g1.position.y + h1 > g2.position.y;
      assert.equal(overlaps, false, `Containers ${g1.id} and ${g2.id} must not overlap`);
    }
  }

  // Verify every child node stays inside its parent group container bounds
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  for (const child of layoutedNodes.filter((n) => n.type !== "group")) {
    const parent = groupMap.get(child.parentNode!);
    assert.ok(parent, `Parent ${child.parentNode} must exist`);
    const pw = Number(parent.style?.width || 0);
    const ph = Number(parent.style?.height || 0);
    assert.ok(child.position.x >= 0 && child.position.x + 250 <= pw, `${child.id} fits horizontally inside ${parent.id}`);
    assert.ok(child.position.y >= 0 && child.position.y + 80 <= ph, `${child.id} fits vertically inside ${parent.id}`);
  }

  // Verify edges were snapped with valid sourceHandle/targetHandle and target custom nodes
  assert.equal(layoutedEdges.length, 2);
  for (const edge of layoutedEdges) {
    assert.ok(edge.sourceHandle?.startsWith("source-"));
    assert.ok(edge.targetHandle?.startsWith("target-"));
    assert.equal(edge.type, "smoothstep");
  }
});

test("getLayoutedElements provides sufficient clearance between connected nodes for edge labels", () => {
  const nodes: Node[] = [
    { id: "ui", type: "custom", position: { x: 0, y: 0 }, data: { label: "Viewport.tsx", color: "#3b82f6" } },
    { id: "worker", type: "custom", position: { x: 0, y: 0 }, data: { label: "worker.ts", color: "#eab308" } },
  ];
  const edges: Edge[] = [
    { id: "e1", source: "ui", target: "worker", label: "streams frames" },
  ];

  const { nodes: lrNodes } = getLayoutedElements(nodes, edges, "LR");
  const uiLr = lrNodes.find((n) => n.id === "ui")!;
  const workerLr = lrNodes.find((n) => n.id === "worker")!;
  assert.ok(
    workerLr.position.x - (uiLr.position.x + 250) >= 180,
    "LR horizontal gap between nodes must accommodate edge labels"
  );

  const { nodes: tbNodes } = getLayoutedElements(nodes, edges, "TB");
  const uiTb = tbNodes.find((n) => n.id === "ui")!;
  const workerTb = tbNodes.find((n) => n.id === "worker")!;
  assert.ok(
    workerTb.position.y - (uiTb.position.y + 80) >= 180,
    "TB vertical gap between nodes must accommodate edge labels"
  );
});


