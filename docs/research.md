# Markdown Viewer Research And Build Plan

## Reference

- Production app: https://markdownviewer.pages.dev/?lang=en
- Source repo: https://github.com/ThisIs-Developer/Markdown-Viewer

The reference app presents a split Markdown editor and live preview with import/export, copy, sharing, tabs, i18n, dark mode, find/replace, diagrams, math, syntax highlighting, and stats. Its own README describes a client-side SPA using `index.html`, `script.js`, `styles.css`, a `preview-worker.js`, local storage, service worker caching, lazy optional libraries, and a NeutralinoJS desktop shell.

Key implementation ideas worth carrying forward:

- Keep Markdown parsing local and privacy-preserving.
- Sanitize generated HTML before it reaches the preview.
- Load expensive renderers only when the document needs them.
- Separate trusted native file access from untrusted document rendering.
- Support macOS file-open flows, not only in-app import buttons.
- Track stats and dirty/saved state clearly.

## Stack Decision

This project uses Electron instead of Tauri or NeutralinoJS because the local machine already has Node/npm and no visible Rust toolchain. Electron gives us native macOS `open-file` events, menu accelerators, packaged `.app` output, file association metadata, and a preload bridge for secure file operations.

## Scope

The first complete app includes:

- Direct `.md`, `.markdown`, and `.mdown` opening through dialogs, drag/drop, command line args, and macOS `open-file`.
- Multi-tab documents with dirty state.
- Split, editor-only, and preview-only modes.
- GitHub-flavored Markdown through Marked.
- HTML sanitization through DOMPurify.
- Syntax highlighting through Highlight.js.
- Mermaid diagrams through lazy dynamic import.
- KaTeX block and inline math.
- GitHub-style alert rendering.
- Reading time, word count, and character count.
- Save, Save As, Copy Markdown, Reveal in Finder, Export HTML, and Export PDF.
- Packaged macOS app metadata with Markdown file associations.

## Security Model

- Renderer runs with `nodeIntegration: false` and `contextIsolation: true`.
- Preload exposes a narrow `markdownNative` API.
- Main process owns filesystem access.
- External links open through Electron shell.
- Preview HTML is sanitized, and Mermaid SVG output is sanitized before insertion.

## Performance Model

- Rendering is debounced.
- Preview generation avoids redundant renders by hashing current content.
- Mermaid is loaded only when a Mermaid code fence exists.
- Scroll sync uses proportional `requestAnimationFrame` updates.
- Export work happens on demand, not during editing.
