import test from "node:test";
import assert from "node:assert/strict";
import {
  computeExportDimensions,
  inlineSvgStylesForExport,
} from "./react-flow-export";
import type { Node } from "reactflow";

test("computeExportDimensions provides default fallback when no nodes are passed", () => {
  const result = computeExportDimensions([]);
  assert.equal(result.width, 1280);
  assert.equal(result.height, 768);
  assert.equal(result.transform.zoom, 1);
});

test("computeExportDimensions calculates proportional viewport for nodes bounds", () => {
  const nodes: Node[] = [
    {
      id: "1",
      position: { x: 100, y: 100 },
      data: { label: "A" },
      width: 250,
      height: 80,
    },
    {
      id: "2",
      position: { x: 600, y: 400 },
      data: { label: "B" },
      width: 250,
      height: 80,
    },
  ];

  const result = computeExportDimensions(nodes);
  assert.ok(result.width >= 1280);
  assert.ok(result.height >= 768);
  assert.ok(result.transform.zoom > 0);
  assert.ok(typeof result.transform.x === "number");
  assert.ok(typeof result.transform.y === "number");
});

test("inlineSvgStylesForExport inlines computed stroke/glow styles onto SVG edge paths and restores originals", () => {
  const createFakeSvgElement = (initialStyle?: string) => {
    const attrs = new Map<string, string>();
    if (initialStyle !== undefined) {
      attrs.set("style", initialStyle);
    }
    const styleObj: Record<string, string> = {};
    return {
      style: new Proxy(styleObj, {
        set(target, prop, value) {
          target[String(prop)] = String(value);
          attrs.set("style", JSON.stringify(target));
          return true;
        },
      }),
      hasAttribute: (name: string) => attrs.has(name),
      getAttribute: (name: string) => attrs.get(name) ?? null,
      setAttribute: (name: string, val: string) => {
        attrs.set(name, val);
      },
      removeAttribute: (name: string) => {
        attrs.delete(name);
      },
    };
  };

  const pathEl = createFakeSvgElement(undefined);
  const customStyledPathEl = createFakeSvgElement("stroke: #a855f7;");
  const svgEl = {
    ...createFakeSvgElement("z-index: 0;"),
    querySelectorAll: () => [pathEl, customStyledPathEl],
  };
  const fakeRoot = {
    querySelectorAll: () => [svgEl],
  } as unknown as HTMLElement;

  const prevWindow = (globalThis as Record<string, unknown>).window;
  (globalThis as Record<string, unknown>).window = {
    getComputedStyle: (el: unknown) =>
      el === customStyledPathEl
        ? {
            stroke: "rgb(168, 85, 247)",
            strokeWidth: "2.5px",
            strokeDasharray: "10px, 15px",
            strokeDashoffset: "0px",
            strokeLinecap: "butt",
            strokeLinejoin: "miter",
            strokeOpacity: "1",
            fill: "none",
            fillOpacity: "1",
            filter: "drop-shadow(rgb(168, 85, 247) 0px 0px 4px)",
            opacity: "1",
            visibility: "visible",
            display: "inline",
            color: "rgb(255, 255, 255)",
          }
        : {
            stroke: "rgb(0, 243, 255)",
            strokeWidth: "2.5px",
            strokeDasharray: "10px, 15px",
            strokeDashoffset: "0px",
            strokeLinecap: "butt",
            strokeLinejoin: "miter",
            strokeOpacity: "1",
            fill: "none",
            fillOpacity: "1",
            filter: "drop-shadow(rgb(0, 243, 255) 0px 0px 4px)",
            opacity: "1",
            visibility: "visible",
            display: "inline",
            color: "rgb(255, 255, 255)",
          },
  };

  try {
    const restore = inlineSvgStylesForExport(fakeRoot);

    assert.equal(svgEl.style.overflow, "visible");
    assert.equal(pathEl.style.stroke, "rgb(0, 243, 255)");
    assert.equal(pathEl.style.strokeWidth, "2.5px");
    assert.equal(pathEl.style.strokeDasharray, "10px, 15px");
    assert.equal(pathEl.style.fill, "none");
    assert.ok(pathEl.style.filter.includes("drop-shadow"));
    assert.equal(customStyledPathEl.style.stroke, "rgb(168, 85, 247)");

    restore();

    assert.equal(svgEl.getAttribute("style"), "z-index: 0;");
    assert.equal(pathEl.hasAttribute("style"), false);
    assert.equal(customStyledPathEl.getAttribute("style"), "stroke: #a855f7;");
  } finally {
    if (prevWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = prevWindow;
    }
  }
});
