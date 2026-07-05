# Shibanshu Markdown Viewer

A native macOS Markdown viewer and editor built from scratch with Electron, Vite, and a secure local rendering pipeline.

The long-term target is a free, professional, local-first Markdown app. The roadmap does not include paid gates or pricing tiers.

## What It Does

- Opens `.md`, `.markdown`, `.mdown`, `.mkd`, `.txt`, and `.canvas` files from the toolbar, app menu, drag and drop, command line args, and macOS `open-file` events.
- Registers a custom macOS app icon and the `shibanshu-markdown://` URL scheme for safe automation commands.
- Provides a `shibanshu-markdown` CLI for local context export, static publishing, note creation, URL-scheme automation, and OS file opening.
- Opens a Markdown folder as a local vault with a collapsible sidebar file tree, search, outline, backlinks, and safe create/rename/trash actions for vault files.
- Searches open files or the active vault with ranked content snippets and click-to-open results.
- Shows a free local note graph with local/global scopes, click-to-open nodes, JSON Canvas file-card/connection edges, and a full graph map with search, local depth, saved folder/type/media/canvas filters, rendered preview popovers with source-line anchors, keyboard roving focus, detail-card node focus/expand actions, minimap recentering, zoom, fit-to-view, profile-based JSON/SVG/Markdown context export, and a high-capacity force layout for large vaults.
- Builds a free AI context map for Claude, OpenAI, Gemini, Ollama, or any local model by copying it or creating it as a Markdown note.
- Exports a repo-scale Claude context map, typed graph JSON, and JSONL chunks from any folder with `npm run context:claude`.
- Opens a visual mind-map canvas for the active note with headings, outgoing links, backlinks, tags, tasks, search, zoom, pan, click-to-open source navigation, detail-card source anchors, and Claude-ready map export.
- Publishes the open vault as a local static website with note pages, search data, backlinks, a graph JSON file, and responsive theme styling.
- Publishes any Markdown folder from the CLI without launching the desktop app.
- Adds a command palette and `Cmd/Ctrl+P` quick-open for connected keyboard-first actions, open-document switching, recent files, and recent vaults.
- Provides multi-tab editing with dirty state.
- Autosaves dirty documents into the app-data draft store and offers a recovery dialog after crashes.
- Keeps local per-file version history snapshots on save and can restore a prior snapshot into the current document as unsaved changes.
- Uses a CodeMirror Markdown editor foundation with line numbers, undo history, search panel support, folding, and Markdown syntax highlighting.
- Adds Markdown formatting commands for headings, bold, italic, links, inline code, quotes, task lists, and tables from the toolbar, command palette, keyboard shortcuts, and native Format menu.
- Guards window close when documents have unsaved changes.
- Uses atomic saves and checks for files changed outside the app before overwriting.
- Watches open files and reloads clean documents when the disk version changes.
- Supports split, editor-only, and preview-only layouts.
- Inserts an editable Mermaid mind map generated from the current document headings, and previews Mermaid mind maps with a readable app-native SVG renderer.
- Renders GitHub-Flavored Markdown with sanitized HTML.
- Supports syntax highlighting, Mermaid diagrams, KaTeX math, and GitHub-style alerts.
- Exports Markdown content to local HTML and PDF files.
- Packages as a macOS `.app` with Markdown file association metadata.

## Commands

```bash
npm run dev
```

Runs Vite and opens the Electron app in development mode.

```bash
npm run local:web
```

Builds the renderer and serves the app at a local browser URL. Use this when macOS refuses to launch Electron from a restricted Terminal/Codex session; it runs the same renderer UI without depending on LaunchServices.

```bash
npm run validate:syntax
```

Checks every project JavaScript file before smoke, build, or release commands continue.

```bash
npm run assets:icon
```

Generates `build/icon.icns`, `build/icon.ico`, and `build/icon-base.png` from a deterministic local icon script used by app packaging.

```bash
npm run check
```

