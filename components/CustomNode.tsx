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
      className={`px-5 py-3 rounded-lg bg-gray-950 border shadow-lg text-white font-mono text-sm hover:border-[#00f3ff] hover:shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all duration-300 min-w-[220px] max-w-[260px] ${
        selected
          ? "border-[#00f3ff] shadow-[0_0_18px_rgba(0,243,255,0.35)]"
          : "border-gray-700"
      }`}
    >
      <Handle
        type="target"
        position={targetPosition}
        className="w-2 h-2 bg-[#00f3ff] border-none"
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
      <Handle
        type="source"
        position={sourcePosition}
        className="w-2 h-2 bg-[#00f3ff] border-none"
      />
    </div>
  );
}
