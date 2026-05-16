import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const upstreamDir = path.resolve(ROOT, process.env.MD2DOCX_UPSTREAM_DIR || "../miku-md2docx");
const upstreamPackagePath = path.resolve(upstreamDir, "package.json");
const upstreamRuntimePath = path.resolve(upstreamDir, process.env.MD2DOCX_RUNTIME_PATH || "dist/core.js");
const vendorRuntimePath = path.resolve(ROOT, "vendor", "miku-md2docx-runtime.mjs");
const vendorMetadataPath = path.resolve(ROOT, "vendor", "miku-md2docx-runtime.json");

if (!fs.existsSync(upstreamPackagePath)) {
  throw new Error(`Upstream package.json not found: ${upstreamPackagePath}`);
}

if (!fs.existsSync(upstreamRuntimePath)) {
  throw new Error(
    `Upstream runtime not found: ${upstreamRuntimePath}\n`
    + "Run `npm run build` in the upstream miku-md2docx checkout first, "
    + "or set MD2DOCX_RUNTIME_PATH to the current runtime artifact path."
  );
}

const upstreamPackage = JSON.parse(fs.readFileSync(upstreamPackagePath, "utf8"));
const runtimeSource = fs.readFileSync(upstreamRuntimePath, "utf8");
const digest = createHash("sha256").update(runtimeSource).digest("hex");

fs.mkdirSync(path.dirname(vendorRuntimePath), { recursive: true });
fs.writeFileSync(vendorRuntimePath, runtimeSource, "utf8");
fs.writeFileSync(
  vendorMetadataPath,
  JSON.stringify({
    runtimeVersion: upstreamPackage.version,
    sourceRepository: "https://github.com/igapyon/miku-md2docx",
    sourcePath: path.relative(ROOT, upstreamRuntimePath),
    sourceRole: "current bundled core runtime from the local upstream main application checkout",
    sha256: digest,
    refreshedAt: new Date().toISOString()
  }, null, 2) + "\n",
  "utf8"
);

console.log(`[refresh:runtime] copied ${path.relative(ROOT, upstreamRuntimePath)}`);
console.log(`[refresh:runtime] runtimeVersion ${upstreamPackage.version}`);
console.log(`[refresh:runtime] sha256 ${digest}`);
