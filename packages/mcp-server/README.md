# athena-mcp

MCP server that gives Claude Code a structural map of your codebase — so it reads 3 files instead of 300.

## The problem

Claude Code reads files one-by-one to understand your repo. A 200-file repo needs 1M+ tokens — **12x Claude's context window.** It literally can't fit. Claude works blind.

## The solution

One setup. Zero effort. Claude automatically understands your architecture.

```bash
claude mcp add -s user athena npx athena-mcp
```

Then in any repo:

```
You: "Set up this repo for context mapping"
```

That's it. From now on, every Claude session automatically:
1. Checks if the map is fresh
2. Reads the structural navigation guide
3. Knows your architecture before you ask anything

## What it does

**`setup_repo`** — one command, four things:
- Generates context map (`.shibanshu/`)
- Installs git hook (map auto-updates on every commit)
- Adds CLAUDE.md instructions (Claude reads the map automatically)
- Updates .gitignore

**After setup, you never think about it again.** Claude just understands your codebase.

## Real benchmarks (tested on production repos)

| Repo | Raw tokens | With MCP | Compression | Monthly savings (Sonnet) |
|------|-----------|----------|-------------|------------------------|
| 42 files | 234,958 | 5,845 | 40:1 | $333 |
| 200 files | 1,057,310 | 14,613 | 72:1 | $1,032 |
| 924 files | 2,359,465 | 10,812 | **218:1** | **$2,325** |

The 924-file benchmark is from a real production repo (resourceai-in), not a synthetic test.

## 19 tools

| Tool | What it does |
|------|-------------|
| `setup_repo` | One-command full setup (map + hook + CLAUDE.md) |
| `check_map_freshness` | Is the map current? Auto-refresh if stale |
| `enable_auto_mapping` | Install git hook for auto-updates |
| `generate_context_map` | Full context map (nav, graph, mind-map, chunks) |
| `read_context_map` | Read generated map files |
| `generate_graph_json` | Knowledge graph with hubs, bridges, orphans |
| `generate_mind_map` | Mermaid mind-map from any file |
| `generate_3d_graph_viewer` | Interactive 3D HTML visualization |
| `vault_list_files` | List files with sizes and word counts |
| `vault_read_note` | Read with auto-extracted headings, tags, links |
| `vault_write_note` | Write/overwrite a file |
| `vault_create_note` | Atomic safe creation (won't overwrite) |
| `vault_search` | Full-text search with context snippets |
| `extract_links` | Wiki-links, markdown links, embeds |
| `extract_headings` | Document outline |
| `extract_tags` | Frontmatter + inline tags |
| `vault_backlinks` | What links to a given file |
| `create_daily_note` | Templated daily note |
| `publish_static_site` | Static HTML site from vault |

## How it works

```
Your 924-file repo (2.3M tokens — 12x context window)
                    ↓
        generate_context_map (0.6 seconds)
                    ↓
    Navigation guide (10,812 tokens — 5% of window)
    ├── 5 prioritized reading routes
    ├── Hub files (most connected, critical)
    ├── Bridge files (connect subsystems)
    ├── Orphan files (dead code)
    ├── Dependency graph
    └── Cluster analysis
                    ↓
    Claude reads 3 targeted files instead of 300
                    ↓
    Right answer. First try. 95% context free for coding.
```

## Install

```bash
# Add to Claude Code (one-time)
claude mcp add -s user athena npx athena-mcp

# Set up any repo (one-time per repo)
# Just tell Claude: "Set up this repo for context mapping"
```

## License

MIT
