import test from "node:test";
import assert from "node:assert/strict";
import { computeExportDimensions } from "./react-flow-export";
import type { Node } from "reactflow";

test("computeExportDimensions provides default fallback when no nodes are passed", () => {
  const result = computeExportDimensions([]);
  assert.equal(result.width, 1280);
  assert.equal(result.height, 768);
  assert.equal(result.transform.zoom, 1);
});

test("computeExportDimensions calculates proportional viewport for nodes bounds", () => {
  const nodes: Node[] = [
    {
      id: "1",
      position: { x: 100, y: 100 },
      data: { label: "A" },
      width: 250,
      height: 80,
    },
    {
      id: "2",
      position: { x: 600, y: 400 },
      data: { label: "B" },
      width: 250,
      height: 80,
    },
  ];

  const result = computeExportDimensions(nodes);
  assert.ok(result.width >= 1280);
  assert.ok(result.height >= 768);
  assert.ok(result.transform.zoom > 0);
  assert.ok(typeof result.transform.x === "number");
  assert.ok(typeof result.transform.y === "number");
});
