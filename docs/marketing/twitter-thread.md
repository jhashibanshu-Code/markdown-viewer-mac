# Twitter/X Launch Thread

---

**Tweet 1 (Hook):**

Claude Code reads your files one by one.

200-file repo? That's 1M+ tokens. More than Claude's entire context window.

Your AI is blind before it even starts thinking.

I built something that fixes this. One command. 40x compression. 🧵

---

**Tweet 2 (The problem):**

Here's what happens when you say "refactor the auth module":

→ Claude reads auth.ts (3K tokens)
→ Reads types.ts (1.5K tokens)
→ Reads utils.ts (2K tokens)
→ Reads 15 more files guessing...
→ Context 80% full
→ Starts FORGETTING what it read

Sound familiar?

---

**Tweet 3 (The solution):**

Now watch this:

```
claude mcp add shibanshu-markdown npx shibanshu-markdown-mcp
```

One command. Claude now has 15 new tools.

It calls `generate_context_map` ONCE and gets:
• Navigation routes (which files matter)
• Dependency graph (what connects to what)
• Hub analysis (critical files)
• Dead code detection (what to ignore)

---

**Tweet 4 (The numbers):**

Real benchmarks, not projections:

| Repo size | Without | With MCP | Savings |
|-----------|---------|----------|---------|
| 42 files | 234K tokens | 5.8K tokens | 97.5% |
| 200 files | 1M tokens (impossible) | 14K tokens | 98.6% |
| 1000 files | 5M tokens (impossible) | 29K tokens | 99.4% |

200+ file repos literally DON'T WORK without this.

---

**Tweet 5 (How it works):**

Instead of Claude reading every file blind, it gets a MAP:

"Read these 5 files first for architecture.
These 3 are hub files — 12 other files depend on them.
This file is a bridge between auth/ and api/ clusters.
These 6 files are orphans — probably dead code."

Claude goes from tourist to local.

---

**Tweet 6 (Install):**

Try it right now:

```bash
claude mcp add shibanshu-markdown npx shibanshu-markdown-mcp
```

Then start a conversation:

"Generate a context map of this repo"

Watch Claude understand your architecture in one call.

Open source. Free. MIT licensed.

GitHub: github.com/shibanshu12/markdown-viewer-mac

---

**Tweet 7 (What else it does):**

15 tools total:

🔍 vault_search — full-text search with snippets
🧠 generate_mind_map — Mermaid mind map from any .md
🔗 vault_backlinks — what links to what
📝 create_daily_note — templated daily notes
📊 generate_graph_json — knowledge graph with hubs/orphans
📄 vault_read_note — read with auto-extracted metadata

All via MCP. Claude calls them automatically.

---

**Tweet 8 (CTA):**

If you use Claude Code on repos with 50+ files, this will change your workflow.

⭐ Star on GitHub
📦 `npx shibanshu-markdown-mcp`
🧵 RT if useful

Built by @shibanshu12
