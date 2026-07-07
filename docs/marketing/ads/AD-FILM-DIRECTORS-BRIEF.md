# Ad Film — Director's Brief

## The problem with every version so far

1. **No emotional arc** — just features dumped on screen
2. **No visual hierarchy** — everything same size, same weight, same timing
3. **Wrong order** — leading with technical specs instead of human pain
4. **Ugly rendering** — stretched fonts, wrong colors, no breathing room
5. **The 3D graph looks like a screensaver** — no context, no meaning shown
6. **RTBs are feature names** — not human benefits

## The correct story structure (Apple reference)

Apple never starts with specs. They start with YOU.

**Beat 1: THE FEELING** (0-3s)
What the viewer FEELS every day. Not what the tool does.
"You ask Claude to fix your code. It reads 47 files. Gets it wrong. You try again."
This is EVERY developer's daily life. They nod.

**Beat 2: THE COST** (3-7s)  
Make the pain concrete. Not abstract tokens — real money, real time.
"$35 burned. 45 minutes wasted. And tomorrow, same thing."
They FEEL it now.

**Beat 3: THE TURN** (7-9s)
One line. Silence. Black.
"What if it already knew your code?"
This is the moment the viewer leans in.

**Beat 4: THE REVEAL** (9-22s)
The graph builds. But NOT as decoration — as PROOF.
Each node is a file they recognize. Each connection is a dependency.
The graph IS the product. Show it doing something — not just spinning.
Show: a node being clicked → summary appearing → "login.ts — hub, 12 dependents"
Show: the blast radius lighting up when one file is selected
Show: dead code dimming out

**Beat 5: THE BENEFITS** (overlaid on graph, 15-26s)
Not features. Benefits. In the order humans care:

1. "Your AI gets it right. First try." (accuracy — what they want most)
2. "$4,521 saved per year." (money — what their boss cares about)  
3. "Auto-updates on every commit." (convenience — zero effort)
4. "Health check your repo." (new capability they didn't know they needed)
5. "Know what breaks before you commit." (blast radius — fear reducer)

Each benefit appears for 2s, on the SIDE (not center), clean typography.

**Beat 6: THE PROOF** (26-32s)
Terminal showing real benchmark output. Not animated typing — just the result.
"29:1 compression. 0.5s. Verified on 1000-file repo."

**Beat 7: THE NAME** (32-38s)
"Athena"
"npx athena-code-mcp"
"22 tools. Zero config. Open source."

## Visual design rules

1. **Font**: SF Pro Display (system font) for headlines, SF Mono for code/numbers. NOT DM Sans — it looks generic.
2. **Colors**: 
   - Background: #000000 (pure black)
   - Primary text: #FFFFFF (pure white, not grey)
   - Accent: #5eead4 (teal) — used ONLY for the product name and key numbers
   - Secondary: #a1a1aa (zinc-400) — for subtitles
   - Danger: #f87171 (red-400) — for cost/waste numbers
   - Gold: #fbbf24 (amber-400) — for money saved
   - DO NOT use purple, pink, or saturated colors on text
3. **Typography scale**: 
   - Hero text: 72px, weight 700
   - Numbers: 64px, weight 800, monospace
   - Subtitles: 24px, weight 400
   - Small text: 16px, weight 400
   - NEVER go below 16px
4. **Spacing**: 
   - Between headline and subtitle: AT LEAST 80px
   - Between RTB pairs: AT LEAST 40px vertical
   - Side margins: 80px minimum
5. **Transitions**: 
   - Fade in: 0.6s ease
   - Fade out: 0.4s ease
   - Between beats: 0.3s black gap
   - NEVER hard cut — always fade

## Graph visual rules

1. Nodes: spherical gradient with specular highlight (3D look)
2. Node size: based on word count (sqrt scale)
3. Hub glow: subtle, 2-layer radial gradient
4. Edges: curved bezier, NOT straight lines
5. Edge glow: subtle, follows cluster color
6. Particles: 60+ flowing along edges, with 3-point trail
7. Rotation: 0.001 rad/frame (SLOW)
8. Background: pure #000 with 2 subtle nebula gradients
9. Stars: 200+, twinkling at different rates
10. When a node is "selected" (in the animation): 
    - All other nodes dim to 15% opacity
    - Connected edges glow bright
    - Label pill appears with file name + summary

## Audio

Use the cinematic documentary music from Downloads.
Sync beat drops to scene transitions.
