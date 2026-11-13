import test from "node:test";
import assert from "node:assert/strict";
import type { Node } from "reactflow";
import { resolveNodeCollisions } from "./node-collision";

test("resolveNodeCollisions pushes overlapping nodes apart so they are non-colliding", () => {
  const nodes: Node[] = [
    {
      id: "node-1",
      type: "custom",
      position: { x: 100, y: 100 },
      data: { label: "Node 1" },
    },
    {
      id: "node-2",
      type: "custom",
      position: { x: 120, y: 110 }, // Overlapping with node-1
      data: { label: "Node 2" },
    },
  ];

  const { nodes: resolved, hasChanges } = resolveNodeCollisions(nodes, ["node-2"]);
  assert.equal(hasChanges, true);

  const n1 = resolved.find((n) => n.id === "node-1")!;
  const n2 = resolved.find((n) => n.id === "node-2")!;

  const noOverlap =
    n2.position.x + 250 + 20 <= n1.position.x ||
    n2.position.x >= n1.position.x + 250 + 20 ||
    n2.position.y + 80 + 20 <= n1.position.y ||
    n2.position.y >= n1.position.y + 80 + 20;

  assert.equal(noOverlap, true);
});

test("resolveNodeCollisions pushes overlapping group node containers apart so they are non-colliding", () => {
  const nodes: Node[] = [
    {
      id: "group-1",
      type: "group",
      position: { x: 100, y: 100 },
      style: { width: 400, height: 300 },
      data: { label: "Group 1" },
    },
    {
      id: "group-2",
      type: "group",
      position: { x: 150, y: 120 }, // Overlapping with group-1
      style: { width: 400, height: 300 },
      data: { label: "Group 2" },
    },
  ];

  const { nodes: resolved, hasChanges } = resolveNodeCollisions(nodes, ["group-2"]);
  assert.equal(hasChanges, true);

  const g1 = resolved.find((n) => n.id === "group-1")!;
  const g2 = resolved.find((n) => n.id === "group-2")!;

  const noOverlap =
    g2.position.x + 400 + 20 <= g1.position.x ||
    g2.position.x >= g1.position.x + 400 + 20 ||
    g2.position.y + 300 + 20 <= g1.position.y ||
    g2.position.y >= g1.position.y + 300 + 20;

  assert.equal(noOverlap, true);
});

test("resolveNodeCollisions leaves non-overlapping nodes untouched", () => {
  const nodes: Node[] = [
    {
      id: "node-1",
      type: "custom",
      position: { x: 100, y: 100 },
      data: { label: "Node 1" },
    },
    {
      id: "node-2",
      type: "custom",
      position: { x: 800, y: 800 }, // Far away, no collision
      data: { label: "Node 2" },
    },
  ];

  const { nodes: resolved, hasChanges } = resolveNodeCollisions(nodes, ["node-2"]);
  assert.equal(hasChanges, false);
  assert.equal(resolved[1].position.x, 800);
  assert.equal(resolved[1].position.y, 800);
});
