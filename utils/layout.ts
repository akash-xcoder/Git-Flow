import dagre from "dagre";
import { Node, Edge, Position } from "reactflow";
import type { CustomNodeData } from "@/lib/repo-graph";
import { snapEdgesToNearestConnectionPoints } from "@/src/utils/edge-snapping";

// Enable compound graphs for parent/child groups
const dagreGraph = new dagre.graphlib.Graph({ compound: true });
dagreGraph.setGraph({ rankdir: "TB", ranksep: 120, nodesep: 80, edgesep: 40 });
dagreGraph.setDefaultEdgeLabel(() => ({}));

export const getLayoutedElements = <T = CustomNodeData>(
  nodes: Node<T>[],
  edges: Edge[],
  direction: "LR" | "TB" = "TB"
): { nodes: Node<T>[]; edges: Edge[] } => {
  const isHorizontal = direction === "LR";

  // Clear any residual nodes from previous layout calculations
  dagreGraph.nodes().forEach((n) => dagreGraph.removeNode(n));
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 120,
    nodesep: 80,
    edgesep: 40,
  });

  // First pass: add all nodes to dagre
  nodes.forEach((node) => {
    // Make group nodes larger, standard nodes normal size
    const width = node.type === "group" ? 400 : 250;
    const height = node.type === "group" ? 300 : 80;
    dagreGraph.setNode(node.id, { width, height });
  });

  // Second pass: establish parent-child relationships for the layout engine
  nodes.forEach((node) => {
    if (node.parentNode && dagreGraph.hasNode(node.parentNode)) {
      dagreGraph.setParent(node.id, node.parentNode);
    }
  });

  edges.forEach((edge) => {
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  // Compute group top-left positions and padded bounding dimensions first
  const groupBounds = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();

  nodes.forEach((node) => {
    if (node.type === "group") {
      const nodeWithPosition = dagreGraph.node(node.id);
      const width = Math.max(400, (nodeWithPosition?.width || 400) + 64);
      const height = Math.max(220, (nodeWithPosition?.height || 300) + 84);
      const x = (nodeWithPosition?.x || 0) - width / 2;
      const y = (nodeWithPosition?.y || 0) - height / 2;
      groupBounds.set(node.id, { x, y, width, height });
    }
  });

  // Apply the mathematically calculated coordinates back to the React Flow nodes
  const mappedNodes: Node<T>[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    if (node.type === "group") {
      const bounds = groupBounds.get(node.id)!;
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

    const width = 250;
    const height = 80;
    const globalX = (nodeWithPosition?.x || 0) - width / 2;
    const globalY = (nodeWithPosition?.y || 0) - height / 2;

    if (node.parentNode && groupBounds.has(node.parentNode)) {
      const parentBounds = groupBounds.get(node.parentNode)!;
      return {
        ...node,
        extent: "parent",
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position: {
          x: globalX - parentBounds.x,
          y: globalY - parentBounds.y + 18,
        },
      };
    }

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: globalX,
        y: globalY,
      },
    };
  });

  // Ensure group nodes precede their child nodes in React Flow's nodes array
  const layoutedNodes: Node<T>[] = [
    ...mappedNodes.filter((n) => n.type === "group"),
    ...mappedNodes.filter((n) => n.type !== "group"),
  ];

  const rawEdges: Edge[] = edges.map((edge) => ({
    ...edge,
    type: edge.type || "smoothstep",
  }));

  const { updatedEdges: layoutedEdges } = snapEdgesToNearestConnectionPoints(
    rawEdges,
    layoutedNodes as Node[]
  );

  return { nodes: layoutedNodes, edges: layoutedEdges };
};
