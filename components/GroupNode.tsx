"use client";

import type { CustomNodeData } from "@/lib/repo-graph";

export default function GroupNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="w-full h-full pointer-events-none select-none">
      <div className="react-flow__node-label font-semibold">
        {data.label}
      </div>
    </div>
  );
}
