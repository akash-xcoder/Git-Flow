import { parseGitHubRepoUrl, type CustomNodeData } from "@/lib/repo-graph";

export interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  id: string;
  type: "node" | "edge";
}

export interface ColorSwatch {
  name: "Cyan" | "Purple" | "Green" | "Orange" | "Pink";
  hex: string;
}

export const CONTEXT_MENU_SWATCHES: readonly ColorSwatch[] = [
  { name: "Cyan", hex: "#00f3ff" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Green", hex: "#22c55e" },
  { name: "Orange", hex: "#f97316" },
  { name: "Pink", hex: "#ec4899" },
] as const;

/**
 * Extracts a likely repository file path from a node's data object if present.
 */
export function extractNodeFilePath(data?: CustomNodeData): string | null {
  if (!data) return null;

  if (typeof data.filePath === "string" && data.filePath.trim()) {
    return data.filePath.trim().replace(/^\/+/, "");
  }

  if (typeof data.sublabel === "string" && data.sublabel.trim()) {
    const sub = data.sublabel.trim();
    // Match file paths with extensions (e.g. src/app/page.tsx, package.json)
    if (
      !sub.includes("·") &&
      !sub.includes(" ") &&
      /\.[a-z0-9]{1,8}$/i.test(sub)
    ) {
      return sub.replace(/^\/+/, "");
    }
  }

  if (typeof data.label === "string" && data.label.trim()) {
    const firstToken = data.label.trim().split(/\s+/)[0];
    if (
      firstToken &&
      !firstToken.includes("·") &&
      /\.[a-z0-9]{1,8}$/i.test(firstToken)
    ) {
      return firstToken.replace(/^\/+/, "");
    }
  }

  return null;
}

/**
 * Constructs a GitHub URL for a node using the repository base URL and the node's file path metadata.
 */
export function buildGitHubFileUrl(
  repoInput: string,
  defaultBranch = "main",
  data?: CustomNodeData
): string {
  const parsed = parseGitHubRepoUrl(repoInput);
  const baseUrl =
    parsed.valid && parsed.cleanUrl
      ? parsed.cleanUrl.replace(/\/+$/, "")
      : "https://github.com/vercel/next.js";

  const branch = (defaultBranch || "main").trim() || "main";
  const filePath = extractNodeFilePath(data);

  if (!filePath) {
    return baseUrl;
  }

  // Avoid duplicating owner/repo if sublabel is just "owner/repo"
  if (
    parsed.valid &&
    parsed.owner &&
    parsed.repo &&
    filePath.toLowerCase() === `${parsed.owner}/${parsed.repo}`.toLowerCase()
  ) {
    return baseUrl;
  }

  return `${baseUrl}/blob/${encodeURIComponent(branch)}/${filePath}`;
}

/**
 * Builds the inline style object for a dynamically colored electric edge.
 */
export function buildElectricEdgeStyle(color: string): {
  stroke: string;
  strokeWidth: number;
  filter: string;
} {
  return {
    stroke: color,
    strokeWidth: 2.5,
    filter: `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 8px ${color})`,
  };
}

/**
 * Clamps context menu coordinates so the menu stays inside the canvas container.
 */
export function clampContextMenuPosition(
  x: number,
  y: number,
  containerWidth = 1200,
  containerHeight = 800,
  menuWidth = 230,
  menuHeight = 160
): { x: number; y: number } {
  const clampedX = Math.max(
    12,
    Math.min(x, Math.max(12, containerWidth - menuWidth - 12))
  );
  const clampedY = Math.max(
    12,
    Math.min(y, Math.max(12, containerHeight - menuHeight - 12))
  );
  return { x: clampedX, y: clampedY };
}
