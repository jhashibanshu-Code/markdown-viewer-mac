# Free Professional Markdown App Roadmap

This document turns the audit into the product end goal. Each phase is its own plan with scope, tasks, and acceptance checks so the app can be improved without losing control of the work.

## End Goal

Shibanshu Markdown Viewer should become a trusted free macOS Markdown writing app: safe with user files, fast on real documents, accessible from keyboard and assistive tech, native-feeling on macOS, secure with untrusted Markdown, and strong enough for daily project work. No feature in this roadmap is planned as a paid gate.

## Plan 1: Data Safety And File Correctness

Goal: make the app hard to lose work in.

Tasks:

- Guard window close and app quit when any document is dirty.
- Set native macOS edited state and represented filename.
- Save files atomically through temp-file-plus-rename.
- Track filesystem metadata for opened and saved documents.
- Detect external disk changes before overwriting a file.
- Watch open files and warn or reload when they change on disk.
- Add crash-safe autosave drafts and a recovery screen.
- Add conflict flows: reload, overwrite, save copy, or cancel.

Current shipped slice:

- Dirty documents are autosaved through validated IPC into an app-data draft store with document and byte limits.
- The app reads the draft store on startup and shows a recovery dialog that can restore matching tabs or discard drafts.
- Autosave drafts are written atomically and cleared when no dirty documents remain.
- Saved files create capped local version-history snapshots in app data, and snapshots can be restored into the current document as unsaved changes before writing to disk.

Acceptance checks:

- Closing the window with dirty documents asks before discarding work.
- Saving does not corrupt the target file if a write fails midway.
- A file changed by another editor is not silently overwritten.
- A clean open file reloads when the disk version changes.
- A dirty open file warns about the conflict instead of replacing edits.
- Unsaved dirty work can be restored after an app crash.
- A previous saved version can be restored without a cloud account or paid service.

## Plan 2: Security And Native Bridge Hardening

Goal: keep untrusted Markdown and renderer code away from privileged native power.

Tasks:

- Validate every IPC sender before handling native requests.
- Validate IPC payload shape, size, and path authorization.
- Keep dialog-granted read/write paths separate from arbitrary renderer paths.
- Export from canonical Markdown instead of trusting renderer HTML.
- Add a strict content security policy to exported HTML/PDF content.
- Block remote and local file resource loading by default during export.
- Add malicious Markdown tests for scripts, event handlers, javascript URLs, SVG, and remote tracking images.

Acceptance checks:

- IPC calls from non-app origins are rejected.
- Oversized or malformed save/export payloads are rejected.
- Exported content cannot run scripts or fetch remote resources by default.
- Security regressions fail tests.

## Plan 3: Professional Editor Core

Goal: replace the basic textarea with a real Markdown editing surface.

Current shipped slice:

- CodeMirror 6 is now the editor foundation.
- Markdown syntax highlighting, line numbers, undo history, folding, search panel support, line wrapping, and app keyboard shortcuts are wired into the editor.
- The app document model, save flow, live preview, scroll sync, and mind map insertion now use the CodeMirror document.
- A command palette connects common app actions and note switching to a keyboard-first workflow.
- Markdown formatting commands now cover heading, bold, italic, link, inline code, block quote, task list, and table insertion through toolbar buttons, editor shortcuts, the command palette, and the native Format menu.

Tasks:

- Expand the CodeMirror foundation into a full professional editing workflow.
- Add bracket pairing refinements, Markdown-aware autocomplete, snippets, and smarter indentation.
- Add custom find/replace controls and keyboard shortcuts on top of CodeMirror's search panel.
- Add richer Markdown commands for callouts, footnotes, properties/frontmatter, embeds, comments, and link completion.
- Add source-map-friendly rendering hooks for better scroll sync.
- Add large-file mode and worker-based parsing budgets.

Acceptance checks:

- Editing feels precise and stable on large Markdown files.
- Common Markdown commands work from keyboard and toolbar.
- Find/replace works inside the editor.
- Rendering remains responsive under large files.

## Plan 4: Workspace, Library, And Navigation

Goal: turn the app from a single-file viewer into a project writing tool.

Current shipped slice:

- Open Folder loads a local Markdown vault with safe recursive discovery limits.
- The sidebar shows vault files as a collapsible folder tree, filters by file/content search, displays the current document outline, and resolves basic wiki/Markdown backlinks from the shared in-memory index.
- A global search modal searches open documents or the active vault with ranked snippets and click-to-open navigation.
- The sidebar can create vault files, rename or move the active vault file by path, and move the active vault file to the OS Trash through a vault-contained native bridge.
- The sidebar renders a free offline note graph with local/global scope and click-to-open nodes.
- The graph can open into a full map surface with local/global scope, force-directed layout, search, zoom, pan, and click-to-open navigation.
- The full graph now includes folder/type/tag/orphan/unresolved/backlink/outgoing/media/canvas filters plus hover/focus detail cards and rendered preview popovers with bounded Markdown snippets, source-line anchors, note degree, folder, type, tags, unresolved count, media/canvas flags, and excerpts.
- The full graph includes local-depth control, saved filter presets, visible zoom percentage, fit-to-view, minimap recentering, keyboard roving focus, detail-card neighborhood expansion, and profile-based JSON/SVG/Markdown context export for navigation, Claude/ChatGPT context, audits, and presentation output.
- The app can copy or create a free AI context map from vault headings, tags, links, backlinks, unresolved links, and excerpts for Claude, OpenAI, Gemini, Ollama, or local models.
- The active note can open as a visual mind-map canvas with headings, links, backlinks, tags, tasks, search, zoom, pan, click-to-open source navigation, hover/focus detail cards with source anchors, and Claude-ready map export.
- A repo-scale `context:claude` add-on exports `.shibanshu/claude-context-map.md`, `.shibanshu/claude-context-mind-map.md`, `.shibanshu/claude-context-graph.json`, and `.shibanshu/llm-context-chunks.jsonl` from large Markdown vaults or code repos without a network call.
- Repo context export includes typed Markdown/wiki/embed/Canvas/import/test-coverage edges, frontmatter aliases, code symbols, local imports, route guidance, and budget-aware JSONL chunks for Claude, OpenAI, ChatGPT, and local model workflows.
- Large in-app graphs are capped for UI responsiveness while search-preferred nodes are brought into the rendered graph, detail-card Focus can make any visible/search result the local graph center, and the full index remains available to exporters.
- Sidebar file, outline, and backlink clicks navigate the existing tabs/editor without requiring accounts or cloud services.
- The command palette now doubles as quick-open: `Cmd/Ctrl+P` can switch open documents and reopen recent files or vaults through native ids stored only after user-approved open/save flows.

