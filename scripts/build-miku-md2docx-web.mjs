import fs from "node:fs";
import path from "node:path";

import { build } from "esbuild";

import { buildSingleHtmlFromSource } from "./lib/single-html.mjs";

const ROOT = process.cwd();
const RUNTIME_SOURCE_PATH = path.resolve(ROOT, "vendor", "miku-md2docx-runtime.mjs");
const RUNTIME_METADATA_PATH = path.resolve(ROOT, "vendor", "miku-md2docx-runtime.json");
const RUNTIME_BROWSER_PATH = path.resolve(ROOT, "src", "js", "miku-md2docx-runtime.js");

const TARGETS = [
  {
    srcHtml: "index-src.html",
    outHtml: "index.html"
  },
  {
    srcHtml: "miku-md2docx-src.html",
    outHtml: "miku-md2docx.html"
  }
];

const runtimeMetadata = loadRuntimeMetadata();

prepareBrowserRuntime();
await bundleBrowserMain();

for (const target of TARGETS) {
  const srcPath = path.resolve(ROOT, target.srcHtml);
  const outPath = path.resolve(ROOT, target.outHtml);
  const source = applyBuildPlaceholders(fs.readFileSync(srcPath, "utf8"), runtimeMetadata);
  const output = buildSingleHtmlFromSource(source, srcPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, output, "utf8");
  console.log(`[build:miku-md2docx-web] generated ${target.outHtml}`);
}

function loadRuntimeMetadata() {
  if (!fs.existsSync(RUNTIME_SOURCE_PATH)) {
    throw new Error("Missing vendored runtime: vendor/miku-md2docx-runtime.mjs");
  }
  const runtimeSource = fs.readFileSync(RUNTIME_SOURCE_PATH, "utf8");
  const metadata = fs.existsSync(RUNTIME_METADATA_PATH)
    ? JSON.parse(fs.readFileSync(RUNTIME_METADATA_PATH, "utf8"))
    : {};
  const version = typeof metadata.runtimeVersion === "string" && metadata.runtimeVersion
    ? metadata.runtimeVersion
    : parseRuntimeVersion(runtimeSource);
  return {
    version,
    versionStamp: version
  };
}

function applyBuildPlaceholders(source, metadata) {
  return source
    .replaceAll("__PACKAGE_VERSION__", metadata.version)
    .replaceAll("__PACKAGE_VERSION_STAMP__", metadata.versionStamp);
}

function parseRuntimeVersion(source) {
  const match = source.match(/__MIKU_MD2DOCX_VERSION\s*=\s*"([^"]+)"/);
  return match ? match[1] : "0.0.0";
}

function prepareBrowserRuntime() {
  const runtimeSource = fs.readFileSync(RUNTIME_SOURCE_PATH, "utf8");
  const exportPattern = /\nexport\s*\{\s*convertMarkdownToDocx,\s*formatSummary\s*\};\s*$/;
  if (!exportPattern.test(runtimeSource)) {
    throw new Error("Vendored runtime does not expose the expected miku-md2docx browser exports.");
  }

  const browserSource = "\"use strict\";\n" + runtimeSource
    .replace(/import \{ default as default2 \} from "node:path";\n/, browserPathPolyfill())
    .replace(/import \{ default as default3 \} from "node:process";\n/, "var default3 = { cwd: () => \"\" };\n")
    .replace(/import \{ fileURLToPath \} from "node:url";\n/, "function fileURLToPath(url) { return String(url && url.pathname ? url.pathname : url); }\n")
    .replace(exportPattern, "")
    + "\n\nglobalThis.__mikuMd2docxRuntime = { convertMarkdownToDocx, formatSummary };\n";
  fs.mkdirSync(path.dirname(RUNTIME_BROWSER_PATH), { recursive: true });
  fs.writeFileSync(RUNTIME_BROWSER_PATH, browserSource, "utf8");
}

function browserPathPolyfill() {
  return `var default2 = {
  sep: "/",
  basename(value, ext) {
    const base = String(value || "").split(/[\\\\/]/).filter(Boolean).pop() || "";
    return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
  },
  dirname(value) {
    const normalized = String(value || "").replace(/\\\\/g, "/");
    const index = normalized.lastIndexOf("/");
    return index > 0 ? normalized.slice(0, index) : "";
  },
  extname(value) {
    const base = this.basename(value);
    const index = base.lastIndexOf(".");
    return index > 0 ? base.slice(index) : "";
  },
  join(...parts) {
    return parts.filter((part) => part !== "").join("/").replace(/\\/+/g, "/");
  }
};
`;
}

async function bundleBrowserMain() {
  await build({
    entryPoints: ["src/ts/main.ts"],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    outfile: "src/js/main.js",
    sourcemap: false
  });
}
