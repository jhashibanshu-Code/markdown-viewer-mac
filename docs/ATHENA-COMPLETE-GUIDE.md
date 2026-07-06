# Athena — Complete Technical & Product Guide

*Everything this codebase does, how it works, and why it matters.*

---

## Table of Contents

1. What Athena Is
2. The Three Products
3. Product A: Athena MCP Server (Developer Tool)
4. Product B: Markdown Viewer Desktop App (Mac)
5. Product C: Markdown Viewer Mobile App (Android)
6. Architecture Overview
7. How the Context Map Engine Works
8. The 19 MCP Tools — What Each Does
9. The 3D Graph Viewer
10. How Auto-Mapping Works
11. How CLAUDE.md Integration Works
12. The CLI
13. Build & Distribution Pipeline
14. Testing Infrastructure
15. Security Model
16. File Structure (179 files, 9 clusters)
17. Benchmarks (Real, Tested)
18. What This Solves (The 12 Problems)
19. What This Doesn't Solve (Honest Limitations)
20. Roadmap

---

## 1. What Athena Is

Athena is a system that gives AI coding tools (Claude Code, Cursor, any MCP client) structural understanding of codebases. Instead of reading files one by one, the AI reads a compressed knowledge graph that maps every file, every connection, every dependency, every dead-code orphan — in 0.6 seconds.

It also ships as a standalone markdown editor for Mac and Android, but the core value is the MCP server.

**One-line description:** "Give your AI a map of your codebase so it reads 3 files instead of 300."

---

## 2. The Three Products

| Product | What it is | Who it's for | Distribution |
|---------|-----------|-------------|-------------|
| **Athena MCP Server** | 19-tool MCP server for Claude Code | Developers using AI coding tools | npm: `athena-code-mcp` |
| **Markdown Viewer (Mac)** | Electron desktop app with editor, graph, mind maps | Note-takers, knowledge workers | `.app` bundle (153 MB) |
| **Markdown Viewer (Android)** | Capacitor-wrapped mobile app | Mobile note-takers | `.apk` (6.9 MB) |

The MCP server is the core product. The apps are secondary.

---

## 3. Product A: Athena MCP Server

### What it does

When a developer installs Athena, their AI coding tool gains 19 new capabilities:

**Context Management (the core)**
- `generate_context_map` — Analyzes an entire codebase and generates 7 output files: navigation guide, full map, mind map, graph JSON, 3D scene, token-budgeted chunks, and integrity fingerprint
- `read_context_map` — Reads any of the generated files
- `check_map_freshness` — Compares map age against latest git commit
- `enable_auto_mapping` — Installs a git post-commit hook for auto-updates
- `setup_repo` — One command that does everything: generates map, installs hook, updates CLAUDE.md, updates .gitignore

**Vault Operations**
- `vault_list_files` — Lists all markdown files with sizes, word counts, modification dates
- `vault_read_note` — Reads a file and auto-extracts headings, tags, links
- `vault_write_note` — Writes/overwrites a file
- `vault_create_note` — Atomic creation (refuses to overwrite existing files)
- `vault_search` — Full-text search with context snippets

**Structural Analysis**
- `generate_graph_json` — Builds a knowledge graph with hub/bridge/orphan detection
- `generate_mind_map` — Generates a Mermaid mind map from any file's headings, links, tags, tasks
- `extract_links` — Extracts wiki-links, markdown links, embeds
- `extract_headings` — Extracts document outline
- `extract_tags` — Extracts frontmatter and inline tags
- `vault_backlinks` — Finds all files that link to a given file

**Visualization**
- `generate_3d_graph_viewer` — Generates a self-contained HTML file with interactive 3D graph: rotating universe, clickable nodes, detail panel, filters, search, file summaries

**Utilities**
- `create_daily_note` — Creates a templated daily note (Tasks/Notes/Goals/Log sections)
- `publish_static_site` — Builds a searchable static HTML website from a vault

### How to install

```bash
claude mcp add -s user athena npx athena-code-mcp
```

One command. Works forever.

