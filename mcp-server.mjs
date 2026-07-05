#!/usr/bin/env node

/**
 * Shibanshu Markdown Viewer — MCP Server
 *
 * Exposes the app's markdown vault, graph, mind-map, context-map, and
 * note-creation capabilities as Model Context Protocol tools that
 * Claude Code (or any MCP client) can call directly.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import fsp from 'node:fs/promises';
import { readdir, readFile, stat, mkdir, rename, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, 'bin', 'shibanshu-markdown.mjs');
const EXPORT_SCRIPT = path.join(__dirname, 'scripts', 'export-claude-map.mjs');

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd', '.txt', '.canvas']);
const IGNORED_DIRS = new Set(['.git', '.hg', '.svn', 'node_modules', 'dist', 'release', 'build', '.next', '.cache', '.venv', 'vendor', 'target', 'coverage']);
const MAX_VAULT_FILES = 2000;
const MAX_VAULT_DEPTH = 16;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_SEARCH_RESULTS = 50;

// ─── Tool definitions ────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'vault_list_files',
    description: 'List all markdown files in a vault/folder recursively. Returns file paths, sizes, and word counts.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the vault/folder to scan' },
        max_files: { type: 'number', description: 'Max files to return (default 500)', default: 500 },
        pattern: { type: 'string', description: 'Optional glob-like filter (e.g. "notes/" to only show files in notes/)' }
      },
      required: ['path']
    }
  },
  {
    name: 'vault_read_note',
    description: 'Read the full content of a markdown file from a vault.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the markdown file' }
      },
      required: ['path']
    }
  },
  {
    name: 'vault_write_note',
    description: 'Create or overwrite a markdown note. Use vault_create_note for safe creation that won\'t overwrite.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the markdown file' },
        content: { type: 'string', description: 'Markdown content to write' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'vault_create_note',
    description: 'Atomically create a new markdown note. Fails if the file already exists (safe — won\'t overwrite).',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path for the new file' },
        content: { type: 'string', description: 'Markdown content (defaults to a heading from the filename)' },
        title: { type: 'string', description: 'Optional title override for the default heading' }
      },
      required: ['path']
    }
  },
  {
    name: 'vault_search',
    description: 'Search markdown files in a vault by content or filename. Returns matching files with context snippets.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the vault/folder to search' },
        query: { type: 'string', description: 'Search query (case-insensitive substring match)' },
        max_results: { type: 'number', description: 'Max results (default 20)', default: 20 }
      },
      required: ['path', 'query']
    }
  },
  {
    name: 'generate_context_map',
    description: 'Generate a full Claude-ready context map for a vault or repository. Outputs: claude-context-map.md, claude-context-navigation.md, claude-context-mind-map.md, claude-context-graph.json, llm-context-chunks.jsonl. This is the primary tool for deep vault/repo analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the vault/repo to analyze' },
        output_dir: { type: 'string', description: 'Output directory (default: <path>/.shibanshu)' },
        max_files: { type: 'number', description: 'Max files to index (default 5000)' },
        max_bytes: { type: 'number', description: 'Max file size in bytes to read (default 768000)' },
        chunk_tokens: { type: 'number', description: 'Target tokens per JSONL chunk (default 900)' }
      },
      required: ['path']
    }
  },
  {
    name: 'read_context_map',
    description: 'Read a previously generated context map file. Use after generate_context_map.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the vault/repo that was analyzed' },
        file: {
          type: 'string',
          description: 'Which context file to read',
          enum: ['navigation', 'map', 'mind-map', 'graph', 'scene', 'chunks', 'integrity']
        },
        output_dir: { type: 'string', description: 'Output directory if non-default was used' }
      },
      required: ['path', 'file']
    }
  },
  {
    name: 'generate_graph_json',
    description: 'Generate a JSON knowledge graph of a vault showing nodes (files), edges (links between files), hubs, bridges, orphans, and clusters. Lighter-weight than full context map.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the vault/folder' },
        max_files: { type: 'number', description: 'Max files to scan (default 1000)', default: 1000 }
      },
      required: ['path']
    }
  },
  {
    name: 'generate_mind_map',
    description: 'Generate a Mermaid mind-map diagram from a single markdown file\'s headings, links, tags, and tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the markdown file' }
      },
      required: ['path']
    }
  },
  {
    name: 'extract_links',
    description: 'Extract all wiki-links ([[target]]), markdown links ([text](url)), and embeds (![[file]]) from a markdown file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the markdown file' }
      },
      required: ['path']
    }
  },
  {
    name: 'extract_headings',
    description: 'Extract the heading structure (outline) from a markdown file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the markdown file' }
      },
      required: ['path']
    }
  },
  {
    name: 'extract_tags',
    description: 'Extract all #tags and frontmatter tags from a markdown file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the markdown file' }
      },
      required: ['path']
    }
  },
  {
    name: 'vault_backlinks',
    description: 'Find all files in a vault that link to a given note (backlinks).',
    inputSchema: {
      type: 'object',
      properties: {
        vault_path: { type: 'string', description: 'Absolute path to the vault root' },
        note_path: { type: 'string', description: 'Absolute path to the target note (or just filename)' }
      },
      required: ['vault_path', 'note_path']
    }
  },
  {
    name: 'publish_static_site',
    description: 'Publish a vault as a static HTML website with search, backlinks, and graph.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the vault/folder' },
        output_dir: { type: 'string', description: 'Output directory for the site' },
        title: { type: 'string', description: 'Site title' },
        theme: { type: 'string', enum: ['light', 'dark'], description: 'Theme (default light)' }
      },
      required: ['path', 'output_dir']
    }
  },
  {
    name: 'create_daily_note',
    description: 'Create a daily note for today (or a specific date) with a structured template: tasks, notes, goals, log sections.',
    inputSchema: {
      type: 'object',
      properties: {
        vault_path: { type: 'string', description: 'Absolute path to the vault/folder to create the note in' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' },
        subfolder: { type: 'string', description: 'Subfolder within vault (e.g. "daily" creates daily/2026-07-05.md)' }
      },
      required: ['vault_path']
    }
  },
  {
    name: 'generate_3d_graph_viewer',
    description: 'Generate an interactive 3D graph visualization of a codebase as a self-contained HTML file. Opens in any browser — rotating universe view with clickable nodes showing file details, connections, hubs, orphans. The key visual demo of how context mapping works.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the vault/repo to visualize' },
        output: { type: 'string', description: 'Output HTML file path (defaults to <path>/.shibanshu/graph-viewer.html)' },
        max_files: { type: 'number', description: 'Max files to include (default 500)' },
        open: { type: 'boolean', description: 'Auto-open in browser after generating (default true)' }
      },
      required: ['path']
    }
  },
  {
    name: 'enable_auto_mapping',
    description: 'Install a git post-commit hook that auto-regenerates the context map after every commit. The map stays fresh without manual re-runs. Also checks if map is stale (older than latest commit) and regenerates if needed.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the git repo' },
        refresh_now: { type: 'boolean', description: 'Also regenerate the map right now if stale (default true)' }
      },
      required: ['path']
    }
  },
  {
    name: 'check_map_freshness',
    description: 'Check if a context map is up-to-date with the repo. Compares map generation time against latest git commit. Returns stale/fresh status and optionally regenerates if stale.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the repo' },
        auto_refresh: { type: 'boolean', description: 'Auto-regenerate if stale (default false)' }
      },
      required: ['path']
    }
  }
];

// ─── File utilities ──────────────────────────────────────────────────

function isMarkdownFile(name) {
  const ext = path.extname(name).toLowerCase();
  return MARKDOWN_EXTENSIONS.has(ext);
}

async function walkVault(root, maxFiles = MAX_VAULT_FILES) {
  const results = [];
  async function walk(dir, depth) {
    if (results.length >= maxFiles || depth > MAX_VAULT_DEPTH) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch { return; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (isMarkdownFile(entry.name)) {
        try {
          const s = await stat(fullPath);
          results.push({
            path: fullPath,
            relativePath: path.relative(root, fullPath),
            name: entry.name,
            size: s.size,
            modified: s.mtime.toISOString()
          });
        } catch { /* skip unreadable */ }
      }
    }
  }
  await walk(root, 0);
  return results;
}

