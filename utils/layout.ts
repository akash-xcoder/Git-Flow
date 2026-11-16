import dagre from "dagre";
import { Node, Edge, Position } from "reactflow";
import type { CustomNodeData } from "@/lib/repo-graph";
import { snapEdgesToNearestConnectionPoints } from "@/src/utils/edge-snapping";

const NODE_WIDTH = 250;
const NODE_HEIGHT = 80;
const GROUP_PAD_X = 48;
const GROUP_PAD_TOP = 60;
const GROUP_PAD_BOTTOM = 44;
const MIN_GROUP_WIDTH = 400;
const MIN_GROUP_HEIGHT = 180;
const CONTAINER_GAP = 72;

interface BoxRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function separateTopLevelBoxes(boxes: BoxRect[], direction: "LR" | "TB"): void {
  if (boxes.length <= 1) return;

  // Sort deterministically from top-left to bottom-right so primary containers stay anchored
  boxes.sort((a, b) =>
    direction === "LR" ? a.x - b.x || a.y - b.y : a.y - b.y || a.x - b.x
  );

  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];

        const overlapX =
          Math.min(a.x + a.width + CONTAINER_GAP, b.x + b.width + CONTAINER_GAP) -
          Math.max(a.x, b.x);
        const overlapY =
          Math.min(a.y + a.height + CONTAINER_GAP, b.y + b.height + CONTAINER_GAP) -
          Math.max(a.y, b.y);

        const intersects =
          a.x < b.x + b.width + CONTAINER_GAP &&
          a.x + a.width + CONTAINER_GAP > b.x &&
          a.y < b.y + b.height + CONTAINER_GAP &&
          a.y + a.height + CONTAINER_GAP > b.y;

        if (!intersects) continue;

        if (overlapX < overlapY) {
          b.x = a.x + a.width + CONTAINER_GAP;
        } else {
          b.y = a.y + a.height + CONTAINER_GAP;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
}

