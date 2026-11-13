import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTEXT_MENU_SWATCHES,
  extractNodeFilePath,
  buildGitHubFileUrl,
  buildElectricEdgeStyle,
  clampContextMenuPosition,
} from "./context-menu-utils";

test("CONTEXT_MENU_SWATCHES contains 5 distinct color swatches (Cyan, Purple, Green, Orange, Pink)", () => {
  assert.equal(CONTEXT_MENU_SWATCHES.length, 5);
  assert.deepEqual(
    CONTEXT_MENU_SWATCHES.map((s) => s.name),
    ["Cyan", "Purple", "Green", "Orange", "Pink"]
  );
});

test("extractNodeFilePath and buildGitHubFileUrl construct valid GitHub blob URLs from node data", () => {
  const urlFromSublabel = buildGitHubFileUrl(
    "https://github.com/vercel/next.js",
    "canary",
    {
      label: "app/page.tsx (View entry & route module)",
      sublabel: "src/app/page.tsx",
    }
  );
  assert.equal(
    urlFromSublabel,
    "https://github.com/vercel/next.js/blob/canary/src/app/page.tsx"
  );

  const urlFromFilePath = buildGitHubFileUrl(
    "akash-xcoder/Git-Flow",
    "main",
    {
      label: "CustomNode",
      filePath: "src/components/CustomNode.tsx",
    }
  );
  assert.equal(
    urlFromFilePath,
    "https://github.com/akash-xcoder/Git-Flow/blob/main/src/components/CustomNode.tsx"
  );

  const fallbackRepoRoot = buildGitHubFileUrl(
    "https://github.com/vercel/next.js",
    "canary",
    {
      label: "GitHub Repository",
      sublabel: "main · origin",
    }
  );
  assert.equal(fallbackRepoRoot, "https://github.com/vercel/next.js");
  assert.equal(extractNodeFilePath({ label: "CI/CD Pipeline", sublabel: "workflow · build-test" }), null);
});

test("buildElectricEdgeStyle returns stroke and glowing drop-shadow filter for custom edge color", () => {
  const style = buildElectricEdgeStyle("#a855f7");
  assert.equal(style.stroke, "#a855f7");
  assert.equal(style.strokeWidth, 2.5);
  assert.match(style.filter, /drop-shadow\(0 0 4px #a855f7\)/);
  assert.match(style.filter, /drop-shadow\(0 0 8px #a855f7\)/);
});

test("clampContextMenuPosition keeps coordinates inside canvas bounds", () => {
  const pos = clampContextMenuPosition(1180, 790, 1200, 800, 220, 150);
  assert.ok(pos.x <= 1200 - 220 - 12);
  assert.ok(pos.y <= 800 - 150 - 12);
});
