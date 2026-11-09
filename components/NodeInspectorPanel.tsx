"use client";

import { useState } from "react";
import { X, Plus, Trash2, GitBranch, Cpu, Package, Globe } from "lucide-react";
import type { CustomNodeData, NodeCategory } from "@/lib/repo-graph";

interface NodeInspectorPanelProps {
  selectedNode: {
    id: string;
    data: CustomNodeData;
    position: { x: number; y: number };
  } | null;
  onClose: () => void;
  onUpdateNode: (id: string, updates: Partial<CustomNodeData>) => void;
  onDeleteNode: (id: string) => void;
  onAddDownstream: (sourceId: string, label: string, category: NodeCategory) => void;
}

export default function NodeInspectorPanel(props: NodeInspectorPanelProps) {
  if (!props.selectedNode) return null;
  return (
    <NodeInspectorForm
      key={props.selectedNode.id}
      selectedNode={props.selectedNode}
      onClose={props.onClose}
      onUpdateNode={props.onUpdateNode}
      onDeleteNode={props.onDeleteNode}
      onAddDownstream={props.onAddDownstream}
    />
  );
}

function NodeInspectorForm({
  selectedNode,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onAddDownstream,
}: {
  selectedNode: NonNullable<NodeInspectorPanelProps["selectedNode"]>;
  onClose: () => void;
  onUpdateNode: (id: string, updates: Partial<CustomNodeData>) => void;
  onDeleteNode: (id: string) => void;
  onAddDownstream: (sourceId: string, label: string, category: NodeCategory) => void;
}) {
  const [label, setLabel] = useState(selectedNode.data.label || "");
  const [sublabel, setSublabel] = useState(selectedNode.data.sublabel || "");
  const [category, setCategory] = useState<NodeCategory>(
    selectedNode.data.category || "pipeline"
  );
  const [latencyMs, setLatencyMs] = useState<number>(
    selectedNode.data.latencyMs ?? 35
  );
  const [downstreamLabel, setDownstreamLabel] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onUpdateNode(selectedNode.id, {
      label: label.trim(),
      sublabel: sublabel.trim() || undefined,
      category,
      latencyMs: Number.isFinite(latencyMs) ? Math.max(1, latencyMs) : 25,
    });
  };

  const handleCreateDownstream = (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = downstreamLabel.trim() || "Deployment Target";
    onAddDownstream(selectedNode.id, targetName, "deployment");
    setDownstreamLabel("");
  };

  const categoryIcon = {
    source: <GitBranch className="w-4 h-4 text-[#00f3ff]" />,
    pipeline: <Cpu className="w-4 h-4 text-[#00f3ff]" />,
    artifact: <Package className="w-4 h-4 text-[#00f3ff]" />,
    deployment: <Globe className="w-4 h-4 text-[#00f3ff]" />,
  }[category];

  return (
    <aside
      aria-label="Node Inspector"
      className="w-80 bg-gray-950 border-l border-gray-800 p-5 flex flex-col justify-between z-20 shrink-0 overflow-y-auto"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-2">
            {categoryIcon}
            <h2 className="text-sm font-semibold tracking-tight text-white">
              Node Configuration
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Node Inspector"
            className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-gray-400 font-mono tabular-nums flex items-center gap-2">
          <span>ID: {selectedNode.id}</span>
          <span aria-hidden="true">·</span>
          <span>
            X: {Math.round(selectedNode.position.x)} / Y:{" "}
            {Math.round(selectedNode.position.y)}
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label
              htmlFor="inspector-node-label"
              className="block text-xs font-medium text-gray-300 mb-1.5"
            >
              Stage Label
            </label>
            <input
              id="inspector-node-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-md text-sm text-white font-mono focus:outline-none focus:border-[#00f3ff] transition-colors"
              placeholder="e.g. CI/CD Pipeline"
            />
          </div>

          <div>
            <label
              htmlFor="inspector-node-sublabel"
              className="block text-xs font-medium text-gray-300 mb-1.5"
            >
              Branch or Workflow Detail
            </label>
            <input
              id="inspector-node-sublabel"
              type="text"
              value={sublabel}
              onChange={(e) => setSublabel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-md text-sm text-white font-mono focus:outline-none focus:border-[#00f3ff] transition-colors"
              placeholder="e.g. main · build-test.yml"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="inspector-node-category"
                className="block text-xs font-medium text-gray-300 mb-1.5"
              >
                Role
              </label>
              <select
                id="inspector-node-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as NodeCategory)}
                className="w-full px-2.5 py-2 bg-gray-900 border border-gray-800 rounded-md text-xs text-white font-mono focus:outline-none focus:border-[#00f3ff]"
              >
                <option value="source">Source</option>
                <option value="pipeline">Pipeline</option>
                <option value="artifact">Artifact</option>
                <option value="deployment">Deployment</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="inspector-node-latency"
                className="block text-xs font-medium text-gray-300 mb-1.5"
              >
                Latency (ms)
              </label>
              <input
                id="inspector-node-latency"
                type="number"
                min={1}
                max={9999}
                value={latencyMs}
                onChange={(e) => setLatencyMs(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-gray-900 border border-gray-800 rounded-md text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#00f3ff]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-[#00f3ff] text-gray-950 font-semibold text-xs rounded-md hover:bg-[#00f3ff]/90 transition-colors whitespace-nowrap"
          >
            Save Node Changes
          </button>
        </form>

        <div className="border-t border-gray-800 pt-5">
          <h3 className="text-xs font-semibold text-gray-300 mb-2">
            Connect Downstream Stage
          </h3>
          <form onSubmit={handleCreateDownstream} className="space-y-2.5">
            <input
              type="text"
              aria-label="Downstream stage name"
              value={downstreamLabel}
              onChange={(e) => setDownstreamLabel(e.target.value)}
              placeholder="e.g. Production Edge"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-md text-xs text-white font-mono focus:outline-none focus:border-[#00f3ff]"
            />
            <button
              type="submit"
              className="w-full py-2 px-3 bg-gray-900 border border-gray-700 hover:border-[#00f3ff] text-white text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-[#00f3ff]" />
              <span>Branch Electric Edge</span>
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-4 mt-6">
        <button
          type="button"
          onClick={() => onDeleteNode(selectedNode.id)}
          className="w-full py-2 px-3 bg-red-950/40 border border-red-900/60 hover:bg-red-950/80 text-red-300 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Node</span>
        </button>
      </div>
    </aside>
  );
}
