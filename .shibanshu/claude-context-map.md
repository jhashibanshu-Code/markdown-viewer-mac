# Claude Context Map

Generated: 2026-07-06T01:54:09.049Z
Schema: shibanshu.context.v1
Profile: analysis (Analysis)
Fingerprint: df3ef911d3899cdb1042ade8
Root: /Users/shibanshujha/Documents/markdown-viewer-mac
Files indexed: 184
Markdown/text files: 21
Code/config files: 163
Resolved links: 4
Unresolved links: 2
Limits: max 5000 files, max 768000 bytes per file, max depth 24

## Use With Claude

Paste this file into Claude when you need grounded help with this repo or vault. It is an offline map: no files were uploaded while generating it. Ask Claude to cite paths from this map before proposing edits.

Useful prompts:

- Explain the architecture using only the mapped files and cite paths.
- Find missing documentation or weak links between notes.
- Build a work plan for the highest-impact files.
- Suggest a graph/mind-map structure from the linked documents.
- Follow the LLM navigation model before reading individual files.

## LLM Navigation Model

This map includes 9 folder/topic clusters, 7 ranked hubs, 2 bridge files, and 177 orphan files.
Use the routes below to traverse the context with less token waste:

- Orientation Route: Start here to understand the repo or vault shape before reading detailed files.
  - packages/mcp-server/README.md
  - README.md
  - src/renderer.js
  - scripts/stress-check.mjs
  - skills/shibanshu-markdown-context/references/workflows.md
  - skills/shibanshu-markdown-context/SKILL.md
  - src/capacitor-bridge.js
  - src/index.html
- Graph Hubs And Bridges Route: Read these files to understand the most connected nodes and cross-cluster transitions.
  - src/renderer.js
  - scripts/stress-check.mjs
  - skills/shibanshu-markdown-context/references/workflows.md
  - skills/shibanshu-markdown-context/SKILL.md
  - src/capacitor-bridge.js
  - src/index.html
  - src/styles.css
- Implementation Route: Use this path when the task needs code, package, imports, symbols, config, or automation context.
  - src/renderer.js
  - electron/main.cjs
  - mcp-server.mjs
  - packages/mcp-server/mcp-server.mjs
  - scripts/stress-check.mjs
  - scripts/publish-static-site.mjs
  - scripts/smoke-check.mjs
  - src/index.html
- Symbol And Import Route: Use this path to inspect exported symbols, local imports, and test coverage edges before editing code.
  - electron/main.cjs
  - mcp-server.mjs
  - packages/mcp-server/export-context.mjs
  - packages/mcp-server/mcp-server.mjs
  - scripts/export-claude-map.mjs
  - scripts/generate-app-icon.mjs
  - scripts/publish-static-site.mjs
  - src/renderer.js
- Risk And Cleanup Route: Use this path to repair weak navigation, unresolved links, orphan notes, and stale docs.
  - scripts/stress-check.mjs
  - src/renderer.js
  - package-lock.json
  - android/app/src/main/assets/public/assets/katex-CddkPoXu.js
  - android/app/src/main/assets/public/assets/cytoscape.esm-B3I8pqwA.js
  - android/app/src/main/assets/public/assets/chunk-KEIR6QF5-BfrZ3jm6.js
  - android/app/src/main/assets/public/assets/swimlanes-5IMT3BWC-cqwfyrHk.js
  - android/app/src/main/assets/public/assets/architectureDiagram-ZJ3FMSHR-CSKUqKf1.js

## Edge Kind Mix

- import: 3
- markdown-link: 1

## Topic Clusters

- android — 109 files, 233160 words, 0 internal links, 0 external links
  - android/app/src/main/assets/public/assets/katex-CddkPoXu.js
  - android/app/src/main/assets/public/assets/cytoscape.esm-B3I8pqwA.js
  - android/app/src/main/assets/public/assets/chunk-KEIR6QF5-BfrZ3jm6.js
  - android/app/src/main/assets/public/assets/swimlanes-5IMT3BWC-cqwfyrHk.js
- docs — 30 files, 53272 words, 0 internal links, 0 external links
  - docs/marketing/ads/explorer-v4.html
  - docs/marketing/ads/explorer-resourceai.html
  - docs/marketing/ads/explorer-v2.html
  - docs/marketing/ads/explorer-v3.html
- scripts — 19 files, 27523 words, 0 internal links, 1 external links
  - scripts/stress-check.mjs
  - scripts/export-claude-map.mjs
  - scripts/smoke-check.mjs
  - scripts/publish-static-site.mjs
- / — 10 files, 30075 words, 0 internal links, 0 external links
  - package-lock.json
  - mcp-server.mjs
  - index.html
  - README.md
- packages — 5 files, 14399 words, 0 internal links, 0 external links
  - packages/mcp-server/export-context.mjs
  - packages/mcp-server/mcp-server.mjs
  - packages/mcp-server/package-lock.json
  - packages/mcp-server/README.md
- src — 5 files, 25908 words, 2 internal links, 0 external links
  - src/renderer.js
  - src/styles.css
  - src/index.html
  - src/capacitor-bridge.js
- skills — 3 files, 1001 words, 1 internal links, 0 external links
  - skills/shibanshu-markdown-context/SKILL.md
  - skills/shibanshu-markdown-context/references/workflows.md
  - skills/shibanshu-markdown-context/agents/openai.yaml
- electron — 2 files, 8050 words, 0 internal links, 0 external links
  - electron/main.cjs
  - electron/preload.cjs
- bin — 1 files, 1192 words, 0 internal links, 0 external links
  - bin/shibanshu-markdown.mjs

## Hub And Bridge Files

Hubs:
- src/renderer.js — 2 total links, 0 in, 2 out
- scripts/stress-check.mjs — 1 total links, 0 in, 1 out
- skills/shibanshu-markdown-context/references/workflows.md — 1 total links, 1 in, 0 out
- skills/shibanshu-markdown-context/SKILL.md — 1 total links, 0 in, 1 out
- src/capacitor-bridge.js — 1 total links, 1 in, 0 out
- src/index.html — 1 total links, 1 in, 0 out
- src/styles.css — 1 total links, 1 in, 0 out

Bridges:
- scripts/stress-check.mjs — 1 cross-cluster links, 1 total links
- src/index.html — 1 cross-cluster links, 1 total links

## Code Import Map

- scripts/stress-check.mjs -> src/index.html (import, ../src/index line 275)
- src/renderer.js -> src/capacitor-bridge.js (import, ./capacitor-bridge.js line 78)
- src/renderer.js -> src/styles.css (import, ./styles.css line 80)

## Symbol Index

- electron/main.cjs: variable:fs@2, variable:fsp@3, variable:crypto@4, variable:path@5, variable:markdownExtensions@8, variable:ignoredVaultDirectories@9, variable:MAX_MARKDOWN_BYTES@22, variable:MAX_EXPORT_HTML_BYTES@23, variable:MAX_TEXT_EXPORT_BYTES@24, variable:MAX_AUTOSAVE_BYTES@25, variable:MAX_AUTOSAVE_DOCUMENTS@26, variable:MAX_HISTORY_SNAPSHOT_BYTES@27
- mcp-server.mjs: variable:execFileAsync@25, variable:__dirname@26, variable:CLI_PATH@27, variable:EXPORT_SCRIPT@28, variable:MARKDOWN_EXTENSIONS@30, variable:IGNORED_DIRS@31, variable:MAX_VAULT_FILES@32, variable:MAX_VAULT_DEPTH@33, variable:MAX_FILE_SIZE@34, variable:MAX_SEARCH_RESULTS@35, variable:TOOLS@39, function:isMarkdownFile@288
- packages/mcp-server/export-context.mjs: variable:MARKDOWN_EXTENSIONS@5, variable:CODE_EXTENSIONS@6, variable:IGNORED_DIRECTORIES@25, variable:DEFAULT_MAX_FILES@43, variable:DEFAULT_MAX_BYTES@44, variable:DEFAULT_MAX_DEPTH@45, variable:DEFAULT_OUTPUT_DIR@46, variable:DEFAULT_CHUNK_TOKENS@47, variable:MAX_CHUNKS@48, variable:DEFAULT_SCENE_NODE_LIMIT@49, variable:DEFAULT_SCENE_EDGE_LIMIT@50, variable:DEFAULT_SCENE_PERSPECTIVE@51
- packages/mcp-server/mcp-server.mjs: variable:execFileAsync@25, variable:__dirname@26, variable:CLI_PATH@27, variable:EXPORT_SCRIPT@28, variable:MARKDOWN_EXTENSIONS@30, variable:IGNORED_DIRS@31, variable:MAX_VAULT_FILES@32, variable:MAX_VAULT_DEPTH@33, variable:MAX_FILE_SIZE@34, variable:MAX_SEARCH_RESULTS@35, variable:TOOLS@39, function:isMarkdownFile@288
- scripts/export-claude-map.mjs: variable:MARKDOWN_EXTENSIONS@5, variable:CODE_EXTENSIONS@6, variable:IGNORED_DIRECTORIES@25, variable:DEFAULT_MAX_FILES@43, variable:DEFAULT_MAX_BYTES@44, variable:DEFAULT_MAX_DEPTH@45, variable:DEFAULT_OUTPUT_DIR@46, variable:DEFAULT_CHUNK_TOKENS@47, variable:MAX_CHUNKS@48, variable:DEFAULT_SCENE_NODE_LIMIT@49, variable:DEFAULT_SCENE_EDGE_LIMIT@50, variable:DEFAULT_SCENE_PERSPECTIVE@51
- scripts/generate-app-icon.mjs: variable:root@5, variable:buildDir@6, variable:iconsetDir@7, variable:baseIconPath@8, variable:iconPath@9, variable:icoPath@10, variable:iconEntries@12, variable:crcTable@25, variable:value@26, variable:sampleOffsets@33, variable:pngBySize@41, function:createIconPng@60
- scripts/publish-static-site.mjs: variable:MARKDOWN_EXTENSIONS@8, variable:IGNORED_DIRECTORIES@9, variable:DEFAULT_MAX_FILES@22, variable:DEFAULT_MAX_BYTES@23, variable:DEFAULT_MAX_DEPTH@24, variable:MAX_TOTAL_BYTES@25, variable:DEFAULT_PROFILE_PATH@26, function:main@35, variable:inputRoot@42, variable:inputStats@47, variable:profileInfo@52, variable:settings@58
- src/renderer.js: variable:native@82, variable:SESSION_KEY@83, variable:THEME_KEY@84, variable:GRAPH_PRESETS_KEY@85, variable:UNTITLED_NAME@86, variable:MAX_RECENT_COMMAND_ITEMS@87, variable:RENDER_DELAY_MS@88, variable:PERSIST_DELAY_MS@89, variable:AUTOSAVE_DELAY_MS@90, variable:VALID_VIEW_MODES@91, variable:VALID_GRAPH_MODES@92, variable:GRAPH_RENDER_NODE_LIMIT@93
- scripts/verify-mac-app.mjs: variable:root@8, variable:packageJson@9, variable:productName@10, variable:version@11, variable:arch@12, variable:requireLaunchServices@13, variable:releaseDir@14, variable:appPath@15, variable:checks@16, function:getArg@26, variable:index@27, function:resolveAppPath@32
- scripts/browser-ui-smoke.mjs: variable:root@6, variable:appUrl@7, variable:sessionKey@8, variable:vaultRoot@9, variable:documents@11, variable:session@86, variable:page@110, variable:vaultCount@123, variable:vaultTreeText@135, variable:nestedFilePath@139, variable:previewMindMapText@164, variable:rawMermaidMindMapCount@168
- bin/shibanshu-markdown.mjs: variable:root@10, variable:scheme@11, variable:maxUrlContentBytes@12, variable:args@14, variable:command@15, function:printHelp@55, function:runContextExporter@91, variable:result@93, variable:result@100, function:runStaticPublisher@107, variable:result@109, variable:result@116
- src/capacitor-bridge.js: variable:AUTOSAVE_KEY@14, variable:RECENT_ITEMS_KEY@15, variable:MAX_VAULT_FILES@16, variable:MAX_VAULT_DEPTH@17, variable:MAX_FILE_BYTES@18, variable:MARKDOWN_EXTENSIONS@19, function:getExtension@21, variable:dotIndex@22, function:isMarkdownFile@26, function:basename@30, variable:parts@31, function:dirname@35
- scripts/release-readiness.mjs: variable:root@7, variable:releaseDir@8, variable:packageJson@9, variable:productName@10, variable:arch@11, variable:publicMode@12, variable:appPath@13, variable:checks@14, variable:report@23, function:getArg@31, variable:index@32, function:resolveAppPath@37
- scripts/smoke-check.mjs: variable:root@6, variable:requiredFiles@7, variable:html@44, variable:mainProcess@45, variable:preload@46, variable:renderer@47, variable:styles@48, variable:parityPlan@49, variable:megaStressPlan@50, variable:packageJson@51, variable:claudeExporter@52, variable:staticPublisher@53
- scripts/stress-check.mjs: variable:root@8, variable:tempRoot@9, variable:vaultDir@10, variable:contextDir@11, variable:siteDir@12, variable:totals@13, variable:contextResult@24, variable:graph@40, variable:sceneGraph@64, variable:firstChunk@73, variable:integrity@78, variable:navigation@84
- scripts/diagnose-mac-launch.mjs: variable:diagnosticDir@7, variable:sinceMinutes@8, variable:requireClean@9, variable:maxReports@10, variable:reports@12, variable:matchingReports@13, variable:findings@14, variable:text@17, function:getArg@27, variable:index@28, function:loadReports@33, variable:cutoff@34
- scripts/e2e-electron.mjs: variable:root@7, variable:tempDir@8, variable:userDataDir@9, variable:testFile@10, variable:artifactDir@11, variable:screenshotPath@12, variable:launchStartedAt@13, variable:fatalLaunchHandled@14, variable:initialMarkdown@24, variable:updatedMarkdown@32, variable:page@61, variable:pageErrors@62
- scripts/generate-download-page.mjs: variable:root@6, variable:packageJson@7, variable:releaseManifestPath@8, variable:releaseReadinessPath@9, variable:outputDir@10, variable:outputPath@11, variable:manifest@12, variable:readiness@25, function:renderDownloadPage@36, variable:productName@37, variable:version@38, variable:generatedAt@39
- scripts/mcp-safety-check.mjs: variable:root@9, variable:tempRoot@10, variable:vaultDir@11, variable:serverPath@12, variable:transport@18, variable:client@25, variable:tools@30, variable:safeNotePath@33, variable:createResult@34, variable:readResult@41, variable:nonMarkdownWrite@45, variable:nonMarkdownRead@52
- scripts/release-checksums.mjs: variable:root@7, variable:releaseDir@8, variable:packageJson@9, variable:artifactExtensions@10, variable:ignoredArtifacts@11, variable:artifacts@14, variable:manifest@15, variable:checksumLines@23, function:discoverReleaseArtifacts@35, variable:artifacts@36, function:walk@38, variable:entries@39
- docs/marketing/go-to-market.md: heading:Go-To-Market Strategy — shibanshu-markdown-mcp@1, heading:Market Fit Analysis@3, heading:The market exists and is growing fast@5, heading:The pain is real and verified@16, heading:Competition: zero@27, heading:Marketing Channels (ranked by ROI)@42, heading:Tier 1: Free, high-impact (do this week)@44, heading:Tier 2: Content marketing (do in week 2-3)@69, heading:Tier 3: Community building (month 2+)@87, heading:Ad Concepts and Communication@96, heading:Core message hierarchy@98, heading:The 5 ad concepts that will work@112
- scripts/local-preview.mjs: variable:root@9, variable:distDir@10, variable:host@11, variable:preferredPort@12, variable:port@13, variable:server@17, variable:requestUrl@18, variable:filePath@19, variable:details@22, function:getArg@42, variable:index@43, function:resolveSafeDistPath@48
- docs/four-track-completion-plan.md: heading:Four-Track Completion Plan@1, heading:Plan A — Utility: Large-Context Conversion and Context Maps@7, heading:Objective@9, heading:In scope@12, heading:Acceptance checks@18, heading:Immediate work@24, heading:Plan B — Cosmetic: Surface, Clarity, and Interaction Polish@31, heading:Objective@33, heading:In scope@36, heading:Acceptance checks@42, heading:Immediate work@48, heading:Plan C — Functionality: Core Writing and Reliability@56
- scripts/package-mac-zip.mjs: variable:root@8, variable:packageJson@9, variable:productName@10, variable:version@11, variable:arch@12, variable:releaseDir@13, variable:appPath@14, variable:zipPath@15, variable:zipStats@22, function:getArg@26, variable:index@27, function:resolveAppPath@32
- scripts/sign-dev-mac.mjs: variable:root@5, variable:arch@6, variable:appPath@7, variable:infoPlistPath@8, function:getArg@20, variable:index@21, function:resolveAppPath@26, variable:productName@27, variable:releaseDir@28, variable:candidates@29, function:patchInfoPlist@46, function:run@57
- docs/obsidian-parity-plan.md: heading:Obsidian Feature-Parity Plan@1, heading:Feature Inventory To Match For Free@11, heading:Parity Plan 0: Writing Core@26, heading:Parity Plan 1: Local Vault@53, heading:Parity Plan 2: Graph View@83, heading:Parity Plan 3: Canvas And Mind Map@121, heading:Parity Plan 4: Publish@164, heading:Parity Plan 5: Sync And Collaboration@197, heading:Parity Plan 6: Plugins, Themes, And Developer API@229, heading:Parity Plan 7: Automation, URL Scheme, And Native Identity@249, heading:Parity Plan 8: Claude, OpenAI, And Local AI Maps@277, heading:Build Order@311
- docs/marketing/ad-creatives.md: heading:Ad Creatives — Shibanshu Markdown MCP@1, heading:Ad 1: "The Blind Spot" (Problem → Solution)@3, heading:Ad 2: "The Map" (Visual metaphor)@17, heading:Ad 3: "The Numbers" (Benchmark-driven)@33, heading:Ad 4: "The Before/After" (Screencast-style)@55, heading:Ad 5: "The Impossible" (Edge case that sells)@94, heading:Ad 6: "The Dev Tool Tax" (Cost angle — for API users)@118, heading:Reddit Post Templates@150, heading:r/ClaudeAI Post:@152, heading:r/programming Post:@183, heading:Hacker News Submission@199
- scripts/render-repo-brain-video.mjs: variable:root@6, variable:htmlPath@7, variable:outDir@8, variable:targetPath@9, variable:posterPath@10, variable:browser@16, variable:context@17, variable:page@26, variable:video@31, variable:recordedPath@39, variable:info@41
- scripts/validate-syntax.mjs: variable:root@7, variable:checkedExtensions@8, variable:ignoredDirectories@9, variable:files@21, variable:failures@22, variable:result@25, function:discoverJavaScriptFiles@47, variable:result@48, function:walk@50, variable:entries@51, variable:absolutePath@56
- docs/premium-roadmap.md: heading:Free Professional Markdown App Roadmap@1, heading:End Goal@5, heading:Plan 1: Data Safety And File Correctness@9, heading:Plan 2: Security And Native Bridge Hardening@41, heading:Plan 3: Professional Editor Core@62, heading:Plan 4: Workspace, Library, And Navigation@90, heading:Plan 5: Preview And Export System@133, heading:Plan 6: UX, Accessibility, And Native Mac Polish@154, heading:Plan 7: Differentiators@186
- packages/mcp-server/README.md: heading:athena-code-mcp@1, heading:The problem@5, heading:The solution@9, heading:What it does@28, heading:Real benchmarks (tested on production repos)@38, heading:19 tools@48, heading:How it works@72, heading:Install@92, heading:License@102
- skills/shibanshu-markdown-context/SKILL.md: heading:Shibanshu Markdown Context@6, heading:MCP Server (Recommended)@10, heading:Available MCP Tools@25, heading:Scene and 3D Payload@46, heading:MCP Workflow@59, heading:CLI Workflow (Alternative)@70, heading:Navigation Rules@93, heading:Safe Operation@102, heading:Reference@110
- docs/marketing/repo-brain-one-pager.md: heading:Shibanshu Markdown Viewer: The Repo Brain@1, heading:The Big Idea@3, heading:Why This Is Big@9, heading:Reason To Believe@20, heading:Why It Can Feel Groundbreaking@31, heading:The Market Hook@43, heading:What The Video Should Prove@51, heading:Final Positioning@61
- docs/mega-stress-test-plan.md: heading:Mega Stress Test And Premium Gap Plan@1, heading:Plan 1: Extreme Test Gates@5, heading:Plan 2: Large Repository Context And Mind Maps@29, heading:Plan 3: Premium Graph And Mind Map Interaction@55, heading:Plan 4: LLM Skill@78, heading:Plan 5: Installable Offline Distribution@98, heading:Plan 6: Security And File Safety@127, heading:Plan 7: Completion Audit@148
- scripts/install-git-hook.mjs: variable:__dirname@12, variable:exportScript@13, variable:repoPath@15, variable:absRepo@21, variable:hooksDir@22, variable:hookPath@23, variable:hookScript@25, variable:existing@37
- README.md: heading:Shibanshu Markdown Viewer@1, heading:What It Does@7, heading:Commands@36, heading:URL Scheme@164, heading:CLI@176, heading:Architecture@198, heading:Security@218
- docs/research.md: heading:Markdown Viewer Research And Build Plan@1, heading:Reference@3, heading:Stack Decision@19, heading:Scope@23, heading:Security Model@40, heading:Performance Model@48
- skills/shibanshu-markdown-context/references/workflows.md: heading:Shibanshu Markdown Viewer Workflows@1, heading:Output Files@3, heading:Common Commands@21, heading:LLM Prompt Patterns@36, heading:Large Repository Strategy@56, heading:Viewer Strategy@69
- docs/privacy.md: heading:Privacy@1, heading:Local Processing@5, heading:Files@11, heading:Network@19, heading:AI Context Exports@23
- electron/preload.cjs: function:getDroppedFilePaths@3, variable:listener@43, variable:listener@48, variable:listener@53, variable:listener@58
- SECURITY.md: heading:Security Policy@1, heading:Supported Versions@5, heading:Reporting A Vulnerability@9, heading:Security Boundaries@18, heading:Public Release Requirement@24
- docs/obsidian-app-audit.md: heading:Obsidian 1.12.7 Reference Audit@1, heading:Bundle-Level Findings@11, heading:Feature Surface To Match@23, heading:Applied Direction For Shibanshu Markdown Viewer@40
- docs/release-readiness.md: heading:Release Readiness@1, heading:Commands@8, heading:Public Release Blockers@18, heading:Manual Desktop Smoke Test@31
- docs/uninstall.md: heading:Uninstall@1, heading:macOS@3, heading:Notes@16
- CHANGELOG.md: heading:Changelog@1, heading:0.1.0@3
- src/sample.md: heading:Shibanshu Markdown Viewer@5, heading:Rendering@9
- android/app/src/main/assets/public/assets/chunk-FWX5IMBZ-WeLLLf0b.js: variable:__vite__mapDeps@1
- android/app/src/main/assets/public/assets/chunk-KEIR6QF5-BfrZ3jm6.js: variable:e@1
- android/app/src/main/assets/public/assets/chunk-Y2CYZVJY-DsF7k-Jl.js: variable:e@1
- android/app/src/main/assets/public/assets/cytoscape.esm-B3I8pqwA.js: function:e@1
- android/app/src/main/assets/public/assets/defaultLocale-C8Fc0cco.js: function:e@1
- android/app/src/main/assets/public/assets/graphlib-B8gBHxth.js: variable:e@1
- android/app/src/main/assets/public/assets/init-D6jRqBbL.js: function:e@1
- android/app/src/main/assets/public/assets/katex-CddkPoXu.js: variable:e@1
- android/app/src/main/assets/public/assets/mermaid-parser.core-CosqdZY-.js: variable:__vite__mapDeps@1
- android/app/src/main/assets/public/assets/mermaid.core-CXFQ1THc.js: variable:__vite__mapDeps@1
- android/app/src/main/assets/public/assets/path-BWPyau1x.js: variable:e@1
- android/app/src/main/assets/public/assets/rough.esm-CSKSodPl.js: function:e@1
- android/app/src/main/assets/public/assets/swimlanes-5IMT3BWC-cqwfyrHk.js: variable:__vite__mapDeps@1
- docs/marketing/twitter-thread.md: heading:Twitter/X Launch Thread@1
- THIRD_PARTY_NOTICES.md: heading:Third Party Notices@1

