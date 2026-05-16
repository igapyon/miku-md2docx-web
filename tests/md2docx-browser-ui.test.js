// @vitest-environment node

import { readFileSync } from "node:fs";
import path from "node:path";
import { TextDecoder, TextEncoder } from "node:util";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const browserScriptOrder = [
  "lht-cmn/js/components.js",
  "src/js/miku-md2docx-runtime.js",
  "src/js/main.js"
];

function installBrowserGlobals(window) {
  window.TextEncoder = TextEncoder;
  window.TextDecoder = TextDecoder;
  window.URL.createObjectURL = () => "blob:md2docx-test";
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = () => {};
}

async function createBrowserUi() {
  const html = readFileSync(path.resolve(rootDir, "miku-md2docx-src.html"), "utf8");
  const dom = new JSDOM(html, {
    url: "https://example.test/miku-md2docx.html",
    pretendToBeVisual: true,
    runScripts: "outside-only"
  });
  installBrowserGlobals(dom.window);

  for (const relPath of browserScriptOrder) {
    const source = readFileSync(path.resolve(rootDir, relPath), "utf8");
    dom.window.eval(source);
  }
  dom.window.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  await waitFor(() => dom.window.document.getElementById("statusText")?.textContent === "Select a Markdown file to convert.");
  return dom;
}

function createMarkdownFile(window, fileName, markdown) {
  const file = new window.File([markdown], fileName, {
    type: "text/markdown"
  });
  if (typeof file.text !== "function") {
    file.text = async () => markdown;
  }
  return file;
}

async function selectMarkdown(dom, fileName, markdown) {
  const { window } = dom;
  const selector = window.document.getElementById("markdownFileSelect");
  selector.dispatchEvent(new window.CustomEvent("lht-file-select:change", {
    bubbles: true,
    detail: {
      files: [createMarkdownFile(window, fileName, markdown)],
      names: [fileName]
    }
  }));
  window.document.getElementById("convertBtn").click();
  await waitFor(() => window.document.getElementById("statusText")?.textContent === `Converted ${fileName}`);
}

function getPreviewText(dom, id) {
  return dom.window.document.getElementById(id).getText();
}

async function waitFor(predicate) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for browser UI state.");
}

describe("md2docx browser UI", () => {
  it("converts Markdown through the Web UI path", async () => {
    const dom = await createBrowserUi();
    try {
      await selectMarkdown(dom, "sample.md", "# Title\n\nHello **DOCX**.\n");

      expect(getPreviewText(dom, "summaryPreview")).toContain("paragraphs:");
      expect(getPreviewText(dom, "summaryPreview")).toContain("headings:");
      expect(dom.window.document.getElementById("downloadBtn").disabled).toBe(false);
    } finally {
      dom.window.close();
    }
  });

  it("clears rendered state", async () => {
    const dom = await createBrowserUi();
    try {
      await selectMarkdown(dom, "sample.md", "Hello.\n");
      dom.window.document.getElementById("clearBtn").click();

      expect(dom.window.document.getElementById("downloadBtn").disabled).toBe(true);
      expect(getPreviewText(dom, "summaryPreview")).toBe("No conversion yet.");
      expect(dom.window.document.getElementById("statusText").textContent).toBe("Select a Markdown file to convert.");
    } finally {
      dom.window.close();
    }
  });
});