### How it integrates with Claude Code

After `setup_repo` is called on a repository:

1. A `.athena/` folder is created with the context map
2. A git post-commit hook auto-regenerates the map after every commit
3. CLAUDE.md is updated with instructions telling Claude to read the map at every session start
4. `.gitignore` is updated to exclude `.athena/`

From that point on, every new Claude Code session automatically:
- Reads CLAUDE.md (Claude always does this)
- Sees the instruction to check map freshness
- Calls `check_map_freshness`
- If fresh: reads the navigation guide
- If stale: regenerates, then reads
- Claude now understands the architecture before the user asks anything

**Zero ongoing user effort.**

---

## 4. Product B: Markdown Viewer Desktop App (Mac)

### Architecture

**Stack:** Electron 43 + Vite 8 + vanilla JavaScript (no React/Vue/Angular)

**Three files handle everything:**

| File | Lines | Role |
|------|-------|------|
| `electron/main.cjs` | 2,562 | Main process: native operations, file I/O, IPC, menus, windows |
| `electron/preload.cjs` | 63 | Context bridge: exposes 30 methods on `window.markdownNative` |
| `src/renderer.js` | ~8,000 | ALL UI logic: editor, preview, tabs, vault, graph, mind map, command palette |

**Supporting files:**
- `src/index.html` — App shell with all UI elements, modals, toolbars
- `src/styles.css` — All styling including responsive breakpoints
- `src/sample.md` — Default sample document

### Features Implemented

**Editor:**
- CodeMirror 6 with syntax highlighting, line numbers, folding, search, undo, wrapping
- Formatting commands: heading, bold, italic, link, code, quote, task list, table
- Keyboard shortcuts for all formatting
- Undo/Redo toolbar buttons
- Cut/Copy/Paste toolbar buttons
- Find & Replace (CodeMirror search panel)

**Preview:**
- GitHub-Flavored Markdown via Marked
- HTML sanitization via DOMPurify
- Syntax highlighting for 10 languages via highlight.js
- Mermaid diagram rendering (lazy loaded)
- KaTeX math (block and inline)
- GitHub-style alerts (note, tip, important, warning, caution)

**Multi-Tab Documents:**
- Create, switch, close document tabs
- Dirty state tracking per tab
- Window close guard for unsaved changes
- New notes have starter content with quick-start tips

**Daily Notes:**
- "Today" button creates dated note (2026-07-06.md)
- Template with Tasks, Notes, Goals, Log sections
- Switches to existing note if already created today

**Vault (Folder) Management:**
- Open any folder as a vault
- Recursive file discovery (750 file cap, 16 depth cap)
- Collapsible folder tree in sidebar
- Search across all vault files
- Create, rename, delete vault files
- Outline view (heading tree of active document)
- Backlinks view (what links to this file)

**Graph View:**
- Sidebar mini-graph (local or global scope)
- Full-screen graph modal with force-directed layout
- 2D and 3D modes
- Zoom, pan, fit-to-view, reset
- Auto-rotate in 3D mode
- Filters: folder, type, tags, orphans, unresolved, backlinks, outgoing, media, canvas
- Saved filter presets
- Search nodes
- Minimap
- Detail cards with preview popovers
- Export profiles: Navigation JSON, Claude/ChatGPT Context, Full Audit JSON, Presentation SVG, Compact Navigation, 3D Scene Map

**Mind Map:**
- Visual mind map from active note's headings, links, backlinks, tags, tasks
- Zoom, pan, reset
- Search nodes
- Copy as Claude Map / Create new Map Note / Insert Mermaid syntax

**AI Context Integration:**
- Copy AI Context Map to clipboard
- Create AI Context Map as new document
- Export profiles for Claude, ChatGPT, Gemini, Ollama

**Command Palette:**
- Cmd+K / Cmd+P to open
- Search commands and notes
- Fuzzy matching
- Quick-open recent files/vaults
- Graph commands (3D, orbit, reset, etc.)

**Global Search:**
- Cmd+Shift+F
- Searches across all vault files
- Ranked content snippets

