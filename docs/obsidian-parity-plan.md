# Obsidian Feature-Parity Plan

This is the free, end-to-end feature gap-closing plan against Obsidian-style capability, based on current public Obsidian feature pages:

- Canvas: https://obsidian.md/canvas
- Sync: https://obsidian.md/sync
- Publish: https://obsidian.md/publish

The goal is feature equivalence for Shibanshu Markdown Viewer, not copying Obsidian branding, UI, text, or proprietary implementation. Every feature in this plan is targeted as free to use, with no built-in paywall, forced account, or pricing layer.

## Feature Inventory To Match For Free

The feature set to close includes:

- Fast Markdown writing with source/preview modes, formatting commands, shortcuts, and recovery.
- Local-first vaults and files.
- Backlinks, graph view, hover previews, and full-text search.
- Canvas as an infinite space for notes, media, PDFs, webpages, nested canvases, groups, and connections.
- Mind maps generated from notes, folders, links, and headings.
- End-to-end encrypted sync through user-owned or self-hosted storage.
- Static publishing with themes, search, graph, backlinks, SEO, and mobile layout.
- Plugin and theme ecosystem.
- Web clipper, command line workflows, and developer API.
- Optional AI maps for Claude, OpenAI, Gemini, local Ollama, and custom OpenAI-compatible endpoints.

## Parity Plan 0: Writing Core

Goal: make the app comfortable as a daily Markdown writing surface, not only a viewer.

Current shipped slice:

- CodeMirror powers the editor with Markdown highlighting, line numbers, folding, search panel support, line wrapping, undo history, and stable document-state updates.
- Split, editor-only, and preview-only modes are available.
- The app autosaves dirty documents locally and offers startup recovery after crashes.
- Formatting commands cover heading, bold, italic, link, inline code, block quote, task list, and table insertion.
- Formatting is reachable from compact toolbar controls, editor shortcuts, the command palette, and a native Format menu.

Tasks:

- Add Markdown-aware autocomplete for links, headings, tags, and file paths.
- Add slash commands for common blocks and embeds.
- Add properties/frontmatter editing with typed fields.
- Add footnote, callout, embed, and comment commands.
- Add custom find/replace UI with replace-all and selection-scoped replace.
- Add large-file mode with parsing and rendering budgets.

Acceptance checks:

- A writer can create, format, preview, save, recover, and reopen Markdown notes without leaving the keyboard.
- Formatting commands update the CodeMirror document, live preview, dirty state, autosave, and undo history through one path.
- No writing feature requires an account, network call, or paid tier.

## Parity Plan 1: Local Vault

Goal: make a folder of Markdown files the primary unit of work.

Current shipped slice:

- A local folder can be opened as a vault.
- Markdown and text files are discovered recursively with limits and heavy directories ignored.
- The app builds an in-memory index for sidebar files, content search, headings, tags, wiki links, Markdown links, backlinks, graph edges, unresolved links, and AI context maps.
- A global search panel searches open files or the active vault with ranked snippets and click-to-open note navigation.
- Vault files can be created, renamed or moved by path, and moved to the OS Trash from the sidebar or command palette without granting arbitrary filesystem access.
- The vault sidebar renders a collapsible folder tree with persisted expansion state, search-aware expansion, and active-file reveal.
- Quick-open can switch open notes and reopen recent files or recent vaults through a native recent-item store keyed by opaque ids, not arbitrary renderer-provided paths.

Tasks:

- Expand Open Vault/Open Folder into a durable workspace model.
- Index Markdown, text, image, PDF, audio, and video metadata.
- Track wiki links, Markdown links, headings, tags, aliases, frontmatter, embeds, and backlinks.
- Store an index in a local SQLite database or compact JSON index under app data.
- Add vault settings, pinned recent vaults, missing-path cleanup, and per-vault preferences.
- Expand the tree with folder operations and drag/drop moves.

Acceptance checks:

- A folder can be opened as a vault.
- Links and backlinks are indexed without modifying user files.
- Search and graph use the same index.
- No vault feature requires payment or account creation.

## Parity Plan 2: Graph View

Goal: show the map of note relationships.

Current shipped slice:

- The vault sidebar renders an offline SVG note graph from resolved wiki links and Markdown links.
- Local graph scope shows the active note plus directly connected notes.
- Global graph scope shows all indexed vault notes.
- The full graph map opens as a larger force-directed surface with local/global scope, graph search, pan, zoom, and a node list.
- Large graphs are capped in renderers for responsiveness while searched nodes are preferred and the full graph remains in memory and export outputs.
- Full graph filters can narrow the map by folder, file type, tags, orphans, unresolved links, backlinks to the active note, outgoing links from the active note, media/attachment references, and canvas references.
- Hovering or focusing graph and mind-map nodes updates a local detail inspector with source context, full graph nodes show bounded rendered Markdown preview popovers, and graph/mind-map source anchors jump back to exact editor lines.
- Full graph supports local-depth expansion, saved filter presets, visible zoom percentage, fit-to-view, minimap recentering, keyboard roving focus, and profile-based JSON/SVG/Markdown context export for navigation, Claude/ChatGPT context, audits, and presentation output.
- Full graph detail cards can open a note, focus that node as the center of a local graph, or expand the local neighborhood around that node, which helps search results stay navigable when global rendering is capped.
- JSON Canvas files are discovered as vault files, previewed as readable card/connection summaries, and indexed into the graph through file-card links, text-card links, and Canvas connection edges.
- Graph nodes can be clicked or keyboard-opened to navigate notes.
- The same graph data feeds the AI context map, so graph, backlinks, and AI export do not diverge.
- Repo-scale context export adds typed Markdown/wiki/embed/import/test-coverage edges, frontmatter aliases, code symbols, local imports, and JSONL chunks for model-assisted navigation of large repositories.

Tasks:

- Extract actual graph edges from tags, attachments, and media references.
- Add saved graph layout sessions and preview-to-preview backlink stacks.

Implementation route:

- Start with `d3-force` and SVG/canvas rendering.
- Move to WebGL only if very large vaults need it.
- Keep graph data separate from visual layout so it can power AI maps and Publish later.

Acceptance checks:

- Opening a vault shows connected notes as nodes and links as edges.
- Clicking a node opens that file.
- Filters update the graph without reindexing the whole vault.
- Graph view works fully offline.

## Parity Plan 3: Canvas And Mind Map

Goal: build an infinite visual thinking board.

Current shipped slice:

- The active note can open as a visual mind-map canvas built from headings, outgoing links, backlinks, tags, and task list items.
- The mind-map canvas supports search, pan, zoom, reset, keyboard-openable nodes, source-anchor detail cards, and click-to-open navigation for source headings or linked vault notes.
- The same local note data can be copied as Claude-ready Markdown context or created as a new map note without an account, API key, network request, or pricing layer.
- The older Mermaid insertion command remains available for embedding an editable generated mind map back into Markdown.
- Mermaid `mindmap` preview blocks render through the app's readable local SVG preview instead of the default Mermaid dark-mode output.
- JSON Canvas files can be opened and previewed locally as card and connection summaries while their file cards and connection edges feed the vault graph.

Tasks:

- Support the open JSON Canvas file format for durable local storage.
- Add cards: text, Markdown file, image/video/audio/PDF, webpage, and nested canvas.
- Add edges with labels, colors, directions, and editable endpoints.
- Add groups with colors, names, resize, nest, and select behavior.
- Add pan, zoom, zoom-to-fit, zoom-to-selection, drag selection, duplicate, align, distribute, snap-to-grid, and axis-locked movement.
- Add create flows: toolbar, double click, right click, paste text, paste URL, drag note from vault, bulk create from folder.
- Add export visible canvas and entire canvas to PNG/SVG/PDF.

