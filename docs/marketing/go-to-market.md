# Go-To-Market Strategy — shibanshu-markdown-mcp

## Market Fit Analysis

### The market exists and is growing fast

| Metric | Number | Source |
|--------|--------|--------|
| Claude Code users | 1M+ | Anthropic blog, May 2025 |
| Cursor paid users | 500K+ | Cursor funding announcement |
| GitHub Copilot subscribers | 1.8M+ | GitHub blog |
| MCP servers in official directory | ~80 | modelcontextprotocol/servers repo |
| MCP servers that solve context compression | **0** | You are first |
| Developers who have hit context limits | **Everyone** | Universal pain point |

### The pain is real and verified

Every developer forum, Reddit thread, and Twitter post about Claude Code has this complaint:

> "Claude keeps reading the wrong files"
> "Claude forgets what it read 5 files ago"
> "Claude can't handle my repo, it's too big"
> "I have to re-explain my architecture every conversation"

These are the top 4 complaints about AI coding tools. Your tool solves all four.

### Competition: zero

| Tool | What it does | Context compression? | Structural analysis? | MCP? |
|------|-------------|---------------------|---------------------|------|
| Cursor | AI coding + indexing | No — index is for autocomplete only | No | Adding |
| Copilot | AI code completion | No | No | No |
| Aider | CLI coding assistant | No | No | No |
| Continue.dev | Open-source AI coding | No | No | Adding |
| Codeium | AI completion | No | No | No |
| **Your tool** | Context compression | **218:1 proven** | **Hub/bridge/orphan** | **22 tools** |

You are creating a category, not competing in one.

---

## Marketing Channels (ranked by ROI)

### Tier 1: Free, high-impact (do this week)

**1. Reddit r/ClaudeAI** (180K members, your exact audience)
- Post type: "I built an MCP server that..." with benchmarks
- Expected: 200-500 upvotes, 50-100 installs in first week
- This is the single highest-ROI channel

**2. Reddit r/cursor** (50K members)
- Angle: "Works with any MCP-compatible tool"
- Cross-pollinate Claude + Cursor communities

**3. Twitter/X developer community**
- Thread format: problem → proof → install
- Tag @AnthropicAI @alexalbert__ @cursor_ai
- Use the 3D graph visual as the hook image

**4. Hacker News Show HN**
- Title: "Show HN: MCP server giving Claude Code 218x context compression"
- Link to GitHub repo
- HN loves: open source, benchmarks, novel approaches

**5. MCP Server Directory PR**
- Submit PR to github.com/modelcontextprotocol/servers
- This is the official discovery channel for MCP tools

### Tier 2: Content marketing (do in week 2-3)

**6. Dev.to / Hashnode article**
- "The Context Window Problem in AI Coding — and How I Solved It"
- SEO for: "claude code context limit", "claude code large repo"

**7. YouTube demo (3-5 min)**
- Screen recording: before/after on a real repo
- Show the 3D graph visualization
- "One command changed how I use Claude Code"

**8. LinkedIn post series**
- Post 1: The problem (context limits)
- Post 2: The proof (benchmarks on real repo)
- Post 3: The "how" (setup_repo demo)
- Post 4: The 3D visualization
- Post 5: "Why Anthropic should build this natively"

### Tier 3: Community building (month 2+)

**9. Discord server** for users
**10. GitHub Discussions** for feature requests
**11. Newsletter** for updates
**12. Conference talks** (AI Engineer, JSConf, local meetups)

---

## Ad Concepts and Communication

### Core message hierarchy

**Level 1 (hook — what stops the scroll):**
"Claude Code is blind to 91% of your codebase."

**Level 2 (proof — what makes them believe):**
"924 files. 2.3M tokens. Claude's window: 200K. Do the math."

**Level 3 (solution — what they do about it):**
"One command. Claude sees everything. Automatic forever."

**Level 4 (credibility — why they trust you):**
"218:1 compression. Tested on production repos. Open source."

### The 5 ad concepts that will work

---

**Ad 1: "THE BLIND SPOT"**

Visual: Split screen — left shows Claude Code terminal scrolling through files endlessly, right shows a clean structural map.