function extractMarkdownHeadings(content) {
  const headings = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match) {
      headings.push({ level: match[1].length, text: match[2].trim(), line: i + 1 });
    }
  }
  return headings;
}

function extractMarkdownTags(content) {
  const tags = new Set();
  // Frontmatter tags
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const tagLine = fmMatch[1].match(/^tags:\s*(.+)/m);
    if (tagLine) {
      tagLine[1].replace(/[\[\]]/g, '').split(/[,\s]+/).filter(Boolean).forEach(t => tags.add(t.replace(/^#/, '')));
    }
  }
  // Inline #tags
  const inlinePattern = /(?:^|\s)#([a-zA-Z][\w/-]{0,58})\b/g;
  let m;
  while ((m = inlinePattern.exec(content))) {
    const tag = m[1].toLowerCase();
    if (!['x27', 'x60', 'region', 'endregion', 'pragma', 'include', 'define', 'ifdef', 'ifndef', 'endif'].includes(tag)) {
      tags.add(tag);
    }
  }
  return [...tags];
}

function extractMarkdownLinks(content) {
  const links = [];
  // Wiki links
  const wikiPattern = /(!?)\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = wikiPattern.exec(content))) {
    const isEmbed = m[1] === '!';
    const parts = m[2].split('|');
    links.push({ kind: isEmbed ? 'embed' : 'wiki-link', target: parts[0].trim(), alias: parts[1]?.trim() || null });
  }
  // Markdown links
  const mdPattern = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;
  while ((m = mdPattern.exec(content))) {
    const isImage = m[1] === '!';
    const href = m[3].trim();
    if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('#')) {
      links.push({ kind: isImage ? 'embed' : 'markdown-link', target: href, text: m[2] });
    }
  }
  return links;
}

function generateMindMap(filePath, content) {
  const headings = extractMarkdownHeadings(content);
  const links = extractMarkdownLinks(content);
  const tags = extractMarkdownTags(content);
  const title = path.basename(filePath, path.extname(filePath));

  let mermaid = `mindmap\n  root((${cleanMermaidLabel(title)}))\n`;

  if (headings.length > 0) {
    mermaid += '    Headings\n';
    for (const h of headings.slice(0, 30)) {
      mermaid += `      ${cleanMermaidLabel(h.text)}\n`;
    }
  }

  const outgoing = links.filter(l => l.kind !== 'embed');
  if (outgoing.length > 0) {
    mermaid += '    Links\n';
    for (const l of outgoing.slice(0, 20)) {
      mermaid += `      ${cleanMermaidLabel(l.target)}\n`;
    }
  }

  const embeds = links.filter(l => l.kind === 'embed');
  if (embeds.length > 0) {
    mermaid += '    Embeds\n';
    for (const e of embeds.slice(0, 10)) {
      mermaid += `      ${cleanMermaidLabel(e.target)}\n`;
    }
  }

  if (tags.length > 0) {
    mermaid += '    Tags\n';
    for (const t of tags.slice(0, 15)) {
      mermaid += `      #${cleanMermaidLabel(t)}\n`;
    }
  }

  // Tasks
  const taskPattern = /- \[([ xX])\]\s+(.+)/g;
  const tasks = [];
  let tm;
  while ((tm = taskPattern.exec(content)) && tasks.length < 15) {
    tasks.push({ done: tm[1] !== ' ', text: tm[2].trim() });
  }
  if (tasks.length > 0) {
    mermaid += '    Tasks\n';
    for (const t of tasks) {
      mermaid += `      ${t.done ? '[x]' : '[ ]'} ${cleanMermaidLabel(t.text.substring(0, 60))}\n`;
    }
  }

  return mermaid;
}

