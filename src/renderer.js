import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
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
import {
  Code2,
  Columns2,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileDown,
  FileInput,
  FileText,
  FolderOpen,
  Moon,
  Plus,
  Save,
  SaveAll,
  Sun,
  createIcons
} from 'lucide';
import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import sampleMarkdown from './sample.md?raw';
import './styles.css';

const native = window.markdownNative;
const SESSION_KEY = 'markdown-viewer-mac-session-v1';
const THEME_KEY = 'markdown-viewer-mac-theme';
const UNTITLED_NAME = 'Untitled.md';
const RENDER_DELAY_MS = 90;

const editor = document.getElementById('markdown-editor');
const preview = document.getElementById('markdown-preview');
const workspace = document.getElementById('workspace');
const tabsBar = document.getElementById('tabs-bar');
const filePathLabel = document.getElementById('file-path');
const saveStateLabel = document.getElementById('save-state');
const readingTimeLabel = document.getElementById('reading-time');
const wordCountLabel = document.getElementById('word-count');
const charCountLabel = document.getElementById('char-count');
const dropOverlay = document.getElementById('drop-overlay');
const toastRegion = document.getElementById('toast-region');
const themeToggle = document.getElementById('theme-toggle');

let documents = [];
let activeDocumentId = null;
let renderTimer = null;
let lastRenderedHash = '';
let renderGeneration = 0;
let mermaidModule = null;
let viewMode = 'split';
let syncScrollLock = false;

const icons = {
  Code2,
  Columns2,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileDown,
  FileInput,
  FileText,
  FolderOpen,
  Moon,
  Plus,
  Save,
  SaveAll,
  Sun
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
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
};

const mathBlockExtension = {
  name: 'mathBlock',
  level: 'block',
  start(source) {
    const index = source.match(/\$\$/)?.index;
    return index;
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
    return source.indexOf('\\(');
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

bootstrap();

function bootstrap() {
  hydrateTheme();
  hydrateSession();
  bindDomEvents();
  renderDocumentTabs();
  activateDocument(activeDocumentId || documents[0]?.id);
  native?.rendererReady();
  createIcons({ icons });
}

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
      content: String(document.content ?? '')
    }));
    activeDocumentId = saved.activeDocumentId || documents[0].id;
    viewMode = saved.viewMode || 'split';
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

function persistSession() {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      documents,
      activeDocumentId,
      viewMode
    })
  );
}

function bindDomEvents() {
  document.getElementById('open-file').addEventListener('click', openFromDialog);
  document.getElementById('save-file').addEventListener('click', saveActiveDocument);
  document.getElementById('save-file-as').addEventListener('click', saveActiveDocumentAs);
  document.getElementById('copy-markdown').addEventListener('click', copyActiveMarkdown);
  document.getElementById('export-html').addEventListener('click', exportActiveHtml);
  document.getElementById('export-pdf').addEventListener('click', exportActivePdf);
  document.getElementById('new-tab').addEventListener('click', createUntitledDocument);
  document.getElementById('reveal-file').addEventListener('click', revealActiveFile);
  themeToggle.addEventListener('click', () => toggleTheme());

  document.querySelectorAll('[data-view-mode]').forEach((button) => {
    button.addEventListener('click', () => setViewMode(button.dataset.viewMode));
  });

  editor.addEventListener('input', () => {
    const doc = getActiveDocument();
    if (!doc) return;

    doc.content = editor.value;
    doc.dirty = true;
    updateStats(doc.content);
    updateStatus();
    renderDocumentTabs();
    scheduleRender();
    persistSession();
  });

  editor.addEventListener('scroll', () => syncScroll('editor'));
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

  document.addEventListener('keydown', (event) => {
    const isCommand = event.metaKey || event.ctrlKey;
    if (!isCommand) return;

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
      openFromDialog();
    }

    if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      createUntitledDocument();
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

    const paths = [...event.dataTransfer.files].map((file) => file.path).filter(Boolean);
    if (!paths.length) {
      showToast('No local file paths were available for this drop.');
      return;
    }

    const opened = await native.openPaths(paths);
    addOpenedDocuments(opened);
  });

  preview.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    event.preventDefault();
    native.openExternal(href);
  });

  native.onSystemOpenFiles((files) => addOpenedDocuments(files));
  native.onMenuCommand((command) => {
    if (command === 'new') createUntitledDocument();
    if (command === 'open') openFromDialog();
    if (command === 'save') saveActiveDocument();
    if (command === 'save-as') saveActiveDocumentAs();
    if (command === 'export-html') exportActiveHtml();
    if (command === 'export-pdf') exportActivePdf();
    if (command === 'view:split') setViewMode('split');
    if (command === 'view:editor') setViewMode('editor');
    if (command === 'view:preview') setViewMode('preview');
  });
}

function createDocument({ title, path = null, content = '', dirty = false, lastSavedAt = null }) {
  return {
    id: crypto.randomUUID(),
    title: title || path?.split(/[\\/]/).pop() || UNTITLED_NAME,
    path,
    content,
    dirty,
    lastSavedAt
  };
}

function createUntitledDocument() {
  const doc = createDocument({
    title: nextUntitledName(),
    content: '',
    dirty: false
  });

  documents.push(doc);
  activateDocument(doc.id);
  persistSession();
  showToast('New document created.');
}

function nextUntitledName() {
  const untitledCount = documents.filter((doc) => doc.title.startsWith('Untitled')).length;
  return untitledCount ? `Untitled ${untitledCount + 1}.md` : UNTITLED_NAME;
}

async function openFromDialog() {
  const opened = await native.openDialog();
  addOpenedDocuments(opened);
}