**File Operations:**
- Open file dialog
- Save / Save As
- Export HTML (styled, sanitized)
- Export PDF (via print-to-PDF)
- Export text
- Static site publishing (full HTML site with search, backlinks, graph)
- Drag and drop file opening
- Reveal in Finder

**Autosave & Recovery:**
- Autosave drafts to userData
- Crash recovery dialog on launch
- Per-file version history with snapshot restore
- File watching for external changes
- Conflict detection on save

**Appearance:**
- Dark/light theme with persistence
- Reading time, word count, character count
- Split, editor-only, preview-only view modes

**Mobile Responsiveness:**
- Hamburger menu sidebar toggle (≤860px)
- Swipe-to-close sidebar (swipe left)
- Swipe-from-edge to open sidebar (swipe right from left edge)
- Backdrop overlay (tap to close)
- Auto-close sidebar when file selected
- Floating action button (FAB) for new note
- Touch targets ≥44px
- Safe area insets for notched devices

**Native Mac Integration:**
- macOS menus (File, Edit, Format, View, Window, Help)
- Document state (edited indicator, represented filename)
- File associations (.md, .markdown, .mdown, .mkd, .txt, .canvas)
- URL scheme: `shibanshu-markdown://`
- Recent documents in Dock menu

### Security

- `contextIsolation: true` — renderer cannot access Node.js
- `nodeIntegration: false` — no require() in renderer
- `sandbox: true` — renderer runs in Chromium sandbox
- Content Security Policy on all pages and exports
- IPC sender origin validation
- Atomic file writes (temp file + fsync + rename)
- File size limits (25 MB markdown, 40 MB HTML export)
- Trusted file/vault path tracking
- Network request blocking in PDF export

---

## 5. Product C: Markdown Viewer Mobile App (Android)

### Architecture

**Stack:** Capacitor 8 wrapping the Vite-built renderer in a native Android WebView.

**Key file:** `src/capacitor-bridge.js` — Creates a `window.markdownNative`-compatible interface using Capacitor plugins instead of Electron IPC.

**Plugins used:**
- `@capacitor/filesystem` — File read/write
- `@capacitor/preferences` — Settings and autosave persistence
- `@capacitor/share` — Export sharing
- `@capacitor/app` — Back button handling
- `@capawesome/capacitor-file-picker` — File and directory selection

### How the bridge works

The renderer resolves `native` at startup (line 82 of renderer.js):
```javascript
const native = window.markdownNative || (window.Capacitor ? createCapacitorNative() : createUnavailableNative());
```

- In Electron: `window.markdownNative` is set by preload.cjs → uses IPC
- In Capacitor: `window.Capacitor` exists → uses `createCapacitorNative()` from capacitor-bridge.js → uses Capacitor plugins
- In browser: neither exists → uses `createUnavailableNative()` → uses File System Access API

### What works on Android
- File open/save via system file picker
- Vault browsing with recursive directory scan
- Markdown editing and preview
- Theme toggle
- Autosave via Preferences
- Export + share (HTML, text)
- Back button handling (close modals → close sidebar → minimize)
- Touch gestures (swipe sidebar, FAB)

### What doesn't work on Android
- URL scheme handling
- File watching / external change detection
- Version history snapshots
- Static site publishing
- CLI features

### Build

```bash
npm run build:android    # Vite build + Capacitor sync
npm run dist:android:apk # Full APK build via Gradle
```

Requires Android Studio with SDK and Java (bundled JBR).

---

## 6. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACES                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Mac App  │  │ Android  │  │ Browser  │  │  CLI   │  │
│  │ Electron │  │ Capacitor│  │ (Vite)   │  │ (Node) │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │
│       │              │              │             │       │
│  ┌────┴──────────────┴──────────────┴─────────────┘      │
│  │         src/renderer.js (~8,000 lines)                │
│  │         All UI: editor, preview, tabs, vault,         │
│  │         graph, mind map, command palette               │
│  └────┬──────────────┬──────────────┬─────────────┐      │
│       │              │              │             │       │
│  preload.cjs    capacitor-      browser        CLI       │
│  (Electron)     bridge.js      fallback      commands    │
│       │         (Android)      (File API)       │       │
│       │              │              │             │       │
│  electron/       Capacitor       Browser      scripts/   │
│  main.cjs        plugins        APIs          *.mjs     │
└───────┼──────────────┼──────────────┼─────────────┼──────┘
        │              │              │             │
        └──────────────┴──────────────┴─────────────┘
                     File System

