import { getNodesBounds, getViewportForBounds, type Node } from "reactflow";
import { toPng, toSvg } from "html-to-image";

export interface ExportFlowOptions {
  nodes?: Node[];
  format?: "png" | "svg";
  fileName?: string;
  backgroundColor?: string;
  pixelRatio?: number;
  padding?: number;
  minWidth?: number;
  minHeight?: number;
}

/**
 * Initiates browser file download from a data URL string.
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.setAttribute("download", filename);
  link.setAttribute("href", dataUrl);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Calculates ideal image dimensions and viewport transform for exporting a React Flow diagram.
 */
export function computeExportDimensions(
  nodes: Node[],
  options: Pick<ExportFlowOptions, "padding" | "minWidth" | "minHeight"> = {}
): {
  width: number;
  height: number;
  transform: { x: number; y: number; zoom: number };
} {
  const padding = options.padding ?? 0.16;
  const minWidth = options.minWidth ?? 1280;
  const minHeight = options.minHeight ?? 768;

  if (!nodes || nodes.length === 0) {
    return {
      width: minWidth,
      height: minHeight,
      transform: { x: 0, y: 0, zoom: 1 },
    };
  }

  const bounds = getNodesBounds(nodes);
  const width = Math.max(minWidth, Math.ceil(bounds.width * 1.35));
  const height = Math.max(minHeight, Math.ceil(bounds.height * 1.35));

  const transform = getViewportForBounds(
    bounds,
    width,
    height,
    0.1,
    2.5,
    padding
  );

  return { width, height, transform };
}

/**
 * Exports the current React Flow canvas as a high-quality PNG or SVG image.
 */
export async function exportReactFlowAsImage(
  options: ExportFlowOptions = {}
): Promise<{ dataUrl: string; fileName: string }> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Export is only supported in browser environments.");
  }

  const viewportElement = document.querySelector(
    ".react-flow__viewport"
  ) as HTMLElement | null;

  if (!viewportElement) {
    throw new Error("React Flow viewport element (.react-flow__viewport) not found.");
  }

  const format = options.format ?? "png";
  const rawFileName = options.fileName?.trim() || "repoflow-diagram";
  const cleanFileName = rawFileName.replace(/\.[^/.]+$/, "");
  const outputFileName = `${cleanFileName}.${format}`;
  const backgroundColor = options.backgroundColor ?? "#050508";
  const pixelRatio = options.pixelRatio ?? (format === "png" ? 2 : 1);

  const nodes = options.nodes ?? [];
  const { width, height, transform } = computeExportDimensions(nodes, {
    padding: options.padding,
    minWidth: options.minWidth,
    minHeight: options.minHeight,
  });

  const exportConfig = {
    backgroundColor,
    width,
    height,
    pixelRatio,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
    },
    filter: (domNode: globalThis.Node) => {
      if (domNode instanceof HTMLElement) {
        if (
          domNode.classList.contains("react-flow__minimap") ||
          domNode.classList.contains("react-flow__controls") ||
          domNode.classList.contains("react-flow__attribution")
        ) {
          return false;
        }
      }
      return true;
    },
  };

  const dataUrl =
    format === "svg"
      ? await toSvg(viewportElement, exportConfig)
      : await toPng(viewportElement, exportConfig);

  downloadDataUrl(dataUrl, outputFileName);
  return { dataUrl, fileName: outputFileName };
}
