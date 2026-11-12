"use client";

import { Handle, Position } from "reactflow";
import type { CustomNodeData } from "@/lib/repo-graph";

export default function CustomNode({
  data,
  selected,
  targetPosition = Position.Top,
  sourcePosition = Position.Bottom,
}: {
  data: CustomNodeData;
  selected?: boolean;
  targetPosition?: Position;
  sourcePosition?: Position;
}) {
  const lines = (data.label || "").split("\n");
  const primaryTitle = lines[0] || data.label;
  const secondaryPurpose = lines.slice(1).join(" ").trim();

  return (
    <div
      className={`px-5 py-3 rounded-lg bg-gray-950 border shadow-lg text-white font-mono text-sm hover:border-[#00f3ff] hover:shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all duration-300 min-w-[220px] max-w-[260px] relative ${
        selected
          ? "border-[#00f3ff] shadow-[0_0_18px_rgba(0,243,255,0.35)]"
          : "border-gray-700"
      }`}
    >
      {/* 4-Directional Snapping Connection Points (Top, Right, Bottom, Left) */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!w-2.5 !h-2.5 !bg-[#00f3ff] !border-2 !border-gray-950 transition-all hover:!scale-150 hover:!shadow-[0_0_8px_#00f3ff]"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        className="!w-2.5 !h-2.5 !bg-[#00f3ff] !border-2 !border-gray-950 transition-all hover:!scale-150 hover:!shadow-[0_0_8px_#00f3ff]"
      />

      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className="!w-2.5 !h-2.5 !bg-[#00f3ff] !border-2 !border-gray-950 transition-all hover:!scale-150 hover:!shadow-[0_0_8px_#00f3ff]"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!w-2.5 !h-2.5 !bg-[#00f3ff] !border-2 !border-gray-950 transition-all hover:!scale-150 hover:!shadow-[0_0_8px_#00f3ff]"
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className="!w-2.5 !h-2.5 !bg-[#00f3ff] !border-2 !border-gray-950 transition-all hover:!scale-150 hover:!shadow-[0_0_8px_#00f3ff]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-2.5 !h-2.5 !bg-[#00f3ff] !border-2 !border-gray-950 transition-all hover:!scale-150 hover:!shadow-[0_0_8px_#00f3ff]"
      />

      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!w-2.5 !h-2.5 !bg-[#00f3ff] !border-2 !border-gray-950 transition-all hover:!scale-150 hover:!shadow-[0_0_8px_#00f3ff]"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className="!w-2.5 !h-2.5 !bg-[#00f3ff] !border-2 !border-gray-950 transition-all hover:!scale-150 hover:!shadow-[0_0_8px_#00f3ff]"
      />

      <div className="font-semibold tracking-tight text-white truncate" title={primaryTitle}>
        {primaryTitle}
      </div>
      {secondaryPurpose && (
        <div
          className="mt-0.5 text-xs text-[#00f3ff]/85 font-mono truncate"
          title={secondaryPurpose}
        >
          {secondaryPurpose}
        </div>
      )}
      {(data.sublabel || typeof data.latencyMs === "number") && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400 font-mono tabular-nums truncate">
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
