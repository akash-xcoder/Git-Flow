"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Edge, Node } from "reactflow";
import { ExternalLink, Palette, X, Check } from "lucide-react";
import type { CustomNodeData } from "@/lib/repo-graph";
import {
  CONTEXT_MENU_SWATCHES,
  buildElectricEdgeStyle,
  buildGitHubFileUrl,
  type ContextMenuState,
} from "@/src/utils/context-menu-utils";

export interface ContextMenuProps {
  menu: ContextMenuState;
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  repoUrl: string;
  defaultBranch?: string;
  setNodes: Dispatch<SetStateAction<Node<CustomNodeData>[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  onClose: () => void;
}

export default function ContextMenu({
  menu,
  nodes,
  edges,
  repoUrl,
  defaultBranch = "main",
  setNodes,
  setEdges,
  onClose,
}: ContextMenuProps) {
  if (!menu.show) return null;

  const targetNode =
    menu.type === "node" ? nodes.find((n) => n.id === menu.id) : undefined;
  const targetEdge =
    menu.type === "edge" ? edges.find((e) => e.id === menu.id) : undefined;

  const activeColor =
    menu.type === "node"
      ? targetNode?.data?.color
      : (targetEdge?.style?.stroke as string | undefined);

  const githubUrl =
    menu.type === "node"
      ? buildGitHubFileUrl(repoUrl, defaultBranch, targetNode?.data)
      : "";

  const handleSelectColor = (hex: string) => {
    if (menu.type === "node") {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === menu.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  color: hex,
                },
              }
            : node
        )
      );
    } else {
      const edgeStyle = buildElectricEdgeStyle(hex);
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === menu.id
            ? {
                ...edge,
                style: {
                  ...edge.style,
                  ...edgeStyle,
                },
              }
            : edge
        )
      );
    }
    onClose();
  };

  return (
    <div
      role="menu"
      aria-label={`${menu.type === "node" ? "Node" : "Edge"} Context Menu`}
      style={{ top: menu.y, left: menu.x }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      className="absolute z-50 w-56 p-3 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-lg shadow-xl text-white font-mono text-xs animate-menuIn select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800">
        <div className="flex items-center gap-1.5 truncate pr-2">
          <Palette className="w-3.5 h-3.5 text-[#00f3ff] shrink-0" />
          <span className="font-semibold text-gray-200 truncate">
            {menu.type === "node"
              ? targetNode?.data?.label?.split("\n")[0] || "Node Actions"
              : `Edge ${menu.id}`}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close context menu"
          className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Node-only action: Open in GitHub */}
      {menu.type === "node" && (
        <div className="mb-2.5 pb-2.5 border-b border-gray-800">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onClose()}
            className="w-full px-2.5 py-2 rounded-md bg-gray-800/80 hover:bg-gray-800 border border-gray-700 hover:border-[#00f3ff]/60 text-gray-100 hover:text-white flex items-center justify-between gap-2 transition-colors no-underline cursor-pointer"
          >
            <span className="truncate font-medium">Open in GitHub</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#00f3ff] shrink-0" />
          </a>
        </div>
      )}

      {/* 5 Color Swatches (Cyan, Purple, Green, Orange, Pink) */}
      <div>
        <div className="text-[11px] text-gray-400 mb-2">
          {menu.type === "node" ? "Node Glow Color" : "Edge Glow Color"}
        </div>
        <div className="flex items-center justify-between gap-2">
          {CONTEXT_MENU_SWATCHES.map((swatch) => {
            const isSelected =
              activeColor?.toLowerCase() === swatch.hex.toLowerCase();
            return (
              <button
                key={swatch.name}
                type="button"
                aria-label={`Set ${menu.type} color to ${swatch.name}`}
                title={`${swatch.name} (${swatch.hex})`}
                onClick={() => handleSelectColor(swatch.hex)}
                style={{
                  backgroundColor: swatch.hex,
                  boxShadow: `0 0 10px ${swatch.hex}80`,
                }}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                  isSelected
                    ? "border-white scale-110"
                    : "border-gray-950/80 hover:border-white/80"
                }`}
              >
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-gray-950 stroke-[2.5]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
