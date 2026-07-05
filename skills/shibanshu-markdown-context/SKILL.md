---
name: shibanshu-markdown-context
description: Use Shibanshu Markdown Viewer as a local-first Markdown vault, graph, mind-map, static publish, and LLM context system. Available as an MCP server with 14 tools. Trigger when an agent needs to inspect or create a local knowledge base, export Claude/OpenAI-ready context maps, navigate large repositories, generate mind maps or knowledge graphs, search vaults, find backlinks, save summaries as Markdown, or use shibanshu-markdown CLI commands.
---

# Shibanshu Markdown Context

Use this skill to operate Shibanshu Markdown Viewer as an offline knowledge graph and context-building tool.

## MCP Server (Recommended)

The app ships an MCP server that exposes 14 tools directly to Claude Code. Add to your Claude Code settings:

```json
{
  "mcpServers": {
    "shibanshu-markdown": {
      "command": "node",
      "args": ["/Users/shibanshujha/Documents/markdown-viewer-mac/mcp-server.mjs"]
    }
  }
}
```

### Available MCP Tools

| Tool | Purpose |
|------|---------|
| `vault_list_files` | List all markdown files in a vault with sizes and word counts |
| `vault_read_note` | Read a note with headings, tags, and links extracted |
| `vault_write_note` | Write/overwrite a markdown note |
| `vault_create_note` | Atomically create a new note (safe — won't overwrite) |
| `vault_search` | Search vault by content or filename with context snippets |
| `generate_context_map` | Generate full Claude-ready context maps (navigation, map, mind-map, graph, chunks) |
| `read_context_map` | Read a previously generated context map file |
| `generate_graph_json` | Generate a JSON knowledge graph with hubs, bridges, orphans, clusters |
| `generate_mind_map` | Generate a Mermaid mind-map from a note's headings, links, tags, tasks |
| `extract_links` | Extract wiki-links, markdown links, and embeds from a note |
| `extract_headings` | Extract heading structure (outline) from a note |
| `extract_tags` | Extract #tags and frontmatter tags from a note |
| `vault_backlinks` | Find all notes that link to a given note |
| `publish_static_site` | Publish vault as a static HTML site with search and graph |

### Scene and 3D Payload

When the graph export profile is `scene`, the payload includes:

- `profile: 3d-scene` for validation and routing.
- `nodes` and `edges` capped for performance (default 280 / 540).
- `coordinates` and `projection` fields for interactive rendering.
- `viewport.rotation` and `viewport.perspective`.
- `readingOrder` for LLM-first traversal.
- `fingerprint` for stable change detection.

Treat `scene` exports as a compact, navigable structure for very large vaults.

### MCP Workflow

1. Use `vault_list_files` to survey a vault
2. Use `generate_context_map` for deep analysis, then `read_context_map` with file="navigation" to navigate
3. Use `vault_search` to find specific content
4. Use `generate_mind_map` to visualize a note's structure
5. Use `generate_graph_json` for knowledge graph with hubs and orphans
6. For giant repositories, use `generate_graph_json` then open the full-graph Scene profile for compressed navigation.
7. Use `vault_backlinks` to understand how notes connect.
8. Use `vault_create_note` to save analysis results back to the vault.

## CLI Workflow (Alternative)

1. Treat the local folder as the source of truth.
2. Generate a context map before making broad claims:

```bash
shibanshu-markdown context /path/to/vault-or-repo --out /tmp/shibanshu-context
```

3. Read `claude-context-navigation.md` first, then `claude-context-map.md` or `llm-context-chunks.jsonl`, then targeted files.
4. Use cited paths from the generated map when explaining, editing, or planning.
5. Save useful summaries back into the vault as Markdown notes when requested:

```bash
shibanshu-markdown create-note /path/to/vault/Context/Summary.md --from-file /tmp/summary.md --no-open
```

6. Use static publish for shareable offline HTML:

```bash
shibanshu-markdown publish /path/to/vault --out /tmp/vault-site
```

## Navigation Rules

- Prefer route files from `claude-context-navigation.md` over reading files alphabetically.
- Start with Orientation Route for architecture, Implementation Route for code, Graph Hubs And Bridges Route for connected knowledge, and Risk And Cleanup Route for broken links or stale context.
- For code repos, inspect `edgeKinds`, import/test-coverage edges, and symbol-heavy files before editing implementation code.
- For a single note, use `generate_mind_map` to inspect headings, tasks, tags, backlinks, and outgoing links.
- For a full vault, use `generate_graph_json` to find hubs, bridges, unresolved links, and orphan notes.
- For large repositories, regenerate context maps after major file changes.

## Safe Operation

- Do not assume URL commands can read arbitrary paths; use file dialogs, OS file-open events, or CLI/MCP tools.
- Prefer `vault_create_note` (MCP) or `create-note` (CLI) over shell redirection; they write atomically and protect existing files.
- Keep AI exports local unless the user explicitly asks to paste or upload them.
- Avoid opening the Electron GUI in restricted terminal environments; use MCP tools or CLI context/publish commands instead.

## Reference

Read [references/workflows.md](references/workflows.md) when you need detailed command examples, output file meanings, or LLM prompt patterns.
