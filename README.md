# Markdown Viewer Mac

A native macOS Markdown viewer and editor built from scratch with Electron, Vite, and a secure local rendering pipeline.

## What It Does

- Opens `.md`, `.markdown`, `.mdown`, `.mkd`, and `.txt` files from the toolbar, app menu, drag and drop, command line args, and macOS `open-file` events.
- Provides multi-tab editing with dirty state.
- Supports split, editor-only, and preview-only layouts.
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
npm run check
```

Builds the renderer and runs a smoke check.

```bash
npm run build
```

Builds an unpacked Apple Silicon macOS app at `release/mac-arm64/Markdown Viewer Mac.app`.

```bash
npm run dist
```

Builds a macOS DMG in `release/`.

## Architecture

- `electron/main.cjs`: trusted native process for windows, menus, file dialogs, filesystem reads/writes, exports, and macOS file-open events.
- `electron/preload.cjs`: narrow bridge exposed as `window.markdownNative`.
- `src/renderer.js`: document state, tabs, Markdown rendering, export requests, drag/drop, keyboard shortcuts, and UI behavior.
- `src/styles.css`: desktop UI and Markdown preview styling.
- `docs/research.md`: research notes and implementation plan based on the reference app.

## Security

The renderer has `nodeIntegration: false` and `contextIsolation: true`. The web UI never receives unrestricted filesystem APIs. Markdown output is sanitized with DOMPurify before preview rendering, and external links are opened through Electron shell after URL validation.