┌─────────────────────────────────────────────────────────┐
│                    MCP SERVER                            │
│                                                          │
│  mcp-server.mjs (19 tools)                               │
│       │                                                  │
│       ├── Context map generation                         │
│       │   └── scripts/export-claude-map.mjs (1,607 lines)│
│       │       ├── Phase 1: File discovery                │
│       │       ├── Phase 2: Metadata extraction           │
│       │       ├── Phase 3: Graph building                │
│       │       ├── Phase 4: Analysis (hubs/bridges/orphans)│
│       │       ├── Phase 5: Navigation routes             │
│       │       └── Phase 6: Output (7 files)              │
│       │                                                  │
│       ├── Vault operations (list/read/write/search)      │
│       ├── Structural analysis (graph/mindmap/links/tags) │
│       ├── Auto-mapping (git hooks + freshness checks)    │
│       ├── 3D graph viewer generation                     │
│       └── Static site publishing                         │
└─────────────────────────────────────────────────────────┘
```

---

## 7. How the Context Map Engine Works

The engine (`scripts/export-claude-map.mjs`, 1,607 lines) processes a codebase in 6 phases:

### Phase 1: File Discovery
- Walks directory tree recursively
- Skips: `.git`, `node_modules`, `dist`, `build`, `vendor`, `.next`, `.cache`, `.venv`, `target`, `coverage`
- Keeps: `.md`, `.js`, `.ts`, `.py`, `.css`, `.json`, `.yaml` and 15 other extensions
- Limits: 5,000 files max, 768 KB per file max, 24 depth max

### Phase 2: Metadata Extraction (per file)
- **Frontmatter**: YAML metadata parsing for tags, aliases
- **Headings**: All H1-H6 with text, level, line number
- **Tags**: Inline `#tag` annotations (case-insensitive, deduplicated)
- **Links**: Wiki links `[[target|alias]]`, markdown links `[text](url)`, embeds `![[file]]`, canvas edges
- **Code imports**: JS/TS `import/export/require`, Python `from/import`, CSS `@import`
- **Symbols**: JS functions/classes/variables/types, Python defs/classes (up to 80 per file)
- **Statistics**: Word count, line count, byte size

### Phase 3: Graph Building
- Resolves all links to actual file paths
- Handles: relative paths, aliases, title-based matching, index files
- Creates typed edges: `wiki-link`, `markdown-link`, `embed`, `import`, `test-coverage`
- Deduplicates edges by `source→target:kind:specifier`
- Tracks unresolved links (broken references)

### Phase 4: Analysis
- **Per-file metrics**: Incoming degree, outgoing degree, cross-cluster edge count
- **Clustering**: Groups by top-level folder (e.g., `src/`, `docs/`, `scripts/`)
- **Hub detection**: Files with highest total connection degree
- **Bridge detection**: Files with most cross-cluster connections
- **Orphan detection**: Files with zero connections
- **Symbol indexing**: Ranked by exported symbol count

### Phase 5: Navigation Route Computation
Generates 5 prioritized reading paths (up to 24 documents each):

1. **Orientation Route** — READMEs + hubs + cluster representatives. "Understand the shape."
2. **Graph Hubs & Bridges** — Most connected and most cross-cutting files.
3. **Implementation Route** — Code files ranked by imports, symbols, cross-cluster connections.
4. **Symbol & Import Route** — Entry points, exported APIs, test coverage.
5. **Risk & Cleanup Route** — Files with unresolved links + orphans over 80 words.

### Phase 6: Output (7 files)

