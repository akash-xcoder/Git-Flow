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
