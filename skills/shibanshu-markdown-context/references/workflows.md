# Shibanshu Markdown Viewer Workflows

## Output Files

`shibanshu-markdown context <folder> --out <folder>` writes:

- `claude-context-navigation.md`: start here for routes, clusters, hubs, bridges, and cleanup risks.
- `claude-context-map.md`: full human-readable map with file summaries and link graph.
- `claude-context-mind-map.md`: Mermaid mind map for visual reasoning.
- `claude-context-graph.json`: machine-readable graph, typed edge kinds, symbols, imports, chunks, and navigation metadata.
- `claude-context-scene.json`: compact 3D scene map payload with coordinates, projection values, reading order, route scores, and a compactness-preserving filter.
- `llm-context-chunks.jsonl`: budget-aware chunks with stable ids, paths, line ranges, token estimates, headings, symbols, tags, and text.

`shibanshu-markdown publish <folder> --out <folder>` writes:

- `index.html`: static site home page.
- `notes/*.html`: sanitized note pages.
- `assets/site-data.js`: local search data.
- `assets/graph.json`: machine-readable static graph.

## Common Commands

```bash
shibanshu-markdown context ~/Notes --out /tmp/notes-context
shibanshu-markdown context ~/repo --out /tmp/repo-context --max-files 3000 --max-bytes 500000
shibanshu-markdown context ~/repo --out /tmp/repo-context --chunk-tokens 700
shibanshu-markdown publish ~/Notes --out ~/Desktop/notes-site
shibanshu-markdown publish ~/Notes --save-profile docs --out ../notes-site --theme dark
shibanshu-markdown publish ~/Notes --profile docs
shibanshu-markdown create-note ~/Notes/Context/Decision.md --content "# Decision" --no-open
shibanshu-markdown search roadmap
shibanshu-markdown graph
shibanshu-markdown mind-map
```

## LLM Prompt Patterns

Use these patterns after generating a context map:

```text
Use only the generated Shibanshu context files. Start with claude-context-navigation.md, cite paths, and explain the system architecture.
```

```text
Follow the Risk And Cleanup Route. Identify orphan notes, unresolved links, duplicate concepts, and the next Markdown notes to create.
```

```text
Use the Implementation Route and graph JSON. Propose the smallest safe implementation plan and list tests by file path.
```

```text
Create a new Markdown summary note from this analysis. Use atomic note creation and do not overwrite an existing file.
```

## Large Repository Strategy

1. Generate the context map with a high enough `--max-files` for the repository.
2. Read `navigation.routes` in `claude-context-graph.json` if structured processing is easier than Markdown.
3. Use `navigation.edgeKinds` to separate Markdown links, wiki links, embeds, code imports, and test-coverage edges.
4. Use `navigation.symbolDocuments` and node `symbols` to identify implementation entry points before editing code.
5. Use `llm-context-chunks.jsonl` when a model needs bounded line-range context instead of whole files.
6. Use clusters to split work by subsystem.
7. Use hubs and bridges to decide which files deserve careful reading.
8. Use unresolved links and orphans as cleanup candidates.
9. Regenerate after changing more than a few files.
10. Start with `claude-context-scene.json` for giant repos when you need a fast mental map before deep inspection.

## Viewer Strategy

- Use Graph for repository-scale navigation.
- Use Mind Map for active-note detail.
- Use global search for exact phrases across the vault.
- Use AI Context Map when asking a model to reason over the vault.
- Use Static Publish when a navigable offline HTML bundle is useful.
- Use the Scene Profile in the full graph for interactive 3D orientation and quick route browsing.