Builds the renderer and runs a smoke check.

```bash
npm run test:ui
```

Builds the renderer and runs a headless browser UI smoke test for the command palette, graph map, mind-map canvas, Markdown formatting controls, seeded vault navigation, and view controls.

```bash
npm run stress
```

Runs an extreme synthetic vault/repo test covering dense links, large maps, hostile Markdown, CLI context export, static publish, profiles, release metadata, and download-page generation.

```bash
npm run cli -- --help
```

Runs the local CLI entrypoint during development.

```bash
npm run context:claude -- /path/to/vault-or-repo
```

Writes `.shibanshu/claude-context-map.md`, `.shibanshu/claude-context-navigation.md`, `.shibanshu/claude-context-mind-map.md`, `.shibanshu/claude-context-graph.json`, and `.shibanshu/llm-context-chunks.jsonl` for large Markdown vaults or repos. This is fully local and does not call an AI provider. The graph JSON includes typed edge kinds, local code imports, test-coverage edges, symbols, aliases, clusters, hubs, bridges, orphans, unresolved-link sources, and suggested LLM navigation routes.

```bash
npm run publish:static -- /path/to/vault --out /tmp/notes-site
```

Writes a local static site with sanitized note pages, search data, backlinks, and `assets/graph.json` without launching Electron.

Reusable publish profiles live in `.shibanshu/publish-profiles.json` by default:

```bash
npm run publish:static -- /path/to/vault --save-profile docs --out ../notes-site --theme dark
npm run publish:static -- /path/to/vault --profile docs
npm run publish:static -- /path/to/vault --list-profiles
```

```bash
npm run e2e
```

Builds the renderer, launches Electron, verifies the packaged UI loads CSS/JS, opens a Markdown file, clicks view controls, edits, saves, and captures `test-artifacts/e2e-app.png`.

```bash
npm run diagnose:mac:launch
```

Reads recent macOS crash reports for Electron/Shibanshu launch failures and classifies the known `RegisterApplication`/Mach-service denial that can happen when GUI apps are launched from restricted Terminal/Codex sessions.

```bash
npm run release:checksums
npm run release:readiness -- --arch arm64
npm run generate:download-page
```

Writes `release/release-manifest.json`, `release/SHA256SUMS`, `release/release-readiness.json`, and `docs/download/index.html` for offline installer distribution.

```bash
npm run verify:mac:app -- --arch arm64
```

Verifies the packaged macOS app bundle without launching it: plist metadata, executable alignment, app.asar contents, code signing, ZIP checksum, Spotlight classification, and LaunchServices scan status. LaunchServices warnings can appear in restricted terminal sessions even when the bundle itself is structurally valid; public release still requires a manual double-click/open-file smoke test on a normal macOS desktop plus Developer ID signing and notarization.

For public release gating:

```bash
npm run release:readiness -- --arch arm64 --public
```

This fails until Developer ID signing, notarization/stapling, Gatekeeper approval, checksums, download status, and trust documents are in place. See `docs/release-readiness.md`.

```bash
npm run build
```

Builds an unpacked Apple Silicon macOS app at `release/mac-arm64/Shibanshu Markdown Viewer.app`.

```bash
npm run dist
```

Builds a signed macOS app bundle and ZIP artifact in `release/`, then refreshes checksums and the offline download page.

Additional packaging commands are available for release preparation: `npm run dist:mac:arm64`, `npm run dist:mac:x64`, `npm run dist:mac:universal`, `npm run dist:mac:dmg:arm64`, `npm run dist:win`, and `npm run dist:linux`. The DMG command uses macOS DiskImages through `hdiutil`; the ZIP path is the deterministic fallback for hosts where DiskImages is unavailable.

## URL Scheme

The packaged app registers `shibanshu-markdown://` for safe automation:

- `shibanshu-markdown://new?title=Draft.md&content=%23%20Draft` creates an unsaved note.
- `shibanshu-markdown://search?q=roadmap` opens workspace search.
- `shibanshu-markdown://open` opens the file picker.
- `shibanshu-markdown://open-vault` opens the folder picker.
- `shibanshu-markdown://command-palette`, `shibanshu-markdown://graph`, and `shibanshu-markdown://mind-map` open existing app surfaces.

The URL scheme does not read arbitrary local paths from a URL. Direct file access still goes through macOS file-open events, drag and drop, or explicit file/folder dialogs.

## CLI

The project exposes `shibanshu-markdown` through `package.json` `bin`.

Useful commands:

```bash
shibanshu-markdown context /path/to/vault-or-repo --out /tmp/context
shibanshu-markdown publish /path/to/vault --out /tmp/notes-site
shibanshu-markdown publish /path/to/vault --save-profile docs --out ../notes-site
shibanshu-markdown publish /path/to/vault --profile docs
shibanshu-markdown new --title Draft.md --content "# Draft"
shibanshu-markdown create-note ~/Notes/today.md --content "# Today" --no-open
shibanshu-markdown search roadmap
shibanshu-markdown open ~/Notes/today.md
shibanshu-markdown open-vault
shibanshu-markdown graph
shibanshu-markdown mind-map
```

`create-note` writes atomically and refuses to replace an existing file unless `--force` is passed. `publish` is fully local, rewrites wiki/Markdown links into generated note-page links, writes graph/search assets into the selected output folder, and supports reusable publish profiles. URL-based commands do not read arbitrary paths.

## Architecture

- `electron/main.cjs`: trusted native process for windows, menus, file dialogs, recent files/vaults, filesystem reads/writes, exports, local static publishing, and macOS file-open events.
- `electron/preload.cjs`: narrow bridge exposed as `window.markdownNative`.
- `src/renderer.js`: document state, vault index/sidebar, tabs, CodeMirror editor setup, Markdown formatting commands, Markdown rendering, graph/mind-map canvases, export requests, drag/drop, keyboard shortcuts, and UI behavior.
- `src/styles.css`: desktop UI and Markdown preview styling.
- `bin/shibanshu-markdown.mjs`: local CLI for context export, static publishing, safe note creation, URL commands, and OS file-opening workflows.
- `scripts/publish-static-site.mjs`: standalone vault-to-static-site exporter used by the CLI.
- `scripts/generate-app-icon.mjs`: deterministic icon generator for the packaged macOS app.
- `scripts/stress-check.mjs`: extreme synthetic vault/repo test runner.
- `scripts/release-checksums.mjs`: release manifest and SHA-256 generator.
- `scripts/generate-download-page.mjs`: offline download page generator.
- `skills/shibanshu-markdown-context`: packaged LLM skill for using the viewer as a context-map system.
- `docs/research.md`: research notes and implementation plan based on the reference app.
- `docs/four-track-completion-plan.md`: independent end-to-end execution plans (utility, cosmetic, functionality, interaction).
- `docs/obsidian-app-audit.md`: local Obsidian 1.12.7 bundle and feature-surface audit.
- `docs/premium-roadmap.md`: free professional roadmap with nested implementation plans and acceptance checks.
- `docs/obsidian-parity-plan.md`: free end-to-end feature parity plan for vaults, graph view, Canvas, mind maps, Publish, Sync, plugins, themes, and AI maps.
- `docs/mega-stress-test-plan.md`: edge-case, stress-test, LLM-skill, and distribution gap plan.

## Security

The renderer has `nodeIntegration: false` and `contextIsolation: true`. The web UI never receives unrestricted filesystem APIs. Main-process IPC validates sender origin before handling native requests. Markdown output is sanitized with DOMPurify before preview rendering, and external links are opened through Electron shell after URL validation.

Remote and local-file images are blocked by the app content security policy by default. Exported HTML/PDF content also carries a restrictive CSP and PDF export blocks network/file resource loading. Static publish writes are constrained to the folder selected in the export dialog.
