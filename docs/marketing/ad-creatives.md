# Ad Creatives — Shibanshu Markdown MCP

## Ad 1: "The Blind Spot" (Problem → Solution)

**Visual:** Split screen. Left: Claude Code terminal scrolling through 200 file reads, context bar at 95% red. Right: Same terminal, one `generate_context_map` call, context bar at 7% green.

**Headline:** Your AI coding assistant is wasting 97% of its brainpower reading files.

**Body:** Claude Code reads files one-by-one to understand your codebase. A 200-file repo burns its entire context window before it can think. shibanshu-markdown-mcp compresses your repo into navigable routes — 40x less context, same understanding.

**CTA:** `npx shibanshu-markdown-mcp` — One command. Free.

**Platforms:** Twitter, Reddit r/ClaudeAI, r/programming

---

## Ad 2: "The Map" (Visual metaphor)

**Visual:** Two panels.
Panel 1: A person in a dark maze with a tiny flashlight (labeled "Claude Code reading files")
Panel 2: Same maze but viewed from above with a glowing route highlighted (labeled "Claude Code with context map")

**Headline:** Stop giving Claude a flashlight. Give it a map.

**Body:** One MCP command. Claude understands your entire architecture — hubs, bridges, dead code, dependencies — without reading every file.

**CTA:** Install in 10 seconds: `claude mcp add shibanshu-markdown npx shibanshu-markdown-mcp`

**Platforms:** Twitter, Dev.to header image

---

## Ad 3: "The Numbers" (Benchmark-driven)

**Visual:** Clean dark card with large numbers:

```
234,958 tokens → 5,845 tokens
     42-file repo
     97.5% less context
     40x compression
     $0
```

**Headline:** Same understanding. 97% less tokens. Free.

**Body:** MCP server that gives Claude Code structural understanding of any codebase. Navigation routes, dependency graphs, hub analysis. Works on repos that are literally too large for Claude to read raw.

**CTA:** GitHub → star → install → done.

**Platforms:** Twitter card, LinkedIn, HN

---

## Ad 4: "The Before/After" (Screencast-style)

**Visual:** Two terminal recordings side by side (GIF or short video)

**Left (Before):**
```
$ "explain the auth architecture"
> Reading src/auth/login.ts...
> Reading src/auth/session.ts...
> Reading src/auth/types.ts...
> Reading src/middleware/auth.ts...
> Reading src/utils/crypto.ts...
> Reading src/api/users.ts...
> [context window: 73% consumed]
> "The auth system appears to use sessions..."
> [vague, incomplete answer]
```

**Right (After):**
```
$ "explain the auth architecture"
> Using generate_context_map...
> [context window: 7% consumed]
> "The auth system has 3 clusters:
>  - auth/ (hub: login.ts, 12 dependents)
>  - middleware/ (bridge to api/)
>  - api/users.ts (consumer)
>  session.ts has 3 unresolved imports — likely broken"
> [precise, structural answer]
```

**Headline:** Same question. Different understanding.

**CTA:** One line install. Open source.

**Platforms:** Twitter video, YouTube pre-roll, Reddit

---

## Ad 5: "The Impossible" (Edge case that sells)

**Visual:** Large text on dark background:

```
Claude's context window: 200,000 tokens

Your 200-file repo: 1,057,310 tokens

Math doesn't work.

Unless you compress 40x.
```

**Headline:** Your repo is too big for Claude. Until now.

**Body:** Repos over ~40 files exceed Claude's context window when read raw. shibanshu-markdown-mcp compresses structural understanding to 7% of the window. Large repos finally work.

**CTA:** `npx shibanshu-markdown-mcp`

**Platforms:** Twitter, HN comment threads about context limits

---

## Ad 6: "The Dev Tool Tax" (Cost angle — for API users)

**Visual:** Receipt/invoice style:

```
MONTHLY AI CODING BILL
━━━━━━━━━━━━━━━━━━━━━━
File exploration tokens    $1,032.00
Actual coding tokens         $168.00
                           ━━━━━━━━
Total                      $1,200.00

WITH CONTEXT MAPS:
File exploration tokens       $43.00
Actual coding tokens         $168.00
                           ━━━━━━━━
Total                        $211.00
                           
YOU SAVE: $989/mo
━━━━━━━━━━━━━━━━━━━━━━
```

**Headline:** 83% of your Claude API bill is wasted on file exploration.

**Body:** shibanshu-markdown-mcp gives Claude structural understanding without reading every file. Sonnet API users save $1,000+/mo on medium repos.

**CTA:** Free. Open source. `npx shibanshu-markdown-mcp`

**Platforms:** Twitter (API billing complaints), LinkedIn

---

## Reddit Post Templates

### r/ClaudeAI Post:

**Title:** I built an MCP server that compresses your codebase 40:1 for Claude Code — benchmarks inside

**Body:**

I was frustrated with Claude Code burning its entire context window just reading files to understand my repo. A 200-file TypeScript project needs 1M+ tokens to read — 5x Claude's context window.

So I built an MCP server that generates structural maps instead of reading every file:

- **Navigation routes** — prioritized reading order (like how a senior engineer onboards)
- **Hub/bridge analysis** — which files are critical vs dead code
- **Dependency graph** — what connects to what
- **Token-budgeted chunks** — pre-split for LLM consumption

**Real benchmarks:**
- 42-file repo: 234K tokens → 5.8K tokens (97.5% reduction)
- 200-file repo: 1M tokens (impossible raw) → 14K tokens
- All 15 tools pass functional tests

**Install (one line):**
```
claude mcp add shibanshu-markdown npx shibanshu-markdown-mcp
```

Open source, MIT licensed. Would love feedback.

GitHub: [link]

---

### r/programming Post:

**Title:** The context window problem in AI coding tools — and a graph-based solution

**Body:**

Every AI coding tool (Claude Code, Cursor, Copilot) has the same fundamental constraint: they need to READ your code to understand it, and reading burns context.

I built an MCP server that takes a different approach — instead of reading files, it generates a knowledge graph with navigation routes, hub/bridge analysis, and dependency mapping. Claude gets structural understanding at 2-3% of the token cost.

The key insight: you don't need to read every file to understand architecture. You need to know which files are hubs (most connected), which are bridges (connect different subsystems), and what the dependency order is.

Benchmarks and details in the README. Curious what this community thinks about this approach.

---

## Hacker News Submission

**Title:** Show HN: MCP server that gives Claude Code structural codebase understanding (40x less context)

**URL:** github.com/shibanshu12/markdown-viewer-mac

(HN prefers GitHub links over blog posts for Show HN)