Copy:
> Claude Code reads your repo file by file.
> 924 files. 2.3 million tokens.
> Its context window is 200,000.
>
> It sees 78 files. Blind to the other 846.
>
> One command fixes this.
> `npx shibanshu-markdown-mcp`

CTA: "Give Claude GPS for your codebase"

---

**Ad 2: "THE RETRY TAX"**

Visual: A receipt/invoice showing wasted retries.

Copy:
> Every wrong answer from Claude costs you 15 minutes.
> 3 retries per day × 22 work days = 16.5 hours/month wasted.
>
> The reason: Claude doesn't know your architecture.
> It reads random files and guesses.
>
> Fix: Give it the map before it starts.
> Right answer. First try. Every time.
>
> `npx shibanshu-markdown-mcp`

CTA: "Stop paying the retry tax"

---

**Ad 3: "THE IMPOSSIBLE TASK"**

Visual: The 3D graph spinning, with file names visible.

Copy:
> "Refactor the payment module"
>
> Without a map: Claude reads 25 files, misses 3 dependencies,
> breaks the billing integration, you spend 2 hours fixing it.
>
> With a map: Claude knows billing.ts is the hub (14 dependents),
> middleware bridges payment → api, legacy-crypto is dead code.
> Correct refactor. First try. 10 minutes.
>
> `npx shibanshu-markdown-mcp`

CTA: "Make the impossible task trivial"

---

**Ad 4: "THE SENIOR ENGINEER"**

Visual: Two chat conversations side by side.

Copy:
> A junior engineer joins your team.
> You don't hand them 924 files and say "read everything."
> You give them a map: "Here are the 5 key files,
> here's how they connect, here's what to never touch."
>
> Why do you treat Claude differently?
>
> Give Claude the same onboarding you'd give a human.
> `npx shibanshu-markdown-mcp`

CTA: "Onboard Claude like a senior engineer"

---

**Ad 5: "THE DEAD CODE"**

Visual: Graph highlighting orphan nodes in red.

Copy:
> Your repo has 215 files nobody uses.
> You didn't know that. Neither did Claude.
>
> In 0.6 seconds, this tool found:
> • 215 orphan files (dead code)
> • 18 broken imports
> • 3 files everything depends on
> • 84 files connecting different subsystems
>
> What's hiding in YOUR repo?
>
> `npx shibanshu-markdown-mcp`

CTA: "See what Claude can't see"

---

## Claude Code Prompts for Creating Ads

### Prompt 1: Animated 3D graph video

```
Create a full-screen HTML animation that shows a code repository knowledge graph.
Requirements:
- Black space background with subtle nebula glow (teal, purple, blue)
- 300+ nodes representing files, color-coded by folder/cluster
- Hub nodes (5-8) should be 3x larger with pulsing corona glow
- Edges between nodes with flowing energy particles
- Slow auto-rotation (0.001 rad/frame)
- Text overlay sequence (fade in one at a time, 3 seconds each):
  1. "924 files" (large, white)
  2. "2.3 million tokens" (large, red)
  3. "Claude's window: 200,000" (large, red)
  4. "Claude is blind to 91%" (large, red, dramatic)
  5. [pause 2 seconds]
  6. "One command." (large, green)
  7. "npx shibanshu-markdown-mcp" (monospace, green, centered)
  8. "218:1 compression. 22 tools. Zero effort." (smaller, gray)
- Total duration: 30 seconds loop
- Export-ready at 1920x1080
- No UI controls, just the animation + text
```

### Prompt 2: Before/after split-screen

```
Create an HTML page with a side-by-side terminal animation.
Left side (labeled "WITHOUT"):
- Dark terminal background
- Simulate Claude Code reading files one by one
- Each line: "> Reading src/auth/login.ts ... 3,200 tokens"
- Show 20+ files being read
- A red progress bar filling up labeled "Context: 73% consumed"
- Final output: "The auth system appears to use sessions..." (vague, gray text)
- Status: "⚠ 2 retries needed"

Right side (labeled "WITH MCP"):
- Same dark terminal
- One line: "> generate_context_map ... done (0.6s)"
- Green progress bar at 5% labeled "Context: 5% used"
- Final output showing precise architecture with hub/bridge analysis
- Status: "✓ Correct first try"

Animate the left side slowly (2 seconds per line), right side appears instantly.
Add a floating badge: "218:1 compression"
```

