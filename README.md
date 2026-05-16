# miku-md2docx-web

`miku-md2docx-web` is the separated Web App surface for `miku-md2docx`.

This repository owns the browser UI, Single-file Web App generation, local
browser adapters, `lht-cmn` UI components, browser tests, and Web release
assets. The product conversion semantics remain owned by the upstream
`miku-md2docx` main application.

## Repository Role

- Main application repository: <https://github.com/igapyon/miku-md2docx>
- Web App repository: <https://github.com/igapyon/miku-md2docx-web>

The Web build uses a vendored upstream runtime file:

- `vendor/miku-md2docx-runtime.mjs`
- `vendor/miku-md2docx-runtime.json`

The runtime is committed before release builds so the generated Web App remains
offline and reproducible. The Web repository does not read upstream TypeScript
source files during normal builds.

To refresh the vendored runtime from a local upstream checkout:

```bash
npm run refresh:runtime
```

By default this reads `../miku-md2docx/dist/core.js`. Set
`MD2DOCX_UPSTREAM_DIR=/path/to/miku-md2docx` to use a different checkout. Run
`npm run build` in the upstream checkout first when `dist/core.js` is stale or
missing. Set `MD2DOCX_RUNTIME_PATH=<path-from-upstream-root>` only when the
main application changes its current runtime artifact path. The refresh command
records the upstream version and SHA-256 digest in
`vendor/miku-md2docx-runtime.json`.

## Build

```bash
npm install
npm run build
```

`npm run build` generates:

- `index.html`
- `miku-md2docx.html`
- `src/js/`

The generated `miku-md2docx.html` is the Single-file Web App artifact. It embeds
the vendored runtime and is intended to open directly from the local filesystem
and run normal conversion without network access.

To stage GitHub Release assets after a build:

```bash
npm run stage:web-release
```

`npm run stage:web-release` writes versioned HTML assets and metadata under
`release-assets/`. The GitHub Actions workflow
`.github/workflows/release-web-assets.yml` runs on `v*` tags, builds and tests
the Web App, stages the release assets, and uploads them to the matching GitHub
Release.

## Test

```bash
npm run test:unit
```

Run `npm run build` first when `src/js/` or generated HTML has not been created
yet.

## Repository Operation

`workplace/` is a local scratch area for reference checkouts, extracted
archives, and verification artifacts. Only `workplace/.gitkeep` is tracked.

Generated distribution files are intentionally committed so release artifacts
remain reviewable. Do not hand-edit generated `index.html`,
`miku-md2docx.html`, or `src/js/`; update source files or the vendored runtime
and run `npm run build`.

`release-assets/` is a local staging directory and is ignored by Git.

GitHub Pages should publish `index.html` from this separated `-web` repository.
Changing the repository Pages setting is a human-owned GitHub operation.

## License

Apache License 2.0

See [LICENSE](./LICENSE).