Mind-map layer:

- Add a one-click "Mind Map From Note" command that turns headings into a tree.
- Add "Mind Map From Folder" to build a map from files, links, and headings.
- Add radial, tree, timeline, and freeform layouts.
- Keep generated maps editable as normal canvas files.

Implementation route:

- Store `.canvas` files using JSON Canvas-compatible nodes and edges.
- Use a dedicated canvas engine after the editor is stable. Candidate routes are a React canvas layer with tldraw/React Flow, or a custom vanilla canvas/SVG layer if we keep the current no-framework renderer.
- Build the data model first: cards, edges, groups, viewport, selection, commands, undo/redo.

Acceptance checks:

- A user can create a canvas, add note cards, connect them, pan/zoom, save, reopen, and export it.
- A Markdown outline can become an inspectable visual mind map.
- Canvas files remain local and readable as JSON.
- Mind map and canvas features are available without a subscription or cloud service.

## Parity Plan 4: Publish

Goal: publish a vault or selected notes as a fast website without requiring a paid hosted service.

Current shipped slice:

- The open vault can be exported as a local static website from the toolbar, command palette, and native File menu.
- The generated site includes an index page, one HTML page per note, responsive styling, note search data, backlinks, outgoing note links, and `assets/graph.json`.
- Wiki links and local Markdown links are rewritten to static note-page links when the target exists in the exported vault.
- The native writer validates routes, caps file count and total output size, and writes only inside the output folder selected by the user.

Tasks:

- Add reusable publish profiles.
- Expand the exported graph into a richer interactive graph view on every page.
- Support hover previews, stacked-page navigation, themes, SEO metadata, and custom metadata.
- Add custom domain instructions and free deploy targets where possible.
- Add password protection for self-hosted deployments when the selected target supports it.
- Add optional analytics snippets with clear consent.

Implementation route:

- Phase 1: export static HTML folder locally.
- Phase 2: deploy to GitHub Pages, Netlify, Vercel, or Cloudflare Pages.
- Phase 3: add a self-hostable publish server for auth, domains, password protection, and team workflows.

Acceptance checks:

- A vault exports to a website that can be opened locally.
- Search, backlinks, and graph work in the exported site.
- A publish profile can be reused.
- Local static publishing works with no account and no cost.

## Parity Plan 5: Sync And Collaboration

Goal: synchronize vaults safely without breaking local-first trust.

Current shipped slice:

- Dirty documents are saved to a local app-data autosave draft store with a startup recovery dialog.
- Drafts are atomic local files and are not uploaded or sent to any account-backed service.
- Saved notes create capped local version-history snapshots in app data.
- A saved snapshot can be restored into the active document as unsaved changes, so the user can review before overwriting the disk file.

Tasks:

- Expand local snapshots with diff previews, deletion recovery, and retention controls.
- Add device identity and encrypted vault manifests.
- Add end-to-end encrypted sync with per-file chunks, tombstones, conflict records, and merge strategy.
- Add selective sync for folders and media types.
- Add shared vault permissions and activity log.

Implementation route:

- Phase 1: local version history and file recovery.
- Phase 2: user-provided storage adapters such as iCloud Drive, Dropbox folder, Git remote, or S3-compatible storage.
- Phase 3: self-hostable sync server with accounts, sharing, audit log, and E2EE.

Acceptance checks:

- Users can restore an older version of a note.
- Conflicts create readable conflict copies instead of overwriting data.
- Sync storage cannot read plaintext notes.
- Sync can run through user-owned or self-hosted infrastructure without app pricing.

## Parity Plan 6: Plugins, Themes, And Developer API

Goal: make the app extensible without sacrificing safety.

Tasks:

- Add theme packages with CSS variables and previews.
- Add snippets per vault.
- Add a plugin manifest format with permissions.
- Add APIs for commands, editor extensions, vault indexing, graph extensions, canvas extensions, and export hooks.
- Add a plugin sandbox and permission prompts.
- Add plugin signing or trusted local development mode.

