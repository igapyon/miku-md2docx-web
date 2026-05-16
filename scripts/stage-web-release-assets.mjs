import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.resolve(ROOT, "package.json"), "utf8"));
const version = packageJson.version;
const releaseDir = path.resolve(ROOT, "release-assets");

fs.mkdirSync(releaseDir, { recursive: true });

const assets = [
  {
    source: "miku-md2docx.html",
    target: `miku-md2docx-web-${version}.html`
  },
  {
    source: "index.html",
    target: `miku-md2docx-web-index-${version}.html`
  }
];

for (const asset of assets) {
  fs.copyFileSync(path.resolve(ROOT, asset.source), path.resolve(releaseDir, asset.target));
  console.log(`[stage:web-release] staged ${asset.target}`);
}

const metadata = {
  name: packageJson.name,
  version,
  assets: assets.map((asset) => asset.target),
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(
  path.resolve(releaseDir, `miku-md2docx-web-${version}.json`),
  JSON.stringify(metadata, null, 2) + "\n",
  "utf8"
);
console.log(`[stage:web-release] staged miku-md2docx-web-${version}.json`);
