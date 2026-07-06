# athena-code-mcp

MCP server that gives Claude Code a fresh, queryable structural map of your codebase — so it asks for the right cited context instead of reading 300 files.

## The problem

Claude Code reads files one-by-one to understand your repo. A 200-file repo needs 1M+ tokens — **12x Claude's context window.** It literally can't fit. Claude works blind.

## The solution

One setup. Athena keeps a budgeted repo index fresh, queryable, and backed by health signals such as stale files, near-duplicates, contradictions, and possible secrets.

```bash
claude mcp add -s user athena npx athena-code-mcp
```

Then in any repo:

```
You: "Set up this repo for context mapping"
```

After you review and apply the setup diff, every Claude session can:
1. Check if the map is fresh
2. Query the index for cited answers
3. Read repo-health and blast-radius diagnostics before changing code

## What it does

**`setup_repo`** — diff-first setup:
- Previews exact changes before writing
- Generates context map (`.athena/`) after confirmation
- Installs pre-commit and post-commit hooks for dirty-tree and commit freshness
- Adds idempotent CLAUDE.md instructions with marker blocks
- Updates `.gitignore`

**After setup, agents should use `query_context`, `repo_health`, and `blast_radius` first.** The large map and chunks stay as backing stores.

## Real benchmarks (tested on production repos)

| Repo | Raw tokens | With MCP | Compression | Monthly savings (Sonnet) |
|------|-----------|----------|-------------|------------------------|
| 42 files | 234,958 | 5,845 | 40:1 | $333 |
| 200 files | 1,057,310 | 14,613 | 72:1 | $1,032 |
| 924 files | 2,359,465 | 10,812 | **218:1** | **$2,325** |

The 924-file benchmark is from a real production repo (resourceai-in), not a synthetic test.

## 22 tools

| Tool | What it does |
|------|-------------|
| `setup_repo` | Diff-first, idempotent setup (map + hooks + CLAUDE.md + .gitignore) |
| `check_map_freshness` | Reports HEAD and dirty working-tree freshness; can auto-refresh |
| `enable_auto_mapping` | Install pre-commit and post-commit hooks for auto-updates |
| `generate_context_map` | Full context map plus health, contradiction, staleness, authority, and duplicate reports |
| `query_context` | Ask a repo question and get ranked, cited, budget-capped context |
| `repo_health` | Actionable diagnostics: orphans, broken links, duplicates, contradictions, trust, possible secrets |
| `blast_radius` | Analyze a git range or dirty tree for affected docs, tests, imports, and downstream files |
| `read_context_map` | Read generated map/report files with hard token budgets and pagination |
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
        generate_context_map
                    ↓
    Queryable index + navigation guide
    ├── 5 prioritized reading routes
    ├── Hub files (most connected, critical)
    ├── Bridge files (connect subsystems)
    ├── Orphan files (dead code)
    ├── Dependency graph
    ├── Contradictions / duplicates / staleness
    └── Repo-health actions
                    ↓
    Claude asks targeted questions with file:line citations
                    ↓
    Less context waste and fewer stale-map mistakes.
```

## Install

```bash
# Add to Claude Code (one-time)
claude mcp add -s user athena npx athena-code-mcp

# Set up any repo (one-time per repo)
# Just tell Claude: "Set up this repo for context mapping"
```

## License

MIT