| File | Format | Size (typical) | Purpose |
|------|--------|----------------|---------|
| `claude-context-navigation.md` | Markdown | 20-50 KB | **PRIMARY** — Claude reads this first. Routes, clusters, symbols. |
| `claude-context-map.md` | Markdown | 100-400 KB | Full detailed map with file summaries |
| `claude-context-mind-map.md` | Mermaid | 10-30 KB | Visual diagram of high-signal files |
| `claude-context-graph.json` | JSON | 200 KB-1 MB | Machine-readable graph (nodes, edges, navigation) |
| `claude-context-scene.json` | JSON | 300 KB-800 KB | 3D scene data for visualization |
| `llm-context-chunks.jsonl` | JSONL | 1-50 MB | Token-budgeted file chunks |
| `context-integrity.json` | JSON | 2 KB | Fingerprint for change detection |

---

## 8. The 19 MCP Tools — What Each Does

### Context Management

| Tool | Input | Output | When to use |
|------|-------|--------|-------------|
| `setup_repo` | repo path | 4-step result | First time setup — does everything |
| `generate_context_map` | repo path, options | 7 output files | Manual regeneration |
| `read_context_map` | repo path, file type | file content | Read navigation/map/graph/mind-map |
| `check_map_freshness` | repo path | fresh/stale/missing | Before using stale data |
| `enable_auto_mapping` | repo path | hook installed | Add git hook for auto-updates |

### Vault Operations

| Tool | Input | Output | When to use |
|------|-------|--------|-------------|
| `vault_list_files` | folder path | files with metadata | Survey a project |
| `vault_read_note` | file path | content + headings + tags + links | Read with structure |
| `vault_write_note` | path + content | confirmation | Update a file |
| `vault_create_note` | path + content | confirmation (fails if exists) | Safe creation |
| `vault_search` | folder + query | matches with snippets | Find content |

### Structural Analysis

| Tool | Input | Output | When to use |
|------|-------|--------|-------------|
| `generate_graph_json` | folder path | nodes, edges, hubs, orphans | Quick graph without full map |
| `generate_mind_map` | file path | Mermaid syntax | Visualize one file's structure |
| `extract_links` | file path | links array | See what a file references |
| `extract_headings` | file path | headings array | See document outline |
| `extract_tags` | file path | tags array | See file metadata |
| `vault_backlinks` | vault + file | backlinks array | "What depends on this file?" |

### Visualization & Utilities

| Tool | Input | Output | When to use |
|------|-------|--------|-------------|
| `generate_3d_graph_viewer` | folder path | self-contained HTML | Visual demo, exploration |
| `create_daily_note` | vault path, date | created note | Daily journaling |
| `publish_static_site` | vault path, output | HTML site | Share vault as website |

---

## 9. The 3D Graph Viewer

The `generate_3d_graph_viewer` tool produces a self-contained HTML file (~150-200 KB) that opens in any browser. No server needed.

**Rendering:** Canvas 2D with perspective projection (not WebGL). 60fps animation loop.

**Features:**
- Slow auto-rotation (orbit)
- Drag to manually orbit (3D rotation)
- Scroll to zoom (clamped 0.25x-4x)
- Click node → detail panel (path, type, words, degree, headings, symbols, incoming/outgoing edges, summary)
- Click edge in panel → navigates to connected node
- Double-click → zoom to node
- Filters: All, Hubs, Orphans
- Search by filename
- Hover tooltip with file summary

**Visual design:**
- Black space background with nebula gradients
- Twinkling stars (250+)
- Sphere-shaded nodes with specular highlights and rim lighting
- Node size based on word count + connection degree
- Hub nodes have multi-layer corona glow + dashed orbit ellipses
- Curved bezier edges with energy particles flowing along them (4-point trails)
- Color-coded clusters (src=teal, docs=purple, services=blue, scripts=gold, etc.)
- Label pills with background + border, visible on hubs or when zoomed

**Force-directed layout:** 180 iterations of repulsion + attraction + center gravity + damping for clean node spacing.

---

## 10. How Auto-Mapping Works

