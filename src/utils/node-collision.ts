import type { Node } from "reactflow";

export interface NodeBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isGroup?: boolean;
}

export function getNodeDimensions(node: Node): { width: number; height: number } {
  if (node.type === "group") {
    const w = typeof node.style?.width === "number" ? node.style.width : 400;
    const h = typeof node.style?.height === "number" ? node.style.height : 300;
    return { width: w, height: h };
  }
  return { width: 250, height: 80 };
}

export function resolveNodeCollisions(
  currentNodes: Node[],
  draggedNodeIds: string | string[] | Set<string>
): { nodes: Node[]; hasChanges: boolean } {
  const draggedSet =
    typeof draggedNodeIds === "string"
      ? new Set([draggedNodeIds])
      : draggedNodeIds instanceof Set
      ? draggedNodeIds
      : new Set(draggedNodeIds);

  if (draggedSet.size === 0 || currentNodes.length <= 1) {
    return { nodes: currentNodes, hasChanges: false };
  }

  const mutableNodes = currentNodes.map((n) => ({
    ...n,
    position: { ...n.position },
  }));

  const nodeMap = new Map<string, (typeof mutableNodes)[0]>();
  for (const n of mutableNodes) {
    nodeMap.set(n.id, n);
  }

  let hasChanges = false;
  const padding = 32; // Separation gap between nodes and group containers

  // Iterate a few times to resolve cascading collisions
  for (let iteration = 0; iteration < 3; iteration++) {
    let movedInIteration = false;

    for (const draggedId of draggedSet) {
      const draggedNode = nodeMap.get(draggedId);
      if (!draggedNode) continue;

      const dDim = getNodeDimensions(draggedNode);
      const dx = draggedNode.position.x;
      const dy = draggedNode.position.y;

      for (const other of mutableNodes) {
        if (other.id === draggedId || draggedSet.has(other.id)) {
          continue;
        }
        // Skip if they have different parent nodes (unless both are top-level root containers)
        if ((draggedNode.parentNode || undefined) !== (other.parentNode || undefined)) {
          continue;
        }

        const oDim = getNodeDimensions(other);
        const ox = other.position.x;
        const oy = other.position.y;

        // Check bounding box intersection with padding
        const left1 = dx;
        const right1 = dx + dDim.width;
        const top1 = dy;
        const bottom1 = dy + dDim.height;

        const left2 = ox;
        const right2 = ox + oDim.width;
        const top2 = oy;
        const bottom2 = oy + oDim.height;

        const isIntersecting =
          left1 < right2 + padding &&
          right1 > left2 - padding &&
          top1 < bottom2 + padding &&
          bottom1 > top2 - padding;

        if (isIntersecting) {
          // Calculate overlap on X and Y axes
          const overlapX = Math.min(right1 - left2 + padding, right2 - left1 + padding);
          const overlapY = Math.min(bottom1 - top2 + padding, bottom2 - top1 + padding);

          if (overlapX < overlapY) {
            // Push horizontally
            if (dx < ox) {
              draggedNode.position.x = ox - dDim.width - padding;
            } else {
              draggedNode.position.x = right2 + padding;
            }
          } else {
            // Push vertically
            if (dy < oy) {
              draggedNode.position.y = oy - dDim.height - padding;
            } else {
              draggedNode.position.y = bottom2 + padding;
            }
          }
          hasChanges = true;
          movedInIteration = true;
        }
      }
    }

    if (!movedInIteration) break;
  }

  return { nodes: mutableNodes, hasChanges };
}
