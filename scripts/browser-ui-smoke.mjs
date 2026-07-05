import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const root = process.cwd();
const appUrl = pathToFileURL(path.join(root, 'dist', 'index.html')).href;
const sessionKey = 'shibanshu-markdown-viewer-session-v1';
const vaultRoot = '/tmp/shibanshu-vault';

const documents = [
  {
    id: 'note-a',
    title: 'Roadmap.md',
    path: `${vaultRoot}/Roadmap.md`,
    relativePath: 'Roadmap.md',
    content:
      '# Roadmap\n\nLinks to [[Implementation]] and [[Claude Map]].\n\n```mermaid\nmindmap\n  root((Repository Context))\n    CLAUDE.md\n      Graph index\n```\n\n- [ ] Wire the canvas\n- [x] Keep Claude context local\n\n#graph #planning\n',
    dirty: false,
    lastSavedAt: Date.now(),
    fileState: { size: 80, mtimeMs: Date.now() }
  },
  {
    id: 'note-b',
    title: 'Implementation.md',
    path: `${vaultRoot}/Docs/Implementation.md`,
    relativePath: 'Docs/Implementation.md',
    content: '# Implementation\n\nBack to [[Roadmap]].\n\n## Graph\n\nForce layout and search.\n',
    dirty: false,
    lastSavedAt: Date.now(),
    fileState: { size: 88, mtimeMs: Date.now() }
  },
  {
    id: 'note-c',
    title: 'Claude Map.md',
    path: `${vaultRoot}/Claude Map.md`,
    relativePath: 'Claude Map.md',
    content: '# Claude Map\n\nContext pack links to [[Implementation]].\n',
    dirty: false,
    lastSavedAt: Date.now(),
    fileState: { size: 60, mtimeMs: Date.now() }
  },
  {
    id: 'note-d',
    title: 'Media Assets.md',
    path: `${vaultRoot}/Assets/Media Assets.md`,
    relativePath: 'Assets/Media Assets.md',
    content: '# Media Assets\n\n![Wireframe](images/wireframe.png)\n\n[Audio walkthrough](audio/intro.mp3)\n\nBack to [[Roadmap]].\n',
    dirty: false,
    lastSavedAt: Date.now(),
    fileState: { size: 120, mtimeMs: Date.now() }
  },
  {
    id: 'note-e',
    title: 'Canvas Board.md',
    path: `${vaultRoot}/Canvas/Canvas Board.md`,
    relativePath: 'Canvas/Canvas Board.md',
    content: '# Canvas Board\n\nEmbed the planning board: ![[Project.canvas]]\n\nBack to [[Roadmap]].\n',
    dirty: false,
    lastSavedAt: Date.now(),
    fileState: { size: 90, mtimeMs: Date.now() }
  },
  {
    id: 'note-f',
    title: 'Project.canvas',
    path: `${vaultRoot}/Canvas/Project.canvas`,
    relativePath: 'Canvas/Project.canvas',
    content: JSON.stringify(
      {
        nodes: [
          { id: 'roadmap', type: 'file', file: 'Roadmap.md', x: 0, y: 0, width: 360, height: 240 },
          { id: 'implementation', type: 'file', file: 'Docs/Implementation.md', x: 440, y: 0, width: 360, height: 240 },
          { id: 'note', type: 'text', text: 'Review [[Claude Map]] before release.', x: 220, y: 320, width: 320, height: 180 }
        ],
        edges: [{ id: 'edge-roadmap-implementation', fromNode: 'roadmap', toNode: 'implementation', label: 'implementation plan' }]
      },
      null,
      2
    ),
    dirty: false,
    lastSavedAt: Date.now(),
    fileState: { size: 420, mtimeMs: Date.now() }
  }
];

const session = {
  documents,
  activeVault: {
    path: vaultRoot,
    name: 'Smoke Vault',
    openedAt: Date.now()
  },
  activeDocumentId: 'note-a',
  viewMode: 'split',
  graphMode: 'global',
  fullGraphMode: 'global'
};

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  if (isMacBrowserSandboxError(error)) {
    console.warn('Browser UI smoke skipped: macOS sandbox denied Chromium Mach service registration in this terminal context.');
    process.exit(0);
  }
  throw error;
}

const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });

