import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { EditorSelection, EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { indentWithTab, undo, redo } from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';
import { markdown } from '@codemirror/lang-markdown';
import { basicSetup } from 'codemirror';
import githubMarkdownCssText from 'github-markdown-css/github-markdown.css?inline';
import hljs from 'highlight.js/lib/core';
import highlightCssText from 'highlight.js/styles/github.css?inline';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdownLanguage from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import katex from 'katex';
import katexCssText from 'katex/dist/katex.min.css?inline';
import {
  Bold,
  Calendar,
  ClipboardCopy,
  ClipboardPaste,
  Code,
  Code2,
  Command,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Columns2,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileDown,
  FileInput,
  FilePlus2,
  FileText,
  FolderOpen,
  FolderRoot,
  Heading1,
  History,
  Italic,
  Link2,
  ListTodo,
  Maximize2,
  Menu,
  Moon,
  Network,
  Pencil,
  Plus,
  Quote,
  Redo2,
  RotateCw,
  RotateCcw,
  Save,
  SaveAll,
  Scissors,
  Search,
  Sun,
  Table2,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
  X,
  createIcons
} from 'lucide';
import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import { createCapacitorNative } from './capacitor-bridge.js';
import sampleMarkdown from './sample.md?raw';
import './styles.css';

const native = window.markdownNative || (window.Capacitor ? createCapacitorNative() : createUnavailableNative());
const SESSION_KEY = 'shibanshu-markdown-viewer-session-v1';
const THEME_KEY = 'shibanshu-markdown-viewer-theme';
const GRAPH_PRESETS_KEY = 'shibanshu-markdown-viewer-graph-presets-v1';
const UNTITLED_NAME = 'Untitled.md';
const MAX_RECENT_COMMAND_ITEMS = 12;
const RENDER_DELAY_MS = 90;
const PERSIST_DELAY_MS = 400;
const AUTOSAVE_DELAY_MS = 900;
const VALID_VIEW_MODES = new Set(['split', 'editor', 'preview']);
const VALID_GRAPH_MODES = new Set(['local', 'global']);
const GRAPH_RENDER_NODE_LIMIT = 90;
const FULL_GRAPH_RENDER_NODE_LIMIT = 420;
const FULL_GRAPH_VIEWBOX = { width: 1160, height: 760 };
const FULL_GRAPH_SPACE_MODE_2D = '2d';
const FULL_GRAPH_SPACE_MODE_3D = '3d';
const FULL_GRAPH_DEFAULT_ROTATION = { x: -18, y: -34, z: 0 };
const FULL_GRAPH_ROTATION_STEP = 12;
const FULL_GRAPH_PERSPECTIVE = 900;
const FULL_GRAPH_MIN_ZOOM = 0.5;
const FULL_GRAPH_MAX_ZOOM = 2.6;
const FULL_GRAPH_MIN_ROT_X = -80;
const FULL_GRAPH_MAX_ROT_X = 80;
const FULL_GRAPH_AUTO_ROTATE_STEP = 0.3;
const FULL_GRAPH_MIN_DEPTH = 1;
const FULL_GRAPH_MAX_DEPTH = 4;
const FULL_GRAPH_PREVIEW_MARKDOWN_LIMIT = 1100;
const FULL_GRAPH_PREVIEW_BLOCK_LIMIT = 6;
const VALID_GRAPH_EXPORT_PROFILES = new Set(['navigation', 'llm', 'audit', 'presentation', 'compact', 'scene']);
const VALID_GRAPH_SPACE_MODES = new Set([FULL_GRAPH_SPACE_MODE_2D, FULL_GRAPH_SPACE_MODE_3D]);
const FULL_GRAPH_COMPACT_NODE_LIMIT = 140;
const FULL_GRAPH_COMPACT_EDGE_LIMIT = 280;
const FULL_GRAPH_COMPACT_ROUTER_NODE_LIMIT = 70;
const FULL_GRAPH_SCENE_NODE_LIMIT = 280;
const FULL_GRAPH_SCENE_EDGE_LIMIT = 540;
const MIND_MAP_RENDER_NODE_LIMIT = 260;
const MIND_MAP_HEADING_LIMIT = 140;
const MIND_MAP_LINK_LIMIT = 80;
const MIND_MAP_BACKLINK_LIMIT = 80;
const MIND_MAP_TASK_LIMIT = 80;
const AI_CONTEXT_FILE_LIMIT = 180;
const AI_CONTEXT_EDGE_LIMIT = 360;
const BROWSER_VAULT_FILE_LIMIT = 3000;
const MARKDOWN_FILE_EXTENSION_PATTERN = /\.(md|markdown|mdown|mkd|txt|canvas)$/i;
const MEDIA_LINK_EXTENSION_PATTERN = /\.(avif|bmp|gif|heic|jpeg|jpg|m4a|mov|mp3|mp4|ogg|opus|pdf|png|svg|wav|webm|webp)(?:[?#].*)?$/i;
const CANVAS_LINK_PATTERN = /(?:^|[\s([/\\])[\w./\\ -]+\.canvas(?:[)\]\s]|$)/i;
const EXPORT_CSS = [githubMarkdownCssText, highlightCssText, katexCssText].join('\n');

const editorHost = document.getElementById('markdown-editor');
const preview = document.getElementById('markdown-preview');
const workspace = document.getElementById('workspace');
const activityButtons = [...document.querySelectorAll('[data-activity-surface]')];
const workspaceStart = document.getElementById('workspace-start');
const startRecentList = document.getElementById('start-recent-list');
const documentTitleLabel = document.getElementById('document-title');
const documentLocationLabel = document.getElementById('document-location');
const documentSaveButton = document.getElementById('document-save');
const documentMindMapButton = document.getElementById('document-mind-map');
const documentGraphButton = document.getElementById('document-graph');
const inspectorDocumentTitle = document.getElementById('inspector-document-title');
const inspectorDocumentPath = document.getElementById('inspector-document-path');
const inspectorDocumentState = document.getElementById('inspector-document-state');
const inspectorMetrics = document.getElementById('inspector-metrics');
const inspectorOpenGraphButton = document.getElementById('inspector-open-graph');
const inspectorOpenMindMapButton = document.getElementById('inspector-open-mind-map');
const inspectorCopyContextButton = document.getElementById('inspector-copy-context');
const inspectorNewContextButton = document.getElementById('inspector-new-context');
const vaultNameLabel = document.getElementById('vault-name');
const vaultCountLabel = document.getElementById('vault-count');
const sidebarOpenVaultButton = document.getElementById('sidebar-open-vault');
const sidebarOpenFileButton = document.getElementById('sidebar-open-file');
const recentWorkList = document.getElementById('recent-work-list');
const vaultSearchInput = document.getElementById('vault-search');
const vaultFileList = document.getElementById('vault-file-list');
const outlineList = document.getElementById('outline-list');
const backlinkList = document.getElementById('backlink-list');
const graphCanvas = document.getElementById('graph-canvas');
const graphSummary = document.getElementById('graph-summary');
const graphModeButtons = [...document.querySelectorAll('[data-graph-mode]')];
const newVaultFileButton = document.getElementById('new-vault-file');
const renameVaultFileButton = document.getElementById('rename-vault-file');
const deleteVaultFileButton = document.getElementById('delete-vault-file');
const openFullGraphButton = document.getElementById('open-full-graph');
const copyAiMapButton = document.getElementById('copy-ai-map');
const newAiMapButton = document.getElementById('new-ai-map');
const globalSearchTrigger = document.getElementById('global-search-trigger');
const globalSearchModal = document.getElementById('global-search');
const globalSearchInput = document.getElementById('global-search-input');
const globalSearchSummary = document.getElementById('global-search-summary');
const globalSearchResults = document.getElementById('global-search-results');
const commandPaletteTrigger = document.getElementById('command-palette-trigger');
const commandPalette = document.getElementById('command-palette');
const commandSearchInput = document.getElementById('command-search');
const commandResults = document.getElementById('command-results');
const fullGraphModal = document.getElementById('full-graph-modal');
const fullGraphTitle = document.getElementById('full-graph-title');
const fullGraphSummary = document.getElementById('full-graph-summary');
const fullGraphCanvas = document.getElementById('full-graph-canvas');
const fullGraphStage = document.getElementById('full-graph-stage');
const fullGraphMinimap = document.getElementById('full-graph-minimap');
const fullGraphPreviewPopover = document.getElementById('full-graph-preview-popover');
const fullGraphSearchInput = document.getElementById('full-graph-search');
const fullGraphList = document.getElementById('full-graph-list');
const fullGraphModeButtons = [...document.querySelectorAll('[data-full-graph-mode]')];
const fullGraphSpaceModeButtons = [...document.querySelectorAll('[data-full-graph-space]')];
const fullGraphRotateLeftButton = document.getElementById('full-graph-rotate-left');
const fullGraphRotateRightButton = document.getElementById('full-graph-rotate-right');
const fullGraphRotateUpButton = document.getElementById('full-graph-rotate-up');
const fullGraphRotateDownButton = document.getElementById('full-graph-rotate-down');
const fullGraphRotationResetButton = document.getElementById('full-graph-rotation-reset');
const fullGraphAutoRotateButton = document.getElementById('full-graph-auto-rotate');
const fullGraphRotationReadout = document.getElementById('full-graph-rotation-readout');
const fullGraphFolderFilter = document.getElementById('full-graph-folder-filter');
const fullGraphExtensionFilter = document.getElementById('full-graph-extension-filter');
const fullGraphTaggedFilter = document.getElementById('full-graph-filter-tagged');
const fullGraphOrphansFilter = document.getElementById('full-graph-filter-orphans');
const fullGraphUnresolvedFilter = document.getElementById('full-graph-filter-unresolved');
const fullGraphBacklinksFilter = document.getElementById('full-graph-filter-backlinks');
const fullGraphOutgoingFilter = document.getElementById('full-graph-filter-outgoing');
const fullGraphMediaFilter = document.getElementById('full-graph-filter-media');
const fullGraphCanvasFilter = document.getElementById('full-graph-filter-canvas');
const fullGraphDepthInput = document.getElementById('full-graph-depth');
const fullGraphDepthValue = document.getElementById('full-graph-depth-value');
const fullGraphPresetSelect = document.getElementById('full-graph-preset');
const fullGraphSavePresetButton = document.getElementById('full-graph-save-preset');
const fullGraphDeletePresetButton = document.getElementById('full-graph-delete-preset');
const fullGraphDetail = document.getElementById('full-graph-detail');
const closeFullGraphButton = document.getElementById('close-full-graph');
const fullGraphZoomValue = document.getElementById('full-graph-zoom-value');
const fullGraphZoomOutButton = document.getElementById('full-graph-zoom-out');
const fullGraphFitButton = document.getElementById('full-graph-fit');
const fullGraphResetButton = document.getElementById('full-graph-reset');
const fullGraphZoomInButton = document.getElementById('full-graph-zoom-in');
const copyAiMapGraphButton = document.getElementById('copy-ai-map-graph');
const newAiMapGraphButton = document.getElementById('new-ai-map-graph');
const fullGraphExportProfileSelect = document.getElementById('full-graph-export-profile');
const exportGraphJsonButton = document.getElementById('export-graph-json');
const exportGraphSvgButton = document.getElementById('export-graph-svg');
const exportGraphContextButton = document.getElementById('export-graph-context');
const mindMapModal = document.getElementById('mind-map-modal');
const mindMapTitle = document.getElementById('mind-map-title');
const mindMapSummary = document.getElementById('mind-map-summary');
const mindMapCanvas = document.getElementById('mind-map-canvas');
const mindMapStage = document.getElementById('mind-map-stage');
const mindMapSearchInput = document.getElementById('mind-map-search');
const mindMapList = document.getElementById('mind-map-list');
const mindMapDetail = document.getElementById('mind-map-detail');
const closeMindMapButton = document.getElementById('close-mind-map');
const mindMapZoomOutButton = document.getElementById('mind-map-zoom-out');
const mindMapResetButton = document.getElementById('mind-map-reset');
const mindMapZoomInButton = document.getElementById('mind-map-zoom-in');
const copyMindMapContextButton = document.getElementById('copy-mind-map-context');
const newMindMapContextButton = document.getElementById('new-mind-map-context');
const insertMindMapFromCanvasButton = document.getElementById('insert-mind-map-from-canvas');
const recoveryModal = document.getElementById('recovery-modal');
const recoverySummary = document.getElementById('recovery-summary');
const recoveryList = document.getElementById('recovery-list');
const restoreDraftsButton = document.getElementById('restore-drafts');
const discardDraftsButton = document.getElementById('discard-drafts');
const versionHistoryTrigger = document.getElementById('version-history-trigger');
const historyModal = document.getElementById('history-modal');
const historyTitle = document.getElementById('history-title');
const historySummary = document.getElementById('history-summary');
const historyList = document.getElementById('history-list');
const closeHistoryButton = document.getElementById('close-history');
const tabsBar = document.getElementById('tabs-bar');
const filePathLabel = document.getElementById('file-path');
const saveStateLabel = document.getElementById('save-state');
const readingTimeLabel = document.getElementById('reading-time');
const wordCountLabel = document.getElementById('word-count');
const charCountLabel = document.getElementById('char-count');
const dropOverlay = document.getElementById('drop-overlay');
const toastRegion = document.getElementById('toast-region');
const themeToggle = document.getElementById('theme-toggle');
const saveButton = document.getElementById('save-file');
const copyButton = document.getElementById('copy-markdown');
const openMindMapButton = document.getElementById('open-mind-map');
const mindMapButton = document.getElementById('insert-mind-map');
const exportHtmlButton = document.getElementById('export-html');
const exportPdfButton = document.getElementById('export-pdf');
const publishVaultButton = document.getElementById('publish-vault');
const revealButton = document.getElementById('reveal-file');
const formatButtons = [...document.querySelectorAll('[data-format-command]')];

let documents = [];
let activeDocumentId = null;
let activeVault = null;
let renderTimer = null;
let persistTimer = null;
let editorView = null;
let lastRenderedHash = '';
let renderGeneration = 0;
let mermaidModule = null;
let viewMode = 'split';
let graphMode = 'local';
let fullGraphMode = 'local';
let fullGraphSpaceMode = FULL_GRAPH_SPACE_MODE_2D;
let fullGraphLocalDepth = 1;
let vaultExpandedFolders = new Set();
let fullGraphZoom = 1;
let fullGraphPan = { x: 0, y: 0 };
let fullGraphRotation = { ...FULL_GRAPH_DEFAULT_ROTATION };
let fullGraphAutoRotate = false;
let fullGraphAnimationFrame = null;
let fullGraphDragging = null;
let fullGraphPreviewPath = null;
let fullGraphPreviewHideTimer = null;
let lastFullGraphDetailState = null;
let fullGraphPresets = readGraphPresets();
let mindMapZoom = 1;
let mindMapPan = { x: 0, y: 0 };
let mindMapDragging = null;
let lastMindMapModel = null;
let mindMapPreviewNodeId = null;
let commandPaletteSelection = 0;
let autosaveTimer = null;
let pendingRecoveryDrafts = null;
let recentItems = { files: [], vaults: [] };
const browserFileHandles = new Map();
const browserDirectoryHandles = new Map();
let syncScrollLock = false;
let sessionStorageWarningShown = false;
let autosaveWarningShown = false;

const icons = {
  Bold,
  Calendar,
  ClipboardCopy,
  ClipboardPaste,
  Code,
  Code2,
  Command,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Columns2,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileDown,
  FileInput,
  FilePlus2,
  FileText,
  FolderOpen,
  FolderRoot,
  Heading1,
  History,
  Italic,
  Link2,
  ListTodo,
  Maximize2,
  Menu,
  Moon,
  Network,
  Pencil,
  Plus,
  Quote,
  Redo2,
  RotateCw,
  RotateCcw,
  Save,
  SaveAll,
  Scissors,
  Search,
  Sun,
  Table2,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
  X
};

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdownLanguage);
hljs.registerLanguage('python', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);
hljs.registerAliases(['sh', 'shell', 'zsh'], { languageName: 'bash' });
hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
hljs.registerAliases(['html', 'svg'], { languageName: 'xml' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });

const sanitizeOptions = {
  ADD_TAGS: [
    'math',
    'semantics',
    'mrow',
    'mi',
    'mn',
    'mo',
    'msup',
    'msub',
    'mfrac',
    'msqrt',
    'mroot',
    'mtext',
    'annotation',
    'svg',
    'path',
    'g',
    'defs',
    'marker',
    'line',
    'polyline',
    'polygon',
    'rect',
    'circle',
    'ellipse',
    'text',
    'tspan'
  ],
  ADD_ATTR: [
    'align',
    'aria-hidden',
    'aria-label',
    'checked',
    'class',
    'data-mermaid',
    'disabled',
    'fill',
    'height',
    'href',
    'id',
    'marker-end',
    'marker-start',
    'rel',
    'role',
    'rx',
    'ry',
    'stroke',
    'stroke-width',
    'style',
    'target',
    'title',
    'type',
    'viewBox',
    'width',
    'x',
    'x1',
    'x2',
    'xmlns',
    'y',
    'y1',
    'y2'
  ],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  ALLOW_DATA_ATTR: false
};

const mathBlockExtension = {
  name: 'mathBlock',
  level: 'block',
  start(source) {
    const index = source.match(/\$\$/)?.index;
    return index === -1 ? undefined : index;
  },
  tokenizer(source) {
    const match = source.match(/^\$\$[ \t]*\n?([\s\S]+?)\n?\$\$(?:\n+|$)/);
    if (!match) return undefined;

    return {
      type: 'mathBlock',
      raw: match[0],
      text: match[1].trim()
    };
  },
  renderer(token) {
    return renderMath(token.text, true);
  }
};

const mathInlineExtension = {
  name: 'mathInline',
  level: 'inline',
  start(source) {
    const index = source.indexOf('\\(');
    return index === -1 ? undefined : index;
  },
  tokenizer(source) {
    const match = source.match(/^\\\((.+?)\\\)/);
    if (!match) return undefined;

    return {
      type: 'mathInline',
      raw: match[0],
      text: match[1].trim()
    };
  },
  renderer(token) {
    return renderMath(token.text, false);
  }
};

const markdownRenderer = new marked.Renderer();

markdownRenderer.code = (codeOrToken, infostring = '') => {
  const code = typeof codeOrToken === 'object' ? codeOrToken.text || '' : String(codeOrToken ?? '');
  const info = typeof codeOrToken === 'object' ? codeOrToken.lang || '' : infostring;
  const language = String(info).trim().split(/\s+/)[0].toLowerCase();

  if (language === 'mermaid') {
    if (isMermaidMindMap(code)) {
      return `<div class="mermaid-block rendered mindmap-preview" data-mermaid="${escapeAttribute(code)}">${renderMermaidMindMapPreview(code)}</div>`;
    }

    return `<div class="mermaid-block" data-mermaid="${escapeAttribute(code)}"><pre><code>${escapeHtml(code)}</code></pre></div>`;
  }

  if (language && hljs.getLanguage(language)) {
    const highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value;
    return `<pre><code class="hljs language-${escapeAttribute(language)}">${highlighted}</code></pre>`;
  }

  const highlighted = hljs.highlightAuto(code).value;
  return `<pre><code class="hljs">${highlighted}</code></pre>`;
};

markdownRenderer.link = function link(hrefOrToken, title, text) {
  const token =
    typeof hrefOrToken === 'object'
      ? hrefOrToken
      : {
          href: hrefOrToken,
          title,
          text
        };
  const safeHref = token.href || '';
  const titleAttribute = token.title ? ` title="${escapeAttribute(token.title)}"` : '';
  const renderedText = token.text || (token.tokens ? this.parser.parseInline(token.tokens) : '');
  return `<a href="${escapeAttribute(safeHref)}"${titleAttribute} target="_blank" rel="noreferrer">${renderedText}</a>`;
};

marked.use({
  gfm: true,
  breaks: false,
  renderer: markdownRenderer,
  extensions: [mathBlockExtension, mathInlineExtension]
});

function bootstrap() {
  hydrateTheme();
  hydrateSession();
  createEditor();
  bindDomEvents();
  renderDocumentTabs();
  activateDocument(activeDocumentId || documents[0]?.id);
  native?.rendererReady();
  createIcons({ icons });
  void refreshRecentItems();
  void inspectAutosaveDrafts();
}

function createUnavailableNative() {
  const unavailable = async () => {
    throw new Error('Native Electron bridge is unavailable.');
  };

  return {
    platform: 'browser',
    openDialog: openBrowserMarkdownFiles,
    openVault: openBrowserMarkdownVault,
    listRecentItems: async () => ({ files: [], vaults: [] }),
    openRecentFile: async () => [],
    openRecentVault: async () => null,
    openDroppedFiles: async () => [],
    reloadFile: async () => null,
    readAutosaveDrafts: async () => null,
    saveAutosaveDrafts: async () => ({ saved: false }),
    clearAutosaveDrafts: async () => ({ cleared: true }),
    listFileHistory: async () => ({ snapshots: [] }),
    readFileHistorySnapshot: async () => null,
    createVaultFile: createBrowserVaultFile,
    renameVaultFile: renameBrowserVaultFile,
    deleteVaultFile: deleteBrowserVaultFile,
    saveFile: saveBrowserFile,
    saveFileAs: saveBrowserFileAs,
    exportHtml: exportBrowserHtml,
    exportText: exportBrowserText,
    exportPdf: exportBrowserPdf,
    publishStaticSite: publishBrowserStaticSite,
    revealFile: async () => false,
    openExternal: async (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    },
    setDocumentState: () => {},
    rendererReady: () => {},
    onExternalFileChanged: () => () => {},
    onSystemOpenFiles: () => () => {},
    onSystemUrlCommand: () => () => {},
    onMenuCommand: () => () => {}
  };
}

async function openBrowserMarkdownFiles() {
  if (window.showOpenFilePicker) {
    try {
      const handles = await window.showOpenFilePicker({
        multiple: true,
        types: [getBrowserMarkdownPickerType()]
      });
      return readBrowserFileHandles(handles);
    } catch (error) {
      if (isBrowserPickerCancel(error)) return [];
      throw error;
    }
  }

  return pickBrowserFilesWithInput({ multiple: true });
}

async function openBrowserMarkdownVault() {
  if (window.showDirectoryPicker) {
    try {
      const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const vaultId = createBrowserVirtualId(directoryHandle.name || 'Folder');
      const rootPath = `browser-vault://${vaultId}`;
      browserDirectoryHandles.set(rootPath, directoryHandle);
      const files = [];
      await collectBrowserVaultFiles(directoryHandle, rootPath, [], files);
      return {
        path: rootPath,
        name: directoryHandle.name || 'Browser Folder',
        files
      };
    } catch (error) {
      if (isBrowserPickerCancel(error)) return null;
      throw error;
    }
  }

  const files = await pickBrowserFilesWithInput({
    multiple: true,
    directory: true,
    rootPath: `browser-vault://${createBrowserVirtualId('Browser Folder')}`
  });
  if (!files.length) return null;

  return {
    path: getBrowserVirtualRoot(files[0].path) || `browser-vault://${createBrowserVirtualId('Browser Folder')}`,
    name: 'Browser Folder',
    files
  };
}

async function openBrowserDroppedFiles(fileList) {
  return readBrowserFiles([...fileList].filter((file) => isMarkdownLikeName(file.name)));
}

async function saveBrowserFile(payload = {}) {
  const filePath = String(payload.path || '');
  const handle = browserFileHandles.get(filePath);

  if (handle?.createWritable) {
    await writeBrowserFileHandle(handle, payload.content || '');
    const file = await handle.getFile();
    return createBrowserSaveResult({
      path: filePath,
      name: file.name,
      file
    });
  }

  return saveBrowserFileAs({
    defaultPath: filePath ? getBrowserFileNameFromPath(filePath) : UNTITLED_NAME,
    content: payload.content || ''
  });
}

async function saveBrowserFileAs(payload = {}) {
  const suggestedName = sanitizeFileName(getBrowserFileNameFromPath(payload.defaultPath) || UNTITLED_NAME);
  const content = String(payload.content ?? '');

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [getBrowserMarkdownPickerType()]
      });
      await writeBrowserFileHandle(handle, content);
      const file = await handle.getFile();
      const filePath = `browser-file://${createBrowserVirtualId(file.name)}`;
      browserFileHandles.set(filePath, handle);
      return createBrowserSaveResult({ path: filePath, name: file.name, file });
    } catch (error) {
      if (isBrowserPickerCancel(error)) return null;
      throw error;
    }
  }

  downloadBlobFallback(new Blob([content], { type: 'text/markdown;charset=utf-8' }), suggestedName);
  return {
    path: `browser-download://${createBrowserVirtualId(suggestedName)}`,
    name: suggestedName,
    lastSavedAt: Date.now(),
    fileState: {
      size: new TextEncoder().encode(content).length,
      mtimeMs: Date.now()
    }
  };
}

async function exportBrowserHtml(payload = {}) {
  const html = buildBrowserExportHtml(payload);
  downloadBlobFallback(new Blob([html], { type: 'text/html;charset=utf-8' }), payload.defaultPath || 'Markdown Export.html');
  return { downloaded: true };
}

async function exportBrowserText(payload = {}) {
  downloadTextFallback(payload);
  return { downloaded: true };
}

async function exportBrowserPdf(payload = {}) {
  const html = buildBrowserExportHtml(payload);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');

  if (!printWindow) {
    downloadBlobFallback(new Blob([html], { type: 'text/html;charset=utf-8' }), `${sanitizeFileStem(payload.title || 'Markdown Export')}.print.html`);
    return { downloadedPrintHtml: true };
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 250);
  return { printDialog: true };
}

async function publishBrowserStaticSite(payload = {}) {
  const html = buildBrowserPublishedVaultHtml(payload);
  const fileName = `${sanitizeFileStem(payload.title || 'Markdown Site')}-offline-site.html`;
  downloadBlobFallback(new Blob([html], { type: 'text/html;charset=utf-8' }), fileName);
  return { files: payload.files?.length || 0, downloaded: true };
}

async function createBrowserVaultFile({ rootPath, relativePath, content = '' } = {}) {
  const cleanRelativePath = normalizeBrowserVaultRelativePath(relativePath);
  const rootHandle = getBrowserWritableVaultHandle(rootPath);
  await ensureBrowserDirectoryWritePermission(rootHandle);
  const { directoryHandle, fileName } = await getBrowserVaultDirectory(rootHandle, cleanRelativePath, { create: true });

  if (await browserDirectoryEntryExists(directoryHandle, fileName)) {
    throw new Error('A note already exists at that path.');
  }

  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  await writeBrowserFileHandle(fileHandle, content);
  const file = await fileHandle.getFile();
  const filePath = `${rootPath}/${cleanRelativePath}`;
  browserFileHandles.set(filePath, fileHandle);
  return createBrowserOpenedFile(file, filePath, cleanRelativePath);
}

async function renameBrowserVaultFile({ rootPath, currentRelativePath, nextRelativePath } = {}) {
  const currentPath = normalizeBrowserVaultRelativePath(currentRelativePath, { requireExtension: false });
  const nextPath = normalizeBrowserVaultRelativePath(nextRelativePath);
  if (currentPath === nextPath) {
    const existingHandle = browserFileHandles.get(`${rootPath}/${currentPath}`);
    if (!existingHandle) throw new Error('This note is not editable in the current browser folder session.');
    const file = await existingHandle.getFile();
    return createBrowserOpenedFile(file, `${rootPath}/${currentPath}`, currentPath);
  }

  const rootHandle = getBrowserWritableVaultHandle(rootPath);
  await ensureBrowserDirectoryWritePermission(rootHandle);
  const { directoryHandle: currentDirectory, fileName: currentName } = await getBrowserVaultDirectory(rootHandle, currentPath);
  const currentHandle = await currentDirectory.getFileHandle(currentName);
  const currentFile = await currentHandle.getFile();
  const content = await currentFile.text();
  const { directoryHandle: nextDirectory, fileName: nextName } = await getBrowserVaultDirectory(rootHandle, nextPath, { create: true });

  if (await browserDirectoryEntryExists(nextDirectory, nextName)) {
    throw new Error('A note already exists at the new path.');
  }

  const nextHandle = await nextDirectory.getFileHandle(nextName, { create: true });
  await writeBrowserFileHandle(nextHandle, content);
  await currentDirectory.removeEntry(currentName);

  browserFileHandles.delete(`${rootPath}/${currentPath}`);
  const nextFile = await nextHandle.getFile();
  const nextFilePath = `${rootPath}/${nextPath}`;
  browserFileHandles.set(nextFilePath, nextHandle);
  return createBrowserOpenedFile(nextFile, nextFilePath, nextPath);
}

async function deleteBrowserVaultFile({ rootPath, relativePath } = {}) {
  const cleanRelativePath = normalizeBrowserVaultRelativePath(relativePath, { requireExtension: false });
  const rootHandle = getBrowserWritableVaultHandle(rootPath);
  await ensureBrowserDirectoryWritePermission(rootHandle);
  const { directoryHandle, fileName } = await getBrowserVaultDirectory(rootHandle, cleanRelativePath);
  await directoryHandle.removeEntry(fileName);
  browserFileHandles.delete(`${rootPath}/${cleanRelativePath}`);
  return { deleted: true, trash: false };
}

async function readBrowserFileHandles(handles, options = {}) {
  const files = [];
  for (const handle of handles) {
    if (files.length >= BROWSER_VAULT_FILE_LIMIT) break;
    if (handle.kind !== 'file') continue;
    const file = await handle.getFile();
    if (!isMarkdownLikeName(file.name)) continue;
    const filePath = options.pathForHandle ? options.pathForHandle(handle, file) : `browser-file://${createBrowserVirtualId(file.name)}`;
    browserFileHandles.set(filePath, handle);
    files.push(await createBrowserOpenedFile(file, filePath, options.relativePathForFile?.(file) || file.name));
  }
  return files;
}

async function collectBrowserVaultFiles(directoryHandle, rootPath, parts, files) {
  if (files.length >= BROWSER_VAULT_FILE_LIMIT) return;

  for await (const [name, handle] of directoryHandle.entries()) {
    if (files.length >= BROWSER_VAULT_FILE_LIMIT) return;
    if (name.startsWith('.')) continue;

    if (handle.kind === 'directory') {
      await collectBrowserVaultFiles(handle, rootPath, [...parts, name], files);
      continue;
    }

    if (handle.kind !== 'file' || !isMarkdownLikeName(name)) continue;
    const file = await handle.getFile();
    const relativePath = normalizeBrowserRelativePath([...parts, name].join('/'));
    const filePath = `${rootPath}/${relativePath}`;
    browserFileHandles.set(filePath, handle);
    files.push(await createBrowserOpenedFile(file, filePath, relativePath));
  }
}

async function pickBrowserFilesWithInput({ multiple = false, directory = false, rootPath = null } = {}) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.mdown,.mkd,.txt,.canvas,text/markdown,text/plain,application/json';
    input.multiple = Boolean(multiple || directory);
    if (directory) {
      input.webkitdirectory = true;
      input.directory = true;
    }
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.addEventListener(
      'change',
      async () => {
        try {
          resolve(await readBrowserFiles([...input.files], { rootPath }));
        } catch (error) {
          reject(error);
        } finally {
          input.remove();
        }
      },
      { once: true }
    );
    input.addEventListener(
      'cancel',
      () => {
        input.remove();
        resolve([]);
      },
      { once: true }
    );
    document.body.append(input);
    input.click();
  });
}

async function readBrowserFiles(files, options = {}) {
  const opened = [];
  const rootPath = options.rootPath || null;

  for (const file of files) {
    if (opened.length >= BROWSER_VAULT_FILE_LIMIT) break;
    if (!isMarkdownLikeName(file.name)) continue;

    const browserRelativePath = normalizeBrowserRelativePath(file.webkitRelativePath || file.name);
    const relativePath = rootPath ? browserRelativePath : file.name;
    const filePath = rootPath
      ? `${rootPath}/${browserRelativePath}`
      : `browser-file://${createBrowserVirtualId(file.name)}`;
    opened.push(await createBrowserOpenedFile(file, filePath, relativePath));
  }

  return opened;
}

async function createBrowserOpenedFile(file, filePath, relativePath) {
  return {
    path: filePath,
    name: file.name,
    relativePath,
    content: await file.text(),
    lastSavedAt: Date.now(),
    fileState: {
      size: file.size,
      mtimeMs: file.lastModified || Date.now()
    }
  };
}

async function writeBrowserFileHandle(handle, content) {
  const writable = await handle.createWritable();
  await writable.write(String(content ?? ''));
  await writable.close();
}

function createBrowserSaveResult({ path: filePath, name, file }) {
  return {
    path: filePath,
    name,
    lastSavedAt: Date.now(),
    fileState: {
      size: file.size,
      mtimeMs: file.lastModified || Date.now()
    }
  };
}

function getBrowserMarkdownPickerType() {
  return {
    description: 'Markdown and Canvas files',
    accept: {
      'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'],
      'text/plain': ['.txt'],
      'application/json': ['.canvas']
    }
  };
}

function isMarkdownLikeName(name) {
  return MARKDOWN_FILE_EXTENSION_PATTERN.test(String(name || ''));
}

function createBrowserVirtualId(name) {
  const stem = sanitizeFileStem(name || 'file') || 'file';
  return `${encodeURIComponent(stem)}-${crypto.randomUUID()}`;
}

function normalizeBrowserRelativePath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/');
}

function normalizeBrowserVaultRelativePath(value, options = {}) {
  const { requireExtension = true } = options;
  const cleanPath = normalizeBrowserRelativePath(value);
  if (!cleanPath) throw new Error('Enter a note path.');
  if (cleanPath.split('/').some((part) => !part.trim())) throw new Error('Enter a valid note path.');
  if (requireExtension && !MARKDOWN_FILE_EXTENSION_PATTERN.test(cleanPath)) return `${cleanPath}.md`;
  if (!MARKDOWN_FILE_EXTENSION_PATTERN.test(cleanPath)) throw new Error('Use a Markdown, text, or canvas file extension.');
  return cleanPath;
}

function getBrowserWritableVaultHandle(rootPath) {
  const rootHandle = browserDirectoryHandles.get(rootPath);
  if (!rootHandle) {
    throw new Error('This folder was opened read-only. Reopen it with Open Folder in a browser that supports folder editing, or use the Mac app.');
  }
  return rootHandle;
}

async function ensureBrowserDirectoryWritePermission(directoryHandle) {
  if (!directoryHandle) throw new Error('Folder write access is unavailable.');
  const descriptor = { mode: 'readwrite' };
  if (directoryHandle.queryPermission && (await directoryHandle.queryPermission(descriptor)) === 'granted') return true;
  if (directoryHandle.requestPermission && (await directoryHandle.requestPermission(descriptor)) === 'granted') return true;
  if (!directoryHandle.requestPermission && !directoryHandle.queryPermission) return true;
  throw new Error('Folder write permission was not granted.');
}

async function getBrowserVaultDirectory(rootHandle, relativePath, options = {}) {
  const parts = normalizeBrowserRelativePath(relativePath).split('/');
  const fileName = parts.pop();
  if (!fileName) throw new Error('Enter a note filename.');
  let directoryHandle = rootHandle;
  for (const part of parts) {
    directoryHandle = await directoryHandle.getDirectoryHandle(part, { create: Boolean(options.create) });
  }
  return { directoryHandle, fileName };
}

async function browserDirectoryEntryExists(directoryHandle, name) {
  try {
    await directoryHandle.getFileHandle(name);
    return true;
  } catch (error) {
    if (error?.name === 'NotFoundError') return false;
    throw error;
  }
}

function getBrowserVirtualRoot(filePath) {
  const match = String(filePath || '').match(/^(browser-vault:\/\/[^/]+)/);
  return match?.[1] || null;
}

function getBrowserFileNameFromPath(filePath) {
  const value = String(filePath || '');
  const lastPart = value.split(/[\\/]/).pop() || value.replace(/^browser-[^:]+:\/\//, '');
  try {
    return decodeURIComponent(lastPart.replace(/-[0-9a-f-]{36}$/i, ''));
  } catch (_error) {
    return lastPart || UNTITLED_NAME;
  }
}

function isBrowserPickerCancel(error) {
  return error?.name === 'AbortError' || error?.name === 'NotAllowedError';
}

function buildBrowserExportHtml({ title, body, theme, css } = {}) {
  const mode = theme === 'dark' ? 'dark' : 'light';
  return `<!doctype html>
<html lang="en" data-theme="${mode}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title || 'Markdown Export')}</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 32px; background: ${mode === 'dark' ? '#0f1419' : '#ffffff'}; }
    main { max-width: 920px; margin: 0 auto; }
    ${sanitizeBrowserCss(css || EXPORT_CSS)}
  </style>
</head>
<body>
  <main class="markdown-body">${sanitizeBrowserHtml(body || '')}</main>
</body>
</html>`;
}

function buildBrowserPublishedVaultHtml(payload = {}) {
  const files = Array.isArray(payload.files) ? payload.files : [];
  const graph = payload.graph || { nodes: [], edges: [], unresolvedLinks: [] };
  const fileData = JSON.stringify({ files, graph }, null, 2).replace(/</g, '\\u003c');
  const firstFile = files[0] || null;

  return `<!doctype html>
<html lang="en" data-theme="${payload.theme === 'dark' ? 'dark' : 'light'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(payload.title || 'Markdown Site')}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: ${payload.theme === 'dark' ? '#0f1419' : '#ffffff'};
      --panel: ${payload.theme === 'dark' ? '#161b22' : '#f6f8fa'};
      --text: ${payload.theme === 'dark' ? '#e6edf3' : '#24292f'};
      --muted: ${payload.theme === 'dark' ? '#8b949e' : '#57606a'};
      --border: ${payload.theme === 'dark' ? '#30363d' : '#d0d7de'};
      --accent: #6b7cff;
    }
    body { margin: 0; font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
    .shell { display: grid; grid-template-columns: minmax(220px, 300px) minmax(0, 1fr); min-height: 100vh; }
    aside { border-right: 1px solid var(--border); background: var(--panel); padding: 20px; overflow: auto; }
    main { padding: 32px; overflow: auto; }
    button { width: 100%; text-align: left; border: 0; border-radius: 8px; background: transparent; color: inherit; padding: 9px 10px; cursor: pointer; }
    button:hover, button.active { background: color-mix(in srgb, var(--accent) 16%, transparent); }
    .path { display: block; color: var(--muted); font-size: 12px; }
    .stats { color: var(--muted); margin: 8px 0 18px; }
    .markdown-body { max-width: 900px; }
    ${sanitizeBrowserCss(payload.css || EXPORT_CSS)}
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <h1>${escapeHtml(payload.title || 'Markdown Site')}</h1>
      <p class="stats">${files.length} notes exported locally.</p>
      <nav id="note-list"></nav>
    </aside>
    <main>
      <article id="note-body" class="markdown-body">${sanitizeBrowserHtml(firstFile?.body || '<p>No notes exported.</p>')}</article>
    </main>
  </div>
  <script type="application/json" id="site-data">${fileData}</script>
  <script>
    const data = JSON.parse(document.getElementById('site-data').textContent);
    const list = document.getElementById('note-list');
    const body = document.getElementById('note-body');
    function render(selectedUrl) {
      const selected = data.files.find((file) => file.url === selectedUrl) || data.files[0];
      list.textContent = '';
      for (const file of data.files) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.url = file.url;
        if (selected && file.url === selected.url) button.className = 'active';
        button.append(document.createTextNode(file.title));
        const path = document.createElement('span');
        path.className = 'path';
        path.textContent = file.relativePath;
        button.append(path);
        list.append(button);
      }
      body.innerHTML = selected ? selected.body : '<p>No notes exported.</p>';
    }
    list.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-url]');
      if (button) render(button.dataset.url);
    });
    render(${JSON.stringify(firstFile?.url || '')});
  </script>
</body>
</html>`;
}

function sanitizeBrowserCss(css) {
  return String(css || '').replace(/<\/style/gi, '<\\/style').slice(0, 1_500_000);
}

function sanitizeBrowserHtml(html) {
  return DOMPurify.sanitize(String(html || ''), sanitizeOptions);
}

function createEditor() {
  editorView = new EditorView({
    state: createEditorState(''),
    parent: editorHost
  });

  editorView.scrollDOM.addEventListener('scroll', () => syncScroll('editor'));
}

function createEditorState(content) {
  return EditorState.create({
    doc: String(content ?? ''),
    extensions: [
      basicSetup,
      markdown(),
      placeholder('Start writing Markdown...'),
      EditorView.lineWrapping,
      appEditorTheme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          handleEditorDocumentChange(update.state.doc.toString());
        }
      }),
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-s',
            run() {
              saveActiveDocument();
              return true;
            }
          },
          {
            key: 'Mod-Shift-s',
            run() {
              saveActiveDocumentAs();
              return true;
            }
          },
          {
            key: 'Mod-o',
            run() {
              openFromDialog();
              return true;
            }
          },
          {
            key: 'Mod-Alt-n',
            run() {
              createVaultFileFromPrompt();
              return true;
            }
          },
          {
            key: 'Mod-n',
            run() {
              createUntitledDocument();
              return true;
            }
          },
          {
            key: 'Mod-b',
            run() {
              runFormattingCommand('bold');
              return true;
            }
          },
          {
            key: 'Mod-i',
            run() {
              runFormattingCommand('italic');
              return true;
            }
          },
          {
            key: 'Mod-Alt-h',
            run() {
              runFormattingCommand('heading');
              return true;
            }
          },
          {
            key: 'Mod-Alt-l',
            run() {
              runFormattingCommand('link');
              return true;
            }
          },
          {
            key: 'Mod-Alt-c',
            run() {
              runFormattingCommand('code');
              return true;
            }
          },
          {
            key: 'Mod-Alt-q',
            run() {
              runFormattingCommand('quote');
              return true;
            }
          },
          {
            key: 'Mod-Alt-t',
            run() {
              runFormattingCommand('task');
              return true;
            }
          },
          {
            key: 'Mod-Alt-Shift-m',
            run() {
              openMindMapCanvas();
              return true;
            }
          },
          {
            key: 'Mod-Shift-m',
            run() {
              insertMindMapFromHeadings();
              return true;
            }
          },
          indentWithTab
        ])
      )
    ]
  });
}

function handleEditorDocumentChange(content) {
  const doc = getActiveDocument();
  if (!doc) return;

  doc.content = content;
  doc.dirty = true;
  updateStats(doc.content);
  updateStatus();
  renderDocumentTabs();
  renderVaultSidebar();
  renderMindMapCanvas();
  scheduleRender();
  schedulePersist();
}

function setEditorContent(content) {
  if (!editorView) return;
  editorView.setState(createEditorState(content));
  editorView.scrollDOM.scrollTop = 0;
}

function focusEditor() {
  editorView?.focus();
}

function getEditorScrollElement() {
  return editorView?.scrollDOM || null;
}

function jumpToEditorLine(lineNumber) {
  if (!editorView || !Number.isFinite(lineNumber)) return;

  const line = editorView.state.doc.line(Math.max(1, Math.min(editorView.state.doc.lines, lineNumber)));
  editorView.dispatch({
    selection: { anchor: line.from },
    effects: EditorView.scrollIntoView(line.from, { y: 'center' })
  });
  focusEditor();
}

function openDocumentSourceAtLine(filePath, lineNumber = 1, options = {}) {
  const doc = documents.find((candidate) => candidate.path === filePath);
  if (!doc) {
    showToast('That source note is not open in the current workspace.');
    return false;
  }

  activateDocument(doc.id);
  if (options.closeFullGraph) {
    hideFullGraphPreviewPopover();
    fullGraphModal.hidden = true;
  }
  if (options.closeMindMap) {
    mindMapModal.hidden = true;
  }
  if (viewMode === 'preview') {
    setViewMode('split');
  }

  const targetLine = Math.max(1, Number(lineNumber) || 1);
  requestAnimationFrame(() => jumpToEditorLine(targetLine));
  showToast(`Opened ${stripMarkdownExtension(doc.title)} at line ${targetLine}.`);
  return true;
}

function handleSourceAnchorClick(event) {
  const sourceButton = event.target.closest('[data-source-path][data-source-line]');
  if (!sourceButton) return false;

  event.preventDefault();
  event.stopPropagation();
  return openDocumentSourceAtLine(sourceButton.dataset.sourcePath, Number(sourceButton.dataset.sourceLine), {
    closeFullGraph: Boolean(sourceButton.closest('#full-graph-modal')),
    closeMindMap: Boolean(sourceButton.closest('#mind-map-modal'))
  });
}

const appEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--text)',
    backgroundColor: 'var(--panel)',
    fontSize: '14px'
  },
  '.cm-scroller': {
    height: '100%',
    overflow: 'auto',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
    lineHeight: '1.62'
  },
  '.cm-content': {
    minHeight: '100%',
    padding: 'var(--editor-padding, 22px 24px 120px)',
    caretColor: 'var(--accent)'
  },
  '.cm-line': {
    padding: '0 2px'
  },
  '.cm-gutters': {
    borderRight: '1px solid var(--border)',
    backgroundColor: 'var(--panel-alt)',
    color: 'var(--muted)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--accent-soft)',
    color: 'var(--accent-strong)'
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, var(--accent-soft) 46%, transparent)'
  },
  '.cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 22%, transparent) !important'
  },
  '&.cm-focused': {
    outline: '2px solid var(--accent)',
    outlineOffset: '-2px'
  },
  '.cm-placeholder': {
    color: 'var(--muted)'
  },
  '.cm-foldGutter span': {
    color: 'var(--muted)'
  }
});

bootstrap();

function hydrateTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(savedTheme || preferredTheme, false);
}

function hydrateSession() {
  const saved = readStoredSession();

  if (saved?.documents?.length) {
    documents = saved.documents.map((document) => ({
      ...document,
      dirty: Boolean(document.dirty),
      content: String(document.content ?? ''),
      fileState: normalizeFileState(document.fileState)
    }));
    activeDocumentId = saved.activeDocumentId || documents[0].id;
    activeVault = saved.activeVault || null;
    viewMode = saved.viewMode || 'split';
    graphMode = VALID_GRAPH_MODES.has(saved.graphMode) ? saved.graphMode : 'local';
    fullGraphMode = VALID_GRAPH_MODES.has(saved.fullGraphMode) ? saved.fullGraphMode : graphMode;
    fullGraphSpaceMode = VALID_GRAPH_SPACE_MODES.has(saved.fullGraphSpaceMode) ? saved.fullGraphSpaceMode : FULL_GRAPH_SPACE_MODE_2D;
    fullGraphZoom = clampNumber(Number(saved.fullGraphZoom), FULL_GRAPH_MIN_ZOOM, FULL_GRAPH_MAX_ZOOM, 1);
    fullGraphPan = normalizeFullGraphPan(saved.fullGraphPan);
    fullGraphRotation = normalizeFullGraphRotation(saved.fullGraphRotation);
    fullGraphAutoRotate = Boolean(saved.fullGraphAutoRotate);
    fullGraphLocalDepth = clampFullGraphDepth(saved.fullGraphLocalDepth);
    vaultExpandedFolders = new Set(Array.isArray(saved.vaultExpandedFolders) ? saved.vaultExpandedFolders : []);
    return;
  }

  const doc = createDocument({
    title: UNTITLED_NAME,
    content: sampleMarkdown,
    dirty: false
  });

  documents = [doc];
  activeDocumentId = doc.id;
}

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch (_error) {
    return null;
  }
}

function readGraphPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GRAPH_PRESETS_KEY));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((preset) => ({
        id: String(preset.id || crypto.randomUUID()).slice(0, 80),
        name: String(preset.name || 'Map View').slice(0, 60),
        mode: VALID_GRAPH_MODES.has(preset.mode) ? preset.mode : 'local',
        depth: clampFullGraphDepth(preset.depth),
        filters: normalizeGraphPresetFilters(preset.filters || {})
      }))
      .slice(0, 24);
  } catch (_error) {
    return [];
  }
}

function writeGraphPresets() {
  try {
    localStorage.setItem(GRAPH_PRESETS_KEY, JSON.stringify(fullGraphPresets.slice(0, 24)));
  } catch (_error) {
    showToast('Map views could not be saved locally.');
  }
}

async function refreshRecentItems() {
  if (!native?.listRecentItems) return;
  try {
    recentItems = normalizeRecentItems(await native.listRecentItems());
    renderCommandPaletteResults();
    renderVaultSidebar();
  } catch (_error) {
    recentItems = { files: [], vaults: [] };
    renderVaultSidebar();
  }
}

function normalizeRecentItems(value = {}) {
  const normalize = (item, type) => ({
    id: String(item?.id || '').slice(0, 80),
    type,
    name: String(item?.name || (type === 'vault' ? 'Recent Folder' : 'Recent File')).slice(0, 240),
    path: String(item?.path || '').slice(0, 2000),
    openedAt: Number(item?.openedAt) || 0
  });

  return {
    files: Array.isArray(value.files) ? value.files.map((item) => normalize(item, 'file')).filter((item) => item.id && item.path).slice(0, 24) : [],
    vaults: Array.isArray(value.vaults) ? value.vaults.map((item) => normalize(item, 'vault')).filter((item) => item.id && item.path).slice(0, 24) : []
  };
}

function getRecentItem(type, recentId) {
  const source = type === 'vault' ? recentItems.vaults : recentItems.files;
  return source.find((item) => item.id === recentId) || null;
}

function normalizeGraphPresetFilters(filters) {
  return {
    folder: String(filters.folder || 'all').slice(0, 240),
    extension: normalizeGraphExtensionFilter(filters.extension),
    tagged: Boolean(filters.tagged),
    orphans: Boolean(filters.orphans),
    unresolved: Boolean(filters.unresolved),
    backlinks: Boolean(filters.backlinks),
    outgoing: Boolean(filters.outgoing),
    media: Boolean(filters.media),
    canvas: Boolean(filters.canvas)
  };
}

function normalizeGraphExtensionFilter(value) {
  const extension = String(value || 'all')
    .trim()
    .toLowerCase()
    .replace(/^\./, '')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 24);
  return extension || 'all';
}

function normalizeFullGraphRotation(value) {
  if (!value || typeof value !== 'object') return { ...FULL_GRAPH_DEFAULT_ROTATION };
  const normalized = {
    x: clampNumber(Number(value.x), FULL_GRAPH_MIN_ROT_X, FULL_GRAPH_MAX_ROT_X, FULL_GRAPH_DEFAULT_ROTATION.x),
    y: clampNumber(Number(value.y), -360, 360, FULL_GRAPH_DEFAULT_ROTATION.y),
    z: clampNumber(Number(value.z), -360, 360, FULL_GRAPH_DEFAULT_ROTATION.z)
  };
  return normalized;
}

function normalizeFullGraphPan(value) {
  if (!value || typeof value !== 'object') return { x: 0, y: 0 };
  const x = Number(value.x);
  const y = Number(value.y);
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  };
}

function clampNumber(value, minValue, maxValue, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minValue, Math.min(maxValue, value));
}

function clampFullGraphDepth(value) {
  return Math.max(FULL_GRAPH_MIN_DEPTH, Math.min(FULL_GRAPH_MAX_DEPTH, Number(value) || FULL_GRAPH_MIN_DEPTH));
}

function schedulePersist(delay = PERSIST_DELAY_MS) {
  clearTimeout(persistTimer);
  persistTimer = window.setTimeout(persistSession, delay);
  scheduleAutosaveDrafts(delay + AUTOSAVE_DELAY_MS);
}

function waitForNextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function flushPersistSession() {
  clearTimeout(persistTimer);
  persistTimer = null;
  persistSession();
}

function persistSession() {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        documents,
        activeVault,
        activeDocumentId,
        viewMode,
        graphMode,
        fullGraphMode,
        fullGraphSpaceMode,
        fullGraphZoom,
        fullGraphPan,
        fullGraphRotation,
        fullGraphAutoRotate,
        fullGraphLocalDepth,
        vaultExpandedFolders: [...vaultExpandedFolders].slice(0, 400)
      })
    );
  } catch (_error) {
    if (!sessionStorageWarningShown) {
      sessionStorageWarningShown = true;
      showToast('Session cache is full. Save important edits to disk.');
    }
  }

  scheduleAutosaveDrafts();
}

function scheduleAutosaveDrafts(delay = AUTOSAVE_DELAY_MS) {
  clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(writeAutosaveDrafts, delay);
}

function flushAutosaveDrafts() {
  clearTimeout(autosaveTimer);
  autosaveTimer = null;
  void writeAutosaveDrafts();
}

async function writeAutosaveDrafts() {
  if (!native?.saveAutosaveDrafts || native.platform === 'browser') return;

  try {
    const dirtyDocuments = documents.filter((doc) => doc.dirty);
    if (!dirtyDocuments.length) {
      if (pendingRecoveryDrafts?.documents?.length) return;
      await native.clearAutosaveDrafts();
      return;
    }

    await native.saveAutosaveDrafts({
      activeDocumentId,
      activeVault,
      documents: dirtyDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        path: doc.path,
        relativePath: doc.relativePath,
        content: doc.content,
        dirty: doc.dirty,
        lastSavedAt: doc.lastSavedAt,
        fileState: doc.fileState
      }))
    });
  } catch (error) {
    if (!autosaveWarningShown) {
      autosaveWarningShown = true;
      showToast(`Autosave failed: ${error.message}`);
    }
  }
}

async function inspectAutosaveDrafts() {
  if (!native?.readAutosaveDrafts || native.platform === 'browser') return;

  try {
    const drafts = await native.readAutosaveDrafts();
    if (!drafts?.documents?.length) return;
    pendingRecoveryDrafts = drafts;
    renderRecoveryModal(drafts);
  } catch (error) {
    showToast(`Recovery check failed: ${error.message}`);
  }
}

function renderRecoveryModal(drafts) {
  const documentsCount = drafts.documents.length;
  const savedAt = drafts.savedAt ? new Date(drafts.savedAt).toLocaleString() : 'unknown time';
  recoverySummary.textContent = `${documentsCount} unsaved draft${documentsCount === 1 ? '' : 's'} from ${savedAt}.`;
  recoveryList.innerHTML = drafts.documents
    .map((doc) => {
      const label = escapeHtml(doc.relativePath || doc.title || 'Untitled.md');
      const words = countWords(doc.content || '');
      const pathText = doc.path ? escapeHtml(doc.path) : 'Unsaved document';
      return `<article class="recovery-item">
        <strong>${label}</strong>
        <span>${words} word${words === 1 ? '' : 's'}</span>
        <small>${pathText}</small>
      </article>`;
    })
    .join('');
  recoveryModal.hidden = false;
}

async function restoreAutosaveDrafts() {
  if (!pendingRecoveryDrafts?.documents?.length) return;

  const canReplaceStarter =
    documents.length === 1 &&
    !documents[0].path &&
    !documents[0].dirty &&
    documents[0].content === sampleMarkdown;

  if (canReplaceStarter) {
    documents = [];
  }

  for (const draft of pendingRecoveryDrafts.documents) {
    const existing = documents.find((doc) => doc.id === draft.id || (doc.path && doc.path === draft.path));
    if (existing) {
      existing.title = draft.title || existing.title;
      existing.path = draft.path || existing.path;
      existing.relativePath = draft.relativePath || existing.relativePath;
      existing.content = String(draft.content ?? '');
      existing.dirty = true;
      existing.lastSavedAt = draft.lastSavedAt || existing.lastSavedAt;
      existing.fileState = normalizeFileState(draft.fileState) || existing.fileState;
      continue;
    }

    documents.push(
      createDocument({
        id: draft.id,
        title: draft.title || UNTITLED_NAME,
        path: draft.path || null,
        relativePath: draft.relativePath || null,
        content: String(draft.content ?? ''),
        dirty: true,
        lastSavedAt: draft.lastSavedAt || null,
        fileState: draft.fileState
      })
    );
  }

  if (pendingRecoveryDrafts.activeVault?.path) {
    activeVault = pendingRecoveryDrafts.activeVault;
  }

  recoveryModal.hidden = true;
  const nextActiveId = documents.some((doc) => doc.id === pendingRecoveryDrafts.activeDocumentId)
    ? pendingRecoveryDrafts.activeDocumentId
    : documents[0]?.id;
  pendingRecoveryDrafts = null;
  activateDocument(nextActiveId);
  persistSession();
  scheduleAutosaveDrafts(0);
  showToast('Autosave drafts restored.');
}

async function discardAutosaveDrafts() {
  try {
    await native.clearAutosaveDrafts();
    pendingRecoveryDrafts = null;
    recoveryModal.hidden = true;
    showToast('Autosave drafts discarded.');
  } catch (error) {
    showToast(`Discard failed: ${error.message}`);
  }
}

async function openVersionHistory() {
  const doc = getActiveDocument();
  if (!doc?.path) {
    showToast('Save this document before opening version history.');
    return;
  }

  historyModal.hidden = false;
  historyTitle.textContent = `${doc.title} History`;
  historySummary.textContent = 'Loading saved snapshots...';
  historyList.innerHTML = '<p class="command-empty">Loading history...</p>';

  try {
    const history = await native.listFileHistory(doc.path);
    renderVersionHistory(history);
  } catch (error) {
    historySummary.textContent = 'Could not load version history.';
    historyList.innerHTML = `<p class="command-empty">${escapeHtml(error.message)}</p>`;
  }
}

function closeVersionHistory() {
  historyModal.hidden = true;
  versionHistoryTrigger.focus();
}

function renderVersionHistory(history) {
  const snapshots = Array.isArray(history?.snapshots) ? history.snapshots : [];
  const doc = getActiveDocument();
  historyTitle.textContent = `${doc?.title || history?.name || 'File'} History`;
  historySummary.textContent = snapshots.length
    ? `${snapshots.length} saved snapshot${snapshots.length === 1 ? '' : 's'} kept locally. Restoring makes the current document dirty until you save.`
    : 'No saved snapshots yet. Save this file a few times to build local history.';

  historyList.innerHTML = snapshots.length
    ? snapshots
        .map((snapshot) => {
          const savedAt = snapshot.savedAt ? new Date(snapshot.savedAt).toLocaleString() : 'Unknown time';
          const size = formatBytes(snapshot.bytes || 0);
          return `<button class="history-item" type="button" data-history-snapshot-id="${escapeAttribute(snapshot.id)}">
            <span>
              <strong>${escapeHtml(savedAt)}</strong>
              <small>${escapeHtml(size)}</small>
            </span>
            <em>Restore</em>
          </button>`;
        })
        .join('')
    : '<p class="command-empty">No saved snapshots for this file.</p>';
}

async function restoreHistorySnapshot(snapshotId) {
  const doc = getActiveDocument();
  if (!doc?.path) return;

  if (doc.dirty && !confirm(`Replace unsaved edits in ${doc.title} with this saved snapshot?`)) {
    return;
  }

  try {
    const snapshot = await native.readFileHistorySnapshot({
      path: doc.path,
      id: snapshotId
    });
    if (!snapshot) return;

    doc.content = String(snapshot.content ?? '');
    doc.dirty = true;
    activeDocumentId = doc.id;
    setEditorContent(doc.content);
    lastRenderedHash = '';
    updateStats(doc.content);
    updateStatus();
    renderDocumentTabs();
    renderVaultSidebar();
    scheduleRender(0);
    persistSession();
    closeVersionHistory();
    showToast('Version restored as unsaved changes. Save to write it to disk.');
  } catch (error) {
    showToast(`Restore failed: ${error.message}`);
  }
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('vault-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle('mobile-open');
  if (backdrop) backdrop.classList.toggle('visible', isOpen);
}

function openMobileSidebar() {
  const sidebar = document.getElementById('vault-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar || sidebar.classList.contains('mobile-open')) return;
  sidebar.classList.add('mobile-open');
  if (backdrop) backdrop.classList.add('visible');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('vault-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;
  sidebar.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.remove('visible');
}

function bindDomEvents() {
  const addDomListener = (target, eventName, listener, options) => {
    if (!target) return;
    target.addEventListener(eventName, listener, options);
  };

  document.getElementById('open-file').addEventListener('click', openFromDialog);
  document.getElementById('open-vault').addEventListener('click', openVaultFromDialog);
  sidebarOpenFileButton.addEventListener('click', openFromDialog);
  sidebarOpenVaultButton.addEventListener('click', openVaultFromDialog);
  addDomListener(document.getElementById('start-open-file'), 'click', openFromDialog);
  addDomListener(document.getElementById('start-open-vault'), 'click', openVaultFromDialog);
  addDomListener(document.getElementById('start-new-note'), 'click', createUntitledDocument);
  addDomListener(document.getElementById('start-command-palette'), 'click', openCommandPalette);
  addDomListener(documentSaveButton, 'click', saveActiveDocument);
  addDomListener(documentMindMapButton, 'click', openMindMapCanvas);
  addDomListener(documentGraphButton, 'click', openFullGraph);
  addDomListener(inspectorOpenGraphButton, 'click', openFullGraph);
  addDomListener(inspectorOpenMindMapButton, 'click', openMindMapCanvas);
  addDomListener(inspectorCopyContextButton, 'click', copyAiContextMap);
  addDomListener(inspectorNewContextButton, 'click', createAiContextMapDocument);
  document.getElementById('save-file').addEventListener('click', saveActiveDocument);
  document.getElementById('save-file-as').addEventListener('click', saveActiveDocumentAs);
  document.getElementById('copy-markdown').addEventListener('click', copyActiveMarkdown);
  document.getElementById('open-mind-map').addEventListener('click', openMindMapCanvas);
  document.getElementById('insert-mind-map').addEventListener('click', insertMindMapFromHeadings);
  document.getElementById('export-html').addEventListener('click', exportActiveHtml);
  document.getElementById('export-pdf').addEventListener('click', exportActivePdf);
  document.getElementById('publish-vault').addEventListener('click', publishStaticSite);
  document.getElementById('new-tab').addEventListener('click', createUntitledDocument);
  addDomListener(document.getElementById('daily-note'), 'click', createDailyNote);
  document.getElementById('reveal-file').addEventListener('click', revealActiveFile);
  themeToggle.addEventListener('click', () => toggleTheme());

  // Edit toolbar buttons
  addDomListener(document.getElementById('undo-btn'), 'click', () => {
    if (editorView) undo(editorView);
  });
  addDomListener(document.getElementById('redo-btn'), 'click', () => {
    if (editorView) redo(editorView);
  });
  addDomListener(document.getElementById('cut-btn'), 'click', () => {
    document.execCommand('cut');
  });
  addDomListener(document.getElementById('copy-selection-btn'), 'click', () => {
    document.execCommand('copy');
  });
  addDomListener(document.getElementById('paste-btn'), 'click', () => {
    document.execCommand('paste');
  });
  addDomListener(document.getElementById('find-replace-btn'), 'click', () => {
    if (editorView) openSearchPanel(editorView);
  });

  // Mobile sidebar toggle
  addDomListener(document.getElementById('sidebar-toggle'), 'click', toggleMobileSidebar);

  // Mobile sidebar backdrop — tap to close
  addDomListener(document.getElementById('sidebar-backdrop'), 'click', closeMobileSidebar);

  // Mobile swipe-to-close sidebar
  let sidebarTouchStartX = 0;
  const sidebar = document.getElementById('vault-sidebar');
  if (sidebar) {
    sidebar.addEventListener('touchstart', (e) => {
      sidebarTouchStartX = e.touches[0].clientX;
    }, { passive: true });
    sidebar.addEventListener('touchend', (e) => {
      const deltaX = e.changedTouches[0].clientX - sidebarTouchStartX;
      if (deltaX < -60) closeMobileSidebar(); // swipe left to close
    }, { passive: true });
  }

  // Swipe right from edge to open sidebar
  document.addEventListener('touchstart', (e) => {
    if (e.touches[0].clientX < 20) sidebarTouchStartX = e.touches[0].clientX;
    else sidebarTouchStartX = -1;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (sidebarTouchStartX >= 0 && sidebarTouchStartX < 20) {
      const deltaX = e.changedTouches[0].clientX - sidebarTouchStartX;
      if (deltaX > 60) openMobileSidebar();
    }
  }, { passive: true });

  // Mobile floating action button
  addDomListener(document.getElementById('mobile-new-note'), 'click', createUntitledDocument);

  activityButtons.forEach((button) => {
    addDomListener(button, 'click', () => handleActivitySurface(button.dataset.activitySurface));
  });

  formatButtons.forEach((button) => {
    button.addEventListener('click', () => runFormattingCommand(button.dataset.formatCommand));
  });

  document.querySelectorAll('[data-view-mode]').forEach((button) => {
    button.addEventListener('click', () => setViewMode(button.dataset.viewMode));
  });

  vaultSearchInput.addEventListener('input', renderVaultSidebar);
  recentWorkList.addEventListener('click', handleSidebarRecentWorkClick);
  addDomListener(startRecentList, 'click', handleSidebarRecentWorkClick);
  newVaultFileButton.addEventListener('click', createVaultFileFromPrompt);
  renameVaultFileButton.addEventListener('click', renameActiveVaultFileFromPrompt);
  deleteVaultFileButton.addEventListener('click', deleteActiveVaultFileWithConfirmation);

  vaultFileList.addEventListener('click', (event) => {
    if (event.target.closest('[data-empty-new-file]')) {
      createVaultFileFromPrompt();
      return;
    }

    const folderButton = event.target.closest('[data-vault-folder-path]');
    if (folderButton) {
      toggleVaultFolder(folderButton.dataset.vaultFolderPath);
      return;
    }

    const fileButton = event.target.closest('[data-vault-file-path]');
    if (!fileButton) return;
    activateDocumentByPath(fileButton.dataset.vaultFilePath);
    closeMobileSidebar(); // auto-close sidebar on mobile after selecting a file
  });

  outlineList.addEventListener('click', (event) => {
    const outlineButton = event.target.closest('[data-outline-line]');
    if (!outlineButton) return;
    jumpToEditorLine(Number(outlineButton.dataset.outlineLine));
  });

  backlinkList.addEventListener('click', (event) => {
    const backlinkButton = event.target.closest('[data-backlink-path]');
    if (!backlinkButton) return;
    activateDocumentByPath(backlinkButton.dataset.backlinkPath);
  });

  graphModeButtons.forEach((button) => {
    button.addEventListener('click', () => setGraphMode(button.dataset.graphMode));
  });

  openFullGraphButton.addEventListener('click', openFullGraph);

  graphCanvas.addEventListener('click', (event) => {
    const graphNode = event.target.closest('[data-graph-node-path]');
    if (!graphNode) return;
    activateDocumentByPath(graphNode.dataset.graphNodePath);
  });

  graphCanvas.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const graphNode = event.target.closest('[data-graph-node-path]');
    if (!graphNode) return;
    event.preventDefault();
    activateDocumentByPath(graphNode.dataset.graphNodePath);
  });

  copyAiMapButton.addEventListener('click', copyAiContextMap);
  newAiMapButton.addEventListener('click', createAiContextMapDocument);
  copyAiMapGraphButton.addEventListener('click', copyAiContextMap);
  newAiMapGraphButton.addEventListener('click', createAiContextMapDocument);
  restoreDraftsButton.addEventListener('click', restoreAutosaveDrafts);
  discardDraftsButton.addEventListener('click', discardAutosaveDrafts);
  versionHistoryTrigger.addEventListener('click', openVersionHistory);
  closeHistoryButton.addEventListener('click', closeVersionHistory);
  historyModal.addEventListener('click', (event) => {
    if (event.target === historyModal) closeVersionHistory();
  });
  historyList.addEventListener('click', (event) => {
    const historyButton = event.target.closest('[data-history-snapshot-id]');
    if (!historyButton) return;
    restoreHistorySnapshot(historyButton.dataset.historySnapshotId);
  });

  globalSearchTrigger.addEventListener('click', openGlobalSearch);
  globalSearchModal.addEventListener('click', (event) => {
    if (event.target === globalSearchModal) closeGlobalSearch();
  });
  globalSearchInput.addEventListener('input', renderGlobalSearchResults);
  globalSearchInput.addEventListener('keydown', handleGlobalSearchKeydown);
  globalSearchResults.addEventListener('keydown', handleGlobalSearchKeydown);
  globalSearchResults.addEventListener('click', (event) => {
    const resultButton = event.target.closest('[data-search-result-id]');
    if (!resultButton) return;
    openSearchResult(resultButton.dataset.searchResultId, Number(resultButton.dataset.searchResultLine));
  });

  commandPaletteTrigger.addEventListener('click', openCommandPalette);
  commandPalette.addEventListener('click', (event) => {
    if (event.target === commandPalette) closeCommandPalette();
  });
  commandSearchInput.addEventListener('input', () => {
    commandPaletteSelection = 0;
    renderCommandPaletteResults();
  });
  commandSearchInput.addEventListener('keydown', handleCommandPaletteKeydown);
  commandResults.addEventListener('click', (event) => {
    const item = event.target.closest('[data-command-index]');
    if (!item) return;
    runCommandPaletteSelection(Number(item.dataset.commandIndex));
  });

  addDomListener(closeFullGraphButton, 'click', closeFullGraph);
  addDomListener(fullGraphModal, 'click', (event) => {
    if (event.target === fullGraphModal) closeFullGraph();
  });
  addDomListener(fullGraphSearchInput, 'input', renderFullGraph);
  fullGraphModeButtons.forEach((button) => {
    addDomListener(button, 'click', () => setFullGraphMode(button.dataset.fullGraphMode));
  });
  fullGraphSpaceModeButtons.forEach((button) => {
    addDomListener(button, 'click', () => setFullGraphSpaceMode(button.dataset.fullGraphSpace));
  });
  addDomListener(fullGraphDepthInput, 'input', () => {
    fullGraphLocalDepth = clampFullGraphDepth(fullGraphDepthInput.value);
    fullGraphPreviewPath = null;
    renderFullGraph();
    schedulePersist();
  });
  addDomListener(fullGraphPresetSelect, 'change', () => applyFullGraphPreset(fullGraphPresetSelect.value));
  addDomListener(fullGraphSavePresetButton, 'click', saveCurrentFullGraphPreset);
  addDomListener(fullGraphDeletePresetButton, 'click', deleteSelectedFullGraphPreset);
  addDomListener(fullGraphFolderFilter, 'change', () => {
    fullGraphPreviewPath = null;
    renderFullGraph();
  });
  addDomListener(fullGraphExtensionFilter, 'change', () => {
    fullGraphPreviewPath = null;
    renderFullGraph();
  });
  [
    fullGraphTaggedFilter,
    fullGraphOrphansFilter,
    fullGraphUnresolvedFilter,
    fullGraphBacklinksFilter,
    fullGraphOutgoingFilter,
    fullGraphMediaFilter,
    fullGraphCanvasFilter
  ].forEach((input) => {
    addDomListener(input, 'change', () => {
      fullGraphPreviewPath = null;
      renderFullGraph();
    });
  });
  addDomListener(fullGraphZoomOutButton, 'click', () => setFullGraphZoom(fullGraphZoom - 0.15));
  addDomListener(fullGraphFitButton, 'click', fitFullGraphToView);
  addDomListener(fullGraphResetButton, 'click', resetFullGraphViewport);
  addDomListener(fullGraphZoomInButton, 'click', () => setFullGraphZoom(fullGraphZoom + 0.15));
  addDomListener(fullGraphRotateLeftButton, 'click', () => rotateFullGraphYaw(-FULL_GRAPH_ROTATION_STEP));
  addDomListener(fullGraphRotateRightButton, 'click', () => rotateFullGraphYaw(FULL_GRAPH_ROTATION_STEP));
  addDomListener(fullGraphRotateUpButton, 'click', () => rotateFullGraphPitch(-FULL_GRAPH_ROTATION_STEP));
  addDomListener(fullGraphRotateDownButton, 'click', () => rotateFullGraphPitch(FULL_GRAPH_ROTATION_STEP));
  addDomListener(fullGraphRotationResetButton, 'click', resetFullGraphRotation);
  addDomListener(fullGraphAutoRotateButton, 'click', () => toggleFullGraphAutoRotate());
  addDomListener(exportGraphJsonButton, 'click', exportFullGraphJson);
  addDomListener(exportGraphSvgButton, 'click', exportFullGraphSvg);
  addDomListener(exportGraphContextButton, 'click', exportFullGraphContext);
  addDomListener(fullGraphExportProfileSelect, 'change', () => {
    updateFullGraphExportButtons();
  });
  addDomListener(fullGraphMinimap, 'click', centerFullGraphFromMinimap);
  addDomListener(fullGraphMinimap, 'keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    centerFullGraphFromMinimap(event);
  });
  addDomListener(fullGraphCanvas, 'click', (event) => {
    const graphNode = event.target.closest('[data-graph-node-path]');
    if (!graphNode) return;
    activateDocumentByPath(graphNode.dataset.graphNodePath);
    renderFullGraph();
  });
  addDomListener(fullGraphCanvas, 'keydown', handleFullGraphKeyboard);
  addDomListener(fullGraphCanvas, 'mouseover', (event) => {
    cancelFullGraphPreviewHide();
    const graphNode = event.target.closest('[data-graph-node-path]');
    if (graphNode) previewFullGraphNode(graphNode.dataset.graphNodePath, graphNode);
  });
  addDomListener(fullGraphCanvas, 'mousemove', (event) => {
    const graphNode = event.target.closest('[data-graph-node-path]');
    if (graphNode && fullGraphPreviewPopover && !fullGraphPreviewPopover.hidden) {
      positionFullGraphPreviewPopover(graphNode);
    }
  });
  addDomListener(fullGraphCanvas, 'mouseleave', scheduleFullGraphPreviewHide);
  addDomListener(fullGraphCanvas, 'focusout', (event) => {
    if (fullGraphCanvas.contains(event.relatedTarget) || fullGraphPreviewPopover?.contains(event.relatedTarget)) return;
    scheduleFullGraphPreviewHide();
  });
  addDomListener(fullGraphCanvas, 'focusin', (event) => {
    cancelFullGraphPreviewHide();
    const graphNode = event.target.closest('[data-graph-node-path]');
    if (graphNode) previewFullGraphNode(graphNode.dataset.graphNodePath, graphNode);
  });
  addDomListener(fullGraphPreviewPopover, 'mouseenter', cancelFullGraphPreviewHide);
  addDomListener(fullGraphPreviewPopover, 'mouseleave', scheduleFullGraphPreviewHide);
  addDomListener(fullGraphPreviewPopover, 'focusin', cancelFullGraphPreviewHide);
  addDomListener(fullGraphPreviewPopover, 'focusout', (event) => {
    if (fullGraphCanvas.contains(event.relatedTarget) || fullGraphPreviewPopover.contains(event.relatedTarget)) return;
    scheduleFullGraphPreviewHide();
  });
  addDomListener(fullGraphPreviewPopover, 'click', handleSourceAnchorClick);
  addDomListener(fullGraphPreviewPopover, 'keydown', (event) => {
    if (event.key === 'Escape') hideFullGraphPreviewPopover();
  });
  addDomListener(fullGraphList, 'click', (event) => {
    const nodeButton = event.target.closest('[data-full-graph-node-path]');
    if (!nodeButton) return;
    activateDocumentByPath(nodeButton.dataset.fullGraphNodePath);
    renderFullGraph();
  });
  addDomListener(fullGraphList, 'mouseover', (event) => {
    const nodeButton = event.target.closest('[data-full-graph-node-path]');
    if (nodeButton) previewFullGraphNode(nodeButton.dataset.fullGraphNodePath);
  });
  addDomListener(fullGraphList, 'focusin', (event) => {
    const nodeButton = event.target.closest('[data-full-graph-node-path]');
    if (nodeButton) previewFullGraphNode(nodeButton.dataset.fullGraphNodePath);
  });
  addDomListener(fullGraphDetail, 'click', (event) => {
    if (handleSourceAnchorClick(event)) return;

    const focusButton = event.target.closest('[data-full-graph-focus-path]');
    if (focusButton) {
      focusFullGraphNode(focusButton.dataset.fullGraphFocusPath);
      return;
    }

    const expandButton = event.target.closest('[data-full-graph-expand-path]');
    if (expandButton) {
      expandFullGraphNeighborhood(expandButton.dataset.fullGraphExpandPath);
      return;
    }

    const openButton = event.target.closest('[data-full-graph-open-path]');
    if (openButton) {
      activateDocumentByPath(openButton.dataset.fullGraphOpenPath);
      renderFullGraph();
    }
  });
  addDomListener(fullGraphStage, 'wheel', handleFullGraphWheel, { passive: false });
  addDomListener(fullGraphStage, 'pointerdown', handleFullGraphPointerDown);
  addDomListener(fullGraphStage, 'pointermove', handleFullGraphPointerMove);
  addDomListener(fullGraphStage, 'pointerup', endFullGraphDrag);
  addDomListener(fullGraphStage, 'pointercancel', endFullGraphDrag);

  closeMindMapButton.addEventListener('click', closeMindMapCanvas);
  mindMapModal.addEventListener('click', (event) => {
    if (event.target === mindMapModal) closeMindMapCanvas();
  });
  mindMapSearchInput.addEventListener('input', renderMindMapCanvas);
  mindMapZoomOutButton.addEventListener('click', () => setMindMapZoom(mindMapZoom - 0.15));
  mindMapResetButton.addEventListener('click', resetMindMapViewport);
  mindMapZoomInButton.addEventListener('click', () => setMindMapZoom(mindMapZoom + 0.15));
  copyMindMapContextButton.addEventListener('click', copyMindMapContext);
  newMindMapContextButton.addEventListener('click', createMindMapContextDocument);
  insertMindMapFromCanvasButton.addEventListener('click', insertMindMapFromHeadings);
  mindMapCanvas.addEventListener('click', (event) => {
    const node = event.target.closest('[data-mind-map-node-id]');
    if (!node) return;
    openMindMapNode(node.dataset.mindMapNodeId);
  });
  mindMapCanvas.addEventListener('mouseover', (event) => {
    const node = event.target.closest('[data-mind-map-node-id]');
    if (node) previewMindMapNode(node.dataset.mindMapNodeId);
  });
  mindMapCanvas.addEventListener('focusin', (event) => {
    const node = event.target.closest('[data-mind-map-node-id]');
    if (node) previewMindMapNode(node.dataset.mindMapNodeId);
  });
  mindMapCanvas.addEventListener('keydown', (event) => handleMindMapKeyboard(event, true));
  mindMapList.addEventListener('click', (event) => {
    const nodeButton = event.target.closest('[data-mind-map-list-node-id]');
    if (!nodeButton) return;
    openMindMapNode(nodeButton.dataset.mindMapListNodeId);
  });
  mindMapList.addEventListener('mouseover', (event) => {
    const nodeButton = event.target.closest('[data-mind-map-list-node-id]');
    if (nodeButton) previewMindMapNode(nodeButton.dataset.mindMapListNodeId);
  });
  mindMapList.addEventListener('focusin', (event) => {
    const nodeButton = event.target.closest('[data-mind-map-list-node-id]');
    if (nodeButton) previewMindMapNode(nodeButton.dataset.mindMapListNodeId);
  });
  mindMapList.addEventListener('keydown', (event) => handleMindMapKeyboard(event, false));
  mindMapDetail.addEventListener('click', (event) => {
    if (handleSourceAnchorClick(event)) return;
  });
  mindMapStage.addEventListener('wheel', handleMindMapWheel, { passive: false });
  mindMapStage.addEventListener('pointerdown', handleMindMapPointerDown);
  mindMapStage.addEventListener('pointermove', handleMindMapPointerMove);
  mindMapStage.addEventListener('pointerup', endMindMapDrag);
  mindMapStage.addEventListener('pointercancel', endMindMapDrag);

  document.querySelector('.preview-pane').addEventListener('scroll', () => syncScroll('preview'));

  tabsBar.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-tab-id]');
    const closeButton = event.target.closest('[data-close-tab]');

    if (closeButton) {
      closeDocument(closeButton.dataset.closeTab);
      return;
    }

    if (tabButton) {
      activateDocument(tabButton.dataset.tabId);
    }
  });

  tabsBar.addEventListener('keydown', (event) => {
    const tabs = [...tabsBar.querySelectorAll('[role="tab"]')];
    if (!tabs.length) return;

    const currentIndex = Math.max(0, tabs.findIndex((tab) => tab === document.activeElement));
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === currentIndex && !['Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    activateDocument(tabs[nextIndex].dataset.tabId);
    requestAnimationFrame(() => {
      tabsBar.querySelector(`[data-tab-id="${tabs[nextIndex].dataset.tabId}"]`)?.focus();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!commandPalette.hidden) {
        event.preventDefault();
        closeCommandPalette();
        return;
      }
      if (!globalSearchModal.hidden) {
        event.preventDefault();
        closeGlobalSearch();
        return;
      }
      if (!fullGraphModal.hidden) {
        event.preventDefault();
        closeFullGraph();
        return;
      }
      if (!mindMapModal.hidden) {
        event.preventDefault();
        closeMindMapCanvas();
        return;
      }
      if (!recoveryModal.hidden) {
        event.preventDefault();
        recoveryModal.hidden = true;
        return;
      }
      if (!historyModal.hidden) {
        event.preventDefault();
        closeVersionHistory();
        return;
      }
    }

    const isCommand = event.metaKey || event.ctrlKey;
    if (!isCommand) return;

    if (event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openCommandPalette();
      return;
    }

    if (event.key.toLowerCase() === 'p') {
      event.preventDefault();
      openQuickOpen();
      return;
    }

    if (event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      openGlobalSearch();
      return;
    }

    if (event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (event.shiftKey) {
        saveActiveDocumentAs();
      } else {
        saveActiveDocument();
      }
    }

    if (event.key.toLowerCase() === 'o') {
      event.preventDefault();
      if (event.shiftKey) {
        openVaultFromDialog();
      } else {
        openFromDialog();
      }
    }

    if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      if (event.altKey) {
        createVaultFileFromPrompt();
      } else {
        createUntitledDocument();
      }
    }

    if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'm') {
      event.preventDefault();
      openMindMapCanvas();
      return;
    }

    if (event.shiftKey && event.key.toLowerCase() === 'm') {
      event.preventDefault();
      insertMindMapFromHeadings();
    }

    if (event.shiftKey && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      openFullGraph();
    }
  });

  document.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dropOverlay.classList.add('visible');
  });

  document.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  document.addEventListener('dragleave', (event) => {
    if (event.target === document || event.clientX === 0 || event.clientY === 0) {
      dropOverlay.classList.remove('visible');
    }
  });

  document.addEventListener('drop', async (event) => {
    event.preventDefault();
    dropOverlay.classList.remove('visible');

    if (!event.dataTransfer.files.length) {
      showToast('No local file paths were available for this drop.');
      return;
    }

    const opened = await native.openDroppedFiles(event.dataTransfer.files);
    addOpenedDocuments(opened);
    void refreshRecentItems();
  });

  preview.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    event.preventDefault();
    native.openExternal(href);
  });

  native.onSystemOpenFiles((files) => {
    addOpenedDocuments(files);
    void refreshRecentItems();
  });
  native.onSystemUrlCommand((command) => handleSystemUrlCommand(command));
  native.onExternalFileChanged((change) => handleExternalFileChange(change));
  native.onMenuCommand((command) => {
    if (command === 'new') createUntitledDocument();
    if (command === 'open') openFromDialog();
    if (command === 'open-vault') openVaultFromDialog();
    if (command === 'quick-open') openQuickOpen();
    if (command === 'save') saveActiveDocument();
    if (command === 'save-as') saveActiveDocumentAs();
    if (command === 'export-html') exportActiveHtml();
    if (command === 'export-pdf') exportActivePdf();
    if (command === 'publish:static-site') publishStaticSite();
    if (command === 'mind-map:open') openMindMapCanvas();
    if (command === 'insert:mind-map') insertMindMapFromHeadings();
    if (command === 'search:global') openGlobalSearch();
    if (command === 'history:open') openVersionHistory();
    if (command === 'command-palette') openCommandPalette();
    if (command === 'graph:open') openFullGraph();
    if (command === 'format:heading') runFormattingCommand('heading');
    if (command === 'format:bold') runFormattingCommand('bold');
    if (command === 'format:italic') runFormattingCommand('italic');
    if (command === 'format:link') runFormattingCommand('link');
    if (command === 'format:code') runFormattingCommand('code');
    if (command === 'format:quote') runFormattingCommand('quote');
    if (command === 'format:task') runFormattingCommand('task');
    if (command === 'format:table') runFormattingCommand('table');
    if (command === 'vault:new-file') createVaultFileFromPrompt();
    if (command === 'vault:rename-file') renameActiveVaultFileFromPrompt();
    if (command === 'vault:delete-file') deleteActiveVaultFileWithConfirmation();
    if (command === 'view:split') setViewMode('split');
    if (command === 'view:editor') setViewMode('editor');
    if (command === 'view:preview') setViewMode('preview');
  });

  window.addEventListener('beforeunload', () => {
    flushPersistSession();
    flushAutosaveDrafts();
    syncNativeDocumentState();
  });
}

function handleSystemUrlCommand(command = {}) {
  if (command.type === 'new') {
    const doc = createDocument({
      title: sanitizeFileName(command.title || 'URL Note.md'),
      content: String(command.content || ''),
      dirty: true
    });
    documents.push(doc);
    activateDocument(doc.id);
    persistSession();
    showToast('URL note created.');
    return;
  }

  if (command.type === 'search') {
    openGlobalSearch(command.query || '');
    return;
  }

  if (command.type === 'open-dialog') {
    openFromDialog();
    return;
  }

  if (command.type === 'open-vault-dialog') {
    openVaultFromDialog();
    return;
  }

  if (command.type === 'command-palette') {
    openCommandPalette();
    return;
  }

  if (command.type === 'graph') {
    openFullGraph();
    return;
  }

  if (command.type === 'workflow') {
    executeWorkflowAction(command);
    return;
  }

  if (command.type === 'mind-map') {
    openMindMapCanvas();
    return;
  }
}

function executeWorkflowAction(command = {}) {
  const workflow = normalizeWorkflowCommand(command);
  const resolvedTarget = resolveWorkflowTarget(workflow);

  if (workflow.surface === 'search') {
    openGlobalSearch(workflow.query);
    return;
  }

  if (workflow.surface === 'command-palette') {
    openCommandPalette();
    return;
  }

  if (workflow.surface === 'mind-map') {
    if (resolvedTarget?.doc && workflow.openTarget) {
      activateDocument(resolvedTarget.doc.id);
    }
    const targetLine = resolvedTarget?.lineNumber;
    if (targetLine && resolvedTarget?.doc?.path) {
      const targetPath = resolvedTarget.doc.path;
      if (targetPath && workflow.openTarget) {
        openDocumentSourceAtLine(targetPath, targetLine, { closeMindMap: false });
      }
    }
    openMindMapCanvas({
      query: workflow.query,
      targetPath: resolvedTarget?.doc?.path || workflow.path || workflow.target
    });
    return;
  }

  if (!workflow.surface || workflow.surface === 'graph') {
    if (workflow.mode) {
      fullGraphMode = workflow.mode;
    }
    if (workflow.space) {
      fullGraphSpaceMode = workflow.space;
    }
    if (resolvedTarget?.doc && workflow.openTarget) {
      activateDocument(resolvedTarget.doc.id);
    }
    openFullGraph({
      query: workflow.query,
      targetPath: resolvedTarget?.doc?.path || '',
      keepSearch: workflow.query.length > 0
    });
    return;
  }
}

function normalizeWorkflowCommand(command = {}) {
  return {
    surface: normalizeWorkflowSurface(command.surface),
    mode: normalizeWorkflowMode(command.mode),
    space: normalizeWorkflowSpace(command.space),
    query: normalizeWorkflowText(command.query),
    target: normalizeWorkflowText(command.target),
    path: normalizeWorkflowText(command.path),
    openTarget: command.open !== false
  };
}

function normalizeWorkflowText(value) {
  return String(value || '').trim();
}

function normalizeWorkflowSurface(value) {
  const normalized = String(value || '').trim().toLowerCase().replaceAll('_', '-');
  if (!normalized || normalized === 'graph' || normalized === 'full-graph') return 'graph';
  if (normalized === 'mind-map' || normalized === 'mindmap' || normalized === 'mind_map') return 'mind-map';
  if (normalized === 'search' || normalized === 'global-search' || normalized === 'find') return 'search';
  if (normalized === 'command-palette' || normalized === 'commands') return 'command-palette';
  return normalized;
}

function normalizeWorkflowMode(value) {
  const normalized = String(value || '').trim().toLowerCase().replaceAll('_', '-');
  if (normalized === 'global' || normalized === 'full') return 'global';
  if (normalized === 'local' || normalized === 'focus') return 'local';
  return '';
}

function normalizeWorkflowSpace(value) {
  const normalized = String(value || '').trim().toLowerCase().replaceAll('_', '-');
  if (normalized === '3d' || normalized === 'full-3d' || normalized === 'threed' || normalized === 'x3d') return FULL_GRAPH_SPACE_MODE_3D;
  if (normalized === '2d' || normalized === 'full-2d' || normalized === 'twod') return FULL_GRAPH_SPACE_MODE_2D;
  return '';
}

function resolveWorkflowTarget(command = {}) {
  const targetValue = command.target || '';
  const pathValue = command.path || '';
  const preferredValue = pathValue || targetValue;
  if (!preferredValue) return null;

  const activeDocument = getActiveDocument();
  const sourceDoc = activeDocument || null;
  const docs = getVaultDocuments().length ? getVaultDocuments() : documents;
  const rawTarget = decodeURIComponentIfNeeded(preferredValue);
  const rawTargetWithoutHeading = String(rawTarget || '').split('#')[0].trim();
  const heading = String(rawTarget || '').split('#').slice(1).join('#').trim();
  const targetDoc = resolveDocumentFromTarget(rawTargetWithoutHeading, sourceDoc, docs);
  if (!targetDoc) {
    return null;
  }

  const lineNumber = heading ? getTargetHeadingLine(targetDoc, heading) : 1;
  return {
    ...targetDoc,
    lineNumber
  };
}

function resolveDocumentFromTarget(rawTarget, sourceDoc, docs) {
  const candidates = getGraphTargetCandidates(rawTarget, sourceDoc);
  if (!candidates.length) return null;

  for (const candidate of candidates) {
    const candidateDoc = resolveDocumentByKey(candidate, docs);
    if (candidateDoc) return candidateDoc;
  }

  return null;
}

function resolveDocumentByKey(targetKey, docs) {
  if (!docs?.length || !targetKey) return null;
  const normalizedTarget = normalizeLinkTarget(targetKey);
  const comparableTarget = normalizePathForCompare(targetKey);

  for (const doc of docs) {
    for (const key of getDocumentLinkKeys(doc)) {
      if (key === normalizedTarget) return { doc };
      if (comparableTarget && normalizePathForCompare(key) === comparableTarget) return { doc };
    }
  }

  return null;
}

function getTargetHeadingLine(doc, headingText) {
  if (!doc) return 1;
  const normalized = normalizeHeadingText(headingText);
  if (!normalized) return 1;

  for (const heading of extractMarkdownHeadings(doc.content || '')) {
    const target = normalizeHeadingText(heading.text);
    if (target === normalized || target.startsWith(`${normalized}:`) || normalized.startsWith(target)) {
      return heading.line;
    }
  }

  return 1;
}

function normalizeHeadingText(value) {
  return String(value || '')
    .replace(/[#*`_~>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  .toLowerCase();
}

function decodeURIComponentIfNeeded(value) {
  if (typeof value !== 'string') return '';
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return String(value);
  }
}

function openCommandPalette() {
  commandPalette.hidden = false;
  commandSearchInput.value = '';
  commandSearchInput.placeholder = 'Search commands and notes…';
  commandPaletteSelection = 0;
  renderCommandPaletteResults();
  requestAnimationFrame(() => commandSearchInput.focus());
}

function openQuickOpen(query = '') {
  commandPalette.hidden = false;
  commandSearchInput.value = String(query || '');
  commandSearchInput.placeholder = 'Find notes, recent files, folders, and commands…';
  commandPaletteSelection = 0;
  renderCommandPaletteResults();
  requestAnimationFrame(() => {
    commandSearchInput.focus();
    commandSearchInput.select();
  });
}

function closeCommandPalette() {
  commandPalette.hidden = true;
  commandSearchInput.placeholder = 'Search commands and notes…';
  commandPaletteTrigger.focus();
}

function openGlobalSearch(query = '') {
  globalSearchModal.hidden = false;
  globalSearchInput.value = String(query || '');
  renderGlobalSearchResults();
  requestAnimationFrame(() => {
    globalSearchInput.focus();
    globalSearchInput.select();
  });
}

function closeGlobalSearch() {
  globalSearchModal.hidden = true;
  globalSearchTrigger.focus();
}

function handleGlobalSearchKeydown(event) {
  const resultButtons = [...globalSearchResults.querySelectorAll('[data-search-result-id]')];
  const activeIndex = resultButtons.findIndex((button) => button === document.activeElement);

  if (event.key === 'Escape') {
    event.preventDefault();
    closeGlobalSearch();
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    const nextIndex = Math.min(resultButtons.length - 1, Math.max(0, activeIndex + 1));
    resultButtons[nextIndex]?.focus();
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (activeIndex <= 0) {
      globalSearchInput.focus();
    } else {
      resultButtons[activeIndex - 1]?.focus();
    }
    return;
  }

  if (event.key === 'Enter' && resultButtons.length) {
    event.preventDefault();
    const target = activeIndex >= 0 ? resultButtons[activeIndex] : resultButtons[0];
    openSearchResult(target.dataset.searchResultId, Number(target.dataset.searchResultLine));
  }
}

function renderGlobalSearchResults() {
  if (globalSearchModal.hidden) return;

  const query = globalSearchInput.value.trim();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const sourceDocs = getGlobalSearchDocuments();

  if (!terms.length) {
    globalSearchSummary.textContent = `${sourceDocs.length} searchable document${sourceDocs.length === 1 ? '' : 's'}`;
    globalSearchResults.innerHTML = '<p class="command-empty">Type to search open files and folder content.</p>';
    return;
  }

  const results = sourceDocs
    .map((doc) => createSearchResult(doc, terms))
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || getDisplayPath(left.doc).localeCompare(getDisplayPath(right.doc)))
    .slice(0, 80);

  globalSearchSummary.textContent = `${results.length} result${results.length === 1 ? '' : 's'} for "${query}"`;
  globalSearchResults.innerHTML = results.length
    ? results
        .map((result) => {
          const active = result.doc.id === activeDocumentId ? ' active' : '';
          return `<button class="search-result${active}" type="button" role="option" data-search-result-id="${result.doc.id}" data-search-result-line="${result.line}">
            <span>
              <strong>${highlightSearchTerms(getDisplayPath(result.doc), terms)}</strong>
              <small>${escapeHtml(result.lineLabel)}</small>
            </span>
            <em>${highlightSearchTerms(result.snippet, terms)}</em>
          </button>`;
        })
        .join('')
    : '<p class="command-empty">No matching files or content.</p>';
}

function getGlobalSearchDocuments() {
  const vaultDocs = getVaultDocuments();
  const sourceDocs = vaultDocs.length ? vaultDocs : documents;
  return [...sourceDocs].filter((doc) => doc?.content !== undefined).sort((left, right) => getDisplayPath(left).localeCompare(getDisplayPath(right)));
}

function createSearchResult(doc, terms) {
  const displayPath = getDisplayPath(doc);
  const titleText = `${doc.title} ${displayPath}`.toLowerCase();
  const contentText = String(doc.content || '').toLowerCase();
  const combined = `${titleText}\n${contentText}`;
  if (!terms.every((term) => combined.includes(term))) return null;

  const lineMatch = findBestSearchLine(doc.content, terms);
  const titleMatches = terms.filter((term) => titleText.includes(term)).length;
  const score = titleMatches * 40 + lineMatch.score + Math.max(0, 12 - Math.min(12, lineMatch.line / 10));

  return {
    doc,
    line: lineMatch.line,
    lineLabel: lineMatch.line > 0 ? `Line ${lineMatch.line}` : 'Title match',
    snippet: lineMatch.snippet || stripMarkdownExtension(displayPath),
    score
  };
}

function findBestSearchLine(markdown, terms) {
  const lines = String(markdown || '').split(/\r?\n/);
  let fallback = { line: 1, snippet: createPlainTextExcerpt(markdown, 160), score: 1 };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const lineText = rawLine.trim();
    if (!lineText) continue;

    const normalized = lineText.toLowerCase();
    const matchCount = terms.filter((term) => normalized.includes(term)).length;
    if (!matchCount) continue;

    const isHeading = /^#{1,6}\s+/.test(lineText);
    const score = matchCount * 18 + (terms.every((term) => normalized.includes(term)) ? 24 : 0) + (isHeading ? 8 : 0);
    const snippet = createPlainTextExcerpt(lineText, 180);

    if (score > fallback.score) {
      fallback = {
        line: index + 1,
        snippet,
        score
      };
    }
  }

  return fallback;
}

function openSearchResult(documentId, lineNumber) {
  const doc = documents.find((candidate) => candidate.id === documentId);
  if (!doc) return;

  closeGlobalSearch();
  activateDocument(doc.id);
  if (Number.isFinite(lineNumber) && lineNumber > 0) {
    requestAnimationFrame(() => jumpToEditorLine(lineNumber));
  }
}

function highlightSearchTerms(value, terms) {
  let html = escapeHtml(value || '');
  for (const term of terms) {
    const escapedTerm = escapeRegExp(term);
    if (!escapedTerm) continue;
    html = html.replace(new RegExp(`(${escapedTerm})`, 'gi'), '<mark>$1</mark>');
  }
  return html;
}

function handleCommandPaletteKeydown(event) {
  const items = getFilteredCommandPaletteItems();

  if (event.key === 'Escape') {
    event.preventDefault();
    closeCommandPalette();
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    commandPaletteSelection = Math.min(items.length - 1, commandPaletteSelection + 1);
    renderCommandPaletteResults();
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    commandPaletteSelection = Math.max(0, commandPaletteSelection - 1);
    renderCommandPaletteResults();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    runCommandPaletteSelection(commandPaletteSelection);
  }
}

function getCommandPaletteItems() {
  const activeDocument = getActiveDocument();
  const hasDocument = Boolean(activeDocument);
  const hasPath = Boolean(activeDocument?.path);
  const hasVault = Boolean(getVaultDocuments().length);
  const vaultDocs = getVaultDocuments();
  const items = [
    {
      type: 'Command',
      label: 'New Note',
      detail: 'Create a blank Markdown note',
      keywords: 'new note file markdown',
      run: createUntitledDocument
    },
    {
      type: 'Command',
      label: 'Open File',
      detail: 'Choose Markdown files from disk',
      keywords: 'open markdown file',
      run: openFromDialog
    },
    {
      type: 'Command',
      label: 'Open Folder',
      detail: 'Open a folder of Markdown files',
      keywords: 'folder workspace vault',
      run: openVaultFromDialog
    },
    {
      type: 'Command',
      label: 'Quick Open',
      detail: 'Jump to notes, recent files, recent folders, and commands',
      keywords: 'quick open switch recent workspace command p',
      run: openQuickOpen
    },
    {
      type: 'Command',
      label: 'Search Files',
      detail: 'Search open notes or the active folder',
      keywords: 'search find grep full text vault workspace',
      run: openGlobalSearch
    },
    {
      type: 'Command',
      label: 'Save',
      detail: 'Write the active document to disk',
      keywords: 'save write',
      disabled: !hasDocument,
      run: saveActiveDocument
    },
    {
      type: 'Command',
      label: 'Save As',
      detail: 'Save the active document to a new path',
      keywords: 'save as duplicate',
      disabled: !hasDocument,
      run: saveActiveDocumentAs
    },
    {
      type: 'Command',
      label: 'Version History',
      detail: 'Review and restore saved snapshots for this file',
      keywords: 'history versions recovery snapshot restore',
      disabled: !hasPath,
      run: openVersionHistory
    },
    {
      type: 'Command',
      label: 'Write + Read View',
      detail: 'Show writing and preview side by side',
      keywords: 'view split editor preview',
      run: () => setViewMode('split')
    },
    {
      type: 'Command',
      label: 'Write View',
      detail: 'Show only the editor',
      keywords: 'view editor source',
      run: () => setViewMode('editor')
    },
    {
      type: 'Command',
      label: 'Read View',
      detail: 'Show only the rendered note',
      keywords: 'view preview rendered',
      run: () => setViewMode('preview')
    },
    {
      type: 'Format',
      label: 'Heading 1',
      detail: 'Toggle the selected lines as a level-one heading',
      keywords: 'format markdown h1 title',
      disabled: !hasDocument,
      run: () => runFormattingCommand('heading')
    },
    {
      type: 'Format',
      label: 'Bold',
      detail: 'Wrap the selection in bold Markdown',
      keywords: 'format markdown strong',
      disabled: !hasDocument,
      run: () => runFormattingCommand('bold')
    },
    {
      type: 'Format',
      label: 'Italic',
      detail: 'Wrap the selection in italic Markdown',
      keywords: 'format markdown emphasis',
      disabled: !hasDocument,
      run: () => runFormattingCommand('italic')
    },
    {
      type: 'Format',
      label: 'Insert Link',
      detail: 'Create a Markdown link from the selection',
      keywords: 'format markdown url',
      disabled: !hasDocument,
      run: () => runFormattingCommand('link')
    },
    {
      type: 'Format',
      label: 'Inline Code',
      detail: 'Wrap the selection in inline code marks',
      keywords: 'format markdown code monospace',
      disabled: !hasDocument,
      run: () => runFormattingCommand('code')
    },
    {
      type: 'Format',
      label: 'Block Quote',
      detail: 'Toggle quote markers for the selected lines',
      keywords: 'format markdown quote',
      disabled: !hasDocument,
      run: () => runFormattingCommand('quote')
    },
    {
      type: 'Format',
      label: 'Task List',
      detail: 'Toggle task checkboxes for the selected lines',
      keywords: 'format markdown checkbox todo',
      disabled: !hasDocument,
      run: () => runFormattingCommand('task')
    },
    {
      type: 'Format',
      label: 'Insert Table',
      detail: 'Insert a GitHub-flavored Markdown table',
      keywords: 'format markdown gfm grid',
      disabled: !hasDocument,
      run: () => runFormattingCommand('table')
    },
    {
      type: 'Command',
      label: 'Open Folder Map',
      detail: 'Open the full note map for this folder',
      keywords: 'map graph backlinks network',
      disabled: !hasVault,
      run: openFullGraph
    },
    {
      type: 'Command',
      label: 'Open 3D Map',
      detail: 'Open the folder map with rotate, zoom, pan, and 3D export controls',
      keywords: 'map graph 3d orbit rotate scene',
      disabled: !hasVault,
      run: async () => {
        openFullGraph({ space: FULL_GRAPH_SPACE_MODE_3D });
        await waitForNextFrame();
      }
    },
    {
      type: 'Command',
      label: 'Show All Notes Map',
      detail: 'Show every note in the folder map',
      keywords: 'map graph global all vault scope',
      disabled: !hasVault,
      run: async () => {
        openFullGraph({ mode: 'global' });
        await waitForNextFrame();
      }
    },
    {
      type: 'Command',
      label: 'Fit Map To View',
      detail: 'Fit the visible map into the canvas',
      keywords: 'map graph fit zoom viewport',
      disabled: !hasVault,
      run: async () => {
        openFullGraph();
        await waitForNextFrame();
        fitFullGraphToView();
      }
    },
    {
      type: 'Command',
      label: 'Reset Map View',
      detail: 'Reset map pan, zoom, and viewport position',
      keywords: 'map graph reset zoom pan',
      disabled: !hasVault,
      run: async () => {
        openFullGraph();
        await waitForNextFrame();
        resetFullGraphViewport();
      }
    },
    {
      type: 'Command',
      label: 'Auto Rotate 3D Map',
      detail: 'Start or stop automatic 3D map rotation',
      keywords: 'map graph 3d rotate orbit animation',
      disabled: !hasVault,
      run: async () => {
        openFullGraph({ space: FULL_GRAPH_SPACE_MODE_3D });
        await waitForNextFrame();
        toggleFullGraphAutoRotate();
      }
    },
    {
      type: 'Command',
      label: 'Reset 3D Map Rotation',
      detail: 'Restore the default 3D map angle',
      keywords: 'map graph 3d rotate reset camera',
      disabled: !hasVault,
      run: async () => {
        openFullGraph({ space: FULL_GRAPH_SPACE_MODE_3D });
        await waitForNextFrame();
        resetFullGraphRotation();
      }
    },
    {
      type: 'Command',
      label: 'Save 3D Map File',
      detail: 'Save a compact 3D map file for AI or presentation workflows',
      keywords: 'map graph export 3d scene json claude context',
      disabled: !hasVault,
      run: async () => exportFullGraphWithProfile('scene', exportFullGraphJson)
    },
    {
      type: 'Command',
      label: 'Save Claude / ChatGPT Notes',
      detail: 'Save map context as AI-ready Markdown',
      keywords: 'map graph export llm claude chatgpt context',
      disabled: !hasVault,
      run: async () => exportFullGraphWithProfile('llm', exportFullGraphContext)
    },
    {
      type: 'Command',
      label: 'Save Map JSON',
      detail: 'Save the current map range, filters, notes, links, and missing links',
      keywords: 'map graph export json filters depth',
      disabled: !hasVault,
      run: async () => {
        openFullGraph();
        await waitForNextFrame();
        await exportFullGraphJson();
      }
    },
    {
      type: 'Command',
      label: 'Save Map SVG',
      detail: 'Save the visible map drawing as SVG',
      keywords: 'map graph export svg image',
      disabled: !hasVault,
      run: async () => {
        openFullGraph();
        await waitForNextFrame();
        await exportFullGraphSvg();
      }
    },
    {
      type: 'Command',
      label: 'Open Note Map',
      detail: 'Map the active note as headings, links, tasks, tags, and links back to it',
      keywords: 'mind map canvas outline headings claude context',
      disabled: !hasDocument,
      run: openMindMapCanvas
    },
    {
      type: 'Command',
      label: 'New Note In Folder',
      detail: 'Create a Markdown note inside the open folder',
      keywords: 'new note vault file create',
      disabled: !hasVault,
      run: createVaultFileFromPrompt
    },
    {
      type: 'Command',
      label: 'Rename Current Note',
      detail: 'Rename or move the active note inside the open folder',
      keywords: 'rename move vault file',
      disabled: !hasPath || !isDocumentInActiveVault(activeDocument),
      run: renameActiveVaultFileFromPrompt
    },
    {
      type: 'Command',
      label: 'Move Current Note To Trash',
      detail: 'Move the active note to the OS Trash',
      keywords: 'delete remove trash vault file',
      disabled: !hasPath || !isDocumentInActiveVault(activeDocument),
      run: deleteActiveVaultFileWithConfirmation
    },
    {
      type: 'Command',
      label: 'Copy Folder Map For AI',
      detail: 'Copy local Claude/ChatGPT context from the open folder',
      keywords: 'ai claude context backlinks graph',
      disabled: !hasVault,
      run: copyAiContextMap
    },
    {
      type: 'Command',
      label: 'Save Folder Map Note',
      detail: 'Create a Markdown note with folder map context',
      keywords: 'ai claude context new note',
      disabled: !hasVault,
      run: createAiContextMapDocument
    },
    {
      type: 'Command',
      label: 'Copy Note Map For Claude',
      detail: 'Copy the active note map as local Claude-ready context',
      keywords: 'mind map claude context copy outline links backlinks',
      disabled: !hasDocument,
      run: copyMindMapContext
    },
    {
      type: 'Command',
      label: 'Save Note Map Note',
      detail: 'Create a Markdown note from the active note map',
      keywords: 'mind map claude context new note outline links backlinks',
      disabled: !hasDocument,
      run: createMindMapContextDocument
    },
    {
      type: 'Command',
      label: 'Insert Diagram',
      detail: 'Generate a Mermaid map from headings',
      keywords: 'mind map mermaid headings',
      disabled: !hasDocument,
      run: insertMindMapFromHeadings
    },
    {
      type: 'Command',
      label: 'Copy Note',
      detail: 'Copy active Markdown source',
      keywords: 'copy markdown source',
      disabled: !hasDocument,
      run: copyActiveMarkdown
    },
    {
      type: 'Command',
      label: 'Save HTML',
      detail: 'Save rendered Markdown as HTML',
      keywords: 'export html',
      disabled: !hasDocument,
      run: exportActiveHtml
    },
    {
      type: 'Command',
      label: 'Save PDF',
      detail: 'Save rendered Markdown as PDF',
      keywords: 'export pdf print',
      disabled: !hasDocument,
      run: exportActivePdf
    },
    {
      type: 'Command',
      label: 'Create Website',
      detail: 'Export the open folder as a local website',
      keywords: 'publish static site html vault backlinks graph search',
      disabled: !hasVault,
      run: publishStaticSite
    },
    {
      type: 'Command',
      label: 'Reveal File',
      detail: 'Show the active file in Finder',
      keywords: 'finder reveal file',
      disabled: !hasPath,
      run: revealActiveFile
    },
    {
      type: 'Command',
      label: 'Toggle Theme',
      detail: 'Switch light and dark mode',
      keywords: 'theme dark light',
      run: toggleTheme
    }
  ];

  items.push(...getRecentCommandPaletteItems());

  for (const doc of getCommandPaletteDocuments(vaultDocs)) {
    items.push({
      type: 'Note',
      label: stripMarkdownExtension(doc.title),
      detail: getDisplayPath(doc),
      keywords: `${doc.title} ${getDisplayPath(doc)} ${extractMarkdownTags(doc.content).join(' ')}`,
      run: () => activateDocument(doc.id)
    });
  }

  return items;
}

function getCommandPaletteDocuments(vaultDocs) {
  const byId = new Map();
  for (const doc of documents) {
    byId.set(doc.id, doc);
  }
  for (const doc of vaultDocs) {
    byId.set(doc.id, doc);
  }
  return [...byId.values()].sort((left, right) => getDisplayPath(left).localeCompare(getDisplayPath(right)));
}

function getRecentCommandPaletteItems() {
  const openPaths = new Set(documents.map((doc) => doc.path).filter(Boolean));
  const recentFiles = recentItems.files
    .filter((item) => item.id && item.path && !openPaths.has(item.path))
    .slice(0, MAX_RECENT_COMMAND_ITEMS)
    .map((item) => ({
      type: 'Recent File',
      label: item.name,
      detail: item.path,
      keywords: `recent file open ${item.name} ${item.path}`,
      run: () => openRecentFile(item.id)
    }));

  const activeVaultPath = activeVault?.path || '';
  const recentVaults = recentItems.vaults
    .filter((item) => item.id && item.path && item.path !== activeVaultPath)
    .slice(0, MAX_RECENT_COMMAND_ITEMS)
    .map((item) => ({
      type: 'Recent Folder',
      label: item.name,
      detail: item.path,
      keywords: `recent vault workspace folder ${item.name} ${item.path}`,
      run: () => openRecentVault(item.id)
    }));

  return [...recentVaults, ...recentFiles];
}

function getFilteredCommandPaletteItems() {
  const query = commandSearchInput.value.trim().toLowerCase();
  const items = getCommandPaletteItems();
  if (!query) return items;
  const terms = query.split(/\s+/).filter(Boolean);
  return items.filter((item) => terms.every((term) => commandPaletteItemText(item).includes(term)));
}

function commandPaletteItemText(item) {
  return `${item.type} ${item.label} ${item.detail} ${item.keywords || ''}`.toLowerCase();
}

function renderCommandPaletteResults() {
  if (commandPalette.hidden) return;

  const items = getFilteredCommandPaletteItems();
  if (commandPaletteSelection >= items.length) {
    commandPaletteSelection = Math.max(0, items.length - 1);
  }

  commandResults.innerHTML = items.length
    ? items
        .map((item, index) => {
          const selected = index === commandPaletteSelection;
          const disabled = Boolean(item.disabled);
          const typeLabel = getCommandTypeLabel(item.type);
          return `<button class="command-item${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}" type="button" role="option" aria-selected="${selected}" aria-disabled="${disabled}" data-command-index="${index}" data-command-type="${escapeAttribute(typeLabel)}">
            <span>
              <strong>${escapeHtml(item.label)}</strong>
              <small>${escapeHtml(item.detail)}</small>
            </span>
            <em>${escapeHtml(typeLabel)}</em>
          </button>`;
        })
        .join('')
    : '<p class="command-empty">No matching command or note.</p>';

  commandResults.querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
}

function getCommandTypeLabel(type) {
  if (type === 'Command') return 'Action';
  if (type === 'Recent File' || type === 'Recent Folder') return 'Recent';
  return type || 'Item';
}

async function runCommandPaletteSelection(index) {
  const items = getFilteredCommandPaletteItems();
  const item = items[index];
  if (!item || item.disabled) return;

  closeCommandPalette();
  await item.run();
}

function openFullGraph(options = {}) {
  const vaultDocs = getVaultDocuments();
  if (!vaultDocs.length) {
    showToast('Open a folder before opening the map.');
    return;
  }

  if (typeof options.targetPath === 'string') {
    const candidatePath = String(options.targetPath).trim();
    fullGraphPreviewPath = candidatePath ? options.targetPath : null;
  } else if (options.targetPath === null) {
    fullGraphPreviewPath = null;
  }

  if (typeof options.query === 'string') {
    fullGraphSearchInput.value = options.query;
  }

  fullGraphModal.hidden = false;
  fullGraphMode = options.mode && VALID_GRAPH_MODES.has(options.mode) ? options.mode : fullGraphMode;
  fullGraphSpaceMode =
    options.space && VALID_GRAPH_SPACE_MODES.has(options.space) ? options.space : VALID_GRAPH_SPACE_MODES.has(fullGraphSpaceMode) ? fullGraphSpaceMode : FULL_GRAPH_SPACE_MODE_2D;
  fullGraphLocalDepth = Number.isFinite(options.depth) ? clampFullGraphDepth(options.depth) : fullGraphLocalDepth;
  fullGraphMode = VALID_GRAPH_MODES.has(fullGraphMode) ? fullGraphMode : graphMode;
  fullGraphSpaceMode = VALID_GRAPH_SPACE_MODES.has(fullGraphSpaceMode) ? fullGraphSpaceMode : FULL_GRAPH_SPACE_MODE_2D;
  renderFullGraph();
  if (fullGraphAutoRotate) {
    startFullGraphAutoRotate();
  }
  requestAnimationFrame(() => {
    fullGraphSearchInput.focus();
    if (fullGraphPreviewPath) {
      previewFullGraphNode(fullGraphPreviewPath);
      focusFullGraphSvgNode(fullGraphPreviewPath);
    }
  });
}

function closeFullGraph() {
  hideFullGraphPreviewPopover();
  fullGraphModal.hidden = true;
  stopFullGraphAutoRotate();
  openFullGraphButton.focus();
}

function setFullGraphMode(nextMode) {
  fullGraphMode = VALID_GRAPH_MODES.has(nextMode) ? nextMode : 'local';
  renderFullGraphModeControls();
  renderFullGraph();
  schedulePersist();
}

function setFullGraphSpaceMode(nextMode) {
  fullGraphSpaceMode = VALID_GRAPH_SPACE_MODES.has(nextMode) ? nextMode : FULL_GRAPH_SPACE_MODE_2D;
  if (fullGraphSpaceMode === FULL_GRAPH_SPACE_MODE_2D) {
    stopFullGraphAutoRotate();
  }
  renderFullGraphModeControls();
  renderFullGraph();
  schedulePersist();
}

function renderFullGraphModeControls() {
  fullGraphModeButtons.forEach((button) => {
    const active = button.dataset.fullGraphMode === fullGraphMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  fullGraphSpaceModeButtons.forEach((button) => {
    const active = button.dataset.fullGraphSpace === fullGraphSpaceMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  fullGraphSpaceModeButtons.forEach((button) => {
    button.disabled = false;
    button.setAttribute('aria-label', `${button.textContent.trim()} map space`);
  });
  fullGraphDepthInput.value = String(fullGraphLocalDepth);
  fullGraphDepthValue.value = String(fullGraphLocalDepth);
  fullGraphDepthValue.textContent = String(fullGraphLocalDepth);
  const localDepthDisabled = fullGraphMode !== 'local';
  fullGraphDepthInput.disabled = localDepthDisabled;
  fullGraphDepthInput.closest('.graph-depth-filter')?.classList.toggle('disabled', localDepthDisabled);
  const space3dEnabled = fullGraphSpaceMode === FULL_GRAPH_SPACE_MODE_3D;
  const rotationDisabledReason = 'Switch the map to 3D to use rotation controls.';
  setDisabled(fullGraphRotateLeftButton, !space3dEnabled, rotationDisabledReason);
  setDisabled(fullGraphRotateRightButton, !space3dEnabled, rotationDisabledReason);
  setDisabled(fullGraphRotateUpButton, !space3dEnabled, rotationDisabledReason);
  setDisabled(fullGraphRotateDownButton, !space3dEnabled, rotationDisabledReason);
  setDisabled(fullGraphRotationResetButton, !space3dEnabled, rotationDisabledReason);
  setDisabled(fullGraphAutoRotateButton, !space3dEnabled, rotationDisabledReason);
  fullGraphAutoRotateButton.setAttribute('aria-pressed', String(fullGraphAutoRotate && space3dEnabled));
  fullGraphAutoRotateButton.textContent = `${fullGraphAutoRotate && space3dEnabled ? 'Stop Rotate' : 'Auto Rotate'}`;
  if (fullGraphRotationReadout) {
    fullGraphRotationReadout.textContent = `${Math.round(fullGraphRotation.x)}° / ${Math.round(fullGraphRotation.y)}°`;
  }
  renderFullGraphPresetOptions();
  updateFullGraphZoomReadout();
  updateFullGraphExportButtons();
}

function renderFullGraph() {
  if (fullGraphModal.hidden) return;

  hideFullGraphPreviewPopover();
  renderFullGraphModeControls();
  const vaultDocs = getVaultDocuments();
  const activeDocument = getActiveDocument();

  if (!vaultDocs.length) {
    fullGraphTitle.textContent = 'Map';
    fullGraphSummary.textContent = 'Open a folder to map notes.';
    fullGraphCanvas.innerHTML = '<div class="graph-empty">Open a folder to build a full note map.</div>';
    renderFullGraphMinimap(null, activeDocument, '');
    fullGraphList.innerHTML = '';
    fullGraphDetail.innerHTML = '<p>Open a folder to inspect note context.</p>';
    fullGraphFolderFilter.innerHTML = '<option value="all">All folders</option>';
    fullGraphExtensionFilter.innerHTML = '<option value="all">All types</option>';
    lastFullGraphDetailState = null;
    setDisabled(copyAiMapGraphButton, true);
    setDisabled(newAiMapGraphButton, true);
    setDisabled(exportGraphJsonButton, true);
    setDisabled(exportGraphSvgButton, true);
    setDisabled(exportGraphContextButton, true);
    setDisabled(fullGraphFitButton, true);
    return;
  }

  setDisabled(copyAiMapGraphButton, false);
  setDisabled(newAiMapGraphButton, false);

  const query = fullGraphSearchInput.value.trim().toLowerCase();
  const graph = buildVaultGraph(vaultDocs);
  const localDepth = getFullGraphDepth();
  const baseVisibleGraph = getVisibleGraph(graph, activeDocument, fullGraphMode, localDepth);
  renderFullGraphFolderOptions(baseVisibleGraph);
  renderFullGraphExtensionOptions(baseVisibleGraph);
  const filters = getFullGraphFilters();
  const visibleGraph = applyFullGraphFilters(baseVisibleGraph, filters, graph, activeDocument);
  const preferredPaths = query
    ? visibleGraph.nodes.filter((node) => graphNodeSearchText(node).includes(query)).map((node) => node.path)
    : [];
  const renderGraph = limitGraphForRender(visibleGraph, activeDocument?.path, FULL_GRAPH_RENDER_NODE_LIMIT, preferredPaths);
  const visibleCount =
    renderGraph.nodes.length === visibleGraph.nodes.length ? `${visibleGraph.nodes.length}` : `${renderGraph.nodes.length}/${visibleGraph.nodes.length}`;
  const filteredSuffix = hasFullGraphFilters(filters)
    ? ` · filtered from ${baseVisibleGraph.nodes.length} note${baseVisibleGraph.nodes.length === 1 ? '' : 's'}`
    : '';
  const depthSuffix = fullGraphMode === 'local' ? ` · ${localDepth} step${localDepth === 1 ? '' : 's'}` : '';
  const filteredUnresolvedCount = graph.unresolvedLinks.filter((link) => visibleGraph.nodeByPath.has(link.source)).length;
  const previewNode =
    renderGraph.nodeByPath.get(fullGraphPreviewPath) ||
    visibleGraph.nodeByPath.get(activeDocument?.path) ||
    renderGraph.nodes[0] ||
    visibleGraph.nodes[0] ||
    null;
  fullGraphPreviewPath = previewNode?.path || null;

  const scopeLabel = fullGraphMode === 'global' ? 'all notes' : 'near this note';
  fullGraphTitle.textContent = activeVault?.name || 'Map';
  fullGraphSummary.textContent = `${visibleCount} ${scopeLabel}${depthSuffix} · ${visibleGraph.edges.length} links · ${filteredUnresolvedCount} missing${filteredSuffix}${
    renderGraph.limited ? ' · capped for smooth rendering' : ''
  }`;

  if (!renderGraph.nodes.length) {
    fullGraphCanvas.innerHTML = '<div class="graph-empty">No notes match this map view, search, and filters.</div>';
  } else {
    fullGraphCanvas.innerHTML = renderGraphSvg(renderGraph, activeDocument, {
      width: FULL_GRAPH_VIEWBOX.width,
      height: FULL_GRAPH_VIEWBOX.height,
      layout: 'force',
      showLabels: renderGraph.nodes.length <= 95,
      searchQuery: query,
      previewPath: fullGraphPreviewPath,
      rovingFocus: true,
      viewportTransform: getFullGraphTransform(),
      spaceMode: fullGraphSpaceMode,
      rotation: fullGraphRotation,
      perspective: FULL_GRAPH_PERSPECTIVE
    });
  }
  setDisabled(exportGraphJsonButton, !visibleGraph.nodes.length);
  setDisabled(exportGraphSvgButton, !renderGraph.nodes.length);
  setDisabled(exportGraphContextButton, !visibleGraph.nodes.length);
  setDisabled(fullGraphFitButton, !renderGraph.nodes.length);

  lastFullGraphDetailState = {
    graph,
    baseVisibleGraph,
    visibleGraph,
    renderGraph,
    activeDocument,
    filters,
    localDepth
  };
  renderFullGraphDetail(previewNode);
  renderFullGraphList(renderGraph, activeDocument, query);
  renderFullGraphMinimap(renderGraph.nodes.length ? renderGraph : null, activeDocument, query);
}

function renderFullGraphList(graph, activeDocument, query) {
  const normalizedQuery = query.trim().toLowerCase();
  const nodes = [...graph.nodes]
    .filter((node) => !normalizedQuery || graphNodeSearchText(node).includes(normalizedQuery))
    .sort((left, right) => {
      if (left.path === activeDocument?.path) return -1;
      if (right.path === activeDocument?.path) return 1;
      return getNodeDegree(right) - getNodeDegree(left) || left.label.localeCompare(right.label);
    })
    .slice(0, 160);

  fullGraphList.innerHTML = nodes.length
    ? nodes
        .map((node) => {
          const active = node.path === activeDocument?.path;
          const previewed = node.path === fullGraphPreviewPath;
          return `<button class="full-graph-node${active ? ' active' : ''}${previewed ? ' previewed' : ''}" type="button" role="option" aria-selected="${
            active || previewed
          }" data-full-graph-node-path="${escapeAttribute(node.path)}">
            <span>${escapeHtml(stripMarkdownExtension(node.label))}</span>
            <small>${node.incoming} in / ${node.outgoing} out</small>
          </button>`;
        })
        .join('')
    : '<p class="sidebar-empty">No matching notes.</p>';
}

function renderFullGraphMinimap(graph, activeDocument, query) {
  if (!fullGraphMinimap) return;
  if (!graph?.nodes?.length) {
    fullGraphMinimap.innerHTML = '';
    fullGraphMinimap.hidden = true;
    return;
  }

  fullGraphMinimap.hidden = false;
  const layout = layoutForceGraphNodes(graph.nodes, graph.edges, FULL_GRAPH_VIEWBOX.width, FULL_GRAPH_VIEWBOX.height, activeDocument?.path);
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const edgeMarkup = graph.edges
    .map((edge) => {
      const source = layout.get(edge.source);
      const target = layout.get(edge.target);
      if (!source || !target) return '';
      return `<line class="graph-minimap-edge" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" />`;
    })
    .join('');
  const nodeMarkup = graph.nodes
    .map((node) => {
      const point = layout.get(node.path);
      if (!point) return '';
      const active = node.path === activeDocument?.path;
      const matched = normalizedQuery && graphNodeSearchText(node).includes(normalizedQuery);
      const classes = ['graph-minimap-node', active ? 'active' : '', matched ? 'matched' : '', node.hasMedia ? 'media' : '', node.hasCanvas ? 'canvas' : '']
        .filter(Boolean)
        .join(' ');
      const radius = Math.min(12, 3.8 + Math.sqrt(Math.max(1, getNodeDegree(node))) * 1.8);
      return `<circle class="${classes}" cx="${point.x}" cy="${point.y}" r="${roundGraphNumber(radius)}">
        <title>${escapeHtml(stripMarkdownExtension(node.label))}</title>
      </circle>`;
    })
    .join('');

  fullGraphMinimap.innerHTML = `<svg viewBox="0 0 ${FULL_GRAPH_VIEWBOX.width} ${FULL_GRAPH_VIEWBOX.height}" aria-hidden="true">
    ${edgeMarkup}
    ${nodeMarkup}
    <rect class="graph-minimap-viewport" x="0" y="0" width="${FULL_GRAPH_VIEWBOX.width}" height="${FULL_GRAPH_VIEWBOX.height}" rx="18"></rect>
  </svg>`;
  updateFullGraphMinimapViewport();
}

function renderFullGraphFolderOptions(graph) {
  const folders = new Map([['all', 'All folders']]);
  for (const node of graph.nodes) {
    const key = getGraphFolderKey(node);
    if (!folders.has(key)) folders.set(key, getGraphFolderLabel(key));
  }

  const currentValue = folders.has(fullGraphFolderFilter.value) ? fullGraphFolderFilter.value : 'all';
  fullGraphFolderFilter.innerHTML = [...folders.entries()]
    .sort((left, right) => {
      if (left[0] === 'all') return -1;
      if (right[0] === 'all') return 1;
      return left[1].localeCompare(right[1]);
    })
    .map(([value, label]) => `<option value="${escapeAttribute(value)}">${escapeHtml(label)}</option>`)
    .join('');
  fullGraphFolderFilter.value = currentValue;
}

function renderFullGraphExtensionOptions(graph) {
  const extensions = new Map([['all', 'All types']]);
  for (const node of graph.nodes) {
    const extension = getGraphNodeExtension(node);
    if (!extensions.has(extension)) extensions.set(extension, getGraphExtensionLabel(extension));
  }

  const currentValue = extensions.has(fullGraphExtensionFilter.value) ? fullGraphExtensionFilter.value : 'all';
  fullGraphExtensionFilter.innerHTML = [...extensions.entries()]
    .sort((left, right) => {
      if (left[0] === 'all') return -1;
      if (right[0] === 'all') return 1;
      return left[1].localeCompare(right[1]);
    })
    .map(([value, label]) => `<option value="${escapeAttribute(value)}">${escapeHtml(label)}</option>`)
    .join('');
  fullGraphExtensionFilter.value = currentValue;
}

function renderFullGraphPresetOptions(selectedId = fullGraphPresetSelect.value) {
  const options = ['<option value="">Saved views</option>']
    .concat(
      fullGraphPresets
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((preset) => `<option value="${escapeAttribute(preset.id)}">${escapeHtml(preset.name)}</option>`)
    )
    .join('');
  if (fullGraphPresetSelect.innerHTML !== options) {
    fullGraphPresetSelect.innerHTML = options;
  }
  fullGraphPresetSelect.value = fullGraphPresets.some((preset) => preset.id === selectedId) ? selectedId : '';
  setDisabled(fullGraphDeletePresetButton, !fullGraphPresetSelect.value);
}

function saveCurrentFullGraphPreset() {
  const name = window.prompt('Map view name', createDefaultGraphPresetName());
  const cleanName = String(name || '').trim().slice(0, 60);
  if (!cleanName) return;

  const existing = fullGraphPresets.find((preset) => preset.name.toLowerCase() === cleanName.toLowerCase());
  const preset = {
    id: existing?.id || crypto.randomUUID(),
    name: cleanName,
    mode: fullGraphMode,
    depth: getFullGraphDepth(),
    filters: normalizeGraphPresetFilters(getFullGraphFilters())
  };
  fullGraphPresets = existing
    ? fullGraphPresets.map((item) => (item.id === existing.id ? preset : item))
    : [...fullGraphPresets, preset].slice(-24);
  writeGraphPresets();
  renderFullGraphPresetOptions(preset.id);
  showToast(`Map view saved: ${cleanName}`);
}

function createDefaultGraphPresetName() {
  const filters = getFullGraphFilters();
  const labels = [];
  if (filters.folder !== 'all') labels.push(getGraphFolderLabel(filters.folder));
  if (filters.extension !== 'all') labels.push(getGraphExtensionLabel(filters.extension));
  if (filters.tagged) labels.push('Tagged');
  if (filters.orphans) labels.push('No Links');
  if (filters.unresolved) labels.push('Missing Links');
  if (filters.backlinks) labels.push('Links Here');
  if (filters.outgoing) labels.push('Links Out');
  if (filters.media) labels.push('Media');
  if (filters.canvas) labels.push('Canvas');
  if (!labels.length) labels.push(fullGraphMode === 'local' ? `This Note + ${getFullGraphDepth()} Step` : 'All Notes');
  return labels.join(' + ');
}

function applyFullGraphPreset(presetId) {
  const preset = fullGraphPresets.find((item) => item.id === presetId);
  if (!preset) {
    setDisabled(fullGraphDeletePresetButton, true);
    return;
  }

  fullGraphMode = VALID_GRAPH_MODES.has(preset.mode) ? preset.mode : 'local';
  fullGraphLocalDepth = clampFullGraphDepth(preset.depth);
  applyFullGraphFilterState(preset.filters);
  fullGraphPreviewPath = null;
  renderFullGraphPresetOptions(preset.id);
  renderFullGraph();
  schedulePersist();
  showToast(`Map view applied: ${preset.name}`);
}

function deleteSelectedFullGraphPreset() {
  const presetId = fullGraphPresetSelect.value;
  const preset = fullGraphPresets.find((item) => item.id === presetId);
  if (!preset) return;
  fullGraphPresets = fullGraphPresets.filter((item) => item.id !== presetId);
  writeGraphPresets();
  renderFullGraphPresetOptions('');
  showToast(`Map view deleted: ${preset.name}`);
}

function applyFullGraphFilterState(filters = {}) {
  const normalized = normalizeGraphPresetFilters(filters);
  if (normalized.folder !== 'all' && ![...fullGraphFolderFilter.options].some((option) => option.value === normalized.folder)) {
    fullGraphFolderFilter.append(new Option(getGraphFolderLabel(normalized.folder), normalized.folder));
  }
  if (normalized.extension !== 'all' && ![...fullGraphExtensionFilter.options].some((option) => option.value === normalized.extension)) {
    fullGraphExtensionFilter.append(new Option(getGraphExtensionLabel(normalized.extension), normalized.extension));
  }
  fullGraphFolderFilter.value = normalized.folder;
  fullGraphExtensionFilter.value = normalized.extension;
  fullGraphTaggedFilter.checked = normalized.tagged;
  fullGraphOrphansFilter.checked = normalized.orphans;
  fullGraphUnresolvedFilter.checked = normalized.unresolved;
  fullGraphBacklinksFilter.checked = normalized.backlinks;
  fullGraphOutgoingFilter.checked = normalized.outgoing;
  fullGraphMediaFilter.checked = normalized.media;
  fullGraphCanvasFilter.checked = normalized.canvas;
}

function getFullGraphDepth() {
  return clampFullGraphDepth(fullGraphLocalDepth || fullGraphDepthInput.value);
}

function getFullGraphFilters() {
  return {
    folder: fullGraphFolderFilter.value || 'all',
    extension: normalizeGraphExtensionFilter(fullGraphExtensionFilter.value || 'all'),
    tagged: fullGraphTaggedFilter.checked,
    orphans: fullGraphOrphansFilter.checked,
    unresolved: fullGraphUnresolvedFilter.checked,
    backlinks: fullGraphBacklinksFilter.checked,
    outgoing: fullGraphOutgoingFilter.checked,
    media: fullGraphMediaFilter.checked,
    canvas: fullGraphCanvasFilter.checked
  };
}

function hasFullGraphFilters(filters) {
  return Boolean(
    filters.folder !== 'all' ||
      filters.extension !== 'all' ||
      filters.tagged ||
      filters.orphans ||
      filters.unresolved ||
      filters.backlinks ||
      filters.outgoing ||
      filters.media ||
      filters.canvas
  );
}

function applyFullGraphFilters(graph, filters, fullGraph, activeDocument) {
  const nodes = graph.nodes.filter((node) => {
    if (filters.folder !== 'all' && getGraphFolderKey(node) !== filters.folder) return false;
    if (filters.extension !== 'all' && getGraphNodeExtension(node) !== filters.extension) return false;
    if (filters.tagged && !extractMarkdownTags(node.doc?.content || '').length) return false;
    if (filters.orphans && getNodeDegree(node) !== 0) return false;
    if (filters.unresolved && !fullGraph.unresolvedLinks.some((link) => link.source === node.path)) return false;
    if (filters.backlinks && !isBacklinkNode(node, fullGraph, activeDocument)) return false;
    if (filters.outgoing && !isOutgoingNode(node, fullGraph, activeDocument)) return false;
    if (filters.media && !node.hasMedia) return false;
    if (filters.canvas && !node.hasCanvas) return false;
    return true;
  });
  const visiblePaths = new Set(nodes.map((node) => node.path));
  const edges = graph.edges.filter((edge) => visiblePaths.has(edge.source) && visiblePaths.has(edge.target));

  return {
    nodes,
    edges,
    nodeByPath: new Map(nodes.map((node) => [node.path, node]))
  };
}

function isBacklinkNode(node, graph, activeDocument) {
  if (!activeDocument?.path) return false;
  return graph.edges.some((edge) => edge.source === node.path && edge.target === activeDocument.path);
}

function isOutgoingNode(node, graph, activeDocument) {
  if (!activeDocument?.path) return false;
  return graph.edges.some((edge) => edge.source === activeDocument.path && edge.target === node.path);
}

function getGraphFolderKey(node) {
  const displayPath = getDisplayPath(node.doc || node);
  const parts = displayPath.split(/[\\/]/).filter(Boolean);
  return parts.length > 1 ? parts[0].toLowerCase() : '__root__';
}

function getGraphFolderLabel(key) {
  if (key === '__root__') return 'Root';
  return key.replace(/(^|[-_\s])(\w)/g, (_match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

function getGraphNodeExtension(node) {
  return normalizeGraphExtensionFilter(getDocumentExtension(node?.doc || node));
}

function getDocumentExtension(doc) {
  const candidate = getDisplayPath(doc || {}).split(/[\\/]/).pop() || doc?.title || '';
  const match = String(candidate).match(/\.([A-Za-z0-9_-]+)$/);
  return match ? match[1].toLowerCase() : 'md';
}

function getGraphExtensionLabel(extension) {
  if (extension === 'all') return 'All types';
  return `.${extension}`;
}

function documentHasMediaReferences(markdown) {
  const content = String(markdown || '');
  if (/<(?:img|audio|video|source|picture|iframe)\b/i.test(content)) return true;
  if (/!\[[^\]]*]\(([^)]+)\)/.test(content)) return true;
  if (/!\[\[[^\]]+]]/.test(content)) return true;

  for (const link of extractMarkdownLinks(content)) {
    if (MEDIA_LINK_EXTENSION_PATTERN.test(link.target)) return true;
  }

  return false;
}

function documentHasCanvasReferences(markdown, displayPath = '') {
  const content = String(markdown || '');
  return /\.canvas$/i.test(String(displayPath || '')) || CANVAS_LINK_PATTERN.test(content) || /\[\[[^\]]+\.canvas(?:#[^\]|]+)?(?:\|[^\]]+)?]]/i.test(content);
}

function previewFullGraphNode(nodePath, anchorElement = null) {
  const node = lastFullGraphDetailState?.visibleGraph?.nodeByPath.get(nodePath);
  if (!node) return;
  cancelFullGraphPreviewHide();
  fullGraphPreviewPath = node.path;
  renderFullGraphDetail(node);
  updateFullGraphPreviewHighlight(node.path);
  if (anchorElement) {
    showFullGraphPreviewPopover(node, anchorElement);
  } else if (fullGraphPreviewPopover && !fullGraphPreviewPopover.hidden) {
    const graphNode = getFullGraphSvgNodeElement(node.path);
    if (graphNode) showFullGraphPreviewPopover(node, graphNode);
  }
}

function showFullGraphPreviewPopover(node, anchorElement) {
  if (!fullGraphPreviewPopover || !anchorElement) return;
  cancelFullGraphPreviewHide();
  fullGraphPreviewPopover.innerHTML = renderFullGraphPreviewPopover(node);
  fullGraphPreviewPopover.hidden = false;
  fullGraphPreviewPopover.dataset.previewPath = node.path;
  positionFullGraphPreviewPopover(anchorElement);
}

function hideFullGraphPreviewPopover() {
  if (!fullGraphPreviewPopover) return;
  cancelFullGraphPreviewHide();
  fullGraphPreviewPopover.hidden = true;
  fullGraphPreviewPopover.removeAttribute('data-preview-path');
}

function scheduleFullGraphPreviewHide() {
  if (!fullGraphPreviewPopover || fullGraphPreviewPopover.hidden) return;
  cancelFullGraphPreviewHide();
  fullGraphPreviewHideTimer = window.setTimeout(() => {
    hideFullGraphPreviewPopover();
  }, 180);
}

function cancelFullGraphPreviewHide() {
  if (!fullGraphPreviewHideTimer) return;
  window.clearTimeout(fullGraphPreviewHideTimer);
  fullGraphPreviewHideTimer = null;
}

function positionFullGraphPreviewPopover(anchorElement) {
  if (!fullGraphPreviewPopover || fullGraphPreviewPopover.hidden || !anchorElement) return;
  const stageRect = fullGraphStage.getBoundingClientRect();
  const anchorRect = anchorElement.getBoundingClientRect();
  const desiredLeft = anchorRect.left - stageRect.left + anchorRect.width / 2 + 16;
  const desiredTop = anchorRect.top - stageRect.top + anchorRect.height / 2 - 18;

  fullGraphPreviewPopover.style.left = `${Math.round(desiredLeft)}px`;
  fullGraphPreviewPopover.style.top = `${Math.round(desiredTop)}px`;

  requestAnimationFrame(() => {
    if (fullGraphPreviewPopover.hidden) return;
    const popoverRect = fullGraphPreviewPopover.getBoundingClientRect();
    const margin = 12;
    const maxLeft = Math.max(margin, stageRect.width - popoverRect.width - margin);
    const maxTop = Math.max(margin, stageRect.height - popoverRect.height - margin);
    const left = Math.max(margin, Math.min(desiredLeft, maxLeft));
    const top = Math.max(margin, Math.min(desiredTop, maxTop));
    fullGraphPreviewPopover.style.left = `${Math.round(left)}px`;
    fullGraphPreviewPopover.style.top = `${Math.round(top)}px`;
  });
}

function renderFullGraphPreviewPopover(node) {
  const title = stripMarkdownExtension(node.label);
  const folder = getGraphFolderLabel(getGraphFolderKey(node));
  const extension = getGraphExtensionLabel(getGraphNodeExtension(node));
  const degree = `${node.incoming} in / ${node.outgoing} out`;
  const body = renderGraphPreviewSnippetHtml(node.doc);
  const anchors = renderSourceAnchorButtons(getGraphSourceAnchors(node.doc), node.path, 'graph-preview-source-actions');
  return `<article class="graph-preview-card">
    <header>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(folder)} · ${escapeHtml(extension)} · ${escapeHtml(degree)}</span>
    </header>
    <div class="graph-preview-body markdown-body">${body}</div>
    ${anchors}
  </article>`;
}

function renderGraphPreviewSnippetHtml(doc) {
  const markdown = getGraphPreviewMarkdownSnippet(doc);
  if (!markdown) return '<p>No readable preview text yet.</p>';
  const template = document.createElement('template');
  template.innerHTML = DOMPurify.sanitize(marked.parse(markdown), sanitizeOptions);
  template.content.querySelectorAll('img, video, audio, iframe, object, embed, svg, .mermaid-block').forEach((element) => element.remove());
  const blocks = [...template.content.children].filter((element) => element.textContent.trim()).slice(0, FULL_GRAPH_PREVIEW_BLOCK_LIMIT);
  template.content.replaceChildren(...blocks);
  return template.innerHTML || `<p>${escapeHtml(createPlainTextExcerpt(markdown, 220) || 'No readable preview text yet.')}</p>`;
}

function getGraphPreviewMarkdownSnippet(doc) {
  if (!doc) return '';
  if (getDocumentExtension(doc) === 'canvas') return getJsonCanvasPreviewMarkdownSnippet(doc.content);

  const lines = String(doc.content || '')
    .replace(/^---\s*[\s\S]*?\n---\s*/, '')
    .split(/\r?\n/);
  const output = [];
  let total = 0;
  let inFence = false;
  let omittedFence = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      if (!inFence || omittedFence) continue;
      output.push('> Code block omitted from graph preview.');
      total += output.at(-1).length;
      omittedFence = true;
      continue;
    }
    if (inFence) continue;

    const trimmed = line.trim();
    if (!trimmed && !output.length) continue;
    if (/^!\[[^\]]*]\([^)]+\)/.test(trimmed) || /^!\[\[[^\]]+]]/.test(trimmed)) continue;

    output.push(line);
    total += line.length + 1;
    if (total >= FULL_GRAPH_PREVIEW_MARKDOWN_LIMIT || output.length >= 22) break;
  }

  return output.join('\n').trim() || createPlainTextExcerpt(doc.content || '', 360);
}

function getJsonCanvasPreviewMarkdownSnippet(content) {
  const canvas = parseJsonCanvasDocument(content);
  if (!canvas) return createPlainTextExcerpt(content, 360);
  const cards = canvas.nodes.slice(0, 6).map((node) => {
    const label = node.label || node.file || createPlainTextExcerpt(node.text || node.url || node.id || 'Canvas card', 90);
    return `- ${label}`;
  });
  const edgeCount = canvas.edges.length;
  return [`## JSON Canvas`, `${canvas.nodes.length} cards · ${edgeCount} connections`, '', ...cards].join('\n').trim();
}

function getGraphSourceAnchors(doc, limit = 4) {
  if (!doc) return [];
  if (getDocumentExtension(doc) === 'canvas') {
    return [{ label: 'JSON Canvas source', detail: 'Line 1', line: 1 }];
  }

  const headings = extractMarkdownHeadings(doc.content || '')
    .slice(0, limit)
    .map((heading) => ({
      label: heading.text,
      detail: `H${heading.level} · line ${heading.line}`,
      line: heading.line
    }));
  if (headings.length) return headings;

  const firstReadableLine = findFirstReadableMarkdownLine(doc.content || '');
  return firstReadableLine ? [firstReadableLine] : [];
}

function findFirstReadableMarkdownLine(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  let inFence = false;
  let inFrontmatter = lines[0]?.trim() === '---';

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();
    if (inFrontmatter) {
      if (index > 0 && trimmed === '---') inFrontmatter = false;
      continue;
    }
    if (/^\s*```/.test(rawLine)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !trimmed) continue;
    if (/^!\[[^\]]*]\([^)]+\)/.test(trimmed) || /^!\[\[[^\]]+]]/.test(trimmed)) continue;

    const label = trimmed
      .replace(/^#{1,6}\s+/, '')
      .replace(/^[-*+]\s+(?:\[[ xX]\]\s*)?/, '')
      .replace(/^>\s?/, '');
    return {
      label: createPlainTextExcerpt(label || trimmed, 80),
      detail: `Line ${index + 1}`,
      line: index + 1
    };
  }

  return null;
}

function renderSourceAnchorButtons(anchors, filePath, className = 'source-anchor-actions') {
  if (!filePath || !anchors?.length) return '';
  return `<div class="source-anchor-actions ${escapeAttribute(className)}" aria-label="Source anchors">
    ${anchors
      .map(
        (anchor) => `<button class="source-anchor" type="button" data-source-path="${escapeAttribute(filePath)}" data-source-line="${Number(anchor.line) || 1}">
          <span>${escapeHtml(truncateMindMapLabel(anchor.label || 'Source', 34))}</span>
          <small>${escapeHtml(anchor.detail || `Line ${Number(anchor.line) || 1}`)}</small>
        </button>`
      )
      .join('')}
  </div>`;
}

function getFullGraphSvgNodeElement(nodePath) {
  return [...fullGraphCanvas.querySelectorAll('[data-graph-node-path]')].find((candidate) => candidate.dataset.graphNodePath === nodePath) || null;
}

function focusFullGraphNode(nodePath) {
  const node = lastFullGraphDetailState?.visibleGraph?.nodeByPath.get(nodePath) || lastFullGraphDetailState?.graph?.nodeByPath.get(nodePath);
  if (!node) return;

  activateDocumentByPath(node.path);
  fullGraphMode = 'local';
  fullGraphLocalDepth = Math.max(2, getFullGraphDepth());
  fullGraphPreviewPath = node.path;
  fullGraphSearchInput.value = '';
  resetFullGraphViewport();
  renderFullGraph();
  showToast(`Focused graph on ${stripMarkdownExtension(node.label)}.`);
}

function expandFullGraphNeighborhood(nodePath) {
  const node = lastFullGraphDetailState?.visibleGraph?.nodeByPath.get(nodePath) || lastFullGraphDetailState?.graph?.nodeByPath.get(nodePath);
  if (!node) return;

  const previousDepth = getFullGraphDepth();
  const nextDepth = Math.min(FULL_GRAPH_MAX_DEPTH, Math.max(previousDepth + 1, 2));
  activateDocumentByPath(node.path);
  fullGraphMode = 'local';
  fullGraphLocalDepth = nextDepth;
  fullGraphPreviewPath = node.path;
  fullGraphSearchInput.value = '';
  resetFullGraphViewport();
  renderFullGraph();
  focusFullGraphSvgNode(node.path);
  showToast(
    nextDepth > previousDepth
      ? `Expanded graph around ${stripMarkdownExtension(node.label)} to depth ${nextDepth}.`
      : `Graph around ${stripMarkdownExtension(node.label)} is already at maximum depth.`
  );
}

function handleFullGraphKeyboard(event) {
  const currentPath = event.target.closest('[data-graph-node-path]')?.dataset.graphNodePath || fullGraphPreviewPath;
  const plainKey = !event.metaKey && !event.ctrlKey && !event.altKey;

  if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    moveFullGraphRovingFocus(1);
    return;
  }

  if (['ArrowLeft', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    moveFullGraphRovingFocus(-1);
    return;
  }

  if (event.key === 'Home') {
    event.preventDefault();
    moveFullGraphRovingFocus('first');
    return;
  }

  if (event.key === 'End') {
    event.preventDefault();
    moveFullGraphRovingFocus('last');
    return;
  }

  if (['Enter', ' '].includes(event.key)) {
    if (!currentPath) return;
    event.preventDefault();
    activateDocumentByPath(currentPath);
    renderFullGraph();
    return;
  }

  if (!plainKey || !currentPath) return;
  const key = event.key.toLowerCase();
  if (key === 'f') {
    event.preventDefault();
    focusFullGraphNode(currentPath);
  } else if (key === 'e') {
    event.preventDefault();
    expandFullGraphNeighborhood(currentPath);
  }
}

function handleMindMapKeyboard(event, isCanvas = true) {
  const focusedNode =
    event.target.closest('[data-mind-map-node-id]')?.dataset?.mindMapNodeId ||
    event.target.closest('[data-mind-map-list-node-id]')?.dataset?.mindMapListNodeId ||
    mindMapPreviewNodeId;
  const plainKey = !event.metaKey && !event.ctrlKey && !event.altKey;

  if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    moveMindMapRovingFocus(1, isCanvas);
    return;
  }

  if (['ArrowLeft', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    moveMindMapRovingFocus(-1, isCanvas);
    return;
  }

  if (event.key === 'Home') {
    event.preventDefault();
    moveMindMapRovingFocus('first', isCanvas);
    return;
  }

  if (event.key === 'End') {
    event.preventDefault();
    moveMindMapRovingFocus('last', isCanvas);
    return;
  }

  if (['Enter', ' '].includes(event.key)) {
    if (!focusedNode) return;
    event.preventDefault();
    openMindMapNode(focusedNode);
    return;
  }

  if (!plainKey || !focusedNode) return;
  const key = event.key.toLowerCase();
  if (key === 'o') {
    event.preventDefault();
    openMindMapNode(focusedNode);
  }
}

function moveMindMapRovingFocus(direction, isCanvas = true) {
  const nodes = getMindMapKeyboardNodes();
  if (!nodes.length) return;

  const currentIndex = Math.max(
    0,
    nodes.findIndex((node) => node.id === (mindMapPreviewNodeId || (lastMindMapModel?.nodeById.get('root')?.id)))
  );
  let nextIndex = currentIndex;
  if (direction === 'first') {
    nextIndex = 0;
  } else if (direction === 'last') {
    nextIndex = nodes.length - 1;
  } else {
    nextIndex = (currentIndex + direction + nodes.length) % nodes.length;
  }

  const nextNode = nodes[nextIndex];
  if (!nextNode) return;

  previewMindMapNode(nextNode.id);
  if (isCanvas) {
    focusMindMapCanvasNode(nextNode.id);
  } else {
    focusMindMapListNode(nextNode.id);
  }
}

function getMindMapKeyboardNodes() {
  if (!lastMindMapModel?.nodes?.length) return [];
  return lastMindMapModel.nodes
    .slice()
    .sort((left, right) => left.depth - right.depth || left.order - right.order || left.label.localeCompare(right.label));
}

function moveFullGraphRovingFocus(direction) {
  const nodes = getFullGraphKeyboardNodes();
  if (!nodes.length) return;

  const currentIndex = Math.max(
    0,
    nodes.findIndex((node) => node.path === fullGraphPreviewPath)
  );
  let nextIndex = currentIndex;
  if (direction === 'first') {
    nextIndex = 0;
  } else if (direction === 'last') {
    nextIndex = nodes.length - 1;
  } else {
    nextIndex = (currentIndex + direction + nodes.length) % nodes.length;
  }

  const nextNode = nodes[nextIndex];
  if (!nextNode) return;
  previewFullGraphNode(nextNode.path);
  focusFullGraphSvgNode(nextNode.path);
}

function getFullGraphKeyboardNodes() {
  const nodes = lastFullGraphDetailState?.renderGraph?.nodes || [];
  const activePath = lastFullGraphDetailState?.activeDocument?.path;
  return [...nodes].sort((left, right) => {
    if (left.path === activePath) return -1;
    if (right.path === activePath) return 1;
    return getNodeDegree(right) - getNodeDegree(left) || left.label.localeCompare(right.label);
  });
}

function updateFullGraphPreviewHighlight(nodePath) {
  fullGraphCanvas.querySelectorAll('[data-graph-node-path]').forEach((element) => {
    const previewed = element.dataset.graphNodePath === nodePath;
    element.classList.toggle('previewed', previewed);
    element.setAttribute('tabindex', previewed ? '0' : '-1');
  });
  fullGraphList.querySelectorAll('[data-full-graph-node-path]').forEach((element) => {
    const previewed = element.dataset.fullGraphNodePath === nodePath;
    element.classList.toggle('previewed', previewed);
    if (previewed) element.setAttribute('aria-selected', 'true');
    else element.setAttribute('aria-selected', String(element.classList.contains('active')));
  });
}

function focusFullGraphSvgNode(nodePath) {
  requestAnimationFrame(() => {
    const element = [...fullGraphCanvas.querySelectorAll('[data-graph-node-path]')].find((candidate) => candidate.dataset.graphNodePath === nodePath);
    if (!element) return;
    element.setAttribute('tabindex', '0');
    try {
      element.focus({ preventScroll: true });
    } catch (_error) {
      element.focus();
    }
  });
}

function focusMindMapCanvasNode(nodeId) {
  requestAnimationFrame(() => {
    const element = [...mindMapCanvas.querySelectorAll('[data-mind-map-node-id]')].find(
      (candidate) => candidate.dataset.mindMapNodeId === nodeId
    );
    if (!element) return;
    element.setAttribute('tabindex', '0');
    try {
      element.focus({ preventScroll: true });
    } catch (_error) {
      element.focus();
    }
  });
}

function focusMindMapListNode(nodeId) {
  requestAnimationFrame(() => {
    const element = [...mindMapList.querySelectorAll('[data-mind-map-list-node-id]')].find(
      (candidate) => candidate.dataset.mindMapListNodeId === nodeId
    );
    if (!element) return;
    element.setAttribute('tabindex', '0');
    try {
      element.focus({ preventScroll: true });
    } catch (_error) {
      element.focus();
    }
  });
}

function renderFullGraphDetail(node) {
  if (!node || !lastFullGraphDetailState) {
    fullGraphDetail.innerHTML = '<p>Select or hover a graph node to inspect note context.</p>';
    return;
  }

  const { graph, activeDocument } = lastFullGraphDetailState;
  const tags = extractMarkdownTags(node.doc?.content || '').slice(0, 8);
  const unresolvedCount = graph.unresolvedLinks.filter((link) => link.source === node.path).length;
  const isActive = node.path === activeDocument?.path;
  const folder = getGraphFolderLabel(getGraphFolderKey(node));
  const extension = getGraphNodeExtension(node);
  const excerpt = createPlainTextExcerpt(node.doc?.content || '', 170);
  const tagsMarkup = tags.length
    ? `<div class="graph-detail-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>`
    : '';
  const flags = [`Type ${getGraphExtensionLabel(extension)}`];
  if (node.hasMedia) flags.push('Media');
  if (node.hasCanvas) flags.push('Canvas');
  if (node.canvasCards) flags.push(`${node.canvasCards} cards`);
  if (node.canvasEdges) flags.push(`${node.canvasEdges} canvas edges`);
  const sourceAnchors = renderSourceAnchorButtons(getGraphSourceAnchors(node.doc, 3), node.path, 'graph-detail-source-actions');

  fullGraphDetail.innerHTML = `<strong>${escapeHtml(stripMarkdownExtension(node.label))}</strong>
    <div class="graph-detail-metrics">
      <span>${node.incoming} in</span>
      <span>${node.outgoing} out</span>
      <span>${unresolvedCount} open</span>
    </div>
    <div class="graph-detail-tags">${flags.map((flag) => `<span>${escapeHtml(flag)}</span>`).join('')}</div>
    <p>${escapeHtml(folder)}${isActive ? ' · Active note' : ''}</p>
    ${tagsMarkup}
    <p>${escapeHtml(excerpt || 'No readable text yet.')}</p>
    ${sourceAnchors}
    <div class="graph-detail-actions">
      <button class="sidebar-action" type="button" data-full-graph-open-path="${escapeAttribute(node.path)}">Open</button>
      <button class="sidebar-action" type="button" data-full-graph-focus-path="${escapeAttribute(node.path)}">Focus</button>
      <button class="sidebar-action" type="button" data-full-graph-expand-path="${escapeAttribute(node.path)}">Expand</button>
    </div>`;
}

function graphNodeSearchText(node) {
  const flags = [getGraphNodeExtension(node), node.hasMedia ? 'media attachment image pdf audio video' : '', node.hasCanvas ? 'canvas board json canvas' : ''];
  return `${node.label} ${node.doc?.title || ''} ${extractMarkdownTags(node.doc?.content || '').join(' ')} ${flags.join(' ')}`.toLowerCase();
}

function getNodeDegree(node) {
  return (node?.incoming || 0) + (node?.outgoing || 0);
}

function getFullGraphTransform() {
  return `translate(${Math.round(fullGraphPan.x)} ${Math.round(fullGraphPan.y)}) scale(${roundGraphNumber(fullGraphZoom)})`;
}

function updateFullGraphRotationControls() {
  if (!fullGraphRotationReadout) return;
  fullGraphRotationReadout.textContent = `${Math.round(fullGraphRotation.x)}° / ${Math.round(fullGraphRotation.y)}°`;
  if (fullGraphAutoRotateButton) {
    fullGraphAutoRotateButton.setAttribute('aria-pressed', String(fullGraphAutoRotate));
    fullGraphAutoRotateButton.textContent = fullGraphAutoRotate ? 'Stop Rotate' : 'Auto Rotate';
  }
}

function rotateFullGraphYaw(deltaDegrees) {
  if (fullGraphSpaceMode !== FULL_GRAPH_SPACE_MODE_3D) return;
  fullGraphRotation = normalizeFullGraphRotation({
    ...fullGraphRotation,
    y: fullGraphRotation.y + deltaDegrees
  });
  updateFullGraphRotationControls();
  renderFullGraph();
  schedulePersist();
}

function rotateFullGraphPitch(deltaDegrees) {
  if (fullGraphSpaceMode !== FULL_GRAPH_SPACE_MODE_3D) return;
  fullGraphRotation = normalizeFullGraphRotation({
    ...fullGraphRotation,
    x: fullGraphRotation.x + deltaDegrees
  });
  updateFullGraphRotationControls();
  renderFullGraph();
  schedulePersist();
}

function resetFullGraphRotation() {
  fullGraphRotation = { ...FULL_GRAPH_DEFAULT_ROTATION };
  updateFullGraphRotationControls();
  renderFullGraph();
  schedulePersist();
}

function stopFullGraphAutoRotate() {
  if (fullGraphAnimationFrame) {
    cancelAnimationFrame(fullGraphAnimationFrame);
    fullGraphAnimationFrame = null;
  }
  fullGraphAutoRotate = false;
  updateFullGraphRotationControls();
  schedulePersist();
}

function startFullGraphAutoRotate() {
  stopFullGraphAutoRotate();
  fullGraphAutoRotate = true;
  updateFullGraphRotationControls();

  const tick = () => {
    if (!fullGraphAutoRotate || fullGraphModal.hidden) {
      fullGraphAnimationFrame = null;
      fullGraphAutoRotate = false;
      updateFullGraphRotationControls();
      return;
    }

    if (fullGraphSpaceMode !== FULL_GRAPH_SPACE_MODE_3D) {
      fullGraphAutoRotate = false;
      updateFullGraphRotationControls();
      return;
    }

    fullGraphRotation = normalizeFullGraphRotation({
      ...fullGraphRotation,
      y: fullGraphRotation.y + FULL_GRAPH_AUTO_ROTATE_STEP
    });
    renderFullGraph();
    updateFullGraphRotationControls();
    fullGraphAnimationFrame = requestAnimationFrame(tick);
  };

  fullGraphAnimationFrame = requestAnimationFrame(tick);
}

function toggleFullGraphAutoRotate() {
  if (fullGraphAutoRotate) {
    stopFullGraphAutoRotate();
  } else {
    startFullGraphAutoRotate();
  }
  schedulePersist();
}

function setFullGraphZoom(nextZoom) {
  fullGraphZoom = Math.max(FULL_GRAPH_MIN_ZOOM, Math.min(FULL_GRAPH_MAX_ZOOM, Number(nextZoom) || 1));
  applyFullGraphViewport();
  schedulePersist();
}

function resetFullGraphViewport() {
  fullGraphZoom = 1;
  fullGraphPan = { x: 0, y: 0 };
  applyFullGraphViewport();
  schedulePersist();
}

function applyFullGraphViewport() {
  fullGraphCanvas.querySelector('.graph-viewport')?.setAttribute('transform', getFullGraphTransform());
  updateFullGraphZoomReadout();
  updateFullGraphMinimapViewport();
}

function updateFullGraphZoomReadout() {
  if (fullGraphZoomValue) {
    fullGraphZoomValue.textContent = `${Math.round(fullGraphZoom * 100)}%`;
  }
}

function getFullGraphExportProfile() {
  const profile = fullGraphExportProfileSelect?.value || 'navigation';
  return VALID_GRAPH_EXPORT_PROFILES.has(profile) ? profile : 'navigation';
}

function getFullGraphExportProfileLabel(profile = getFullGraphExportProfile()) {
  if (profile === 'llm') return 'Claude / ChatGPT Notes';
  if (profile === 'compact') return 'Compact Map';
  if (profile === 'audit') return 'Full Audit File';
  if (profile === 'presentation') return 'Presentation Image';
  if (profile === 'scene') return '3D Scene File';
  return 'Navigation File';
}

function updateFullGraphExportButtons() {
  const profile = getFullGraphExportProfile();
  if (exportGraphJsonButton) {
    if (profile === 'compact') exportGraphJsonButton.textContent = 'Save Compact Map';
    else if (profile === 'scene') exportGraphJsonButton.textContent = 'Save 3D File';
    else exportGraphJsonButton.textContent = profile === 'presentation' ? 'Save Layout JSON' : 'Save JSON';
  }
  if (exportGraphSvgButton) {
    exportGraphSvgButton.textContent = profile === 'presentation' ? 'Save Image' : 'Save SVG';
  }
  if (exportGraphContextButton) {
    exportGraphContextButton.textContent =
      profile === 'audit'
        ? 'Save Audit Notes'
        : profile === 'compact'
          ? 'Save Compact Notes'
          : profile === 'scene'
            ? 'Save Scene Notes'
            : 'Save Context';
  }
}

function updateFullGraphMinimapViewport() {
  const viewport = fullGraphMinimap?.querySelector('.graph-minimap-viewport');
  if (!viewport) return;

  const width = roundGraphNumber(FULL_GRAPH_VIEWBOX.width / fullGraphZoom);
  const height = roundGraphNumber(FULL_GRAPH_VIEWBOX.height / fullGraphZoom);
  const x = roundGraphNumber(-fullGraphPan.x / fullGraphZoom);
  const y = roundGraphNumber(-fullGraphPan.y / fullGraphZoom);
  viewport.setAttribute('x', String(x));
  viewport.setAttribute('y', String(y));
  viewport.setAttribute('width', String(width));
  viewport.setAttribute('height', String(height));
}

function centerFullGraphFromMinimap(event) {
  const svg = fullGraphMinimap?.querySelector('svg');
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const clientX = 'clientX' in event ? event.clientX : rect.left + rect.width / 2;
  const clientY = 'clientY' in event ? event.clientY : rect.top + rect.height / 2;
  const x = ((clientX - rect.left) / rect.width) * FULL_GRAPH_VIEWBOX.width;
  const y = ((clientY - rect.top) / rect.height) * FULL_GRAPH_VIEWBOX.height;
  fullGraphPan = {
    x: Math.round(FULL_GRAPH_VIEWBOX.width / 2 - x * fullGraphZoom),
    y: Math.round(FULL_GRAPH_VIEWBOX.height / 2 - y * fullGraphZoom)
  };
  applyFullGraphViewport();
}

function fitFullGraphToView() {
  const circles = [...fullGraphCanvas.querySelectorAll('.graph-node circle')];
  if (!circles.length) return;

  const bounds = circles.reduce(
    (box, circle) => {
      const cx = Number(circle.getAttribute('cx')) || 0;
      const cy = Number(circle.getAttribute('cy')) || 0;
      const radius = Number(circle.getAttribute('r')) || 0;
      return {
        minX: Math.min(box.minX, cx - radius),
        minY: Math.min(box.minY, cy - radius),
        maxX: Math.max(box.maxX, cx + radius),
        maxY: Math.max(box.maxY, cy + radius)
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );

  const graphWidth = Math.max(1, bounds.maxX - bounds.minX);
  const graphHeight = Math.max(1, bounds.maxY - bounds.minY);
  const targetZoom = Math.max(
    FULL_GRAPH_MIN_ZOOM,
    Math.min(
      FULL_GRAPH_MAX_ZOOM,
      0.88 * Math.min(FULL_GRAPH_VIEWBOX.width / graphWidth, FULL_GRAPH_VIEWBOX.height / graphHeight)
    )
  );
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  fullGraphZoom = targetZoom;
  fullGraphPan = {
    x: Math.round(FULL_GRAPH_VIEWBOX.width / 2 - centerX * targetZoom),
    y: Math.round(FULL_GRAPH_VIEWBOX.height / 2 - centerY * targetZoom)
  };
  applyFullGraphViewport();
}

async function exportFullGraphJson() {
  if (!lastFullGraphDetailState?.visibleGraph) {
    showToast('Open a map before saving.');
    return;
  }

  const profile = getFullGraphExportProfile();
  const payload = buildFullGraphExportPayload(profile);
  await exportTextFile({
    title: `Save ${getFullGraphExportProfileLabel(profile)}`,
    defaultPath: `${sanitizeFileStem(activeVault?.name || 'Shibanshu Map')}-${profile}-map.json`,
    format: 'json',
    content: `${JSON.stringify(payload, null, 2)}\n`
  });
}

async function exportFullGraphSvg() {
  const profile = getFullGraphExportProfile();
  const svg = buildFullGraphExportSvg(profile);
  if (!svg) {
    showToast('Open a map before saving.');
    return;
  }

  await exportTextFile({
    title: `Save ${profile === 'presentation' ? 'Presentation Map SVG' : 'Map SVG'}`,
    defaultPath: `${sanitizeFileStem(activeVault?.name || 'Shibanshu Map')}-${profile}-map.svg`,
    format: 'svg',
    content: svg
  });
}

async function exportFullGraphContext() {
  if (!lastFullGraphDetailState?.visibleGraph) {
    showToast('Open a map before saving.');
    return;
  }

  const profile = getFullGraphExportProfile();
  const content = buildFullGraphContextMarkdown(profile);
  await exportTextFile({
    title: `Save ${getFullGraphExportProfileLabel(profile)} Markdown`,
    defaultPath: `${sanitizeFileStem(activeVault?.name || 'Shibanshu Map')}-${profile}-context.md`,
    format: 'md',
    content
  });
}

async function exportFullGraphWithProfile(profile, exporter) {
  if (!VALID_GRAPH_EXPORT_PROFILES.has(profile) || typeof exporter !== 'function') return;
  openFullGraph({ space: profile === 'scene' ? FULL_GRAPH_SPACE_MODE_3D : fullGraphSpaceMode });
  if (fullGraphExportProfileSelect) {
    fullGraphExportProfileSelect.value = profile;
    updateFullGraphExportButtons();
  }
  await waitForNextFrame();
  await exporter();
}

function buildFullGraphExportPayload(profile = getFullGraphExportProfile()) {
  const state = lastFullGraphDetailState;
  const visibleGraph = state.visibleGraph;
  const activeDocument = state.activeDocument;
  const visiblePaths = new Set(visibleGraph.nodes.map((node) => node.path));
  const vaultDocs = getVaultDocuments();
  const rankedNodes = rankGraphNodesForContext(visibleGraph.nodes, activeDocument?.path);
  const unresolvedLinks = state.graph.unresolvedLinks.filter((link) => visiblePaths.has(link.source));
  const isCompactProfile = profile === 'compact';
  const isSceneProfile = profile === 'scene';
  const isLayoutProfile = profile === 'presentation' || profile === 'audit' || isSceneProfile;
  const isCompactProjection = isCompactProfile || isSceneProfile;
  const compactRoutes = isCompactProjection
    ? buildCompactNavigationRoutes(visibleGraph.nodes, visibleGraph.edges, unresolvedLinks, activeDocument?.path)
    : null;
  const sceneSeedPaths = compactRoutes
    ? compactRoutes.flatMap((route) => route.documents || []).filter(Boolean).map((item) => String(item))
    : [];
  const exportProjection =
    isCompactProfile || isSceneProfile
      ? projectFullGraphForCompactExport(state, visibleGraph, rankedNodes, activeDocument, {
          nodeLimit: isSceneProfile ? FULL_GRAPH_SCENE_NODE_LIMIT : FULL_GRAPH_COMPACT_NODE_LIMIT,
          edgeLimit: isSceneProfile ? FULL_GRAPH_SCENE_EDGE_LIMIT : FULL_GRAPH_COMPACT_EDGE_LIMIT,
          routerNodeLimit: FULL_GRAPH_COMPACT_ROUTER_NODE_LIMIT,
          routeSeedPaths: sceneSeedPaths
        })
      : null;
  const exportGraph = exportProjection?.graph || visibleGraph;
  const exportNodes = exportGraph.nodes;
  const exportEdges = exportGraph.edges;
  const exportNodeByPath = exportGraph.nodeByPath;
  const rankedExportNodes = rankGraphNodesForContext(exportNodes, activeDocument?.path);
  const exportUnresolvedLinks = state.graph.unresolvedLinks.filter((link) => exportNodeByPath.has(link.source));
  const sceneLayoutSource = isSceneProfile
    ? layoutForceGraphNodes3D(exportNodes, exportEdges, FULL_GRAPH_VIEWBOX.width, FULL_GRAPH_VIEWBOX.height, activeDocument?.path)
    : null;
  const sceneLayout = isSceneProfile
    ? projectGraphLayout(
        sceneLayoutSource,
        FULL_GRAPH_VIEWBOX.width / 2,
        FULL_GRAPH_VIEWBOX.height / 2,
        fullGraphRotation,
        FULL_GRAPH_PERSPECTIVE
      )
    : null;
  const layout =
    isLayoutProfile && !isSceneProfile
      ? layoutForceGraphNodes(visibleGraph.nodes, visibleGraph.edges, FULL_GRAPH_VIEWBOX.width, FULL_GRAPH_VIEWBOX.height, activeDocument?.path)
      : isSceneProfile
        ? sceneLayout
        : null;
  const scenePayload = isSceneProfile
    ? buildFullGraphScenePayload({
        state,
        nodes: exportNodes,
        edges: exportEdges,
        activeDocument,
        routes: compactRoutes,
        sceneLayoutSource,
        sceneLayout
      })
    : null;
  const includeDeepContext = profile === 'llm' || profile === 'audit';
  const includeAuditFields = profile === 'audit';
  const readingOrder = isSceneProfile
    ? buildSceneReadingOrder(exportNodes, compactRoutes, activeDocument?.path)
    : rankedExportNodes.slice(0, isCompactProfile ? 70 : 80).map((node) => getDisplayPath(node.doc || node));

  return {
    app: 'Shibanshu Markdown Viewer',
    type: 'graph-export',
    profile,
    profileLabel: getFullGraphExportProfileLabel(profile),
    generatedAt: new Date().toISOString(),
    vault: activeVault
      ? {
          name: activeVault.name,
          path: activeVault.path
        }
      : null,
    activePath: activeDocument?.path || null,
    scope: fullGraphMode,
    localDepth: getFullGraphDepth(),
    search: fullGraphSearchInput.value.trim(),
    filters: getFullGraphFilters(),
    counts: {
      nodes: visibleGraph.nodes.length,
      edges: visibleGraph.edges.length,
      unresolved: unresolvedLinks.length,
      compactNodes: isCompactProjection ? exportNodes.length : visibleGraph.nodes.length,
      compactEdges: isCompactProjection ? exportEdges.length : visibleGraph.edges.length,
      sceneNodes: isSceneProfile ? exportNodes.length : undefined,
      sceneEdges: isSceneProfile ? exportEdges.length : undefined
    },
    compact: isCompactProfile
      ? {
          nodeLimit: FULL_GRAPH_COMPACT_NODE_LIMIT,
          edgeLimit: FULL_GRAPH_COMPACT_EDGE_LIMIT,
          routerNodeLimit: FULL_GRAPH_COMPACT_ROUTER_NODE_LIMIT,
          selectedNodes: exportNodes.length,
          selectedEdges: exportEdges.length,
          seedPaths: exportProjection?.seeds || [],
          routes: compactRoutes,
          reason: exportProjection ? 'Router + active path + unresolved hubs + local neighborhood expansion' : 'No compact projection available'
        }
      : undefined,
    scene: isSceneProfile ? scenePayload : undefined,
    llmInstructions:
      profile === 'llm'
        ? [
            'Use readingOrder first when deciding which notes to inspect.',
            'Use edges and unresolvedLinks to understand context before editing.',
            'Prefer node excerpts as summaries, not as a substitute for opening source files when exact wording matters.'
          ]
        : undefined,
    readingOrder,
    folders: summarizeGraphFolders(exportNodes),
    tags: summarizeGraphTags(exportNodes),
    nodes: rankedExportNodes.map((node) => buildGraphExportNode(node, state.graph, vaultDocs, { includeDeepContext, includeAuditFields, layout })),
    edges: exportEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourcePath: getDisplayPath(state.graph.nodeByPath.get(edge.source)?.doc || { path: edge.source }),
      targetPath: getDisplayPath(state.graph.nodeByPath.get(edge.target)?.doc || { path: edge.target }),
      kind: edge.kind || 'link',
      text: edge.text
    })),
    unresolvedLinks: exportUnresolvedLinks.slice(0, Math.max(1, Math.ceil(unresolvedLinks.length * 0.6))).map((link) => ({
      source: link.source,
      sourcePath: getDisplayPath(state.graph.nodeByPath.get(link.source)?.doc || { path: link.source }),
      target: link.target,
      text: link.text
    })),
    routes: compactRoutes
  };
}

function buildFullGraphScenePayload({ state, nodes, edges, activeDocument, routes, sceneLayoutSource, sceneLayout }) {
  const activePath = activeDocument?.path;
  const routeList = routes || [];
  const nodeByPath = new Map(nodes.map((node) => [node.path, node]));
  const bounds = buildSceneBounds(sceneLayout);
  const edgesForPayload = [];
  const edgeByPathByNode = new Map();
  for (const edge of edges) {
    if (!nodeByPath.has(edge.source) || !nodeByPath.has(edge.target)) continue;
    edgeByPathByNode.set(`${edge.source}->${edge.target}->${edge.kind || 'link'}`, {
      source: edge.source,
      target: edge.target,
      kind: edge.kind || 'link',
      text: edge.text,
      sourcePath: getDisplayPath(state.graph.nodeByPath.get(edge.source)?.doc || { path: edge.source }),
      targetPath: getDisplayPath(state.graph.nodeByPath.get(edge.target)?.doc || { path: edge.target })
    });
  }
  for (const edge of edgeByPathByNode.values()) {
    edgesForPayload.push(edge);
  }

  const nodesForPayload = nodes.map((node) => {
    const layoutPoint = sceneLayoutSource?.get(node.path);
    const projectionPoint = sceneLayout?.get(node.path);
    return {
      path: node.path,
      label: node.label,
      folder: getGraphFolderLabel(getGraphFolderKey(node)),
      extension: getGraphNodeExtension(node),
      degree: getNodeDegree(node),
      incoming: node.incoming,
      outgoing: node.outgoing,
      routeScore: getSceneRouteScore(node.path, routeList),
      active: node.path === activePath,
      hasMedia: Boolean(node.hasMedia),
      hasCanvas: Boolean(node.hasCanvas),
      coordinates: layoutPoint
        ? {
            x: roundGraphNumber(layoutPoint.x),
            y: roundGraphNumber(layoutPoint.y),
            z: roundGraphNumber(layoutPoint.z)
          }
        : null,
      projection:
        projectionPoint && projectionPoint.screenX !== undefined
          ? {
              x: projectionPoint.screenX,
              y: projectionPoint.screenY,
              depth: roundGraphNumber(projectionPoint.depth),
              scale: roundGraphNumber(projectionPoint.scale)
            }
          : null
    };
  });

  const unresolvedInScene = state.graph.unresolvedLinks.filter(
    (link) => nodeByPath.has(link.source) && routeList.some((route) => route.documents?.includes(link.source))
  ).length;
  return {
    profile: '3d-scene',
    generatedAt: new Date().toISOString(),
    bounds,
    limits: {
      nodeLimit: FULL_GRAPH_SCENE_NODE_LIMIT,
      edgeLimit: FULL_GRAPH_SCENE_EDGE_LIMIT
    },
    viewport: {
      width: FULL_GRAPH_VIEWBOX.width,
      height: FULL_GRAPH_VIEWBOX.height,
      rotation: fullGraphRotation,
      perspective: FULL_GRAPH_PERSPECTIVE
    },
    unresolvedCount: unresolvedInScene,
    fingerprint: buildSceneLayoutFingerprint(routeList, nodesForPayload, edgesForPayload),
    routes: routeList,
    nodes: nodesForPayload,
    edges: edgesForPayload
  };
}

function buildSceneReadingOrder(nodes, routes, activePath) {
  const nodesByPath = new Map(nodes.map((node) => [node.path, node]));
  const ordered = [];
  const seen = new Set();
  const addPath = (path) => {
    const nodePath = nodesByPath.has(path) ? path : [...nodesByPath.keys()].find((item) => item.endsWith(`/${path}`) || item === path);
    if (!nodePath || seen.has(nodePath)) return;
    seen.add(nodePath);
    ordered.push(nodePath);
  };

  addPath(activePath);
  for (const route of routes || []) {
    for (const document of route.documents || []) {
      addPath(document);
    }
  }

  for (const node of rankGraphNodesForContext(nodes, activePath)) {
    addPath(node.path);
  }

  return ordered.map((path) => getDisplayPath(nodesByPath.get(path) || { path }));
}

function getSceneRouteScore(path, routes = []) {
  let score = 0;
  for (const route of routes) {
    const index = route?.documents?.indexOf(path) ?? -1;
    if (index >= 0) score += 60 - Math.min(50, index);
  }
  return score;
}

function buildSceneLayoutFingerprint(routes = [], nodes = [], edges = []) {
  const sortedNodeKeys = nodes
    .map((node) => `${node.path}:${node.coordinates?.x || 0}:${node.coordinates?.y || 0}:${node.coordinates?.z || 0}:${node.routeScore || 0}`)
    .sort();
  const routeKeys = routes.map((route) => `${route.name}:${route.goal}:${(route.documents || []).join('|')}`).sort();
  const edgeKeys = edges
    .map((edge) => `${edge.source}->${edge.target}:${edge.kind}:${edge.text || ''}`)
    .sort()
    .slice(0, FULL_GRAPH_SCENE_EDGE_LIMIT);
  return hashString(`${sortedNodeKeys.join('|')}|${routeKeys.join('|')}|${edgeKeys.join('|')}`);
}

function buildSceneBounds(layout) {
  if (!layout || !layout.size) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of layout.values()) {
    const x = Number(point.screenX || 0);
    const y = Number(point.screenY || 0);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) return null;

  return {
    minX: roundGraphNumber(minX),
    minY: roundGraphNumber(minY),
    maxX: roundGraphNumber(maxX),
    maxY: roundGraphNumber(maxY)
  };
}

function projectFullGraphForCompactExport(state, visibleGraph, rankedNodes, activeDocument, options = {}) {
  if (!visibleGraph?.nodes?.length) {
    return {
      graph: { nodes: [], edges: [], nodeByPath: new Map() },
      seeds: []
    };
  }

  const activePath = activeDocument?.path;
  const nodeLimit = Number.isFinite(options.nodeLimit) ? options.nodeLimit : FULL_GRAPH_COMPACT_NODE_LIMIT;
  const edgeLimit = Number.isFinite(options.edgeLimit) ? options.edgeLimit : FULL_GRAPH_COMPACT_EDGE_LIMIT;
  const routerNodeLimit = Number.isFinite(options.routerNodeLimit) ? options.routerNodeLimit : FULL_GRAPH_COMPACT_ROUTER_NODE_LIMIT;
  const routeSeedPaths = new Set(Array.isArray(options.routeSeedPaths) ? options.routeSeedPaths : []);
  const nodeByPath = new Map(visibleGraph.nodes.map((node) => [node.path, node]));
  const selectedNodes = new Map();

  const rankByDegree = [...visibleGraph.nodes]
    .sort((left, right) => getNodeDegree(right) - getNodeDegree(left) || getDisplayPath(left).localeCompare(getDisplayPath(right)));
  const hubsByDegree = new Set(rankByDegree.slice(0, Math.min(90, routerNodeLimit * 2)).map((node) => node.path));
  const topUnresolved = rankNodesByUnresolvedDensity(visibleGraph, state.graph.unresolvedLinks);

  const seeds = new Set();
  const addSeed = (path) => {
    if (!path || !nodeByPath.has(path)) return;
    seeds.add(path);
    selectedNodes.set(path, nodeByPath.get(path));
  };

  if (activePath) addSeed(activePath);
  routeSeedPaths.forEach((path) => addSeed(path));
  rankByDegree.slice(0, 18).forEach((node) => addSeed(node.path));
  [...hubsByDegree].slice(0, 28).forEach((path) => addSeed(path));
  topUnresolved.slice(0, 20).forEach((path) => addSeed(path));

  const adjacency = buildPathAdjacency(visibleGraph.edges);
  const queue = [...[...selectedNodes.keys()].map((path) => ({ path, depth: 0 }))];
  const maxDepth = 2;

  while (queue.length && selectedNodes.size < nodeLimit) {
    const current = queue.shift();
    if (current.depth >= maxDepth) continue;
    const neighbors = adjacency.get(current.path);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      if (selectedNodes.size >= nodeLimit) break;
      if (selectedNodes.has(neighbor)) continue;
      addSeed(neighbor);
      queue.push({ path: neighbor, depth: current.depth + 1 });
    }
  }

  if (selectedNodes.size < nodeLimit) {
    for (const candidate of rankByDegree) {
      if (selectedNodes.size >= nodeLimit) break;
      addSeed(candidate.path);
    }
  }

  const selectedPaths = new Set(selectedNodes.keys());
  const scoredEdges = [];

  for (const edge of visibleGraph.edges) {
    if (!selectedPaths.has(edge.source) || !selectedPaths.has(edge.target)) continue;
    const sourceNode = nodeByPath.get(edge.source);
    const targetNode = nodeByPath.get(edge.target);
    const sourceWeight = getNodeDegree(sourceNode);
    const targetWeight = getNodeDegree(targetNode);
    let score = sourceWeight + targetWeight;
    if (edge.source === activePath || edge.target === activePath) score += 120;
    if (hubsByDegree.has(edge.source) || hubsByDegree.has(edge.target)) score += 80;
    scoredEdges.push({ edge, score });
  }

  const edges = scoredEdges
    .sort((left, right) => right.score - left.score)
    .slice(0, edgeLimit)
    .map((item) => item.edge);
  const compactNodes = [...selectedNodes.values()].sort((left, right) =>
    getNodeDegree(right) - getNodeDegree(left) || getDisplayPath(left).localeCompare(getDisplayPath(right))
  );
  const compactNodeByPath = new Map(compactNodes.map((node) => [node.path, node]));

  return {
    graph: {
      nodes: compactNodes,
      edges,
      nodeByPath: compactNodeByPath
    },
    seeds: [...seeds]
  };
}

function buildPathAdjacency(edges) {
  const adjacency = new Map();
  for (const edge of edges || []) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source).add(edge.target);
    adjacency.get(edge.target).add(edge.source);
  }
  return adjacency;
}

function rankNodesByUnresolvedDensity(visibleGraph, unresolvedLinks = []) {
  const countByPath = new Map();
  const visiblePaths = new Set(visibleGraph.nodes.map((node) => node.path));
  for (const link of unresolvedLinks) {
    if (!visiblePaths.has(link.source)) continue;
    countByPath.set(link.source, (countByPath.get(link.source) || 0) + 1);
  }

  return [...countByPath.entries()]
    .sort((left, right) => {
      const leftScore = left[1];
      const rightScore = right[1];
      if (rightScore !== leftScore) return rightScore - leftScore;
      return getDisplayPath({ path: left[0] }).localeCompare(getDisplayPath({ path: right[0] }));
    })
    .map(([path]) => path);
}

function buildCompactNavigationRoutes(nodes, edges, unresolvedLinks = [], activePath) {
  const nodesByPath = new Map(nodes.map((node) => [node.path, node]));
  const degreeByPath = new Map(nodes.map((node) => [node.path, getNodeDegree(node)]));
  const folderByPath = new Map(nodes.map((node) => [node.path, getGraphFolderLabel(getGraphFolderKey(node))]));
  const crossClusterByPath = new Map();

  for (const edge of edges) {
    const sourceFolder = folderByPath.get(edge.source);
    const targetFolder = folderByPath.get(edge.target);
    if (!sourceFolder || !targetFolder || sourceFolder === targetFolder) continue;
    crossClusterByPath.set(edge.source, (crossClusterByPath.get(edge.source) || 0) + 1);
    crossClusterByPath.set(edge.target, (crossClusterByPath.get(edge.target) || 0) + 1);
  }

  const ranked = [...nodes]
    .sort((left, right) => {
      const degreeDelta = (degreeByPath.get(right.path) || 0) - (degreeByPath.get(left.path) || 0);
      if (degreeDelta !== 0) return degreeDelta;
      const crossDelta = (crossClusterByPath.get(right.path) || 0) - (crossClusterByPath.get(left.path) || 0);
      return crossDelta || getDisplayPath(left.doc || left).localeCompare(getDisplayPath(right.doc || right));
    });

  const topHubs = ranked.filter((node) => nodesByPath.has(node.path)).slice(0, 8);
  const topBridges = ranked.filter((node) => (crossClusterByPath.get(node.path) || 0) > 0).slice(0, 8);
  const unresolvedSources = rankNodesByUnresolvedDensity({ nodes }, unresolvedLinks).slice(0, 8);

  const activeNode = activePath ? nodesByPath.get(activePath) : null;
  const orientation = [activeNode?.path, ...topHubs, ...topBridges]
    .filter(Boolean)
    .map((pathOrNode) => (typeof pathOrNode === 'string' ? pathOrNode : pathOrNode.path))
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, 9)
    .map((path) => getDisplayPath(nodesByPath.get(path)));

  const routes = [];
  if (orientation.length) {
    routes.push({
      name: 'Orientation Route',
      goal: 'Start here to rebuild local context before deep edits.',
      documents: [...orientation]
    });
  }

  if (topHubs.length) {
    routes.push({
      name: 'Hub Route',
      goal: 'Read these high-degree files before traversing connected context.',
      documents: topHubs.map((node) => getDisplayPath(node.doc || node))
    });
  }

  if (topBridges.length || unresolvedSources.length) {
    routes.push({
      name: 'Transition Route',
      goal: 'Prefer these files when moving between contexts or fixing broken links.',
      documents: [...topBridges, ...unresolvedSources.filter(Boolean)].filter((path) => nodesByPath.has(path)).map((path) => getDisplayPath(nodesByPath.get(path)))
    });
  }

  return routes.slice(0, 3);
}

function buildGraphExportNode(node, graph, vaultDocs, options = {}) {
  const doc = node.doc || {};
  const outgoing = graph.edges.filter((edge) => edge.source === node.path);
  const incoming = graph.edges.filter((edge) => edge.target === node.path);
  const unresolved = graph.unresolvedLinks.filter((link) => link.source === node.path);
  const point = options.layout?.get(node.path);
  const summary = {
    id: node.path,
    path: node.path,
    label: node.label,
    title: doc.title || node.label,
    relativePath: getDisplayPath(doc || node),
    folder: getGraphFolderLabel(getGraphFolderKey(node)),
    extension: getGraphNodeExtension(node),
    hasMedia: Boolean(node.hasMedia),
    hasCanvas: Boolean(node.hasCanvas),
    canvasCards: Number(node.canvasCards || 0),
    canvasEdges: Number(node.canvasEdges || 0),
    incoming: node.incoming,
    outgoing: node.outgoing,
    degree: getNodeDegree(node),
    tags: extractMarkdownTags(doc.content || '')
  };

  if (point) {
    summary.position = { x: point.x, y: point.y };
  }

  if (options.includeDeepContext) {
    summary.words = countWords(doc.content || '');
    summary.headings = extractMarkdownHeadings(doc.content || '')
      .slice(0, 18)
      .map((heading) => ({ level: heading.level, text: heading.text, line: heading.line }));
    summary.outgoingPaths = outgoing
      .map((edge) => getDisplayPath(graph.nodeByPath.get(edge.target)?.doc || { path: edge.target }))
      .slice(0, 40);
    summary.backlinkPaths = incoming
      .map((edge) => getDisplayPath(graph.nodeByPath.get(edge.source)?.doc || { path: edge.source }))
      .slice(0, 40);
    summary.unresolvedTargets = unresolved.map((link) => link.target).slice(0, 40);
    summary.excerpt = createPlainTextExcerpt(doc.content || '', options.includeAuditFields ? 520 : 300);
  } else {
    summary.excerpt = createPlainTextExcerpt(doc.content || '', 160);
  }

  if (options.includeAuditFields) {
    summary.documentId = doc.id || null;
    summary.markdownHash = hashString(doc.content || '');
    summary.displayPathKeys = [...getDocumentLinkKeys(doc)].slice(0, 16);
    summary.backlinkCount = findBacklinks(doc, vaultDocs).length;
  }

  return summary;
}

function rankGraphNodesForContext(nodes, activePath) {
  return [...nodes].sort((left, right) => {
    if (left.path === activePath) return -1;
    if (right.path === activePath) return 1;
    return getNodeDegree(right) - getNodeDegree(left) || getDisplayPath(left.doc || left).localeCompare(getDisplayPath(right.doc || right));
  });
}

function summarizeGraphFolders(nodes) {
  const counts = new Map();
  for (const node of nodes) {
    const folder = getGraphFolderLabel(getGraphFolderKey(node));
    counts.set(folder, (counts.get(folder) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([folder, count]) => ({ folder, count }));
}

function summarizeGraphTags(nodes) {
  const counts = new Map();
  for (const node of nodes) {
    for (const tag of extractMarkdownTags(node.doc?.content || '')) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 80)
    .map(([tag, count]) => ({ tag, count }));
}

function buildFullGraphContextMarkdown(profile = getFullGraphExportProfile()) {
  const payload = buildFullGraphExportPayload(profile);
  const lines = [
    `# ${activeVault?.name || 'Folder'} Map Context`,
    '',
    `Generated: ${payload.generatedAt}`,
    `Profile: ${payload.profileLabel}`,
    `Scope: ${payload.scope}`,
    `Active path: ${payload.activePath || 'None'}`,
    `Nodes: ${payload.counts.nodes}`,
    `Edges: ${payload.counts.edges}`,
    `Missing links: ${payload.counts.unresolved}`,
    '',
    '## How To Use',
    '',
    'Give this file to Claude, ChatGPT, or another local model when it needs to understand the current map view. Start with the reading order, then inspect note summaries and missing links before editing source files.',
    '',
    '## Reading Order',
    ''
  ];

  payload.readingOrder.slice(0, 80).forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`);
  });

  lines.push('', '## Folders', '');
  if (payload.folders.length) {
    payload.folders.forEach((item) => lines.push(`- ${item.folder}: ${item.count}`));
  } else {
    lines.push('- None');
  }

  lines.push('', '## Tags', '');
  if (payload.tags.length) {
    payload.tags.slice(0, 40).forEach((item) => lines.push(`- ${item.tag}: ${item.count}`));
  } else {
    lines.push('- None');
  }

  if (payload.compact?.routes?.length) {
    lines.push('', '## Compact Map Routes', '');
    for (const route of payload.compact.routes) {
      lines.push(`### ${route.name}`);
      lines.push(`- Goal: ${route.goal}`);
      if (route.documents?.length) {
        lines.push('- Route:');
        route.documents.slice(0, 12).forEach((path) => lines.push(`  - ${path}`));
      }
      lines.push('');
    }
  }

  lines.push('', '## Nodes', '');
  const maxNodes = profile === 'audit' ? 220 : profile === 'compact' ? 120 : 120;
  for (const node of payload.nodes.slice(0, maxNodes)) {
    lines.push(`### ${node.relativePath}`);
    lines.push(`- Type: .${node.extension}`);
    lines.push(`- Links: ${node.incoming} in / ${node.outgoing} out`);
    lines.push(`- Tags: ${node.tags.length ? node.tags.join(', ') : 'None'}`);
    if (node.headings?.length) {
      lines.push(`- Headings: ${node.headings.map((heading) => heading.text).join(' | ')}`);
    }
    if (node.outgoingPaths?.length) {
      lines.push(`- Outgoing: ${node.outgoingPaths.join(', ')}`);
    }
    if (node.backlinkPaths?.length) {
      lines.push(`- Links here: ${node.backlinkPaths.join(', ')}`);
    }
    if (node.unresolvedTargets?.length) {
      lines.push(`- Missing links: ${node.unresolvedTargets.join(', ')}`);
    }
    lines.push(`- Flags: ${[node.hasMedia ? 'media' : '', node.hasCanvas ? 'canvas' : ''].filter(Boolean).join(', ') || 'none'}`);
    lines.push(`- Excerpt: ${node.excerpt || 'No readable text.'}`);
    lines.push('');
  }

  if (payload.edges.length) {
    lines.push('## Edges', '');
    payload.edges.slice(0, 260).forEach((edge) => {
      lines.push(`- ${edge.sourcePath} -> ${edge.targetPath} (${edge.kind}: ${edge.text})`);
    });
    if (payload.edges.length > 260) lines.push(`- ...${payload.edges.length - 260} more edges`);
    lines.push('');
  }

  if (payload.unresolvedLinks.length) {
    lines.push('## Missing Links', '');
    payload.unresolvedLinks.slice(0, 120).forEach((link) => {
      lines.push(`- ${link.sourcePath} -> ${link.target}`);
    });
    if (payload.unresolvedLinks.length > 120) lines.push(`- ...${payload.unresolvedLinks.length - 120} more unresolved links`);
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function buildFullGraphExportSvg(profile = getFullGraphExportProfile()) {
  const svg = fullGraphCanvas.querySelector('svg');
  if (!svg) return '';
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(FULL_GRAPH_VIEWBOX.width));
  clone.setAttribute('height', String(FULL_GRAPH_VIEWBOX.height));
  clone.dataset.exportProfile = profile;
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = `${activeVault?.name || 'Shibanshu Map'} - ${getFullGraphExportProfileLabel(profile)}`;
  const desc = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
  desc.textContent = `${fullGraphSummary.textContent || 'Map export'} Generated ${new Date().toISOString()}.`;
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    .graph-export-background { fill: #ffffff; }
    .graph-edge { stroke: #8c8f98; stroke-width: 1.2; opacity: 0.58; }
    .graph-edge.focused { stroke: #5b6ee1; stroke-width: 1.8; opacity: 0.9; }
    .graph-node circle { fill: #f8f8fb; stroke: #8c8f98; stroke-width: 1.5; }
    .graph-node.active circle { fill: #6b7cff; stroke: #26336f; }
    .graph-node.matched circle { fill: #dfe4ff; stroke: #4054d6; stroke-width: 2.6; }
    .graph-node.media circle { stroke-dasharray: 3 2; }
    .graph-node.canvas circle { fill: #eef1ff; }
    .graph-node text { fill: #24262f; font: 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; text-anchor: middle; }
  `;
  if (profile === 'presentation') {
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('class', 'graph-export-background');
    background.setAttribute('x', '0');
    background.setAttribute('y', '0');
    background.setAttribute('width', String(FULL_GRAPH_VIEWBOX.width));
    background.setAttribute('height', String(FULL_GRAPH_VIEWBOX.height));
    clone.prepend(background);
  }
  clone.prepend(desc);
  clone.prepend(title);
  clone.prepend(style);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}\n`;
}

async function exportTextFile(payload) {
  try {
    const result = await native.exportText(payload);
    if (result) {
      showToast(`${payload.format.toUpperCase()} exported.`);
    }
  } catch (error) {
    if (String(error.message || '').includes('Native Electron bridge is unavailable')) {
      downloadTextFallback(payload);
      showToast(`${payload.format.toUpperCase()} downloaded.`);
      return;
    }
    showToast(`Map save failed: ${error.message}`);
  }
}

function downloadTextFallback(payload) {
  const mimeTypes = {
    json: 'application/json',
    svg: 'image/svg+xml',
    md: 'text/markdown',
    txt: 'text/plain'
  };
  const blob = new Blob([payload.content], { type: mimeTypes[payload.format] || 'text/plain' });
  downloadBlobFallback(blob, payload.defaultPath || `graph.${payload.format}`);
}

function downloadBlobFallback(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeDownloadFileName(fileName);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sanitizeDownloadFileName(fileName) {
  return String(fileName || 'download')
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180) || 'download';
}

function sanitizeFileStem(value) {
  return String(value || 'Graph')
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'Graph';
}

function handleFullGraphWheel(event) {
  if (fullGraphModal.hidden) return;
  if (event.target.closest('#full-graph-preview-popover')) return;
  event.preventDefault();
  if (fullGraphSpaceMode === FULL_GRAPH_SPACE_MODE_3D) {
    if (event.shiftKey) {
      rotateFullGraphPitch(event.deltaY > 0 ? FULL_GRAPH_ROTATION_STEP : -FULL_GRAPH_ROTATION_STEP);
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      rotateFullGraphYaw(event.deltaY > 0 ? FULL_GRAPH_ROTATION_STEP : -FULL_GRAPH_ROTATION_STEP);
      return;
    }
  }
  const delta = event.deltaY > 0 ? -0.08 : 0.08;
  setFullGraphZoom(fullGraphZoom + delta);
}

function handleFullGraphPointerDown(event) {
  if (event.target.closest('[data-graph-node-path]')) return;
  if (event.target.closest('#full-graph-minimap')) return;
  if (event.target.closest('#full-graph-preview-popover')) return;
  const rotateMode = fullGraphSpaceMode === FULL_GRAPH_SPACE_MODE_3D && event.shiftKey;
  fullGraphDragging = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    pan: { ...fullGraphPan },
    rotate: { ...fullGraphRotation },
    mode: rotateMode ? 'rotate' : 'pan'
  };
  fullGraphStage.setPointerCapture(event.pointerId);
  fullGraphStage.classList.add('dragging');
}

function handleFullGraphPointerMove(event) {
  if (!fullGraphDragging || fullGraphDragging.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - fullGraphDragging.x;
  const deltaY = event.clientY - fullGraphDragging.y;
  if (fullGraphDragging.mode === 'rotate') {
    fullGraphRotation = normalizeFullGraphRotation({
      x: fullGraphDragging.rotate.x + (-deltaY * 0.32),
      y: fullGraphDragging.rotate.y + (deltaX * 0.32),
      z: fullGraphDragging.rotate.z
    });
    updateFullGraphRotationControls();
    renderFullGraph();
    return;
  }
  fullGraphPan = {
    x: fullGraphDragging.pan.x + event.clientX - fullGraphDragging.x,
    y: fullGraphDragging.pan.y + event.clientY - fullGraphDragging.y
  };
  applyFullGraphViewport();
}

function endFullGraphDrag(event) {
  if (!fullGraphDragging || fullGraphDragging.pointerId !== event.pointerId) return;
  fullGraphDragging = null;
  fullGraphStage.classList.remove('dragging');
  if (fullGraphStage.hasPointerCapture(event.pointerId)) {
    fullGraphStage.releasePointerCapture(event.pointerId);
  }
  schedulePersist();
}

function openMindMapCanvas(options = {}) {
  const doc = getActiveDocument();
  if (!doc) {
    showToast('Open a note before opening the note map.');
    return;
  }

  if (typeof options.query === 'string') {
    mindMapSearchInput.value = options.query;
  }

  mindMapModal.hidden = false;
  if (typeof options.targetPath === 'string' && options.targetPath) {
    mindMapPreviewNodeId = null;
  }
  renderMindMapCanvas();
  requestAnimationFrame(() => {
    mindMapSearchInput.focus();
    if (typeof options.targetPath === 'string' && options.targetPath && lastMindMapModel?.nodeById) {
      const preferredNode =
        [...lastMindMapModel.nodeById.values()].find((node) => node.path && normalizePathForCompare(node.path) === normalizePathForCompare(options.targetPath)) ||
        lastMindMapModel.nodeById.get('root');
      if (preferredNode) {
        previewMindMapNode(preferredNode.id);
        focusMindMapCanvasNode(preferredNode.id);
      }
    }
  });
}

function closeMindMapCanvas() {
  mindMapModal.hidden = true;
  openMindMapButton.focus();
}

function renderMindMapCanvas() {
  if (mindMapModal.hidden) return;

  const doc = getActiveDocument();
  if (!doc) {
    mindMapTitle.textContent = 'Map';
    mindMapSummary.textContent = 'Open a note to see headings, links, tasks, tags, and links back to it.';
    mindMapCanvas.innerHTML = '<div class="graph-empty">Open a note to build a note map.</div>';
    mindMapList.innerHTML = '';
    mindMapDetail.innerHTML = '<p>Open a note to inspect map context.</p>';
    lastMindMapModel = null;
    return;
  }

  const query = mindMapSearchInput.value.trim().toLowerCase();
  const model = buildMindMapModel(doc, getVaultDocuments());
  const renderModel = limitMindMapForRender(model, query);
  lastMindMapModel = model;
  if (query && (renderModel.nodes.length !== model.nodes.length)) {
    lastMindMapModel = {
      ...model,
      nodes: renderModel.nodes,
      edges: renderModel.edges,
      nodeById: renderModel.nodeById
    };
  } else {
    lastMindMapModel = model;
  }

  mindMapTitle.textContent = stripMarkdownExtension(doc.title || UNTITLED_NAME);
  mindMapSummary.textContent = `${renderModel.nodes.length}${renderModel.limited ? `/${model.nodes.length}` : ''} nodes · ${model.edges.length} connections · ${model.headings.length} headings · ${model.outgoingLinks.length} links${
    model.backlinks.length ? ` · ${model.backlinks.length} backlinks` : ''
  }${renderModel.limited ? ' · capped for smooth rendering' : ''}`;

  if (!renderModel.nodes.length) {
    mindMapCanvas.innerHTML = '<div class="graph-empty">No readable map nodes were found.</div>';
  } else {
    mindMapCanvas.innerHTML = renderMindMapSvg(renderModel, {
      searchQuery: query,
      viewportTransform: getMindMapTransform()
    });
  }

  const previewNode =
    renderModel.nodeById.get(mindMapPreviewNodeId) ||
    renderModel.nodeById.get('root') ||
    renderModel.nodes[0] ||
    null;
  mindMapPreviewNodeId = previewNode?.id || null;
  renderMindMapDetail(previewNode);
  renderMindMapList(renderModel, query);
  updateMindMapPreviewHighlight(mindMapPreviewNodeId);
}

function buildMindMapModel(doc, vaultDocs) {
  const nodes = [];
  const edges = [];
  const nodeById = new Map();
  const edgeKeys = new Set();
  const rootId = 'root';
  const resolver = createVaultLinkResolver(vaultDocs);
  const headings = extractMarkdownHeadings(doc.content).slice(0, MIND_MAP_HEADING_LIMIT);
  const allLinks = extractMarkdownLinks(doc.content);
  const outgoingLinks = dedupeMindMapLinks(allLinks, resolver).slice(0, MIND_MAP_LINK_LIMIT);
  const backlinks = doc?.path ? findBacklinks(doc, vaultDocs).slice(0, MIND_MAP_BACKLINK_LIMIT) : [];
  const tags = extractMarkdownTags(doc.content).slice(0, 80);
  const tasks = extractMarkdownTasks(doc.content).slice(0, MIND_MAP_TASK_LIMIT);

  function addNode(node) {
    if (nodeById.has(node.id)) return nodeById.get(node.id);
    const normalized = {
      depth: 0,
      order: nodes.length,
      type: 'note',
      detail: '',
      path: null,
      line: null,
      ...node
    };
    nodes.push(normalized);
    nodeById.set(normalized.id, normalized);
    return normalized;
  }

  function addEdge(source, target, type = 'branch') {
    if (!source || !target || source === target) return;
    const key = `${source}->${target}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ id: key, source, target, type });
  }

  function addGroup(id, label, detail, order) {
    const node = addNode({
      id,
      type: 'group',
      label,
      detail,
      depth: 1,
      order
    });
    addEdge(rootId, node.id, 'group');
    return node;
  }

  addNode({
    id: rootId,
    type: 'root',
    label: stripMarkdownExtension(doc.title || UNTITLED_NAME),
    detail: `${countWords(doc.content)} words · ${doc.path ? getDisplayPath(doc) : 'Unsaved note'}`,
    path: doc.path,
    line: 1,
    depth: 0,
    order: 0
  });

  if (headings.length) {
    const group = addGroup('group:headings', 'Headings', `${headings.length} outline item${headings.length === 1 ? '' : 's'}`, 10);
    const stack = [{ id: group.id, level: 0, depth: 1 }];
    headings.forEach((heading, index) => {
      while (stack.length > 1 && stack[stack.length - 1].level >= heading.level) {
        stack.pop();
      }
      const parent = stack[stack.length - 1];
      const id = `heading:${index}`;
      addNode({
        id,
        type: 'heading',
        label: heading.text,
        detail: `H${heading.level} · line ${heading.line}`,
        path: doc.path,
        line: heading.line,
        depth: parent.depth + 1,
        order: 100 + index
      });
      addEdge(parent.id, id, 'heading');
      stack.push({ id, level: heading.level, depth: parent.depth + 1 });
    });
  }

  if (outgoingLinks.length) {
    const group = addGroup('group:links', 'Links Out', `${outgoingLinks.length} linked note${outgoingLinks.length === 1 ? '' : 's'}`, 20);
    outgoingLinks.forEach((link, index) => {
      const resolvedLabel = link.resolvedDoc ? getDisplayPath(link.resolvedDoc) : link.target;
      const id = `link:${index}:${normalizeLinkTarget(link.target)}`;
      addNode({
        id,
        type: link.resolvedDoc ? 'link' : 'unresolved',
        label: resolvedLabel,
        detail: link.resolvedDoc ? 'Resolved note link' : 'Missing link',
        path: link.resolvedDoc?.path || null,
        depth: 2,
        order: 300 + index
      });
      addEdge(group.id, id, link.resolvedDoc ? 'link' : 'unresolved');
    });
  }

  if (backlinks.length) {
    const group = addGroup('group:backlinks', 'Links Here', `${backlinks.length} note${backlinks.length === 1 ? '' : 's'} mention this`, 30);
    backlinks.forEach((backlink, index) => {
      const id = `backlink:${index}:${backlink.doc.path}`;
      addNode({
        id,
        type: 'backlink',
        label: getDisplayPath(backlink.doc),
        detail: backlink.linkText || 'Backlink',
        path: backlink.doc.path,
        depth: 2,
        order: 500 + index
      });
      addEdge(group.id, id, 'backlink');
    });
  }

  if (tags.length) {
    const group = addGroup('group:tags', 'Tags', `${tags.length} tag${tags.length === 1 ? '' : 's'}`, 40);
    tags.forEach((tag, index) => {
      const id = `tag:${index}:${tag}`;
      addNode({
        id,
        type: 'tag',
        label: tag,
        detail: 'Tag',
        path: doc.path,
        depth: 2,
        order: 700 + index
      });
      addEdge(group.id, id, 'tag');
    });
  }

  if (tasks.length) {
    const group = addGroup('group:tasks', 'Tasks', `${tasks.length} task${tasks.length === 1 ? '' : 's'}`, 50);
    tasks.forEach((task, index) => {
      const id = `task:${index}:${task.line}`;
      addNode({
        id,
        type: task.checked ? 'task-done' : 'task',
        label: task.text,
        detail: `${task.checked ? 'Done' : 'Open'} · line ${task.line}`,
        path: doc.path,
        line: task.line,
        depth: 2,
        order: 900 + index
      });
      addEdge(group.id, id, 'task');
    });
  }

  if (nodes.length === 1) {
    addNode({
      id: 'empty:start',
      type: 'note',
      label: 'Start with headings, links, tags, or tasks',
      detail: 'The map updates as the Markdown changes',
      path: doc.path,
      line: 1,
      depth: 1,
      order: 10
    });
    addEdge(rootId, 'empty:start', 'branch');
  }

  return {
    doc,
    nodes,
    edges,
    nodeById,
    headings,
    outgoingLinks,
    backlinks,
    tags,
    tasks
  };
}

function dedupeMindMapLinks(links, resolver) {
  const seen = new Set();
  const deduped = [];

  for (const link of links) {
    const target = normalizeLinkTarget(link.target);
    if (!target || seen.has(target)) continue;
    seen.add(target);
    deduped.push({
      ...link,
      resolvedDoc: resolver(link.target)
    });
  }

  return deduped;
}

function createVaultLinkResolver(vaultDocs) {
  const keyToDoc = new Map();
  for (const doc of vaultDocs) {
    for (const key of getDocumentLinkKeys(doc)) {
      if (!keyToDoc.has(key)) keyToDoc.set(key, doc);
    }
  }
  return (target) => keyToDoc.get(normalizeLinkTarget(target)) || null;
}

function limitMindMapForRender(model, query) {
  if (model.nodes.length <= MIND_MAP_RENDER_NODE_LIMIT) {
    return { ...model, limited: false };
  }

  const normalizedQuery = String(query || '').trim().toLowerCase();
  const parentById = new Map(model.edges.map((edge) => [edge.target, edge.source]));
  const selectedIds = new Set(['root']);

  function includeWithParents(nodeId) {
    let current = nodeId;
    while (current && !selectedIds.has(current)) {
      selectedIds.add(current);
      current = parentById.get(current);
    }
  }

  for (const node of model.nodes) {
    if (node.type === 'group') selectedIds.add(node.id);
    if (normalizedQuery && mindMapNodeSearchText(node).includes(normalizedQuery)) {
      includeWithParents(node.id);
    }
  }

  const rankedNodes = [...model.nodes].sort((left, right) => {
    if (left.id === 'root') return -1;
    if (right.id === 'root') return 1;
    if (left.type === 'group' && right.type !== 'group') return -1;
    if (right.type === 'group' && left.type !== 'group') return 1;
    return left.depth - right.depth || left.order - right.order || left.label.localeCompare(right.label);
  });

  for (const node of rankedNodes) {
    if (selectedIds.size >= MIND_MAP_RENDER_NODE_LIMIT) break;
    includeWithParents(node.id);
  }

  const nodes = model.nodes.filter((node) => selectedIds.has(node.id));
  const edges = model.edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target));

  return {
    ...model,
    nodes,
    edges,
    nodeById: new Map(nodes.map((node) => [node.id, node])),
    limited: true
  };
}

function renderMindMapSvg(model, options = {}) {
  const layout = layoutMindMapNodes(model.nodes, model.edges);
  const searchQuery = String(options.searchQuery || '').trim().toLowerCase();
  const viewportTransform = options.viewportTransform ? ` transform="${escapeAttribute(options.viewportTransform)}"` : '';

  const edgeMarkup = model.edges
    .map((edge) => {
      const source = layout.positions.get(edge.source);
      const target = layout.positions.get(edge.target);
      if (!source || !target) return '';
      const sourceX = source.x + source.width;
      const sourceY = source.y + source.height / 2;
      const targetX = target.x;
      const targetY = target.y + target.height / 2;
      const controlX = Math.round((sourceX + targetX) / 2);
      return `<path class="mind-map-edge mind-map-edge-${escapeAttribute(edge.type)}" d="M ${sourceX} ${sourceY} C ${controlX} ${sourceY}, ${controlX} ${targetY}, ${targetX} ${targetY}" />`;
    })
    .join('');

  const nodeMarkup = model.nodes
    .map((node) => {
      const point = layout.positions.get(node.id);
      if (!point) return '';
      const matched = searchQuery && mindMapNodeSearchText(node).includes(searchQuery);
      const dimmed = searchQuery && !matched;
      const previewed = node.id === mindMapPreviewNodeId;
      const classes = ['mind-map-node', `mind-map-node-${node.type}`, matched ? 'matched' : '', dimmed ? 'dimmed' : '', previewed ? 'previewed' : '']
        .filter(Boolean)
        .join(' ');
      const label = truncateMindMapLabel(node.label, node.type === 'root' ? 30 : 32);
      const detail = truncateMindMapLabel(node.detail, 42);
      const title = escapeAttribute(`${node.label}${node.detail ? ` · ${node.detail}` : ''}`);
      const tabindex = previewed ? '0' : '-1';
      return `<g class="${classes}" role="button" tabindex="${tabindex}" aria-label="Open ${escapeAttribute(node.label)}" data-mind-map-node-id="${escapeAttribute(node.id)}" transform="translate(${point.x} ${point.y})">
        <title>${title}</title>
        <rect width="${point.width}" height="${point.height}" rx="8"></rect>
        <text class="mind-map-node-label" x="14" y="26">${escapeHtml(label)}</text>
        ${detail ? `<text class="mind-map-node-detail" x="14" y="49">${escapeHtml(detail)}</text>` : ''}
      </g>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="Document mind map">
    <g class="mind-map-viewport"${viewportTransform}>
      ${edgeMarkup}
      ${nodeMarkup}
    </g>
  </svg>`;
}

function layoutMindMapNodes(nodes, edges) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenById = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (!childrenById.has(edge.source) || !nodeById.has(edge.target)) continue;
    childrenById.get(edge.source).push(edge.target);
  }

  for (const children of childrenById.values()) {
    children.sort((leftId, rightId) => {
      const left = nodeById.get(leftId);
      const right = nodeById.get(rightId);
      return (left?.order || 0) - (right?.order || 0) || String(left?.label || '').localeCompare(String(right?.label || ''));
    });
  }

  const leafCountById = new Map();
  const rootId = nodeById.has('root') ? 'root' : nodes[0]?.id;
  const rowHeight = 86;
  const columnWidth = 268;
  const nodeWidth = 220;
  const nodeHeight = 66;
  const leftPadding = 54;
  const topPadding = 54;

  function measure(nodeId) {
    const children = childrenById.get(nodeId) || [];
    if (!children.length) {
      leafCountById.set(nodeId, 1);
      return 1;
    }
    const count = children.reduce((total, childId) => total + measure(childId), 0);
    leafCountById.set(nodeId, Math.max(1, count));
    return Math.max(1, count);
  }

  const totalLeaves = rootId ? measure(rootId) : Math.max(1, nodes.length);
  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth || 0), 0);
  const width = Math.max(1120, leftPadding * 2 + nodeWidth + maxDepth * columnWidth + 220);
  const height = Math.max(640, topPadding * 2 + totalLeaves * rowHeight);
  const positions = new Map();

  function place(nodeId, depth, topLeafIndex) {
    const children = childrenById.get(nodeId) || [];
    const leafCount = leafCountById.get(nodeId) || 1;
    const centerLeaf = topLeafIndex + leafCount / 2;
    const node = nodeById.get(nodeId);
    const x = Math.round(leftPadding + depth * columnWidth);
    const y = Math.round(topPadding + centerLeaf * rowHeight - nodeHeight / 2);
    positions.set(nodeId, {
      x,
      y,
      width: node?.type === 'root' ? 240 : nodeWidth,
      height: nodeHeight
    });

    let cursor = topLeafIndex;
    for (const childId of children) {
      place(childId, depth + 1, cursor);
      cursor += leafCountById.get(childId) || 1;
    }
  }

  if (rootId) {
    place(rootId, 0, 0);
  }

  return { positions, width, height };
}

function renderMindMapList(model, query) {
  const normalizedQuery = query.trim().toLowerCase();
  const nodes = model.nodes
    .filter((node) => node.type !== 'root' && (!normalizedQuery || mindMapNodeSearchText(node).includes(normalizedQuery)))
    .sort((left, right) => left.depth - right.depth || left.order - right.order || left.label.localeCompare(right.label))
    .slice(0, 180);

  mindMapList.innerHTML = nodes.length
    ? nodes
        .map((node) => {
          const previewed = node.id === mindMapPreviewNodeId;
          return `<button class="mind-map-list-node${previewed ? ' previewed' : ''}" type="button" role="option" data-mind-map-list-node-id="${escapeAttribute(node.id)}" aria-selected="${previewed}" tabindex="${previewed ? '0' : '-1'}">
            <span>${escapeHtml(truncateMindMapLabel(node.label, 42))}</span>
            <small>${escapeHtml(node.detail || mindMapNodeTypeLabel(node.type))}</small>
          </button>`;
        })
        .join('')
    : '<p class="sidebar-empty">No matching map nodes.</p>';
}

function previewMindMapNode(nodeId) {
  const node = lastMindMapModel?.nodeById?.get(nodeId);
  if (!node) return;
  mindMapPreviewNodeId = node.id;
  renderMindMapDetail(node);
  updateMindMapPreviewHighlight(node.id);
}

function updateMindMapPreviewHighlight(nodeId) {
  mindMapCanvas.querySelectorAll('[data-mind-map-node-id]').forEach((element) => {
    const previewed = element.dataset.mindMapNodeId === nodeId;
    element.classList.toggle('previewed', previewed);
    element.setAttribute('tabindex', previewed ? '0' : '-1');
  });
  mindMapList.querySelectorAll('[data-mind-map-list-node-id]').forEach((element) => {
    const previewed = element.dataset.mindMapListNodeId === nodeId;
    element.classList.toggle('previewed', previewed);
    element.setAttribute('tabindex', previewed ? '0' : '-1');
    element.setAttribute('aria-selected', previewed);
  });
}

function renderMindMapDetail(node) {
  if (!node) {
    mindMapDetail.innerHTML = '<p>Select or hover a map node to inspect source context.</p>';
    return;
  }

  const target = node.path ? getDocumentVaultRelativePath({ path: node.path, title: node.label }) : mindMapNodeTypeLabel(node.type);
  const source = Number.isFinite(node.line) ? `Line ${node.line}` : mindMapNodeTypeLabel(node.type);
  const action = node.path
    ? node.path === getActiveDocument()?.path
      ? 'Jump inside note'
      : 'Open linked note'
    : node.type === 'group'
      ? 'Section group'
      : 'No local target';
  const sourceAnchors = node.path
    ? renderSourceAnchorButtons(
        [
          {
            label: Number.isFinite(node.line) ? 'Jump to source line' : 'Open source note',
            detail: Number.isFinite(node.line) ? `Line ${node.line}` : 'Line 1',
            line: Number.isFinite(node.line) ? node.line : 1
          }
        ],
        node.path,
        'mind-map-source-actions'
      )
    : '';

  mindMapDetail.innerHTML = `<strong>${escapeHtml(truncateMindMapLabel(node.label, 56))}</strong>
    <div class="graph-detail-metrics">
      <span>${escapeHtml(mindMapNodeTypeLabel(node.type))}</span>
      <span>${escapeHtml(source)}</span>
      <span>${node.depth || 0} deep</span>
    </div>
    <p>${escapeHtml(target)}</p>
    <p>${escapeHtml(node.detail || action)}</p>
    ${sourceAnchors}`;
}

function openMindMapNode(nodeId) {
  const model = lastMindMapModel || buildMindMapModel(getActiveDocument(), getVaultDocuments());
  const node = model?.nodeById?.get(nodeId);
  if (!node) return;

  if (node.path) {
    openDocumentSourceAtLine(node.path, Number.isFinite(node.line) ? node.line : 1, { closeMindMap: true });
    return;
  }

  if (node.type === 'group') return;
  showToast('This map node has no local file target yet.');
}

function getMindMapTransform() {
  return `translate(${Math.round(mindMapPan.x)} ${Math.round(mindMapPan.y)}) scale(${roundGraphNumber(mindMapZoom)})`;
}

function setMindMapZoom(nextZoom) {
  mindMapZoom = Math.max(0.45, Math.min(2.8, Number(nextZoom) || 1));
  applyMindMapViewport();
}

function resetMindMapViewport() {
  mindMapZoom = 1;
  mindMapPan = { x: 0, y: 0 };
  applyMindMapViewport();
}

function applyMindMapViewport() {
  mindMapCanvas.querySelector('.mind-map-viewport')?.setAttribute('transform', getMindMapTransform());
}

function handleMindMapWheel(event) {
  if (mindMapModal.hidden) return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.08 : 0.08;
  setMindMapZoom(mindMapZoom + delta);
}

function handleMindMapPointerDown(event) {
  if (event.target.closest('[data-mind-map-node-id]')) return;
  mindMapDragging = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    pan: { ...mindMapPan }
  };
  mindMapStage.setPointerCapture(event.pointerId);
  mindMapStage.classList.add('dragging');
}

function handleMindMapPointerMove(event) {
  if (!mindMapDragging || mindMapDragging.pointerId !== event.pointerId) return;
  mindMapPan = {
    x: mindMapDragging.pan.x + event.clientX - mindMapDragging.x,
    y: mindMapDragging.pan.y + event.clientY - mindMapDragging.y
  };
  applyMindMapViewport();
}

function endMindMapDrag(event) {
  if (!mindMapDragging || mindMapDragging.pointerId !== event.pointerId) return;
  mindMapDragging = null;
  mindMapStage.classList.remove('dragging');
  if (mindMapStage.hasPointerCapture(event.pointerId)) {
    mindMapStage.releasePointerCapture(event.pointerId);
  }
}

async function copyMindMapContext() {
  const content = buildMindMapContextMarkdown();
  if (!content) {
    showToast('Open a note before copying a note map.');
    return;
  }

  await navigator.clipboard.writeText(content);
  showToast('Note map copied for Claude.');
}

function createMindMapContextDocument() {
  const content = buildMindMapContextMarkdown();
  const activeDocument = getActiveDocument();
  if (!content || !activeDocument) {
    showToast('Open a note before saving a map note.');
    return;
  }

  const doc = createDocument({
    title: `${stripMarkdownExtension(activeDocument.title || 'Document')} Note Map.md`,
    content,
    dirty: true
  });

  documents.push(doc);
  if (!mindMapModal.hidden) {
    mindMapModal.hidden = true;
  }
  activateDocument(doc.id);
  persistSession();
  showToast('Map note created.');
}

function buildMindMapContextMarkdown() {
  const doc = getActiveDocument();
  if (!doc) return '';

  const model = buildMindMapModel(doc, getVaultDocuments());
  const generatedAt = new Date().toISOString();
  const lines = [
    `# ${stripMarkdownExtension(doc.title || UNTITLED_NAME)} Note Map Context`,
    '',
    `Generated: ${generatedAt}`,
    `Source: ${doc.path ? getDisplayPath(doc) : doc.title}`,
    `Words: ${countWords(doc.content)}`,
    `Nodes: ${model.nodes.length}`,
    `Connections: ${model.edges.length}`,
    '',
    '## Use With Claude',
    '',
    'Paste this map into Claude when you want help reorganizing, expanding, or auditing this note. It was generated locally from Markdown headings, links, backlinks, tags, and tasks.',
    '',
    '## Outline',
    ''
  ];

  if (model.headings.length) {
    for (const heading of model.headings) {
      lines.push(`${'  '.repeat(Math.max(0, heading.level - 1))}- ${heading.text} (line ${heading.line})`);
    }
  } else {
    lines.push('- No headings found.');
  }

  lines.push('', '## Links Out', '');
  if (model.outgoingLinks.length) {
    for (const link of model.outgoingLinks) {
      lines.push(`- ${link.target}${link.resolvedDoc ? ` -> ${getDisplayPath(link.resolvedDoc)}` : ' (unresolved)'}`);
    }
  } else {
    lines.push('- No outgoing note links found.');
  }

  lines.push('', '## Links Here', '');
  if (model.backlinks.length) {
    for (const backlink of model.backlinks) {
      lines.push(`- ${getDisplayPath(backlink.doc)} (${backlink.linkText || 'backlink'})`);
    }
  } else {
    lines.push('- No links back to this note were found in the open folder.');
  }

  lines.push('', '## Tags', '');
  lines.push(model.tags.length ? model.tags.map((tag) => `- ${tag}`).join('\n') : '- No tags found.');

  lines.push('', '## Tasks', '');
  if (model.tasks.length) {
    for (const task of model.tasks) {
      lines.push(`- [${task.checked ? 'x' : ' '}] ${task.text} (line ${task.line})`);
    }
  } else {
    lines.push('- No tasks found.');
  }

  lines.push('', '## Map Nodes', '');
  for (const node of model.nodes.filter((candidate) => candidate.type !== 'root').slice(0, MIND_MAP_RENDER_NODE_LIMIT)) {
    lines.push(`- ${mindMapNodeTypeLabel(node.type)}: ${node.label}${node.detail ? ` — ${node.detail}` : ''}`);
  }
  if (model.nodes.length - 1 > MIND_MAP_RENDER_NODE_LIMIT) {
    lines.push(`- ...${model.nodes.length - 1 - MIND_MAP_RENDER_NODE_LIMIT} more map nodes`);
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function mindMapNodeSearchText(node) {
  return `${node.label || ''} ${node.detail || ''} ${node.type || ''}`.toLowerCase();
}

function mindMapNodeTypeLabel(type) {
  const labels = {
    group: 'Group',
    heading: 'Heading',
    link: 'Link',
    unresolved: 'Missing Link',
    backlink: 'Backlink',
    tag: 'Tag',
    task: 'Task',
    'task-done': 'Done Task',
    note: 'Note',
    root: 'Root'
  };
  return labels[type] || 'Node';
}

function truncateMindMapLabel(label, maxLength = 36) {
  const normalized = String(label || 'Untitled').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 3)).trim()}...`;
}

function createDocument({
  id = crypto.randomUUID(),
  title,
  path = null,
  relativePath = null,
  content = '',
  dirty = false,
  lastSavedAt = null,
  fileState = null
}) {
  return {
    id,
    title: title || path?.split(/[\\/]/).pop() || UNTITLED_NAME,
    path,
    relativePath,
    content,
    dirty,
    lastSavedAt,
    fileState: normalizeFileState(fileState)
  };
}

function createUntitledDocument() {
  const title = nextUntitledName();
  const name = title.replace(/\.md$/i, '');
  const doc = createDocument({
    title,
    content: `# ${name}\n\nStart writing here.\n\n## Quick Start\n\n- Write notes in Markdown\n- Create [[links]] to other notes\n- Add tasks with the Task button\n- Open Note Map to visualize this note\n\n`,
    dirty: true
  });

  documents.push(doc);
  activateDocument(doc.id);
  persistSession();
  showToast('New note created. Start writing!');
}

function createDailyNote() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const title = `${dateStr}.md`;

  // Check if today's note already exists
  const existing = documents.find((d) => d.title === title || d.path?.endsWith(`/${title}`));
  if (existing) {
    activateDocument(existing.id);
    showToast('Switched to today\'s note.');
    return;
  }

  const template = `# ${dayName}, ${monthDay}

## Tasks

- [ ]
- [ ]
- [ ]

## Notes



## Goals

-

## Log

- ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — Started daily note

`;

  const doc = createDocument({ title, content: template, dirty: true });
  documents.push(doc);
  activateDocument(doc.id);
  persistSession();
  showToast(`Daily note created: ${dateStr}`);
}

async function createVaultFileFromPrompt() {
  if (!activeVault?.path) {
    showToast('Open a folder before creating a note.');
    return;
  }

  const suggestedPath = nextVaultFileName();
  const relativePath = prompt('New note name or path', suggestedPath);
  if (!relativePath) return;

  try {
    const noteName = relativePath.replace(/\.(md|markdown|mdown|mkd|txt)$/i, '').split('/').pop() || 'Untitled';
    const file = await native.createVaultFile({
      rootPath: activeVault.path,
      relativePath,
      content: `# ${noteName}\n\n`
    });
    addOpenedDocuments([file], { source: 'vault' });
    renderVaultSidebar();
    persistSession();
    showToast(`${file.relativePath || file.name} created.`);
  } catch (error) {
    showToast(`Create failed: ${error.message}`);
  }
}

async function renameActiveVaultFileFromPrompt() {
  const doc = getActiveDocument();
  if (!isDocumentInActiveVault(doc)) {
    showToast('Select a note from the folder before renaming.');
    return;
  }

  if (doc.dirty) {
    showToast('Save or discard changes before renaming this file.');
    return;
  }

  const currentRelativePath = getDocumentVaultRelativePath(doc);
  const nextRelativePath = prompt('Rename or move note', currentRelativePath);
  if (!nextRelativePath || nextRelativePath === currentRelativePath) return;

  try {
    const file = await native.renameVaultFile({
      rootPath: activeVault.path,
      currentRelativePath,
      nextRelativePath
    });

    applyVaultFileRecordToDocument(doc, file);
    activateDocument(doc.id);
    persistSession();
    showToast(`${currentRelativePath} renamed to ${file.relativePath || file.name}.`);
  } catch (error) {
    showToast(`Rename failed: ${error.message}`);
  }
}

async function deleteActiveVaultFileWithConfirmation() {
  const doc = getActiveDocument();
  if (!isDocumentInActiveVault(doc)) {
    showToast('Select a note from the folder before deleting.');
    return;
  }

  if (doc.dirty) {
    showToast('Save or discard changes before moving this file to Trash.');
    return;
  }

  const relativePath = getDocumentVaultRelativePath(doc);
  const deleteLabel = native.platform === 'browser' ? `Delete ${relativePath} from this folder?` : `Move ${relativePath} to Trash?`;
  const confirmed = confirm(deleteLabel);
  if (!confirmed) return;

  try {
    const result = await native.deleteVaultFile({
      rootPath: activeVault.path,
      relativePath
    });
    removeDocumentAfterVaultDelete(doc.id);
    showToast(result?.trash === false ? `${relativePath} deleted.` : `${relativePath} moved to Trash.`);
  } catch (error) {
    showToast(`Delete failed: ${error.message}`);
  }
}

function nextVaultFileName() {
  const existing = new Set(getVaultDocuments().map((doc) => getDisplayPath(doc).toLowerCase()));
  let index = 1;
  let candidate = 'Untitled.md';

  while (existing.has(candidate.toLowerCase())) {
    index += 1;
    candidate = `Untitled ${index}.md`;
  }

  return candidate;
}

function applyVaultFileRecordToDocument(doc, file) {
  doc.title = file.name;
  doc.path = file.path;
  doc.relativePath = file.relativePath || file.name;
  doc.content = String(file.content ?? doc.content ?? '');
  doc.dirty = false;
  doc.lastSavedAt = file.lastSavedAt;
  doc.fileState = normalizeFileState(file.fileState);
  doc.externalFileState = null;
}

function removeDocumentAfterVaultDelete(documentId) {
  const deletedIndex = documents.findIndex((candidate) => candidate.id === documentId);
  if (deletedIndex === -1) return;

  documents.splice(deletedIndex, 1);

  if (!documents.length) {
    documents.push(
      createDocument({
        title: UNTITLED_NAME,
        content: '',
        dirty: false
      })
    );
  }

  const nextDocument = documents[Math.min(deletedIndex, documents.length - 1)];
  activateDocument(nextDocument.id);
  persistSession();
  syncNativeDocumentState();
}

function nextUntitledName() {
  const untitledCount = documents.filter((doc) => doc.title.startsWith('Untitled')).length;
  return untitledCount ? `Untitled ${untitledCount + 1}.md` : UNTITLED_NAME;
}

async function openFromDialog() {
  const opened = await native.openDialog();
  addOpenedDocuments(opened);
  void refreshRecentItems();
}

async function openVaultFromDialog() {
  try {
    const vault = await native.openVault();
    applyOpenedVault(vault);
    void refreshRecentItems();
  } catch (error) {
    showToast(`Open folder failed: ${error.message}`);
  }
}

function applyOpenedVault(vault) {
  if (!vault?.path) {
    return false;
  }

  const vaultFiles = Array.isArray(vault.files) ? vault.files : [];
  activeVault = {
    path: vault.path,
    name: vault.name,
    openedAt: Date.now()
  };

  addOpenedDocuments(vaultFiles, { source: 'vault' });
  renderVaultSidebar();
  persistSession();
  showToast(
    vaultFiles.length
      ? `${vaultFiles.length} note${vaultFiles.length === 1 ? '' : 's'} found.`
      : 'Folder opened. Create a Markdown note to start.'
  );
  return true;
}

async function openRecentFile(recentId) {
  const recent = getRecentItem('file', recentId);
  if (recent?.path) {
    const existing = documents.find((doc) => doc.path === recent.path);
    if (existing) {
      activateDocument(existing.id);
      return;
    }
  }

  try {
    const opened = await native.openRecentFile(recentId);
    addOpenedDocuments(opened, { source: 'recent' });
    void refreshRecentItems();
  } catch (error) {
    showToast(`Recent file failed: ${error.message}`);
  }
}

async function openRecentVault(recentId) {
  try {
    const vault = await native.openRecentVault(recentId);
    if (applyOpenedVault(vault)) {
      void refreshRecentItems();
    }
  } catch (error) {
    showToast(`Recent vault failed: ${error.message}`);
  }
}

function handleSidebarRecentWorkClick(event) {
  const button = event.target.closest('[data-sidebar-recent-id]');
  if (!button) return;

  if (button.dataset.sidebarRecentType === 'vault') {
    openRecentVault(button.dataset.sidebarRecentId);
    return;
  }

  if (button.dataset.sidebarRecentType === 'file') {
    openRecentFile(button.dataset.sidebarRecentId);
  }
}

function handleActivitySurface(surface) {
  setActivitySurface(surface || 'workspace');

  if (surface === 'search') {
    openGlobalSearch();
    return;
  }

  if (surface === 'graph') {
    openFullGraph();
    return;
  }

  if (surface === 'context') {
    openMindMapCanvas();
    return;
  }

  if (surface === 'command') {
    openCommandPalette();
    return;
  }

  if (surface === 'publish') {
    publishStaticSite();
  }
}

function setActivitySurface(surface) {
  const activeSurface = ['workspace', 'search', 'graph', 'context', 'command', 'publish'].includes(surface) ? surface : 'workspace';
  activityButtons.forEach((button) => {
    const active = button.dataset.activitySurface === activeSurface;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function addOpenedDocuments(opened, options = {}) {
  if (!opened?.length) return;

  const canReplaceStarter =
    documents.length === 1 &&
    !documents[0].path &&
    !documents[0].dirty &&
    documents[0].content === sampleMarkdown;

  if (canReplaceStarter) {
    documents = [];
  }

  const changedDocuments = [];
  const skippedDirty = [];

  for (const file of opened) {
    const existing = documents.find((doc) => doc.path === file.path);

    if (existing?.dirty) {
      skippedDirty.push(existing.title);
      continue;
    }

    if (existing) {
      existing.title = file.name;
      existing.content = file.content;
      existing.dirty = false;
      existing.lastSavedAt = file.lastSavedAt;
      existing.fileState = normalizeFileState(file.fileState);
      existing.relativePath = file.relativePath || existing.relativePath || file.name;
      existing.externalFileState = null;
      changedDocuments.push(existing);
      continue;
    }

    const doc = createDocument({
      title: file.name,
      path: file.path,
      relativePath: file.relativePath || file.name,
      content: file.content,
      dirty: false,
      lastSavedAt: file.lastSavedAt,
      fileState: file.fileState
    });

    documents.push(doc);
    changedDocuments.push(doc);
  }

  if (!changedDocuments.length) {
    showToast(`Skipped ${skippedDirty.length} dirty open document${skippedDirty.length === 1 ? '' : 's'}.`);
    return;
  }

  activateDocument(changedDocuments[0].id);
  persistSession();

  const skippedMessage = skippedDirty.length ? ` ${skippedDirty.length} dirty duplicate skipped.` : '';
  if (options.source !== 'vault') {
    showToast(`${changedDocuments.length} file${changedDocuments.length === 1 ? '' : 's'} opened.${skippedMessage}`);
  }
}

function activateDocumentByPath(filePath) {
  const doc = documents.find((candidate) => candidate.path === filePath);
  if (!doc) return;
  activateDocument(doc.id);
}

function renderVaultSidebar() {
  const vaultDocs = getVaultDocuments();
  const activeDocument = getActiveDocument();
  const hasOpenVault = Boolean(activeVault?.path);
  const query = vaultSearchInput.value.trim().toLowerCase();
  const filteredDocs = query
    ? vaultDocs.filter((doc) => {
        const pathText = getDisplayPath(doc).toLowerCase();
        return pathText.includes(query) || doc.content.toLowerCase().includes(query);
      })
    : vaultDocs;

  const sidebar = document.getElementById('vault-sidebar');
  if (sidebar) sidebar.dataset.vaultState = hasOpenVault ? 'open' : 'recent';
  renderSidebarRecentWork(hasOpenVault);

  vaultNameLabel.textContent = activeVault?.name || 'Recent Work';
  vaultCountLabel.textContent = hasOpenVault
    ? `${vaultDocs.length} file${vaultDocs.length === 1 ? '' : 's'}`
    : `${recentItems.vaults.length + recentItems.files.length} recent`;
  setDisabled(newVaultFileButton, !hasOpenVault);
  setDisabled(renameVaultFileButton, !isDocumentInActiveVault(activeDocument));
  setDisabled(deleteVaultFileButton, !isDocumentInActiveVault(activeDocument));

  // Hide empty sections on mobile for compact sidebar
  const searchBox = vaultSearchInput.closest('.vault-search');
  const outlineSection = outlineList.closest('.sidebar-section');
  const backlinkSection = backlinkList.closest('.sidebar-section');
  const graphSection = graphCanvas.closest('.sidebar-section');
  if (searchBox) searchBox.hidden = !hasOpenVault;

  if (!hasOpenVault) {
    const headings = activeDocument ? extractMarkdownHeadings(activeDocument.content) : [];
    vaultFileList.innerHTML = renderNoRepositoryPanel();
    outlineList.innerHTML = headings.length
      ? headings
          .map((heading) => {
            const indent = Math.max(0, heading.level - 1);
            return `<button class="outline-item" type="button" data-outline-line="${heading.line}" style="--depth: ${indent}">
              <span>${escapeHtml(heading.text)}</span>
            </button>`;
          })
          .join('')
      : '';
    backlinkList.innerHTML = '';
    if (outlineSection) outlineSection.hidden = !headings.length;
    if (backlinkSection) backlinkSection.hidden = true;
    if (graphSection) graphSection.hidden = true;
    renderGraphPanel([], null);
    renderFullGraph();
    renderWorkspaceShell();
    createIcons({ icons });
    return;
  }

  if (!vaultDocs.length) {
    vaultFileList.innerHTML = '<div class="sidebar-empty-panel"><p>No Markdown files were found in this folder.</p><button class="sidebar-action primary" type="button" data-empty-new-file>Create Note</button></div>';
    outlineList.innerHTML = '';
    backlinkList.innerHTML = '';
    if (outlineSection) outlineSection.hidden = true;
    if (backlinkSection) backlinkSection.hidden = true;
    if (graphSection) graphSection.hidden = true;
    renderGraphPanel([], null);
    renderFullGraph();
    renderWorkspaceShell();
    createIcons({ icons });
    return;
  }

  if (outlineSection) outlineSection.hidden = false;
  if (backlinkSection) backlinkSection.hidden = false;
  if (graphSection) graphSection.hidden = false;

  vaultFileList.innerHTML = filteredDocs.length
    ? renderVaultFileTree(filteredDocs, activeDocument, query)
    : '<p class="sidebar-empty">No matching files.</p>';
  createIcons({ icons });

  const headings = activeDocument ? extractMarkdownHeadings(activeDocument.content) : [];
  outlineList.innerHTML = headings.length
    ? headings
        .map((heading) => {
          const indent = Math.max(0, heading.level - 1);
          return `<button class="outline-item" type="button" data-outline-line="${heading.line}" style="--depth: ${indent}">
            <span>${escapeHtml(heading.text)}</span>
          </button>`;
        })
        .join('')
    : '<p class="sidebar-empty">No headings in this document.</p>';

  const backlinks = activeDocument ? findBacklinks(activeDocument, vaultDocs) : [];
  backlinkList.innerHTML = backlinks.length
    ? backlinks
        .map((backlink) => {
          const label = escapeHtml(getDisplayPath(backlink.doc));
          const linkText = escapeHtml(backlink.linkText);
          return `<button class="backlink-item" type="button" data-backlink-path="${escapeAttribute(backlink.doc.path)}">
            <span>${label}</span>
            <small>${linkText}</small>
          </button>`;
        })
        .join('')
    : '<p class="sidebar-empty">No backlinks to this file.</p>';

  renderGraphPanel(vaultDocs, activeDocument);
  renderFullGraph();
  renderWorkspaceShell();
  createIcons({ icons });
}

function renderSidebarRecentWork(hasOpenVault) {
  const recentVaults = recentItems.vaults.slice(0, hasOpenVault ? 3 : 6);
  const recentFiles = recentItems.files.slice(0, hasOpenVault ? 2 : 6);
  const items = [
    ...recentVaults.map((item) => renderSidebarRecentWorkItem(item, 'vault')),
    ...recentFiles.map((item) => renderSidebarRecentWorkItem(item, 'file'))
  ];

  recentWorkList.innerHTML = items.length
    ? items.join('')
    : '<p class="sidebar-empty">Recent folders and Markdown files will appear here after you open them.</p>';

  if (startRecentList) {
    const startItems = [
      ...recentItems.vaults.slice(0, 5).map((item) => renderSidebarRecentWorkItem(item, 'vault')),
      ...recentItems.files.slice(0, 5).map((item) => renderSidebarRecentWorkItem(item, 'file'))
    ];
    startRecentList.innerHTML = startItems.length
      ? startItems.join('')
      : '<p class="sidebar-empty">Open a folder or file and it will stay one click away here.</p>';
  }
}

function renderSidebarRecentWorkItem(item, type) {
  const icon = type === 'vault' ? 'folder-open' : 'file-text';
  const typeLabel = type === 'vault' ? 'Folder' : 'File';
  const title = escapeHtml(item.name || typeLabel);
  const pathLabel = escapeHtml(formatSidebarPath(item.path));
  return `<button class="recent-work-item" type="button" data-sidebar-recent-type="${type}" data-sidebar-recent-id="${escapeAttribute(item.id)}" title="${escapeAttribute(item.path)}">
    <i data-lucide="${icon}" aria-hidden="true"></i>
    <span>
      <strong>${title}</strong>
      <small>${typeLabel} · ${pathLabel}</small>
    </span>
  </button>`;
}

function renderNoRepositoryPanel() {
  return `<div class="sidebar-empty-panel">
    <strong>Open a folder to browse your Markdown notes.</strong>
    <p>Select a note, search file names and content, then use Folder Map or Note Map when you need structure.</p>
  </div>`;
}

function renderWorkspaceShell() {
  const doc = getActiveDocument();
  const vaultDocs = getVaultDocuments();
  const headings = doc ? extractMarkdownHeadings(doc.content) : [];
  const backlinks = doc?.path ? findBacklinks(doc, vaultDocs) : [];
  const outgoingLinks = doc ? extractMarkdownLinks(doc.content) : [];
  const tags = doc ? extractMarkdownTags(doc.content) : [];
  const tasks = doc ? extractMarkdownTasks(doc.content) : [];
  const title = doc?.title || 'No Document';
  const displayPath = doc ? doc.path || 'Unsaved local note' : 'No file selected';

  if (documentTitleLabel) documentTitleLabel.textContent = title;
  if (documentLocationLabel) documentLocationLabel.textContent = formatSidebarPath(displayPath);
  if (inspectorDocumentTitle) inspectorDocumentTitle.textContent = title;
  if (inspectorDocumentPath) inspectorDocumentPath.textContent = displayPath;
  if (inspectorDocumentState) {
    inspectorDocumentState.textContent = doc?.dirty ? 'Unsaved' : 'Saved';
    inspectorDocumentState.classList.toggle('dirty', Boolean(doc?.dirty));
  }

  if (inspectorMetrics) {
    const metrics = [
      ['Words', countWords(doc?.content || '')],
      ['Headings', headings.length],
      ['Links', outgoingLinks.length],
      ['Links Here', backlinks.length],
      ['Tags', tags.length],
      ['Tasks', tasks.length]
    ];
    inspectorMetrics.innerHTML = metrics
      .map(([label, value]) => `<span><strong>${value}</strong><small>${label}</small></span>`)
      .join('');
  }

  if (workspaceStart) {
    workspaceStart.hidden = !shouldShowWorkspaceStart();
  }

  const hasDocument = Boolean(doc);
  const hasVault = Boolean(vaultDocs.length);
  setDisabled(documentSaveButton, !hasDocument);
  setDisabled(documentMindMapButton, !hasDocument);
  setDisabled(documentGraphButton, !hasVault, 'Open a folder to create a map.');
  setDisabled(inspectorOpenMindMapButton, !hasDocument);
  setDisabled(inspectorOpenGraphButton, !hasVault, 'Open a folder to create a map.');
  setDisabled(inspectorCopyContextButton, !hasVault, 'Open a folder before copying context for AI.');
  setDisabled(inspectorNewContextButton, !hasVault, 'Open a folder before saving a context note.');
}

function shouldShowWorkspaceStart() {
  if (activeVault?.path) return false;
  if (documents.some((doc) => doc.path)) return false;
  if (documents.some((doc) => doc.dirty)) return false;
  if (documents.length !== 1) return false;

  const doc = documents[0];
  const content = String(doc?.content || '').trim();
  return !content || content === sampleMarkdown.trim();
}

function formatSidebarPath(filePath) {
  const normalized = String(filePath || '').replaceAll('\\', '/');
  const homeMatch = normalized.match(/^\/Users\/[^/]+\//);
  const compact = homeMatch ? `~/${normalized.slice(homeMatch[0].length)}` : normalized;
  if (compact.length <= 52) return compact;
  return `…${compact.slice(-51)}`;
}

function renderVaultFileTree(docs, activeDocument, query) {
  const tree = buildVaultFileTree(docs);
  const forcedExpanded = getForcedExpandedVaultFolders(docs, activeDocument, query);
  const html = renderVaultTreeChildren(tree.children, 0, activeDocument, forcedExpanded);
  return html || '<p class="sidebar-empty">No matching files.</p>';
}

function buildVaultFileTree(docs) {
  const root = {
    type: 'folder',
    name: '',
    path: '',
    children: new Map(),
    fileCount: 0
  };

  for (const doc of docs) {
    const parts = getDisplayPath(doc).split(/[\\/]/).filter(Boolean);
    const fileName = parts.pop() || doc.title || UNTITLED_NAME;
    let folder = root;
    folder.fileCount += 1;

    parts.forEach((part, index) => {
      const folderPath = parts.slice(0, index + 1).join('/');
      if (!folder.children.has(part)) {
        folder.children.set(part, {
          type: 'folder',
          name: part,
          path: folderPath,
          children: new Map(),
          fileCount: 0
        });
      }
      folder = folder.children.get(part);
      folder.fileCount += 1;
    });

    folder.children.set(`file:${doc.path || doc.id}`, {
      type: 'file',
      name: fileName,
      path: doc.path,
      doc
    });
  }

  return root;
}

function renderVaultTreeChildren(children, depth, activeDocument, forcedExpanded) {
  return [...children.values()]
    .sort(sortVaultTreeNode)
    .map((node) => renderVaultTreeNode(node, depth, activeDocument, forcedExpanded))
    .join('');
}

function renderVaultTreeNode(node, depth, activeDocument, forcedExpanded) {
  if (node.type === 'file') {
    const active = node.doc.id === activeDocument?.id ? ' active' : '';
    const dirty = node.doc.dirty ? '<span class="dirty-dot" aria-hidden="true"></span>' : '';
    return `<button class="vault-file vault-tree-file${active}" type="button" data-vault-file-path="${escapeAttribute(node.doc.path)}" style="--depth: ${depth}">
      <i data-lucide="file-text" aria-hidden="true"></i>
      <span>${escapeHtml(node.name)}</span>
      ${dirty}
    </button>`;
  }

  const expanded = forcedExpanded.has(node.path) || vaultExpandedFolders.has(node.path);
  const icon = expanded ? 'chevron-down' : 'chevron-right';
  const childMarkup = expanded ? renderVaultTreeChildren(node.children, depth + 1, activeDocument, forcedExpanded) : '';
  return `<div class="vault-tree-folder">
    <button class="vault-folder" type="button" data-vault-folder-path="${escapeAttribute(node.path)}" style="--depth: ${depth}" aria-expanded="${expanded}">
      <i data-lucide="${icon}" aria-hidden="true"></i>
      <span>${escapeHtml(node.name)}</span>
      <small>${node.fileCount}</small>
    </button>
    ${childMarkup ? `<div class="vault-tree-children">${childMarkup}</div>` : ''}
  </div>`;
}

function sortVaultTreeNode(left, right) {
  if (left.type !== right.type) return left.type === 'folder' ? -1 : 1;
  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
}

function getForcedExpandedVaultFolders(docs, activeDocument, query) {
  const folders = new Set();
  if (query) {
    for (const doc of docs) {
      addVaultFolderAncestors(folders, getDisplayPath(doc));
    }
  }
  if (activeDocument) {
    addVaultFolderAncestors(folders, getDisplayPath(activeDocument));
  }
  return folders;
}

function addVaultFolderAncestors(target, displayPath) {
  const parts = String(displayPath || '').split(/[\\/]/).filter(Boolean);
  parts.pop();
  for (let index = 1; index <= parts.length; index += 1) {
    target.add(parts.slice(0, index).join('/'));
  }
}

function toggleVaultFolder(folderPath) {
  if (!folderPath) return;
  if (vaultExpandedFolders.has(folderPath)) {
    vaultExpandedFolders.delete(folderPath);
  } else {
    vaultExpandedFolders.add(folderPath);
  }
  renderVaultSidebar();
  schedulePersist();
}

function renderGraphPanel(vaultDocs, activeDocument) {
  renderGraphModeControls();
  setDisabled(openFullGraphButton, !vaultDocs.length);
  setDisabled(copyAiMapButton, !vaultDocs.length);
  setDisabled(newAiMapButton, !vaultDocs.length);
  setDisabled(copyAiMapGraphButton, !vaultDocs.length);
  setDisabled(newAiMapGraphButton, !vaultDocs.length);
  setDisabled(exportGraphContextButton, !vaultDocs.length);

  if (!vaultDocs.length) {
    graphSummary.textContent = 'Open a folder to map notes.';
    graphCanvas.innerHTML = '<div class="graph-empty">Open a folder to build a note map.</div>';
    return;
  }

  const graph = buildVaultGraph(vaultDocs);
  const visibleGraph = getVisibleGraph(graph, activeDocument);
  const renderGraph = limitGraphForRender(visibleGraph, activeDocument?.path);
  const unresolvedCount = graph.unresolvedLinks.length;
  const scopeLabel = graphMode === 'global' ? 'all notes' : 'near this note';
  const visibleCount =
    renderGraph.nodes.length === visibleGraph.nodes.length ? `${visibleGraph.nodes.length}` : `${renderGraph.nodes.length}/${visibleGraph.nodes.length}`;
  graphSummary.textContent = `${visibleCount} ${scopeLabel} notes · ${visibleGraph.edges.length} links${
    unresolvedCount ? ` · ${unresolvedCount} missing` : ''
  }${renderGraph.limited ? ' · capped for speed' : ''}`;

  if (!renderGraph.nodes.length) {
    graphCanvas.innerHTML = '<div class="graph-empty">No connected notes for this map view.</div>';
    return;
  }

  graphCanvas.innerHTML = renderGraphSvg(renderGraph, activeDocument);
}

function renderGraphModeControls() {
  graphModeButtons.forEach((button) => {
    const active = button.dataset.graphMode === graphMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function setGraphMode(nextMode) {
  graphMode = VALID_GRAPH_MODES.has(nextMode) ? nextMode : 'local';
  renderVaultSidebar();
  schedulePersist();
}

function buildVaultGraph(vaultDocs) {
  const nodes = vaultDocs.map((doc) => {
    const displayPath = getDisplayPath(doc);
    const canvasModel = parseJsonCanvasDocument(doc.content);
    return {
      id: doc.path,
      path: doc.path,
      label: displayPath,
      doc,
      extension: getDocumentExtension(doc),
      hasMedia: documentHasMediaReferences(doc.content),
      hasCanvas: documentHasCanvasReferences(doc.content, displayPath) || Boolean(canvasModel),
      canvasCards: canvasModel ? canvasModel.nodes.length : 0,
      canvasEdges: canvasModel ? canvasModel.edges.length : 0,
      incoming: 0,
      outgoing: 0
    };
  });
  const nodeByPath = new Map(nodes.map((node) => [node.path, node]));
  const keyToNode = new Map();
  const edges = [];
  const edgeKeys = new Set();
  const unresolvedLinks = [];

  for (const node of nodes) {
    for (const key of getDocumentLinkKeys(node.doc)) {
      if (!keyToNode.has(key)) {
        keyToNode.set(key, node);
      }
    }
  }

  for (const sourceNode of nodes) {
    for (const link of extractDocumentGraphLinks(sourceNode.doc)) {
      const targetNode = resolveGraphTargetNode(link.target, sourceNode.doc, keyToNode);

      if (!targetNode) {
        unresolvedLinks.push({
          source: sourceNode.path,
          target: link.target,
          text: link.text || link.target,
          kind: link.kind || 'link'
        });
        continue;
      }

      addGraphEdge(edges, edgeKeys, sourceNode, targetNode, link.text || link.target, link.kind || 'link');
    }

    for (const canvasEdge of extractJsonCanvasConnectionEdges(sourceNode.doc.content)) {
      const sourceTargetNode = resolveGraphTargetNode(canvasEdge.sourceTarget, sourceNode.doc, keyToNode);
      const targetTargetNode = resolveGraphTargetNode(canvasEdge.targetTarget, sourceNode.doc, keyToNode);

      if (!sourceTargetNode || !targetTargetNode) {
        unresolvedLinks.push({
          source: sourceNode.path,
          target: !sourceTargetNode ? canvasEdge.sourceTarget : canvasEdge.targetTarget,
          text: canvasEdge.text,
          kind: 'canvas-edge'
        });
        continue;
      }

      addGraphEdge(edges, edgeKeys, sourceTargetNode, targetTargetNode, canvasEdge.text, 'canvas-edge');
    }
  }

  return {
    nodes,
    nodeByPath,
    edges,
    unresolvedLinks
  };
}

function addGraphEdge(edges, edgeKeys, sourceNode, targetNode, text, kind = 'link') {
  if (!sourceNode || !targetNode || targetNode.path === sourceNode.path) return false;
  const edgeKey = `${sourceNode.path}->${targetNode.path}:${kind}`;
  if (edgeKeys.has(edgeKey)) return false;

  edgeKeys.add(edgeKey);
  sourceNode.outgoing += 1;
  targetNode.incoming += 1;
  edges.push({
    id: edgeKey,
    source: sourceNode.path,
    target: targetNode.path,
    text,
    kind
  });
  return true;
}

function extractDocumentGraphLinks(doc) {
  const links = extractMarkdownLinks(doc?.content || '').map((link) => ({ ...link, kind: link.kind || 'markdown-link' }));
  if (getDocumentExtension(doc) !== 'canvas') return links;
  return [...links, ...extractJsonCanvasLinks(doc.content)];
}

function resolveGraphTargetNode(target, sourceDoc, keyToNode) {
  for (const candidate of getGraphTargetCandidates(target, sourceDoc)) {
    const node = keyToNode.get(candidate);
    if (node) return node;
  }
  return null;
}

function getGraphTargetCandidates(target, sourceDoc) {
  const rawTarget = String(decodeURIComponentIfNeeded(target) || '').split('#')[0].split('?')[0].trim();
  const candidates = new Set([normalizeLinkTarget(rawTarget), normalizePathForCompare(rawTarget)]);
  const displayPath = getDisplayPath(sourceDoc || {});
  const folder = displayPath.split(/[\\/]/).slice(0, -1).join('/');

  if (folder && rawTarget && !/^[a-z][a-z0-9+.-]*:/i.test(rawTarget)) {
    candidates.add(normalizeLinkTarget(normalizeGraphPath(`${folder}/${rawTarget}`)));
    candidates.add(normalizePathForCompare(normalizeGraphPath(`${folder}/${rawTarget}`)));
  }

  if (rawTarget.startsWith('/')) {
    candidates.add(normalizeLinkTarget(rawTarget.slice(1)));
    candidates.add(normalizePathForCompare(rawTarget.slice(1)));
  }

  if (rawTarget.startsWith('./')) {
    candidates.add(normalizeLinkTarget(rawTarget.slice(2)));
    candidates.add(normalizePathForCompare(rawTarget.slice(2)));
  }

  if (/^[.]{2}\//.test(rawTarget)) {
    candidates.add(normalizeLinkTarget(normalizeGraphPath(rawTarget)));
    candidates.add(normalizePathForCompare(normalizeGraphPath(rawTarget)));
  }

  const normalizedRawTarget = normalizeLinkTarget(normalizeGraphPath(rawTarget));
  if (normalizedRawTarget && rawTarget.includes('.')) {
    const rawTargetNoExt = stripMarkdownExtension(normalizedRawTarget);
    const rawTargetNoExtCompare = normalizePathForCompare(rawTargetNoExt);
    candidates.add(rawTargetNoExt);
    candidates.add(rawTargetNoExtCompare);
  }

  return [...candidates].filter(Boolean);
}

function normalizeGraphPath(value) {
  const output = [];
  for (const part of String(value || '').replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      output.pop();
      continue;
    }
    output.push(part);
  }
  return output.join('/');
}

function parseJsonCanvasDocument(content) {
  try {
    const parsed = JSON.parse(String(content || ''));
    if (!parsed || typeof parsed !== 'object') return null;
    const nodes = Array.isArray(parsed.nodes) ? parsed.nodes.filter((node) => node && typeof node === 'object') : [];
    const edges = Array.isArray(parsed.edges) ? parsed.edges.filter((edge) => edge && typeof edge === 'object') : [];
    if (!nodes.length && !edges.length) return null;
    return { nodes, edges };
  } catch (_error) {
    return null;
  }
}

function extractJsonCanvasLinks(content) {
  const canvas = parseJsonCanvasDocument(content);
  if (!canvas) return [];
  const links = [];

  for (const node of canvas.nodes) {
    if (node.type === 'file' && typeof node.file === 'string' && node.file.trim()) {
      links.push({
        target: node.file,
        text: node.label || node.file,
        kind: 'canvas-card'
      });
    }

    if (node.type === 'text' && typeof node.text === 'string') {
      links.push(
        ...extractMarkdownLinks(node.text).map((link) => ({
          ...link,
          kind: 'canvas-text'
        }))
      );
    }
  }

  return links;
}

function extractJsonCanvasConnectionEdges(content) {
  const canvas = parseJsonCanvasDocument(content);
  if (!canvas) return [];

  const fileTargetByNodeId = new Map();
  for (const node of canvas.nodes) {
    if (node?.type === 'file' && typeof node.file === 'string' && node.file.trim()) {
      fileTargetByNodeId.set(node.id, node.file);
    }
  }

  return canvas.edges
    .map((edge) => {
      const sourceTarget = fileTargetByNodeId.get(edge.fromNode);
      const targetTarget = fileTargetByNodeId.get(edge.toNode);
      if (!sourceTarget || !targetTarget) return null;
      return {
        sourceTarget,
        targetTarget,
        text: String(edge.label || 'Canvas connection').trim() || 'Canvas connection'
      };
    })
    .filter(Boolean);
}

function getVisibleGraph(graph, activeDocument, mode = graphMode, depth = 1) {
  if (mode === 'global' || !activeDocument?.path) {
    return {
      nodes: graph.nodes,
      edges: graph.edges,
      nodeByPath: graph.nodeByPath
    };
  }

  const visiblePaths = new Set([activeDocument.path]);
  const adjacency = new Map(graph.nodes.map((node) => [node.path, new Set()]));
  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const queue = [{ path: activeDocument.path, depth: 0 }];
  const maxDepth = clampFullGraphDepth(depth);
  while (queue.length) {
    const current = queue.shift();
    if (!current || current.depth >= maxDepth) continue;
    for (const nextPath of adjacency.get(current.path) || []) {
      if (visiblePaths.has(nextPath)) continue;
      visiblePaths.add(nextPath);
      queue.push({ path: nextPath, depth: current.depth + 1 });
    }
  }

  const nodes = graph.nodes.filter((node) => visiblePaths.has(node.path));
  const edges = graph.edges.filter((edge) => visiblePaths.has(edge.source) && visiblePaths.has(edge.target));

  return {
    nodes,
    edges,
    nodeByPath: new Map(nodes.map((node) => [node.path, node]))
  };
}

function limitGraphForRender(graph, activePath, limit = GRAPH_RENDER_NODE_LIMIT, preferredPaths = []) {
  if (graph.nodes.length <= limit) {
    return { ...graph, limited: false };
  }

  const selectedPaths = new Set();
  const preferredPathSet = new Set(preferredPaths);
  const rankedNodes = [...graph.nodes].sort((left, right) => {
    if (left.path === activePath) return -1;
    if (right.path === activePath) return 1;
    if (preferredPathSet.has(left.path) && !preferredPathSet.has(right.path)) return -1;
    if (preferredPathSet.has(right.path) && !preferredPathSet.has(left.path)) return 1;
    const degreeDelta = right.incoming + right.outgoing - (left.incoming + left.outgoing);
    return degreeDelta || left.label.localeCompare(right.label);
  });

  for (const node of rankedNodes) {
    if (selectedPaths.size >= limit) break;
    selectedPaths.add(node.path);
  }

  const nodes = graph.nodes.filter((node) => selectedPaths.has(node.path));
  const edges = graph.edges.filter((edge) => selectedPaths.has(edge.source) && selectedPaths.has(edge.target));

  return {
    nodes,
    edges,
    nodeByPath: new Map(nodes.map((node) => [node.path, node])),
    limited: true
  };
}

function renderGraphSvg(graph, activeDocument, options = {}) {
  const width = options.width || 250;
  const height = options.height || 192;
  const centerX = width / 2;
  const centerY = height / 2;
  const spaceMode = options.spaceMode === FULL_GRAPH_SPACE_MODE_3D ? FULL_GRAPH_SPACE_MODE_3D : FULL_GRAPH_SPACE_MODE_2D;
  const isThreeDMode = spaceMode === FULL_GRAPH_SPACE_MODE_3D;
  const layoutSource =
    options.layout === 'force'
      ? isThreeDMode
        ? layoutForceGraphNodes3D(graph.nodes, graph.edges, width, height, activeDocument?.path)
        : layoutForceGraphNodes(graph.nodes, graph.edges, width, height, activeDocument?.path)
      : layoutGraphNodes(graph.nodes, width, height, activeDocument?.path);
  const layout =
    isThreeDMode
      ? projectGraphLayout(layoutSource, centerX, centerY, options.rotation, options.perspective || FULL_GRAPH_PERSPECTIVE, options.zSort)
      : layoutSource;
  const activePath = activeDocument?.path;
  const showLabels = options.showLabels !== false;
  const searchQuery = String(options.searchQuery || '').trim().toLowerCase();
  const previewPath = options.previewPath || '';
  const rovingFocus = options.rovingFocus === true;
  const viewportTransform = options.viewportTransform ? ` transform="${escapeAttribute(options.viewportTransform)}"` : '';
  const orderedEdges = [...graph.edges].sort((left, right) => {
    const leftSource = layout.get(left.source);
    const leftTarget = layout.get(left.target);
    const rightSource = layout.get(right.source);
    const rightTarget = layout.get(right.target);
    const leftDepth = ((leftSource?.depth || 0) + (leftTarget?.depth || 0)) / 2;
    const rightDepth = ((rightSource?.depth || 0) + (rightTarget?.depth || 0)) / 2;
    return leftDepth - rightDepth;
  });
  const orderedNodes = [...graph.nodes].sort((left, right) => {
    const leftPoint = layout.get(left.path);
    const rightPoint = layout.get(right.path);
    return (leftPoint?.depth || 0) - (rightPoint?.depth || 0);
  });

  const edgeMarkup = orderedEdges
    .map((edge) => {
      const source = layout.get(edge.source);
      const target = layout.get(edge.target);
      if (!source || !target) return '';
      const sourceX = Number.isFinite(source.screenX) ? source.screenX : source.x;
      const sourceY = Number.isFinite(source.screenY) ? source.screenY : source.y;
      const targetX = Number.isFinite(target.screenX) ? target.screenX : target.x;
      const targetY = Number.isFinite(target.screenY) ? target.screenY : target.y;
      const focused = edge.source === activePath || edge.target === activePath ? ' focused' : '';
      const opacity = roundGraphNumber(0.35 + (source.depth || 0) * 0.45);
      return `<line class="graph-edge${focused}${isThreeDMode ? ' graph-edge-3d' : ''}" x1="${sourceX}" y1="${sourceY}" x2="${targetX}" y2="${targetY}" style="opacity:${opacity}" />`;
    })
    .join('');

  const nodeMarkup = orderedNodes
    .map((node) => {
      const point = layout.get(node.path) || {};
      const drawX = Number.isFinite(point.screenX) ? point.screenX : point.x || centerX;
      const drawY = Number.isFinite(point.screenY) ? point.screenY : point.y || centerY;
      const pointDepth = Number.isFinite(point.depth) ? point.depth : 0;
      const pointScale = Number.isFinite(point.scale) ? point.scale : 1;
      const active = node.path === activePath;
      const linked = graph.edges.some((edge) => edge.source === node.path || edge.target === node.path);
      const degree = node.incoming + node.outgoing;
      const baseRadius =
        options.layout === 'force'
          ? Math.min(20, 5.8 + Math.sqrt(Math.max(1, degree)) * 3.6)
          : Math.min(17, 9 + degree * 2);
      const radius = Math.max(2.2, baseRadius * (0.5 + pointScale * 0.5));
      const matched = searchQuery && graphNodeSearchText(node).includes(searchQuery);
      const dimmed = searchQuery && !matched;
      const previewed = node.path === previewPath;
      const classes = [
        'graph-node',
        active ? 'active' : '',
        previewed ? 'previewed' : '',
        linked ? 'linked' : '',
        matched ? 'matched' : '',
        dimmed ? 'dimmed' : '',
        node.hasMedia ? 'media' : '',
        node.hasCanvas ? 'canvas' : ''
      ]
        .filter(Boolean)
        .join(' ');
      const label = truncateGraphLabel(stripMarkdownExtension(node.label));
      const flags = [getGraphExtensionLabel(getGraphNodeExtension(node)), node.hasMedia ? 'media' : '', node.hasCanvas ? 'canvas' : ''].filter(Boolean);
      const title = escapeAttribute(`${node.label} · ${node.incoming} in / ${node.outgoing} out · ${flags.join(', ')}`);
      const tabindex = rovingFocus ? (previewed ? '0' : '-1') : '0';
      return `<g class="${classes} ${isThreeDMode ? ' graph-node-3d' : ''}" role="button" tabindex="${tabindex}" aria-label="Open ${escapeAttribute(node.label)}" data-graph-node-path="${escapeAttribute(node.path)}">
        <title>${title}</title>
        <circle cx="${drawX}" cy="${drawY}" r="${radius}" style="opacity:${Math.max(0.4, Math.min(1, 0.55 + pointDepth * 0.55))}"></circle>
        ${showLabels ? `<text x="${drawX}" y="${drawY + radius + 12}">${escapeHtml(label)}</text>` : ''}
      </g>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Folder note map">
    <g class="graph-viewport"${viewportTransform}>
      ${edgeMarkup}
      ${nodeMarkup}
    </g>
  </svg>`;
}

function layoutGraphNodes(nodes, width, height, activePath) {
  const layout = new Map();
  if (!nodes.length) return layout;

  const sortedNodes = [...nodes].sort((left, right) => {
    if (left.path === activePath) return -1;
    if (right.path === activePath) return 1;
    const degreeDelta = right.incoming + right.outgoing - (left.incoming + left.outgoing);
    return degreeDelta || left.label.localeCompare(right.label);
  });

  const centerX = width / 2;
  const centerY = height / 2;

  if (sortedNodes.length === 1) {
    layout.set(sortedNodes[0].path, { x: centerX, y: centerY });
    return layout;
  }

  const radiusX = Math.max(72, width / 2 - 34);
  const radiusY = Math.max(52, height / 2 - 42);
  const hasActive = Boolean(activePath && sortedNodes.some((node) => node.path === activePath));
  const ringNodes = hasActive ? sortedNodes.slice(1) : sortedNodes;

  if (hasActive) {
    layout.set(sortedNodes[0].path, { x: centerX, y: centerY });
  }

  ringNodes.forEach((node, index) => {
    const angle = ringNodes.length === 1 ? -Math.PI / 2 : -Math.PI / 2 + (Math.PI * 2 * index) / ringNodes.length;
    layout.set(node.path, {
      x: Math.round(centerX + Math.cos(angle) * radiusX),
      y: Math.round(centerY + Math.sin(angle) * radiusY)
    });
  });

  return layout;
}

function layoutForceGraphNodes(nodes, edges, width, height, activePath) {
  const layout = new Map();
  if (!nodes.length) return layout;

  const centerX = width / 2;
  const centerY = height / 2;
  const padding = 52;
  const degreeByPath = new Map(nodes.map((node) => [node.path, getNodeDegree(node)]));
  const positions = nodes.map((node, index) => {
    const hash = Math.abs(hashNumber(node.path || node.label || String(index)));
    const angle = (index * 2.399963229728653 + (hash % 360) * (Math.PI / 180)) % (Math.PI * 2);
    const radius = 80 + (hash % 330);
    const isActive = node.path === activePath;
    return {
      path: node.path,
      x: isActive ? centerX : centerX + Math.cos(angle) * radius,
      y: isActive ? centerY : centerY + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      fixed: isActive
    };
  });
  const positionByPath = new Map(positions.map((position) => [position.path, position]));
  const iterations = nodes.length > 300 ? 58 : nodes.length > 160 ? 78 : 108;
  const repulsion = nodes.length > 260 ? 3600 : 5200;
  const attraction = nodes.length > 260 ? 0.009 : 0.013;
  const centerPull = 0.015;
  const damping = 0.84;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let leftIndex = 0; leftIndex < positions.length; leftIndex += 1) {
      const left = positions[leftIndex];
      for (let rightIndex = leftIndex + 1; rightIndex < positions.length; rightIndex += 1) {
        const right = positions[rightIndex];
        let dx = left.x - right.x;
        let dy = left.y - right.y;
        let distanceSquared = dx * dx + dy * dy;

        if (distanceSquared < 0.01) {
          dx = 0.1 + (leftIndex % 3) * 0.03;
          dy = 0.1 + (rightIndex % 5) * 0.03;
          distanceSquared = dx * dx + dy * dy;
        }

        const distance = Math.sqrt(distanceSquared);
        const force = repulsion / distanceSquared;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        if (!left.fixed) {
          left.vx += fx;
          left.vy += fy;
        }
        if (!right.fixed) {
          right.vx -= fx;
          right.vy -= fy;
        }
      }
    }

    for (const edge of edges) {
      const source = positionByPath.get(edge.source);
      const target = positionByPath.get(edge.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const desired = 88 + Math.min(92, (degreeByPath.get(edge.source) || 0) + (degreeByPath.get(edge.target) || 0));
      const force = (distance - desired) * attraction;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      if (!source.fixed) {
        source.vx += fx;
        source.vy += fy;
      }
      if (!target.fixed) {
        target.vx -= fx;
        target.vy -= fy;
      }
    }

    for (const position of positions) {
      if (position.fixed) {
        position.x = centerX;
        position.y = centerY;
        position.vx = 0;
        position.vy = 0;
        continue;
      }

      position.vx += (centerX - position.x) * centerPull;
      position.vy += (centerY - position.y) * centerPull;
      position.vx *= damping;
      position.vy *= damping;
      position.x = Math.max(padding, Math.min(width - padding, position.x + position.vx));
      position.y = Math.max(padding, Math.min(height - padding, position.y + position.vy));
    }
  }

  for (const position of positions) {
    layout.set(position.path, {
      x: Math.round(position.x * 10) / 10,
      y: Math.round(position.y * 10) / 10
    });
  }

  return layout;
}

function layoutForceGraphNodes3D(nodes, edges, width, height, activePath) {
  const layout = new Map();
  if (!nodes.length) return layout;

  const centerX = width / 2;
  const centerY = height / 2;
  const padding = 52;
  const depthPadding = 130;
  const degreeByPath = new Map(nodes.map((node) => [node.path, getNodeDegree(node)]));
  const positions = nodes.map((node, index) => {
    const hash = Math.abs(hashNumber(node.path || node.label || String(index)));
    const angle = (index * 2.399963229728653 + (hash % 360) * (Math.PI / 180)) % (Math.PI * 2);
    const radius = 80 + (hash % 330);
    const isActive = node.path === activePath;
    return {
      path: node.path,
      x: isActive ? centerX : centerX + Math.cos(angle) * radius,
      y: isActive ? centerY : centerY + Math.sin(angle) * radius,
      z: isActive ? 0 : (hash % depthPadding) - depthPadding / 2,
      vx: 0,
      vy: 0,
      vz: 0,
      fixed: isActive
    };
  });

  const positionByPath = new Map(positions.map((position) => [position.path, position]));
  const iterations = nodes.length > 300 ? 58 : nodes.length > 160 ? 78 : 108;
  const repulsion = nodes.length > 260 ? 6400 : 9200;
  const attraction = nodes.length > 260 ? 0.009 : 0.013;
  const centerPull = 0.016;
  const damping = 0.83;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let leftIndex = 0; leftIndex < positions.length; leftIndex += 1) {
      const left = positions[leftIndex];
      for (let rightIndex = leftIndex + 1; rightIndex < positions.length; rightIndex += 1) {
        const right = positions[rightIndex];
        let dx = left.x - right.x;
        let dy = left.y - right.y;
        let dz = left.z - right.z;
        let distanceSquared = dx * dx + dy * dy + dz * dz;

        if (distanceSquared < 0.01) {
          dx = 0.1 + (leftIndex % 3) * 0.03;
          dy = 0.1 + (rightIndex % 5) * 0.03;
          dz = 0.1 + (leftIndex % 7) * 0.02;
          distanceSquared = dx * dx + dy * dy + dz * dz;
        }

        const distance = Math.sqrt(distanceSquared);
        const force = repulsion / distanceSquared;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        const fz = (dz / distance) * force;

        if (!left.fixed) {
          left.vx += fx;
          left.vy += fy;
          left.vz += fz;
        }
        if (!right.fixed) {
          right.vx -= fx;
          right.vy -= fy;
          right.vz -= fz;
        }
      }
    }

    for (const edge of edges) {
      const source = positionByPath.get(edge.source);
      const target = positionByPath.get(edge.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dz = target.z - source.z;
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz));
      const desired = 88 + Math.min(92, (degreeByPath.get(edge.source) || 0) + (degreeByPath.get(edge.target) || 0));
      const force = (distance - desired) * attraction;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      const fz = (dz / distance) * force;

      if (!source.fixed) {
        source.vx += fx;
        source.vy += fy;
        source.vz += fz;
      }
      if (!target.fixed) {
        target.vx -= fx;
        target.vy -= fy;
        target.vz -= fz;
      }
    }

    for (const position of positions) {
      if (position.fixed) {
        position.x = centerX;
        position.y = centerY;
        position.z = 0;
        position.vx = 0;
        position.vy = 0;
        position.vz = 0;
        continue;
      }

      position.vx += (centerX - position.x) * centerPull;
      position.vy += (centerY - position.y) * centerPull;
      position.vx *= damping;
      position.vy *= damping;
      position.vz *= damping;
      position.x = Math.max(padding, Math.min(width - padding, position.x + position.vx));
      position.y = Math.max(padding, Math.min(height - padding, position.y + position.vy));
      position.z = Math.max(-130, Math.min(130, position.z + position.vz));
    }
  }

  for (const position of positions) {
    layout.set(position.path, {
      x: Math.round(position.x * 10) / 10,
      y: Math.round(position.y * 10) / 10,
      z: Math.round(position.z * 10) / 10
    });
  }

  return layout;
}

function projectGraphLayout(layout, centerX, centerY, rotation = FULL_GRAPH_DEFAULT_ROTATION, perspective = FULL_GRAPH_PERSPECTIVE) {
  const sourceRotation = normalizeFullGraphRotation(rotation);
  const rx = (Math.PI / 180) * sourceRotation.x;
  const ry = (Math.PI / 180) * sourceRotation.y;
  const rz = (Math.PI / 180) * sourceRotation.z;
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const projected = new Map();
  const normalizedDepths = [];

  for (const [path, point] of layout.entries()) {
    const localX = (point.x || centerX) - centerX;
    const localY = (point.y || centerY) - centerY;
    const localZ = point.z || 0;

    const x1 = localX * cosY + localZ * sinY;
    const z1 = -localX * sinY + localZ * cosY;
    const y2 = localY * cosX - z1 * sinX;
    const z2 = localY * sinX + z1 * cosX;
    const x3 = x1 * cosZ - y2 * sinZ;
    const y3 = x1 * sinZ + y2 * cosZ;

    const cameraDepth = perspective / Math.max(20, perspective - z2);
    const scale = cameraDepth;
    const screenX = Math.round(centerX + x3 * cameraDepth);
    const screenY = Math.round(centerY + y3 * cameraDepth);
    const depth = Math.max(0, Math.min(1, (z2 + 130) / 260));

    normalizedDepths.push({ path, depth });
    projected.set(path, {
      ...point,
      screenX,
      screenY,
      depth,
      scale
    });
  }

  const maxDepth = Math.max(...normalizedDepths.map((item) => item.depth), 0);
  const minDepth = Math.min(...normalizedDepths.map((item) => item.depth), 1);
  const depthRange = Math.max(0.0001, maxDepth - minDepth);

  for (const item of normalizedDepths) {
    const node = projected.get(item.path);
    if (!node) continue;
    const normalized = (item.depth - minDepth) / depthRange;
    node.depth = normalized;
  }

  return projected;
}

function truncateGraphLabel(label) {
  const normalized = String(label || 'Untitled').split(/[\\/]/).pop();
  return normalized.length > 18 ? `${normalized.slice(0, 15)}...` : normalized;
}

function getVaultDocuments() {
  if (!activeVault?.path) return [];
  const vaultRoot = normalizePathForCompare(activeVault.path);
  return documents
    .filter((doc) => doc.path && normalizePathForCompare(doc.path).startsWith(vaultRoot))
    .sort((left, right) => getDisplayPath(left).localeCompare(getDisplayPath(right)));
}

function getDisplayPath(doc) {
  return doc.relativePath || doc.title || doc.path?.split(/[\\/]/).pop() || UNTITLED_NAME;
}

function getVaultRelativePath(filePath) {
  if (!activeVault?.path || !filePath) return null;
  const normalizedRoot = normalizeLinkPath(activeVault.path);
  const normalizedFile = normalizeLinkPath(filePath);
  if (!normalizedFile.startsWith(`${normalizedRoot}/`)) return null;
  return normalizedFile.slice(normalizedRoot.length + 1);
}

function getDocumentVaultRelativePath(doc) {
  return getVaultRelativePath(doc?.path) || doc?.relativePath || doc?.title || UNTITLED_NAME;
}

function isDocumentInActiveVault(doc) {
  return Boolean(doc?.path && getVaultRelativePath(doc.path));
}

function findBacklinks(targetDoc, vaultDocs) {
  const targetKeys = getDocumentLinkKeys(targetDoc);
  const backlinks = [];

  for (const doc of vaultDocs) {
    if (doc.id === targetDoc.id) continue;

    for (const link of extractDocumentGraphLinks(doc)) {
      const normalized = normalizeLinkTarget(link.target);
      if (!normalized || !targetKeys.has(normalized)) continue;

      backlinks.push({
        doc,
        linkText: link.text || link.target
      });
      break;
    }
  }

  return backlinks;
}

function getDocumentLinkKeys(doc) {
  const displayPath = getDisplayPath(doc);
  const withoutExt = stripMarkdownExtension(displayPath);
  const basename = displayPath.split(/[\\/]/).pop() || displayPath;
  const basenameWithoutExt = stripMarkdownExtension(basename);
  const frontmatter = extractFrontmatterMetadata(doc?.content || '');
  const aliasValues = [
    ...asArray(frontmatter.aliases),
    ...asArray(frontmatter.alias),
    ...(frontmatter.title ? [frontmatter.title] : [])
  ];
  const aliasSansExt = aliasValues.map((value) => stripMarkdownExtension(value));

  return new Set(
    [
      displayPath,
      withoutExt,
      basename,
      basenameWithoutExt,
      doc?.title,
      stripMarkdownExtension(doc?.title),
      doc?.path,
      stripMarkdownExtension(doc?.path),
      ...aliasValues,
      ...aliasSansExt
    ]
      .map(normalizeLinkTarget)
      .filter(Boolean)
  );
}

function extractMarkdownLinks(markdown) {
  const links = [];
  let inFence = false;

  for (const line of String(markdown || '').split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    for (const match of line.matchAll(/\[\[([^\]]+)]]/g)) {
      const rawTarget = match[1].split('|')[0].split('#')[0].trim();
      links.push({
        target: rawTarget,
        text: match[1].trim()
      });
    }

    for (const match of line.matchAll(/\[([^\]]+)]\(([^)]+)\)/g)) {
      const rawTarget = match[2].split('#')[0].trim();
      if (/^[a-z][a-z0-9+.-]*:/i.test(rawTarget)) continue;
      links.push({
        target: rawTarget,
        text: match[1].trim()
      });
    }
  }

  return links;
}

function extractMarkdownTasks(markdown) {
  const tasks = [];
  let inFence = false;
  const lines = String(markdown || '').split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    const match = line.match(/^\s*[-*+]\s+\[([ xX])]\s+(.+)$/);
    if (!match) continue;
    tasks.push({
      checked: match[1].toLowerCase() === 'x',
      text: match[2].trim(),
      line: index + 1
    });
  }

  return tasks;
}

function normalizeLinkTarget(value) {
  return String(value || '')
    .replaceAll('\\', '/')
    .replace(/^\.\//, '')
    .replace(/\.(md|markdown|mdown|mkd|txt|canvas)$/i, '')
    .trim()
    .toLowerCase();
}

function normalizeLinkPath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/\/+$/, '');
}

function normalizePathForCompare(value) {
  return String(value || '').replaceAll('\\', '/').replace(/\/?$/, '/').toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function extractFrontmatterMetadata(markdown) {
  const normalizedText = String(markdown || '');
  const frontmatterMatch = normalizedText.match(/^\s*---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatterMatch) return {};

  const lines = frontmatterMatch[1].split(/\r?\n/);
  const metadata = {};
  let activeArrayKey = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const arrayItemMatch = trimmed.match(/^-\s*(.*)$/);
    if (activeArrayKey && arrayItemMatch) {
      const rawItem = arrayItemMatch[1].trim();
      if (!rawItem) continue;
      metadata[activeArrayKey] = [...asArray(metadata[activeArrayKey]), unquoteFrontmatterValue(rawItem)];
      continue;
    }

    const keyMatch = trimmed.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!keyMatch) {
      activeArrayKey = null;
      continue;
    }

    const key = keyMatch[1].trim().toLowerCase();
    const raw = String(keyMatch[2] ?? '').trim();
    activeArrayKey = null;

    if (key === 'aliases' || key === 'alias' || key === 'title') {
      if (!raw) {
        activeArrayKey = key;
        metadata[key] = metadata[key] || [];
        continue;
      }

      if (raw.startsWith('[') && raw.endsWith(']')) {
        const listValue = raw
          .slice(1, -1)
          .split(',')
          .map((item) => unquoteFrontmatterValue(item))
          .filter(Boolean);
        metadata[key] = key === 'title' ? listValue[0] || '' : listValue;
      } else {
        const value = unquoteFrontmatterValue(raw);
        if (key === 'title') metadata[key] = value;
        else metadata[key] = [value];
      }
    }
  }

  return metadata;
}

function unquoteFrontmatterValue(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).trim();
  }
  return text;
}

function activateDocument(documentId) {
  const doc = documents.find((candidate) => candidate.id === documentId);
  if (!doc) return;

  activeDocumentId = doc.id;
  setEditorContent(doc.content);
  lastRenderedHash = '';
  setViewMode(viewMode, false);
  updateStats(doc.content);
  updateStatus();
  updateActionStates();
  renderDocumentTabs();
  renderVaultSidebar();
  renderMindMapCanvas();
  scheduleRender(0);
  persistSession();
  syncNativeDocumentState();
}

function closeDocument(documentId) {
  const doc = documents.find((candidate) => candidate.id === documentId);
  if (!doc) return;

  if (doc.dirty && !confirm(`Close ${doc.title} without saving?`)) {
    return;
  }

  const closingActive = doc.id === activeDocumentId;
  documents = documents.filter((candidate) => candidate.id !== documentId);

  if (!documents.length) {
    const replacement = createDocument({
      title: UNTITLED_NAME,
      content: '',
      dirty: false
    });
    documents.push(replacement);
  }

  if (closingActive) {
    activateDocument(documents[0].id);
  } else {
    renderDocumentTabs();
    renderVaultSidebar();
  }

  persistSession();
  syncNativeDocumentState();
}

function renderDocumentTabs() {
  tabsBar.innerHTML = documents
    .map((doc) => {
      const active = doc.id === activeDocumentId ? ' active' : '';
      const dirty = doc.dirty ? '<span class="dirty-dot" aria-hidden="true"></span>' : '';
      const label = escapeHtml(doc.title);
      const attributeLabel = escapeAttribute(doc.title);
      const selected = doc.id === activeDocumentId;
      return `<div class="tab-shell${active}" role="presentation">
        <button class="tab${active}" role="tab" id="tab-${doc.id}" type="button" data-tab-id="${doc.id}" aria-selected="${selected}" tabindex="${selected ? '0' : '-1'}">
          <i data-lucide="file-text" aria-hidden="true"></i>
          <span class="tab-title">${label}</span>
          ${dirty}
        </button>
        <button class="tab-close" type="button" data-close-tab="${doc.id}" title="Close ${attributeLabel}" aria-label="Close ${attributeLabel}">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>`;
    })
    .join('');

  createIcons({ icons });
}

function getActiveDocument() {
  return documents.find((doc) => doc.id === activeDocumentId);
}

async function saveActiveDocument() {
  const doc = getActiveDocument();
  if (!doc) return;

  if (!doc.path) {
    await saveActiveDocumentAs();
    return;
  }

  try {
    const result = await native.saveFile({
      path: doc.path,
      content: doc.content,
      fileState: doc.fileState
    });
    if (result?.canceled) {
      showToast(result.conflict ? 'Save canceled. The disk file changed outside the app.' : 'Save canceled.');
      return;
    }
    applySaveResult(doc, result);
    void refreshRecentItems();
    showToast('Saved.');
  } catch (error) {
    showToast(`Save failed: ${error.message}`);
  }
}

async function saveActiveDocumentAs() {
  const doc = getActiveDocument();
  if (!doc) return;

  try {
    const result = await native.saveFileAs({
      defaultPath: doc.path || sanitizeFileName(doc.title || UNTITLED_NAME),
      content: doc.content
    });

    if (!result) return;

    applySaveResult(doc, result);
    void refreshRecentItems();
    showToast('Saved.');
  } catch (error) {
    showToast(`Save failed: ${error.message}`);
  }
}

function applySaveResult(doc, result) {
  if (!result) return;
  doc.path = result.path;
  doc.title = result.name;
  doc.lastSavedAt = result.lastSavedAt;
  doc.fileState = normalizeFileState(result.fileState);
  doc.relativePath = getVaultRelativePath(result.path) || doc.relativePath || result.name;
  doc.externalFileState = null;
  doc.dirty = false;
  updateStatus();
  updateActionStates();
  renderDocumentTabs();
  renderVaultSidebar();
  persistSession();
  syncNativeDocumentState();
}

async function copyActiveMarkdown() {
  const doc = getActiveDocument();
  if (!doc) return;

  await navigator.clipboard.writeText(doc.content);
  showToast('Markdown copied.');
}

async function copyAiContextMap() {
  const content = buildAiContextMap();
  if (!content) {
    showToast('Open a folder before copying context for AI.');
    return;
  }

  await navigator.clipboard.writeText(content);
  showToast('Context copied for AI.');
}

function createAiContextMapDocument() {
  const content = buildAiContextMap();
  if (!content) {
    showToast('Open a folder before saving a context note.');
    return;
  }

  const doc = createDocument({
    title: `${activeVault?.name || 'Folder'} AI Context.md`,
    content,
    dirty: true
  });

  documents.push(doc);
  activateDocument(doc.id);
  persistSession();
  showToast('Context note created.');
}

function buildAiContextMap() {
  const vaultDocs = getVaultDocuments();
  if (!vaultDocs.length) return '';

  const activeDocument = getActiveDocument();
  const graph = buildVaultGraph(vaultDocs);
  const rankedDocs = getAiContextDocuments(vaultDocs, graph, activeDocument);
  const generatedAt = new Date().toISOString();
  const activePath = activeDocument ? getDisplayPath(activeDocument) : 'None';
  const lines = [
    `# ${activeVault?.name || 'Folder'} AI Context Map`,
    '',
    `Generated: ${generatedAt}`,
    `Folder: ${activeVault?.name || 'Local Markdown folder'}`,
    `Active note: ${activePath}`,
    `Files: ${vaultDocs.length}`,
    `Resolved links: ${graph.edges.length}`,
    `Missing links: ${graph.unresolvedLinks.length}`,
    `Included note summaries: ${rankedDocs.length}${rankedDocs.length < vaultDocs.length ? ` of ${vaultDocs.length}` : ''}`,
    '',
    '## How To Use',
    '',
    'Paste this map into Claude, OpenAI, Gemini, Ollama, or any local model when you want grounded help with this folder. Notes stay local unless you deliberately copy or send this map.',
    '',
    '## Active Note',
    ''
  ];

  if (activeDocument) {
    appendAiDocumentSummary(lines, activeDocument, graph, vaultDocs, { includeExcerpt: true });
  } else {
    lines.push('No active note.');
  }

  lines.push('', '## Link Graph', '');

  if (graph.edges.length) {
    for (const edge of graph.edges.slice(0, AI_CONTEXT_EDGE_LIMIT)) {
      const source = graph.nodeByPath.get(edge.source)?.doc;
      const target = graph.nodeByPath.get(edge.target)?.doc;
      if (!source || !target) continue;
      lines.push(`- ${getDisplayPath(source)} -> ${getDisplayPath(target)} (${edge.text})`);
    }
    if (graph.edges.length > AI_CONTEXT_EDGE_LIMIT) {
      lines.push(`- ...${graph.edges.length - AI_CONTEXT_EDGE_LIMIT} more resolved links`);
    }
  } else {
    lines.push('No resolved note links yet.');
  }

  if (graph.unresolvedLinks.length) {
    lines.push('', '## Missing Links', '');
    for (const link of graph.unresolvedLinks.slice(0, 80)) {
      const source = graph.nodeByPath.get(link.source)?.doc;
      if (!source) continue;
      lines.push(`- ${getDisplayPath(source)} -> ${link.target}`);
    }
    if (graph.unresolvedLinks.length > 80) {
      lines.push(`- ...${graph.unresolvedLinks.length - 80} more unresolved links`);
    }
  }

  lines.push('', '## Notes', '');

  for (const doc of rankedDocs) {
    appendAiDocumentSummary(lines, doc, graph, vaultDocs);
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

function getAiContextDocuments(vaultDocs, graph, activeDocument) {
  const degreeByPath = new Map(vaultDocs.map((doc) => [doc.path, 0]));
  for (const edge of graph.edges) {
    degreeByPath.set(edge.source, (degreeByPath.get(edge.source) || 0) + 1);
    degreeByPath.set(edge.target, (degreeByPath.get(edge.target) || 0) + 1);
  }

  return [...vaultDocs]
    .sort((left, right) => {
      if (left.id === activeDocument?.id) return -1;
      if (right.id === activeDocument?.id) return 1;
      const degreeDelta = (degreeByPath.get(right.path) || 0) - (degreeByPath.get(left.path) || 0);
      return degreeDelta || getDisplayPath(left).localeCompare(getDisplayPath(right));
    })
    .slice(0, AI_CONTEXT_FILE_LIMIT);
}

function appendAiDocumentSummary(lines, doc, graph, vaultDocs, options = {}) {
  const headings = extractMarkdownHeadings(doc.content).slice(0, 12);
  const tags = extractMarkdownTags(doc.content).slice(0, 18);
  const outgoing = graph.edges.filter((edge) => edge.source === doc.path);
  const incoming = findBacklinks(doc, vaultDocs);

  lines.push(`### ${getDisplayPath(doc)}`);
  lines.push(`- Title: ${doc.title}`);
  lines.push(`- Words: ${countWords(doc.content)}`);
  lines.push(`- Headings: ${headings.length ? headings.map((heading) => heading.text).join(' | ') : 'None'}`);
  lines.push(`- Tags: ${tags.length ? tags.join(', ') : 'None'}`);
  lines.push(
    `- Links out: ${
      outgoing.length
        ? outgoing
            .map((edge) => {
              const target = graph.nodeByPath.get(edge.target)?.doc;
              return target ? getDisplayPath(target) : edge.text;
            })
            .join(', ')
        : 'None'
    }`
  );
  lines.push(`- Links here: ${incoming.length ? incoming.map((link) => getDisplayPath(link.doc)).join(', ') : 'None'}`);

  if (options.includeExcerpt) {
    const excerpt = createPlainTextExcerpt(doc.content, 480);
    lines.push(`- Excerpt: ${excerpt || 'No readable text.'}`);
  }
}

function extractMarkdownTags(markdown) {
  const tags = new Set();
  let inFence = false;

  for (const line of String(markdown || '').split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    for (const match of line.matchAll(/(^|\s)#([A-Za-z0-9][\w/-]*)/g)) {
      tags.add(`#${match[2]}`);
    }
  }

  return [...tags].sort((left, right) => left.localeCompare(right));
}

function countWords(markdown) {
  return createPlainTextExcerpt(markdown, Number.POSITIVE_INFINITY)
    .split(/\s+/)
    .filter(Boolean).length;
}

function createPlainTextExcerpt(markdown, maxLength) {
  const text = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?]]/g, (_match, target, alias) => alias || target)
    .replace(/[#>*_\-[\]()~$|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!Number.isFinite(maxLength) || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function insertMindMapFromHeadings() {
  const doc = getActiveDocument();
  if (!doc) return;

  const mindMap = createMermaidMindMap(doc);
  insertTextAtCursor(`\n\n${mindMap}\n`);
  showToast('Mind map inserted.');
}

function createMermaidMindMap(doc) {
  const headings = extractMarkdownHeadings(doc.content);
  const rootLabel = cleanMindMapLabel(stripMarkdownExtension(doc.title || UNTITLED_NAME)) || 'Document';
  const lines = ['```mermaid', 'mindmap', `  root((${rootLabel}))`];

  if (!headings.length) {
    lines.push('    Idea', '      Detail');
    lines.push('```');
    return lines.join('\n');
  }

  const stack = [{ level: 0, indent: 2 }];

  for (const heading of headings) {
    while (stack.length > 1 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    const indent = stack[stack.length - 1].indent + 2;
    lines.push(`${' '.repeat(indent)}${cleanMindMapLabel(heading.text) || 'Untitled'}`);
    stack.push({ level: heading.level, indent });
  }

  lines.push('```');
  return lines.join('\n');
}

function extractMarkdownHeadings(markdown) {
  const headings = [];
  let inFence = false;

  const lines = String(markdown || '').split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;

    headings.push({
      level: match[1].length,
      text: match[2],
      line: index + 1
    });
  }

  return headings;
}

function cleanMindMapLabel(value) {
  return String(value || '')
    .replace(/[`*_~[\](){}<>|\\]/g, ' ')
    .replace(/:/g, ' -')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function insertTextAtCursor(text) {
  if (!editorView) return;
  focusEditor();
  const transaction = editorView.state.replaceSelection(text);
  editorView.dispatch({
    ...transaction,
    scrollIntoView: true
  });
}

function runFormattingCommand(command) {
  if (!editorView || !getActiveDocument()) return false;

  const handlers = {
    heading: toggleHeadingOne,
    bold: () => toggleMarkdownWrap('**', '**', 'bold text'),
    italic: () => toggleMarkdownWrap('*', '*', 'italic text'),
    link: insertMarkdownLink,
    code: () => toggleMarkdownWrap('`', '`', 'code'),
    quote: toggleBlockQuote,
    task: toggleTaskList,
    table: insertMarkdownTable
  };

  const handler = handlers[command];
  if (!handler) return false;
  handler();
  return true;
}

function toggleMarkdownWrap(prefix, suffix, placeholderText) {
  const state = editorView.state;
  const range = getInlineFormattingRange(state, state.selection.main);
  const selectedText = state.sliceDoc(range.from, range.to);
  const hasText = Boolean(selectedText);
  const alreadyWrapped = hasText && selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length > prefix.length + suffix.length;

  if (alreadyWrapped) {
    const unwrapped = selectedText.slice(prefix.length, selectedText.length - suffix.length);
    replaceEditorRange(range.from, range.to, unwrapped, range.from, range.from + unwrapped.length);
    return;
  }

  const body = hasText ? selectedText : placeholderText;
  const insert = `${prefix}${body}${suffix}`;
  const selectionFrom = range.from + prefix.length;
  const selectionTo = selectionFrom + body.length;
  replaceEditorRange(range.from, range.to, insert, selectionFrom, selectionTo);
}

function getInlineFormattingRange(state, range) {
  if (!range.empty) return range;

  const line = state.doc.lineAt(range.from);
  let from = range.from;
  let to = range.to;

  while (from > line.from && /[\w-]/.test(state.sliceDoc(from - 1, from))) {
    from -= 1;
  }

  while (to < line.to && /[\w-]/.test(state.sliceDoc(to, to + 1))) {
    to += 1;
  }

  return { from, to, empty: from === to };
}

function replaceEditorRange(from, to, insert, selectionFrom, selectionTo = selectionFrom) {
  focusEditor();
  editorView.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.range(selectionFrom, selectionTo),
    scrollIntoView: true
  });
}

function insertMarkdownLink() {
  const state = editorView.state;
  const range = getInlineFormattingRange(state, state.selection.main);
  const selectedText = state.sliceDoc(range.from, range.to) || 'link text';
  const url = prompt('Link URL', 'https://');
  if (!url) {
    focusEditor();
    return;
  }

  const insert = `[${selectedText}](${url.trim()})`;
  replaceEditorRange(range.from, range.to, insert, range.from + 1, range.from + 1 + selectedText.length);
}

function toggleHeadingOne() {
  replaceSelectedLines((lines) =>
    lines.map((line) => {
      if (!line.trim()) return '# ';
      const indent = line.match(/^\s*/)?.[0] || '';
      const body = line.slice(indent.length);
      if (/^#\s+/.test(body)) {
        return `${indent}${body.replace(/^#\s+/, '')}`;
      }
      return `${indent}# ${body.replace(/^#{1,6}\s+/, '')}`;
    })
  );
}

function toggleBlockQuote() {
  replaceSelectedLines((lines) => {
    const contentLines = lines.filter((line) => line.trim());
    const shouldRemove = contentLines.length > 0 && contentLines.every((line) => /^\s*>\s?/.test(line));

    return lines.map((line) => {
      if (!line.trim()) return shouldRemove ? line.replace(/^\s*>\s?/, '') : '>';
      if (shouldRemove) return line.replace(/^(\s*)>\s?/, '$1');
      const indent = line.match(/^\s*/)?.[0] || '';
      return `${indent}> ${line.slice(indent.length)}`;
    });
  });
}

function toggleTaskList() {
  replaceSelectedLines((lines) => {
    const contentLines = lines.filter((line) => line.trim());
    const shouldRemove = contentLines.length > 0 && contentLines.every((line) => /^\s*[-*]\s+\[[ xX]\]\s+/.test(line));

    return lines.map((line) => {
      if (!line.trim()) return shouldRemove ? line : '- [ ] ';
      if (shouldRemove) return line.replace(/^(\s*)[-*]\s+\[[ xX]\]\s+/, '$1- ');

      const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
      if (bulletMatch) {
        return `${bulletMatch[1]}- [ ] ${bulletMatch[2]}`;
      }

      const indent = line.match(/^\s*/)?.[0] || '';
      return `${indent}- [ ] ${line.slice(indent.length)}`;
    });
  });
}

function insertMarkdownTable() {
  const table = ['| Column A | Column B |', '| --- | --- |', '| Value | Value |'].join('\n');
  const state = editorView.state;
  const range = state.selection.main;
  const before = state.sliceDoc(Math.max(0, range.from - 1), range.from);
  const after = state.sliceDoc(range.to, Math.min(state.doc.length, range.to + 1));
  const prefix = range.from > 0 && before !== '\n' ? '\n\n' : '';
  const suffix = range.to < state.doc.length && after !== '\n' ? '\n\n' : '\n';
  const insert = `${prefix}${table}${suffix}`;
  const selectionFrom = range.from + prefix.length + table.indexOf('Column A');
  replaceEditorRange(range.from, range.to, insert, selectionFrom, selectionFrom + 'Column A'.length);
}

function replaceSelectedLines(transformLines) {
  const state = editorView.state;
  const range = state.selection.main;
  const startLine = state.doc.lineAt(range.from);
  const endLine = state.doc.lineAt(range.to);
  const from = startLine.from;
  const to = endLine.to;
  const selectedBlock = state.sliceDoc(from, to);
  const transformed = transformLines(selectedBlock.split('\n')).join('\n');

  focusEditor();
  editorView.dispatch({
    changes: { from, to, insert: transformed },
    selection: EditorSelection.range(from, from + transformed.length),
    scrollIntoView: true
  });
}

async function exportActiveHtml() {
  const doc = getActiveDocument();
  if (!doc) return;

  try {
    const result = await native.exportHtml({
      title: stripMarkdownExtension(doc.title),
      defaultPath: `${stripMarkdownExtension(doc.title)}.html`,
      body: preview.innerHTML,
      theme: getTheme(),
      css: EXPORT_CSS
    });

    if (result) showToast('HTML exported.');
  } catch (error) {
    showToast(`HTML export failed: ${error.message}`);
  }
}

async function exportActivePdf() {
  const doc = getActiveDocument();
  if (!doc) return;

  try {
    const result = await native.exportPdf({
      title: stripMarkdownExtension(doc.title),
      body: preview.innerHTML,
      theme: getTheme(),
      css: EXPORT_CSS
    });

    if (result?.printDialog) {
      showToast('Print dialog opened. Choose Save as PDF.');
    } else if (result?.downloadedPrintHtml) {
      showToast('Print-ready HTML downloaded. Open it and choose Save as PDF.');
    } else if (result) {
      showToast('PDF exported.');
    }
  } catch (error) {
    showToast(`PDF export failed: ${error.message}`);
  }
}

async function publishStaticSite() {
  const payload = buildPublishSitePayload();
  if (!payload) {
    showToast('Open a folder before creating a website.');
    return;
  }

  try {
    const result = await native.publishStaticSite(payload);
    if (result) {
      showToast(`Published ${result.files} notes as a static site.`);
    }
  } catch (error) {
    showToast(`Static publish failed: ${error.message}`);
  }
}

function buildPublishSitePayload() {
  const vaultDocs = getVaultDocuments();
  if (!vaultDocs.length) return null;

  const routeById = createPublishRouteMap(vaultDocs);
  const routeByPath = new Map(vaultDocs.map((doc) => [doc.path, routeById.get(doc.id)]));
  const resolver = createVaultLinkResolver(vaultDocs);
  const graph = buildVaultGraph(vaultDocs);

  const files = vaultDocs.map((doc) => {
    const route = routeById.get(doc.id);
    const backlinks = findBacklinks(doc, vaultDocs).map((backlink) => {
      const backlinkRoute = routeById.get(backlink.doc.id);
      return {
        title: stripMarkdownExtension(backlink.doc.title),
        relativePath: getDisplayPath(backlink.doc),
        url: backlinkRoute?.url || '',
        label: backlink.linkText || backlink.doc.title
      };
    });

    return {
      id: doc.path || doc.id,
      title: stripMarkdownExtension(doc.title || UNTITLED_NAME),
      relativePath: getDisplayPath(doc),
      url: route.url,
      body: renderPublishDocumentBody(doc, routeById, resolver),
      text: createPlainTextExcerpt(doc.content, 12000),
      excerpt: createPlainTextExcerpt(doc.content, 240),
      words: countWords(doc.content),
      headings: extractMarkdownHeadings(doc.content).slice(0, 60),
      tags: extractMarkdownTags(doc.content).slice(0, 60),
      outgoing: getPublishOutgoingLinks(doc, routeById, resolver),
      backlinks
    };
  });

  const graphNodes = graph.nodes
    .map((node) => {
      const route = routeByPath.get(node.path);
      if (!route) return null;
      return {
        id: route.url,
        label: stripMarkdownExtension(node.label),
        title: stripMarkdownExtension(node.doc.title),
        relativePath: getDisplayPath(node.doc),
        url: route.url,
        incoming: node.incoming,
        outgoing: node.outgoing
      };
    })
    .filter(Boolean);

  const graphEdges = graph.edges
    .map((edge) => {
      const sourceRoute = routeByPath.get(edge.source);
      const targetRoute = routeByPath.get(edge.target);
      if (!sourceRoute || !targetRoute) return null;
      return {
        source: sourceRoute.url,
        target: targetRoute.url,
        label: edge.text,
        kind: edge.kind || 'link'
      };
    })
    .filter(Boolean);

  const unresolvedLinks = graph.unresolvedLinks
    .map((link) => {
      const sourceRoute = routeByPath.get(link.source);
      if (!sourceRoute) return null;
      return {
        source: sourceRoute.url,
        target: link.target,
        label: link.text
      };
    })
    .filter(Boolean);

  return {
    version: 1,
    title: activeVault?.name || 'Markdown Site',
    theme: getTheme(),
    generatedAt: new Date().toISOString(),
    css: EXPORT_CSS,
    files,
    graph: {
      nodes: graphNodes,
      edges: graphEdges,
      unresolvedLinks
    }
  };
}

function createPublishRouteMap(vaultDocs) {
  const routeById = new Map();
  const used = new Set();

  for (const doc of vaultDocs) {
    const base = slugifyPublishPath(stripMarkdownExtension(getDisplayPath(doc))) || slugifyPublishPath(doc.title) || 'note';
    let slug = base;
    let counter = 2;
    while (used.has(`${slug}.html`)) {
      slug = `${base}-${counter}`;
      counter += 1;
    }
    const fileName = `${slug}.html`;
    used.add(fileName);
    routeById.set(doc.id, {
      fileName,
      url: `notes/${fileName}`
    });
  }

  return routeById;
}

function renderPublishDocumentBody(doc, routeById, resolver) {
  const markdown = rewriteWikiLinksForPublish(doc.content, routeById, resolver);
  const rawHtml = marked.parse(markdown);
  const template = document.createElement('template');
  template.innerHTML = DOMPurify.sanitize(rawHtml, sanitizeOptions);

  for (const anchor of template.content.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') || '';
    if (!href || href.startsWith('#')) continue;

    if (isExternalMarkdownHref(href)) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noreferrer');
      continue;
    }

    const [rawTarget, hash = ''] = href.split('#');
    const resolvedDoc = resolver(rawTarget);
    const route = resolvedDoc ? routeById.get(resolvedDoc.id) : null;
    if (!route) continue;

    anchor.setAttribute('href', `${route.fileName}${hash ? `#${hash}` : ''}`);
    anchor.removeAttribute('target');
    anchor.removeAttribute('rel');
  }

  return template.innerHTML;
}

function rewriteWikiLinksForPublish(markdown, routeById, resolver) {
  return String(markdown || '').replace(/\[\[([^\]]+)]]/g, (match, rawLink) => {
    const [targetWithHeading, alias] = String(rawLink).split('|');
    const [target] = targetWithHeading.split('#');
    const label = (alias || targetWithHeading || target).trim();
    const resolvedDoc = resolver(target);
    const route = resolvedDoc ? routeById.get(resolvedDoc.id) : null;
    if (!route) return label || match;
    return `[${escapeMarkdownLinkText(label || stripMarkdownExtension(resolvedDoc.title))}](${route.fileName})`;
  });
}

function getPublishOutgoingLinks(doc, routeById, resolver) {
  const links = [];
  const seen = new Set();

  for (const link of extractDocumentGraphLinks(doc)) {
    const resolvedDoc = resolver(link.target);
    const route = resolvedDoc ? routeById.get(resolvedDoc.id) : null;
    const key = `${route?.url || normalizeLinkTarget(link.target)}:${link.text || link.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      title: resolvedDoc ? stripMarkdownExtension(resolvedDoc.title) : link.target,
      relativePath: resolvedDoc ? getDisplayPath(resolvedDoc) : '',
      url: route?.url || '',
      label: link.text || link.target
    });
  }

  return links.slice(0, 120);
}

function slugifyPublishPath(value) {
  return String(value || '')
    .replace(/\.(md|markdown|mdown|mkd|txt|canvas)$/i, '')
    .replaceAll('\\', '/')
    .split('/')
    .filter(Boolean)
    .join('-')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function isExternalMarkdownHref(href) {
  return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

function escapeMarkdownLinkText(value) {
  return String(value || '').replaceAll(']', '\\]');
}

async function revealActiveFile() {
  const doc = getActiveDocument();
  if (!doc?.path) {
    showToast('Save this document before revealing it.');
    return;
  }

  const revealed = await native.revealFile(doc.path);
  if (!revealed) {
    showToast('Open or save this document before revealing it.');
  }
}

async function handleExternalFileChange(change) {
  if (!change?.path) return;
  const doc = documents.find((candidate) => candidate.path === change.path);
  if (!doc) return;

  const nextState = normalizeFileState(change.fileState);
  if (fileStatesMatch(doc.fileState, nextState)) return;

  if (!change.exists) {
    doc.fileState = null;
    showToast(`${doc.title} was moved or deleted on disk.`);
    updateStatus();
    return;
  }

  if (doc.dirty) {
    doc.externalFileState = nextState;
    showToast(`${doc.title} changed on disk. Save will ask how to resolve the conflict.`);
    return;
  }

  try {
    const reloaded = await native.reloadFile(change.path);
    if (!reloaded) return;

    doc.title = reloaded.name;
    doc.content = String(reloaded.content ?? '');
    doc.lastSavedAt = reloaded.lastSavedAt;
    doc.fileState = normalizeFileState(reloaded.fileState);
    doc.externalFileState = null;
    doc.dirty = false;

    if (doc.id === activeDocumentId) {
      setEditorContent(doc.content);
      lastRenderedHash = '';
      updateStats(doc.content);
      updateStatus();
      scheduleRender(0);
    }

    renderDocumentTabs();
    renderVaultSidebar();
    persistSession();
    showToast(`${doc.title} reloaded from disk.`);
  } catch (error) {
    showToast(`Reload failed: ${error.message}`);
  }
}

function updateStatus() {
  const doc = getActiveDocument();
  if (!doc) return;

  filePathLabel.textContent = doc.path || doc.title;
  saveStateLabel.textContent = doc.dirty ? 'Unsaved' : 'Saved';
  saveStateLabel.classList.toggle('dirty', doc.dirty);
  updateActionStates();
  renderWorkspaceShell();
  syncNativeDocumentState();
}

function updateActionStates() {
  const doc = getActiveDocument();
  const hasDocument = Boolean(doc);
  const hasContent = Boolean(doc?.content);
  const hasPath = Boolean(doc?.path);

  setDisabled(saveButton, !hasDocument);
  setDisabled(copyButton, !hasDocument || !hasContent);
  setDisabled(openMindMapButton, !hasDocument);
  setDisabled(mindMapButton, !hasDocument);
  setDisabled(exportHtmlButton, !hasDocument);
  setDisabled(exportPdfButton, !hasDocument);
  setDisabled(publishVaultButton, !getVaultDocuments().length);
  setDisabled(revealButton, !hasPath);
  setDisabled(versionHistoryTrigger, !hasPath);
  formatButtons.forEach((button) => setDisabled(button, !hasDocument));
}

function setDisabled(button, disabled, reason = '') {
  if (!button) return;
  const isDisabled = Boolean(disabled);
  button.disabled = isDisabled;
  button.setAttribute('aria-disabled', String(isDisabled));
  if (isDisabled && reason) {
    button.dataset.disabledReason = reason;
    button.setAttribute('aria-description', reason);
    if (!button.dataset.enabledTitle) {
      button.dataset.enabledTitle = button.getAttribute('title') || '';
    }
    button.setAttribute('title', reason);
    return;
  }
  button.removeAttribute('aria-description');
  delete button.dataset.disabledReason;
  if (button.dataset.enabledTitle !== undefined) {
    const enabledTitle = button.dataset.enabledTitle;
    if (enabledTitle) button.setAttribute('title', enabledTitle);
    else button.removeAttribute('title');
    delete button.dataset.enabledTitle;
  }
}

function updateStats(markdown) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]+\)/g, ' ')
    .replace(/[#>*_\-[\]()~$|]/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const chars = markdown.length;
  const minutes = Math.max(1, Math.ceil(words / 220));

  readingTimeLabel.textContent = words ? `${minutes} min` : '0 min';
  wordCountLabel.textContent = `${words} word${words === 1 ? '' : 's'}`;
  charCountLabel.textContent = `${chars} char${chars === 1 ? '' : 's'}`;
}

function scheduleRender(delay = RENDER_DELAY_MS) {
  clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderActiveDocument, delay);
}

async function renderActiveDocument() {
  const doc = getActiveDocument();
  if (!doc) return;

  const contentHash = hashString(doc.content);
  if (contentHash === lastRenderedHash) return;

  const generation = ++renderGeneration;
  lastRenderedHash = contentHash;

  try {
    if (!doc.content.trim()) {
      preview.innerHTML = `<div class="empty-preview">
        <i data-lucide="file-text" aria-hidden="true"></i>
        <h1>Empty document</h1>
        <p>Start writing Markdown to see a live preview.</p>
      </div>`;
      createIcons({ icons });
      return;
    }

    if (getDocumentExtension(doc) === 'canvas') {
      preview.innerHTML = renderJsonCanvasPreview(doc);
      return;
    }

    const rawHtml = marked.parse(doc.content);
    preview.innerHTML = DOMPurify.sanitize(rawHtml, sanitizeOptions);
    enhanceAlerts();
    await renderMermaidBlocks(generation);
  } catch (error) {
    preview.innerHTML = `<pre class="render-error">${escapeHtml(error.message)}</pre>`;
  }
}

function renderJsonCanvasPreview(doc) {
  const canvas = parseJsonCanvasDocument(doc.content);
  if (!canvas) {
    return `<pre class="render-error">This .canvas file is not valid JSON Canvas.</pre>`;
  }

  const fileCards = canvas.nodes.filter((node) => node.type === 'file' && node.file);
  const textCards = canvas.nodes.filter((node) => node.type === 'text' && node.text);
  const otherCards = canvas.nodes.length - fileCards.length - textCards.length;
  const nodeLabelById = new Map(
    canvas.nodes.map((node) => [
      node.id,
      node.label || node.file || createPlainTextExcerpt(node.text || node.url || node.id || 'Canvas card', 80)
    ])
  );

  const fileCardsMarkup = fileCards.length
    ? fileCards
        .slice(0, 80)
        .map((node) => `<li><strong>${escapeHtml(node.label || stripMarkdownExtension(node.file))}</strong><span>${escapeHtml(node.file)}</span></li>`)
        .join('')
    : '<li>No file cards.</li>';
  const edgeMarkup = canvas.edges.length
    ? canvas.edges
        .slice(0, 120)
        .map((edge) => {
          const source = nodeLabelById.get(edge.fromNode) || edge.fromNode || 'Unknown';
          const target = nodeLabelById.get(edge.toNode) || edge.toNode || 'Unknown';
          return `<li><strong>${escapeHtml(source)}</strong><span>${escapeHtml(edge.label || 'connects to')}</span><strong>${escapeHtml(target)}</strong></li>`;
        })
        .join('')
    : '<li>No connections.</li>';

  return `<section class="json-canvas-preview">
    <header>
      <span>JSON Canvas</span>
      <h1>${escapeHtml(stripMarkdownExtension(doc.title || 'Canvas'))}</h1>
      <p>${canvas.nodes.length} cards · ${canvas.edges.length} connections · ${fileCards.length} file cards · ${textCards.length} text cards${otherCards ? ` · ${otherCards} other cards` : ''}</p>
    </header>
    <div class="json-canvas-preview-grid">
      <section>
        <h2>File Cards</h2>
        <ul>${fileCardsMarkup}</ul>
      </section>
      <section>
        <h2>Connections</h2>
        <ul>${edgeMarkup}</ul>
      </section>
    </div>
  </section>`;
}

async function renderMermaidBlocks(generation) {
  const blocks = [...preview.querySelectorAll('.mermaid-block')];
  if (!blocks.length) return;

  const diagramBlocks = [];

  blocks.forEach((block) => {
    const source = block.dataset.mermaid || block.textContent || '';
    if (isMermaidMindMap(source)) {
      block.innerHTML = renderMermaidMindMapPreview(source);
      block.classList.add('rendered', 'mindmap-preview');
      return;
    }
    diagramBlocks.push({ block, source });
  });

  if (!diagramBlocks.length) return;

  if (!mermaidModule) {
    mermaidModule = await import('mermaid');
  }

  if (generation !== renderGeneration) return;

  const mermaid = mermaidModule.default || mermaidModule;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: getTheme() === 'dark' ? 'dark' : 'default'
  });

  await Promise.all(
    diagramBlocks.map(async ({ block, source }, index) => {
      const id = `mermaid-${Date.now()}-${index}-${Math.abs(hashNumber(source))}`;

      try {
        const { svg } = await mermaid.render(id, source);
        if (generation !== renderGeneration) return;
        block.innerHTML = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_ATTR: ['style', 'class', 'viewBox', 'role', 'aria-roledescription', 'aria-label']
        });
        block.classList.add('rendered');
      } catch (error) {
        block.innerHTML = `<pre class="render-error">${escapeHtml(error.message)}</pre>`;
      }
    })
  );
}

function isMermaidMindMap(source) {
  return String(source || '')
    .split(/\r?\n/)
    .some((line) => line.trim().toLowerCase() === 'mindmap');
}

function renderMermaidMindMapPreview(source) {
  const tree = parseMermaidMindMap(source);
  if (!tree) {
    return '<pre class="render-error">Mind map has no readable nodes.</pre>';
  }

  const layout = layoutMermaidMindMapPreview(tree);
  const edgeMarkup = layout.edges
    .map((edge) => {
      const sourceNode = layout.nodeById.get(edge.source);
      const targetNode = layout.nodeById.get(edge.target);
      if (!sourceNode || !targetNode) return '';
      const sourceX = sourceNode.x + sourceNode.width;
      const sourceY = sourceNode.y + sourceNode.height / 2;
      const targetX = targetNode.x;
      const targetY = targetNode.y + targetNode.height / 2;
      const controlX = Math.round((sourceX + targetX) / 2);
      return `<path class="preview-mind-map-edge" d="M ${sourceX} ${sourceY} C ${controlX} ${sourceY}, ${controlX} ${targetY}, ${targetX} ${targetY}" />`;
    })
    .join('');
  const nodeMarkup = layout.nodes
    .map((node) => {
      const lines = wrapMindMapPreviewLabel(node.label, node.width);
      const textY = node.y + node.height / 2 - ((lines.length - 1) * 15) / 2;
      const text = lines
        .map((line, index) => `<tspan x="${node.x + node.width / 2}" y="${textY + index * 15}">${escapeHtml(line)}</tspan>`)
        .join('');
      return `<g class="preview-mind-map-node${node.depth === 0 ? ' root' : ''}" role="listitem">
        <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="10"></rect>
        <text>${text}</text>
      </g>`;
    })
    .join('');

  return `<svg class="preview-mind-map-svg" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="Mermaid mind map preview">
    <g role="list">
      ${edgeMarkup}
      ${nodeMarkup}
    </g>
  </svg>`;
}

function parseMermaidMindMap(source) {
  const rawLines = String(source || '').split(/\r?\n/);
  const contentLines = [];
  let sawMindMap = false;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('%%')) continue;
    if (!sawMindMap) {
      if (trimmed.toLowerCase() === 'mindmap') sawMindMap = true;
      continue;
    }
    contentLines.push({
      indent: rawLine.match(/^\s*/)?.[0].replace(/\t/g, '  ').length || 0,
      label: cleanMermaidMindMapLabel(trimmed)
    });
  }

  const readableLines = contentLines.filter((line) => line.label);
  if (!readableLines.length) return null;

  const root = {
    id: 'preview-map-node-0',
    label: readableLines[0].label,
    children: [],
    depth: 0
  };
  const stack = [{ indent: readableLines[0].indent, node: root }];

  for (let index = 1; index < readableLines.length; index += 1) {
    const line = readableLines[index];
    const node = {
      id: `preview-map-node-${index}`,
      label: line.label,
      children: [],
      depth: 0
    };

    while (stack.length > 1 && line.indent <= stack.at(-1).indent) {
      stack.pop();
    }

    const parent = stack.at(-1).node;
    node.depth = parent.depth + 1;
    parent.children.push(node);
    stack.push({ indent: line.indent, node });
  }

  return root;
}

function cleanMermaidMindMapLabel(value) {
  let label = String(value || '').trim();
  label = label.replace(/^[-*+]\s+/, '').trim();
  label = extractMermaidMindMapShapeLabel(label);

  let changed = true;
  while (changed) {
    changed = false;
    for (const [prefix, suffix] of [
      ['((', '))'],
      ['{{', '}}'],
      ['[', ']'],
      ['(', ')'],
      ['"', '"'],
      ["'", "'"]
    ]) {
      if (label.startsWith(prefix) && label.endsWith(suffix) && label.length > prefix.length + suffix.length) {
        label = label.slice(prefix.length, -suffix.length).trim();
        changed = true;
      }
    }
  }

  return label.replace(/\s+/g, ' ').slice(0, 120);
}

function extractMermaidMindMapShapeLabel(value) {
  const label = String(value || '').trim();
  const identifier = '[A-Za-z_][\\w.-]*';
  const patterns = [
    new RegExp(`^${identifier}\\s*\\(\\(([\\s\\S]+)\\)\\)$`),
    new RegExp(`^${identifier}\\s*\\(\\[([\\s\\S]+)\\]\\)$`),
    new RegExp(`^${identifier}\\s*\\[\\[([\\s\\S]+)\\]\\]$`),
    new RegExp(`^${identifier}\\s*\\{\\{([\\s\\S]+)\\}\\}$`),
    new RegExp(`^${identifier}\\s*\\[([\\s\\S]+)\\]$`),
    new RegExp(`^${identifier}\\s*\\(([\\s\\S]+)\\)$`),
    new RegExp(`^${identifier}\\s*\\{([\\s\\S]+)\\}$`)
  ];

  for (const pattern of patterns) {
    const match = label.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return label;
}

function layoutMermaidMindMapPreview(root) {
  const nodes = [];
  const edges = [];
  const leafHeight = 78;
  const columnWidth = 260;
  const padding = 34;

  function measure(node) {
    if (!node.children.length) {
      node.leaves = 1;
      return 1;
    }
    node.leaves = node.children.reduce((sum, child) => sum + measure(child), 0);
    return node.leaves;
  }

  function place(node, depth, leafTop) {
    const width = Math.max(142, Math.min(236, 72 + node.label.length * 8));
    const height = node.label.length > 28 ? 62 : 50;
    const span = node.leaves * leafHeight;
    const x = padding + depth * columnWidth;
    const y = padding + leafTop * leafHeight + (span - height) / 2;
    const placed = {
      id: node.id,
      label: node.label,
      depth,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height
    };
    nodes.push(placed);

    let cursor = leafTop;
    for (const child of node.children) {
      edges.push({ source: node.id, target: child.id });
      place(child, depth + 1, cursor);
      cursor += child.leaves;
    }
  }

  measure(root);
  place(root, 0, 0);
  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);
  const width = Math.max(420, padding * 2 + maxDepth * columnWidth + 250);
  const height = Math.max(220, padding * 2 + root.leaves * leafHeight);

  return {
    nodes,
    edges,
    nodeById: new Map(nodes.map((node) => [node.id, node])),
    width,
    height
  };
}

function wrapMindMapPreviewLabel(label, width) {
  const words = String(label || '').split(/\s+/).filter(Boolean);
  const maxChars = Math.max(12, Math.floor(width / 8));
  const lines = [];
  let line = '';

  for (const word of words) {
    if (!line) {
      line = word;
    } else if (`${line} ${word}`.length <= maxChars) {
      line = `${line} ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  return (lines.length ? lines : [String(label || 'Node')]).slice(0, 3);
}

function enhanceAlerts() {
  const alertTypes = new Set(['note', 'tip', 'important', 'warning', 'caution']);

  preview.querySelectorAll('blockquote').forEach((blockquote) => {
    const firstParagraph = blockquote.querySelector('p:first-child');
    if (!firstParagraph) return;

    const match = firstParagraph.textContent.trim().match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)]/i);
    if (!match) return;

    const type = match[1].toLowerCase();
    if (!alertTypes.has(type)) return;

    blockquote.classList.add('markdown-alert', `markdown-alert-${type}`);
    firstParagraph.innerHTML = firstParagraph.innerHTML.replace(
      /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)]\s*/i,
      `<strong class="markdown-alert-title">${type.toUpperCase()}</strong> `
    );
  });
}

function renderMath(source, displayMode) {
  try {
    return katex.renderToString(source, {
      displayMode,
      throwOnError: false,
      output: 'html'
    });
  } catch (error) {
    return `<code>${escapeHtml(error.message)}</code>`;
  }
}

function setViewMode(nextMode, shouldPersist = true) {
  viewMode = VALID_VIEW_MODES.has(nextMode) ? nextMode : 'split';
  workspace.classList.remove('split', 'editor', 'preview');
  workspace.classList.add(viewMode);

  document.querySelectorAll('[data-view-mode]').forEach((button) => {
    const active = button.dataset.viewMode === viewMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  if (shouldPersist) persistSession();
}

function syncScroll(source) {
  if (viewMode !== 'split' || syncScrollLock) return;

  const editorScroller = getEditorScrollElement();
  if (!editorScroller) return;

  const editorMax = editorScroller.scrollHeight - editorScroller.clientHeight;
  const previewPane = document.querySelector('.preview-pane');
  const previewMax = previewPane.scrollHeight - previewPane.clientHeight;

  if (editorMax <= 0 || previewMax <= 0) return;

  syncScrollLock = true;
  requestAnimationFrame(() => {
    if (source === 'editor') {
      previewPane.scrollTop = (editorScroller.scrollTop / editorMax) * previewMax;
    } else {
      editorScroller.scrollTop = (previewPane.scrollTop / previewMax) * editorMax;
    }
    syncScrollLock = false;
  });
}

function setTheme(theme, shouldPersist = true) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nextTheme;
  themeToggle?.setAttribute('aria-label', nextTheme === 'dark' ? 'Use light theme' : 'Use dark theme');
  themeToggle?.setAttribute('title', nextTheme === 'dark' ? 'Use light theme' : 'Use dark theme');
  if (themeToggle) {
    themeToggle.innerHTML = `<i data-lucide="${nextTheme === 'dark' ? 'sun' : 'moon'}" aria-hidden="true"></i>`;
    createIcons({ icons });
  }

  if (shouldPersist) {
    localStorage.setItem(THEME_KEY, nextTheme);
    lastRenderedHash = '';
    scheduleRender(0);
  }
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

function getTheme() {
  return document.documentElement.dataset.theme || 'light';
}

function syncNativeDocumentState() {
  const activeDocument = getActiveDocument();
  native.setDocumentState({
    dirtyCount: documents.filter((doc) => doc.dirty).length,
    activePath: activeDocument?.path || null,
    activeTitle: activeDocument?.title || UNTITLED_NAME
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastRegion.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add('leaving');
    window.setTimeout(() => toast.remove(), 180);
  }, 2800);
}

function stripMarkdownExtension(name) {
  return String(name || 'Markdown Export').replace(/\.(md|markdown|mdown|mkd|txt|canvas)$/i, '');
}

function sanitizeFileName(name) {
  const cleaned = String(name || UNTITLED_NAME).replace(/[<>:"/\\|?*]/g, '-');
  return /\.(md|markdown)$/i.test(cleaned) ? cleaned : `${cleaned}.md`;
}

function normalizeFileState(fileState) {
  if (!fileState || typeof fileState !== 'object') return null;
  const size = Number(fileState.size);
  const mtimeMs = Number(fileState.mtimeMs);
  if (!Number.isFinite(size) || !Number.isFinite(mtimeMs)) return null;
  return {
    size,
    mtimeMs: Math.round(mtimeMs)
  };
}

function fileStatesMatch(left, right) {
  const a = normalizeFileState(left);
  const b = normalizeFileState(right);
  return Boolean(a && b && a.size === b.size && a.mtimeMs === b.mtimeMs);
}

function formatBytes(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('\n', '&#10;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hashString(value) {
  return `${value.length}:${hashNumber(value)}`;
}

function hashNumber(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

function roundGraphNumber(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