function cleanMermaidLabel(value) {
  return value
    .replace(/[()[\]{}<>]/g, ' ')
    .replace(/["'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80) || 'untitled';
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function normalizeAbsolutePath(rawPath, label = 'Path') {
  const value = String(rawPath ?? '').trim();
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  if (value.includes('\0')) {
    throw new Error(`${label} contains an invalid null byte.`);
  }
  return path.resolve(value);
}

function parsePositiveInteger(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

async function assertDirectoryPath(rawPath, label = 'Vault path') {
  const directoryPath = normalizeAbsolutePath(rawPath, label);
  const s = await stat(directoryPath);
  if (!s.isDirectory()) {
    throw new Error(`${label} is not a directory: ${directoryPath}`);
  }
  return directoryPath;
}

function assertMarkdownPath(rawPath, label = 'Markdown path') {
  const filePath = normalizeAbsolutePath(rawPath, label);
  if (!isMarkdownFile(filePath)) {
    throw new Error(`${label} must end with .md, .markdown, .mdown, .mkd, .txt, or .canvas.`);
  }
  return filePath;
}

async function assertReadableMarkdownFile(rawPath, label = 'Markdown file') {
  const filePath = assertMarkdownPath(rawPath, label);
  const s = await stat(filePath);
  if (!s.isFile()) {
    throw new Error(`${label} is not a file: ${filePath}`);
  }
  if (s.size > MAX_FILE_SIZE) {
    throw new Error(`File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`);
  }
  return { filePath, stats: s };
}

function coerceToolTextContent(value) {
  const text = String(value ?? '');
  if (Buffer.byteLength(text, 'utf8') > MAX_FILE_SIZE) {
    throw new Error(`Content exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`);
  }
  return text;
}

function normalizeVaultRelativePath(rawPath, label = 'Vault-relative path', options = {}) {
  const { defaultExtension = '', requireMarkdownExtension = false, allowEmpty = false } = options;
  let value = String(rawPath ?? '').replaceAll('\\', '/').trim();
  if (!value && allowEmpty) return '';
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  if (value.includes('\0')) {
    throw new Error(`${label} contains an invalid null byte.`);
  }
  if (value.startsWith('/') || /^[a-z]:/i.test(value)) {
    throw new Error(`${label} must be relative to the vault.`);
  }
  if (defaultExtension && !path.posix.extname(value)) {
    value = `${value}${defaultExtension}`;
  }

  const normalized = path.posix.normalize(value);
  if (
    normalized === '.' ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized.endsWith('/..')
  ) {
    throw new Error(`${label} cannot escape the vault.`);
  }
  if (requireMarkdownExtension && !isMarkdownFile(normalized)) {
    throw new Error(`${label} must end with .md, .markdown, .mdown, .mkd, .txt, or .canvas.`);
  }
  return normalized;
}

function assertInsideRoot(rootPath, candidatePath, label = 'Path') {
  const relative = path.relative(rootPath, candidatePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} cannot escape the vault.`);
  }
  return relative;
}

function resolveVaultChildPath(rootPath, relativePath, label = 'Vault-relative path', options = {}) {
  const root = normalizeAbsolutePath(rootPath, 'Vault path');
  const normalizedRelative = normalizeVaultRelativePath(relativePath, label, options);
  const filePath = path.resolve(root, ...normalizedRelative.split('/'));
  const relativeFromRoot = assertInsideRoot(root, filePath, label);
  return {
    rootPath: root,
    filePath,
    relativePath: relativeFromRoot.replaceAll(path.sep, '/')
  };
}

function normalizeBacklinkTarget(rootPath, notePath) {
  const raw = String(notePath ?? '').trim();
  if (!raw) {
    throw new Error('Target note path is required.');
  }
  if (raw.includes('\0')) {
    throw new Error('Target note path contains an invalid null byte.');
  }

  let relativeTarget = raw.replaceAll('\\', '/');
  if (path.isAbsolute(raw) || /^[a-z]:/i.test(raw)) {
    const filePath = assertMarkdownPath(raw, 'Target note path');
    relativeTarget = assertInsideRoot(rootPath, filePath, 'Target note path').replaceAll(path.sep, '/');
  } else {
    relativeTarget = normalizeVaultRelativePath(raw, 'Target note path');
  }

  return {
    name: path.basename(relativeTarget, path.extname(relativeTarget)).toLowerCase(),
    relative: relativeTarget.toLowerCase().replace(/\.[^.]+$/, '')
  };
}

function normalizeDateString(value) {
  const dateStr = value || new Date().toISOString().split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Date must use YYYY-MM-DD format.');
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
    throw new Error('Date must be a real calendar date in YYYY-MM-DD format.');
  }
  return { dateStr, dateObj };
}

async function atomicWriteUtf8File(filePath, content) {
  const directory = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const tempPath = path.join(directory, `.${baseName}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`);
  let handle = null;

  try {
    handle = await fsp.open(tempPath, 'wx');
    await handle.writeFile(content, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(tempPath, filePath);
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
    }
    await unlink(tempPath).catch(() => {});
    throw error;
  }
}

async function atomicCreateUtf8File(filePath, content) {
  let handle = null;
  try {
    handle = await fsp.open(filePath, 'wx');
    await handle.writeFile(content, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
      await unlink(filePath).catch(() => {});
    }
    if (error.code === 'EEXIST') {
      throw new Error(`File already exists: ${filePath}. Use vault_write_note to overwrite.`);
    }
    throw error;
  }
}

// ─── Tool handlers ──────────────────────────────────────────────────

async function handleVaultListFiles({ path: vaultPath, max_files, pattern }) {
  const rootPath = await assertDirectoryPath(vaultPath);
  const files = await walkVault(rootPath, parsePositiveInteger(max_files, 500, MAX_VAULT_FILES));
  let filtered = files;
  if (pattern) {
    const p = pattern.toLowerCase();
    filtered = files.filter(f => f.relativePath.toLowerCase().includes(p));
  }
  // Add word count
  const enriched = [];
  for (const f of filtered) {
    try {
      const content = await readFile(f.path, 'utf8');
      enriched.push({ ...f, words: countWords(content) });
    } catch {
      enriched.push({ ...f, words: 0 });
    }
  }
  return { total: enriched.length, files: enriched };
}

async function handleVaultReadNote({ path: notePath }) {
  const { filePath } = await assertReadableMarkdownFile(notePath, 'Note path');
  const content = await readFile(filePath, 'utf8');
  const headings = extractMarkdownHeadings(content);
  const tags = extractMarkdownTags(content);
  const links = extractMarkdownLinks(content);
  return {
    path: filePath,
    name: path.basename(filePath),
    content,
    words: countWords(content),
    headings,
    tags,
    links
  };
}

async function handleVaultWriteNote({ path: notePath, content }) {
  const filePath = assertMarkdownPath(notePath, 'Note path');
  const safeContent = coerceToolTextContent(content);
  await mkdir(path.dirname(filePath), { recursive: true });
  await atomicWriteUtf8File(filePath, safeContent);
  return { path: filePath, name: path.basename(filePath), words: countWords(safeContent), written: true };
}

async function handleVaultCreateNote({ path: notePath, content, title }) {
  const filePath = assertMarkdownPath(notePath, 'Note path');
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const name = title || path.basename(filePath, path.extname(filePath));
  const body = coerceToolTextContent(content || `# ${name}\n\n`);
  await atomicCreateUtf8File(filePath, body);
  return { path: filePath, name: path.basename(filePath), words: countWords(body), created: true };
}

async function handleVaultSearch({ path: vaultPath, query, max_results }) {
  const rootPath = await assertDirectoryPath(vaultPath);
  const files = await walkVault(rootPath, MAX_VAULT_FILES);
  const q = String(query || '').toLowerCase();
  if (!q) throw new Error('Search query is required.');
  const limit = parsePositiveInteger(max_results, 20, MAX_SEARCH_RESULTS);
  const results = [];

  for (const f of files) {
    if (results.length >= limit) break;
    try {
      const content = await readFile(f.path, 'utf8');
      const nameMatch = f.name.toLowerCase().includes(q);
      const contentLower = content.toLowerCase();
      const contentIndex = contentLower.indexOf(q);

      if (nameMatch || contentIndex >= 0) {
        let snippet = '';
        if (contentIndex >= 0) {
          const start = Math.max(0, contentIndex - 80);
          const end = Math.min(content.length, contentIndex + query.length + 80);
          snippet = (start > 0 ? '...' : '') + content.substring(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '');
        }
        results.push({
          path: f.path,
          relativePath: f.relativePath,
          name: f.name,
          nameMatch,
          snippet,
          words: countWords(content)
        });
      }
    } catch { /* skip */ }
  }

  return { query, total: results.length, results };
}

async function handleGenerateContextMap({ path: rootPath, output_dir, max_files, max_bytes, chunk_tokens }) {
  const sourceRoot = await assertDirectoryPath(rootPath, 'Source path');
  const outDir = output_dir ? normalizeAbsolutePath(output_dir, 'Output directory') : path.join(sourceRoot, '.shibanshu');
  const args = [EXPORT_SCRIPT, sourceRoot, '--out', outDir];
  if (max_files) args.push('--max-files', String(max_files));
  if (max_bytes) args.push('--max-bytes', String(max_bytes));
  if (chunk_tokens) args.push('--chunk-tokens', String(chunk_tokens));

  const { stdout, stderr } = await execFileAsync('node', args, { maxBuffer: 50 * 1024 * 1024, timeout: 120000 });

  return {
    output_dir: outDir,
    files: [
      'claude-context-navigation.md',
      'claude-context-map.md',
      'claude-context-mind-map.md',
      'claude-context-graph.json',
      'claude-context-scene.json',
      'llm-context-chunks.jsonl',
      'context-integrity.json'
    ],
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    hint: 'Use read_context_map to read individual output files. Start with "navigation" for the best overview.'
  };
}

async function handleReadContextMap({ path: rootPath, file, output_dir }) {
  const sourceRoot = await assertDirectoryPath(rootPath, 'Source path');
  const outDir = output_dir ? normalizeAbsolutePath(output_dir, 'Output directory') : path.join(sourceRoot, '.shibanshu');
  const fileMap = {
    navigation: 'claude-context-navigation.md',
    map: 'claude-context-map.md',
    'mind-map': 'claude-context-mind-map.md',
    graph: 'claude-context-graph.json',
    scene: 'claude-context-scene.json',
    chunks: 'llm-context-chunks.jsonl',
    integrity: 'context-integrity.json'
  };

  const fileName = fileMap[file];
  if (!fileName) throw new Error(`Unknown file type: ${file}. Use: ${Object.keys(fileMap).join(', ')}`);

  const filePath = path.join(outDir, fileName);
  const content = await readFile(filePath, 'utf8');

  // For large files, truncate with a note
  const MAX_RESPONSE = 200000;
  if (content.length > MAX_RESPONSE) {
    return {
      path: filePath,
      truncated: true,
      total_size: content.length,
      content: content.substring(0, MAX_RESPONSE) + `\n\n... [truncated — ${content.length - MAX_RESPONSE} chars remaining. File at: ${filePath}]`
    };
  }

  return { path: filePath, truncated: false, content };
}

async function handleGenerateGraphJson({ path: vaultPath, max_files }) {
  const rootPath = await assertDirectoryPath(vaultPath);
  const files = await walkVault(rootPath, parsePositiveInteger(max_files, 1000, MAX_VAULT_FILES));
  const nodes = [];
  const edges = [];
  const edgeSet = new Set();

  for (const f of files) {
    try {
      const content = await readFile(f.path, 'utf8');
      const headings = extractMarkdownHeadings(content);
      const tags = extractMarkdownTags(content);
      const links = extractMarkdownLinks(content);
      nodes.push({
        path: f.relativePath,
        name: f.name,
        words: countWords(content),
        headings: headings.length,
        tags,
        outgoing: links.length
      });

      for (const link of links) {
        const target = link.target.replace(/#.*$/, '').trim();
        if (!target) continue;
        // Try to resolve
        const targetLower = target.toLowerCase().replace(/\.[^.]+$/, '');
        const resolved = files.find(other => {
          const otherBase = other.relativePath.toLowerCase().replace(/\.[^.]+$/, '');
          return otherBase === targetLower || otherBase.endsWith('/' + targetLower) || other.name.toLowerCase().replace(/\.[^.]+$/, '') === targetLower;
        });
        const edgeKey = `${f.relativePath}->${resolved?.relativePath || target}:${link.kind}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            source: f.relativePath,
            target: resolved?.relativePath || target,
            kind: link.kind,
            resolved: !!resolved
          });
        }
      }
    } catch { /* skip */ }
  }

  // Compute metrics
  const inDegree = {};
  const outDegree = {};
  for (const e of edges) {
    outDegree[e.source] = (outDegree[e.source] || 0) + 1;
    if (e.resolved) inDegree[e.target] = (inDegree[e.target] || 0) + 1;
  }
  const hubs = nodes
    .map(n => ({ ...n, degree: (inDegree[n.path] || 0) + (outDegree[n.path] || 0), incoming: inDegree[n.path] || 0 }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 15);
  const orphans = nodes.filter(n => !inDegree[n.path] && !outDegree[n.path]).map(n => n.path);
  const unresolved = edges.filter(e => !e.resolved);

  return {
    total_nodes: nodes.length,
    total_edges: edges.length,
    nodes,
    edges,
    hubs,
    orphans,
    unresolved_links: unresolved.length,
    unresolved: unresolved.slice(0, 50)
  };
}

async function handleGenerateMindMap({ path: filePath }) {
  const note = await assertReadableMarkdownFile(filePath, 'Note path');
  const content = await readFile(note.filePath, 'utf8');
  const mermaid = generateMindMap(note.filePath, content);
  const headings = extractMarkdownHeadings(content);
  const tags = extractMarkdownTags(content);
  const links = extractMarkdownLinks(content);

  return {
    path: note.filePath,
    name: path.basename(note.filePath),
    mermaid,
    summary: {
      headings: headings.length,
      links: links.length,
      tags: tags.length,
      words: countWords(content)
    }
  };
}

async function handleExtractLinks({ path: filePath }) {
  const note = await assertReadableMarkdownFile(filePath, 'Note path');
  const content = await readFile(note.filePath, 'utf8');
  const links = extractMarkdownLinks(content);
  return { path: note.filePath, total: links.length, links };
}

async function handleExtractHeadings({ path: filePath }) {
  const note = await assertReadableMarkdownFile(filePath, 'Note path');
  const content = await readFile(note.filePath, 'utf8');
  const headings = extractMarkdownHeadings(content);
  return { path: note.filePath, total: headings.length, headings };
}

async function handleExtractTags({ path: filePath }) {
  const note = await assertReadableMarkdownFile(filePath, 'Note path');
  const content = await readFile(note.filePath, 'utf8');
  const tags = extractMarkdownTags(content);
  return { path: note.filePath, total: tags.length, tags };
}

async function handleVaultBacklinks({ vault_path, note_path }) {
  const rootPath = await assertDirectoryPath(vault_path);
  const files = await walkVault(rootPath, MAX_VAULT_FILES);
  const target = normalizeBacklinkTarget(rootPath, note_path);
  const backlinks = [];

  for (const f of files) {
    if (f.relativePath.toLowerCase().replace(/\.[^.]+$/, '') === target.relative) continue;
    try {
      const content = await readFile(f.path, 'utf8');
      const links = extractMarkdownLinks(content);
      for (const link of links) {
        const linkTarget = link.target.replace(/#.*$/, '').trim().toLowerCase().replace(/\.[^.]+$/, '');
        if (linkTarget === target.name || linkTarget === target.relative || linkTarget.endsWith('/' + target.name)) {
          backlinks.push({
            source: f.relativePath,
            kind: link.kind,
            alias: link.alias || link.text || null
          });
          break;
        }
      }
    } catch { /* skip */ }
  }

  return { note: note_path, total: backlinks.length, backlinks };
}

async function handlePublishStaticSite({ path: vaultPath, output_dir, title, theme }) {
  const sourceRoot = await assertDirectoryPath(vaultPath);
  const outDir = normalizeAbsolutePath(output_dir, 'Output directory');
  const publishScript = path.join(__dirname, 'scripts', 'publish-static-site.mjs');
  const args = [publishScript, sourceRoot, '--out', outDir];
  if (title) args.push('--title', title);
  if (theme) args.push('--theme', theme);

  const { stdout, stderr } = await execFileAsync('node', args, { maxBuffer: 50 * 1024 * 1024, timeout: 120000 });

  return {
    output_dir: outDir,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    hint: `Static site published to ${outDir}. Open index.html in a browser.`
  };
}

async function handleCreateDailyNote({ vault_path, date, subfolder }) {
  const now = new Date();
  const rootPath = await assertDirectoryPath(vault_path);
  const { dateStr, dateObj } = normalizeDateString(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const fileName = `${dateStr}.md`;
  const subfolderRelative = normalizeVaultRelativePath(subfolder || '', 'Daily note subfolder', { allowEmpty: true });
  const target = resolveVaultChildPath(
    rootPath,
    subfolderRelative ? `${subfolderRelative}/${fileName}` : fileName,
    'Daily note path',
    { requireMarkdownExtension: true }
  );
  const filePath = target.filePath;

  // Check if already exists
  try {
    await stat(filePath);
    const content = await readFile(filePath, 'utf8');
    return { path: filePath, name: fileName, already_existed: true, words: countWords(content) };
  } catch { /* doesn't exist yet */ }

  const template = `# ${dayName}, ${monthDay}\n\n## Tasks\n\n- [ ] \n- [ ] \n- [ ] \n\n## Notes\n\n\n\n## Goals\n\n- \n\n## Log\n\n- ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — Created daily note\n\n`;

  await mkdir(path.dirname(filePath), { recursive: true });
  await atomicCreateUtf8File(filePath, template);
  return { path: filePath, name: fileName, created: true, words: countWords(template) };
}

async function handleGenerate3dGraphViewer({ path: repoPath, output, max_files, open: autoOpen }) {
  const root = await assertDirectoryPath(repoPath, 'Source path');
  const files = await walkVault(root, parsePositiveInteger(max_files, 500, MAX_VAULT_FILES));
  const graphNodes = [];
  const graphEdges = [];
  const edgeSet = new Set();
  const degreeMap = {};

  for (const f of files) {
    try {
      const content = await readFile(f.path, 'utf8');
      const headings = extractMarkdownHeadings(content);
      const tags = extractMarkdownTags(content);
      const links = extractMarkdownLinks(content);
      graphNodes.push({
        path: f.relativePath, type: f.name.match(/\.(md|markdown|mdown|mkd|txt)$/i) ? 'markdown' : 'code',
        words: countWords(content), headings: headings.map(h => h.text), tags, symbols: [],
        imports: []
      });
      for (const link of links) {
        const target = link.target.replace(/#.*$/, '').trim();
        if (!target) continue;
        const targetLower = target.toLowerCase().replace(/\.[^.]+$/, '');
        const resolved = files.find(o => {
          const ob = o.relativePath.toLowerCase().replace(/\.[^.]+$/, '');
          return ob === targetLower || ob.endsWith('/' + targetLower) || o.name.toLowerCase().replace(/\.[^.]+$/, '') === targetLower;
        });
        const edgeKey = `${f.relativePath}->${resolved?.relativePath || target}:${link.kind}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          graphEdges.push({ source: f.relativePath, target: resolved?.relativePath || target, kind: link.kind });
          degreeMap[f.relativePath] = (degreeMap[f.relativePath] || 0) + 1;
          if (resolved) degreeMap[resolved.relativePath] = (degreeMap[resolved.relativePath] || 0) + 1;
        }
      }
    } catch { /* skip */ }
  }

  // Compute hubs and orphans
  const hubs = graphNodes.map(n => ({ path: n.path, degree: degreeMap[n.path] || 0 })).sort((a, b) => b.degree - a.degree).slice(0, 20);
  const orphans = graphNodes.filter(n => !degreeMap[n.path]).map(n => n.path);

  const graphData = { nodes: graphNodes, edges: graphEdges, hubs, orphans, bridges: [], edgeKinds: [] };
  const html = generateStandaloneGraphViewer(graphData);
  const outPath = resolveHtmlOutputPath(root, output);
  await mkdir(path.dirname(outPath), { recursive: true });
  await atomicWriteUtf8File(outPath, html);

  if (autoOpen !== false) {
    await execFileAsync('open', [outPath]).catch(() => {});
  }

  return {
    path: outPath,
    nodes: graphNodes.length,
    edges: graphEdges.length,
    hubs: hubs.slice(0, 5).map(h => `${h.path} (${h.degree})`),
    orphans: orphans.length,
    hint: `3D graph viewer generated. Open ${outPath} in a browser.`
  };
}

function resolveHtmlOutputPath(root, output) {
  const outPath = output ? normalizeAbsolutePath(output, 'Output file') : path.join(root, '.shibanshu', 'graph-viewer.html');
  if (path.extname(outPath).toLowerCase() !== '.html') {
    throw new Error('3D graph viewer output must be an .html file.');
  }
  return outPath;
}

function generateStandaloneGraphViewer(graphData) {
  const data = JSON.stringify(graphData).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Shibanshu 3D Graph Viewer</title>
  <style>
    :root { color-scheme: dark; --bg: #0d1017; --panel: #151a24; --line: #2b3342; --text: #eef3f8; --muted: #9aa6b6; --accent: #8bd8bb; }
    * { box-sizing: border-box; }
    body { margin: 0; overflow: hidden; background: var(--bg); color: var(--text); font: 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { display: grid; grid-template-columns: minmax(0, 1fr) 320px; height: 100vh; }
    #stage { position: relative; min-width: 0; background: radial-gradient(circle at center, #1d2633 0, #0d1017 58%); }
    #scene { width: 100%; height: 100%; display: block; }
    aside { border-left: 1px solid var(--line); background: var(--panel); padding: 16px; overflow: auto; }
    h1 { margin: 0 0 6px; font-size: 18px; }
    h2 { margin: 18px 0 8px; color: var(--muted); font-size: 11px; letter-spacing: 0; text-transform: uppercase; }
    p { color: var(--muted); line-height: 1.45; }
    button { width: 100%; border: 1px solid var(--line); border-radius: 7px; background: #10151f; color: var(--text); padding: 8px 10px; text-align: left; }
    button:hover, button.active { border-color: var(--accent); background: #12241f; }
    .metric { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--line); color: var(--muted); }
    .metric strong { color: var(--text); font-variant-numeric: tabular-nums; }
    .list { display: grid; gap: 6px; }
    .node { cursor: pointer; transition: opacity 120ms ease, transform 120ms ease; }
    .node circle { fill: #111821; stroke: var(--accent); stroke-width: 1.5; }
    .node text { fill: var(--text); font-size: 11px; text-anchor: middle; pointer-events: none; }
    .edge { stroke: #536174; stroke-width: 1; opacity: 0.42; }
    @media (max-width: 760px) { main { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1fr) 280px; } aside { border-left: 0; border-top: 1px solid var(--line); } }
  </style>
</head>
<body>
<main>
  <section id="stage" aria-label="3D graph stage"><svg id="scene" role="img" aria-label="Repository graph"></svg></section>
  <aside>
    <h1>3D Graph Viewer</h1>
    <p>Drag or wait to orbit. Select a node to inspect file context.</p>
    <div class="metric"><span>Nodes</span><strong id="node-count">0</strong></div>
    <div class="metric"><span>Edges</span><strong id="edge-count">0</strong></div>
    <div class="metric"><span>Orphans</span><strong id="orphan-count">0</strong></div>
    <h2>Selected</h2>
    <p id="selection">Select a node.</p>
    <h2>Hubs</h2>
    <div class="list" id="hub-list"></div>
  </aside>
</main>
<script>
const GRAPH_DATA = ${data};
const svg = document.getElementById('scene');
const selection = document.getElementById('selection');
const hubList = document.getElementById('hub-list');
document.getElementById('node-count').textContent = GRAPH_DATA.nodes.length;
document.getElementById('edge-count').textContent = GRAPH_DATA.edges.length;
document.getElementById('orphan-count').textContent = GRAPH_DATA.orphans.length;
let width = 1;
let height = 1;
let rotation = { x: -0.32, y: 0.42 };
let dragging = null;
const nodeByPath = new Map(GRAPH_DATA.nodes.map((node, index) => [node.path, { ...node, index }]));
const points = GRAPH_DATA.nodes.map((node, index) => {
  const phi = Math.acos(1 - 2 * (index + 0.5) / Math.max(1, GRAPH_DATA.nodes.length));
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  const degree = GRAPH_DATA.edges.filter((edge) => edge.source === node.path || edge.target === node.path).length;
  return { node, theta, phi, degree };
});
function escapeHtmlClient(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}
function project(point) {
  const radius = Math.min(width, height) * 0.34;
  let x = Math.cos(point.theta) * Math.sin(point.phi);
  let y = Math.sin(point.theta) * Math.sin(point.phi);
  let z = Math.cos(point.phi);
  const cosY = Math.cos(rotation.y), sinY = Math.sin(rotation.y);
  const cosX = Math.cos(rotation.x), sinX = Math.sin(rotation.x);
  [x, z] = [x * cosY - z * sinY, x * sinY + z * cosY];
  [y, z] = [y * cosX - z * sinX, y * sinX + z * cosX];
  const scale = 800 / (800 - z * radius);
  return { x: width / 2 + x * radius * scale, y: height / 2 + y * radius * scale, z, scale };
}
function render() {
  const rect = svg.getBoundingClientRect();
  width = Math.max(320, rect.width);
  height = Math.max(320, rect.height);
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  const projected = new Map(points.map((point) => [point.node.path, { point, ...project(point) }]));
  const edges = GRAPH_DATA.edges.map((edge) => {
    const source = projected.get(edge.source);
    const target = projected.get(edge.target);
    if (!source || !target) return '';
    return '<line class="edge" x1="' + source.x.toFixed(1) + '" y1="' + source.y.toFixed(1) + '" x2="' + target.x.toFixed(1) + '" y2="' + target.y.toFixed(1) + '" />';
  }).join('');
  const nodes = [...projected.values()].sort((a, b) => a.z - b.z).map((item) => {
    const size = Math.min(18, 6 + item.point.degree * 1.8) * item.scale;
    const label = escapeHtmlClient(item.point.node.path.split('/').pop());
    const path = escapeHtmlClient(item.point.node.path);
    return '<g class="node" data-path="' + path + '" transform="translate(' + item.x.toFixed(1) + ' ' + item.y.toFixed(1) + ')" style="opacity:' + (0.45 + item.scale * 0.55).toFixed(2) + '"><circle r="' + size.toFixed(1) + '"></circle><text y="' + (size + 14).toFixed(1) + '">' + label + '</text></g>';
  }).join('');
  svg.innerHTML = edges + nodes;
}
function selectNode(path) {
  const node = nodeByPath.get(path);
  if (!node) return;
  selection.textContent = node.path + ' | ' + node.words + ' words | ' + node.headings.length + ' headings | ' + node.tags.length + ' tags';
  svg.querySelectorAll('.node').forEach((item) => item.classList.toggle('active', item.dataset.path === path));
}
hubList.innerHTML = GRAPH_DATA.hubs.slice(0, 8).map((hub) => '<button type="button" data-hub="' + escapeHtmlClient(hub.path) + '">' + escapeHtmlClient(hub.path) + ' (' + hub.degree + ')</button>').join('');
hubList.addEventListener('click', (event) => { const button = event.target.closest('[data-hub]'); if (button) selectNode(button.dataset.hub); });
svg.addEventListener('click', (event) => { const node = event.target.closest('.node'); if (node) selectNode(node.dataset.path); });
svg.addEventListener('pointerdown', (event) => { dragging = { x: event.clientX, y: event.clientY, rotation: { ...rotation } }; svg.setPointerCapture(event.pointerId); });
svg.addEventListener('pointermove', (event) => { if (!dragging) return; rotation = { x: dragging.rotation.x + (event.clientY - dragging.y) / 240, y: dragging.rotation.y + (event.clientX - dragging.x) / 240 }; render(); });
svg.addEventListener('pointerup', () => { dragging = null; });
window.addEventListener('resize', render);
function tick() { if (!dragging) { rotation.y += 0.0028; render(); } requestAnimationFrame(tick); }
render();
tick();
</script>
</body>
</html>`;
}

async function getLatestGitCommitTime(repoPath) {
  try {
    const { stdout } = await execFileAsync('git', ['-C', repoPath, 'log', '-1', '--format=%cI'], { timeout: 5000 });
    return new Date(stdout.trim());
  } catch {
    return null;
  }
}

async function getMapGenerationTime(repoPath) {
  const mapPath = path.join(repoPath, '.shibanshu', 'claude-context-navigation.md');
  try {
    const s = await stat(mapPath);
    return s.mtime;
  } catch {
    return null;
  }
}

async function regenerateMap(repoPath) {
  const args = [EXPORT_SCRIPT, repoPath, '--out', path.join(repoPath, '.shibanshu')];
  const { stdout } = await execFileAsync('node', args, { maxBuffer: 50 * 1024 * 1024, timeout: 120000 });
  return stdout.trim();
}

async function handleCheckMapFreshness({ path: repoPath, auto_refresh }) {
  const root = path.resolve(repoPath);
  const commitTime = await getLatestGitCommitTime(root);
  const mapTime = await getMapGenerationTime(root);

  if (!mapTime) {
    if (auto_refresh) {
      const output = await regenerateMap(root);
      return { status: 'generated', reason: 'No map existed', output };
    }
    return { status: 'missing', reason: 'No context map found. Run generate_context_map first.' };
  }

  if (!commitTime) {
    return { status: 'unknown', reason: 'Not a git repo or no commits. Map exists but freshness cannot be determined.', map_time: mapTime.toISOString() };
  }

  const isStale = commitTime > mapTime;
  const ageMinutes = Math.round((Date.now() - mapTime.getTime()) / 60000);

  if (isStale && auto_refresh) {
    const output = await regenerateMap(root);
    return { status: 'refreshed', reason: `Map was ${ageMinutes} min old, latest commit was newer. Regenerated.`, output };
  }

  return {
    status: isStale ? 'stale' : 'fresh',
    map_generated: mapTime.toISOString(),
    latest_commit: commitTime.toISOString(),
    age_minutes: ageMinutes,
    reason: isStale
      ? `Map is stale — generated ${ageMinutes} min ago but latest commit is newer. Use auto_refresh:true or run generate_context_map.`
      : `Map is fresh — generated ${ageMinutes} min ago, after the latest commit.`
  };
}

async function handleEnableAutoMapping({ path: repoPath, refresh_now }) {
  const root = path.resolve(repoPath);

  // Verify it's a git repo
  try {
    await stat(path.join(root, '.git'));
  } catch {
    throw new Error('Not a git repository. The auto-mapping hook requires git.');
  }

  // Install post-commit hook
  const hooksDir = path.join(root, '.git', 'hooks');
  const hookPath = path.join(hooksDir, 'post-commit');
  const marker = '# shibanshu-markdown-mcp auto-mapping';

  const hookScript = `#!/bin/sh
${marker}
node "${EXPORT_SCRIPT}" "${root}" --out "${path.join(root, '.shibanshu')}" > /dev/null 2>&1 &
echo "[shibanshu] Context map updated."
`;

  await mkdir(hooksDir, { recursive: true });

  let installed = false;
  try {
    const existing = await readFile(hookPath, 'utf8');
    if (existing.includes(marker)) {
      installed = false; // Already installed
    } else {
      await fsp.writeFile(hookPath, existing + '\n' + hookScript, 'utf8');
      installed = true;
    }
  } catch {
    await fsp.writeFile(hookPath, hookScript, 'utf8');
    installed = true;
  }

  await fsp.chmod(hookPath, 0o755);

  // Optionally refresh now
  let refreshResult = null;
  if (refresh_now !== false) {
    const freshness = await handleCheckMapFreshness({ path: root, auto_refresh: true });
    refreshResult = freshness;
  }

  return {
    hook_installed: installed ? 'installed' : 'already_installed',
    hook_path: hookPath,
    auto_refresh_result: refreshResult,
    hint: 'Context map will now auto-update after every git commit. The map stays fresh automatically.'
  };
}

// ─── MCP Server setup ───────────────────────────────────────────────

const HANDLER_MAP = {
  vault_list_files: handleVaultListFiles,
  vault_read_note: handleVaultReadNote,
  vault_write_note: handleVaultWriteNote,
  vault_create_note: handleVaultCreateNote,
  vault_search: handleVaultSearch,
  generate_context_map: handleGenerateContextMap,
  read_context_map: handleReadContextMap,
  generate_graph_json: handleGenerateGraphJson,
  generate_mind_map: handleGenerateMindMap,
  extract_links: handleExtractLinks,
  extract_headings: handleExtractHeadings,
  extract_tags: handleExtractTags,
  vault_backlinks: handleVaultBacklinks,
  publish_static_site: handlePublishStaticSite,
  create_daily_note: handleCreateDailyNote,
  generate_3d_graph_viewer: handleGenerate3dGraphViewer,
  enable_auto_mapping: handleEnableAutoMapping,
  check_map_freshness: handleCheckMapFreshness
};

const server = new Server(
  { name: 'shibanshu-markdown', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = HANDLER_MAP[name];
  if (!handler) {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
  try {
    const result = await handler(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

// ─── Start server ────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