export const getLayoutedElements = <T = CustomNodeData>(
  nodes: Node<T>[],
  edges: Edge[],
  direction: "LR" | "TB" = "TB"
): { nodes: Node<T>[]; edges: Edge[] } => {
  const isHorizontal = direction === "LR";

  // Fresh graph instance per layout call avoids any residual compound state
  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 185,
    nodesep: 120,
    edgesep: 65,
  });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const groupIds = new Set(
    nodes.filter((n) => n.type === "group").map((n) => n.id)
  );
  const groupChildren = new Map<string, Node<T>[]>();
  for (const node of nodes) {
    if (node.type !== "group" && node.parentNode && groupIds.has(node.parentNode)) {
      const list = groupChildren.get(node.parentNode) ?? [];
      list.push(node);
      groupChildren.set(node.parentNode, list);
    }
  }

  // First pass: register non-empty group containers and all standard nodes
  nodes.forEach((node) => {
    if (node.type === "group") {
      if ((groupChildren.get(node.id)?.length ?? 0) > 0) {
        dagreGraph.setNode(node.id, {});
      } else {
        dagreGraph.setNode(node.id, { width: MIN_GROUP_WIDTH, height: MIN_GROUP_HEIGHT });
      }
    } else {
      dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
  });

  // Second pass: establish parent-child relationships for compound layout
  nodes.forEach((node) => {
    if (
      node.type !== "group" &&
      node.parentNode &&
      dagreGraph.hasNode(node.parentNode)
    ) {
      dagreGraph.setParent(node.id, node.parentNode);
    }
  });

  // Remap any edge targeting a group node to a child node so Dagre compound ranker never throws
  const resolveNonGroupNodeId = (id: string, excludeId?: string): string | null => {
    if (!dagreGraph.hasNode(id)) return null;
    if (!groupIds.has(id)) return id;
    const children = groupChildren.get(id) ?? [];
    if (children.length === 0) return null;
    const alt = excludeId ? children.find((c) => c.id !== excludeId) : undefined;
    return (alt ?? children[0]).id;
  };

  const seenPairs = new Set<string>();
  const sanitizedEdges: Edge[] = [];

  edges.forEach((edge) => {
    const source = resolveNonGroupNodeId(edge.source);
    const target = resolveNonGroupNodeId(edge.target, source ?? undefined);
    if (!source || !target || source === target) return;
    const pairKey = `${source}->${target}`;
    if (seenPairs.has(pairKey)) return;
    seenPairs.add(pairKey);

    dagreGraph.setEdge(source, target);
    sanitizedEdges.push({
      ...edge,
      source,
      target,
      type: edge.type || "smoothstep",
    });
  });

  dagre.layout(dagreGraph);

  // Compute global top-left bounds for every child and ungrouped node directly from Dagre
  const childGlobalBounds = new Map<string, { x: number; y: number }>();
  nodes.forEach((node) => {
    if (node.type === "group") return;
    const pos = dagreGraph.node(node.id);
    childGlobalBounds.set(node.id, {
      x: (pos?.x || 0) - NODE_WIDTH / 2,
      y: (pos?.y || 0) - NODE_HEIGHT / 2,
    });
  });

  // Derive tight, evenly-padded container bounds enclosing all children
  const groupBounds = new Map<string, BoxRect>();
  nodes.forEach((node) => {
    if (node.type !== "group") return;
    const children = groupChildren.get(node.id) ?? [];
    if (children.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const child of children) {
        const cb = childGlobalBounds.get(child.id)!;
        minX = Math.min(minX, cb.x);
        minY = Math.min(minY, cb.y);
        maxX = Math.max(maxX, cb.x + NODE_WIDTH);
        maxY = Math.max(maxY, cb.y + NODE_HEIGHT);
      }
      const rawWidth = maxX - minX + GROUP_PAD_X * 2;
      const width = Math.max(MIN_GROUP_WIDTH, rawWidth);
      const extraHalfX = (width - rawWidth) / 2;
      const rawHeight = maxY - minY + GROUP_PAD_TOP + GROUP_PAD_BOTTOM;
      const height = Math.max(MIN_GROUP_HEIGHT, rawHeight);
      const extraHalfY = (height - rawHeight) / 2;
      const x = minX - GROUP_PAD_X - extraHalfX;
      const y = minY - GROUP_PAD_TOP - extraHalfY;
      groupBounds.set(node.id, { id: node.id, x, y, width, height });
    } else {
      const pos = dagreGraph.node(node.id);
      const width = MIN_GROUP_WIDTH;
      const height = MIN_GROUP_HEIGHT;
      groupBounds.set(node.id, {
        id: node.id,
        x: (pos?.x || 0) - width / 2,
        y: (pos?.y || 0) - height / 2,
        width,
        height,
      });
    }
  });

  // Compute relative child offsets BEFORE container overlap separation so moving a container moves its children cleanly
  const childRelativePos = new Map<string, { x: number; y: number }>();
  nodes.forEach((node) => {
    if (node.type === "group") return;
    const globalPos = childGlobalBounds.get(node.id)!;
    if (node.parentNode && groupBounds.has(node.parentNode)) {
      const parentRect = groupBounds.get(node.parentNode)!;
      childRelativePos.set(node.id, {
        x: globalPos.x - parentRect.x,
        y: globalPos.y - parentRect.y,
      });
    }
  });

  // Separate any overlapping top-level containers / ungrouped nodes cleanly
  const topLevelBoxes: BoxRect[] = [
    ...Array.from(groupBounds.values()),
    ...nodes
      .filter((n) => n.type !== "group" && (!n.parentNode || !groupBounds.has(n.parentNode)))
      .map((n) => {
        const gp = childGlobalBounds.get(n.id)!;
        return {
          id: n.id,
          x: gp.x,
          y: gp.y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        };
      }),
  ];

  separateTopLevelBoxes(topLevelBoxes, direction);

  const topLevelBoxMap = new Map(topLevelBoxes.map((b) => [b.id, b]));

  const mappedNodes: Node<T>[] = nodes.map((node) => {
    if (node.type === "group") {
      const bounds = topLevelBoxMap.get(node.id) ?? groupBounds.get(node.id)!;
      return {
        ...node,
        style: {
          ...node.style,
          width: bounds.width,
          height: bounds.height,
        },
        position: {
          x: bounds.x,
          y: bounds.y,
        },
      };
    }

    if (node.parentNode && groupBounds.has(node.parentNode)) {
      const relPos = childRelativePos.get(node.id) ?? {
        x: GROUP_PAD_X,
        y: GROUP_PAD_TOP,
      };
      return {
        ...node,
        extent: "parent",
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position: {
          x: relPos.x,
          y: relPos.y,
        },
      };
    }

    const box = topLevelBoxMap.get(node.id);
    const gp = childGlobalBounds.get(node.id)!;
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: box ? box.x : gp.x,
        y: box ? box.y : gp.y,
      },
    };
  });

  // Ensure group nodes precede their child nodes in React Flow's nodes array
  const layoutedNodes: Node<T>[] = [
    ...mappedNodes.filter((n) => n.type === "group"),
    ...mappedNodes.filter((n) => n.type !== "group"),
  ];

  const { updatedEdges: layoutedEdges } = snapEdgesToNearestConnectionPoints(
    sanitizedEdges,
    layoutedNodes as Node[]
  );

  return { nodes: layoutedNodes, edges: layoutedEdges };
};