## Orphan Candidates

- package-lock.json — no resolved links in or out
- android/app/src/main/assets/public/assets/katex-CddkPoXu.js — no resolved links in or out
- android/app/src/main/assets/public/assets/cytoscape.esm-B3I8pqwA.js — no resolved links in or out
- android/app/src/main/assets/public/assets/chunk-KEIR6QF5-BfrZ3jm6.js — no resolved links in or out
- android/app/src/main/assets/public/assets/swimlanes-5IMT3BWC-cqwfyrHk.js — no resolved links in or out
- android/app/src/main/assets/public/assets/architectureDiagram-ZJ3FMSHR-CSKUqKf1.js — no resolved links in or out
- android/app/src/main/assets/public/assets/chunk-WYO6CB5R-IPhMpwlv.js — no resolved links in or out
- android/app/src/main/assets/public/assets/sequenceDiagram-DBY2YBRQ-Cslk9WYi.js — no resolved links in or out
- android/app/src/main/assets/public/assets/chunk-ZGVPDNZ5-BEqpcTv8.js — no resolved links in or out
- android/app/src/main/assets/public/assets/index-BWbEtIfq.css — no resolved links in or out
- android/app/src/main/assets/public/assets/ganttDiagram-NO4QXBWP-SkzvzuDh.js — no resolved links in or out
- electron/main.cjs — no resolved links in or out
- packages/mcp-server/export-context.mjs — no resolved links in or out
- scripts/export-claude-map.mjs — no resolved links in or out
- docs/marketing/ads/explorer-v4.html — no resolved links in or out
- docs/marketing/ads/explorer-resourceai.html — no resolved links in or out
- android/app/src/main/assets/public/assets/cose-bilkent-JH36ORCC-kAVJj0Ee.js — no resolved links in or out
- docs/marketing/ads/explorer-v2.html — no resolved links in or out
- docs/marketing/ads/explorer-v3.html — no resolved links in or out
- android/app/src/main/assets/public/assets/blockDiagram-677ZJIJ3-B17MEeG_.js — no resolved links in or out
- android/app/src/main/assets/public/assets/chunk-PUDLZKDR-DpM1HG-u.js — no resolved links in or out
- android/app/src/main/assets/public/assets/src-BJXL0kr5.js — no resolved links in or out
- android/app/src/main/assets/public/assets/vennDiagram-L72KCM5P-tbAvfqU3.js — no resolved links in or out
- android/app/src/main/assets/public/assets/c4Diagram-LMCZKHZV-D9pjkoGS.js — no resolved links in or out
- android/app/src/main/assets/public/assets/dagre-CXRCoUWR.js — no resolved links in or out
- android/app/src/main/assets/public/assets/chunk-V7JOEXUC-DK7wLwxW.js — no resolved links in or out
- android/app/src/main/assets/public/assets/chunk-ZIRB5QZD-C6fEPe3t.js — no resolved links in or out
- android/app/src/main/assets/public/assets/rough.esm-CSKSodPl.js — no resolved links in or out
- android/app/src/main/assets/public/assets/chunk-ICXQ74PX-oIZRA21W.js — no resolved links in or out
- scripts/smoke-check.mjs — no resolved links in or out
- mcp-server.mjs — no resolved links in or out
- packages/mcp-server/mcp-server.mjs — no resolved links in or out
- scripts/publish-static-site.mjs — no resolved links in or out
- index.html — no resolved links in or out
- android/app/src/main/assets/public/assets/graphlib-B8gBHxth.js — no resolved links in or out
- android/app/src/main/assets/public/assets/chunk-EX3LRPZG-DMzky03I.js — no resolved links in or out
- android/app/src/main/assets/public/assets/mermaid.core-CXFQ1THc.js — no resolved links in or out
- android/app/src/main/assets/public/assets/chunk-52WLFC77-CjYNU1CD.js — no resolved links in or out
- packages/mcp-server/package-lock.json — no resolved links in or out
- scripts/browser-ui-smoke.mjs — no resolved links in or out

## High-Signal Files

- src/renderer.js — 2 links, 12313 words, 4 headings
- scripts/stress-check.mjs — 1 links, 1971 words, 0 headings
- skills/shibanshu-markdown-context/references/workflows.md — 1 links, 301 words, 6 headings
- skills/shibanshu-markdown-context/SKILL.md — 1 links, 669 words, 9 headings
- src/capacitor-bridge.js — 1 links, 1547 words, 0 headings
- src/index.html — 1 links, 3291 words, 0 headings
- src/styles.css — 1 links, 8681 words, 0 headings

## Folder Map

- / — 10 files
- android/app/src/main/assets — 2 files
- android/app/src/main/assets/public — 3 files
- android/app/src/main/assets/public/assets — 104 files
- bin — 1 file
- docs — 9 files
- docs/download — 1 file
- docs/marketing — 4 files
- docs/marketing/ads — 16 files
- electron — 2 files
- packages/mcp-server — 5 files
- scripts — 19 files
- skills/shibanshu-markdown-context — 1 file
- skills/shibanshu-markdown-context/agents — 1 file
- skills/shibanshu-markdown-context/references — 1 file
- src — 5 files

## Link Graph

- scripts/stress-check.mjs -> src/index.html (import: run)
- skills/shibanshu-markdown-context/SKILL.md -> skills/shibanshu-markdown-context/references/workflows.md (markdown-link: references/workflows.md)
- src/renderer.js -> src/capacitor-bridge.js (import: createCapacitorNative)
- src/renderer.js -> src/styles.css (import: ./styles.css)

## Unresolved Links

- scripts/stress-check.mjs -> ./alpha (import)
- src/renderer.js -> ./sample.md?raw (import)

## File Summaries

### android/app/src/main/assets/capacitor.config.json
- Type: code
- Size: 380 bytes
- Words: 37
- Lines: 21
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: { "appId": "com.shibanshujha.shibanshumarkdownviewer", "appName": "Shibanshu Markdown Viewer", "webDir": "dist", "server": { "androidScheme": "https" }, "plugins": { "SplashScreen": { "launchAutoHide": true, "launchShowDuration": 800, "backgroundColor": " f6f7f9" }, "Keyboard": { "resize": "body", "resizeOnFullScreen": true } }, "android": {} }

### android/app/src/main/assets/capacitor.plugins.json
- Type: code
- Size: 542 bytes
- Words: 32
- Lines: 23
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: { "pkg": "@capacitor/app", "classpath": "com.capacitorjs.plugins.app.AppPlugin" }, { "pkg": "@capacitor/filesystem", "classpath": "com.capacitorjs.plugins.filesystem.FilesystemPlugin" }, { "pkg": "@capacitor/preferences", "classpath": "com.capacitorjs.plugins.preferences.PreferencesPlugin" }, { "pkg": "@capacitor/share", "classpath": "com.capacitorjs.plugins.share.SharePlugin" }, { "pkg": "@capawesome/capacitor fi...

### android/app/src/main/assets/public/assets/abnfDiagram-VRR7QNED-D2Ou6ie0.js
- Type: code
- Size: 1848 bytes
- Words: 144
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{m as e,t}from"./mermaid parser.core CosqdZY .js";import{n}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as r}from"./src BJXL0kr5.js";import"./chunk WYO6CB5R IPhMpwlv.js";import"./chunk VAUOI2AC CxLYy1wT.js";import{n as i,r as a,t as o}from"./chunk MOJQB5TN B0qIm2NO.js";import{t as s}from"./chunk JWPE2WC7 DVXcaiue.js";var c=e .RailroadAbnf.parser.LangiumParser,l=n e= {let t=e.alternatives.map u ;return t.lengt...

### android/app/src/main/assets/public/assets/arc-CH6Gzxsm.js
- Type: code
- Size: 3472 bytes
- Words: 543
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e,t}from"./path BWPyau1x.js";import{a as n,c as r,d as i,f as a,i as o,l as s,m as c,n as l,o as u,p as d,r as f,u as p}from"./dist eWuB svD.js";function m e {return e.innerRadius}function h e {return e.outerRadius}function g e {return e.startAngle}function e {return e.endAngle}function v e {return e&&e.padAngle}function y e,t,n,r,i,a,o,s {var c=n e,l=r t,u=o i,d=s a,f=d c u l;if ! f f<1e 12 return f=...

### android/app/src/main/assets/public/assets/architecture-TIHT7OUA-BIMz0urW.js
- Type: code
- Size: 131 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{M as e}from"./mermaid parser.core CosqdZY .js";export{e as createArchitectureServices};

### android/app/src/main/assets/public/assets/architectureDiagram-ZJ3FMSHR-CSKUqKf1.js
- Type: code
- Size: 148899 bytes
- Words: 13638
- Lines: 36
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{o as e,s as t}from"./index BtSsEH4M.js";import{n}from"./mermaid parser.core CosqdZY .js";import{n as r}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as i,p as a}from"./src BJXL0kr5.js";import{H as o,J as s,K as c,U as l,a as u,b as d,f,v as p,w as m,x as h,y as g,z as }from"./chunk WYO6CB5R IPhMpwlv.js";import{c as v,i as y}from"./chunk ICXQ74PX oIZRA21W.js";import{t as b}from"./chunk VAUOI2AC CxLYy1wT.js";im...

### android/app/src/main/assets/public/assets/array-BifhSqXX.js
- Type: code
- Size: 107 bytes
- Words: 13
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: Array.prototype.slice;function e e {return typeof e== && in e?e:Array.from e }export{e as t};

