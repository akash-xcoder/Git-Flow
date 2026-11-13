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
  const customColor =
    typeof data.color === "string" && data.color.trim()
      ? data.color.trim()
      : undefined;

  const dynamicNodeStyle: React.CSSProperties | undefined = customColor
    ? {
        borderColor: customColor,
        boxShadow: selected
          ? `0 0 22px ${customColor}75, 0 0 8px ${customColor}`
          : `0 0 15px ${customColor}45`,
      }
    : undefined;

  const dynamicHandleStyle: React.CSSProperties | undefined = customColor
    ? {
        backgroundColor: customColor,
        boxShadow: `0 0 6px ${customColor}`,
      }
    : undefined;

  return (
    <div
      data-category={resolvedCategory || "default"}
      data-custom-color={customColor || ""}
      style={dynamicNodeStyle}
      className={`px-5 py-3 rounded-lg bg-gray-950 border shadow-lg text-white font-mono text-sm transition-all duration-300 min-w-[220px] max-w-[260px] relative ${
        customColor
          ? "border-current"
          : `${categoryStyle.hoverBorderClass} ${
              selected
                ? categoryStyle.selectedBorderClass
                : categoryStyle.borderClass
            }`
      }`}
    >
      {/* 4-Directional Snapping Connection Points (Top, Right, Bottom, Left) */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        style={dynamicHandleStyle}
        className={`!w-2.5 !h-2.5 ${customColor ? "" : categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        style={dynamicHandleStyle}
        className={`!w-2.5 !h-2.5 ${customColor ? "" : categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />

      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        style={dynamicHandleStyle}
        className={`!w-2.5 !h-2.5 ${customColor ? "" : categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        style={dynamicHandleStyle}
        className={`!w-2.5 !h-2.5 ${customColor ? "" : categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        style={dynamicHandleStyle}
        className={`!w-2.5 !h-2.5 ${customColor ? "" : categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        style={dynamicHandleStyle}
        className={`!w-2.5 !h-2.5 ${customColor ? "" : categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        style={dynamicHandleStyle}
        className={`!w-2.5 !h-2.5 ${customColor ? "" : categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        style={dynamicHandleStyle}
        className={`!w-2.5 !h-2.5 ${customColor ? "" : categoryStyle.handleBgClass} !border-2 !border-gray-950 transition-all hover:!scale-150`}
      />

      <div className="font-semibold tracking-tight text-white truncate" title={primaryTitle}>
        {primaryTitle}
      </div>
      {secondaryPurpose && (
        <div
          style={customColor ? { color: customColor } : undefined}
          className={`mt-0.5 text-xs ${customColor ? "" : categoryStyle.accentTextClass} font-mono truncate`}
          title={secondaryPurpose}
        >
          {secondaryPurpose}
        </div>
      )}
      {(categoryStyle.label || data.sublabel || typeof data.latencyMs === "number") && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400 font-mono tabular-nums truncate">
          {categoryStyle.label && (
            <span
              style={customColor ? { color: customColor } : undefined}
              className={`shrink-0 ${customColor ? "" : categoryStyle.accentTextClass}`}
            >
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
