# Four-Track Completion Plan

This document turns the remaining gap-closure work into **four independent plans**, each with its own objective, scope, and verification gates.

The app remains free, offline-capable, and local-first. No feature in these plans depends on a paid account or cloud requirement.

## Plan A — Utility: Large-Context Conversion and Context Maps

### Objective
Make `Markdown context -> compact navigation map` fast, reliable, and trustworthy for large local repositories.

### In scope
- Vault/repo indexing with deterministic caps.
- Typed graph/context exports for Claude, OpenAI, Gemini, local models.
- Stable route metadata for long-context navigation (`path`, heading context, line anchors).
- Context scene artifacts that stay usable when rendered offline.

### Acceptance checks
- 2,500 `.md` + 1,000 mixed code files export within profile limits.
- Every exported node includes stable IDs and line-bounded excerpts.
- A route references only nodes present in the same export package.
- Re-running the same export with no changes yields stable node/edge IDs.

### Immediate work
- Done: repository-scale profile presets (`analysis`, `audit`, `authoring`, `presentation`, `migration`) are wired into the context exporter.
- Done: graph, scene, Markdown guide, and JSONL chunk outputs include schema/profile/fingerprint metadata.
- Done: `context-integrity.json` records artifact checksums, route validation, export counts, limits, and warnings.
- Done: stress tests assert schema, selected profile, stable node/edge IDs, route validation, and checksums.
- Next: add route-aware export throttles and deterministic ordering controls for very large route sets.

## Plan B — Cosmetic: Surface, Clarity, and Interaction Polish

### Objective
Raise the app’s day-to-day clarity so large graphs and documents stay navigable quickly.

### In scope
- Focus/hover/disabled affordances across all controls.
- Dense-but-readable spacing and hierarchy on graph, mind-map, and editor surfaces.
- Predictable panel/card behavior under resize and long content.
- Status/error/empty states for complex actions.

### Acceptance checks
- No control overlap at 320×480, 1366×768, and 1920×1080.
- All keyboard-visible focus states appear consistently on activation.
- Each disabled button exposes a reason (or is conditionally hidden).
- No truncated controls in mind-map and full-graph lists at typical data ranges.

### Immediate work
- In progress: graph 3D controls now expose explicit disabled reasons when the map is in 2D mode.
- Done: graph mode/export controls have concise titles for inspection without adding visible instructional text.
- Next: normalize button and control state styling for all graph and mind-map actions.
- Improve empty-state copy and loading feedback for heavy graph generation and export.
- Standardize visual badges for node types (`orphan`, `media`, `unresolved`, `hub`).
- Done: compact tooltips cover graph scope, graph space, export profile, and 3D rotation/orbit constraints.

## Plan C — Functionality: Core Writing and Reliability

### Objective
Close the baseline productivity gap for writing, finding, and preserving files.

### In scope
- Editor reliability under large documents.
- Workspace persistence and crash-safe document workflows.
- File operations and publish/read-export reliability.

### Acceptance checks
- Dirty docs never lose content on interrupted saves.
- Vault open/search/open-doc/reopen works after restart.
- Conflicting external file changes produce explicit conflict actions.
- Search and navigation include both open tabs and full vault.

### Immediate work
- Expand find/replace for scoped and selection-based flows.
- Finalize workspace persistence (open tabs, active vault, filter presets).
- Add regression tests for external file modification, interrupted writes, and autosave recovery.
- Improve publish/re-export flow for graph-enabled output metadata.

## Plan D — Interaction and Advanced Graph

### Objective
Make graph and mind-map interaction feel intentional and high-control for human and LLM workflows.

### In scope
- Stable 3D mode interaction (pan/zoom/orbit/auto-orbit).
- High-signal graph/mind-map actions accessible from toolbar, keyboard, and command palette.
- Context handoff from graph -> mind-map/canvas style views -> LLM exports.

### Acceptance checks
- Mouse/trackpad interaction updates layout immediately and does not freeze under stress.
- Graph/mind-map action buttons all either execute or present disabled reasons.
- One command can open a vault, render graph, navigate to a route, and export LLM context.

### Immediate work
- Done: command palette entries now cover 3D graph open, global graph scope, fit/reset view, auto orbit, reset 3D rotation, 3D scene export, and LLM context export.
- Add graph-to-context handoff from selected route/hub.
- Add interaction rule tests for every graph and mind-map control.
- Expand 3D scene export with explicit viewpoint persistence.

## Governance

Each plan is owned independently and can be executed in parallel.

- **Track status**: mark pass/fail on each acceptance list.
- **Execution rule**: a change belongs to one plan unless it creates a dependency.
- **Completion rule**: no major ship milestone until all four plans have evidence-backed completion.