function addOpenedDocuments(opened) {
  if (!opened?.length) return;

  const canReplaceStarter =
    documents.length === 1 &&
    !documents[0].path &&
    !documents[0].dirty &&
    documents[0].content === sampleMarkdown;

  if (canReplaceStarter) {
    documents = [];
  }

  const newDocuments = opened.map((file) =>
    createDocument({
      title: file.name,
      path: file.path,
      content: file.content,
      dirty: false,
      lastSavedAt: file.lastSavedAt
    })
  );

  documents.push(...newDocuments);
  activateDocument(newDocuments[0].id);
  persistSession();
  showToast(`${newDocuments.length} file${newDocuments.length === 1 ? '' : 's'} opened.`);
}

function activateDocument(documentId) {
  const doc = documents.find((candidate) => candidate.id === documentId);
  if (!doc) return;

  activeDocumentId = doc.id;
  editor.value = doc.content;
  lastRenderedHash = '';
  setViewMode(viewMode, false);
  updateStats(doc.content);
  updateStatus();
  renderDocumentTabs();
  scheduleRender(0);
  persistSession();
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
  }

  persistSession();
}

function renderDocumentTabs() {
  tabsBar.innerHTML = documents
    .map((doc) => {
      const active = doc.id === activeDocumentId ? ' active' : '';
      const dirty = doc.dirty ? '<span class="dirty-dot" aria-hidden="true"></span>' : '';
      const label = escapeHtml(doc.title);
      return `<button class="tab${active}" role="tab" type="button" data-tab-id="${doc.id}" aria-selected="${doc.id === activeDocumentId}">
        <i data-lucide="file-text" aria-hidden="true"></i>
        <span class="tab-title">${label}</span>
        ${dirty}
        <span class="tab-close" role="button" tabindex="-1" data-close-tab="${doc.id}" title="Close ${label}">x</span>
      </button>`;
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
      content: doc.content
    });
    applySaveResult(doc, result);
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
    showToast('Saved.');
  } catch (error) {
    showToast(`Save failed: ${error.message}`);
  }
}

function applySaveResult(doc, result) {
  doc.path = result.path;
  doc.title = result.name;
  doc.lastSavedAt = result.lastSavedAt;
  doc.dirty = false;
  updateStatus();
  renderDocumentTabs();
  persistSession();
}

async function copyActiveMarkdown() {
  const doc = getActiveDocument();
  if (!doc) return;

  await navigator.clipboard.writeText(doc.content);
  showToast('Markdown copied.');
}

async function exportActiveHtml() {
  const doc = getActiveDocument();
  if (!doc) return;

  try {
    const result = await native.exportHtml({
      title: stripMarkdownExtension(doc.title),
      defaultPath: `${stripMarkdownExtension(doc.title)}.html`,
      body: preview.innerHTML,
      theme: getTheme()
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
      theme: getTheme()
    });

    if (result) showToast('PDF exported.');
  } catch (error) {
    showToast(`PDF export failed: ${error.message}`);
  }
}

async function revealActiveFile() {
  const doc = getActiveDocument();
  if (!doc?.path) {
    showToast('Save this document before revealing it.');
    return;
  }

  await native.revealFile(doc.path);
}

function updateStatus() {
  const doc = getActiveDocument();
  if (!doc) return;

  filePathLabel.textContent = doc.path || doc.title;
  saveStateLabel.textContent = doc.dirty ? 'Unsaved' : 'Saved';
  saveStateLabel.classList.toggle('dirty', doc.dirty);
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
    const rawHtml = marked.parse(doc.content);
    preview.innerHTML = DOMPurify.sanitize(rawHtml, sanitizeOptions);
    enhanceAlerts();
    await renderMermaidBlocks(generation);
  } catch (error) {
    preview.innerHTML = `<pre class="render-error">${escapeHtml(error.message)}</pre>`;
  }
}

async function renderMermaidBlocks(generation) {
  const blocks = [...preview.querySelectorAll('.mermaid-block')];
  if (!blocks.length) return;

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
    blocks.map(async (block, index) => {
      const source = block.dataset.mermaid || '';
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
  viewMode = nextMode || 'split';
  workspace.classList.remove('split', 'editor', 'preview');
  workspace.classList.add(viewMode);

  document.querySelectorAll('[data-view-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.viewMode === viewMode);
  });

  if (shouldPersist) persistSession();
}

function syncScroll(source) {
  if (viewMode !== 'split' || syncScrollLock) return;

  const editorMax = editor.scrollHeight - editor.clientHeight;
  const previewPane = document.querySelector('.preview-pane');
  const previewMax = previewPane.scrollHeight - previewPane.clientHeight;

  if (editorMax <= 0 || previewMax <= 0) return;

  syncScrollLock = true;
  requestAnimationFrame(() => {
    if (source === 'editor') {
      previewPane.scrollTop = (editor.scrollTop / editorMax) * previewMax;
    } else {
      editor.scrollTop = (previewPane.scrollTop / previewMax) * editorMax;
    }
    syncScrollLock = false;
  });
}

function setTheme(theme, shouldPersist = true) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nextTheme;
  themeToggle?.setAttribute('aria-label', nextTheme === 'dark' ? 'Use light theme' : 'Use dark theme');
  themeToggle?.setAttribute('title', nextTheme === 'dark' ? 'Use light theme' : 'Use dark theme');

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
  return String(name || 'Markdown Export').replace(/\.(md|markdown|mdown|mkd)$/i, '');
}

function sanitizeFileName(name) {
  const cleaned = String(name || UNTITLED_NAME).replace(/[<>:"/\\|?*]/g, '-');
  return /\.(md|markdown)$/i.test(cleaned) ? cleaned : `${cleaned}.md`;
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
