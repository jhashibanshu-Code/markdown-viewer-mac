# Mega Stress Test And Premium Gap Plan

This plan turns the audit findings into concrete implementation and verification tracks. Every track must stay free, offline-capable, and local-first.

## Plan 1: Extreme Test Gates

Goal: catch disconnected controls, broken scripts, unsafe paths, graph regressions, and packaging mistakes before release.

Current shipped slice:

- `npm run validate:syntax` checks every project JavaScript file.
- `npm run stress` builds icons/renderer and runs an extreme synthetic vault/repo test.
- Stress fixtures include dense Markdown links, duplicate basenames, Unicode paths, CRLF files, tasks, tags, XSS payloads, unresolved links, large skipped files, code/config files, static publish, profiles, CLI commands, release manifest generation, and download page generation.

Next tasks:

- Add pure helper tests after extracting graph/link parsers from renderer bootstrap code.
- Add mocked Electron IPC tests for sender validation, trusted vault paths, symlink escapes, and export limits.
- Add browser tests that iterate every button and assert a visible state change, native mock call, or explicit disabled reason.
- Add command parity tests across native menus, command palette, toolbar, URL scheme, and CLI.

Acceptance checks:

- Broken syntax cannot reach smoke tests.
- Every toolbar button and command-palette action is connected or intentionally disabled.
- Large graph search can find nodes outside the render cap.
- Unsafe Markdown and static publish payloads are sanitized.

## Plan 2: Large Repository Context And Mind Maps

Goal: make large repositories navigable for Claude, ChatGPT, local models, and humans.

Current shipped slice:

- Context export now emits `claude-context-navigation.md`.
- Graph JSON includes `navigation.clusters`, `navigation.hubs`, `navigation.bridges`, `navigation.orphans`, `navigation.unresolvedBySource`, and `navigation.routes`.
- Mind map output includes LLM navigation routes and clusters.
- Repo context export now emits typed edge kinds for Markdown links, wiki links, embeds, JSON Canvas cards/connections, local code imports, and test-coverage imports.
- Graph JSON nodes include frontmatter aliases, code symbols, and local import records.
- Context export emits `llm-context-chunks.jsonl` with stable ids, paths, line ranges, token estimates, headings, symbols, tags, and text for OpenAI, Claude, and generic LLM pipelines.

Next tasks:

- Expand typed edge kinds to same-folder, tag, attachment, media, and alias-derived relationships.
- Expand JS/TS/Python import and symbol extraction with re-export, package boundary, and cross-language heuristics.
- Add PageRank or label-propagation clustering beyond folder fallback.
- Move renderer graph indexing into a cache or worker so graph rebuilds do not block UI render.

Acceptance checks:

- A 2,500 Markdown file and 1,000 code file fixture exports within limits.
- Every chunk has stable id, path, start line, end line, and token estimate.
- Overview routes cite only files included in emitted outputs.

## Plan 3: Premium Graph And Mind Map Interaction

Goal: make graph and map surfaces feel inspectable, animated, and useful at scale.

Current shipped slice:

- Graph and mind map support zoom, pan, search, click-to-open source navigation, matched/dimmed states, render caps, hover/focus detail inspectors, rendered full-graph preview popovers with source anchors, and full-graph filters for folder, type, tags, orphans, unresolved links, backlinks, outgoing links, media references, and canvas references.
- Full graph now adds visible zoom percentage, fit-to-view, local-depth control, saved local filter presets, command-palette graph export actions, keyboard roving focus, detail-card focus/expand actions, minimap recentering, and profile-based JSON/SVG/Markdown context export.
- Mermaid mind-map preview blocks now use a readable app-native SVG renderer so dark-mode inserted maps remain usable.
- JSON Canvas files are opened as vault files, previewed as readable card/connection summaries, and indexed into the graph through file-card links, text-card links, and Canvas connection edges.
- Vault file navigation now uses a collapsible folder tree with persisted expansion and search/active-note expansion behavior.
- Quick-open and recent file/vault commands now use a native recent-item store, `Cmd/Ctrl+P`, and command-palette entries without exposing arbitrary path opens.

Next tasks:

- Add saved graph/canvas layout stress cases.

Acceptance checks:

- Mouse hover reveals useful context without layout shift.
- Search results can focus and open nodes even when the visual graph is capped.
- Keyboard users can navigate graph and mind-map nodes.

## Plan 4: LLM Skill

Goal: let Claude, ChatGPT, Codex, and other agents learn how to use Shibanshu Markdown Viewer as a context system.

Current shipped slice:

- Repo-packaged skill: `skills/shibanshu-markdown-context`.
- The skill teaches context export, navigation guide usage, static publish, atomic note creation, and safe local operation.
- The skill validates with the official skill validator.

Next tasks:

- Add install command or marketplace packaging once the target skill runtime is chosen.
- Forward-test the skill with a fresh agent on a real repo task.
- Add a sample context workflow artifact generated by the app.

Acceptance checks:

- A fresh agent can use the skill to generate a context map, identify routes, cite paths, and create a summary note.

## Plan 5: Installable Offline Distribution

Goal: produce professional downloadable installers with trust material.

Current shipped slice:

- macOS build outputs `.app` and DMG targets.
- Release scripts generate `release/release-manifest.json`, `release/SHA256SUMS`, and `docs/download/index.html`.
- Release readiness now generates `release/release-readiness.json` and exposes public blockers separately from development-build warnings.
- Package metadata includes macOS, Windows, and Linux target scaffolding.
- Icon generator emits `.icns`, `.ico`, and PNG.
- `.mkd` file association is aligned with README support.
- Mac metadata overrides broad privacy strings and disables arbitrary ATS loads.

Next tasks:

- Add Developer ID signing, hardened runtime verification, notarization, and stapling.
- Clear the `npm run release:readiness -- --arch arm64 --public` blockers.
- Add Windows code signing and Linux package verification.
- Add CI release workflow from a clean checkout.
- Add LICENSE, THIRD_PARTY_NOTICES, SECURITY.md, CHANGELOG.md, privacy statement, and uninstall guide.
- Add packaged artifact launch tests and DMG mount/install verification.

Acceptance checks:

- Download page lists version, release date, supported platforms, checksums, offline privacy statement, and install steps.
- Public macOS releases pass `spctl`, `codesign`, notarization, and staple validation.
- Windows and Linux artifacts are generated from the same source and have checksums.

## Plan 6: Security And File Safety

Goal: keep local files safe while adding automation and publishing.

Current shipped slice:

- IPC sender validation, trusted vault path checks, atomic writes, conflict detection, safe trash, sanitized preview/export/publish, and URL scheme limitations exist.

Next tasks:

- Add mocked Electron tests for every path and IPC guard.
- Add symlink escape fixtures.
- Add autosave/history/publish payload limit tests.
- Add unsafe external URL tests.

Acceptance checks:

- No URL command reads arbitrary local paths.
- Publish output cannot escape the chosen folder.
- Vault create/rename/delete cannot escape a trusted vault.

## Plan 7: Completion Audit

The goal is not complete until every plan above has implementation evidence and verification evidence. Green smoke tests alone are not enough; each feature and safety claim needs a targeted test, generated artifact, or runtime proof.
