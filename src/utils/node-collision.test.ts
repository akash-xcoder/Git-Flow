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

  // Check that n2 is no longer colliding with n1 (separated by at least width/height + padding)
  const noOverlap =
    n2.position.x + 250 + 20 <= n1.position.x ||
    n2.position.x >= n1.position.x + 250 + 20 ||
    n2.position.y + 80 + 20 <= n1.position.y ||
    n2.position.y >= n1.position.y + 80 + 20;

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
      position: { x: 500, y: 500 }, // Far away, no collision
      data: { label: "Node 2" },
    },
  ];

  const { nodes: resolved, hasChanges } = resolveNodeCollisions(nodes, ["node-2"]);
  assert.equal(hasChanges, false);
  assert.equal(resolved[1].position.x, 500);
  assert.equal(resolved[1].position.y, 500);
});
