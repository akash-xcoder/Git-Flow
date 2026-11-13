import type { Node, Edge } from "reactflow";

export type HandleDirection = "top" | "right" | "bottom" | "left";

export interface ConnectionPoint {
  id: string;
  direction: HandleDirection;
  x: number;
  y: number;
  normal: { x: number; y: number };
}

export interface NodeAbsoluteBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

const DEFAULT_NODE_WIDTH = 250;
const DEFAULT_NODE_HEIGHT = 80;

/**
 * Calculates absolute canvas coordinates and bounding box for a node,
 * accounting for parent group offsets if nested.
 */
export function getNodeAbsoluteBounds(
  node: Node,
  nodesMap?: Map<string, Node>
): NodeAbsoluteBounds {
  if (!node || !node.position) {
    return {
      x: 0,
      y: 0,
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
      centerX: DEFAULT_NODE_WIDTH / 2,
      centerY: DEFAULT_NODE_HEIGHT / 2,
    };
  }

  let x = node.position.x || 0;
  let y = node.position.y || 0;

  if (node.parentNode && nodesMap) {
    const parent = nodesMap.get(node.parentNode);
    if (parent && parent.position) {
      x += parent.position.x || 0;
      y += parent.position.y || 0;
    }
  }

  const width =
    node.width ??
    (typeof node.style?.width === "number"
      ? (node.style.width as number)
      : node.type === "group"
      ? 400
      : DEFAULT_NODE_WIDTH);

  const height =
    node.height ??
    (typeof node.style?.height === "number"
      ? (node.style.height as number)
      : node.type === "group"
      ? 300
      : DEFAULT_NODE_HEIGHT);

  return {
    x,
    y,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
}

/**
 * Computes cardinal handle connection points (Top, Right, Bottom, Left) for a node.
 */
export function getNodeConnectionPoints(
  bounds: NodeAbsoluteBounds,
  prefix: "source" | "target"
): ConnectionPoint[] {
  return [
    {
      id: `${prefix}-top`,
      direction: "top",
      x: bounds.centerX,
      y: bounds.y,
      normal: { x: 0, y: -1 },
    },
    {
      id: `${prefix}-right`,
      direction: "right",
      x: bounds.x + bounds.width,
      y: bounds.centerY,
      normal: { x: 1, y: 0 },
    },
    {
      id: `${prefix}-bottom`,
      direction: "bottom",
      x: bounds.centerX,
      y: bounds.y + bounds.height,
      normal: { x: 0, y: 1 },
    },
    {
      id: `${prefix}-left`,
      direction: "left",
      x: bounds.x,
      y: bounds.centerY,
      normal: { x: -1, y: 0 },
    },
  ];
}

/**
 * Calculates the pair of connection handles between source and target nodes
 * that yields the cleanest, shortest orthogonal path without awkward loop-arounds.
 */
export function getNearestConnectionHandles(
  sourceNode: Node,
  targetNode: Node,
  nodesMap?: Map<string, Node>
): { sourceHandle: string; targetHandle: string } {
  const sBounds = getNodeAbsoluteBounds(sourceNode, nodesMap);
  const tBounds = getNodeAbsoluteBounds(targetNode, nodesMap);

  const sourcePoints = getNodeConnectionPoints(sBounds, "source");
  const targetPoints = getNodeConnectionPoints(tBounds, "target");

  let bestPair = {
    sourceHandle: "source-bottom",
    targetHandle: "target-top",
  };
  let minCost = Infinity;

  for (const sPt of sourcePoints) {
    for (const tPt of targetPoints) {
      const dx = tPt.x - sPt.x;
      const dy = tPt.y - sPt.y;
      const dist = Math.hypot(dx, dy);

      let penalty = 0;

      // Source point directional penalty: exit normal should point towards target
      const sDot = dx * sPt.normal.x + dy * sPt.normal.y;
      if (sDot < -15) {
        penalty += 8000;
      }

      // Target point directional penalty: incoming edge should arrive towards target surface
      const tDot = dx * -tPt.normal.x + dy * -tPt.normal.y;
      if (tDot < -15) {
        penalty += 8000;
      }

      // Favor aligned connections (e.g. right -> left or bottom -> top)
      const isDirectlyOpposed =
        (sPt.direction === "right" && tPt.direction === "left") ||
        (sPt.direction === "left" && tPt.direction === "right") ||
        (sPt.direction === "bottom" && tPt.direction === "top") ||
        (sPt.direction === "top" && tPt.direction === "bottom");

      if (isDirectlyOpposed) {
        penalty -= 25;
      }

      const totalCost = dist + penalty;
      if (totalCost < minCost) {
        minCost = totalCost;
        bestPair = {
          sourceHandle: sPt.id,
          targetHandle: tPt.id,
        };
      }
    }
  }

  return bestPair;
}

/**
 * Iterates through edges and dynamically updates sourceHandle and targetHandle
 * to snap edges to the nearest connection points between nodes.
 */
export function snapEdgesToNearestConnectionPoints(
  edges: Edge[],
  nodes: Node[],
  draggedNodeIds?: string | string[] | Set<string>
): { updatedEdges: Edge[]; hasChanges: boolean } {
  if (!Array.isArray(edges) || !Array.isArray(nodes) || edges.length === 0) {
    return { updatedEdges: edges || [], hasChanges: false };
  }

  const validNodes = nodes.filter((n): n is Node =>
    Boolean(n && typeof n.id === "string")
  );
  const nodesMap = new Map<string, Node>(validNodes.map((n) => [n.id, n]));

  let affectedIds: Set<string> | null = null;
  if (typeof draggedNodeIds === "string") {
    affectedIds = new Set([draggedNodeIds]);
  } else if (Array.isArray(draggedNodeIds) && draggedNodeIds.length > 0) {
    affectedIds = new Set(draggedNodeIds);
  } else if (draggedNodeIds instanceof Set && draggedNodeIds.size > 0) {
    affectedIds = new Set(draggedNodeIds);
  }

  // If any dragged node is a group, include all its descendant child nodes
  if (affectedIds) {
    let added = true;
    while (added) {
      added = false;
      for (const n of validNodes) {
        if (n.parentNode && affectedIds.has(n.parentNode) && !affectedIds.has(n.id)) {
          affectedIds.add(n.id);
          added = true;
        }
      }
    }
  }

  let hasChanges = false;

  const updatedEdges = edges.map((edge) => {
    if (!edge || !edge.source || !edge.target) return edge;
    // If specific nodes are being dragged, only evaluate edges attached to them
    if (
      affectedIds &&
      !affectedIds.has(edge.source) &&
      !affectedIds.has(edge.target)
    ) {
      return edge;
    }

    const sourceNode = nodesMap.get(edge.source);
    const targetNode = nodesMap.get(edge.target);
    if (!sourceNode || !targetNode) return edge;

    const { sourceHandle, targetHandle } = getNearestConnectionHandles(
      sourceNode,
      targetNode,
      nodesMap
    );

    if (
      edge.sourceHandle !== sourceHandle ||
      edge.targetHandle !== targetHandle
    ) {
      hasChanges = true;
      return {
        ...edge,
        sourceHandle,
        targetHandle,
      };
    }

    return edge;
  });

  return { updatedEdges, hasChanges };
}