### android/app/src/main/assets/public/assets/blockDiagram-677ZJIJ3-B17MEeG_.js
- Type: code
- Size: 72772 bytes
- Words: 6410
- Lines: 132
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t,p as n}from"./src BJXL0kr5.js";import{O as r,T as i,a,b as o,c as s,rt as c,s as l,x as u,z as d}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as f}from"./channel xhdVd2 5.js";import{A as p,B as m,C as h,D as g,E as ,F as v,G as y,H as b,I as x,L as S,M as C,N as w,O as T,P as E,R as D,T as O,U as k,V as A,W as j,a as M,b as ee,et as te,g as N,j as ne,k...

### android/app/src/main/assets/public/assets/c4Diagram-LMCZKHZV-D9pjkoGS.js
- Type: code
- Size: 69207 bytes
- Words: 4551
- Lines: 10
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t,p as n}from"./src BJXL0kr5.js";import{H as r,U as i,c as a,r as o,s,v as l,x as u,y as d,z as f}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as p}from"./dist eWuB svD.js";import{ as m,n as h,r as g}from"./chunk ICXQ74PX oIZRA21W.js";import{a as ,s as v}from"./chunk 32BRIVSS TA9WhXux.js";var y=p ,b= function {var t=e function e,t,n,r {for n ={},r=e.lengt...

### android/app/src/main/assets/public/assets/channel-xhdVd2_5.js
- Type: code
- Size: 114 bytes
- Words: 17
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{at as e,it as t}from"./chunk WYO6CB5R IPhMpwlv.js";var n= n,r = e.lang.round t.parse n r ;export{n as t};

### android/app/src/main/assets/public/assets/chunk-2Q5K7J3B-C1jixKkw.js
- Type: code
- Size: 191 bytes
- Words: 14
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";var t=class{constructor e {this.init=e,this.records=this.init }static{e this, }reset {this.records=this.init }};export{t};

### android/app/src/main/assets/public/assets/chunk-32BRIVSS-TA9WhXux.js
- Type: code
- Size: 1972 bytes
- Words: 187
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{p as t}from"./src BJXL0kr5.js";import{j as n}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as r}from"./dist eWuB svD.js";var i=r ,a=e e,t = {let n=e.append ;if n.attr ,t.x ,n.attr ,t.y ,n.attr ,t.fill ,n.attr ,t.stroke ,n.attr ,t.width ,n.attr ,t.height ,t.name&&n.attr ,t.name ,t.rx&&n.attr ,t.rx ,t.ry&&n.attr ,t.ry ,t.attrs!==void 0 for let e in t.attrs n.attr...

### android/app/src/main/assets/public/assets/chunk-52WLFC77-CjYNU1CD.js
- Type: code
- Size: 33954 bytes
- Words: 2997
- Lines: 10
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t,p as n}from"./src BJXL0kr5.js";import{T as r,b as i,x as a}from"./chunk WYO6CB5R IPhMpwlv.js";import{ as o,J as s,K as c,Q as l,X as u,Y as d,Z as f,et as p,g as m,nt as h,q as g,rt as ,tt as v,u as y}from"./chunk ICXQ74PX oIZRA21W.js";import{t as b}from"./line DbLsV03u.js";import{n as x}from"./chunk Q4XR5HBZ 0vSsliLn.js";import{i as S,n as ee,r as C,t...

### android/app/src/main/assets/public/assets/chunk-5VM5RSS4-ZNzvKenW.js
- Type: code
- Size: 362 bytes
- Words: 10
- Lines: 15
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";var t=e = , ;export{t};

### android/app/src/main/assets/public/assets/chunk-7BUUIJ7U-Bb538aSH.js
- Type: code
- Size: 2105 bytes
- Words: 295
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";var t=e e,t = {if t return + e.width/2+ + e.height/2+ ;let n=e.x??0,r=e.y??0;return + n+e.width/2 + + r+e.height/2 + }, ,n={aggregation:17.25,extension:17.25,composition:17.25,dependency:6,lollipop:13.5,arrow point:4,arrow barb:0,arrow barb neo:5.5},r={arrow point:4,arrow cross:12.5,arrow circle:12.5};function i e,t {if e===void 0 t===void 0 return{angle:0,deltaX:0,...

### android/app/src/main/assets/public/assets/chunk-C7G6YPKG-DevZaZ-V.js
- Type: code
- Size: 1849 bytes
- Words: 160
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{x as t}from"./chunk WYO6CB5R IPhMpwlv.js";var n=e e= {let{handDrawnSeed:n}=t ;return{fill:e,hachureAngle:120,hachureGap:4,fillWeight:2,roughness:.7,stroke:e,seed:n}}, ,r=e e= {let t=i ...e.cssCompiledStyles ,...e.cssStyles ,...e.labelStyle ;return{stylesMap:t,stylesArray: ...t }}, ,i=e e= {let t=new Map;return e.forEach e= {let n,r =e.split ;t.set n.trim ,r?....

### android/app/src/main/assets/public/assets/chunk-EX3LRPZG-DMzky03I.js
- Type: code
- Size: 37796 bytes
- Words: 3131
- Lines: 231
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{a as e}from"./index BtSsEH4M.js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n,p as r}from"./src BJXL0kr5.js";import{H as i,K as a,U as o,a as s,s as c,v as l,w as u,x as d,y as f}from"./chunk WYO6CB5R IPhMpwlv.js";import{g as p,s as m}from"./chunk ICXQ74PX oIZRA21W.js";import{t as h}from"./chunk 32BRIVSS TA9WhXux.js";import{t as g}from"./chunk XXDRQBXY CTt5IdBc.js";import{t as }from"./chun...

### android/app/src/main/assets/public/assets/chunk-FWX5IMBZ-WeLLLf0b.js
- Type: code
- Size: 3587 bytes
- Words: 292
- Lines: 2
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:__vite__mapDeps@1
- Imports: None
- Excerpt: const vite mapDeps= i,m= vite mapDeps,d= m.f m.f= "./dagre VKFMJZFB cjvoWlCK.js","./chunk Y2CYZVJY DsF7k Jl.js","./src BJXL0kr5.js","./index BtSsEH4M.js","./index BWbEtIfq.css","./chunk WYO6CB5R IPhMpwlv.js","./chunk ICXQ74PX oIZRA21W.js","./dist eWuB svD.js","./chunk HOUHSVGY B4ApBCAi.js","./chunk Q4XR5HBZ 0vSsliLn.js","./chunk 7BUUIJ7U Bb538aSH.js","./chunk OGEWGWER DJ9slR z.js","./graphlib B8gBHxth.js","./dagre...

### android/app/src/main/assets/public/assets/chunk-HOUHSVGY-B4ApBCAi.js
- Type: code
- Size: 5835 bytes
- Words: 689
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t}from"./src BJXL0kr5.js";import{b as n,z as r}from"./chunk WYO6CB5R IPhMpwlv.js";var i=Object.freeze {left:0,top:0,width:16,height:16} ,a=Object.freeze {rotate:0,vFlip:!1,hFlip:!1} ,o=Object.freeze {...i,...a} ,s=Object.freeze {...o,body: ,hidden:!1} ,c=Object.freeze {width:null,height:null} ,l=Object.freeze {...c,...a} ,u= e,t,n,r= = {let i=e.split ;if...

### android/app/src/main/assets/public/assets/chunk-ICXQ74PX-oIZRA21W.js
- Type: code
- Size: 30875 bytes
- Words: 3816
- Lines: 2
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t,p as n}from"./src BJXL0kr5.js";import{R as r,h as i,p as a,r as o,s}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as c}from"./dist eWuB svD.js";function l e {this. context=e}l.prototype={areaStart:function {this. line=0},areaEnd:function {this. line=NaN},lineStart:function {this. point=0},lineEnd:function { this. line this. line!==0&&this. point===1 &&th...

### android/app/src/main/assets/public/assets/chunk-JWPE2WC7-DVXcaiue.js
- Type: code
- Size: 223 bytes
- Words: 17
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";function t e,t {e.accDescr&&t.setAccDescription?. e.accDescr ,e.accTitle&&t.setAccTitle?. e.accTitle ,e.title&&t.setDiagramTitle?. e.title }e t, ;export{t};

### android/app/src/main/assets/public/assets/chunk-KEIR6QF5-BfrZ3jm6.js
- Type: code
- Size: 662694 bytes
- Words: 14948
- Lines: 161
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:e@1
- Imports: None
- Excerpt: var e=Object.create,t=Object.defineProperty,n=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,a=Object.prototype.hasOwnProperty,o= e,n = t e, ,{value:n,configurable:!0} ,s= e,t = function {return e&& t= 0,e r e 0 e=0 ,t},c= e,t = function {return t 0,e r e 0 t={exports:{}} .exports,t ,t.exports},l= e,n = {for var r in n t e,r,{get:n r ,enumerable:!0} },u= e,i,o,s = {if i&&typeo...

### android/app/src/main/assets/public/assets/chunk-MOJQB5TN-B0qIm2NO.js
- Type: code
- Size: 15646 bytes
- Words: 1032
- Lines: 88
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t}from"./src BJXL0kr5.js";import{D as n,a as r,b as i,c as a,x as o,z as s}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as c}from"./chunk VAUOI2AC CxLYy1wT.js";var l= ,u= ,d= ,f= ,p=new Map,m=e e= s e,o , ,h=e e= {switch e.type {case :return{...e,value:m e.value };case :return{...e,name:m e.name };case :return{...e,elements:e.elements.map h };case :return...

### android/app/src/main/assets/public/assets/chunk-OGEWGWER-DJ9slR_z.js
- Type: code
- Size: 963 bytes
- Words: 83
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{f as t,x as n}from"./chunk WYO6CB5R IPhMpwlv.js";import{p as r}from"./chunk ICXQ74PX oIZRA21W.js";var i=e {flowchart:e} = {let t=e?.subGraphTitleMargin?.top??0,n=e?.subGraphTitleMargin?.bottom??0;return{subGraphTitleTopMargin:t,subGraphTitleBottomMargin:n,subGraphTitleTotalMargin:t+n}}, ;async function a i,a {let o=i.getElementsByTagName ;if !o o.length===0 r...

### android/app/src/main/assets/public/assets/chunk-PUDLZKDR-DpM1HG-u.js
- Type: code
- Size: 60238 bytes
- Words: 5339
- Lines: 156
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{a as e}from"./index BtSsEH4M.js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n,p as r}from"./src BJXL0kr5.js";import{G as i,H as a,K as o,U as s,a as c,d as l,k as u,rt as d,s as f,v as p,w as ee,x as m,y as h}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as te}from"./channel xhdVd2 5.js";import{c as g,g as }from"./chunk ICXQ74PX oIZRA21W.js";import{t as ne}from"./chunk 5VM5RSS4 ZNzvKenW.js";...

### android/app/src/main/assets/public/assets/chunk-Q4XR5HBZ-0vSsliLn.js
- Type: code
- Size: 46875 bytes
- Words: 1260
- Lines: 70
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t,p as n}from"./src BJXL0kr5.js";import{A as r,F as i,b as a,s as o,z as s}from"./chunk WYO6CB5R IPhMpwlv.js";import{a as c}from"./chunk ICXQ74PX oIZRA21W.js";import{n as l,t as u}from"./chunk HOUHSVGY B4ApBCAi.js";function d {return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}v...

### android/app/src/main/assets/public/assets/chunk-RYQCIY6F-Cmpvdnwk.js
- Type: code
- Size: 7023 bytes
- Words: 761
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t}from"./src BJXL0kr5.js";import{r as n,t as r}from"./graphlib B8gBHxth.js";import{r as i,t as a}from"./map DsCK 0Cs.js";var o=4;function s e {return i e,o }function c e {var t={options:{directed:e.isDirected ,multigraph:e.isMultigraph ,compound:e.isCompound },nodes:l e ,edges:u e };return n e.graph t.value=s e.graph ,t}function l e {return a e.nodes ,fu...

### android/app/src/main/assets/public/assets/chunk-V7JOEXUC-DK7wLwxW.js
- Type: code
- Size: 48882 bytes
- Words: 4264
- Lines: 206
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{a as e}from"./index BtSsEH4M.js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n,p as r}from"./src BJXL0kr5.js";import{H as i,K as a,M as o,U as s,a as c,s as l,v as u,w as d,x as f,y as p,z as m}from"./chunk WYO6CB5R IPhMpwlv.js";import{c as h,g}from"./chunk ICXQ74PX oIZRA21W.js";import{t as }from"./chunk 5VM5RSS4 ZNzvKenW.js";import{t as v}from"./chunk 32BRIVSS TA9WhXux.js";import{t as y}fr...

### android/app/src/main/assets/public/assets/chunk-VAUOI2AC-CxLYy1wT.js
- Type: code
- Size: 321 bytes
- Words: 30
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{p as t}from"./src BJXL0kr5.js";import{x as n}from"./chunk WYO6CB5R IPhMpwlv.js";var r=e e= {let{securityLevel:r}=n ,i=t ;return r=== && i=t t .node ?.contentDocument??document .body ,i.select }, ;export{r as t};

### android/app/src/main/assets/public/assets/chunk-VR4S4FIN-DoSmwU1c.js
- Type: code
- Size: 574 bytes
- Words: 45
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t}from"./src BJXL0kr5.js";import{c as n}from"./chunk WYO6CB5R IPhMpwlv.js";var r=e e,r,o,s = {e.attr ,o ;let{width:c,height:l,x:u,y:d}=i e,r ;n e,l,c,s ;let f=a u,d,c,l,r ;e.attr ,f ,t.debug }, ,i=e e,t = {let n=e.node ?.getBBox {width:0,height:0,x:0,y:0};return{width:n.width+t 2,height:n.height+t 2,x:n.x,y:n.y}}, ,a=e e,t,n,r,i = , ;export{r as t};

### android/app/src/main/assets/public/assets/chunk-WYO6CB5R-IPhMpwlv.js
- Type: code
- Size: 207616 bytes
- Words: 8844
- Lines: 125
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{a as e,t}from"./index BtSsEH4M.js";import{n,t as r}from"./chunk Y2CYZVJY DsF7k Jl.js";import{h as i,m as a}from"./src BJXL0kr5.js";var o={min:{r:0,g:0,b:0,s:0,l:0,a:0},max:{r:255,g:255,b:255,h:360,s:100,l:100,a:1},clamp:{r:e= e =255?255:e<0?0:e,g:e= e =255?255:e<0?0:e,b:e= e =255?255:e<0?0:e,h:e= e%360,s:e= e =100?100:e<0?0:e,l:e= e =100?100:e<0?0:e,a:e= e =1?1:e<0?0:e},toLinear:e= {let t=e/255;return e .03...

### android/app/src/main/assets/public/assets/chunk-XXDRQBXY-CTt5IdBc.js
- Type: code
- Size: 262 bytes
- Words: 28
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{p as t}from"./src BJXL0kr5.js";var n=e e,n = {let r;return n=== && r=t +e ,t n=== ?r.nodes 0 .contentDocument.body: .select }, ;export{n as t};

### android/app/src/main/assets/public/assets/chunk-Y2CYZVJY-DsF7k-Jl.js
- Type: code
- Size: 155 bytes
- Words: 24
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:e@1
- Imports: None
- Excerpt: var e=Object.defineProperty,t= t,n = e t, ,{value:n,configurable:!0} ,n= t,n = {for var r in n e t,r,{get:n r ,enumerable:!0} };export{t as n,n as t};

### android/app/src/main/assets/public/assets/chunk-ZGVPDNZ5-BEqpcTv8.js
- Type: code
- Size: 101886 bytes
- Words: 8443
- Lines: 62
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t,p as n}from"./src BJXL0kr5.js";import{A as r,B as i,M as a,T as o,b as s,g as c,x as l,z as u}from"./chunk WYO6CB5R IPhMpwlv.js";import{a as d,r as f,u as p}from"./chunk ICXQ74PX oIZRA21W.js";import{t as m}from"./chunk HOUHSVGY B4ApBCAi.js";import{n as h}from"./chunk Q4XR5HBZ 0vSsliLn.js";import{n as g,t as }from"./chunk OGEWGWER DJ9slR z.js";import{a...

### android/app/src/main/assets/public/assets/chunk-ZIRB5QZD-C6fEPe3t.js
- Type: code
- Size: 41866 bytes
- Words: 4050
- Lines: 32
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";function t e {return e==null}e t, ;function n e {return typeof e== &&!!e}e n, ;function r e {return Array.isArray e ?e:t e ? : e }e r, ;function i e,t {var n,r,i,a;if t for a=Object.keys t ,n=0,r=a.length;n<r;n+=1 i=a n ,e i =t i ;return e}e i, ;function a e,t {var n= ,r;for r=0;r<t;r+=1 n+=e;return n}e a, ;function o e {return e===0&&1/e== 1/0}e o, ;var s={isNothin...

### android/app/src/main/assets/public/assets/classDiagram-OUVF2IWQ-cn_j6P97.js
- Type: code
- Size: 780 bytes
- Words: 52
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import"./src BJXL0kr5.js";import"./chunk WYO6CB5R IPhMpwlv.js";import"./chunk ICXQ74PX oIZRA21W.js";import"./chunk HOUHSVGY B4ApBCAi.js";import"./chunk Q4XR5HBZ 0vSsliLn.js";import"./chunk 7BUUIJ7U Bb538aSH.js";import"./chunk OGEWGWER DJ9slR z.js";import"./chunk 32BRIVSS TA9WhXux.js";import"./chunk XXDRQBXY CTt5IdBc.js";import"./chunk VR4S4FIN DoSmwU1c.js";import"./...

### android/app/src/main/assets/public/assets/classDiagram-v2-EOCWNBFH-cn_j6P97.js
- Type: code
- Size: 780 bytes
- Words: 52
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import"./src BJXL0kr5.js";import"./chunk WYO6CB5R IPhMpwlv.js";import"./chunk ICXQ74PX oIZRA21W.js";import"./chunk HOUHSVGY B4ApBCAi.js";import"./chunk Q4XR5HBZ 0vSsliLn.js";import"./chunk 7BUUIJ7U Bb538aSH.js";import"./chunk OGEWGWER DJ9slR z.js";import"./chunk 32BRIVSS TA9WhXux.js";import"./chunk XXDRQBXY CTt5IdBc.js";import"./chunk VR4S4FIN DoSmwU1c.js";import"./...

### android/app/src/main/assets/public/assets/cose-bilkent-JH36ORCC-kAVJj0Ee.js
- Type: code
- Size: 81438 bytes
- Words: 6758
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{o as e,s as t}from"./index BtSsEH4M.js";import{n}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as r,p as i}from"./src BJXL0kr5.js";import{t as a}from"./cytoscape.esm B3I8pqwA.js";var o=e e,t = { function n,r {typeof e== &&typeof t== ?t.exports=r :typeof define== &&define.amd?define ,r :typeof e== ?e.layoutBase=r :n.layoutBase=r } e,function {return function e {var t={};function n r {if t r return t r .exports...

### android/app/src/main/assets/public/assets/cynefin-VYW2F7L2-yn0JrirS.js
- Type: code
- Size: 126 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{A as e}from"./mermaid parser.core CosqdZY .js";export{e as createCynefinServices};

### android/app/src/main/assets/public/assets/cynefinDiagram-TSTJHNR4-BGELrosY.js
- Type: code
- Size: 9913 bytes
- Words: 794
- Lines: 62
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./mermaid parser.core CosqdZY .js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n}from"./src BJXL0kr5.js";import{D as r,H as i,K as a,U as o,a as s,b as c,c as l,f as u,v as d,w as f,y as p}from"./chunk WYO6CB5R IPhMpwlv.js";import{i as m}from"./chunk ICXQ74PX oIZRA21W.js";import{t as h}from"./chunk VAUOI2AC CxLYy1wT.js";import{t as g}from"./chunk JWPE2WC7 DVXcaiue.js";var =t = {...

### android/app/src/main/assets/public/assets/cytoscape.esm-B3I8pqwA.js
- Type: code
- Size: 435314 bytes
- Words: 16464
- Lines: 321
- Headings: None
- Tags: None
- Aliases: None
- Symbols: function:e@1
- Imports: None
- Excerpt: function e e,t { t==null t e.length && t=e.length ;for var n=0,r=Array t ;n<t;n++ r n =e n ;return r}function t e {if Array.isArray e return e}function n t {if Array.isArray t return e t }function r e,t {if ! e instanceof t throw TypeError }function i e,t {for var n=0;n<t.length;n++ {var r=t n ;r.enumerable=r.enumerable !1,r.configurable=!0, in r&& r.writable=!0 ,Object.defineProperty e,h r.key ,r }}function a e,t...

### android/app/src/main/assets/public/assets/dagre-CXRCoUWR.js
- Type: code
- Size: 32056 bytes
- Words: 4483
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{ as e,A as t,B as n,C as r,D as i,E as a,F as o,H as s,I as c,J as l,K as u,L as d,N as f,O as p,Q as m,S as h,T as g,U as ,V as v,W as ee,X as y,Y as te,Z as b, as ne,a as x,c as re,d as ie,et as S,f as C,h as ae,i as w,it as oe,k as se,m as ce,n as T,nt as le,o as E,p as ue,r as D,s as de,t as O,tt as fe,u as pe,z as me}from"./graphlib B8gBHxth.js";import{a as he,c as k,d as ge,f as e,i as ve,l as ye,n as...

### android/app/src/main/assets/public/assets/dagre-VKFMJZFB-cjvoWlCK.js
- Type: code
- Size: 8811 bytes
- Words: 733
- Lines: 4
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t}from"./src BJXL0kr5.js";import{x as n}from"./chunk WYO6CB5R IPhMpwlv.js";import"./chunk ICXQ74PX oIZRA21W.js";import"./chunk HOUHSVGY B4ApBCAi.js";import"./chunk Q4XR5HBZ 0vSsliLn.js";import"./chunk 7BUUIJ7U Bb538aSH.js";import{n as r}from"./chunk OGEWGWER DJ9slR z.js";import{t as i}from"./graphlib B8gBHxth.js";import{t as a}from"./dagre CXRCoUWR.js";i...

### android/app/src/main/assets/public/assets/defaultLocale-C8Fc0cco.js
- Type: code
- Size: 4646 bytes
- Words: 629
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: function:e@1
- Imports: None
- Excerpt: function e e {return Math.abs e=Math.round e =1e21?e.toLocaleString .replace /,/g, :e.toString 10 }function t e,t {if !isFinite e e===0 return null;var n= e=t?e.toExponential t 1 :e.toExponential .indexOf ,r=e.slice 0,n ;return r.length 1?r 0 +r.slice 2 :r,+e.slice n+1 }function n e {return e=t Math.abs e ,e?e 1 :NaN}function r e,t {return function n,r {for var i=n.length,a= ,o=0,s=e 0 ,c=0;i 0&&s 0&& c+s+1 r&& s=...

### android/app/src/main/assets/public/assets/diagram-FQU43EPY-DjEMCwOO.js
- Type: code
- Size: 10656 bytes
- Words: 782
- Lines: 3
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{T as e}from"./chunk KEIR6QF5 BfrZ3jm6.js";import{n as t}from"./mermaid parser.core CosqdZY .js";import{n}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as r,p as i}from"./src BJXL0kr5.js";import{H as a,K as o,U as s,Y as c,a as l,b as u,f as d,v as f,w as p,x as m,y as h,z as g}from"./chunk WYO6CB5R IPhMpwlv.js";import{ ,i as ee,t as te}from"./chunk ICXQ74PX oIZRA21W.js";import{t as ne}from"./chunk JWPE2WC7 DV...

### android/app/src/main/assets/public/assets/diagram-G47NLZAW-CFu0QIkP.js
- Type: code
- Size: 15741 bytes
- Words: 1463
- Lines: 24
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./mermaid parser.core CosqdZY .js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n,p as r}from"./src BJXL0kr5.js";import{D as i,H as a,K as o,U as s,a as c,b as l,c as u,f as d,v as f,w as p,y as m}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as h}from"./ordinal hYBb2elL.js";import{t as g}from"./defaultLocale C8Fc0cco.js";import{i as }from"./chunk ICXQ74PX oIZRA21W.js";import{t as...

### android/app/src/main/assets/public/assets/diagram-NH7WQ7WH-n-jeIvll.js
- Type: code
- Size: 4282 bytes
- Words: 316
- Lines: 24
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./mermaid parser.core CosqdZY .js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n}from"./src BJXL0kr5.js";import{H as r,K as i,U as a,a as o,b as s,c,f as l,v as u,w as d,y as f}from"./chunk WYO6CB5R IPhMpwlv.js";import{i as p}from"./chunk ICXQ74PX oIZRA21W.js";import{t as m}from"./chunk VAUOI2AC CxLYy1wT.js";import{t as h}from"./chunk JWPE2WC7 DVXcaiue.js";var g=l.packet, =class...

### android/app/src/main/assets/public/assets/diagram-OA4YK3LP-imqduiBg.js
- Type: code
- Size: 8315 bytes
- Words: 717
- Lines: 30
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./mermaid parser.core CosqdZY .js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n}from"./src BJXL0kr5.js";import{H as r,K as i,U as a,a as o,b as s,c,f as l,v as u,w as d,y as f,z as p}from"./chunk WYO6CB5R IPhMpwlv.js";import{i as m}from"./chunk ICXQ74PX oIZRA21W.js";import{t as h}from"./chunk VAUOI2AC CxLYy1wT.js";import{t as g}from"./chunk JWPE2WC7 DVXcaiue.js";import{r as ,t...

### android/app/src/main/assets/public/assets/diagram-WEI45ONY-D3Avqga5.js
- Type: code
- Size: 5921 bytes
- Words: 493
- Lines: 41
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./mermaid parser.core CosqdZY .js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n}from"./src BJXL0kr5.js";import{D as r,H as i,K as a,U as o,a as s,b as c,c as l,f as u,v as d,w as f,y as p}from"./chunk WYO6CB5R IPhMpwlv.js";import{i as m}from"./chunk ICXQ74PX oIZRA21W.js";import{t as h}from"./chunk VAUOI2AC CxLYy1wT.js";import{t as g}from"./chunk JWPE2WC7 DVXcaiue.js";var ={show...

### android/app/src/main/assets/public/assets/dist-eWuB-svD.js
- Type: code
- Size: 2162 bytes
- Words: 219
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{o as e}from"./index BtSsEH4M.js";var t=Math.abs,n=Math.atan2,r=Math.cos,i=Math.max,a=Math.min,o=Math.sin,s=Math.sqrt,c=1e 12,l=Math.PI,u=l/2,d=2 l;function f e {return e 1?0:e< 1?l:Math.acos e }function p e {return e =1?u:e<= 1? u:Math.asin e }var m=e e= {Object.defineProperty e," esModule",{value:!0} ,e.BLANK URL=e.relativeFirstCharacters=e.whitespaceEscapeCharsRegex=e.urlSchemeRegex=e.ctrlCharactersRegex=...

### android/app/src/main/assets/public/assets/ebnfDiagram-CCIWWBDH-CS_zu6N5.js
- Type: code
- Size: 2061 bytes
- Words: 151
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{f as e,t}from"./mermaid parser.core CosqdZY .js";import{n}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as r}from"./src BJXL0kr5.js";import"./chunk WYO6CB5R IPhMpwlv.js";import"./chunk VAUOI2AC CxLYy1wT.js";import{n as i,r as a,t as o}from"./chunk MOJQB5TN B0qIm2NO.js";import{t as s}from"./chunk JWPE2WC7 DVXcaiue.js";var c=e .RailroadEbnf.parser.LangiumParser,l=n e= {let t=e.alternatives.map u ;return t.lengt...

### android/app/src/main/assets/public/assets/erDiagram-Q63AITRT-CqspQ1Qp.js
- Type: code
- Size: 27132 bytes
- Words: 2543
- Lines: 85
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e,t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n,p as r}from"./src BJXL0kr5.js";import{H as i,K as a,U as o,a as s,rt as c,v as l,w as u,x as d,y as f}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as p}from"./channel xhdVd2 5.js";import{c as m,g as h}from"./chunk ICXQ74PX oIZRA21W.js";import"./chunk HOUHSVGY B4ApBCAi.js";import"./chunk Q4XR5HBZ 0vSsliLn.js";import"./chunk 7BUUIJ7U Bb538aSH.js";import...

### android/app/src/main/assets/public/assets/eventmodeling-45OFAUF4-DHaRyZI8.js
- Type: code
- Size: 132 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{O as e}from"./mermaid parser.core CosqdZY .js";export{e as createEventModelingServices};

### android/app/src/main/assets/public/assets/flowDiagram-23GEKE2U-05B9sP2M.js
- Type: code
- Size: 614 bytes
- Words: 39
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./src BJXL0kr5.js";import"./chunk WYO6CB5R IPhMpwlv.js";import"./chunk ICXQ74PX oIZRA21W.js";import"./chunk HOUHSVGY B4ApBCAi.js";import"./chunk Q4XR5HBZ 0vSsliLn.js";import"./chunk 7BUUIJ7U Bb538aSH.js";import"./chunk OGEWGWER DJ9slR z.js";import"./chunk 32BRIVSS TA9WhXux.js";import"./chunk XXDRQBXY CTt5IdBc.js";import"./chunk VR4S4FIN DoSmwU1c.js";import"./chunk C7G6YPKG DevZaZ V.js";import"./chunk ZGVPDN...

### android/app/src/main/assets/public/assets/ganttDiagram-NO4QXBWP-SkzvzuDh.js
- Type: code
- Size: 69428 bytes
- Words: 7842
- Lines: 292
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{o as e,s as t}from"./index BtSsEH4M.js";import{n}from"./chunk Y2CYZVJY DsF7k Jl.js";import{a as r,c as i,d as a,f as o,g as s,i as c,m as l,p as u,s as d,u as f}from"./src BJXL0kr5.js";import{H as p,K as m,U as h,a as g,c as ,s as v,v as y,w as b,x,y as S}from"./chunk WYO6CB5R IPhMpwlv.js";import{a as C,i as w,n as T,r as E,t as D}from"./linear nw9rU0 a.js";import{t as O}from"./init D6jRqBbL.js";import{t as...

### android/app/src/main/assets/public/assets/gitGraph-TEB2WS4Q-K_ZKQS3m.js
- Type: code
- Size: 127 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{E as e}from"./mermaid parser.core CosqdZY .js";export{e as createGitGraphServices};

### android/app/src/main/assets/public/assets/gitGraphDiagram-IHSO6WYX-BbdM1sHt.js
- Type: code
- Size: 29018 bytes
- Words: 2070
- Lines: 106
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./mermaid parser.core CosqdZY .js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n,p as r}from"./src BJXL0kr5.js";import{H as i,K as a,U as o,Y as s,a as c,b as l,f as u,s as d,v as f,w as p,x as m,y as h}from"./chunk WYO6CB5R IPhMpwlv.js";import{g,i as ,m as v}from"./chunk ICXQ74PX oIZRA21W.js";import{t as y}from"./chunk JWPE2WC7 DVXcaiue.js";import{t as b}from"./chunk 2Q5K7J3B C...

### android/app/src/main/assets/public/assets/graphlib-B8gBHxth.js
- Type: code
- Size: 23907 bytes
- Words: 3210
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:e@1
- Imports: None
- Excerpt: var e=typeof global== &&global&&global.Object===Object&&global,t=typeof self== &&self&&self.Object===Object&&self,n=e t Function ,r=n.Symbol,i=Object.prototype,a=i.hasOwnProperty,o=i.toString,s=r?r.toStringTag:void 0;function c e {var t=a.call e,s ,n=e s ;try{e s =void 0;var r=!0}catch{}var i=o.call e ;return r&& t?e s =n:delete e s ,i}var l=Object.prototype.toString;function u e {return l.call e }var d= ,f= ,p=r?...

### android/app/src/main/assets/public/assets/index-BWbEtIfq.css
- Type: code
- Size: 95104 bytes
- Words: 7936
- Lines: 2
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: .markdown body{ base size 16:1rem; base size 24:1.5rem; base size 4:.25rem; base size 40:2.5rem; base size 8:.5rem; base text weight medium:500; base text weight normal:400; base text weight semibold:600; fontStack monospace:ui monospace, SFMono Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace; fontStack sansSerif: apple system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans serif...

### android/app/src/main/assets/public/assets/info-DKCQHKI2-96uDwzVN.js
- Type: code
- Size: 123 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{w as e}from"./mermaid parser.core CosqdZY .js";export{e as createInfoServices};

### android/app/src/main/assets/public/assets/infoDiagram-FWYZ7A6U-BUahkJ10.js
- Type: code
- Size: 658 bytes
- Words: 63
- Lines: 2
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./mermaid parser.core CosqdZY .js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n}from"./src BJXL0kr5.js";import{c as r}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as i}from"./chunk VAUOI2AC CxLYy1wT.js";var a={parse:t async t= {let r=await e ,t ;n.debug r }, },o={version: },s={parser:a,db:{getVersion:t = o.version, },renderer:{draw:t e,t,a = {n.debug +e ;let o=i t ;r o,100,400,!...

### android/app/src/main/assets/public/assets/init-D6jRqBbL.js
- Type: code
- Size: 146 bytes
- Words: 17
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: function:e@1
- Imports: None
- Excerpt: function e e,t {switch arguments.length {case 0:break;case 1:this.range e ;break;default:this.range t .domain e ;break}return this}export{e as t};

### android/app/src/main/assets/public/assets/ishikawaDiagram-FXEZZL3T-w0bOb-b-.js
- Type: code
- Size: 17347 bytes
- Words: 1600
- Lines: 70
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import"./src BJXL0kr5.js";import{H as t,K as n,U as r,a as i,c as a,s as o,v as s,w as c,x as l,y as u}from"./chunk WYO6CB5R IPhMpwlv.js";import{p as d}from"./chunk ICXQ74PX oIZRA21W.js";import{t as f}from"./chunk VAUOI2AC CxLYy1wT.js";import{t as p}from"./rough.esm CSKSodPl.js";var m= function {var t=e function e,t,n,r {for n ={},r=e.length;r ;n e r =t ;return n},...

### android/app/src/main/assets/public/assets/journeyDiagram-5HDEW3XC-B8jHg_5C.js
- Type: code
- Size: 23208 bytes
- Words: 2090
- Lines: 139
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{p as t}from"./src BJXL0kr5.js";import{H as n,K as r,U as i,a,c as o,v as s,w as c,x as l,y as u}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as d}from"./arc CH6Gzxsm.js";import{t as f}from"./chunk 5VM5RSS4 ZNzvKenW.js";import{a as p,n as m,o as h,s as g}from"./chunk 32BRIVSS TA9WhXux.js";var = function {var t=e function e,t,n,r {for n ={},r=e.length;r ;n e r =...

### android/app/src/main/assets/public/assets/kanban-definition-HUTT4EX6-B07a0otC.js
- Type: code
- Size: 20305 bytes
- Words: 1737
- Lines: 89
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t}from"./src BJXL0kr5.js";import{ as n,J as r,et as i,f as a,nt as o,x as s,z as c}from"./chunk WYO6CB5R IPhMpwlv.js";import"./chunk ICXQ74PX oIZRA21W.js";import{t as l}from"./chunk VAUOI2AC CxLYy1wT.js";import"./chunk HOUHSVGY B4ApBCAi.js";import"./chunk Q4XR5HBZ 0vSsliLn.js";import{t as u}from"./chunk 5VM5RSS4 ZNzvKenW.js";import"./chunk OGEWGWER DJ9sl...

### android/app/src/main/assets/public/assets/katex-CddkPoXu.js
- Type: code
- Size: 258881 bytes
- Words: 17453
- Lines: 257
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:e@1
- Imports: None
- Excerpt: var e=class e extends Error{constructor t,n {var r= +t,i,a,o=n&&n.loc;if o&&o.start<=o.end {var s=o.lexer.input;i=o.start,a=o.end,i===s.length?r+= :r+= + i+1 + ;var c=s.slice i,a .replace / ^ /g, ,l=i 15? +s.slice i 15,i :s.slice 0,i ,u=a+15<s.length?s.slice a,a+15 + :s.slice a ;r+=l+c+u}super r ,this.name= ,this.position=void 0,this.length=void 0,this.rawMessage=void 0,Object.setPrototypeOf this,e.prototype ,this...

### android/app/src/main/assets/public/assets/line-DbLsV03u.js
- Type: code
- Size: 943 bytes
- Words: 116
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e,t}from"./path BWPyau1x.js";import{t as n}from"./array BifhSqXX.js";import{rt as r}from"./chunk ICXQ74PX oIZRA21W.js";function i e {return e 0 }function a e {return e 1 }function o o,s {var c=e !0 ,l=null,u=r,d=null,f=t p ;o=typeof o== ?o:o===void 0?i:e o ,s=typeof s== ?s:s===void 0?a:e s ;function p e {var t,r= e=n e .length,i,a=!1,p;for l?? d=u p=f ,t=0;t<=r;++t ! t<r&&c i=e t ,t,e ===a&& a=!a ?d.li...

### android/app/src/main/assets/public/assets/linear-nw9rU0-a.js
- Type: code
- Size: 5524 bytes
- Words: 849
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{l as e,n as t,o as n,r,t as i}from"./src BJXL0kr5.js";import{i as a,n as o,r as s,t as c}from"./defaultLocale C8Fc0cco.js";import{t as l}from"./init D6jRqBbL.js";function u e,t {return e==null t==null?NaN:e<t? 1:e t?1:e =t?0:NaN}function d e,t {return e==null t==null?NaN:t<e? 1:t e?1:t =e?0:NaN}function f e {let t,n,r;e.length===2? t=e===u e===d?e:p,n=e,r=e : t=u,n= t,n = u e t ,n ,r= t,n = e t n ;function...

### android/app/src/main/assets/public/assets/map-DsCK-0Cs.js
- Type: code
- Size: 5032 bytes
- Words: 691
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{ as e,F as t,G as n,H as r,I as i,M as a,P as o,Q as s,R as c,S as ee,Z as l, as u,b as d,f,g as p,it as m,j as h,k as g,l as ,q as v,rt as y,tt as b,v as te,w as ne,x as re,y as ie,z as x}from"./graphlib B8gBHxth.js";var S=Object.create,ae=function {function e {}return function t {if !l t return{};if S return S t ;e.prototype=t;var n=new e;return e.prototype=void 0,n}} ;function C e,t {var n= 1,r=e.length;...

### android/app/src/main/assets/public/assets/mermaid-parser.core-CosqdZY-.js
- Type: code
- Size: 16747 bytes
- Words: 1463
- Lines: 7
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:__vite__mapDeps@1
- Imports: None
- Excerpt: const vite mapDeps= i,m= vite mapDeps,d= m.f m.f= "./info DKCQHKI2 96uDwzVN.js","./chunk KEIR6QF5 BfrZ3jm6.js","./packet 7NZHBO7P Biht58W3.js","./pie RZYD4A2V gqW28UP8.js","./treeView QDETBFTQ DV3lkkWV.js","./architecture TIHT7OUA BIMz0urW.js","./gitGraph TEB2WS4Q K ZKQS3m.js","./eventmodeling 45OFAUF4 DHaRyZI8.js","./radar I7S5WNFK CO6FY B5.js","./railroad 3IZDKUUU DE20 qI4.js","./railroad ebnf EBAXGLYW ZRc9EbOc....

### android/app/src/main/assets/public/assets/mermaid.core-CXFQ1THc.js
- Type: code
- Size: 35287 bytes
- Words: 3020
- Lines: 11
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:__vite__mapDeps@1
- Imports: None
- Excerpt: const vite mapDeps= i,m= vite mapDeps,d= m.f m.f= "./c4Diagram LMCZKHZV D9pjkoGS.js","./chunk Y2CYZVJY DsF7k Jl.js","./src BJXL0kr5.js","./index BtSsEH4M.js","./index BWbEtIfq.css","./chunk WYO6CB5R IPhMpwlv.js","./dist eWuB svD.js","./chunk ICXQ74PX oIZRA21W.js","./chunk 32BRIVSS TA9WhXux.js","./flowDiagram 23GEKE2U 05B9sP2M.js","./chunk HOUHSVGY B4ApBCAi.js","./chunk Q4XR5HBZ 0vSsliLn.js","./chunk 7BUUIJ7U Bb538...

### android/app/src/main/assets/public/assets/mindmap-definition-LN4V7U3C-bOcZmVQV.js
- Type: code
- Size: 23492 bytes
- Words: 1940
- Lines: 96
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t}from"./src BJXL0kr5.js";import{ as n,b as r,et as i,f as a,k as o,nt as s,x as c,z as l}from"./chunk WYO6CB5R IPhMpwlv.js";import"./chunk ICXQ74PX oIZRA21W.js";import"./chunk HOUHSVGY B4ApBCAi.js";import"./chunk Q4XR5HBZ 0vSsliLn.js";import"./chunk 7BUUIJ7U Bb538aSH.js";import"./chunk OGEWGWER DJ9slR z.js";import{t as u}from"./chunk XXDRQBXY CTt5IdBc.j...

### android/app/src/main/assets/public/assets/ordinal-hYBb2elL.js
- Type: code
- Size: 1174 bytes
- Words: 173
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{t as e}from"./init D6jRqBbL.js";var t=class extends Map{constructor e,t=a {if super ,Object.defineProperties this,{ intern:{value:new Map}, key:{value:t}} ,e!=null for let t,n of e this.set t,n }get e {return super.get n this,e }has e {return super.has n this,e }set e,t {return super.set r this,e ,t }delete e {return super.delete i this,e }};function n { intern:e, key:t},n {let r=t n ;return e.has r ?e.get...

### android/app/src/main/assets/public/assets/packet-7NZHBO7P-Biht58W3.js
- Type: code
- Size: 125 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{S as e}from"./mermaid parser.core CosqdZY .js";export{e as createPacketServices};

### android/app/src/main/assets/public/assets/path-BWPyau1x.js
- Type: code
- Size: 2314 bytes
- Words: 242
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:e@1
- Imports: None
- Excerpt: var e=Math.PI,t=2 e,n=1e 6,r=t n;function i e {this. +=e 0 ;for let t=1,n=e.length;t<n;++t this. +=arguments t +e t }function a e {let t=Math.floor e ;if ! t =0 throw Error ;if t 15 return i;let n=10 t;return function e {this. +=e 0 ;for let t=1,r=e.length;t<r;++t this. +=Math.round arguments t n /n+e t }}var o=class{constructor e {this. x0=this. y0=this. x1=this. y1=null,this. = ,this. append=e==null?i:a e }moveT...

### android/app/src/main/assets/public/assets/pegDiagram-2B236MQR-CKVcnrn1.js
- Type: code
- Size: 2013 bytes
- Words: 156
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{t as e,u as t}from"./mermaid parser.core CosqdZY .js";import{n}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as r}from"./src BJXL0kr5.js";import"./chunk WYO6CB5R IPhMpwlv.js";import"./chunk VAUOI2AC CxLYy1wT.js";import{n as i,r as a,t as o}from"./chunk MOJQB5TN B0qIm2NO.js";import{t as s}from"./chunk JWPE2WC7 DVXcaiue.js";var c=t .RailroadPeg.parser.LangiumParser,l=n e= {let t=e.alternatives.map u ;return t.l...

### android/app/src/main/assets/public/assets/pie-RZYD4A2V-gqW28UP8.js
- Type: code
- Size: 122 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{b as e}from"./mermaid parser.core CosqdZY .js";export{e as createPieServices};

### android/app/src/main/assets/public/assets/pieDiagram-ENE6RG2P-E_E3a9B_.js
- Type: code
- Size: 6240 bytes
- Words: 546
- Lines: 39
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./mermaid parser.core CosqdZY .js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n}from"./src BJXL0kr5.js";import{H as r,K as i,U as a,a as o,c as s,f as c,v as l,w as u,x as d,y as f}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as p}from"./ordinal hYBb2elL.js";import{n as m}from"./path BWPyau1x.js";import{m as h}from"./dist eWuB svD.js";import{t as g}from"./arc CH6Gzxsm.js";import...

### android/app/src/main/assets/public/assets/quadrantDiagram-ABIIQ3AL-Hr6lp6Ll.js
- Type: code
- Size: 33549 bytes
- Words: 2634
- Lines: 7
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t,p as n}from"./src BJXL0kr5.js";import{D as r,H as i,K as a,U as o,a as s,c,f as l,v as u,w as d,x as f,y as p,z as m}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as h}from"./linear nw9rU0 a.js";var g= function {var t=e function e,t,n,r {for n ={},r=e.length;r ;n e r =t ;return n}, ,n= 1,3 ,r= 1,4 ,i= 1,5 ,a= 1,6 ,o= 1,7 ,s= 1,4,5,10,12,13,14,15,18,25,35...

### android/app/src/main/assets/public/assets/radar-I7S5WNFK-CO6FY-B5.js
- Type: code
- Size: 124 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{v as e}from"./mermaid parser.core CosqdZY .js";export{e as createRadarServices};

### android/app/src/main/assets/public/assets/railroad-3IZDKUUU-DE20_qI4.js
- Type: code
- Size: 127 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{g as e}from"./mermaid parser.core CosqdZY .js";export{e as createRailroadServices};

### android/app/src/main/assets/public/assets/railroad-abnf-AHOZXSZD-MTZJuys0.js
- Type: code
- Size: 131 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{m as e}from"./mermaid parser.core CosqdZY .js";export{e as createRailroadAbnfServices};

### android/app/src/main/assets/public/assets/railroad-ebnf-EBAXGLYW-ZRc9EbOc.js
- Type: code
- Size: 131 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{f as e}from"./mermaid parser.core CosqdZY .js";export{e as createRailroadEbnfServices};

### android/app/src/main/assets/public/assets/railroad-peg-LSFZ7HO6-BPoW78Ux.js
- Type: code
- Size: 130 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{u as e}from"./mermaid parser.core CosqdZY .js";export{e as createRailroadPegServices};

### android/app/src/main/assets/public/assets/railroadDiagram-RFXS5EU6-1jGRuAkI.js
- Type: code
- Size: 1661 bytes
- Words: 115
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{g as e,t}from"./mermaid parser.core CosqdZY .js";import{n}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as r}from"./src BJXL0kr5.js";import"./chunk WYO6CB5R IPhMpwlv.js";import"./chunk VAUOI2AC CxLYy1wT.js";import{n as i,r as a,t as o}from"./chunk MOJQB5TN B0qIm2NO.js";import{t as s}from"./chunk JWPE2WC7 DVXcaiue.js";var c=e .Railroad.parser.LangiumParser,l=n e= {switch e. type {case :return{type: ,value:e.va...

### android/app/src/main/assets/public/assets/requirementDiagram-TGXJPOKE-DlpuMsyn.js
- Type: code
- Size: 31034 bytes
- Words: 2584
- Lines: 84
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e,t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n}from"./src BJXL0kr5.js";import{H as r,K as i,U as a,a as o,b as s,v as c,w as l,x as u,y as d}from"./chunk WYO6CB5R IPhMpwlv.js";import{g as f}from"./chunk ICXQ74PX oIZRA21W.js";import"./chunk HOUHSVGY B4ApBCAi.js";import"./chunk Q4XR5HBZ 0vSsliLn.js";import"./chunk 7BUUIJ7U Bb538aSH.js";import"./chunk OGEWGWER DJ9slR z.js";import{t as p}from"./chunk...

### android/app/src/main/assets/public/assets/rough.esm-CSKSodPl.js
- Type: code
- Size: 27103 bytes
- Words: 4002
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: function:e@1
- Imports: None
- Excerpt: function e e,t,n {if e&&e.length {let r,i =t,a=Math.PI/180 n,o=Math.cos a ,s=Math.sin a ;for let t of e {let e,n =t;t 0 = e r o n i s+r,t 1 = e r s+ n i o+i}}}function t e,t {return e 0 ===t 0 &&e 1 ===t 1 }function n n,r,i,a=1 {let o=i,s=Math.max r,.1 ,c=n 0 &&n 0 0 &&typeof n 0 0 == ? n :n,l= 0,0 ;if o for let t of c e t,l,o ;let u=function e,n,r {let i= ;for let n of e {let e= ...n ;t e 0 ,e e.length 1 e.push e...

### android/app/src/main/assets/public/assets/sankeyDiagram-HTMAVEWB-Ce0ZmrMA.js
- Type: code
- Size: 22824 bytes
- Words: 2523
- Lines: 40
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{p as t}from"./src BJXL0kr5.js";import{H as n,J as r,K as i,U as a,a as o,d as s,s as c,v as l,w as u,x as d,y as f}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as p}from"./ordinal hYBb2elL.js";function m e {for var t=e.length/6 0,n=Array t ,r=0;r<t; n r = +e.slice r 6,++r 6 ;return n}var h=m ;function g e,t {let n;if t===void 0 for let t of e t!=null&& n<t n==...

### android/app/src/main/assets/public/assets/sequenceDiagram-DBY2YBRQ-Cslk9WYi.js
- Type: code
- Size: 115868 bytes
- Words: 8668
- Lines: 162
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t,p as n}from"./src BJXL0kr5.js";import{A as r,F as i,G as a,H as o,K as s,O as c,U as l,a as u,b as d,c as f,i as p,r as m,s as h,v as g,w as ,x as v,y,z as b}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as x}from"./dist eWuB svD.js";import{g as S,p as C}from"./chunk ICXQ74PX oIZRA21W.js";import{a as w,c as T,i as E,n as D,r as O,s as k}from"./chunk 32BR...

### android/app/src/main/assets/public/assets/sizeCapture-X5ZJPWSS-B0uUizjq.js
- Type: code
- Size: 875 bytes
- Words: 74
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";var t=1;function n {if ! typeof globalThis return globalThis}e n, ;function r {return!!n ?.mermaidCaptureSizes}e r, ;function i {return typeof location ? : }e i, ;function a e,t {let r=n ;if !r return;let i=t.node ,a= i&& in i?i.ownerSVGElement:null ??i ?.id?? ;r.mermaidCapturedSizes??= ;let o={svgId:a,sizes:e};r.mermaidCapturedSizes.push o ,r.mermaidLastCapturedSiz...

### android/app/src/main/assets/public/assets/src-BJXL0kr5.js
- Type: code
- Size: 45727 bytes
- Words: 5277
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{o as e,s as t}from"./index BtSsEH4M.js";import{n}from"./chunk Y2CYZVJY DsF7k Jl.js";var r=e e,t = { function n,r {typeof e== &&t!==void 0?t.exports=r :typeof define== &&define.amd?define r : n=typeof globalThis< ?globalThis:n self .dayjs=r } e, function {var e=1e3,t=6e4,n=36e5,r= ,i= ,a= ,o= ,s= ,c= ,l= ,u= ,d= ,f= ,p= ,m=/^ \d{4} / ? \d{1,2} ? / ? \d{0,2} Tt\s \d{1,2} ?:? \d{1,2} ?:? \d{1,2} ? .: ? \d+ ? /...

### android/app/src/main/assets/public/assets/stateDiagram-2N3HPSRC-x5QxUvlG.js
- Type: code
- Size: 10642 bytes
- Words: 1002
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t,p as n}from"./src BJXL0kr5.js";import{O as r,c as i,s as a,x as o}from"./chunk WYO6CB5R IPhMpwlv.js";import{et as s,g as c}from"./chunk ICXQ74PX oIZRA21W.js";import{t as l}from"./line DbLsV03u.js";import"./chunk HOUHSVGY B4ApBCAi.js";import"./chunk Q4XR5HBZ 0vSsliLn.js";import"./chunk 7BUUIJ7U Bb538aSH.js";import"./chunk OGEWGWER DJ9slR z.js";import{t...

### android/app/src/main/assets/public/assets/stateDiagram-v2-6OUMAXLB-DpKXxr3P.js
- Type: code
- Size: 783 bytes
- Words: 54
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import"./src BJXL0kr5.js";import"./chunk WYO6CB5R IPhMpwlv.js";import"./chunk ICXQ74PX oIZRA21W.js";import"./chunk HOUHSVGY B4ApBCAi.js";import"./chunk Q4XR5HBZ 0vSsliLn.js";import"./chunk 7BUUIJ7U Bb538aSH.js";import"./chunk OGEWGWER DJ9slR z.js";import"./chunk 32BRIVSS TA9WhXux.js";import"./chunk XXDRQBXY CTt5IdBc.js";import"./chunk VR4S4FIN DoSmwU1c.js";import"./...

### android/app/src/main/assets/public/assets/swimlanes-5IMT3BWC-cqwfyrHk.js
- Type: code
- Size: 114127 bytes
- Words: 14567
- Lines: 2
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:__vite__mapDeps@1
- Imports: None
- Excerpt: const vite mapDeps= i,m= vite mapDeps,d= m.f m.f= "./sizeCapture X5ZJPWSS B0uUizjq.js","./chunk Y2CYZVJY DsF7k Jl.js" = i.map i= d i ; import{t as e}from"./index BtSsEH4M.js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n}from"./src BJXL0kr5.js";import{b as r,x as i}from"./chunk WYO6CB5R IPhMpwlv.js";import{g as a}from"./chunk ICXQ74PX oIZRA21W.js";import"./chunk HOUHSVGY B4ApBCAi.js";import"./chun...

### android/app/src/main/assets/public/assets/swimlanesDiagram-G3AALYLV-CUHhym69.js
- Type: code
- Size: 873 bytes
- Words: 53
- Lines: 8
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import"./src BJXL0kr5.js";import"./chunk WYO6CB5R IPhMpwlv.js";import"./chunk ICXQ74PX oIZRA21W.js";import"./chunk HOUHSVGY B4ApBCAi.js";import"./chunk Q4XR5HBZ 0vSsliLn.js";import"./chunk 7BUUIJ7U Bb538aSH.js";import"./chunk OGEWGWER DJ9slR z.js";import"./chunk 32BRIVSS TA9WhXux.js";import"./chunk XXDRQBXY CTt5IdBc.js";import"./chunk VR4S4FIN DoSmwU1c.js";import"./...

### android/app/src/main/assets/public/assets/timeline-definition-FHXFAJF6-BGU9-ylc.js
- Type: code
- Size: 30423 bytes
- Words: 2619
- Lines: 120
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e,t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n,p as r}from"./src BJXL0kr5.js";import{ as i,J as a,a as o,b as s,et as c,nt as l,o as u,x as d}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as f}from"./arc CH6Gzxsm.js";import{p}from"./chunk ICXQ74PX oIZRA21W.js";import{t as m}from"./chunk VAUOI2AC CxLYy1wT.js";var h= function {var t=e function e,t,n,r {for n ={},r=e.length;r ;n e r =t ;return n}, ,n=...

### android/app/src/main/assets/public/assets/treemap-6X3UGDF4-uF-OMWZe.js
- Type: code
- Size: 126 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{o as e}from"./mermaid parser.core CosqdZY .js";export{e as createTreemapServices};

### android/app/src/main/assets/public/assets/treeView-QDETBFTQ-DV3lkkWV.js
- Type: code
- Size: 127 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{c as e}from"./mermaid parser.core CosqdZY .js";export{e as createTreeViewServices};

### android/app/src/main/assets/public/assets/vennDiagram-L72KCM5P-tbAvfqU3.js
- Type: code
- Size: 41193 bytes
- Words: 5001
- Lines: 34
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{p as t}from"./src BJXL0kr5.js";import{ as n,H as r,K as i,U as a,a as o,b as s,c,et as l,f as u,nt as d,tt as f,v as p,w as m,y as h}from"./chunk WYO6CB5R IPhMpwlv.js";import{i as g}from"./chunk ICXQ74PX oIZRA21W.js";import{t as }from"./chunk VAUOI2AC CxLYy1wT.js";import{t as v}from"./rough.esm CSKSodPl.js";var y= e,t = f e, , t ,b=1e 10;function x e,t {let n...

### android/app/src/main/assets/public/assets/wardley-OPB4EBWU-C6D03tvZ.js
- Type: code
- Size: 126 bytes
- Words: 10
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import"./chunk KEIR6QF5 BfrZ3jm6.js";import{i as e}from"./mermaid parser.core CosqdZY .js";export{e as createWardleyServices};

### android/app/src/main/assets/public/assets/wardleyDiagram-EHGQE667-CrgxZRJQ.js
- Type: code
- Size: 25229 bytes
- Words: 2080
- Lines: 78
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./mermaid parser.core CosqdZY .js";import{n as t}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as n}from"./src BJXL0kr5.js";import{D as r,H as i,K as a,U as o,a as s,b as c,c as l,v as u,w as d,x as f,y as p}from"./chunk WYO6CB5R IPhMpwlv.js";import{i as m}from"./chunk ICXQ74PX oIZRA21W.js";import{t as h}from"./chunk VAUOI2AC CxLYy1wT.js";import{t as g}from"./chunk JWPE2WC7 DVXcaiue.js";var =t e,t...

### android/app/src/main/assets/public/assets/web-Bb5i2rDB.js
- Type: code
- Size: 844 bytes
- Words: 47
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{r as e}from"./index BtSsEH4M.js";var t=class extends e{constructor {super ,this.handleVisibilityChange= = {let e={isActive:document.hidden!==!0};this.notifyListeners ,e ,document.hidden?this.notifyListeners ,null :this.notifyListeners ,null },document.addEventListener ,this.handleVisibilityChange,!1 }exitApp {throw this.unimplemented }async getInfo {throw this.unimplemented }async getLaunchUrl {return{url:...

### android/app/src/main/assets/public/assets/web-BBuT3JoK.js
- Type: code
- Size: 1192 bytes
- Words: 127
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{r as e}from"./index BtSsEH4M.js";var t=class extends e{constructor {super ...arguments ,this.group= }async configure {group:e} {typeof e== && this.group=e }async get e {return{value:this.impl.getItem this.applyPrefix e.key }}async set e {this.impl.setItem this.applyPrefix e.key ,e.value }async remove e {this.impl.removeItem this.applyPrefix e.key }async keys {return{keys:this.rawKeys .map e= e.substring thi...

### android/app/src/main/assets/public/assets/web-C0UhavPE.js
- Type: code
- Size: 8455 bytes
- Words: 766
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{i as e,n as t,r as n}from"./index BtSsEH4M.js";function r e {let t=e.split .filter e= e!== ,n= ;return t.forEach e= {e=== &&n.length 0&&n n.length 1 !== ?n.pop :n.push e } ,n.join }function i e,t {e=r e ,t=r t ;let n=e.split ,i=t.split ;return e!==t&&n.every e,t = e===i t }var a=class r extends n{constructor {super ...arguments ,this.DB VERSION=1,this.DB NAME= ,this. writeCmds= , , ,this.downloadFile=async...

### android/app/src/main/assets/public/assets/web-Cd80PtRE.js
- Type: code
- Size: 365 bytes
- Words: 27
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{r as e}from"./index BtSsEH4M.js";var t=class extends e{async canShare {return typeof navigator !navigator.share?{value:!1}:{value:!0}}async share e {if typeof navigator !navigator.share throw this.unavailable ;return await navigator.share {title:e.title,text:e.text,url:e.url} ,{}}};export{t as ShareWeb};

### android/app/src/main/assets/public/assets/xychartDiagram-FW5EYKEG-BxAOdxHf.js
- Type: code
- Size: 41641 bytes
- Words: 2101
- Lines: 7
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: import{n as e}from"./chunk Y2CYZVJY DsF7k Jl.js";import{m as t}from"./src BJXL0kr5.js";import{D as n,H as r,K as i,U as a,a as o,b as s,c,f as l,v as u,w as d,y as f,z as p}from"./chunk WYO6CB5R IPhMpwlv.js";import{t as m}from"./linear nw9rU0 a.js";import{t as h}from"./ordinal hYBb2elL.js";import{t as g}from"./init D6jRqBbL.js";import{i as }from"./chunk ICXQ74PX oIZRA21W.js";import{t as v}from"./line DbLsV03u.js";...

### android/app/src/main/assets/public/cordova_plugins.js
- Type: code
- Size: 0 bytes
- Words: 0
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: No readable text.

### android/app/src/main/assets/public/cordova.js
- Type: code
- Size: 0 bytes
- Words: 0
- Lines: 1
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: No readable text.

### android/app/src/main/assets/public/index.html
- Type: code
- Size: 29177 bytes
- Words: 2643
- Lines: 548
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!doctype html <html lang="en" <head <meta charset="UTF 8" / <meta http equiv="Content Security Policy" content="default src 'self'; base uri 'none'; object src 'none'; form action 'none'; frame src 'none'; img src 'self' data: blob: https://localhost capacitor:; style src 'self' 'unsafe inline'; script src 'self'; font src 'self' data:; connect src 'self' http://127.0.0.1: ws://127.0.0.1: https://localhost capaci...

### bin/shibanshu-markdown.mjs
- Type: code
- Size: 10831 bytes
- Words: 1192
- Lines: 316
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@10, variable:scheme@11, variable:maxUrlContentBytes@12, variable:args@14, variable:command@15, function:printHelp@55, function:runContextExporter@91, variable:result@93, variable:result@100, function:runStaticPublisher@107, variable:result@109, variable:result@116
- Imports: node:fs/promises@3, node:fs/promises@4, node:child_process@5, node:path@6, node:url@7, node:crypto@8
- Excerpt: !/usr/bin/env node import fsp from 'node:fs/promises'; import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'; import { spawnSync } from 'node:child process'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import crypto from 'node:crypto'; const root = path.resolve path.dirname fileURLToPath import.meta.url , '..' ; const scheme = 'shibanshu markdown'; const maxUrlCo...

### capacitor.config.ts
- Type: code
- Size: 558 bytes
- Words: 57
- Lines: 29
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: @capacitor/cli@1
- Excerpt: import type { CapacitorConfig } from '@capacitor/cli'; const config: CapacitorConfig = { appId: 'com.shibanshujha.shibanshumarkdownviewer', appName: 'Shibanshu Markdown Viewer', webDir: 'dist', server: { androidScheme: 'https' }, plugins: { SplashScreen: { launchAutoHide: true, launchShowDuration: 800, backgroundColor: ' f6f7f9' }, Keyboard: { resize: 'body', resizeOnFullScreen: true } }, android: { buildOptions:...

### CHANGELOG.md
- Type: markdown
- Size: 934 bytes
- Words: 130
- Lines: 15
- Headings: Changelog | 0.1.0
- Tags: None
- Aliases: None
- Symbols: heading:Changelog@1, heading:0.1.0@3
- Imports: None
- Excerpt: Changelog 0.1.0 Added secure Markdown editing and preview surfaces. Added direct file opening, vault opening, local save, save as, autosave recovery, and version history foundations. Added graph and mind map views for Markdown vault navigation. Added local static publishing with search data, backlinks, and graph JSON. Added CLI commands for context export, static publish, note creation, and app URL generation. Add...

### docs/download/index.html
- Type: code
- Size: 5704 bytes
- Words: 654
- Lines: 138
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!doctype html <html lang="en" <head <meta charset="UTF 8" / <meta name="viewport" content="width=device width, initial scale=1.0" / <title Shibanshu Markdown Viewer Download</title <style :root { color scheme: light dark; bg: f7f7f4; surface: ffffff; text: 1f2522; muted: 64706a; border: d9ded8; accent: 236f55; accent 2: 315e9f; } @media prefers color scheme: dark { :root { bg: 111316; surface: 181b20; text: f2f4f...

### docs/four-track-completion-plan.md
- Type: markdown
- Size: 5333 bytes
- Words: 721
- Lines: 106
- Headings: Four-Track Completion Plan | Plan A — Utility: Large-Context Conversion and Context Maps | Objective | In scope | Acceptance checks | Immediate work | Plan B — Cosmetic: Surface, Clarity, and Interaction Polish | Objective | In scope | Acceptance checks | Immediate work | Plan C — Functionality: Core Writing and Reliability | Objective | In scope | Acceptance checks | Immediate work | Plan D — Interaction and Advanced Graph | Objective | In scope | Acceptance checks | Immediate work | Governance
- Tags: None
- Aliases: None
- Symbols: heading:Four-Track Completion Plan@1, heading:Plan A — Utility: Large-Context Conversion and Context Maps@7, heading:Objective@9, heading:In scope@12, heading:Acceptance checks@18, heading:Immediate work@24, heading:Plan B — Cosmetic: Surface, Clarity, and Interaction Polish@31, heading:Objective@33, heading:In scope@36, heading:Acceptance checks@42, heading:Immediate work@48, heading:Plan C — Functionality: Core Writing and Reliability@56
- Imports: None
- Excerpt: Four Track Completion Plan This document turns the remaining gap closure work into four independent plans , each with its own objective, scope, and verification gates. The app remains free, offline capable, and local first. No feature in these plans depends on a paid account or cloud requirement. Plan A — Utility: Large Context Conversion and Context Maps Objective Make fast, reliable, and trustworthy for large lo...

### docs/marketing/ad-creatives.md
- Type: markdown
- Size: 6685 bytes
- Words: 728
- Lines: 206
- Headings: Ad Creatives — Shibanshu Markdown MCP | Ad 1: "The Blind Spot" (Problem → Solution) | Ad 2: "The Map" (Visual metaphor) | Ad 3: "The Numbers" (Benchmark-driven) | Ad 4: "The Before/After" (Screencast-style) | Ad 5: "The Impossible" (Edge case that sells) | Ad 6: "The Dev Tool Tax" (Cost angle — for API users) | Reddit Post Templates | r/ClaudeAI Post: | r/programming Post: | Hacker News Submission
- Tags: None
- Aliases: None
- Symbols: heading:Ad Creatives — Shibanshu Markdown MCP@1, heading:Ad 1: "The Blind Spot" (Problem → Solution)@3, heading:Ad 2: "The Map" (Visual metaphor)@17, heading:Ad 3: "The Numbers" (Benchmark-driven)@33, heading:Ad 4: "The Before/After" (Screencast-style)@55, heading:Ad 5: "The Impossible" (Edge case that sells)@94, heading:Ad 6: "The Dev Tool Tax" (Cost angle — for API users)@118, heading:Reddit Post Templates@150, heading:r/ClaudeAI Post:@152, heading:r/programming Post:@183, heading:Hacker News Submission@199
- Imports: None
- Excerpt: Ad Creatives — Shibanshu Markdown MCP Ad 1: "The Blind Spot" Problem → Solution Visual: Split screen. Left: Claude Code terminal scrolling through 200 file reads, context bar at 95% red. Right: Same terminal, one call, context bar at 7% green. Headline: Your AI coding assistant is wasting 97% of its brainpower reading files. Body: Claude Code reads files one by one to understand your codebase. A 200 file repo burn...

### docs/marketing/ads/ad-3d-graph.html
- Type: code
- Size: 7561 bytes
- Words: 1179
- Lines: 222
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <style { margin: 0; padding: 0; box sizing: border box; } body { background: 0a0e14; overflow: hidden; font family: apple system, BlinkMacSystemFont, 'Segoe UI', sans serif; } canvas { display: block; } .overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer events: none; } .top label { position: absolute; top: 32px; left: 40px; } .top lab...

### docs/marketing/ads/ad-animation.html
- Type: code
- Size: 13122 bytes
- Words: 1312
- Lines: 384
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <title Ad Animation — 30s Loop</title <style {margin:0;padding:0;box sizing:border box} body{background: 000;overflow:hidden;width:1920px;height:1080px} canvas{display:block} </style </head <body <canvas id="c" width="1920" height="1080" </canvas <script const cv=document.getElementById 'c' ,cx=cv.getContext '2d' ,W=1920,H=1080; const TEAL=' 5eead4',PURPLE=' c4b5fd'...

### docs/marketing/ads/ad-apple-premium.html
- Type: code
- Size: 15086 bytes
- Words: 1628
- Lines: 392
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <title shibanshu markdown mcp — Premium Ad</title <style {margin:0;padding:0;box sizing:border box} body{background: 000;overflow:hidden;width:100vw;height:100vh} canvas{display:block;position:fixed;top:0;left:0} </style </head <body <canvas id="c" </canvas <script const cv=document.getElementById 'c' ,cx=cv.getContext '2d' ; let W,H; function rs {W=cv.width=innerWi...

### docs/marketing/ads/ad-athena-final.html
- Type: code
- Size: 18784 bytes
- Words: 2003
- Lines: 463
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <style @import url 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;0,800;1,300&family=Space+Mono:wght@400;700&display=swap' ; {margin:0;padding:0;box sizing:border box} body{background: 000;overflow:hidden} canvas{display:block} </style </head <body <canvas id="c" </canvas <script const cv=document.getElementById 'c' ,cx=cv.getCon...

### docs/marketing/ads/ad-atlas.html
- Type: code
- Size: 14532 bytes
- Words: 1480
- Lines: 293
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <style @import url 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;0,800;1,300&family=Space+Mono:wght@400;700&display=swap' ; {margin:0;padding:0;box sizing:border box} body{background: 000;overflow:hidden} canvas{display:block} </style </head <body <canvas id="c" </canvas <script const cv=document.getElementById 'c' ,cx=cv.getCon...

### docs/marketing/ads/ad-before-after.html
- Type: code
- Size: 5111 bytes
- Words: 636
- Lines: 85
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <style { margin: 0; padding: 0; box sizing: border box; } body { background: 0d1117; color: e6edf3; font family: apple system, BlinkMacSystemFont, 'Segoe UI', sans serif; display: flex; justify content: center; align items: center; min height: 100vh; } .card { width: 1200px; padding: 60px; } .label { font size: 14px; text transform: uppercase; letter spacing: 2px; c...

### docs/marketing/ads/ad-benchmark.html
- Type: code
- Size: 3778 bytes
- Words: 513
- Lines: 71
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <style { margin: 0; padding: 0; box sizing: border box; } body { background: 0d1117; color: e6edf3; font family: apple system, BlinkMacSystemFont, 'Segoe UI', sans serif; display: flex; justify content: center; align items: center; min height: 100vh; } .card { width: 1200px; padding: 80px; } .label { font size: 14px; text transform: uppercase; letter spacing: 2px; c...

### docs/marketing/ads/ad-emotion.html
- Type: code
- Size: 13162 bytes
- Words: 1374
- Lines: 267
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <style @import url 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;0,800;1,300;1,400&family=Space+Mono:wght@400;700&display=swap' ; {margin:0;padding:0;box sizing:border box} body{background: 000;overflow:hidden} canvas{display:block} </style </head <body <canvas id="c" </canvas <script const cv=document.getElementById 'c' ,cx=cv....

### docs/marketing/ads/ad-impossible.html
- Type: code
- Size: 1995 bytes
- Words: 286
- Lines: 39
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <style { margin: 0; padding: 0; box sizing: border box; } body { background: 0d1117; color: e6edf3; font family: apple system, BlinkMacSystemFont, 'Segoe UI', sans serif; display: flex; justify content: center; align items: center; min height: 100vh; } .card { width: 1200px; height: 675px; padding: 80px; display: flex; flex direction: column; justify content: center...

### docs/marketing/ads/ad-resourceai-live.html
- Type: code
- Size: 11817 bytes
- Words: 1811
- Lines: 288
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <title How Context Mapping Works — resourceai in 924 files </title <style { margin: 0; padding: 0; box sizing: border box; } body { background: 0a0e14; color: e6edf3; font family: apple system, BlinkMacSystemFont, 'Segoe UI', sans serif; overflow: hidden; } canvas { position: fixed; top: 0; left: 0; z index: 0; } .ui { position: relative; z index: 1; pointer events:...

### docs/marketing/ads/ad-split.html
- Type: code
- Size: 15760 bytes
- Words: 1748
- Lines: 282
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <style @import url 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;0,800;1,300&family=Space+Mono:wght@400;700&display=swap' ; {margin:0;padding:0;box sizing:border box} body{background: 000;overflow:hidden} canvas{display:block} </style </head <body <canvas id="c" </canvas <script const cv=document.getElementById 'c' ,cx=cv.getCon...

### docs/marketing/ads/explorer-resourceai.html
- Type: code
- Size: 169228 bytes
- Words: 6922
- Lines: 417
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <title resourceai in — Interactive Code Graph 350 files, 201 connections </title <style {margin:0;padding:0;box sizing:border box} body{background: 0a0e14;color: e6edf3;font family: apple system,BlinkMacSystemFont,'Segoe UI',sans serif;overflow:hidden} canvas{display:block;cursor:grab} canvas:active{cursor:grabbing} detail{position:fixed;right:0;top:0;width:360px;he...

### docs/marketing/ads/explorer-v2.html
- Type: code
- Size: 171173 bytes
- Words: 6618
- Lines: 427
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <title resourceai in — Code Architecture Graph</title <style {margin:0;padding:0;box sizing:border box} body{background: 08090c;color: e6edf3;font family:'Inter', apple system,BlinkMacSystemFont,'Segoe UI',sans serif;overflow:hidden} @import url 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=sw...

### docs/marketing/ads/explorer-v3.html
- Type: code
- Size: 171131 bytes
- Words: 6595
- Lines: 394
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <title resourceai in — 3D Code Universe</title <style {margin:0;padding:0;box sizing:border box} body{background: 000;color: e6edf3;font family:'Inter', apple system,sans serif;overflow:hidden} @import url 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap' ; canvas{display:block;cursor:grab} canv...

### docs/marketing/ads/explorer-v4.html
- Type: code
- Size: 173766 bytes
- Words: 7003
- Lines: 454
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html <head <meta charset="UTF 8" <title Code Universe — 3D Interactive Graph</title <style {margin:0;padding:0;box sizing:border box} body{background: 000;color: e6edf3;font family: apple system,sans serif;overflow:hidden;user select:none} @import url 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap' ; canvas{display:block;curs...

### docs/marketing/ads/repo-brain-video.html
- Type: code
- Size: 9818 bytes
- Words: 1020
- Lines: 291
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!DOCTYPE html <html lang="en" <head <meta charset="UTF 8" <meta name="viewport" content="width=device width, initial scale=1.0" <title Repo Brain Video</title <style {box sizing:border box} html,body{margin:0;width:100%;height:100%;overflow:hidden;background: 05070a;color: f7f8fb;font family: apple system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans serif} canvas{display:block;wid...

### docs/marketing/go-to-market.md
- Type: markdown
- Size: 11924 bytes
- Words: 1140
- Lines: 372
- Headings: Go-To-Market Strategy — shibanshu-markdown-mcp | Market Fit Analysis | The market exists and is growing fast | The pain is real and verified | Competition: zero | Marketing Channels (ranked by ROI) | Tier 1: Free, high-impact (do this week) | Tier 2: Content marketing (do in week 2-3) | Tier 3: Community building (month 2+) | Ad Concepts and Communication | Core message hierarchy | The 5 ad concepts that will work | Claude Code Prompts for Creating Ads | Prompt 1: Animated 3D graph video | Prompt 2: Before/after split-screen | Prompt 3: Social card for Twitter/LinkedIn | Prompt 4: Product demo landing page | Prompt 5: GitHub README header banner | Content Calendar (First 30 Days) | Messaging Do's and Don'ts | DO say: | DON'T say: | The one sentence:
- Tags: None
- Aliases: None
- Symbols: heading:Go-To-Market Strategy — shibanshu-markdown-mcp@1, heading:Market Fit Analysis@3, heading:The market exists and is growing fast@5, heading:The pain is real and verified@16, heading:Competition: zero@27, heading:Marketing Channels (ranked by ROI)@42, heading:Tier 1: Free, high-impact (do this week)@44, heading:Tier 2: Content marketing (do in week 2-3)@69, heading:Tier 3: Community building (month 2+)@87, heading:Ad Concepts and Communication@96, heading:Core message hierarchy@98, heading:The 5 ad concepts that will work@112
- Imports: None
- Excerpt: Go To Market Strategy — shibanshu markdown mcp Market Fit Analysis The market exists and is growing fast Metric Number Source Claude Code users 1M+ Anthropic blog, May 2025 Cursor paid users 500K+ Cursor funding announcement GitHub Copilot subscribers 1.8M+ GitHub blog MCP servers in official directory 80 modelcontextprotocol/servers repo MCP servers that solve context compression 0 You are first Developers who ha...

### docs/marketing/repo-brain-one-pager.md
- Type: markdown
- Size: 3798 bytes
- Words: 628
- Lines: 64
- Headings: Shibanshu Markdown Viewer: The Repo Brain | The Big Idea | Why This Is Big | Reason To Believe | Why It Can Feel Groundbreaking | The Market Hook | What The Video Should Prove | Final Positioning
- Tags: None
- Aliases: None
- Symbols: heading:Shibanshu Markdown Viewer: The Repo Brain@1, heading:The Big Idea@3, heading:Why This Is Big@9, heading:Reason To Believe@20, heading:Why It Can Feel Groundbreaking@31, heading:The Market Hook@43, heading:What The Video Should Prove@51, heading:Final Positioning@61
- Imports: None
- Excerpt: Shibanshu Markdown Viewer: The Repo Brain The Big Idea AI coding tools are powerful, but they usually enter a large repo blind. They open files one by one, fill the context window with raw text, and then answer from an incomplete mental model. A lot of wrong output does not start with bad reasoning. It starts earlier: the model read the wrong files, missed the bridge file, ignored the hub, or ran out of usable con...

### docs/marketing/twitter-thread.md
- Type: markdown
- Size: 2653 bytes
- Words: 388
- Lines: 121
- Headings: Twitter/X Launch Thread
- Tags: None
- Aliases: None
- Symbols: heading:Twitter/X Launch Thread@1
- Imports: None
- Excerpt: Twitter/X Launch Thread Tweet 1 Hook : Claude Code reads your files one by one. 200 file repo? That's 1M+ tokens. More than Claude's entire context window. Your AI is blind before it even starts thinking. I built something that fixes this. One command. 40x compression. 🧵 Tweet 2 The problem : Here's what happens when you say "refactor the auth module": → Claude reads auth.ts 3K tokens → Reads types.ts 1.5K tokens...

### docs/mega-stress-test-plan.md
- Type: markdown
- Size: 7884 bytes
- Words: 1052
- Lines: 151
- Headings: Mega Stress Test And Premium Gap Plan | Plan 1: Extreme Test Gates | Plan 2: Large Repository Context And Mind Maps | Plan 3: Premium Graph And Mind Map Interaction | Plan 4: LLM Skill | Plan 5: Installable Offline Distribution | Plan 6: Security And File Safety | Plan 7: Completion Audit
- Tags: None
- Aliases: None
- Symbols: heading:Mega Stress Test And Premium Gap Plan@1, heading:Plan 1: Extreme Test Gates@5, heading:Plan 2: Large Repository Context And Mind Maps@29, heading:Plan 3: Premium Graph And Mind Map Interaction@55, heading:Plan 4: LLM Skill@78, heading:Plan 5: Installable Offline Distribution@98, heading:Plan 6: Security And File Safety@127, heading:Plan 7: Completion Audit@148
- Imports: None
- Excerpt: Mega Stress Test And Premium Gap Plan This plan turns the audit findings into concrete implementation and verification tracks. Every track must stay free, offline capable, and local first. Plan 1: Extreme Test Gates Goal: catch disconnected controls, broken scripts, unsafe paths, graph regressions, and packaging mistakes before release. Current shipped slice: checks every project JavaScript file. builds icons/rend...

### docs/obsidian-app-audit.md
- Type: markdown
- Size: 3348 bytes
- Words: 454
- Lines: 53
- Headings: Obsidian 1.12.7 Reference Audit | Bundle-Level Findings | Feature Surface To Match | Applied Direction For Shibanshu Markdown Viewer
- Tags: None
- Aliases: None
- Symbols: heading:Obsidian 1.12.7 Reference Audit@1, heading:Bundle-Level Findings@11, heading:Feature Surface To Match@23, heading:Applied Direction For Shibanshu Markdown Viewer@40
- Imports: None
- Excerpt: Obsidian 1.12.7 Reference Audit Reference inspected: Local bundle: Official overview: https://obsidian.md/ Official help index: https://obsidian.md/help/ The app could not be operated through Computer Use in this session because the local approval for was denied. This audit therefore uses bundle metadata, public Obsidian behavior, and official documentation. It must not copy proprietary implementation code or priv...

### docs/obsidian-parity-plan.md
- Type: markdown
- Size: 17535 bytes
- Words: 2605
- Lines: 320
- Headings: Obsidian Feature-Parity Plan | Feature Inventory To Match For Free | Parity Plan 0: Writing Core | Parity Plan 1: Local Vault | Parity Plan 2: Graph View | Parity Plan 3: Canvas And Mind Map | Parity Plan 4: Publish | Parity Plan 5: Sync And Collaboration | Parity Plan 6: Plugins, Themes, And Developer API | Parity Plan 7: Automation, URL Scheme, And Native Identity | Parity Plan 8: Claude, OpenAI, And Local AI Maps | Build Order
- Tags: None
- Aliases: None
- Symbols: heading:Obsidian Feature-Parity Plan@1, heading:Feature Inventory To Match For Free@11, heading:Parity Plan 0: Writing Core@26, heading:Parity Plan 1: Local Vault@53, heading:Parity Plan 2: Graph View@83, heading:Parity Plan 3: Canvas And Mind Map@121, heading:Parity Plan 4: Publish@164, heading:Parity Plan 5: Sync And Collaboration@197, heading:Parity Plan 6: Plugins, Themes, And Developer API@229, heading:Parity Plan 7: Automation, URL Scheme, And Native Identity@249, heading:Parity Plan 8: Claude, OpenAI, And Local AI Maps@277, heading:Build Order@311
- Imports: None
- Excerpt: Obsidian Feature Parity Plan This is the free, end to end feature gap closing plan against Obsidian style capability, based on current public Obsidian feature pages: Canvas: https://obsidian.md/canvas Sync: https://obsidian.md/sync Publish: https://obsidian.md/publish The goal is feature equivalence for Shibanshu Markdown Viewer, not copying Obsidian branding, UI, text, or proprietary implementation. Every feature...

### docs/premium-roadmap.md
- Type: markdown
- Size: 12464 bytes
- Words: 1797
- Lines: 210
- Headings: Free Professional Markdown App Roadmap | End Goal | Plan 1: Data Safety And File Correctness | Plan 2: Security And Native Bridge Hardening | Plan 3: Professional Editor Core | Plan 4: Workspace, Library, And Navigation | Plan 5: Preview And Export System | Plan 6: UX, Accessibility, And Native Mac Polish | Plan 7: Differentiators
- Tags: None
- Aliases: None
- Symbols: heading:Free Professional Markdown App Roadmap@1, heading:End Goal@5, heading:Plan 1: Data Safety And File Correctness@9, heading:Plan 2: Security And Native Bridge Hardening@41, heading:Plan 3: Professional Editor Core@62, heading:Plan 4: Workspace, Library, And Navigation@90, heading:Plan 5: Preview And Export System@133, heading:Plan 6: UX, Accessibility, And Native Mac Polish@154, heading:Plan 7: Differentiators@186
- Imports: None
- Excerpt: Free Professional Markdown App Roadmap This document turns the audit into the product end goal. Each phase is its own plan with scope, tasks, and acceptance checks so the app can be improved without losing control of the work. End Goal Shibanshu Markdown Viewer should become a trusted free macOS Markdown writing app: safe with user files, fast on real documents, accessible from keyboard and assistive tech, native...

### docs/privacy.md
- Type: markdown
- Size: 1312 bytes
- Words: 205
- Lines: 26
- Headings: Privacy | Local Processing | Files | Network | AI Context Exports
- Tags: None
- Aliases: None
- Symbols: heading:Privacy@1, heading:Local Processing@5, heading:Files@11, heading:Network@19, heading:AI Context Exports@23
- Imports: None
- Excerpt: Privacy Shibanshu Markdown Viewer is designed to be local first. Local Processing Markdown rendering, editing, graph mapping, mind maps, AI context exports, static publishing, autosave recovery, and local history are processed on the user's machine. The app does not require an account, hosted service, or subscription. Files The app reads files only through explicit user actions such as opening a file, opening a fo...

### docs/release-readiness.md
- Type: markdown
- Size: 3123 bytes
- Words: 375
- Lines: 64
- Headings: Release Readiness | Commands | Public Release Blockers | Manual Desktop Smoke Test
- Tags: None
- Aliases: None
- Symbols: heading:Release Readiness@1, heading:Commands@8, heading:Public Release Blockers@18, heading:Manual Desktop Smoke Test@31
- Imports: None
- Excerpt: Release Readiness Shibanshu Markdown Viewer has two release states: Development release: local build, ad hoc signature, ZIP artifact, checksum, and local verification. This is useful for testing. Public release: Developer ID signed, notarized, stapled, Gatekeeper approved, checksum listed, and backed by trust documents. Commands The normal readiness command writes and exits successfully if the build is structurall...

### docs/research.md
- Type: markdown
- Size: 2611 bytes
- Words: 329
- Lines: 55
- Headings: Markdown Viewer Research And Build Plan | Reference | Stack Decision | Scope | Security Model | Performance Model
- Tags: None
- Aliases: None
- Symbols: heading:Markdown Viewer Research And Build Plan@1, heading:Reference@3, heading:Stack Decision@19, heading:Scope@23, heading:Security Model@40, heading:Performance Model@48
- Imports: None
- Excerpt: Markdown Viewer Research And Build Plan Reference Production app: https://markdownviewer.pages.dev/?lang=en Source repo: https://github.com/ThisIs Developer/Markdown Viewer The reference app presents a split Markdown editor and live preview with import/export, copy, sharing, tabs, i18n, dark mode, find/replace, diagrams, math, syntax highlighting, and stats. Its own README describes a client side SPA using , , , a...

### docs/uninstall.md
- Type: markdown
- Size: 672 bytes
- Words: 68
- Lines: 19
- Headings: Uninstall | macOS | Notes
- Tags: None
- Aliases: None
- Symbols: heading:Uninstall@1, heading:macOS@3, heading:Notes@16
- Imports: None
- Excerpt: Uninstall macOS 1. Quit Shibanshu Markdown Viewer. 2. Remove from or wherever it was installed. 3. Optionally remove local app data: 4. Optionally remove generated release or export files that you created manually, such as static publish folders, HTML/PDF exports, or Claude context maps. Notes Removing the app does not delete Markdown files or vault folders. Those are ordinary local files and remain where the user...

### electron/main.cjs
- Type: code
- Size: 82734 bytes
- Words: 7711
- Lines: 2581
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:fs@2, variable:fsp@3, variable:crypto@4, variable:path@5, variable:markdownExtensions@8, variable:ignoredVaultDirectories@9, variable:MAX_MARKDOWN_BYTES@22, variable:MAX_EXPORT_HTML_BYTES@23, variable:MAX_TEXT_EXPORT_BYTES@24, variable:MAX_AUTOSAVE_BYTES@25, variable:MAX_AUTOSAVE_DOCUMENTS@26, variable:MAX_HISTORY_SNAPSHOT_BYTES@27
- Imports: electron@1, node:fs@2, node:fs/promises@3, node:crypto@4, node:path@5, node:url@6
- Excerpt: const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require 'electron' ; const fs = require 'node:fs' ; const fsp = require 'node:fs/promises' ; const crypto = require 'node:crypto' ; const path = require 'node:path' ; const { pathToFileURL } = require 'node:url' ; const markdownExtensions = new Set '.md', '.markdown', '.mdown', '.mkd', '.txt', '.canvas' ; const ignoredVaultDirectories = new Set '.git', '...

### electron/preload.cjs
- Type: code
- Size: 3230 bytes
- Words: 339
- Lines: 63
- Headings: None
- Tags: None
- Aliases: None
- Symbols: function:getDroppedFilePaths@3, variable:listener@43, variable:listener@48, variable:listener@53, variable:listener@58
- Imports: electron@1
- Excerpt: const { contextBridge, ipcRenderer, webUtils } = require 'electron' ; function getDroppedFilePaths files { return Array.from files .map file = { try { return webUtils.getPathForFile file ; } catch error { return ''; } } .filter Boolean ; } contextBridge.exposeInMainWorld 'markdownNative', { platform: process.platform, openDialog: = ipcRenderer.invoke 'dialog:open markdown' , openVault: = ipcRenderer.invoke 'dialog...

### index.html
- Type: code
- Size: 36196 bytes
- Words: 3297
- Lines: 666
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!doctype html <html lang="en" <head <meta charset="UTF 8" / <meta http equiv="Content Security Policy" content="default src 'self'; base uri 'none'; object src 'none'; form action 'none'; frame src 'none'; img src 'self' data: blob: https://localhost capacitor:; style src 'self' 'unsafe inline'; script src 'self'; font src 'self' data:; connect src 'self' http://127.0.0.1: ws://127.0.0.1: https://localhost capaci...

### mcp-server.mjs
- Type: code
- Size: 65065 bytes
- Words: 3692
- Lines: 1364
- Headings: Context Map (auto-generated)
- Tags: None
- Aliases: None
- Symbols: variable:execFileAsync@25, variable:__dirname@26, variable:CLI_PATH@27, variable:EXPORT_SCRIPT@28, variable:MARKDOWN_EXTENSIONS@30, variable:IGNORED_DIRS@31, variable:MAX_VAULT_FILES@32, variable:MAX_VAULT_DEPTH@33, variable:MAX_FILE_SIZE@34, variable:MAX_SEARCH_RESULTS@35, variable:TOOLS@39, function:isMarkdownFile@288
- Imports: @modelcontextprotocol/sdk/server/index.js@11, @modelcontextprotocol/sdk/server/stdio.js@12, node:fs/promises@17, node:fs/promises@18, node:child_process@19, node:util@20, node:path@21, node:url@22, node:crypto@23, ) && !trimmed.startsWith(@1030
- Excerpt: !/usr/bin/env node / Athena Viewer — MCP Server Exposes the app's markdown vault, graph, mind map, context map, and note creation capabilities as Model Context Protocol tools that Claude Code or any MCP client can call directly. / import { Server } from '@modelcontextprotocol/sdk/server/index.js'; import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'; import { CallToolRequestSchema, List...

### package-lock.json
- Type: code
- Size: 291240 bytes
- Words: 20482
- Lines: 8161
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: { "name": "shibanshu markdown viewer", "version": "0.1.0", "lockfileVersion": 3, "requires": true, "packages": { "": { "name": "shibanshu markdown viewer", "version": "0.1.0", "dependencies": { "@capacitor/android": "^8.4.1", "@capacitor/app": "^8.1.0", "@capacitor/core": "^8.4.1", "@capacitor/filesystem": "^8.1.2", "@capacitor/preferences": "^8.0.1", "@capacitor/share": "^8.0.1", "@capawesome/capacitor file picke...

### package.json
- Type: code
- Size: 7619 bytes
- Words: 754
- Lines: 184
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: { "name": "shibanshu markdown viewer", "version": "0.1.0", "description": "A native macOS Markdown viewer and editor with secure live preview, direct file opening, and local exports.", "author": "Shibanshu Jha", "main": "electron/main.cjs", "bin": { "shibanshu markdown": "bin/shibanshu markdown.mjs" }, "type": "module", "private": true, "scripts": { "dev": "concurrently k \"vite host 127.0.0.1\" \"wait on http://1...

### packages/mcp-server/export-context.mjs
- Type: code
- Size: 88942 bytes
- Words: 7331
- Lines: 2476
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:MARKDOWN_EXTENSIONS@5, variable:CODE_EXTENSIONS@6, variable:IGNORED_DIRECTORIES@25, variable:DEFAULT_MAX_FILES@43, variable:DEFAULT_MAX_BYTES@44, variable:DEFAULT_MAX_DEPTH@45, variable:DEFAULT_OUTPUT_DIR@46, variable:DEFAULT_CHUNK_TOKENS@47, variable:MAX_CHUNKS@48, variable:DEFAULT_SCENE_NODE_LIMIT@49, variable:DEFAULT_SCENE_EDGE_LIMIT@50, variable:DEFAULT_SCENE_PERSPECTIVE@51
- Imports: node:crypto@1, node:fs/promises@2, node:path@3
- Excerpt: import { createHash } from 'node:crypto'; import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'; import path from 'node:path'; const MARKDOWN EXTENSIONS = new Set '.md', '.markdown', '.mdown', '.mkd', '.mdx', '.txt', '.canvas' ; const CODE EXTENSIONS = new Set '.cjs', '.css', '.html', '.js', '.json', '.jsx', '.mjs', '.py', '.rb', '.rs', '.sh', '.sql', '.swift', '.ts', '.tsx', '.yaml', '.yml'...

### packages/mcp-server/mcp-server.mjs
- Type: code
- Size: 64303 bytes
- Words: 3692
- Lines: 1354
- Headings: Context Map (auto-generated)
- Tags: None
- Aliases: None
- Symbols: variable:execFileAsync@25, variable:__dirname@26, variable:CLI_PATH@27, variable:EXPORT_SCRIPT@28, variable:MARKDOWN_EXTENSIONS@30, variable:IGNORED_DIRS@31, variable:MAX_VAULT_FILES@32, variable:MAX_VAULT_DEPTH@33, variable:MAX_FILE_SIZE@34, variable:MAX_SEARCH_RESULTS@35, variable:TOOLS@39, function:isMarkdownFile@288
- Imports: @modelcontextprotocol/sdk/server/index.js@11, @modelcontextprotocol/sdk/server/stdio.js@12, node:fs/promises@17, node:fs/promises@18, node:child_process@19, node:util@20, node:path@21, node:url@22, node:crypto@23
- Excerpt: !/usr/bin/env node / Athena Viewer — MCP Server Exposes the app's markdown vault, graph, mind map, context map, and note creation capabilities as Model Context Protocol tools that Claude Code or any MCP client can call directly. / import { Server } from '@modelcontextprotocol/sdk/server/index.js'; import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'; import { CallToolRequestSchema, List...

### packages/mcp-server/package-lock.json
- Type: code
- Size: 41572 bytes
- Words: 2967
- Lines: 1181
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: { "name": "shibanshu markdown mcp", "version": "0.3.1", "lockfileVersion": 3, "requires": true, "packages": { "": { "name": "shibanshu markdown mcp", "version": "0.3.1", "license": "MIT", "dependencies": { "@modelcontextprotocol/sdk": "^1.29.0" }, "bin": { "shibanshu markdown mcp": "mcp server.mjs" }, "engines": { "node": " =18" } }, "node modules/@hono/node server": { "version": "1.19.14", "resolved": "https://re...

### packages/mcp-server/package.json
- Type: code
- Size: 923 bytes
- Words: 99
- Lines: 41
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: { "name": "athena code mcp", "version": "0.3.1", "description": "MCP server for Claude Code — 218x context compression for codebases. Knowledge graphs, navigation routes, auto updating maps, 3D visualizer. 19 tools. One setup command.", "author": "Shibanshu Jha", "license": "MIT", "type": "module", "bin": { "athena mcp": "mcp server.mjs" }, "main": "mcp server.mjs", "files": "mcp server.mjs", "export context.mjs",...

### packages/mcp-server/README.md
- Type: markdown
- Size: 3549 bytes
- Words: 310
- Lines: 105
- Headings: athena-code-mcp | The problem | The solution | What it does | Real benchmarks (tested on production repos) | 19 tools | How it works | Install | License
- Tags: None
- Aliases: None
- Symbols: heading:athena-code-mcp@1, heading:The problem@5, heading:The solution@9, heading:What it does@28, heading:Real benchmarks (tested on production repos)@38, heading:19 tools@48, heading:How it works@72, heading:Install@92, heading:License@102
- Imports: None
- Excerpt: athena code mcp MCP server that gives Claude Code a structural map of your codebase — so it reads 3 files instead of 300. The problem Claude Code reads files one by one to understand your repo. A 200 file repo needs 1M+ tokens — 12x Claude's context window. It literally can't fit. Claude works blind. The solution One setup. Zero effort. Claude automatically understands your architecture. Then in any repo: That's i...

### README.md
- Type: markdown
- Size: 12877 bytes
- Words: 1378
- Lines: 223
- Headings: Shibanshu Markdown Viewer | What It Does | Commands | URL Scheme | CLI | Architecture | Security
- Tags: None
- Aliases: None
- Symbols: heading:Shibanshu Markdown Viewer@1, heading:What It Does@7, heading:Commands@36, heading:URL Scheme@164, heading:CLI@176, heading:Architecture@198, heading:Security@218
- Imports: None
- Excerpt: Shibanshu Markdown Viewer A native macOS Markdown viewer and editor built from scratch with Electron, Vite, and a secure local rendering pipeline. The long term target is a free, professional, local first Markdown app. The roadmap does not include paid gates or pricing tiers. What It Does Opens , , , , , and files from the toolbar, app menu, drag and drop, command line args, and macOS events. Registers a custom ma...

### scripts/browser-ui-smoke.mjs
- Type: code
- Size: 25647 bytes
- Words: 2882
- Lines: 530
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@6, variable:appUrl@7, variable:sessionKey@8, variable:vaultRoot@9, variable:documents@11, variable:session@86, variable:page@110, variable:vaultCount@123, variable:vaultTreeText@135, variable:nestedFilePath@139, variable:previewMindMapText@164, variable:rawMermaidMindMapCount@168
- Imports: node:url@1, node:path@2, node:fs/promises@3, playwright@4
- Excerpt: import { pathToFileURL } from 'node:url'; import path from 'node:path'; import { readFile } from 'node:fs/promises'; import { chromium } from 'playwright'; const root = process.cwd ; const appUrl = pathToFileURL path.join root, 'dist', 'index.html' .href; const sessionKey = 'shibanshu markdown viewer session v1'; const vaultRoot = '/tmp/shibanshu vault'; const documents = { id: 'note a', title: 'Roadmap.md', path:...

### scripts/diagnose-mac-launch.mjs
- Type: code
- Size: 4915 bytes
- Words: 534
- Lines: 142
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:diagnosticDir@7, variable:sinceMinutes@8, variable:requireClean@9, variable:maxReports@10, variable:reports@12, variable:matchingReports@13, variable:findings@14, variable:text@17, function:getArg@27, variable:index@28, function:loadReports@33, variable:cutoff@34
- Imports: node:fs/promises@3, node:os@4, node:path@5
- Excerpt: !/usr/bin/env node import { readdir, readFile, stat } from 'node:fs/promises'; import os from 'node:os'; import path from 'node:path'; const diagnosticDir = path.join os.homedir , 'Library', 'Logs', 'DiagnosticReports' ; const sinceMinutes = Number getArg ' since minutes' 60 ; const requireClean = process.argv.includes ' require clean' ; const maxReports = Number getArg ' max' 8 ; const reports = await loadReports...

### scripts/e2e-electron.mjs
- Type: code
- Size: 7261 bytes
- Words: 836
- Lines: 213
- Headings: Saved From App
- Tags: None
- Aliases: None
- Symbols: variable:root@7, variable:tempDir@8, variable:userDataDir@9, variable:testFile@10, variable:artifactDir@11, variable:screenshotPath@12, variable:launchStartedAt@13, variable:fatalLaunchHandled@14, variable:initialMarkdown@24, variable:updatedMarkdown@32, variable:page@61, variable:pageErrors@62
- Imports: playwright@1, electron@2, node:fs/promises@3, node:os@4, node:path@5
- Excerpt: import { electron as electron } from 'playwright'; import electronPath from 'electron'; import { mkdir, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises'; import os from 'node:os'; import path from 'node:path'; const root = process.cwd ; const tempDir = await mkdtemp path.join os.tmpdir , 'shibanshu markdown viewer ' ; const userDataDir = path.join tempDir, 'profile' ; const testFile = path.joi...

### scripts/export-claude-map.mjs
- Type: code
- Size: 88924 bytes
- Words: 7331
- Lines: 2476
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:MARKDOWN_EXTENSIONS@5, variable:CODE_EXTENSIONS@6, variable:IGNORED_DIRECTORIES@25, variable:DEFAULT_MAX_FILES@43, variable:DEFAULT_MAX_BYTES@44, variable:DEFAULT_MAX_DEPTH@45, variable:DEFAULT_OUTPUT_DIR@46, variable:DEFAULT_CHUNK_TOKENS@47, variable:MAX_CHUNKS@48, variable:DEFAULT_SCENE_NODE_LIMIT@49, variable:DEFAULT_SCENE_EDGE_LIMIT@50, variable:DEFAULT_SCENE_PERSPECTIVE@51
- Imports: node:crypto@1, node:fs/promises@2, node:path@3
- Excerpt: import { createHash } from 'node:crypto'; import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'; import path from 'node:path'; const MARKDOWN EXTENSIONS = new Set '.md', '.markdown', '.mdown', '.mkd', '.mdx', '.txt', '.canvas' ; const CODE EXTENSIONS = new Set '.cjs', '.css', '.html', '.js', '.json', '.jsx', '.mjs', '.py', '.rb', '.rs', '.sh', '.sql', '.swift', '.ts', '.tsx', '.yaml', '.yml'...

### scripts/generate-app-icon.mjs
- Type: code
- Size: 11207 bytes
- Words: 1881
- Lines: 323
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@5, variable:buildDir@6, variable:iconsetDir@7, variable:baseIconPath@8, variable:iconPath@9, variable:icoPath@10, variable:iconEntries@12, variable:crcTable@25, variable:value@26, variable:sampleOffsets@33, variable:pngBySize@41, function:createIconPng@60
- Imports: node:fs/promises@1, node:zlib@2, node:path@3
- Excerpt: import { mkdir, writeFile } from 'node:fs/promises'; import { deflateSync } from 'node:zlib'; import path from 'node:path'; const root = process.cwd ; const buildDir = path.join root, 'build' ; const iconsetDir = path.join buildDir, 'icon.iconset' ; const baseIconPath = path.join buildDir, 'icon base.png' ; const iconPath = path.join buildDir, 'icon.icns' ; const icoPath = path.join buildDir, 'icon.ico' ; const ic...

### scripts/generate-download-page.mjs
- Type: code
- Size: 8635 bytes
- Words: 387
- Lines: 236
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@6, variable:packageJson@7, variable:releaseManifestPath@8, variable:releaseReadinessPath@9, variable:outputDir@10, variable:outputPath@11, variable:manifest@12, variable:readiness@25, function:renderDownloadPage@36, variable:productName@37, variable:version@38, variable:generatedAt@39
- Imports: node:fs/promises@3, node:path@4
- Excerpt: !/usr/bin/env node import { mkdir, readFile, writeFile } from 'node:fs/promises'; import path from 'node:path'; const root = process.cwd ; const packageJson = JSON.parse await readFile path.join root, 'package.json' , 'utf8' ; const releaseManifestPath = path.join root, 'release', 'release manifest.json' ; const releaseReadinessPath = path.join root, 'release', 'release readiness.json' ; const outputDir = path.joi...

### scripts/install-git-hook.mjs
- Type: code
- Size: 1769 bytes
- Words: 223
- Lines: 57
- Headings: Auto-regenerate context map after each commit | Installed by athena-mcp
- Tags: None
- Aliases: None
- Symbols: variable:__dirname@12, variable:exportScript@13, variable:repoPath@15, variable:absRepo@21, variable:hooksDir@22, variable:hookPath@23, variable:hookScript@25, variable:existing@37
- Imports: node:fs/promises@8, node:path@9, node:url@10
- Excerpt: !/usr/bin/env node / Installs a post commit git hook that auto regenerates the context map. Run: node scripts/install git hook.mjs /path/to/your/repo / import { writeFile, mkdir, chmod, readFile } from 'node:fs/promises'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; const dirname = path.dirname fileURLToPath import.meta.url ; const exportScript = path.join dirname, 'export claude map.mjs...

### scripts/local-preview.mjs
- Type: code
- Size: 3259 bytes
- Words: 407
- Lines: 103
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@9, variable:distDir@10, variable:host@11, variable:preferredPort@12, variable:port@13, variable:server@17, variable:requestUrl@18, variable:filePath@19, variable:details@22, function:getArg@42, variable:index@43, function:resolveSafeDistPath@48
- Imports: node:fs@3, node:fs/promises@4, node:http@5, node:path@6, node:url@7
- Excerpt: !/usr/bin/env node import { createReadStream } from 'node:fs'; import { access, stat } from 'node:fs/promises'; import http from 'node:http'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; const root = path.resolve path.dirname fileURLToPath import.meta.url , '..' ; const distDir = path.join root, 'dist' ; const host = getArg ' host' '127.0.0.1'; const preferredPort = Number getArg ' port'...

### scripts/mcp-safety-check.mjs
- Type: code
- Size: 4762 bytes
- Words: 616
- Lines: 126
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@9, variable:tempRoot@10, variable:vaultDir@11, variable:serverPath@12, variable:transport@18, variable:client@25, variable:tools@30, variable:safeNotePath@33, variable:createResult@34, variable:readResult@41, variable:nonMarkdownWrite@45, variable:nonMarkdownRead@52
- Imports: @modelcontextprotocol/sdk/client/index.js@3, @modelcontextprotocol/sdk/client/stdio.js@4, node:fs/promises@5, node:os@6, node:path@7
- Excerpt: !/usr/bin/env node import { Client } from '@modelcontextprotocol/sdk/client/index.js'; import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'; import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'; import os from 'node:os'; import path from 'node:path'; const root = process.cwd ; const tempRoot = await mkdtemp path.join os.tmpdir , 'shibanshu mcp safety ' ; const...

### scripts/package-mac-zip.mjs
- Type: code
- Size: 2060 bytes
- Words: 243
- Lines: 65
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@8, variable:packageJson@9, variable:productName@10, variable:version@11, variable:arch@12, variable:releaseDir@13, variable:appPath@14, variable:zipPath@15, variable:zipStats@22, function:getArg@26, variable:index@27, function:resolveAppPath@32
- Imports: node:fs/promises@3, node:child_process@4, node:path@5, node:fs/promises@6
- Excerpt: !/usr/bin/env node import { access, rm, stat } from 'node:fs/promises'; import { spawnSync } from 'node:child process'; import path from 'node:path'; import { readFile } from 'node:fs/promises'; const root = process.cwd ; const packageJson = JSON.parse await readFile path.join root, 'package.json' , 'utf8' ; const productName = packageJson.build?.productName packageJson.name; const version = packageJson.version; c...

### scripts/publish-static-site.mjs
- Type: code
- Size: 40252 bytes
- Words: 3336
- Lines: 1280
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:MARKDOWN_EXTENSIONS@8, variable:IGNORED_DIRECTORIES@9, variable:DEFAULT_MAX_FILES@22, variable:DEFAULT_MAX_BYTES@23, variable:DEFAULT_MAX_DEPTH@24, variable:MAX_TOTAL_BYTES@25, variable:DEFAULT_PROFILE_PATH@26, function:main@35, variable:inputRoot@42, variable:inputStats@47, variable:profileInfo@52, variable:settings@58
- Imports: node:fs/promises@3, node:path@4, node:crypto@5, marked@6
- Excerpt: !/usr/bin/env node import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'; import path from 'node:path'; import crypto from 'node:crypto'; import { marked } from 'marked'; const MARKDOWN EXTENSIONS = new Set '.md', '.markdown', '.mdown', '.mkd', '.txt' ; const IGNORED DIRECTORIES = new Set '.git', '.hg', '.svn', '.obsidian', '.shibanshu site', '.trash', 'node modules', 'dist', 'releas...

### scripts/release-checksums.mjs
- Type: code
- Size: 4364 bytes
- Words: 470
- Lines: 121
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@7, variable:releaseDir@8, variable:packageJson@9, variable:artifactExtensions@10, variable:ignoredArtifacts@11, variable:artifacts@14, variable:manifest@15, variable:checksumLines@23, function:discoverReleaseArtifacts@35, variable:artifacts@36, function:walk@38, variable:entries@39
- Imports: node:fs/promises@3, node:crypto@4, node:path@5
- Excerpt: !/usr/bin/env node import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'; import crypto from 'node:crypto'; import path from 'node:path'; const root = process.cwd ; const releaseDir = path.join root, 'release' ; const packageJson = JSON.parse await readFile path.join root, 'package.json' , 'utf8' ; const artifactExtensions = new Set '.dmg', '.zip', '.exe', '.AppImage', '.deb', '.rpm', '.yml'...

### scripts/release-readiness.mjs
- Type: code
- Size: 7566 bytes
- Words: 870
- Lines: 208
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@7, variable:releaseDir@8, variable:packageJson@9, variable:productName@10, variable:arch@11, variable:publicMode@12, variable:appPath@13, variable:checks@14, variable:report@23, function:getArg@31, variable:index@32, function:resolveAppPath@37
- Imports: node:fs/promises@3, node:child_process@4, node:path@5
- Excerpt: !/usr/bin/env node import { access, mkdir, readFile, writeFile } from 'node:fs/promises'; import { spawnSync } from 'node:child process'; import path from 'node:path'; const root = process.cwd ; const releaseDir = path.join root, 'release' ; const packageJson = JSON.parse await readFile path.join root, 'package.json' , 'utf8' ; const productName = packageJson.build?.productName packageJson.name; const arch = getAr...

### scripts/render-repo-brain-video.mjs
- Type: code
- Size: 1623 bytes
- Words: 226
- Lines: 45
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@6, variable:htmlPath@7, variable:outDir@8, variable:targetPath@9, variable:posterPath@10, variable:browser@16, variable:context@17, variable:page@26, variable:video@31, variable:recordedPath@39, variable:info@41
- Imports: playwright@1, node:fs/promises@2, node:path@3, node:url@4
- Excerpt: import { chromium } from 'playwright'; import { mkdir, rename, rm, stat } from 'node:fs/promises'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url'; const root = path.dirname path.dirname fileURLToPath import.meta.url ; const htmlPath = path.join root, 'docs', 'marketing', 'ads', 'repo brain video.html' ; const outDir = path.join root, 'docs', 'marketing', 'ads', 'output' ; con...

### scripts/sign-dev-mac.mjs
- Type: code
- Size: 1952 bytes
- Words: 239
- Lines: 66
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@5, variable:arch@6, variable:appPath@7, variable:infoPlistPath@8, function:getArg@20, variable:index@21, function:resolveAppPath@26, variable:productName@27, variable:releaseDir@28, variable:candidates@29, function:patchInfoPlist@46, function:run@57
- Imports: node:fs/promises@1, node:child_process@2, node:path@3
- Excerpt: import { access } from 'node:fs/promises'; import { spawnSync } from 'node:child process'; import path from 'node:path'; const root = process.cwd ; const arch = getArg ' arch' process.env.npm config arch process.arch; const appPath = await resolveAppPath arch ; const infoPlistPath = path.join appPath, 'Contents', 'Info.plist' ; await access appPath ; await access infoPlistPath ; run 'xattr', ' cr', appPath ; patch...

### scripts/smoke-check.mjs
- Type: code
- Size: 37637 bytes
- Words: 3812
- Lines: 875
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@6, variable:requiredFiles@7, variable:html@44, variable:mainProcess@45, variable:preload@46, variable:renderer@47, variable:styles@48, variable:parityPlan@49, variable:megaStressPlan@50, variable:packageJson@51, variable:claudeExporter@52, variable:staticPublisher@53
- Imports: node:fs/promises@1, node:path@2, node:os@3, node:child_process@4
- Excerpt: import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'; import path from 'node:path'; import os from 'node:os'; import { spawnSync } from 'node:child process'; const root = process.cwd ; const requiredFiles = 'dist/index.html', 'build/icon.icns', 'bin/shibanshu markdown.mjs', 'electron/main.cjs', 'electron/preload.cjs', 'mcp server.mjs', 'src/renderer.js', 'src/styles.css', 'docs/research.m...

### scripts/stress-check.mjs
- Type: code
- Size: 17461 bytes
- Words: 1971
- Lines: 341
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@8, variable:tempRoot@9, variable:vaultDir@10, variable:contextDir@11, variable:siteDir@12, variable:totals@13, variable:contextResult@24, variable:graph@40, variable:sceneGraph@64, variable:firstChunk@73, variable:integrity@78, variable:navigation@84
- Imports: node:fs/promises@3, node:child_process@4, node:os@5, node:path@6, ./alpha@266, ../src/index@275
- Excerpt: !/usr/bin/env node import { access, mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'; import { spawnSync } from 'node:child process'; import os from 'node:os'; import path from 'node:path'; const root = process.cwd ; const tempRoot = await mkdtemp path.join os.tmpdir , 'shibanshu extreme stress ' ; const vaultDir = path.join tempRoot, 'vault' ; const contextDir = path.join tempRoot, 'context' ;...

### scripts/validate-syntax.mjs
- Type: code
- Size: 1825 bytes
- Words: 209
- Lines: 72
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@7, variable:checkedExtensions@8, variable:ignoredDirectories@9, variable:files@21, variable:failures@22, variable:result@25, function:discoverJavaScriptFiles@47, variable:result@48, function:walk@50, variable:entries@51, variable:absolutePath@56
- Imports: node:fs/promises@3, node:child_process@4, node:path@5
- Excerpt: !/usr/bin/env node import { readdir } from 'node:fs/promises'; import { spawnSync } from 'node:child process'; import path from 'node:path'; const root = process.cwd ; const checkedExtensions = new Set '.js', '.mjs', '.cjs' ; const ignoredDirectories = new Set '.git', '.shibanshu', '.vite', 'build', 'coverage', 'dist', 'node modules', 'release', 'test artifacts' ; const files = await discoverJavaScriptFiles root ;...

### scripts/verify-mac-app.mjs
- Type: code
- Size: 8912 bytes
- Words: 1050
- Lines: 217
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:root@8, variable:packageJson@9, variable:productName@10, variable:version@11, variable:arch@12, variable:requireLaunchServices@13, variable:releaseDir@14, variable:appPath@15, variable:checks@16, function:getArg@26, variable:index@27, function:resolveAppPath@32
- Imports: node:fs/promises@3, node:child_process@4, node:crypto@5, node:path@6
- Excerpt: !/usr/bin/env node import { access, readFile, stat } from 'node:fs/promises'; import { spawnSync } from 'node:child process'; import crypto from 'node:crypto'; import path from 'node:path'; const root = process.cwd ; const packageJson = JSON.parse await readFile path.join root, 'package.json' , 'utf8' ; const productName = packageJson.build?.productName packageJson.name; const version = packageJson.version; const...

### SECURITY.md
- Type: markdown
- Size: 1074 bytes
- Words: 141
- Lines: 31
- Headings: Security Policy | Supported Versions | Reporting A Vulnerability | Security Boundaries | Public Release Requirement
- Tags: None
- Aliases: None
- Symbols: heading:Security Policy@1, heading:Supported Versions@5, heading:Reporting A Vulnerability@9, heading:Security Boundaries@18, heading:Public Release Requirement@24
- Imports: None
- Excerpt: Security Policy Shibanshu Markdown Viewer is local first software. Markdown rendering, graph mapping, context export, and static publishing are designed to run on the user's machine. Supported Versions Security fixes target the latest released version. Reporting A Vulnerability Report security issues privately to the project owner before publishing details. Include: App version and platform. Steps to reproduce. Wh...

### skills/shibanshu-markdown-context/agents/openai.yaml
- Type: code
- Size: 238 bytes
- Words: 31
- Lines: 5
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: interface: display name: "Shibanshu Markdown Context" short description: "Use Shibanshu Markdown Viewer for LLM context maps" default prompt: "Use shibanshu markdown context to build and navigate a local Markdown knowledge graph."

### skills/shibanshu-markdown-context/references/workflows.md
- Type: markdown
- Size: 3621 bytes
- Words: 301
- Lines: 77
- Headings: Shibanshu Markdown Viewer Workflows | Output Files | Common Commands | LLM Prompt Patterns | Large Repository Strategy | Viewer Strategy
- Tags: None
- Aliases: None
- Symbols: heading:Shibanshu Markdown Viewer Workflows@1, heading:Output Files@3, heading:Common Commands@21, heading:LLM Prompt Patterns@36, heading:Large Repository Strategy@56, heading:Viewer Strategy@69
- Imports: None
- Excerpt: Shibanshu Markdown Viewer Workflows Output Files writes: : start here for routes, clusters, hubs, bridges, and cleanup risks. : full human readable map with file summaries and link graph. : Mermaid mind map for visual reasoning. : machine readable graph, typed edge kinds, symbols, imports, chunks, and navigation metadata. : compact 3D scene map payload with coordinates, projection values, reading order, route scor...

### skills/shibanshu-markdown-context/SKILL.md
- Type: markdown
- Size: 5763 bytes
- Words: 669
- Lines: 113
- Headings: Shibanshu Markdown Context | MCP Server (Recommended) | Available MCP Tools | Scene and 3D Payload | MCP Workflow | CLI Workflow (Alternative) | Navigation Rules | Safe Operation | Reference
- Tags: #tags
- Aliases: None
- Symbols: heading:Shibanshu Markdown Context@6, heading:MCP Server (Recommended)@10, heading:Available MCP Tools@25, heading:Scene and 3D Payload@46, heading:MCP Workflow@59, heading:CLI Workflow (Alternative)@70, heading:Navigation Rules@93, heading:Safe Operation@102, heading:Reference@110
- Imports: None
- Excerpt: name: shibanshu markdown context description: Use shibanshu markdown context through Shibanshu Markdown Viewer as a local first Markdown vault, graph, mind map, static publish, and LLM context system. Available as an MCP server with 16 tools. Trigger when an agent needs to inspect or create a local knowledge base, export Claude/OpenAI ready context maps, navigate large repositories, generate mind maps or knowledge...

### src/capacitor-bridge.js
- Type: code
- Size: 12974 bytes
- Words: 1547
- Lines: 453
- Headings: None
- Tags: None
- Aliases: None
- Symbols: variable:AUTOSAVE_KEY@14, variable:RECENT_ITEMS_KEY@15, variable:MAX_VAULT_FILES@16, variable:MAX_VAULT_DEPTH@17, variable:MAX_FILE_BYTES@18, variable:MARKDOWN_EXTENSIONS@19, function:getExtension@21, variable:dotIndex@22, function:isMarkdownFile@26, function:basename@30, variable:parts@31, function:dirname@35
- Imports: @capacitor/filesystem@8, @capacitor/preferences@9, @capacitor/share@10, @capacitor/app@11, @capawesome/capacitor-file-picker@12
- Excerpt: / Capacitor native bridge for Shibanshu Markdown Viewer. Provides compatible methods using Capacitor plugins so the renderer can work on Android without Electron. / import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'; import { Preferences } from '@capacitor/preferences'; import { Share } from '@capacitor/share'; import { App } from '@capacitor/app'; import { FilePicker } from '@capawesome/capac...

### src/index.html
- Type: code
- Size: 36105 bytes
- Words: 3291
- Lines: 665
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: <!doctype html <html lang="en" <head <meta charset="UTF 8" / <meta http equiv="Content Security Policy" content="default src 'self'; base uri 'none'; object src 'none'; form action 'none'; frame src 'none'; img src 'self' data: blob: https://localhost capacitor:; style src 'self' 'unsafe inline'; script src 'self'; font src 'self' data:; connect src 'self' http://127.0.0.1: ws://127.0.0.1: https://localhost capaci...

### src/renderer.js
- Type: code
- Size: 332225 bytes
- Words: 12313
- Lines: 9546
- Headings: Tasks | Notes | Goals | Log
- Tags: None
- Aliases: None
- Symbols: variable:native@82, variable:SESSION_KEY@83, variable:THEME_KEY@84, variable:GRAPH_PRESETS_KEY@85, variable:UNTITLED_NAME@86, variable:MAX_RECENT_COMMAND_ITEMS@87, variable:RENDER_DELAY_MS@88, variable:PERSIST_DELAY_MS@89, variable:AUTOSAVE_DELAY_MS@90, variable:VALID_VIEW_MODES@91, variable:VALID_GRAPH_MODES@92, variable:GRAPH_RENDER_NODE_LIMIT@93
- Imports: marked@1, dompurify@2, @codemirror/state@3, @codemirror/view@4, @codemirror/commands@5, @codemirror/search@6, @codemirror/lang-markdown@7, codemirror@8, github-markdown-css/github-markdown.css?inline@9, highlight.js/lib/core@10, highlight.js/styles/github.css?inline@11, highlight.js/lib/languages/bash@12
- Excerpt: import { marked } from 'marked'; import DOMPurify from 'dompurify'; import { EditorSelection, EditorState, Prec } from '@codemirror/state'; import { EditorView, keymap, placeholder } from '@codemirror/view'; import { indentWithTab, undo, redo } from '@codemirror/commands'; import { openSearchPanel } from '@codemirror/search'; import { markdown } from '@codemirror/lang markdown'; import { basicSetup } from 'codemir...

### src/sample.md
- Type: markdown
- Size: 727 bytes
- Words: 76
- Lines: 40
- Headings: Shibanshu Markdown Viewer | Rendering
- Tags: None
- Aliases: None
- Symbols: heading:Shibanshu Markdown Viewer@5, heading:Rendering@9
- Imports: None
- Excerpt: title: Shibanshu Markdown Viewer Shibanshu Markdown Viewer Open a Markdown file from Finder, the app menu, the toolbar, or drag and drop. Rendering GitHub Flavored Markdown Sanitized HTML preview Syntax highlighting Mermaid diagrams KaTeX math GitHub style alerts Local HTML and PDF export !NOTE The renderer is local first. File access stays in the Electron main process. Inline math uses , for example \ E = mc^2\ ....

### src/styles.css
- Type: code
- Size: 56011 bytes
- Words: 8681
- Lines: 3210
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: None
- Excerpt: :root { color scheme: light; bg: f6f7f9; panel: ffffff; panel alt: f0f3f6; text: 1f2328; muted: 667085; border: d7dde5; border strong: b7c0cc; accent: 256f5d; accent strong: 1f5d4e; accent soft: e7f4ef; warning: 9a6700; danger: c03744; code bg: f6f8fa; shadow: 0 14px 34px rgb 27 39 51 / 12% ; } :root data theme='dark' { color scheme: dark; bg: 111418; panel: 191d23; panel alt: 222832; text: e6edf3; muted: 9aa4b2;...

### THIRD_PARTY_NOTICES.md
- Type: markdown
- Size: 770 bytes
- Words: 102
- Lines: 21
- Headings: Third Party Notices
- Tags: None
- Aliases: None
- Symbols: heading:Third Party Notices@1
- Imports: None
- Excerpt: Third Party Notices Shibanshu Markdown Viewer uses open source packages from the JavaScript and Electron ecosystem. Dependency versions are recorded in . Primary runtime dependencies include: Electron Vite CodeMirror DOMPurify Marked Mermaid includes D3, Cytoscape, dagre d3, and other sub dependencies KaTeX highlight.js Lucide Icons github markdown css Each dependency remains under its own license. Before a public...

### vite.config.js
- Type: code
- Size: 315 bytes
- Words: 42
- Lines: 17
- Headings: None
- Tags: None
- Aliases: None
- Symbols: None
- Imports: vite@1, node:path@2
- Excerpt: import { defineConfig } from 'vite'; import path from 'node:path'; export default defineConfig { root: path.resolve dirname, 'src' , base: './', build: { outDir: path.resolve dirname, 'dist' , emptyOutDir: true }, server: { host: '127.0.0.1', port: 5173, strictPort: true } } ;
