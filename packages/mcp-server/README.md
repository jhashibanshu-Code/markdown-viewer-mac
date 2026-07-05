# shibanshu-markdown-mcp

MCP server for Claude Code that gives AI 40x context compression for any codebase.

## The problem

Claude Code reads files one-by-one to understand your repo. A 200-file repo needs 1M+ tokens — **5x more than Claude's context window**. It literally can't understand your codebase.

## The solution

One tool call. 15 tools. 40:1 compression.

```
claude mcp add shibanshu-markdown npx shibanshu-markdown-mcp
```

Claude now has direct access to:

| Tool | What it does |
|------|-------------|
| `generate_context_map` | Compresses entire repo into navigation routes, hubs, bridges, clusters |
| `read_context_map` | Read the generated map (navigation, graph, mind-map, chunks) |
| `generate_graph_json` | Knowledge graph with hub/bridge/orphan analysis |
| `generate_mind_map` | Mermaid mind-map from any markdown file |
| `vault_list_files` | List files with sizes and word counts |
| `vault_read_note` | Read a file with auto-extracted headings, tags, links |
| `vault_write_note` | Write/overwrite a file |
| `vault_create_note` | Atomic safe creation (won't overwrite) |
| `vault_search` | Full-text search with context snippets |
| `extract_links` | Extract wiki-links, markdown links, embeds |
| `extract_headings` | Extract document outline |
| `extract_tags` | Extract #tags and frontmatter tags |
| `vault_backlinks` | Find all files linking to a given file |
| `create_daily_note` | Create a templated daily note |
| `publish_static_site` | Build a static HTML site from a vault |

## Benchmarks (real, tested)

| Repo size | Raw reading | With MCP | Savings |
|-----------|-----------|----------|---------|
| 10 files | 14,738 tokens | 1,750 tokens | 88% less |
| 42 files | 234,958 tokens | 5,845 tokens | 97.5% less |
| 200 files | 1,057,310 tokens (impossible) | 14,613 tokens | 98.6% less |
| 1000 files | 5,169,071 tokens (impossible) | 29,226 tokens | 99.4% less |

## Install

```bash
# Option A: Global install
npm install -g shibanshu-markdown-mcp
claude mcp add shibanshu-markdown shibanshu-markdown-mcp

# Option B: No install (npx)
claude mcp add shibanshu-markdown npx shibanshu-markdown-mcp
```

## Usage

Start a Claude Code conversation and say:

```
"Generate a context map of this repo"
"What's the architecture of ~/projects/my-app?"
"Create today's daily note in ~/Notes"
"Find all files about authentication in ~/projects/api"
```

Claude automatically uses the MCP tools — no manual work.

## License

MIT
