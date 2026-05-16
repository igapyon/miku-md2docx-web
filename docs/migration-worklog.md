# Migration Worklog

## 2026-05-17 Initial Web Repository Shape

This repository was initialized as the separated `11 Web App` surface for
`miku-md2docx`.

Checked local references:

- Upstream main application: `../miku-md2docx`
- Same-layer Web references: `../miku-docx2md-web` and `../miku-xlsx2md-web`

Decisions adopted from the same-layer references:

- Keep product semantics in the upstream `miku-md2docx` main application.
- Use `index-src.html` and `miku-md2docx-src.html` as editable source HTML.
- Generate `index.html` and `miku-md2docx.html` through `npm run build`.
- Use `lht-cmn` as the local shared Web component layer.
- Keep `vendor/miku-md2docx-runtime.mjs` as the committed upstream runtime
  input for offline and reproducible Web builds.
- Refresh that vendored runtime with `npm run refresh:runtime`; this records
  the upstream version and SHA-256 digest in
  `vendor/miku-md2docx-runtime.json`.
- Stage versioned GitHub Release assets under ignored `release-assets/`.

Current runtime input:

- `vendor/miku-md2docx-runtime.mjs`
- Source: `../miku-md2docx/src/js/core.js`
- Runtime version: `0.5.0`
- SHA-256:
  `8e63365a51bbe8766529f09496127fd124733680b582feba81e1ec5444f75c30`

Checkpoint status:

- Checkpoint 1, scope and ownership: Web repository is
  `igapyon/miku-md2docx-web`; upstream main application is
  `igapyon/miku-md2docx`; product semantics remain upstream.
- Checkpoint 2, Web repository established: local repository conventions,
  source/generated HTML split, vendored runtime input, Web build, Web tests,
  and Web release asset staging are present.
- Checkpoint 3, Web smoke: `npm run build:all` verifies the browser UI path
  through the generated runtime; generated HTML checks verify no remote runtime
  asset references.

Remaining human-owned GitHub setting:

- Enable GitHub Pages for this separated `-web` repository and publish
  `index.html` from the default branch.