After `setup_repo` or `enable_auto_mapping`:

```
Developer commits code
    ↓
Git post-commit hook fires (background, <1 second)
    ↓
export-claude-map.mjs regenerates .athena/ files
    ↓
Next Claude Code session:
    ↓
CLAUDE.md says "check freshness"
    ↓
check_map_freshness compares map mtime vs git log -1 time
    ↓
Fresh? → Read navigation guide
Stale? → Regenerate → Read navigation guide
    ↓
Claude understands architecture. Zero user effort.
```

---

## 11. How CLAUDE.md Integration Works

`setup_repo` adds this block to CLAUDE.md (between marker comments so it can be updated):

```markdown
## Context Map (auto-generated)

This repo has an auto-updating context map at `.athena/`.

**At the start of every session**, use the `check_map_freshness` tool
to verify the map is current, then use `read_context_map` with
`file: "navigation"` to understand the repo structure before making changes.
```

Claude Code reads CLAUDE.md at every session start. This instruction causes Claude to automatically use the Athena MCP tools without the user asking.

---

## 12. The CLI

`bin/shibanshu-markdown.mjs` provides commands:

| Command | What it does |
|---------|-------------|
| `context <folder>` | Generate context maps |
| `publish <folder>` | Build static HTML site |
| `new` | Open app with new note |
| `create-note <path>` | Atomically create a file |
| `open [files...]` | Open files in the app |
| `search <query>` | Open search in app |
| `graph` | Open graph view |
| `mind-map` | Open mind map |
| `command-palette` | Open command palette |
| `url <action>` | Build shibanshu-markdown:// URLs |

---

## 13. Build & Distribution Pipeline

### Mac

```bash
npm run dist:mac:arm64
```

Pipeline: validate syntax → generate icons → Vite build → electron-builder → ad-hoc sign → ZIP → checksums → verify → release readiness → download page.

Output: `release/mac-arm64/Shibanshu Markdown Viewer.app` (454 MB uncompressed, 153 MB ZIP)

### Android

```bash
npm run dist:android:apk
```

Pipeline: Vite build → Capacitor sync → Gradle assembleDebug.

Output: `release/shibanshu-markdown-viewer-0.1.0-debug.apk` (6.9 MB)

### npm (MCP Server)

```bash
cd packages/mcp-server && npm publish
```

Package: `athena-code-mcp` (38.9 KB tarball, 157.7 KB unpacked). Contains: `mcp-server.mjs`, `export-context.mjs`, `README.md`, `package.json`.

---

## 14. Testing Infrastructure

| Script | What it tests |
|--------|-------------|
| `validate-syntax.mjs` | Node --check on all 133 JS files |
| `smoke-check.mjs` | 34 KB test — verifies all features exist and pass basic checks |
| `stress-check.mjs` | Extreme synthetic vault/repo stress testing |
| `browser-ui-smoke.mjs` | Headless Playwright browser UI tests |
| `e2e-electron.mjs` | Electron launch and interaction tests |
| `mcp-safety-check.mjs` | MCP server tool validation |

---

## 15. Security Model

- Electron sandbox enabled (contextIsolation + sandbox + no nodeIntegration)
- Content Security Policy on all pages
- IPC sender origin validation
- Atomic file writes with fsync
- File size limits on all operations
- Trusted path tracking (files/vaults the user explicitly opened)
- Network blocking in PDF export (prevents data exfiltration)
- MCP server: path traversal prevention, null byte rejection, vault escape prevention

---

## 16. File Structure (179 files, 9 clusters)

| Cluster | Files | Words | Key files |
|---------|-------|-------|-----------|
| `android/` | 109 | 233,160 | Capacitor-built APK assets (bundled JS/CSS) |
| `docs/` | 26 | 47,873 | Marketing ads, roadmaps, plans, privacy policy |
| `scripts/` | 18 | 27,297 | Build, test, deploy, export scripts |
| `/` (root) | 10 | 30,075 | package.json, mcp-server.mjs, README, config |
| `packages/` | 5 | 14,399 | Standalone npm package for MCP server |
| `src/` | 5 | 25,908 | Renderer, styles, HTML, bridge, sample |
| `skills/` | 3 | 1,001 | LLM skill definition + workflows |
| `electron/` | 2 | 8,050 | Main process + preload |
| `bin/` | 1 | 1,192 | CLI entrypoint |

