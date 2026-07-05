import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const requiredFiles = [
  'dist/index.html',
  'build/icon.icns',
  'bin/shibanshu-markdown.mjs',
  'electron/main.cjs',
  'electron/preload.cjs',
  'mcp-server.mjs',
  'src/renderer.js',
  'src/styles.css',
  'docs/research.md',
  'docs/obsidian-app-audit.md',
  'docs/premium-roadmap.md',
  'docs/obsidian-parity-plan.md',
  'docs/mega-stress-test-plan.md',
  'scripts/browser-ui-smoke.mjs',
  'scripts/export-claude-map.mjs',
  'scripts/publish-static-site.mjs',
  'scripts/validate-syntax.mjs',
  'scripts/stress-check.mjs',
  'scripts/release-checksums.mjs',
  'scripts/release-readiness.mjs',
  'scripts/generate-download-page.mjs',
  'scripts/local-preview.mjs',
  'scripts/mcp-safety-check.mjs',
  'scripts/package-mac-zip.mjs',
  'scripts/verify-mac-app.mjs',
  'scripts/diagnose-mac-launch.mjs',
  'scripts/generate-app-icon.mjs',
  'scripts/sign-dev-mac.mjs',
  'skills/shibanshu-markdown-context/SKILL.md',
  'skills/shibanshu-markdown-context/references/workflows.md',
  'skills/shibanshu-markdown-context/agents/openai.yaml',
  'electron/entitlements.mac.plist'
];

await Promise.all(requiredFiles.map((file) => access(path.join(root, file))));

const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
const mainProcess = await readFile(path.join(root, 'electron/main.cjs'), 'utf8');
const preload = await readFile(path.join(root, 'electron/preload.cjs'), 'utf8');
const renderer = await readFile(path.join(root, 'src/renderer.js'), 'utf8');
const styles = await readFile(path.join(root, 'src/styles.css'), 'utf8');
const parityPlan = await readFile(path.join(root, 'docs/obsidian-parity-plan.md'), 'utf8');
const megaStressPlan = await readFile(path.join(root, 'docs/mega-stress-test-plan.md'), 'utf8');
const packageJson = await readFile(path.join(root, 'package.json'), 'utf8');
const claudeExporter = await readFile(path.join(root, 'scripts/export-claude-map.mjs'), 'utf8');
const staticPublisher = await readFile(path.join(root, 'scripts/publish-static-site.mjs'), 'utf8');
const mcpServer = await readFile(path.join(root, 'mcp-server.mjs'), 'utf8');
const stressCheck = await readFile(path.join(root, 'scripts/stress-check.mjs'), 'utf8');
const syntaxValidator = await readFile(path.join(root, 'scripts/validate-syntax.mjs'), 'utf8');
const releaseChecksums = await readFile(path.join(root, 'scripts/release-checksums.mjs'), 'utf8');
const releaseReadiness = await readFile(path.join(root, 'scripts/release-readiness.mjs'), 'utf8');
const downloadPageGenerator = await readFile(path.join(root, 'scripts/generate-download-page.mjs'), 'utf8');
const localPreview = await readFile(path.join(root, 'scripts/local-preview.mjs'), 'utf8');
const macZipPackager = await readFile(path.join(root, 'scripts/package-mac-zip.mjs'), 'utf8');
const macAppVerifier = await readFile(path.join(root, 'scripts/verify-mac-app.mjs'), 'utf8');
const macLaunchDiagnostic = await readFile(path.join(root, 'scripts/diagnose-mac-launch.mjs'), 'utf8');
const iconGenerator = await readFile(path.join(root, 'scripts/generate-app-icon.mjs'), 'utf8');
const cli = await readFile(path.join(root, 'bin/shibanshu-markdown.mjs'), 'utf8');
const llmSkill = await readFile(path.join(root, 'skills/shibanshu-markdown-context/SKILL.md'), 'utf8');

if (!html.includes('Shibanshu Markdown Viewer')) {
  throw new Error('Built HTML is missing the app title.');
}

if (html.includes('src="/assets/') || html.includes('href="/assets/')) {
  throw new Error('Built HTML still uses absolute asset paths; Electron file loading will break.');
}

const assetRefs = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((match) => match[1]);

if (!assetRefs.length) {
  throw new Error('Built HTML does not reference compiled renderer assets.');
}