Acceptance checks:

- Themes can be installed and switched without app restart.
- Plugins must declare permissions before reading files or calling network APIs.
- A sample plugin can add a command and a preview panel.
- Theme and plugin installation is not paywalled.

## Parity Plan 7: Automation, URL Scheme, And Native Identity

Goal: make the app easy to launch from macOS, scripts, browser workflows, and other tools without weakening file safety.

Current shipped slice:

- The packaged app declares a custom icon and no longer relies on the default Electron icon.
- The app declares and registers `shibanshu-markdown://`.
- Safe URL commands can create an unsaved note, open search, open file/folder pickers, command palette, graph, and mind map.
- URL commands never read arbitrary local file paths; disk access still requires an OS file-open event, drag/drop, or explicit dialog.
- The `shibanshu-markdown` CLI can export Claude/OpenAI-ready context maps, publish static sites without launching the GUI, save/reuse publish profiles, create notes atomically, open URL-scheme commands, and hand files to the OS app association.
- CLI note creation refuses to overwrite existing files unless `--force` is passed.
- Native `Cmd/Ctrl+P` quick-open can reopen recent files and vaults without exposing arbitrary path reads to the renderer.

Tasks:

- Add deploy targets for GitHub Pages, Gist, and self-hosted static folders.
- Add URL commands for selecting an existing vault by stable vault id after the vault is explicitly trusted.
- Add web clipper workflows that create unsaved notes or ask for a destination vault.
- Add Shortcuts/App Intents support for create note, search vault, export PDF, and publish static site.
- Add pinned recent vaults, stale recent cleanup, and Finder services.

Acceptance checks:

- Automation can create and search notes without using private APIs.
- Automation cannot bypass trusted path checks.
- URL and CLI commands are documented and covered by smoke checks.

## Parity Plan 8: Claude, OpenAI, And Local AI Maps

Goal: add AI as an optional local-first assistant, not as a hidden data leak.

Current shipped slice:

- A vault-level AI context map can be copied to the clipboard or created as a Markdown note.
- The map includes active note context, headings, tags, word counts, resolved links, backlinks, unresolved links, and excerpts.
- A repo-scale command-line add-on writes `.shibanshu/claude-context-map.md`, `.shibanshu/claude-context-mind-map.md`, and `.shibanshu/claude-context-graph.json` for large folders.
- The output is provider-neutral and can be pasted into Claude, OpenAI, Gemini, Ollama, or any local model.
- No API key, account, network request, pricing layer, or telemetry is involved.

Tasks:

- Add provider abstraction: Anthropic Claude, OpenAI, Google Gemini, local Ollama, and custom OpenAI-compatible endpoints.
- Store API keys in macOS Keychain, never localStorage.
- Add per-vault AI consent: disabled by default, selected notes only, or whole-vault indexing.
- Add "AI Map" commands:
  - Summarize current note into a concept map.
  - Turn a folder into a mind map.
  - Find missing links between notes.
  - Generate tags, aliases, and backlinks.
  - Explain a canvas and suggest new connections.
  - Build a research map from selected notes.
- Add model-specific context packers so Claude, OpenAI, and local models receive clean Markdown, backlinks, headings, and graph context.
- Add citation anchors back to source files and headings.

Acceptance checks:

- No note leaves the machine unless the user explicitly runs an AI command.
- Provider switching does not change the app's internal document model.
- AI-generated maps are editable canvas files with source references.
- AI features can use user-provided keys or local models without app-side pricing.

## Build Order

1. Finish data safety, editor, and vault indexing.
2. Build backlinks and graph view from the vault index.
3. Build JSON Canvas and mind-map generation on top of the same graph/index data.
4. Add static Publish export.
5. Add local version history before hosted Sync.
6. Add plugins/themes after the core APIs are stable.
7. Add AI provider maps after vault, graph, and canvas data models exist.