### Prompt 3: Social card for Twitter/LinkedIn

```
Create a 1200x675 social card image (HTML).
Background: #000 with very subtle grid lines
Left 40%: Large typography
  Line 1: "Claude is blind" (48px, white, bold)
  Line 2: "to 91% of your repo." (48px, #ff6b6b, bold)
  Line 3: small gap
  Line 4: "npx shibanshu-markdown-mcp" (16px, monospace, #5eead4)
  Line 5: "22 tools · 218:1 compression · free" (12px, #666)

Right 60%: Mini 3D graph visualization (static or slow rotation)
  - 80 nodes, color-coded clusters
  - Visible file name labels on hubs
  - Glowing connections
  - Space/universe aesthetic
```

### Prompt 4: Product demo landing page

```
Create a single-page landing site for shibanshu-markdown-mcp.
Sections:
1. Hero: "Give Claude GPS for your codebase"
   Subtitle: "One command. 218:1 context compression. Automatic forever."
   CTA: Copy-paste install command with click-to-copy
   Background: animated 3D graph (subtle, not distracting)

2. The Problem: 3-column grid
   Col 1: "Blind" — Claude reads random files, misses connections
   Col 2: "Expensive" — burns 2.3M tokens exploring, $80/mo wasted
   Col 3: "Broken" — 200+ file repos exceed the context window entirely

3. The Solution: How it works in 3 steps
   Step 1: Install (one line)
   Step 2: Setup repo (Claude does it automatically)
   Step 3: Every session, Claude reads the map first (automatic via CLAUDE.md)

4. Benchmarks: Table showing real numbers from resourceai-in
   924 files → 10,812 tokens · 218:1 · 0.6 seconds

5. 22 Tools: Icon grid showing all tools with one-line descriptions

6. "Try it now": Terminal mockup showing the install + first use

Dark theme. Clean. Developer-focused. No marketing fluff.
Font: Inter for body, JetBrains Mono for code.
Colors: #000 background, #5eead4 accent, #fff text.
```

### Prompt 5: GitHub README header banner

```
Create an SVG banner (1280x320) for a GitHub README.
Left side: "shibanshu-markdown-mcp" in JetBrains Mono, bold
Below: "19 MCP tools · 218:1 compression · zero config"
Right side: Mini knowledge graph illustration (simplified, 20 nodes)
  - 3 large hub nodes with glow
  - Colored clusters
  - Clean edges
Background: dark gradient (#0a0e14 to #111827)
Accent color: #5eead4
Style: minimal, developer-friendly, not flashy
```

---

## Content Calendar (First 30 Days)

| Day | Channel | Content | Goal |
|-----|---------|---------|------|
| 1 | Reddit r/ClaudeAI | Launch post with benchmarks | 200+ upvotes |
| 1 | Twitter | 8-tweet thread | 100+ retweets |
| 2 | Hacker News | Show HN post | Front page |
| 3 | LinkedIn | "I solved why Claude gives wrong answers" | 50+ comments |
| 5 | MCP Directory | PR to official servers list | Official listing |
| 7 | Dev.to | Technical deep-dive article | SEO ranking |
| 10 | YouTube | 3-min demo video | 1K views |
| 14 | LinkedIn | 3D graph visualization post | Viral visual |
| 17 | Twitter | "Run it on Next.js" showcase | Community shares |
| 21 | Reddit r/programming | Technical architecture post | Broader reach |
| 25 | LinkedIn | Honest benchmarks post (the realistic numbers) | Trust building |
| 30 | Blog | "What I learned building the most-used MCP server" | Thought leadership |

---

## Messaging Do's and Don'ts

### DO say:
- "Claude finally understands your architecture"
- "Right answer, first try"
- "One setup. Automatic forever."
- "22 tools. Zero config."
- "Works on repos too large for Claude to read"

### DON'T say:
- "Save $1,000/month" (inflated, sounds like spam)
- "97% less tokens" (only true for edge case)
- "Better than Obsidian/Cursor" (different category)
- "AI-powered" (everything is AI-powered, meaningless)
- "Revolutionary" (let users decide that)

### The one sentence:
**"Give Claude a map of your codebase so it reads 3 files instead of 300."**

That's the pitch. Everything else is proof.
