import { readFileSync } from "node:fs";
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
});
