import { readFileSync } from "node:fs";
import { TextDecoder, TextEncoder } from "node:util";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

describe("generated Web artifacts", () => {
  it("keeps generated HTML free of remote runtime asset references", () => {
    for (const fileName of ["index.html", "miku-md2docx.html"]) {
      const html = readFileSync(fileName, "utf8");
      expect(html).not.toMatch(/<script\b[^>]*\bsrc=["']https?:\/\//i);
      expect(html).not.toMatch(/<link\b[^>]*\bhref=["']https?:\/\//i);
      expect(html).not.toMatch(/<img\b[^>]*\bsrc=["']https?:\/\//i);
      expect(html).not.toMatch(/fonts\.googleapis\.com|cdn\./i);
      expect(html).not.toContain("__PACKAGE_VERSION__");
      expect(html).not.toContain("__PACKAGE_VERSION_STAMP__");
    }
  });

  it("records the vendored upstream runtime digest", () => {
    const metadata = JSON.parse(readFileSync("vendor/miku-md2docx-runtime.json", "utf8"));
    expect(metadata.runtimeVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(metadata.sourceRepository).toBe("https://github.com/igapyon/miku-md2docx");
    expect(metadata.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("executes generated Single-file Web App scripts without startup errors", async () => {
    const html = readFileSync("miku-md2docx.html", "utf8");
    const dom = new JSDOM(html, {
      url: "https://example.test/miku-md2docx.html",
      pretendToBeVisual: true,
      runScripts: "outside-only"
    });
    const errors = [];
    dom.window.TextEncoder = TextEncoder;
    dom.window.TextDecoder = TextDecoder;
    dom.window.addEventListener("error", (event) => {
      errors.push(event.error || event.message);
    });
    dom.window.addEventListener("unhandledrejection", (event) => {
      errors.push(event.reason || "unhandled rejection");
    });

    try {
      const scripts = Array.from(dom.window.document.querySelectorAll("script"));
      for (const script of scripts) {
        dom.window.eval(script.textContent || "");
      }
      dom.window.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
      await waitFor(() => dom.window.document.getElementById("statusText")?.textContent === "Select a Markdown file to convert.");
      expect(errors.map(String)).toEqual([]);
      expect(dom.window.__mikuMd2docxRuntime).toBeTruthy();
    } finally {
      dom.window.close();
    }
  });
});

async function waitFor(predicate) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for generated Web App startup.");
}