for (const assetRef of assetRefs) {
  const assetPath = path.join(root, 'dist', assetRef.replace(/^\.\//, ''));
  await access(assetPath);
}

if (mainProcess.includes('sandbox: false')) {
  throw new Error('Main window sandbox is disabled.');
}

if (!mainProcess.includes('atomicWriteFile(')) {
  throw new Error('Main process is missing atomic file writes.');
}

if (!mainProcess.includes('assertTrustedSender')) {
  throw new Error('Main process is missing IPC sender validation.');
}

if (!mainProcess.includes('setDocumentEdited')) {
  throw new Error('Main process is missing native dirty-document integration.');
}

if (
  !mainProcess.includes('saveAutosaveDrafts') ||
  !mainProcess.includes('readAutosaveDrafts') ||
  !mainProcess.includes("handleApp('autosave:save-drafts'") ||
  !mainProcess.includes('MAX_AUTOSAVE_BYTES')
) {
  throw new Error('Main process is missing autosave draft persistence.');
}

if (
  !mainProcess.includes('recordFileHistorySnapshot') ||
  !mainProcess.includes('listFileHistory') ||
  !mainProcess.includes("handleApp('file:history-list'") ||
  !mainProcess.includes('MAX_HISTORY_SNAPSHOTS_PER_FILE')
) {
  throw new Error('Main process is missing local version history persistence.');
}

if (!mainProcess.includes('discoverVaultMarkdownFiles') || !mainProcess.includes('dialog:open-vault')) {
  throw new Error('Main process is missing the Open Folder vault implementation.');
}

if (!mainProcess.includes("'.canvas'") || !mainProcess.includes('JSON Canvas')) {
  throw new Error('Main process is missing JSON Canvas file opening, saving, or vault discovery support.');
}

if (
  !mainProcess.includes('resolveTrustedVaultPath') ||
  !mainProcess.includes("handleApp('vault:create-file'") ||
  !mainProcess.includes("handleApp('vault:rename-file'") ||
  !mainProcess.includes("handleApp('vault:delete-file'") ||
  !mainProcess.includes('shell.trashItem')
) {
  throw new Error('Main process is missing safe vault create/rename/delete operations.');
}

if (!mainProcess.includes('command-palette') || !mainProcess.includes('graph:open') || !mainProcess.includes('mind-map:open')) {
  throw new Error('Main process is missing command palette or graph menu commands.');
}

if (
  !mainProcess.includes('APP_PROTOCOL_SCHEME') ||
  !mainProcess.includes("app.on('open-url'") ||
  !mainProcess.includes('parseProtocolUrl') ||
  !mainProcess.includes('setAsDefaultProtocolClient') ||
  !mainProcess.includes('system-url-command')
) {
  throw new Error('Main process is missing native URL scheme handling.');
}

if (!mainProcess.includes("params.get('mode'") || !mainProcess.includes("params.get('space'")) {
  throw new Error('Protocol workflow parser is missing graph mode or space fallback handling.');
}

if (
  !mainProcess.includes("handleApp('vault:publish-static'") ||
  !mainProcess.includes('publishStaticSite') ||
  !mainProcess.includes('MAX_PUBLISH_FILES') ||
  !mainProcess.includes('resolvePublishOutputPath')
) {
  throw new Error('Main process is missing the safe static publish implementation.');
}

if (
  !mainProcess.includes("handleApp('file:export-text'") ||
  !mainProcess.includes('normalizeTextExportPayload') ||
  !mainProcess.includes('MAX_TEXT_EXPORT_BYTES')
) {
  throw new Error('Main process is missing safe graph/text export support.');
}

if (!mainProcess.includes('search:global') || !mainProcess.includes('Search Files')) {
  throw new Error('Main process is missing global search menu command.');
}

if (
  !mainProcess.includes("handleApp('recent:list'") ||
  !mainProcess.includes("handleApp('recent:open-file'") ||
  !mainProcess.includes("handleApp('recent:open-vault'") ||
  !mainProcess.includes('rememberRecentVault') ||
  !mainProcess.includes('recent-workspaces.json') ||
  !mainProcess.includes("label: 'Quick Open...'")
) {
  throw new Error('Main process is missing secure recent workspace storage or quick-open menu integration.');
}

if (!mainProcess.includes('format:bold') || !mainProcess.includes('format:table') || !mainProcess.includes("label: 'Format'")) {
  throw new Error('Main process is missing native Markdown formatting menu commands.');
}

if (preload.includes('openPaths:')) {
  throw new Error('Preload exposes arbitrary path opening.');
}

if (!preload.includes('openVault')) {
  throw new Error('Preload is missing the Open Folder vault bridge.');
}

if (!preload.includes('listRecentItems') || !preload.includes('openRecentFile') || !preload.includes('openRecentVault')) {
  throw new Error('Preload is missing the narrow recent file/vault bridge.');
}

if (!preload.includes('createVaultFile') || !preload.includes('renameVaultFile') || !preload.includes('deleteVaultFile')) {
  throw new Error('Preload is missing the narrow vault file operation bridge.');
}

if (!preload.includes('readAutosaveDrafts') || !preload.includes('saveAutosaveDrafts') || !preload.includes('clearAutosaveDrafts')) {
  throw new Error('Preload is missing the autosave draft bridge.');
}

if (!preload.includes('listFileHistory') || !preload.includes('readFileHistorySnapshot')) {
  throw new Error('Preload is missing the local version history bridge.');
}

if (!preload.includes('publishStaticSite')) {
  throw new Error('Preload is missing the static publish bridge.');
}

if (!preload.includes('exportText')) {
  throw new Error('Preload is missing the safe text export bridge.');
}

if (!preload.includes('onSystemUrlCommand')) {
  throw new Error('Preload is missing the native URL command bridge.');
}

if (!preload.includes('onExternalFileChanged')) {
  throw new Error('Preload is missing external file-change notifications.');
}

if (!renderer.includes('handleExternalFileChange')) {
  throw new Error('Renderer is missing external file-change handling.');
}

if (
  !renderer.includes('inspectAutosaveDrafts') ||
  !renderer.includes('writeAutosaveDrafts') ||
  !renderer.includes('restoreAutosaveDrafts') ||
  !renderer.includes('discardAutosaveDrafts')
) {
  throw new Error('Renderer is missing autosave draft recovery.');
}

if (!renderer.includes('openVersionHistory') || !renderer.includes('restoreHistorySnapshot') || !renderer.includes('renderVersionHistory')) {
  throw new Error('Renderer is missing local version history recovery.');
}

if (!renderer.includes('insertMindMapFromHeadings') || !renderer.includes('openMindMapCanvas') || !renderer.includes('buildMindMapModel')) {
  throw new Error('Renderer is missing the mind map insertion or visual canvas command.');
}

if (!renderer.includes('renderVaultSidebar') || !renderer.includes('findBacklinks') || !renderer.includes('openVaultFromDialog')) {
  throw new Error('Renderer is missing the vault sidebar/index implementation.');
}

if (!renderer.includes('const vaultFiles = Array.isArray(vault.files) ? vault.files : []') || renderer.includes('!vault?.files?.length')) {
  throw new Error('Opening an empty repository must keep the sidebar in repository mode.');
}

if (
  !renderer.includes('renderVaultFileTree') ||
  !renderer.includes('buildVaultFileTree') ||
  !renderer.includes('toggleVaultFolder') ||
  !renderer.includes('vaultExpandedFolders')
) {
  throw new Error('Renderer is missing the collapsible vault file tree implementation.');
}

if (
  !renderer.includes('createVaultFileFromPrompt') ||
  !renderer.includes('renameActiveVaultFileFromPrompt') ||
  !renderer.includes('deleteActiveVaultFileWithConfirmation') ||
  !renderer.includes('isDocumentInActiveVault')
) {
  throw new Error('Renderer is missing vault file explorer operations.');
}

if (!renderer.includes('buildVaultGraph') || !renderer.includes('renderGraphPanel') || !renderer.includes('setGraphMode')) {
  throw new Error('Renderer is missing the local/global graph implementation.');
}

if (!renderer.includes('openFullGraph') || !renderer.includes('renderFullGraph') || !renderer.includes('layoutForceGraphNodes')) {
  throw new Error('Renderer is missing the full graph/map implementation.');
}

if (
  !renderer.includes('applyFullGraphFilters') ||
  !renderer.includes('renderFullGraphFolderOptions') ||
  !renderer.includes('renderFullGraphExtensionOptions') ||
  !renderer.includes('renderFullGraphDetail') ||
  !renderer.includes('previewFullGraphNode') ||
  !renderer.includes('showFullGraphPreviewPopover') ||
  !renderer.includes('hideFullGraphPreviewPopover') ||
  !renderer.includes('renderFullGraphPreviewPopover') ||
  !renderer.includes('renderGraphPreviewSnippetHtml') ||
  !renderer.includes('getGraphPreviewMarkdownSnippet') ||
  !renderer.includes('getGraphSourceAnchors') ||
  !renderer.includes('renderSourceAnchorButtons') ||
  !renderer.includes('openDocumentSourceAtLine') ||
  !renderer.includes('handleSourceAnchorClick') ||
  !renderer.includes('focusFullGraphNode') ||
  !renderer.includes('expandFullGraphNeighborhood') ||
  !renderer.includes('handleFullGraphKeyboard') ||
  !renderer.includes('moveFullGraphRovingFocus') ||
  !renderer.includes('focusFullGraphSvgNode') ||
  !renderer.includes('renderFullGraphMinimap') ||
  !renderer.includes('centerFullGraphFromMinimap') ||
  !renderer.includes('fitFullGraphToView') ||
  !renderer.includes('exportFullGraphWithProfile') ||
  !renderer.includes('Save 3D Map File') ||
  !renderer.includes('Auto Rotate 3D Map') ||
  !renderer.includes('exportFullGraphJson') ||
  !renderer.includes('exportFullGraphContext') ||
  !renderer.includes('buildFullGraphContextMarkdown') ||
  !renderer.includes('VALID_GRAPH_EXPORT_PROFILES') ||
  !renderer.includes('renderFullGraphPresetOptions') ||
  !renderer.includes('fullGraphLocalDepth') ||
  !renderer.includes('documentHasMediaReferences') ||
  !renderer.includes('documentHasCanvasReferences') ||
  !renderer.includes('parseJsonCanvasDocument') ||
  !renderer.includes('extractJsonCanvasLinks') ||
  !renderer.includes('extractJsonCanvasConnectionEdges') ||
  !renderer.includes('renderJsonCanvasPreview') ||
  !renderer.includes('hasMedia') ||
  !renderer.includes('hasCanvas')
) {
  throw new Error('Renderer is missing graph filtering, JSON Canvas parsing, type/media/canvas metadata, focus, depth, export, presets, or hover-preview inspection.');
}

if (!renderer.includes('renderMindMapDetail') || !renderer.includes('previewMindMapNode')) {
  throw new Error('Renderer is missing mind-map hover-preview inspection.');
}

if (!renderer.includes('openCommandPalette') || !renderer.includes('getCommandPaletteItems') || !renderer.includes('runCommandPaletteSelection')) {
  throw new Error('Renderer is missing the command palette implementation.');
}

if (
  !renderer.includes('openQuickOpen') ||
  !renderer.includes('refreshRecentItems') ||
  !renderer.includes('renderSidebarRecentWork') ||
  !renderer.includes('handleSidebarRecentWorkClick') ||
  !renderer.includes('handleActivitySurface') ||
  !renderer.includes('renderWorkspaceShell') ||
  !renderer.includes('shouldShowWorkspaceStart') ||
  !renderer.includes('getRecentCommandPaletteItems') ||
  !renderer.includes('openRecentVault') ||
  !renderer.includes('openRecentFile') ||
  !renderer.includes('getCommandPaletteDocuments')
) {
  throw new Error('Renderer is missing quick-open, recent vault/file, or open-document switching support.');
}

if (
  !renderer.includes('openBrowserMarkdownFiles') ||
  !renderer.includes('openBrowserMarkdownVault') ||
  !renderer.includes('saveBrowserFileAs') ||
  !renderer.includes('publishBrowserStaticSite') ||
  !renderer.includes('browser-vault://') ||
  !renderer.includes('showDirectoryPicker') ||
  !renderer.includes('downloadBlobFallback')
) {
  throw new Error('Renderer is missing browser/dev fallback file, vault, save, export, or publish handlers.');
}

if (!renderer.includes('openGlobalSearch') || !renderer.includes('createSearchResult') || !renderer.includes('highlightSearchTerms')) {
  throw new Error('Renderer is missing the global search implementation.');
}

if (!renderer.includes('GRAPH_RENDER_NODE_LIMIT') || !renderer.includes('limitGraphForRender')) {
  throw new Error('Renderer is missing the large-vault graph rendering cap.');
}

if (!renderer.includes('buildAiContextMap') || !renderer.includes('copyAiContextMap') || !renderer.includes('createAiContextMapDocument')) {
  throw new Error('Renderer is missing the free AI context map implementation.');
}

if (!renderer.includes('copyMindMapContext') || !renderer.includes('buildMindMapContextMarkdown') || !renderer.includes('extractMarkdownTasks')) {
  throw new Error('Renderer is missing the Claude-ready mind map context implementation.');
}

if (
  !renderer.includes('renderMermaidMindMapPreview') ||
  !renderer.includes('parseMermaidMindMap') ||
  !renderer.includes('extractMermaidMindMapShapeLabel') ||
  !renderer.includes('preview-mind-map-node')
) {
  throw new Error('Renderer is missing the readable Mermaid mind-map preview renderer.');
}

if (
  !renderer.includes('buildPublishSitePayload') ||
  !renderer.includes('renderPublishDocumentBody') ||
  !renderer.includes('publishStaticSite') ||
  !renderer.includes('createPublishRouteMap')
) {
  throw new Error('Renderer is missing the static publish payload implementation.');
}

if (!renderer.includes('handleSystemUrlCommand') || !renderer.includes("command.type === 'search'")) {
  throw new Error('Renderer is missing native URL command handling.');
}

if (
  !renderer.includes('executeWorkflowAction') ||
  !renderer.includes('normalizeWorkflowCommand') ||
  !renderer.includes('resolveWorkflowTarget') ||
  !renderer.includes('resolveDocumentFromTarget') ||
  !renderer.includes('resolveDocumentByKey')
) {
  throw new Error('Renderer is missing workflow URL parser/target resolution chain.');
}

if (!renderer.includes('getGraphTargetCandidates') || !renderer.includes('extractFrontmatterMetadata')) {
  throw new Error('Renderer is missing workflow-resilient graph target or frontmatter-aware document linking.');
}

if (!renderer.includes('new EditorView') || !renderer.includes('markdown()') || !renderer.includes('basicSetup')) {
  throw new Error('Renderer is missing the CodeMirror Markdown editor foundation.');
}

if (
  !renderer.includes('runFormattingCommand') ||
  !renderer.includes('toggleMarkdownWrap') ||
  !renderer.includes('insertMarkdownLink') ||
  !renderer.includes('toggleTaskList') ||
  !renderer.includes('insertMarkdownTable')
) {
  throw new Error('Renderer is missing Markdown formatting command implementations.');
}

if (!html.includes('vault-sidebar') || !html.includes('graph-canvas') || !html.includes('copy-ai-map')) {
  throw new Error('Built HTML is missing the vault sidebar, graph, or AI map controls.');
}

if (!html.includes('recent-work-list') || !html.includes('sidebar-open-vault') || !html.includes('sidebar-open-file')) {
  throw new Error('Built HTML is missing recent-work or sidebar open controls.');
}

if (
  !html.includes('activity-rail') ||
  !html.includes('workspace-start') ||
  !html.includes('document-workbench') ||
  !html.includes('workspace-inspector') ||
  !html.includes('inspector-metrics')
) {
  throw new Error('Built HTML is missing the 2.0 workspace shell.');
}

if (!html.includes('new-vault-file') || !html.includes('rename-vault-file') || !html.includes('delete-vault-file')) {
  throw new Error('Built HTML is missing vault file operation controls.');
}

if (!html.includes('command-palette') || !html.includes('full-graph-modal') || !html.includes('open-full-graph')) {
  throw new Error('Built HTML is missing the command palette or full graph controls.');
}

if (
  !html.includes('full-graph-folder-filter') ||
  !html.includes('full-graph-extension-filter') ||
  !html.includes('full-graph-filter-tagged') ||
  !html.includes('full-graph-filter-media') ||
  !html.includes('full-graph-filter-canvas') ||
  !html.includes('full-graph-detail') ||
  !html.includes('full-graph-depth') ||
  !html.includes('full-graph-preset') ||
  !html.includes('full-graph-minimap') ||
  !html.includes('full-graph-preview-popover') ||
  !html.includes('full-graph-export-profile') ||
  !html.includes('export-graph-json') ||
  !html.includes('export-graph-svg') ||
  !html.includes('export-graph-context')
) {
  throw new Error('Built HTML is missing graph filter, depth, preset, export, or detail-inspector controls.');
}

if (!html.includes('mind-map-modal') || !html.includes('mind-map-canvas') || !html.includes('open-mind-map')) {
  throw new Error('Built HTML is missing visual mind map canvas controls.');
}

if (!html.includes('mind-map-detail')) {
  throw new Error('Built HTML is missing the mind-map detail inspector.');
}

if (!html.includes('publish-vault')) {
  throw new Error('Built HTML is missing the static publish control.');
}

if (!html.includes('global-search') || !html.includes('global-search-input') || !html.includes('global-search-trigger')) {
  throw new Error('Built HTML is missing global search controls.');
}

if (!html.includes('recovery-modal') || !html.includes('restore-drafts') || !html.includes('discard-drafts')) {
  throw new Error('Built HTML is missing autosave recovery controls.');
}

if (!html.includes('history-modal') || !html.includes('history-list') || !html.includes('version-history-trigger')) {
  throw new Error('Built HTML is missing local version history controls.');
}

if (!html.includes('format-toolbar') || !html.includes('data-format-command="bold"') || !html.includes('data-format-command="table"')) {
  throw new Error('Built HTML is missing Markdown formatting controls.');
}

if (html.includes('<textarea')) {
  throw new Error('Built HTML still contains the old textarea editor.');
}

if (!styles.includes(':focus-visible')) {
  throw new Error('Styles are missing visible keyboard focus states.');
}

if (!styles.includes('.full-graph-stage') || !styles.includes('.command-panel')) {
  throw new Error('Styles are missing the full graph or command palette surfaces.');
}

if (!styles.includes('.mind-map-stage') || !styles.includes('.mind-map-node') || !styles.includes('.mind-map-list-node')) {
  throw new Error('Styles are missing visual mind map canvas surfaces.');
}

if (
  !styles.includes('.graph-filter-panel') ||
  !styles.includes('.graph-depth-filter') ||
  !styles.includes('.graph-preset-row') ||
  !styles.includes('.graph-export-actions') ||
  !styles.includes('.graph-detail-card') ||
  !styles.includes('.graph-detail-metrics') ||
  !styles.includes('.graph-detail-actions') ||
  !styles.includes('.graph-preview-popover') ||
  !styles.includes('.graph-preview-body') ||
  !styles.includes('.source-anchor-actions') ||
  !styles.includes('.source-anchor') ||
  !styles.includes('.graph-node.previewed') ||
  !styles.includes('.mind-map-node.previewed') ||
  !styles.includes('.mind-map-list-node.previewed') ||
  !styles.includes('.full-graph-node.previewed') ||
  !styles.includes('.full-graph-minimap') ||
  !styles.includes('.graph-minimap-viewport') ||
  !styles.includes('.graph-export-profile') ||
  !styles.includes('.json-canvas-preview') ||
  !styles.includes('.graph-node.media') ||
  !styles.includes('.graph-node.canvas')
) {
  throw new Error('Styles are missing graph filter, depth, preset, export, media/canvas, focus action, or detail inspector surfaces.');
}

if (!styles.includes('.search-panel') || !styles.includes('.search-result') || !styles.includes('.search-summary')) {
  throw new Error('Styles are missing global search surfaces.');
}

if (!styles.includes('.sidebar-icon-action') || !styles.includes('.file-actions') || !styles.includes('.vault-folder') || !styles.includes('.vault-tree-file')) {
  throw new Error('Styles are missing vault file operation or collapsible tree controls.');
}

if (!styles.includes('.preview-mind-map-svg') || !styles.includes('.preview-mind-map-node')) {
  throw new Error('Styles are missing readable Mermaid mind-map preview surfaces.');
}

if (!styles.includes('.recovery-panel') || !styles.includes('.recovery-item')) {
  throw new Error('Styles are missing autosave recovery surfaces.');
}

if (!styles.includes('.history-panel') || !styles.includes('.history-item')) {
  throw new Error('Styles are missing local version history surfaces.');
}

if (!styles.includes('.format-toolbar') || !styles.includes('.format-button')) {
  throw new Error('Styles are missing Markdown formatting controls.');
}

if (parityPlan.match(/\$[0-9]/)) {
  throw new Error('Obsidian parity plan contains pricing amounts.');
}

if (!megaStressPlan.includes('Extreme Test Gates') || !megaStressPlan.includes('Installable Offline Distribution')) {
  throw new Error('Mega stress plan is missing core premium gap tracks.');
}

if (
  !packageJson.includes('"context:claude"') ||
  !packageJson.includes('"publish:static"') ||
  !packageJson.includes('"validate:syntax"') ||
  !packageJson.includes('"mcp:safety"') ||
  !packageJson.includes('"stress"') ||
  !packageJson.includes('"release:checksums"') ||
  !packageJson.includes('"release:readiness"') ||
  !packageJson.includes('"generate:download-page"') ||
  !packageJson.includes('"package:mac:zip"') ||
  !packageJson.includes('"verify:mac:app"') ||
  !packageJson.includes('"diagnose:mac:launch"') ||
  !packageJson.includes('"local:web"') ||
  !packageJson.includes('sign-dev-mac') ||
  !packageJson.includes('"test:ui"')
) {
  throw new Error('Package scripts are missing validation, stress, release, context, publish, UI smoke, or dev-signing helpers.');
}

if (!packageJson.includes('"mcp-server.mjs"')) {
  throw new Error('Electron package file list does not include the MCP server.');
}

if (
  !packageJson.includes('"assets:icon"') ||
  !packageJson.includes('"cli"') ||
  !packageJson.includes('"bin"') ||
  !packageJson.includes('"icon": "build/icon.icns"') ||
  !packageJson.includes('"icon": "build/icon.ico"') ||
  !packageJson.includes('"NSAudioCaptureUsageDescription"') ||
  !packageJson.includes('"mkd"') ||
  !packageJson.includes('"canvas"') ||
  !packageJson.includes('"win"') ||
  !packageJson.includes('"linux"') ||
  !packageJson.includes('"shibanshu-markdown"')
) {
  throw new Error('Package metadata is missing custom icons, CLI, file associations, platform targets, or URL scheme registration.');
}

if (!iconGenerator.includes('createIcns') || !iconGenerator.includes('createIco') || !iconGenerator.includes('createIconPng') || !iconGenerator.includes('icon.icns')) {
  throw new Error('App icon generator is incomplete.');
}

if (!localPreview.includes('findAvailablePort') || !localPreview.includes('serveIndex') || !localPreview.includes('127.0.0.1')) {
  throw new Error('Local web preview runner is incomplete.');
}

if (!macZipPackager.includes('ditto') || !macZipPackager.includes('--keepParent') || !macZipPackager.includes('mac.zip')) {
  throw new Error('Mac ZIP packager is missing installer artifact creation.');
}

if (!macAppVerifier.includes('LaunchServices') || !macAppVerifier.includes('codesign') || !macAppVerifier.includes('app.asar') || !macAppVerifier.includes('--require-launchservices')) {
  throw new Error('Mac app verifier is missing bundle, signing, asar, or LaunchServices diagnostics.');
}

if (
  !macLaunchDiagnostic.includes('DiagnosticReports') ||
  !macLaunchDiagnostic.includes('RegisterApplication') ||
  !macLaunchDiagnostic.includes('MachPortRendezvous') ||
  !macLaunchDiagnostic.includes('--require-clean')
) {
  throw new Error('Mac launch diagnostic is missing crash report or launch-environment classification.');
}

if (
  !cli.includes('runContextExporter') ||
  !cli.includes('runStaticPublisher') ||
  !cli.includes('runCreateNote') ||
  !cli.includes('buildAppUrl') ||
  !cli.includes('atomicWriteFile')
) {
  throw new Error('CLI entrypoint is incomplete.');
}

if (
  !staticPublisher.includes('buildSitePayload') ||
  !staticPublisher.includes('renderStaticSite') ||
  !staticPublisher.includes('resolveOutputPath') ||
  !staticPublisher.includes('loadPublishProfile') ||
  !staticPublisher.includes('savePublishProfile') ||
  !staticPublisher.includes('extractWikiLinks') ||
  !staticPublisher.includes('window.SHIBANSHU_PUBLISH_DATA')
) {
  throw new Error('Static publisher is incomplete.');
}

  if (
    !claudeExporter.includes('renderClaudeContextMap') ||
    !claudeExporter.includes('renderClaudeMindMap') ||
    !claudeExporter.includes('renderClaudeNavigationGuide') ||
    !claudeExporter.includes('buildScenePayload') ||
    !claudeExporter.includes('renderContextChunks') ||
  !claudeExporter.includes('extractCodeImports') ||
  !claudeExporter.includes('extractDocumentSymbols') ||
  !claudeExporter.includes('extractJsonCanvasLinks') ||
  !claudeExporter.includes('extractJsonCanvasConnectionEdges') ||
  !claudeExporter.includes('canvas-edge') ||
  !claudeExporter.includes('resolveImportDocument') ||
  !claudeExporter.includes('getEdgeKindCounts') ||
  !claudeExporter.includes('analyzeRepositoryContext') ||
    !claudeExporter.includes('serializeContextAnalysis') ||
    !claudeExporter.includes('CONTEXT_SCHEMA_VERSION') ||
    !claudeExporter.includes('context-integrity.json') ||
    !claudeExporter.includes('buildContextIntegrityPayload') ||
    !claudeExporter.includes('claude-context-navigation.md') ||
    !claudeExporter.includes('claude-context-mind-map.md') ||
    !claudeExporter.includes('claude-context-graph.json') ||
    !claudeExporter.includes('claude-context-scene.json') ||
    !claudeExporter.includes('llm-context-chunks.jsonl')
  ) {
    throw new Error('Claude context exporter is incomplete.');
  }

if (!syntaxValidator.includes('node:child_process') || !syntaxValidator.includes('--check')) {
  throw new Error('Syntax validator is incomplete.');
}

if (!stressCheck.includes('Extreme stress check passed') || !stressCheck.includes('createStressVault') || !stressCheck.includes('javascript:alert')) {
  throw new Error('Extreme stress check is incomplete.');
}

if (!stressCheck.includes('scripts/mcp-safety-check.mjs')) {
  throw new Error('Stress check does not exercise MCP safety.');
}

if (
  !mcpServer.includes('assertReadableMarkdownFile') ||
  !mcpServer.includes('atomicCreateUtf8File') ||
  !mcpServer.includes('normalizeVaultRelativePath') ||
  !mcpServer.includes('generateStandaloneGraphViewer') ||
  !mcpServer.includes('resolveHtmlOutputPath') ||
  !mcpServer.includes('context-integrity.json') ||
  !mcpServer.includes("scene: 'claude-context-scene.json'")
) {
  throw new Error('MCP server is missing path safety, atomic creation, or complete context artifact support.');
}

if (!releaseChecksums.includes('SHA256SUMS') || !releaseChecksums.includes('release-manifest.json') || !releaseChecksums.includes('mac-zip')) {
  throw new Error('Release checksum generator is incomplete.');
}

if (!releaseReadiness.includes('release-readiness.json') || !releaseReadiness.includes('--public') || !releaseReadiness.includes('Developer ID') || !releaseReadiness.includes('notarization')) {
  throw new Error('Release readiness gate is incomplete.');
}

if (!downloadPageGenerator.includes('Trust And Privacy') || !downloadPageGenerator.includes('works offline') || !downloadPageGenerator.includes('mac-zip') || !downloadPageGenerator.includes('Release Readiness') || !downloadPageGenerator.includes('npm run local:web')) {
  throw new Error('Download page generator is incomplete.');
}

if (!llmSkill.includes('shibanshu-markdown context') || !llmSkill.includes('claude-context-navigation.md') || !llmSkill.includes('llm-context-chunks.jsonl')) {
  throw new Error('Shibanshu Markdown LLM skill is incomplete.');
}

const helpResult = spawnSync(process.execPath, ['scripts/export-claude-map.mjs', '--help'], {
  cwd: root,
  encoding: 'utf8'
});

if (helpResult.status !== 0 || !helpResult.stdout.includes('Usage: npm run context:claude')) {
  throw new Error('Claude context exporter help output failed.');
}

const cliHelpResult = spawnSync(process.execPath, ['bin/shibanshu-markdown.mjs', '--help'], {
  cwd: root,
  encoding: 'utf8'
});

if (cliHelpResult.status !== 0 || !cliHelpResult.stdout.includes('Usage: shibanshu-markdown')) {
  throw new Error('CLI help output failed.');
}

const cliUrlResult = spawnSync(process.execPath, ['bin/shibanshu-markdown.mjs', 'url', 'search', '--query', 'roadmap', '--print-url'], {
  cwd: root,
  encoding: 'utf8'
});

if (cliUrlResult.status !== 0 || !cliUrlResult.stdout.trim().startsWith('shibanshu-markdown://search?query=roadmap')) {
  throw new Error('CLI URL builder failed.');
}

const cliTempDir = await mkdtemp(path.join(os.tmpdir(), 'shibanshu-cli-smoke-'));
const cliNotePath = path.join(cliTempDir, 'note.md');
const cliCreateResult = spawnSync(process.execPath, ['bin/shibanshu-markdown.mjs', 'create-note', cliNotePath, '--content', '# CLI Smoke', '--no-open'], {
  cwd: root,
  encoding: 'utf8'
});

if (cliCreateResult.status !== 0) {
  throw new Error(`CLI create-note failed: ${cliCreateResult.stderr || cliCreateResult.stdout}`);
}

const cliCreatedNote = await readFile(cliNotePath, 'utf8');
if (!cliCreatedNote.includes('# CLI Smoke')) {
  throw new Error('CLI create-note did not write the expected content.');
}

const cliOverwriteResult = spawnSync(process.execPath, ['bin/shibanshu-markdown.mjs', 'create-note', cliNotePath, '--content', '# Overwrite', '--no-open'], {
  cwd: root,
  encoding: 'utf8'
});

if (cliOverwriteResult.status === 0 || !`${cliOverwriteResult.stderr}${cliOverwriteResult.stdout}`.includes('File already exists')) {
  throw new Error('CLI create-note did not protect an existing file.');
}

const publishVaultDir = await mkdtemp(path.join(os.tmpdir(), 'shibanshu-publish-vault-'));
const publishOutDir = await mkdtemp(path.join(os.tmpdir(), 'shibanshu-publish-site-'));
await writeFile(path.join(publishVaultDir, 'Index.md'), '# Index\n\nSee [[Topic]].\n\n#home\n', 'utf8');
await writeFile(path.join(publishVaultDir, 'Topic.md'), '# Topic\n\nBack to [[Index]].\n', 'utf8');

const cliPublishResult = spawnSync(
  process.execPath,
  ['bin/shibanshu-markdown.mjs', 'publish', publishVaultDir, '--out', publishOutDir, '--title', 'Smoke Site'],
  {
    cwd: root,
    encoding: 'utf8'
  }
);

if (cliPublishResult.status !== 0) {
  throw new Error(`CLI static publish failed: ${cliPublishResult.stderr || cliPublishResult.stdout}`);
}

await access(path.join(publishOutDir, 'index.html'));
await access(path.join(publishOutDir, 'assets/site-data.js'));
await access(path.join(publishOutDir, 'assets/graph.json'));
await access(path.join(publishOutDir, 'notes/index.html'));
await access(path.join(publishOutDir, 'notes/topic.html'));

const publishedIndex = await readFile(path.join(publishOutDir, 'index.html'), 'utf8');
if (!publishedIndex.includes('Smoke Site') || !publishedIndex.includes('graph.json')) {
  throw new Error('CLI static publish index is missing expected site content.');
}

const publishedNote = await readFile(path.join(publishOutDir, 'notes/index.html'), 'utf8');
if (!publishedNote.includes('href="notes/topic.html"') && !publishedNote.includes('href="topic.html"')) {
  throw new Error('CLI static publish did not rewrite wiki links.');
}

const publishedGraph = JSON.parse(await readFile(path.join(publishOutDir, 'assets/graph.json'), 'utf8'));
if (!Array.isArray(publishedGraph.nodes) || publishedGraph.nodes.length !== 2 || !Array.isArray(publishedGraph.edges) || publishedGraph.edges.length < 2) {
  throw new Error('CLI static publish did not emit the expected graph.');
}

const profileBaseDir = await mkdtemp(path.join(os.tmpdir(), 'shibanshu-publish-profile-'));
const profileVaultDir = path.join(profileBaseDir, 'vault');
await mkdir(profileVaultDir, { recursive: true });
await writeFile(path.join(profileVaultDir, 'Home.md'), '# Home\n\nSee [[Details]].\n', 'utf8');
await writeFile(path.join(profileVaultDir, 'Details.md'), '# Details\n\nBack to [[Home]].\n', 'utf8');

const cliProfileSaveResult = spawnSync(
  process.execPath,
  [path.join(root, 'bin/shibanshu-markdown.mjs'), 'publish', '.', '--save-profile', 'docs', '--out', 'site', '--title', 'Profile Site', '--theme', 'dark'],
  {
    cwd: profileVaultDir,
    encoding: 'utf8'
  }
);

if (cliProfileSaveResult.status !== 0) {
  throw new Error(`CLI publish profile save failed: ${cliProfileSaveResult.stderr || cliProfileSaveResult.stdout}`);
}

await access(path.join(profileVaultDir, '.shibanshu/publish-profiles.json'));
await access(path.join(profileVaultDir, 'site/index.html'));
const savedProfiles = JSON.parse(await readFile(path.join(profileVaultDir, '.shibanshu/publish-profiles.json'), 'utf8'));
if (savedProfiles.profiles?.docs?.out !== 'site' || savedProfiles.profiles?.docs?.theme !== 'dark') {
  throw new Error('CLI publish profile did not save the expected settings.');
}

const cliProfileListResult = spawnSync(process.execPath, [path.join(root, 'bin/shibanshu-markdown.mjs'), 'publish', '.', '--list-profiles'], {
  cwd: profileVaultDir,
  encoding: 'utf8'
});

if (cliProfileListResult.status !== 0 || !cliProfileListResult.stdout.includes('docs')) {
  throw new Error('CLI publish profile list failed.');
}

const cliProfilePublishResult = spawnSync(process.execPath, [path.join(root, 'bin/shibanshu-markdown.mjs'), 'publish', '.', '--profile', 'docs'], {
  cwd: profileVaultDir,
  encoding: 'utf8'
});

if (cliProfilePublishResult.status !== 0 || !cliProfilePublishResult.stdout.includes('Profile: docs')) {
  throw new Error(`CLI publish profile reuse failed: ${cliProfilePublishResult.stderr || cliProfilePublishResult.stdout}`);
}

const profileSiteGraph = JSON.parse(await readFile(path.join(profileVaultDir, 'site/assets/graph.json'), 'utf8'));
if (!Array.isArray(profileSiteGraph.edges) || profileSiteGraph.edges.length < 2) {
  throw new Error('CLI publish profile output did not contain the expected graph.');
}

console.log('Smoke check passed.');
