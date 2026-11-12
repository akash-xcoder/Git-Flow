import { test } from "bun:test";
import assert from "node:assert/strict";
import type { Node, Edge } from "reactflow";
import {
  getNodeAbsoluteBounds,
  getNearestConnectionHandles,
  snapEdgesToNearestConnectionPoints,
} from "./edge-snapping";

test("getNodeAbsoluteBounds calculates dimensions and offsets including parent group", () => {
  const parentNode: Node = {
    id: "group-1",
    type: "group",
    position: { x: 100, y: 150 },
    data: { label: "Parent Cluster" },
    style: { width: 500, height: 400 },
  };

  const childNode: Node = {
    id: "child-1",
    type: "custom",
    position: { x: 50, y: 60 },
    parentNode: "group-1",
    data: { label: "Child Worker" },
  };

  const nodesMap = new Map([
    ["group-1", parentNode],
    ["child-1", childNode],
  ]);

  const bounds = getNodeAbsoluteBounds(childNode, nodesMap);
  assert.equal(bounds.x, 150); // 100 + 50
  assert.equal(bounds.y, 210); // 150 + 60
  assert.equal(bounds.width, 250);
  assert.equal(bounds.height, 80);
  assert.equal(bounds.centerX, 275);
  assert.equal(bounds.centerY, 250);
});

test("getNearestConnectionHandles snaps to source-right -> target-left when target is to the right", () => {
  const sourceNode: Node = {
    id: "node-1",
    position: { x: 100, y: 200 },
    data: { label: "Source" },
  };
  const targetNode: Node = {
    id: "node-2",
    position: { x: 500, y: 200 },
    data: { label: "Target" },
  };

  const handles = getNearestConnectionHandles(sourceNode, targetNode);
  assert.equal(handles.sourceHandle, "source-right");
  assert.equal(handles.targetHandle, "target-left");
});

test("getNearestConnectionHandles snaps to source-bottom -> target-top when target is below", () => {
  const sourceNode: Node = {
    id: "node-1",
    position: { x: 200, y: 100 },
    data: { label: "Source" },
  };
  const targetNode: Node = {
    id: "node-2",
    position: { x: 200, y: 400 },
    data: { label: "Target" },
  };

  const handles = getNearestConnectionHandles(sourceNode, targetNode);
  assert.equal(handles.sourceHandle, "source-bottom");
  assert.equal(handles.targetHandle, "target-top");
});

test("getNearestConnectionHandles snaps to source-left -> target-right when target is to the left", () => {
  const sourceNode: Node = {
    id: "node-1",
    position: { x: 500, y: 200 },
    data: { label: "Source" },
  };
  const targetNode: Node = {
    id: "node-2",
    position: { x: 100, y: 200 },
    data: { label: "Target" },
  };

  const handles = getNearestConnectionHandles(sourceNode, targetNode);
  assert.equal(handles.sourceHandle, "source-left");
  assert.equal(handles.targetHandle, "target-right");
});

test("getNearestConnectionHandles snaps to source-top -> target-bottom when target is above", () => {
  const sourceNode: Node = {
    id: "node-1",
    position: { x: 200, y: 400 },
    data: { label: "Source" },
  };
  const targetNode: Node = {
    id: "node-2",
    position: { x: 200, y: 100 },
    data: { label: "Target" },
  };

  const handles = getNearestConnectionHandles(sourceNode, targetNode);
  assert.equal(handles.sourceHandle, "source-top");
  assert.equal(handles.targetHandle, "target-bottom");
});

test("snapEdgesToNearestConnectionPoints updates edge handles when dragging a node", () => {
  const nodes: Node[] = [
    {
      id: "node-1",
      position: { x: 100, y: 100 },
      data: { label: "A" },
    },
    {
      id: "node-2",
      position: { x: 100, y: 400 },
      data: { label: "B" },
    },
  ];

  const edges: Edge[] = [
    {
      id: "e-1-2",
      source: "node-1",
      target: "node-2",
      sourceHandle: "source-right", // initial sub-optimal handle
      targetHandle: "target-left",
    },
  ];

  const { updatedEdges, hasChanges } = snapEdgesToNearestConnectionPoints(
    edges,
    nodes,
    "node-2"
  );

  assert.equal(hasChanges, true);
  assert.equal(updatedEdges[0].sourceHandle, "source-bottom");
  assert.equal(updatedEdges[0].targetHandle, "target-top");
});