Tasks:

- Expand Open Folder into a full persistent workspace model.
- Expand the collapsible file tree with drag/drop move and folder operations.
- Expand recent documents/workspaces into pinned favorites, missing-path cleanup, and richer workspace metadata.
- Add global search across a workspace.
- Add saved graph/canvas layout state for repeat navigation sessions.
- Add model-specific AI map presets and chunk budgets while keeping notes local until the user explicitly copies or sends context.
- Expand the mind-map canvas into saved JSON Canvas files with editable cards and durable layout.
- Add multi-file rename, move, delete, and reveal actions.
- Restore workspace state across launches.
- Add outline/table of contents from document headings.
- Add preview-to-preview backlink stacks and source-synced scroll markers.

Acceptance checks:

- A folder of Markdown files can be opened and navigated.
- Search finds matches across the workspace.
- The outline jumps to headings reliably.
- Reopening the app restores the previous workspace.

## Plan 5: Preview And Export System

Goal: make reading and sharing output professional.

Tasks:

- Build export from Markdown source through a controlled renderer.
- Add export profiles for PDF, HTML, DOCX, ePub, and rich-copy.
- Add PDF page size, margins, headers, footers, and print preview.
- Add self-contained HTML export with bundled assets.
- Add export themes.
- Add preview search, anchor copying, and better heading links.
- Add image paste/drop workflows and attachment folders.

Acceptance checks:

- PDF/HTML exports match preview styling predictably.
- Export options are visible before writing the output file.
- Exported HTML can be shared as a self-contained artifact.
- Rich copy preserves headings, code, links, and lists.

## Plan 6: UX, Accessibility, And Native Mac Polish

Goal: make the app feel calm, native, and usable by keyboard.

Current shipped slice:

- The packaged macOS app uses a generated custom `build/icon.icns` instead of Electron's default icon.
- The app registers the `shibanshu-markdown://` URL scheme for safe automation commands: create an unsaved note, open search, open file/folder dialogs, command palette, graph, and mind map.
- URL commands are parsed in the main process, capped by size, and sent to the renderer as structured commands; they do not grant arbitrary path reads.
- The `shibanshu-markdown` CLI can export AI context maps, publish static sites without launching the GUI, save/reuse publish profiles, create notes atomically, open URL commands, and hand files to the OS app association.
- CLI note creation protects existing files unless `--force` is explicitly provided.
- The development build is ad-hoc signed after packaging, and signing verification is part of the local build path.

Tasks:

- Add visible focus states to every interactive control.
- Fix tabs to use accessible tab and close-button patterns.
- Add keyboard navigation for tabs and view controls.
- Disable unavailable actions and expose disabled states.
- Add polished empty states for new documents and previews.
- Reduce web-app chrome and move toward a compact macOS toolbar.
- Add Preferences, Recent Documents, Help, Print, Share, and standard menu items.
- Add hardened runtime, notarization, updater, Preferences, Help, Print, Share, and deeper macOS menu polish.

Acceptance checks:

- Keyboard users can see focus and move across controls.
- Tabs expose correct roles and labels to assistive tech.
- Buttons that cannot work are disabled.
- The app launches as a signed/notarized macOS app before public release.
- Native polish is available in the free app, not held behind a license.

## Plan 7: Differentiators

Goal: add reasons to choose this app beyond commodity Markdown viewing.

Current shipped slice:

- Static publish exports the open vault to a local website with note pages, search data, backlinks, graph JSON, and responsive styling.
- The CLI can publish any Markdown folder to the same local static-site format for automation and large-vault workflows, with reusable profiles stored in the vault.
- The export is free, local, and accountless; no pricing, paywall, or hosted dependency is introduced.

Tasks:

- Add local-only writing insights and document quality checks.
- Add Git status, diff, and commit/export workflows.
- Add publish flows for GitHub, Gist, and one-click static redeploy.
- Add writing goals, deadlines, and session statistics.
- Add themes and a small plugin API after the core is stable.
- Add optional sync only after local durability is excellent.

Acceptance checks:

- Differentiators do not weaken local privacy or file safety.
- Advanced free features build on the stable editor/workspace foundation.
- Advanced features are optional and do not clutter basic writing.
