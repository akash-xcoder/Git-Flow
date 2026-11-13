"use client";

import { Handle, Position } from "reactflow";
import type { CustomNodeData, NodeCategory } from "@/lib/repo-graph";
import {
  getNodeCategoryStyle,
  resolveNodeCategory,
} from "@/src/utils/node-category-styles";

export interface CustomNodeProps {
  data: CustomNodeData;
  category?: NodeCategory | string;
  selected?: boolean;
  targetPosition?: Position;
  sourcePosition?: Position;
}

export default function CustomNode({
  data,
  category,
  selected,
}: CustomNodeProps) {
  const lines = (data.label || "").split("\n");
  const primaryTitle = lines[0] || data.label;
  const secondaryPurpose = lines.slice(1).join(" ").trim();
  const resolvedCategory = resolveNodeCategory(category, data.category);
  const categoryStyle = getNodeCategoryStyle(resolvedCategory);

  return (
    <div
      data-category={resolvedCategory || "default"}
      className={`px-5 py-3 rounded-lg bg-gray-950 border shadow-lg text-white font-mono text-sm transition-all duration-300 min-w-[220px] max-w-[260px] relative ${
        categoryStyle.hoverBorderClass
      } ${
        selected
          ? categoryStyle.selectedBorderClass
          : categoryStyle.borderClass
      }`}
    >
      {/* 4-Directional Snapping Connection Points (Top, Right, Bottom, Left) */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className={`!w-2.5 !h-2.5 ${categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        className={`!w-2.5 !h-2.5 ${categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />

      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className={`!w-2.5 !h-2.5 ${categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className={`!w-2.5 !h-2.5 ${categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className={`!w-2.5 !h-2.5 ${categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className={`!w-2.5 !h-2.5 ${categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className={`!w-2.5 !h-2.5 ${categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className={`!w-2.5 !h-2.5 ${categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />

      <div className="font-semibold tracking-tight text-white truncate" title={primaryTitle}>
        {primaryTitle}
      </div>
      {secondaryPurpose && (
        <div
          className={`mt-0.5 text-xs ${categoryStyle.accentTextClass} font-mono truncate`}
          title={secondaryPurpose}
        >
          {secondaryPurpose}
        </div>
      )}
      {(categoryStyle.label || data.sublabel || typeof data.latencyMs === "number") && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400 font-mono tabular-nums truncate">
          {categoryStyle.label && (
            <span className={`shrink-0 ${categoryStyle.accentTextClass}`}>
              {categoryStyle.label}
            </span>
          )}
          {categoryStyle.label &&
            (data.sublabel || typeof data.latencyMs === "number") && (
              <span aria-hidden="true">·</span>
            )}
          {data.sublabel && <span className="truncate">{data.sublabel}</span>}
          {data.sublabel && typeof data.latencyMs === "number" && (
            <span aria-hidden="true">·</span>
          )}
          {typeof data.latencyMs === "number" && <span>{data.latencyMs}ms</span>}
        </div>
      )}
    </div>
  );
}