---

## 17. Benchmarks (Real, Tested)

### Context Compression (tested on real repos)

| Repo | Files | Raw tokens | Athena tokens | Compression | Monthly savings (Sonnet) |
|------|-------|-----------|--------------|-------------|------------------------|
| Small docs (10 files) | 10 | 14,738 | 1,750 | 8.4:1 | $14 |
| This repo (42 source) | 42 | 234,958 | 5,845 | 40:1 | $333 |
| Medium (200 files) | 200 | 1,057,310 | 14,613 | 72:1 | $1,032 |
| resourceai-in (924 files) | 924 | 2,359,465 | 10,812 | **218:1** | **$2,325** |

### MCP Tool Functional Tests

All 19 tools pass. Tested via MCP SDK client with real repos.

### Context Map Generation Time

| Repo size | Time |
|-----------|------|
| 10 files | 0.1s |
| 175 files | 0.4s |
| 350 files | 0.6s |
| 924 files | 0.6s |

---

## 18. What This Solves (The 12 Problems)

1. **Wrong AI output** — Claude reads the wrong files because it has no map. Athena gives it the map.
2. **Too many files for AI** — 200+ file repos exceed the context window. Athena compresses 218:1.
3. **Cost per run** — $3-35 per exploration wasted on file reading. Athena: $0.03.
4. **Repeated context every session** — CLAUDE.md + auto-mapping eliminates re-explaining.
5. **Refactoring fear** — `vault_backlinks` shows every dependency before you change anything.
6. **Dead code** — Orphan detection finds files with zero connections.
7. **Onboarding time** — 2 weeks for a human to understand a codebase → 0.6 seconds for AI.
8. **Code review quality** — Hub analysis identifies which changed files are critical.
9. **Security blind spots** — Graph shows which files are in sensitive clusters (auth, payments).
10. **Documentation rot** — Unresolved link detection finds docs pointing to deleted files.
11. **AI tool switching cost** — Context map is tool-agnostic. Any MCP client reads the same map.
12. **No architectural awareness** — Every other AI tool treats files as equal. Athena knows which ones matter.

---

## 19. What This Doesn't Solve (Honest Limitations)

- **Simple bug fixes** — For "fix the typo on line 47," Athena adds overhead. Claude's built-in grep is faster.
- **Small repos (<50 files)** — Claude can read these raw. Athena is overkill.
- **Content understanding** — The map gives structure, not semantics. Claude still needs to read files for content-level questions.
- **Real-time collaboration** — No sync between devices. Local-only.
- **Competing with Obsidian** — The notes app cannot match Obsidian's plugin ecosystem and 5-year head start.
- **WebGL-quality 3D** — The graph viewer uses Canvas 2D with perspective projection. It's not Three.js.

---

## 20. Roadmap

### Near-term (1-3 months)
- Publish `athena-code-mcp` to npm ✓
- Push to GitHub ✓
- Submit to MCP Server Directory
- Launch on Reddit r/ClaudeAI, Hacker News, Twitter
- Build GitHub Action for CI/CD context map generation

### Medium-term (3-6 months)
- Paid tier: codebase health dashboard (complexity trends, dead code tracking over time)
- VS Code extension showing knowledge graph inline
- WebGL-based 3D graph viewer (Three.js)
- Cross-device sync for the notes app

### Long-term (6-12 months)
- Team features: shared context maps, CI/CD integration
- Enterprise: SSO, audit logs, private deployment
- Multi-repo graph (map dependencies across repositories)
- AI-generated file summaries in the context map

---

*This document covers the complete Athena system: 179 files, 9 clusters, 19 MCP tools, 3 product surfaces, tested on repos up to 924 files with 218:1 proven compression.*