try {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: sessionKey, value: session }
  );

  await page.goto(appUrl);
  await page.waitForSelector('#markdown-editor .cm-editor');

  const vaultCount = await page.textContent('#vault-count');
  if (!vaultCount?.includes('6 files')) {
    throw new Error(`Expected seeded vault count, got: ${vaultCount}`);
  }

  for (const selector of ['#new-vault-file', '#rename-vault-file', '#delete-vault-file']) {
    if (!(await page.locator(selector).isVisible())) {
      throw new Error(`Expected vault file action to be visible: ${selector}`);
    }
  }

  await page.waitForSelector('.vault-folder');
  const vaultTreeText = await page.textContent('#vault-file-list');
  if (!vaultTreeText?.includes('Docs') || !vaultTreeText.includes('Roadmap')) {
    throw new Error(`Vault tree did not render folders and root files: ${vaultTreeText}`);
  }
  const nestedFilePath = `${vaultRoot}/Docs/Implementation.md`;
  if ((await page.locator(`[data-vault-file-path="${nestedFilePath}"]`).count()) !== 0) {
    throw new Error('Nested vault file should start collapsed in the tree.');
  }
  await page.click('[data-vault-folder-path="Docs"]');
  await page.waitForSelector(`[data-vault-file-path="${nestedFilePath}"]`);

  if ((await page.locator('#recovery-modal').count()) !== 1) {
    throw new Error('Expected autosave recovery modal markup.');
  }

  for (const selector of ['[data-format-command="bold"]', '[data-format-command="link"]', '[data-format-command="table"]']) {
    if (!(await page.locator(selector).isVisible())) {
      throw new Error(`Expected Markdown formatting control to be visible: ${selector}`);
    }
  }

  if (!(await page.locator('#publish-vault').isVisible())) {
    throw new Error('Expected static publish toolbar control to be visible.');
  }
  if (await page.locator('#publish-vault').isDisabled()) {
    throw new Error('Expected static publish control to be enabled for a seeded vault.');
  }

  await page.waitForSelector('#markdown-preview .preview-mind-map-svg .preview-mind-map-node');
  const previewMindMapText = await page.textContent('#markdown-preview .preview-mind-map-svg');
  if (!previewMindMapText?.includes('Repository Context') || !previewMindMapText.includes('CLAUDE.md')) {
    throw new Error(`Readable Mermaid mind map preview did not render labels: ${previewMindMapText}`);
  }
  const rawMermaidMindMapCount = await page.locator('#markdown-preview .mermaid-block:not(.mindmap-preview)').count();
  if (rawMermaidMindMapCount !== 0) {
    throw new Error('Mermaid mindmap block fell through to the async Mermaid renderer instead of the readable preview renderer.');
  }

  await page.click('#version-history-trigger');
  await page.waitForSelector('#history-modal:not([hidden])');
  const historyTitle = await page.textContent('#history-title');
  if (!historyTitle?.includes('Roadmap')) {
    throw new Error('Version history modal did not open for the active note.');
  }
  await page.click('#close-history');
  await page.waitForSelector('#history-modal[hidden]');

  await page.click('#open-mind-map');
  await page.waitForSelector('#mind-map-modal:not([hidden])');
  await page.waitForSelector('#mind-map-canvas svg .mind-map-node');
  const mindMapSummary = await page.textContent('#mind-map-summary');
  if (!mindMapSummary?.includes('headings') || !mindMapSummary.includes('links')) {
    throw new Error(`Mind map summary is not populated: ${mindMapSummary}`);
  }
  const initialMindMapDetail = await page.textContent('#mind-map-detail');
  if (!initialMindMapDetail?.includes('Roadmap')) {
    throw new Error(`Mind map detail inspector did not initialize: ${initialMindMapDetail}`);
  }
  await page.fill('#mind-map-search', 'canvas');
  await page.waitForSelector('.mind-map-node.matched');
  const mindMapListText = await page.textContent('#mind-map-list');
  if (!mindMapListText?.toLowerCase().includes('canvas')) {
    throw new Error('Mind map search did not surface the expected task node.');
  }
  await page.hover('.mind-map-list-node');
  await page.waitForFunction(() => document.querySelector('#mind-map-detail')?.textContent.toLowerCase().includes('canvas'));
  if (!(await page.locator('#mind-map-detail [data-source-path][data-source-line]').isVisible())) {
    throw new Error('Mind map detail card is missing source line anchors.');
  }
  await page.click('#mind-map-detail [data-source-path][data-source-line]');
  await page.waitForSelector('#mind-map-modal[hidden]');

  await page.click('#markdown-editor .cm-content');
  await page.click('[data-format-command="bold"]');
  await page.waitForFunction(() => document.querySelector('.cm-content')?.textContent.includes('**bold text**'));

  await page.click('#global-search-trigger');
  await page.waitForSelector('#global-search:not([hidden])');
  await page.fill('#global-search-input', 'force layout');
  await page.waitForSelector('.search-result');
  const searchResultsText = await page.textContent('#global-search-results');
  if (!searchResultsText?.includes('Implementation')) {
    throw new Error('Global search did not find seeded content.');
  }
  await page.click('.search-result');
  await page.waitForSelector('#global-search[hidden]');
  const activeTabAfterSearch = await page.textContent('.tab.active');
  if (!activeTabAfterSearch?.includes('Implementation')) {
    throw new Error('Global search result did not open the expected note.');
  }

  await page.click('#open-full-graph');
  await page.waitForSelector('#full-graph-modal:not([hidden])');
  await page.waitForSelector('#full-graph-canvas svg .graph-node');

  const graphSummary = await page.textContent('#full-graph-summary');
  if (!graphSummary?.includes('all notes') || !graphSummary.includes('links')) {
    throw new Error(`Full graph summary is not populated: ${graphSummary}`);
  }
  for (const selector of [
    '#full-graph-folder-filter',
    '#full-graph-extension-filter',
    '#full-graph-filter-tagged',
    '#full-graph-filter-unresolved',
    '#full-graph-filter-media',
    '#full-graph-filter-canvas',
    '#full-graph-depth',
    '#full-graph-preset',
    '#full-graph-zoom-value',
    '#full-graph-fit',
    '#full-graph-minimap',
    '#full-graph-export-profile',
    '#export-graph-json',
    '#export-graph-svg',
    '#export-graph-context'
  ]) {
    if (!(await page.locator(selector).isVisible())) {
      throw new Error(`Expected graph filter control to be visible: ${selector}`);
    }
  }
  const initialGraphDetail = await page.textContent('#full-graph-detail');
  if (!initialGraphDetail?.includes('Implementation')) {
    throw new Error(`Full graph detail inspector did not initialize: ${initialGraphDetail}`);
  }
  await page.hover('#full-graph-canvas .graph-node');
  await page.waitForSelector('#full-graph-preview-popover:not([hidden]) .graph-preview-body');
  const graphPreviewPopoverText = await page.textContent('#full-graph-preview-popover');
  if (!graphPreviewPopoverText || !graphPreviewPopoverText.match(/Roadmap|Implementation|Claude Map|Canvas|Graph/)) {
    throw new Error(`Full graph rendered preview popover did not show readable note content: ${graphPreviewPopoverText}`);
  }
  if (!(await page.locator('#full-graph-preview-popover [data-source-path][data-source-line]').isVisible())) {
    throw new Error('Full graph rendered preview popover is missing source line anchors.');
  }
  await page.hover('.full-graph-node');
  const hoveredGraphDetail = await page.textContent('#full-graph-detail');
  if (!hoveredGraphDetail || !hoveredGraphDetail.match(/Roadmap|Implementation|Claude Map/)) {
    throw new Error(`Full graph hover preview did not update detail text: ${hoveredGraphDetail}`);
  }
  if (!(await page.locator('#full-graph-detail [data-full-graph-expand-path]').isVisible())) {
    throw new Error('Full graph detail card is missing the neighborhood Expand action.');
  }
  await page.focus('#full-graph-canvas');
  await page.keyboard.press('ArrowDown');
  await page.waitForSelector('#full-graph-canvas .graph-node.previewed');
  const keyboardPreviewCount = await page.locator('#full-graph-canvas .graph-node.previewed').count();
  if (keyboardPreviewCount !== 1) {
    throw new Error(`Expected one keyboard-previewed graph node, got ${keyboardPreviewCount}.`);
  }
  await page.keyboard.press('End');
  await page.waitForSelector('#full-graph-list .full-graph-node.previewed');

  const graphTransformBeforeMinimap = await page.locator('#full-graph-canvas .graph-viewport').getAttribute('transform');
  await page.click('#full-graph-minimap', { position: { x: 24, y: 18 } });
  await page.waitForFunction(
    (previousTransform) => document.querySelector('#full-graph-canvas .graph-viewport')?.getAttribute('transform') !== previousTransform,
    graphTransformBeforeMinimap
  );
  const minimapViewportWidth = await page.locator('#full-graph-minimap .graph-minimap-viewport').getAttribute('width');
  if (!minimapViewportWidth || Number(minimapViewportWidth) <= 0) {
    throw new Error(`Graph minimap viewport did not render: ${minimapViewportWidth}`);
  }

  await page.selectOption('#full-graph-export-profile', 'llm');
  const exportButtonText = await page.textContent('#export-graph-context');
  if (!exportButtonText?.includes('Context')) {
    throw new Error(`Graph export profile did not update context button text: ${exportButtonText}`);
  }
  const graphContextDownloadPromise = page.waitForEvent('download');
  await page.click('#export-graph-context');
  const graphContextDownload = await graphContextDownloadPromise;
  if (!graphContextDownload.suggestedFilename().endsWith('-llm-context.md')) {
    throw new Error(`Unexpected graph context download name: ${graphContextDownload.suggestedFilename()}`);
  }
  const graphContextPath = await graphContextDownload.path();
  const graphContextMarkdown = graphContextPath ? await readFile(graphContextPath, 'utf8') : '';
  if (!graphContextMarkdown.includes('## Reading Order') || !graphContextMarkdown.includes('Claude / ChatGPT Context')) {
    throw new Error(`Graph context export did not include LLM navigation sections: ${graphContextMarkdown.slice(0, 180)}`);
  }

  await page.selectOption('#full-graph-export-profile', 'compact');
  const compactExportButtonText = await page.textContent('#export-graph-json');
  if (!compactExportButtonText?.includes('Compact Map')) {
    throw new Error(`Graph compact JSON export button did not update: ${compactExportButtonText}`);
  }
  const compactJsonDownloadPromise = page.waitForEvent('download');
  await page.click('#export-graph-json');
  const compactJsonDownload = await compactJsonDownloadPromise;
  const compactFilename = compactJsonDownload.suggestedFilename();
  if (!compactFilename.endsWith('-compact-graph.json') && !compactFilename.endsWith('-compact-map.json')) {
    throw new Error(`Unexpected compact graph JSON filename: ${compactJsonDownload.suggestedFilename()}`);
  }
  const compactJsonPath = await compactJsonDownload.path();
  const compactGraphText = compactJsonPath ? await readFile(compactJsonPath, 'utf8') : '{}';
  const compactGraph = JSON.parse(compactGraphText);
  if (compactGraph.profile !== 'compact') {
    throw new Error(`Compact graph export profile mismatch: ${compactGraph.profile}`);
  }
  if (!compactGraph.compact?.selectedNodes || !compactGraph.compact?.selectedEdges) {
    throw new Error('Compact export metadata did not include selected node/edge counts.');
  }
  if (!compactGraph.compact?.routes?.length) {
    throw new Error('Compact graph export did not include compact navigation routes.');
  }
  if (compactGraph.nodes.length > 140) {
    throw new Error(`Compact graph export should be capped: ${compactGraph.nodes.length}`);
  }
  if (!compactGraph.readingOrder?.length) {
    throw new Error('Compact graph export missed reading order output.');
  }

  await page.selectOption('#full-graph-export-profile', 'scene');
  const sceneExportButtonText = await page.textContent('#export-graph-json');
  if (!sceneExportButtonText?.includes('Scene')) {
    throw new Error(`Graph scene export button text did not include Scene: ${sceneExportButtonText}`);
  }
  const sceneExportPromise = page.waitForEvent('download');
  await page.click('#export-graph-json');
  const sceneDownload = await sceneExportPromise;
  const sceneFilename = sceneDownload.suggestedFilename();
  if (!sceneFilename.endsWith('-scene-graph.json') && !sceneFilename.endsWith('-scene-map.json')) {
    throw new Error(`Unexpected scene graph JSON filename: ${sceneFilename}`);
  }
  const sceneJsonPath = await sceneDownload.path();
  const sceneGraphText = sceneJsonPath ? await readFile(sceneJsonPath, 'utf8') : '{}';
  const sceneGraph = JSON.parse(sceneGraphText);
  if (sceneGraph.profile !== '3d-scene') {
    throw new Error(`Scene graph export profile mismatch: ${sceneGraph.profile}`);
  }
  if (!sceneGraph.nodes?.length || sceneGraph.nodes.length > 280) {
    throw new Error(`Scene graph export should be capped and non-empty: ${sceneGraph.nodes?.length}`);
  }
  if (!sceneGraph.edges?.length && !sceneGraph.unresolvedCount) {
    throw new Error('Scene graph export should include edges or unresolved metadata.');
  }
  if (!sceneGraph.readingOrder?.length) {
    throw new Error('Scene graph export missed reading order.');
  }
  if (!sceneGraph.viewport?.rotation || sceneGraph.viewport.rotation.x === undefined || sceneGraph.viewport.rotation.y === undefined) {
    throw new Error(`Scene payload missing viewport rotation values: ${JSON.stringify(sceneGraph.viewport)}`);
  }

  await page.selectOption('#full-graph-export-profile', 'llm');

  await page.fill('#full-graph-search', 'claude');
  await page.waitForSelector('.graph-node.matched');
  const graphListText = await page.textContent('#full-graph-list');
  if (!graphListText?.includes('Claude Map')) {
    throw new Error('Full graph search did not surface the expected note.');
  }
  await page.fill('#full-graph-search', '');
  await page.click('[data-full-graph-space=\"3d\"]');
  await page.waitForSelector('#full-graph-rotate-left:not([disabled])');
  const compactGraphRotationBefore = await page.textContent('#full-graph-rotation-readout');
  await page.click('#full-graph-rotate-right');
  await page.waitForFunction(
    (previousValue) => document.querySelector('#full-graph-rotation-readout')?.textContent !== previousValue,
    compactGraphRotationBefore
  );
  await page.click('#full-graph-rotate-up');
  await page.waitForFunction(
    (previousValue) => document.querySelector('#full-graph-rotation-readout')?.textContent !== previousValue,
    compactGraphRotationBefore
  );
  await page.click('#full-graph-auto-rotate');
  await page.waitForFunction(() => document.querySelector('#full-graph-auto-rotate')?.textContent.includes('Stop Rotate'));
  await page.waitForTimeout(240);
  const compactGraphRotationAfterAuto = await page.textContent('#full-graph-rotation-readout');
  await page.waitForTimeout(300);
  const compactGraphRotationAfterAutoAgain = await page.textContent('#full-graph-rotation-readout');
  if (compactGraphRotationAfterAutoAgain === compactGraphRotationAfterAuto) {
    throw new Error('Auto graph rotate did not change rotation readout while active.');
  }
  await page.click('#full-graph-auto-rotate');
  await page.waitForFunction(() => document.querySelector('#full-graph-auto-rotate')?.textContent.includes('Auto Rotate'));

  await page.click('[data-full-graph-mode="local"]');
  await page.locator('#full-graph-depth').evaluate((input) => {
    input.value = '2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector('#full-graph-summary')?.textContent.includes('depth 2'));
  await page.click('[data-full-graph-mode="global"]');
  await page.check('#full-graph-filter-tagged');
  await page.waitForFunction(() => document.querySelector('#full-graph-summary')?.textContent.includes('filtered from'));
  const filteredGraphListText = await page.textContent('#full-graph-list');
  if (!filteredGraphListText?.includes('Roadmap') || filteredGraphListText.includes('Claude Map')) {
    throw new Error(`Tagged graph filter did not isolate tagged notes: ${filteredGraphListText}`);
  }
  await page.uncheck('#full-graph-filter-tagged');
  await page.check('#full-graph-filter-media');
  await page.waitForFunction(() => document.querySelector('#full-graph-summary')?.textContent.includes('filtered from'));
  const mediaGraphListText = await page.textContent('#full-graph-list');
  if (!mediaGraphListText?.includes('Media Assets') || mediaGraphListText.includes('Canvas Board')) {
    throw new Error(`Media graph filter did not isolate media notes: ${mediaGraphListText}`);
  }
  const mediaGraphNodeClass = await page.locator('[data-graph-node-path$="Media Assets.md"]').getAttribute('class');
  if (!mediaGraphNodeClass?.includes('media')) {
    throw new Error(`Media graph node was not visually classified: ${mediaGraphNodeClass}`);
  }
  await page.uncheck('#full-graph-filter-media');
  await page.check('#full-graph-filter-canvas');
  await page.waitForFunction(() => document.querySelector('#full-graph-list')?.textContent.includes('Canvas Board'));
  const canvasGraphListText = await page.textContent('#full-graph-list');
  if (!canvasGraphListText?.includes('Canvas Board') || !canvasGraphListText.includes('Project') || canvasGraphListText.includes('Media Assets')) {
    throw new Error(`Canvas graph filter did not isolate canvas notes: ${canvasGraphListText}`);
  }
  await page.click(`[data-full-graph-node-path="${vaultRoot}/Canvas/Canvas Board.md"]`);
  await page.click('#full-graph-detail [data-full-graph-focus-path]');
  await page.waitForFunction(() => document.querySelector('#full-graph-summary')?.textContent.includes('near this note'));
  await page.click('#full-graph-detail [data-full-graph-expand-path]');
  await page.waitForFunction(() => document.querySelector('#full-graph-summary')?.textContent.includes('depth 3'));
  const focusedGraphTab = await page.textContent('.tab.active');
  if (!focusedGraphTab?.includes('Canvas Board')) {
    throw new Error('Graph focus action did not activate the selected canvas note.');
  }
  await page.uncheck('#full-graph-filter-canvas');

  await page.click('#close-full-graph');
  await page.waitForSelector('#full-graph-modal[hidden]');

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await page.waitForSelector('#command-palette:not([hidden])');
  const commandTitle = await page.textContent('#command-palette-title');
  if (commandTitle !== 'Commands') {
    throw new Error(`Command palette title should be simplified to Commands, got: ${commandTitle}`);
  }
  const commandScrollMetrics = await page.locator('#command-results').evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY
  }));
  if (commandScrollMetrics.overflowY !== 'auto' || commandScrollMetrics.scrollHeight <= commandScrollMetrics.clientHeight) {
    throw new Error(`Command palette results are not scrollable: ${JSON.stringify(commandScrollMetrics)}`);
  }
  const commandPaletteText = await page.textContent('#command-palette');
  if (
    commandPaletteText?.includes('Command Palette') ||
    commandPaletteText?.includes('New Document') ||
    commandPaletteText?.includes('Open Vault') ||
    commandPaletteText?.includes('Split View')
  ) {
    throw new Error(`Command palette still contains old UI copy: ${commandPaletteText.slice(0, 240)}`);
  }
  await page.fill('#command-search', 'map');
  await page.waitForSelector('.command-item');
  const commandText = await page.textContent('#command-results');
  if (!commandText?.includes('Open Folder Map') || !commandText.includes('Save Map JSON')) {
    throw new Error('Command palette did not show the simplified map commands.');
  }

  await page.click('.command-item');
  await page.waitForSelector('#full-graph-modal:not([hidden])');
  await page.click('#close-full-graph');

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await page.fill('#command-search', 'bold');
  await page.waitForSelector('.command-item');
  const formatCommandText = await page.textContent('#command-results');
  if (!formatCommandText?.includes('Bold')) {
    throw new Error('Command palette did not show Markdown formatting commands.');
  }
  await page.keyboard.press('Escape');

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await page.fill('#command-search', 'publish');
  await page.waitForSelector('.command-item');
  const publishCommandText = await page.textContent('#command-results');
  if (!publishCommandText?.includes('Create Website')) {
    throw new Error('Command palette did not show the Create Website command.');
  }
  await page.keyboard.press('Escape');

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await page.fill('#command-search', 'new note');
  await page.click('.command-item');
  const tabText = await page.textContent('#tabs-bar');
  if (!tabText?.includes('Untitled')) {
    throw new Error('Command palette did not create a new note.');
  }

  await page.click('[data-view-mode="preview"]');
  const workspaceClass = await page.getAttribute('#workspace', 'class');
  if (!workspaceClass?.includes('preview')) {
    throw new Error('Preview view button did not update workspace mode.');
  }

  console.log('Browser UI smoke passed.');
} finally {
  await browser.close();
}

function isMacBrowserSandboxError(error) {
  const text = `${error?.message || ''}\n${error?.stack || ''}`;
  return text.includes('MachPortRendezvous') || text.includes('bootstrap_check_in') || text.includes('Permission denied (1100)');
}
