#!/usr/bin/env node

/**
 * Athena Viewer — MCP Server
 *
 * Exposes the app's markdown vault, graph, mind-map, context-map, and
 * note-creation capabilities as Model Context Protocol tools that
 * Claude Code (or any MCP client) can call directly.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
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
const CLI_PATH = path.join(__dirname, 'bin', 'athena.mjs');
const EXPORT_SCRIPT = path.join(__dirname, 'export-context.mjs');

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd', '.txt', '.canvas']);
const IGNORED_DIRS = new Set(['.git', '.hg', '.svn', 'node_modules', 'dist', 'release', 'build', '.next', '.cache', '.venv', 'vendor', 'target', 'coverage']);
const MAX_VAULT_FILES = 20000;
const MAX_VAULT_DEPTH = 32;
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_SEARCH_RESULTS = 50;
const DEFAULT_RESPONSE_TOKEN_BUDGET = 25000;
const MAX_RESPONSE_TOKEN_BUDGET = 50000;
const DEFAULT_QUERY_TOKEN_BUDGET = 2000;
const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','should','can','could','and','but','or','not',
  'this','that','these','those','it','its','in','on','at','to','for','of','with',
  'by','from','about','into','through','what','where','when','which','who','how',
  'why','use','using','used','file','files','repo','repository','code','context'
]);

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
        output_dir: { type: 'string', description: 'Output directory (default: <path>/.athena)' },
        max_files: { type: 'number', description: 'Max files to index (default 20000)' },
        max_bytes: { type: 'number', description: 'Max file size in bytes to read (default 768000)' },
        chunk_tokens: { type: 'number', description: 'Target tokens per JSONL chunk (default 900)' }
      },
      required: ['path']
    }
  },
  {
    name: 'query_context',
    description: 'Ask a question against the generated context chunks. Returns a budget-capped, cited, ranked answer without reading monolithic map files.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the vault/repo that was analyzed' },
        question: { type: 'string', description: 'Question to answer from indexed chunks' },
        token_budget: { type: 'number', description: 'Maximum response budget in approximate tokens (default 2000)' },
        output_dir: { type: 'string', description: 'Output directory if non-default was used' },
        refresh_if_missing: { type: 'boolean', description: 'Generate the map if chunks are missing (default true)' }
      },
      required: ['path', 'question']
    }
  },
  {
    name: 'read_context_map',
    description: 'Read a previously generated context map file. Use after generate_context_map. For large maps, use section to read a specific part, or offset/limit to paginate.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the vault/repo that was analyzed' },
        file: {
          type: 'string',
          description: 'Which context file to read',
          enum: ['navigation', 'map', 'mind-map', 'graph', 'scene', 'chunks', 'integrity', 'contradictions', 'staleness', 'warnings', 'authority', 'health', 'duplicates']
        },
        section: {
          type: 'string',
          description: 'Read only a specific section of the map by heading name (e.g. "Hub And Bridge Files", "Symbol Index", "File Summaries"). Omit to read the full file.'
        },
        offset: { type: 'number', description: 'Character offset to start reading from (default 0). Use with limit to paginate large files.' },
        limit: { type: 'number', description: 'Max characters to return (default 100000). Use with offset to paginate.' },
        token_budget: { type: 'number', description: 'Approximate max tokens to return (default 25000). This caps limit even when a larger limit is requested.' },
        output_dir: { type: 'string', description: 'Output directory if non-default was used' }
      },
      required: ['path', 'file']
    }
  },
  {
    name: 'repo_health',
    description: 'Return actionable repo-health diagnostics from the context graph: orphans, broken links, duplicates, contradictions, trust, generated files, and possible secrets/PII.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the repo/vault' },
        output_dir: { type: 'string', description: 'Output directory if non-default was used' },
        refresh: { type: 'boolean', description: 'Regenerate context before reading health (default false)' },
        token_budget: { type: 'number', description: 'Approximate max tokens to return (default 8000)' }
      },
      required: ['path']
    }
  },
  {
    name: 'blast_radius',
    description: 'Analyze a git diff or dirty working tree and report docs, tests, imports, calls, and downstream files affected by changed files.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the git repo' },
        git_range: { type: 'string', description: 'Git diff range, e.g. HEAD~1..HEAD. Omit to use dirty working tree.' },
        output_dir: { type: 'string', description: 'Output directory if non-default was used' },
        refresh: { type: 'boolean', description: 'Regenerate context before analysis (default false)' },
        token_budget: { type: 'number', description: 'Approximate max tokens to return (default 8000)' }
      },
      required: ['path']
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
        output: { type: 'string', description: 'Output HTML file path (defaults to <path>/.athena/graph-viewer.html)' },
        max_files: { type: 'number', description: 'Max files to include (default 500)' },
        open: { type: 'boolean', description: 'Auto-open in browser after generating (default true)' }
      },
      required: ['path']
    }
  },
  {
    name: 'enable_auto_mapping',
    description: 'Install git hooks that regenerate the context map before and after commits. Also checks dirty working-tree freshness and regenerates if needed.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the git repo' },
        refresh_now: { type: 'boolean', description: 'Also regenerate the map right now if stale or dirty (default true)' }
      },
      required: ['path']
    }
  },
  {
    name: 'check_map_freshness',
    description: 'Check if a context map is up-to-date with HEAD and dirty working-tree changes. Reports uncommitted files not reflected by the map and optionally regenerates.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the repo' },
        auto_refresh: { type: 'boolean', description: 'Auto-regenerate if stale (default false)' }
      },
      required: ['path']
    }
  },
  {
    name: 'setup_repo',
    description: 'Diff-first setup for a repo: previews context map, hook, CLAUDE.md, and .gitignore changes. Pass apply:true to write. Idempotent on repeated runs.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the git repo to set up' },
        apply: { type: 'boolean', description: 'Actually apply the shown changes. Default false returns a diff/plan only.' }
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

function parseTokenBudget(value, fallback = DEFAULT_RESPONSE_TOKEN_BUDGET) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), MAX_RESPONSE_TOKEN_BUDGET);
}

function tokenBudgetToChars(tokenBudget) {
  return Math.max(1000, parseTokenBudget(tokenBudget) * 4);
}

function estimateTokens(value) {
  return Math.max(1, Math.ceil(String(value || '').length / 4));
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
  const outDir = output_dir ? normalizeAbsolutePath(output_dir, 'Output directory') : path.join(sourceRoot, '.athena');
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
      'context-integrity.json',
      'contradictions.md',
      'staleness-report.md',
      'semantic-warnings.md',
      'authority-graph.md',
      'repo-health.md',
      'duplicates.md'
    ],
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    hint: 'Use read_context_map to read individual output files. Start with "navigation" for the best overview.'
  };
}

async function handleQueryContext({ path: rootPath, question, token_budget, output_dir, refresh_if_missing }) {
  const sourceRoot = await assertDirectoryPath(rootPath, 'Source path');
  const outDir = output_dir ? normalizeAbsolutePath(output_dir, 'Output directory') : path.join(sourceRoot, '.athena');
  const chunksPath = path.join(outDir, 'llm-context-chunks.jsonl');
  const budget = parseTokenBudget(token_budget, DEFAULT_QUERY_TOKEN_BUDGET);
  const query = String(question || '').trim();
  if (!query) throw new Error('Question is required.');

  let chunks = [];
  try {
    chunks = await readContextChunks(chunksPath);
  } catch (error) {
    if (refresh_if_missing === false) throw error;
    await regenerateMap(sourceRoot, outDir);
    chunks = await readContextChunks(chunksPath);
  }

  const ranked = rankChunksForQuery(chunks, query).slice(0, 30);
  const hits = [];
  let spent = 180;
  for (const item of ranked) {
    const snippet = buildChunkSnippet(item.chunk, query);
    const estimate = estimateTokens(JSON.stringify(snippet)) + 80;
    if (hits.length && spent + estimate > budget) break;
    hits.push({
      rank: hits.length + 1,
      score: Math.round(item.score * 100) / 100,
      relevance: Math.min(1, Math.round(item.score * 100) / 1000),
      path: item.chunk.path,
      citation: `${item.chunk.path}:${snippet.startLine}`,
      lines: `${snippet.startLine}-${snippet.endLine}`,
      excerpt: snippet.text
    });
    spent += estimate;
  }

  return {
    question: query,
    token_budget: budget,
    answer: hits.length
      ? `Top context for "${query}" is in ${hits.slice(0, 3).map((hit) => hit.citation).join(', ')}. Use the ranked hits below as cited retrieval context; no monolithic map read is required.`
      : `No strong indexed matches found for "${query}". Try a narrower term or regenerate the context map.`,
    hits,
    searched_chunks: chunks.length,
    generated_from: chunksPath
  };
}

async function handleRepoHealth({ path: rootPath, output_dir, refresh, token_budget }) {
  const graphPayload = await loadGraphPayload(rootPath, output_dir, { refresh: Boolean(refresh) });
  const intelligence = graphPayload.intelligence || {};
  const health = intelligence.health || {};
  return {
    token_budget: parseTokenBudget(token_budget, 8000),
    generated_at: graphPayload.generatedAt,
    root: graphPayload.root,
    health,
    contradictions: (intelligence.contradictions || []).slice(0, 20),
    near_duplicates: (intelligence.nearDuplicates || []).slice(0, 20),
    possible_secrets_or_pii: (intelligence.secretFindings || []).slice(0, 20),
    semantic_warnings: (intelligence.semanticWarnings || []).slice(0, 20),
    staleness: (intelligence.staleness || []).slice(0, 40)
  };
}

async function handleBlastRadius({ path: repoPath, git_range, output_dir, refresh, token_budget }) {
  const root = await assertDirectoryPath(repoPath, 'Repo path');
  const changed = await getChangedFiles(root, git_range);
  const graphPayload = await loadGraphPayload(root, output_dir, { refresh: Boolean(refresh) });
  const nodePaths = new Set((graphPayload.nodes || []).map((node) => node.path));
  const changedIndexed = changed.filter((file) => nodePaths.has(file));
  const changedSet = new Set(changedIndexed);
  const affected = new Map();

  for (const edge of graphPayload.edges || []) {
    const sourceChanged = changedSet.has(edge.source);
    const targetChanged = changedSet.has(edge.target);
    if (!sourceChanged && !targetChanged) continue;
    const affectedPath = sourceChanged ? edge.target : edge.source;
    if (!affected.has(affectedPath)) {
      affected.set(affectedPath, {
        path: affectedPath,
        reasons: [],
        citations: []
      });
    }
    const entry = affected.get(affectedPath);
    entry.reasons.push(`${edge.kind} ${sourceChanged ? 'from changed file' : 'to changed file'} ${sourceChanged ? edge.source : edge.target}`);
    entry.citations.push(`${sourceChanged ? edge.source : edge.target}:${edge.line || 1}`);
  }

  const affectedList = [...affected.values()]
    .map((item) => ({
      ...item,
      reasons: [...new Set(item.reasons)].slice(0, 8),
      citations: [...new Set(item.citations)].slice(0, 8),
      kind: classifyAffectedPath(item.path)
    }))
    .sort((left, right) => blastKindRank(left.kind) - blastKindRank(right.kind) || left.path.localeCompare(right.path));

  return {
    token_budget: parseTokenBudget(token_budget, 8000),
    git_range: git_range || 'dirty working tree',
    changed_files: changed,
    changed_indexed_files: changedIndexed,
    affected_count: affectedList.length,
    affected: affectedList.slice(0, 120),
    docs: affectedList.filter((item) => item.kind === 'doc').slice(0, 40),
    tests: affectedList.filter((item) => item.kind === 'test').slice(0, 40),
    downstream_code: affectedList.filter((item) => item.kind === 'code').slice(0, 60)
  };
}

async function handleReadContextMap({ path: rootPath, file, section, offset, limit, token_budget, output_dir }) {
  const sourceRoot = await assertDirectoryPath(rootPath, 'Source path');
  const outDir = output_dir ? normalizeAbsolutePath(output_dir, 'Output directory') : path.join(sourceRoot, '.athena');
  const fileMap = {
    navigation: 'claude-context-navigation.md',
    map: 'claude-context-map.md',
    'mind-map': 'claude-context-mind-map.md',
    graph: 'claude-context-graph.json',
    scene: 'claude-context-scene.json',
    chunks: 'llm-context-chunks.jsonl',
    integrity: 'context-integrity.json',
    contradictions: 'contradictions.md',
    staleness: 'staleness-report.md',
    warnings: 'semantic-warnings.md',
    authority: 'authority-graph.md',
    health: 'repo-health.md',
    duplicates: 'duplicates.md'
  };

  const fileName = fileMap[file];
  if (!fileName) throw new Error(`Unknown file type: ${file}. Use: ${Object.keys(fileMap).join(', ')}`);

  const filePath = path.join(outDir, fileName);
  let content = await readFile(filePath, 'utf8');
  const totalSize = content.length;

  // Section filter — extract content under a specific ## heading
  if (section) {
    const sectionPattern = new RegExp(`^## ${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
    const match = content.match(sectionPattern);
    if (!match) {
      const headings = [...content.matchAll(/^## (.+)$/gm)].map(m => m[1]);
      return {
        path: filePath,
        error: `Section "${section}" not found.`,
        available_sections: headings
      };
    }
    const sectionStart = match.index;
    const nextHeading = content.indexOf('\n## ', sectionStart + match[0].length);
    content = nextHeading === -1
      ? content.substring(sectionStart)
      : content.substring(sectionStart, nextHeading);
  }

  // Pagination via offset/limit
  const charOffset = Math.max(0, Math.floor(offset || 0));
  const budgetChars = tokenBudgetToChars(parseTokenBudget(token_budget, DEFAULT_RESPONSE_TOKEN_BUDGET));
  const requestedLimit = Math.floor(limit || budgetChars);
  const charLimit = Math.min(budgetChars, Math.max(1000, requestedLimit));
  const contentSize = content.length;

  if (charOffset >= contentSize) {
    return { path: filePath, total_size: totalSize, content_size: contentSize, offset: charOffset, content: '', has_more: false };
  }

  const slice = content.substring(charOffset, charOffset + charLimit);
  const hasMore = charOffset + charLimit < contentSize;

  return {
    path: filePath,
    total_size: totalSize,
    content_size: contentSize,
    offset: charOffset,
    length: slice.length,
    has_more: hasMore,
    ...(hasMore ? { next_offset: charOffset + charLimit } : {}),
    ...(section ? { section } : {}),
    content: slice
  };
}

async function readContextChunks(chunksPath) {
  const content = await readFile(chunksPath, 'utf8');
  return content
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function tokenizeQuery(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9_.$/-]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function rankChunksForQuery(chunks, query) {
  const terms = tokenizeQuery(query);
  const phrase = query.toLowerCase();
  return chunks
    .map((chunk) => {
      const text = String(chunk.text || '').toLowerCase();
      const pathScore = String(chunk.path || '').toLowerCase();
      let score = 0;
      for (const term of terms) {
        const termPattern = new RegExp(escapeRegExp(term), 'g');
        const count = (text.match(termPattern) || []).length;
        if (count) score += 1 + Math.log(1 + count) * 3;
        if (pathScore.includes(term)) score += 6;
        if ((chunk.symbols || []).some((symbol) => String(symbol.name || '').toLowerCase().includes(term))) score += 5;
        if ((chunk.headings || []).some((heading) => String(heading.text || '').toLowerCase().includes(term))) score += 4;
      }
      if (phrase.length > 6 && text.includes(phrase)) score += 20;
      return { chunk, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.chunk.path.localeCompare(right.chunk.path));
}

function buildChunkSnippet(chunk, query) {
  const terms = tokenizeQuery(query);
  const lines = String(chunk.text || '').split(/\r?\n/);
  let bestIndex = 0;
  let bestScore = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const lower = lines[index].toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (lower.includes(term)) score += term.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  const startIndex = Math.max(0, bestIndex - 2);
  const endIndex = Math.min(lines.length - 1, bestIndex + 3);
  return {
    startLine: (chunk.startLine || 1) + startIndex,
    endLine: (chunk.startLine || 1) + endIndex,
    text: lines.slice(startIndex, endIndex + 1).join('\n').trim().slice(0, 1200)
  };
}

async function loadGraphPayload(rootPath, outputDir, options = {}) {
  const sourceRoot = await assertDirectoryPath(rootPath, 'Source path');
  const outDir = outputDir ? normalizeAbsolutePath(outputDir, 'Output directory') : path.join(sourceRoot, '.athena');
  const graphPath = path.join(outDir, 'claude-context-graph.json');
  if (options.refresh) await regenerateMap(sourceRoot, outDir);
  try {
    return JSON.parse(await readFile(graphPath, 'utf8'));
  } catch (error) {
    await regenerateMap(sourceRoot, outDir);
    return JSON.parse(await readFile(graphPath, 'utf8'));
  }
}

async function getChangedFiles(repoPath, gitRange) {
  const args = gitRange
    ? ['-C', repoPath, 'diff', '--name-only', gitRange]
    : ['-C', repoPath, 'diff', '--name-only'];
  const changed = new Set();
  try {
    const { stdout } = await execFileAsync('git', args, { timeout: 10000 });
    stdout.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => changed.add(line));
  } catch (_error) {
    // Fall through to staged/status paths.
  }
  if (!gitRange) {
    try {
      const { stdout } = await execFileAsync('git', ['-C', repoPath, 'diff', '--cached', '--name-only'], { timeout: 10000 });
      stdout.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => changed.add(line));
    } catch (_error) {}
    try {
      const status = await getGitWorkingTreeStatus(repoPath);
      for (const item of status.files) changed.add(item.path);
    } catch (_error) {}
  }
  return [...changed].sort((left, right) => left.localeCompare(right));
}

function classifyAffectedPath(filePath) {
  if (/\.(md|markdown|mdown|mkd|txt|canvas)$/i.test(filePath) || /(^|\/)docs\//i.test(filePath)) return 'doc';
  if (/(^|\/)(__tests__|tests?|specs?)\/|[.-](test|spec)\.[cm]?[jt]sx?$/i.test(filePath)) return 'test';
  if (/\.(js|jsx|mjs|cjs|ts|tsx|py|rb|rs|swift|sql|css|html|json|ya?ml)$/i.test(filePath)) return 'code';
  return 'other';
}

function blastKindRank(kind) {
  return { test: 0, code: 1, doc: 2, other: 3 }[kind] ?? 4;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  const vaultDir = path.resolve(String(vault_path || '').trim());
  await mkdir(vaultDir, { recursive: true });
  const rootPath = await assertDirectoryPath(vaultDir);
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
      // Extract first meaningful line as summary (skip headings/blanks)
      const lines = content.split('\n');
      let summary = '';
      for (const line of lines) {
        const trimmed = line.replace(/^#+\s*/, '').trim();
        if (trimmed.length > 20 && !trimmed.startsWith('import ') && !trimmed.startsWith('---')) {
          summary = trimmed.length > 120 ? trimmed.substring(0, 120) + '...' : trimmed;
          break;
        }
      }
      graphNodes.push({
        path: f.relativePath, type: f.name.match(/\.(md|markdown|mdown|mkd|txt)$/i) ? 'markdown' : 'code',
        words: countWords(content), headings: headings.map(h => h.text), tags, symbols: [],
        imports: [], summary
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
  const outPath = output ? normalizeAbsolutePath(output, 'Output file') : path.join(root, '.athena', 'graph-viewer.html');
  if (path.extname(outPath).toLowerCase() !== '.html') {
    throw new Error('3D graph viewer output must be an .html file.');
  }
  return outPath;
}

function generateStandaloneGraphViewer(graphData) {
  const data = JSON.stringify(graphData).replace(/</g, '\\u003c').replace(/`/g, '\\u0060');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Athena Graph Viewer</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;color:#e6edf3;font-family:-apple-system,sans-serif;overflow:hidden;user-select:none}canvas{display:block;cursor:grab}canvas:active{cursor:grabbing}#dt{position:fixed;right:0;top:0;width:340px;height:100%;background:rgba(0,0,0,0.93);border-left:1px solid rgba(94,234,212,0.12);overflow-y:auto;padding:20px;backdrop-filter:blur(20px);transition:transform 250ms;transform:translateX(100%);z-index:30;font-size:13px}#dt.open{transform:translateX(0)}#dt h2{font-size:14px;font-family:monospace;color:#5eead4;margin-bottom:4px;word-break:break-all}#dt .b{font-size:9px;text-transform:uppercase;letter-spacing:1px;padding:2px 7px;border-radius:4px;display:inline-block;margin:0 3px 12px 0;border:1px solid rgba(255,255,255,0.08)}#dt .b.hub{color:#fcd34d;border-color:rgba(253,211,77,0.2)}#dt .b.orphan{color:#fca5a5;border-color:rgba(252,165,165,0.2)}#dt .ms{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px}#dt .m{background:rgba(255,255,255,0.02);padding:10px;border-radius:7px;text-align:center}#dt .m strong{display:block;font-size:22px;color:#5eead4;font-family:monospace}#dt .m span{font-size:8px;color:#4a5568;text-transform:uppercase}#dt h3{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#374151;margin:14px 0 6px}#dt .ei{font-size:11px;font-family:monospace;padding:5px 8px;background:rgba(255,255,255,0.015);border-radius:5px;margin-bottom:2px;cursor:pointer;border:1px solid transparent}#dt .ei:hover{border-color:rgba(94,234,212,0.2)}#dt .hi{font-size:11px;padding:4px 7px;color:#6b7280;border-left:2px solid rgba(94,234,212,0.15);margin-bottom:2px}.cb{position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:#4a5568;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}#tb{position:fixed;top:0;left:0;right:0;height:44px;background:rgba(0,0,0,0.7);border-bottom:1px solid rgba(255,255,255,0.03);display:flex;align-items:center;padding:0 14px;gap:8px;z-index:20;backdrop-filter:blur(12px);font-size:11px}#tb .br{text-transform:uppercase;letter-spacing:2px;color:#5eead4;font-weight:700;font-size:10px}#tb .sp{width:1px;height:16px;background:rgba(255,255,255,0.05)}#tb button{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);color:#4a5568;padding:3px 9px;border-radius:4px;font-size:10px;cursor:pointer}#tb button.a{border-color:rgba(94,234,212,0.3);color:#5eead4}#tb input{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);color:#e6edf3;padding:4px 8px;border-radius:4px;font-size:11px;width:140px;outline:none;font-family:monospace}#tb .f1{flex:1}#tb .st{color:#1f2937}#tb .st strong{color:#374151}#tt{position:fixed;pointer-events:none;background:rgba(0,0,0,0.92);border:1px solid rgba(94,234,212,0.2);padding:7px 10px;border-radius:7px;display:none;z-index:25;font-size:11px;font-family:monospace}#tt .tp{color:#5eead4}#tt .tm{color:#374151;font-size:9px;margin-top:2px}</style></head><body>
<canvas id="c"></canvas>
<div id="tb"><span class="br">Shibanshu 3D Graph Viewer</span><span class="sp"></span><button id="fa" class="a">All</button><button id="fh">Hubs</button><button id="fo">Orphans</button><span class="sp"></span><input id="si" placeholder="Search..."><span class="f1"></span><span class="st"><strong id="nc">0</strong> nodes <strong id="ec">0</strong> edges</span></div>
<div id="tt"></div>
<div id="dt"><button class="cb" id="cd">x</button><div id="dc"></div></div>
<script>const GRAPH_DATA = ${data};const D=GRAPH_DATA;
const cv=document.getElementById('c'),cx=cv.getContext('2d'),tt=document.getElementById('tt'),dc=document.getElementById('dc'),dt=document.getElementById('dt');let W,H;function rs(){W=cv.width=innerWidth;H=cv.height=innerHeight}rs();addEventListener('resize',rs);const T=Math.PI*2,COL={src:[94,234,212],docs:[196,181,253],services:[125,211,252],scripts:[253,211,77],config:[249,168,212],test:[252,165,165],workers:[252,165,165],public:[167,243,208],packages:[200,180,255],electron:[255,200,150],skills:[180,230,200]},DC=[100,110,130];function gc(p){const s=p.split('/')[0];return p.includes('/')?s:'root'}function gco(p){return COL[gc(p)]||DC}const hS=new Set((D.hubs||[]).map(h=>h.path)),oS=new Set(D.orphans||[]),nM={},dg={};for(const e of D.edges){dg[e.source]=(dg[e.source]||0)+1;dg[e.target]=(dg[e.target]||0)+1}const N=D.nodes.map((n,i)=>{const cl=gc(n.path),ci=Object.keys(COL).indexOf(cl);const phi=(ci>=0?ci:Math.random()*9)/9*T+(Math.random()-0.5)*0.7;const theta=(Math.random()-0.5)*Math.PI*0.8;const dist=140+Math.random()*180+(dg[n.path]||0)*6;nM[n.path]=i;const d=dg[n.path]||0;return{...n,col:gco(n.path),x:Math.cos(phi)*Math.cos(theta)*dist,y:Math.sin(theta)*dist*0.65,z:Math.sin(phi)*Math.cos(theta)*dist,vx:0,vy:0,vz:0,deg:d,isHub:hS.has(n.path),isOrphan:oS.has(n.path),r:Math.max(4,Math.min(22,4+Math.sqrt(n.words||0)*0.15+d*1.2)),vis:true,hl:false}});const E=D.edges.map(e=>[nM[e.source],nM[e.target],e.kind]).filter(e=>e[0]!=null&&e[1]!=null);for(let it=0;it<180;it++){const a=1-it/180;for(let i=0;i<N.length;i++){for(let j=i+1;j<N.length;j++){let dx=N[j].x-N[i].x,dy=N[j].y-N[i].y,dz=N[j].z-N[i].z,d2=dx*dx+dy*dy+dz*dz;if(d2>700000)continue;let dd=Math.sqrt(d2)||1,f=Math.min(3.5,1000*a/(dd*dd));N[i].vx-=dx/dd*f;N[i].vy-=dy/dd*f;N[i].vz-=dz/dd*f;N[j].vx+=dx/dd*f;N[j].vy+=dy/dd*f;N[j].vz+=dz/dd*f}}for(const[a2,b]of E){let dx=N[b].x-N[a2].x,dy=N[b].y-N[a2].y,dz=N[b].z-N[a2].z,dd=Math.sqrt(dx*dx+dy*dy+dz*dz)||1,f=(dd-90)*0.007*a;N[a2].vx+=dx/dd*f;N[a2].vy+=dy/dd*f;N[a2].vz+=dz/dd*f;N[b].vx-=dx/dd*f;N[b].vy-=dy/dd*f;N[b].vz-=dz/dd*f}for(const n of N){n.vx-=n.x*0.0005;n.vy-=n.y*0.0005;n.vz-=n.z*0.0005;n.x+=n.vx*0.35;n.y+=n.vy*0.35;n.z+=n.vz*0.35;n.vx*=0.8;n.vy*=0.8;n.vz*=0.8}}let rY=0,rX=-0.2,zm=1,aR=true,drag=false,dsx,dsy,drx,dry,hov=null,sel=null,flt='all',sq='',t=0;const stars=[];for(let i=0;i<300;i++)stars.push({x:(Math.random()-0.5)*5000,y:(Math.random()-0.5)*5000,z:(Math.random()-0.5)*5000,b:0.2+Math.random()*0.6,s:0.3+Math.random()*0.7});function proj(x,y,z){let cy=Math.cos(rY),sy=Math.sin(rY),x1=x*cy-z*sy,z1=x*sy+z*cy,cx2=Math.cos(rX),sx=Math.sin(rX),y1=y*cx2-z1*sx,z2=y*sx+z1*cx2;const fov=1000,s=fov/(fov+z2+600);if(s<0.005)return{x:-9e3,y:-9e3,z:z2,s:0.005};return{x:x1*s*zm+W/2,y:y1*s*zm+H/2,z:z2,s}}function af(){const q=sq.toLowerCase();for(const n of N){let s=true;if(flt==='hubs')s=n.isHub;else if(flt==='orphans')s=n.isOrphan;if(q&&!n.path.toLowerCase().includes(q))s=false;n.vis=s;n.hl=q&&n.path.toLowerCase().includes(q)}}function draw(){t+=0.016;if(aR)rY+=0.001;cx.fillStyle='#000';cx.fillRect(0,0,W,H);const nb=cx.createRadialGradient(W*0.3,H*0.4,0,W*0.3,H*0.4,W*0.45);nb.addColorStop(0,'rgba(94,234,212,0.02)');nb.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=nb;cx.fillRect(0,0,W,H);const nb2=cx.createRadialGradient(W*0.7,H*0.6,0,W*0.7,H*0.6,W*0.35);nb2.addColorStop(0,'rgba(196,181,253,0.015)');nb2.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=nb2;cx.fillRect(0,0,W,H);for(const s of stars){const p=proj(s.x,s.y,s.z);if(p.x<0||p.x>W)continue;cx.fillStyle='rgba(255,255,255,'+(s.b*(0.4+Math.sin(t+s.b*15)*0.2))+')';cx.beginPath();cx.arc(p.x,p.y,s.s*p.s*zm*0.7,0,T);cx.fill()}for(const[a,b,kind]of E){if(!N[a].vis&&!N[b].vis)continue;const pa=proj(N[a].x,N[a].y,N[a].z),pb=proj(N[b].x,N[b].y,N[b].z);if(pa.s<0.01&&pb.s<0.01)continue;let al=Math.max(0.015,Math.min(0.2,(pa.s+pb.s)*0.1)),w=Math.max(0.3,(pa.s+pb.s)*1.5);if(sel!==null){if(a===sel||b===sel){al=0.5;w=2}else{al*=0.06;w*=0.3}}cx.strokeStyle=kind==='import'?'rgba(125,211,252,'+al+')':'rgba(94,234,212,'+al*0.7+')';cx.lineWidth=w;const mx=(pa.x+pb.x)/2,my=(pa.y+pb.y)/2,dx=pb.x-pa.x,dy=pb.y-pa.y;cx.beginPath();cx.moveTo(pa.x,pa.y);cx.quadraticCurveTo(mx+dy*0.06,my-dx*0.06,pb.x,pb.y);cx.stroke()}for(let i=0;i<Math.min(80,E.length*2);i++){const ei=i%E.length;const[a,b]=E[ei];if(!N[a].vis||!N[b].vis)continue;const ph=(t*0.12+i*0.031)%1,pa=proj(N[a].x,N[a].y,N[a].z),pb=proj(N[b].x,N[b].y,N[b].z),px=pa.x+(pb.x-pa.x)*ph,py=pa.y+(pb.y-pa.y)*ph,gl=Math.sin(ph*Math.PI)*(pa.s+pb.s)*0.4;if(gl<0.03)continue;const[cr,cg,cb]=N[a].col;cx.fillStyle='rgba('+cr+','+cg+','+cb+','+gl+')';cx.beginPath();cx.arc(px,py,1.3*(pa.s+pb.s)/2*zm,0,T);cx.fill()}const sorted=N.map((n,i)=>({...n,i,...proj(n.x,n.y,n.z)})).filter(n=>n.vis&&n.s>0.01);sorted.sort((a,b)=>a.z-b.z);for(const n of sorted){if(n.x<-50||n.x>W+50||n.y<-50||n.y>H+50)continue;const[cr,cg,cb]=n.col,r=Math.max(1,n.r*n.s*zm),da=Math.max(0.1,Math.min(1,n.s*1.3));let al=da;if(sel!==null&&n.i!==sel)al=da*0.12;if(n.hl)al=1;if(n.isHub&&al>0.15){const pulse=1+Math.sin(t*1.2+n.r)*0.12;const g3=cx.createRadialGradient(n.x,n.y,r,n.x,n.y,r*7*pulse);g3.addColorStop(0,'rgba('+cr+','+cg+','+cb+','+al*0.12+')');g3.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=g3;cx.beginPath();cx.arc(n.x,n.y,r*7*pulse,0,T);cx.fill();cx.strokeStyle='rgba('+cr+','+cg+','+cb+','+al*0.15+')';cx.lineWidth=0.5;cx.beginPath();cx.arc(n.x,n.y,r*2.5*pulse,0,T);cx.stroke()}const ng=cx.createRadialGradient(n.x-r*0.3,n.y-r*0.3,r*0.05,n.x,n.y,r*1.1);ng.addColorStop(0,'rgba('+Math.min(255,cr+80)+','+Math.min(255,cg+80)+','+Math.min(255,cb+80)+','+al+')');ng.addColorStop(0.5,'rgba('+cr+','+cg+','+cb+','+al+')');ng.addColorStop(1,'rgba('+Math.max(0,cr-50)+','+Math.max(0,cg-50)+','+Math.max(0,cb-50)+','+al*0.6+')');cx.fillStyle=ng;cx.beginPath();cx.arc(n.x,n.y,r,0,T);cx.fill();if(r>2.5){cx.fillStyle='rgba(255,255,255,'+al*0.35+')';cx.beginPath();cx.arc(n.x-r*0.25,n.y-r*0.3,r*0.35,0,T);cx.fill()}const showL=n.isHub||n.s*zm>0.85||n.hl||n.i===sel;if(showL&&r>1.5){const label=n.path.split('/').pop(),fs=Math.max(8,Math.min(13,10*n.s*zm));cx.font='600 '+fs+'px monospace';const tw=cx.measureText(label).width,lx=n.x+r+6,ly=n.y+fs*0.35,pad=3;cx.fillStyle='rgba(0,0,0,'+al*0.8+')';cx.fillRect(lx-pad,ly-fs,tw+pad*2+(n.isHub&&n.deg>2?24:0),fs+pad*2);cx.strokeStyle='rgba('+cr+','+cg+','+cb+','+al*0.2+')';cx.lineWidth=0.5;cx.strokeRect(lx-pad,ly-fs,tw+pad*2+(n.isHub&&n.deg>2?24:0),fs+pad*2);cx.fillStyle='rgba(230,237,243,'+al*0.9+')';cx.textAlign='left';cx.fillText(label,lx,ly);if(n.isHub&&n.deg>2){cx.fillStyle='rgba('+cr+','+cg+','+cb+','+al+')';cx.font='700 '+Math.max(7,8*n.s*zm)+'px monospace';cx.fillText(String(n.deg),lx+tw+pad+2,ly)}}}requestAnimationFrame(draw)}cv.addEventListener('wheel',e=>{e.preventDefault();zm=Math.max(0.25,Math.min(4,zm*(e.deltaY>0?0.94:1.06)))},{passive:false});cv.addEventListener('mousedown',e=>{drag=true;dsx=e.clientX;dsy=e.clientY;drx=rY;dry=rX;aR=false});addEventListener('mousemove',e=>{if(drag){rY=drx+(e.clientX-dsx)*0.004;rX=Math.max(-1.3,Math.min(1.3,dry+(e.clientY-dsy)*0.004));return}const all=N.map((n,i)=>{if(!n.vis)return null;const p=proj(n.x,n.y,n.z);return{i,x:p.x,y:p.y,r:n.r*p.s*zm,s:p.s}}).filter(Boolean);all.sort((a,b)=>b.s-a.s);let found=null;for(const p of all){const dx=e.clientX-p.x,dy=e.clientY-p.y;if(dx*dx+dy*dy<(p.r+5)*(p.r+5)){found=p.i;break}}hov=found;if(found!==null){const n=N[found];tt.style.display='block';tt.style.left=(e.clientX+12)+'px';tt.style.top=(e.clientY-8)+'px';tt.innerHTML='<div class="tp">'+n.path+'</div><div class="tm">'+n.type+' · '+n.words+' words · '+n.deg+' connections'+(n.isHub?' · HUB':'')+'</div>'+(n.summary?'<div style="color:#6b7280;font-size:10px;margin-top:4px;max-width:250px">'+n.summary+'</div>':'');cv.style.cursor='pointer'}else{tt.style.display='none';cv.style.cursor='grab'}});addEventListener('mouseup',()=>{if(drag){drag=false;setTimeout(()=>{aR=true},1500)}});cv.addEventListener('click',()=>{if(hov!==null){sel=hov;showD(N[sel])}else{sel=null;dt.classList.remove('open')}});cv.addEventListener('dblclick',()=>{if(hov!==null){sel=hov;showD(N[sel]);zm=Math.min(4,zm*1.4)}});function showD(n){dt.classList.add('open');const inc=E.filter(e=>e[1]===nM[n.path]).map(e=>({path:N[e[0]].path,kind:e[2]}));const out=E.filter(e=>e[0]===nM[n.path]).map(e=>({path:N[e[1]].path,kind:e[2]}));let h='<h2>'+n.path+'</h2><span class="b">'+n.type+'</span>';if(n.isHub)h+='<span class="b hub">hub '+n.deg+'</span>';if(n.isOrphan)h+='<span class="b orphan">orphan</span>';if(n.summary)h+='<p style="color:#9aa4b2;font-size:12px;line-height:1.4;margin:0 0 14px;border-left:2px solid rgba(94,234,212,0.2);padding-left:8px">'+n.summary+'</p>';h+='<div class="ms"><div class="m"><strong>'+n.words+'</strong><span>Words</span></div><div class="m"><strong>'+n.deg+'</strong><span>Degree</span></div><div class="m"><strong>'+inc.length+'</strong><span>In</span></div><div class="m"><strong>'+out.length+'</strong><span>Out</span></div></div>';const hd=(n.headings||[]).filter(Boolean);if(hd.length){h+='<h3>Structure ('+hd.length+')</h3>';hd.slice(0,12).forEach(x=>{h+='<div class="hi">'+x+'</div>'})}if(inc.length){h+='<h3>Imported by ('+inc.length+')</h3>';inc.forEach(e=>{h+='<div class="ei" onclick="nav(\\''+e.path+'\\')">'+e.path+'</div>'})}if(out.length){h+='<h3>Imports ('+out.length+')</h3>';out.forEach(e=>{h+='<div class="ei" onclick="nav(\\''+e.path+'\\')">'+e.path+'</div>'})}dc.innerHTML=h}window.nav=function(p){const i=nM[p];if(i!=null){sel=i;showD(N[i])}};document.getElementById('cd').addEventListener('click',()=>{dt.classList.remove('open');sel=null});const FB={all:'fa',hubs:'fh',orphans:'fo'};for(const[f,id]of Object.entries(FB)){document.getElementById(id).addEventListener('click',()=>{flt=f;af();document.querySelectorAll('#tb button').forEach(b=>b.classList.remove('a'));document.getElementById(id).classList.add('a')})}document.getElementById('si').addEventListener('input',e=>{sq=e.target.value;af()});document.getElementById('nc').textContent=N.length;document.getElementById('ec').textContent=E.length;af();draw();</script></body></html>`;
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
  const mapPath = path.join(repoPath, '.athena', 'claude-context-navigation.md');
  try {
    const s = await stat(mapPath);
    return s.mtime;
  } catch {
    return null;
  }
}

async function regenerateMap(repoPath, outputDir = null) {
  const outDir = outputDir || path.join(repoPath, '.athena');
  const args = [EXPORT_SCRIPT, repoPath, '--out', outDir];
  const { stdout } = await execFileAsync('node', args, { maxBuffer: 50 * 1024 * 1024, timeout: 120000 });
  return stdout.trim();
}

async function getGitWorkingTreeStatus(repoPath) {
  try {
    const { stdout } = await execFileAsync('git', ['-C', repoPath, 'status', '--porcelain=v1', '--untracked-files=normal'], { timeout: 10000 });
    const files = [];
    for (const rawLine of stdout.split('\n')) {
      if (!rawLine.trim()) continue;
      const status = rawLine.slice(0, 2);
      let filePath = rawLine.slice(3).trim();
      if (filePath.includes(' -> ')) filePath = filePath.split(' -> ').pop().trim();
      files.push({ status, path: filePath });
    }
    return {
      dirty: files.length > 0,
      count: files.length,
      files
    };
  } catch {
    return { dirty: false, count: 0, files: [] };
  }
}

async function getNewestWorkingTreeMtime(repoPath, files) {
  let newest = null;
  const staleFiles = [];
  for (const file of files) {
    const filePath = path.join(repoPath, file.path);
    try {
      const s = await stat(filePath);
      if (!newest || s.mtime > newest) newest = s.mtime;
      staleFiles.push({ ...file, modified: s.mtime.toISOString() });
    } catch {
      staleFiles.push({ ...file, modified: null });
    }
  }
  return { newest, files: staleFiles };
}

async function handleCheckMapFreshness({ path: repoPath, auto_refresh }) {
  const root = path.resolve(repoPath);
  const commitTime = await getLatestGitCommitTime(root);
  const mapTime = await getMapGenerationTime(root);
  const workingTree = await getGitWorkingTreeStatus(root);
  const workingTreeTimes = await getNewestWorkingTreeMtime(root, workingTree.files);

  if (!mapTime) {
    if (auto_refresh) {
      const output = await regenerateMap(root);
      return { status: 'generated', reason: 'No map existed', dirty_files: workingTree.count, output };
    }
    return { status: 'missing', reason: 'No context map found. Run generate_context_map first.', dirty_files: workingTree.count };
  }

  if (!commitTime) {
    const staleFromDirty = Boolean(workingTreeTimes.newest && workingTreeTimes.newest > mapTime);
    if (staleFromDirty && auto_refresh) {
      const output = await regenerateMap(root);
      return {
        status: 'refreshed',
        reason: `Map did not reflect ${workingTree.count} working-tree file(s). Regenerated from the current working tree.`,
        dirty_files: workingTree.count,
        working_tree_files: workingTreeTimes.files.slice(0, 80),
        output
      };
    }
    return {
      status: staleFromDirty ? 'stale_dirty' : (workingTree.dirty ? 'fresh_with_dirty_overlay' : 'unknown'),
      reason: staleFromDirty
        ? `Map is stale — ${workingTree.count} working-tree file(s) changed after the map was generated.`
        : 'Not a git repo or no commits. Map exists but commit freshness cannot be determined.',
      map_time: mapTime.toISOString(),
      dirty_files: workingTree.count,
      working_tree_files: workingTreeTimes.files.slice(0, 80),
      stale_from_dirty: staleFromDirty
    };
  }

  const staleFromCommit = commitTime > mapTime;
  const staleFromDirty = Boolean(workingTreeTimes.newest && workingTreeTimes.newest > mapTime);
  const isStale = staleFromCommit || staleFromDirty;
  const ageMinutes = Math.round((Date.now() - mapTime.getTime()) / 60000);

  if (isStale && auto_refresh) {
    const output = await regenerateMap(root);
    return {
      status: 'refreshed',
      reason: staleFromDirty
        ? `Map did not reflect ${workingTree.count} working-tree file(s). Regenerated from the current working tree.`
        : `Map was ${ageMinutes} min old, latest commit was newer. Regenerated.`,
      dirty_files: workingTree.count,
      working_tree_files: workingTreeTimes.files.slice(0, 80),
      output
    };
  }

  return {
    status: isStale ? (staleFromDirty ? 'stale_dirty' : 'stale') : (workingTree.dirty ? 'fresh_with_dirty_overlay' : 'fresh'),
    map_generated: mapTime.toISOString(),
    latest_commit: commitTime.toISOString(),
    age_minutes: ageMinutes,
    dirty_files: workingTree.count,
    working_tree_files: workingTreeTimes.files.slice(0, 80),
    stale_from_commit: staleFromCommit,
    stale_from_dirty: staleFromDirty,
    reason: isStale
      ? (staleFromDirty
          ? `Map is stale — ${workingTree.count} working-tree file(s) changed after the map was generated. Use auto_refresh:true or run generate_context_map.`
          : `Map is stale — generated ${ageMinutes} min ago but latest commit is newer. Use auto_refresh:true or run generate_context_map.`)
      : (workingTree.dirty
          ? `Map reflects current working-tree file mtimes, but ${workingTree.count} file(s) are still uncommitted.`
          : `Map is fresh — generated ${ageMinutes} min ago, after the latest commit.`)
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

  const hooksDir = path.join(root, '.git', 'hooks');
  const marker = '# ATHENA-MCP:BEGIN';
  await mkdir(hooksDir, { recursive: true });
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  const postCommitPath = path.join(hooksDir, 'post-commit');
  const preCommitScript = buildHookScript(root, false);
  const postCommitScript = buildHookScript(root, true);
  const preCommit = await installHookBlock(preCommitPath, marker, preCommitScript);
  const postCommit = await installHookBlock(postCommitPath, marker, postCommitScript);

  // Optionally refresh now
  let refreshResult = null;
  if (refresh_now !== false) {
    const freshness = await handleCheckMapFreshness({ path: root, auto_refresh: true });
    refreshResult = freshness;
  }

  return {
    hooks: {
      pre_commit: preCommit,
      post_commit: postCommit
    },
    auto_refresh_result: refreshResult,
    hint: 'Context map will now update before commit for dirty-tree accuracy and after commit for HEAD freshness.'
  };
}

function buildHookScript(root, background) {
  const command = `node "${EXPORT_SCRIPT}" "${root}" --out "${path.join(root, '.athena')}"`;
  return `# ATHENA-MCP:BEGIN
${background ? `${command} > /dev/null 2>&1 &` : `${command} > /dev/null 2>&1`}
echo "[athena] Context map updated."
# ATHENA-MCP:END
`;
}

async function installHookBlock(hookPath, marker, hookScript) {
  let existing = '';
  let existed = true;
  try {
    existing = await readFile(hookPath, 'utf8');
  } catch {
    existed = false;
  }
  const updated = upsertMarkedShellBlock(existing, marker, hookScript);
  if (existing !== updated) {
    await fsp.writeFile(hookPath, updated, 'utf8');
    await fsp.chmod(hookPath, 0o755);
    return { path: hookPath, status: existed ? 'updated' : 'installed' };
  }
  await fsp.chmod(hookPath, 0o755).catch(() => {});
  return { path: hookPath, status: 'already_installed' };
}

function upsertMarkedShellBlock(existing, marker, block) {
  const begin = marker;
  const end = '# ATHENA-MCP:END';
  const trimmedBlock = block.trimEnd();
  const body = existing.startsWith('#!') ? existing : (existing ? `#!/bin/sh\n${existing}` : '#!/bin/sh\n');
  const pattern = new RegExp(`${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}`, 'm');
  if (pattern.test(body)) {
    return body.replace(pattern, trimmedBlock).trimEnd() + '\n';
  }
  return `${body.trimEnd()}\n\n${trimmedBlock}\n`;
}

async function handleSetupRepo({ path: repoPath, apply }) {
  const root = path.resolve(repoPath);

  // Verify git repo
  try { await stat(path.join(root, '.git')); } catch {
    throw new Error('Not a git repository. Run this inside a git repo.');
  }

  const claudeMdPath = path.join(root, 'CLAUDE.md');
  const gitignorePath = path.join(root, '.gitignore');
  const hooksDir = path.join(root, '.git', 'hooks');
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  const postCommitPath = path.join(hooksDir, 'post-commit');

  const existingClaude = await readOptionalFile(claudeMdPath);
  const existingGitignore = await readOptionalFile(gitignorePath);
  const existingPreCommit = await readOptionalFile(preCommitPath);
  const existingPostCommit = await readOptionalFile(postCommitPath);

  const nextClaude = upsertAthenaInstructionBlock(existingClaude);
  const nextGitignore = ensureGitignoreLine(existingGitignore, '.athena/');
  const nextPreCommit = upsertMarkedShellBlock(existingPreCommit, '# ATHENA-MCP:BEGIN', buildHookScript(root, false));
  const nextPostCommit = upsertMarkedShellBlock(existingPostCommit, '# ATHENA-MCP:BEGIN', buildHookScript(root, true));

  const planned = [
    { file: claudeMdPath, before: existingClaude, after: nextClaude },
    { file: gitignorePath, before: existingGitignore, after: nextGitignore },
    { file: preCommitPath, before: existingPreCommit, after: nextPreCommit },
    { file: postCommitPath, before: existingPostCommit, after: nextPostCommit }
  ];
  const diffs = planned
    .filter((item) => item.before !== item.after)
    .map((item) => ({
      file: item.file,
      diff: createUnifiedDiff(item.file, item.before, item.after)
    }));

  if (!apply) {
    return {
      status: 'needs_confirmation',
      apply_required: true,
      would_write: diffs.map((item) => item.file),
      diffs,
      hint: 'Review these diffs. Re-run setup_repo with apply:true to write files and generate the map.'
    };
  }

  const steps = [];
  for (const item of planned) {
    if (item.before === item.after) {
      steps.push({ step: path.basename(item.file), status: 'unchanged', path: item.file });
      continue;
    }
    await mkdir(path.dirname(item.file), { recursive: true });
    await fsp.writeFile(item.file, item.after, 'utf8');
    if (item.file.includes(`${path.sep}.git${path.sep}hooks${path.sep}`)) await fsp.chmod(item.file, 0o755);
    steps.push({ step: path.basename(item.file), status: 'written', path: item.file });
  }

  let mapOutput = '';
  try {
    mapOutput = await regenerateMap(root);
    steps.push({ step: 'context_map', status: 'written', path: path.join(root, '.athena') });
  } catch (error) {
    steps.push({ step: 'context_map', status: 'error', detail: error.message });
  }

  return {
    status: steps.some((step) => step.status === 'error') ? 'partial' : 'ready',
    steps,
    diffs,
    map_output: mapOutput.split('\n').slice(-3).join('\n'),
    hint: 'Setup applied. Re-running setup_repo with apply:true will be byte-stable unless the generated block changes.'
  };
}

async function readOptionalFile(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

function upsertAthenaInstructionBlock(existing) {
  const begin = '<!-- ATHENA-CONTEXT-MAP:BEGIN -->';
  const end = '<!-- ATHENA-CONTEXT-MAP:END -->';
  const legacy = '<!-- shibanshu-context-map -->';
  const block = `${begin}
## Context Map

This repo has an auto-updating, queryable context map at \`.athena/\`.

At the start of a session, use \`check_map_freshness\`. If the map is stale or dirty, refresh it. Prefer \`query_context\`, \`repo_health\`, and \`blast_radius\` for targeted context before reading large files.

Generated intelligence reports:
- \`contradictions.md\`
- \`staleness-report.md\`
- \`semantic-warnings.md\`
- \`authority-graph.md\`
- \`repo-health.md\`
- \`duplicates.md\`

Use \`read_context_map file:"navigation"\` only for orientation, and never read \`llm-context-chunks.jsonl\` directly.
${end}`;

  if (existing.includes(begin) && existing.includes(end)) {
    const regex = new RegExp(`${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}`, 'g');
    return existing.replace(regex, block).trimEnd() + '\n';
  }
  if (existing.includes(legacy)) {
    const regex = new RegExp(`${escapeRegExp(legacy)}[\\s\\S]*?${escapeRegExp(legacy)}`, 'g');
    return existing.replace(regex, block).trimEnd() + '\n';
  }
  return existing ? `${existing.trimEnd()}\n\n${block}\n` : `${block}\n`;
}

function ensureGitignoreLine(existing, line) {
  const lines = existing.split(/\r?\n/);
  if (lines.some((item) => item.trim() === line)) return existing.endsWith('\n') ? existing : `${existing}\n`;
  const prefix = existing.trimEnd();
  const addition = `# Context map (auto-generated)\n${line}\n`;
  return prefix ? `${prefix}\n\n${addition}` : addition;
}

function createUnifiedDiff(filePath, before, after) {
  if (before === after) return '';
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const lines = [`--- ${filePath}`, `+++ ${filePath}`];
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  lines.push(`@@ -1,${beforeLines.length} +1,${afterLines.length} @@`);
  for (let index = 0; index < maxLines; index += 1) {
    const left = beforeLines[index];
    const right = afterLines[index];
    if (left === right) {
      if (left !== undefined) lines.push(` ${left}`);
      continue;
    }
    if (left !== undefined) lines.push(`-${left}`);
    if (right !== undefined) lines.push(`+${right}`);
    if (lines.length > 220) {
      lines.push('...diff truncated...');
      break;
    }
  }
  return lines.join('\n');
}

function serializeToolResult(result, args = {}) {
  const budget = parseTokenBudget(args?.token_budget || args?.max_tokens, DEFAULT_RESPONSE_TOKEN_BUDGET);
  const maxChars = tokenBudgetToChars(budget);
  const text = JSON.stringify(result, null, 2);
  if (text.length <= maxChars) return text;
  return JSON.stringify(summarizeOversizedResult(result, maxChars, budget), null, 2);
}

function summarizeOversizedResult(result, maxChars, budget) {
  const summary = {
    response_truncated: true,
    token_budget: budget,
    reason: `Raw tool result exceeded ${budget} approximate tokens.`,
    hint: 'Use query_context, a narrower section, lower max_results, or read_context_map pagination.'
  };
  for (const [key, value] of Object.entries(result || {})) {
    if (typeof value === 'string') {
      summary[key] = value.length > Math.min(4000, maxChars / 4)
        ? `${value.slice(0, Math.min(4000, Math.floor(maxChars / 4)))}\n[truncated ${value.length} chars]`
        : value;
    } else if (Array.isArray(value)) {
      summary[key] = value.slice(0, 40);
      if (value.length > 40) summary[`${key}_omitted`] = value.length - 40;
    } else if (value && typeof value === 'object') {
      summary[key] = shrinkObject(value, 2, 20);
    } else {
      summary[key] = value;
    }
    if (JSON.stringify(summary).length > maxChars * 0.8) break;
  }
  return summary;
}

function shrinkObject(value, depth, maxKeys) {
  if (!value || typeof value !== 'object' || depth <= 0) return value;
  if (Array.isArray(value)) return value.slice(0, maxKeys).map((item) => shrinkObject(item, depth - 1, maxKeys));
  const out = {};
  for (const [key, child] of Object.entries(value).slice(0, maxKeys)) {
    if (typeof child === 'string' && child.length > 1000) {
      out[key] = `${child.slice(0, 1000)} [truncated ${child.length} chars]`;
    } else {
      out[key] = shrinkObject(child, depth - 1, maxKeys);
    }
  }
  const omitted = Object.keys(value).length - Object.keys(out).length;
  if (omitted > 0) out._omitted_keys = omitted;
  return out;
}

// ─── MCP Server setup ───────────────────────────────────────────────

const HANDLER_MAP = {
  vault_list_files: handleVaultListFiles,
  vault_read_note: handleVaultReadNote,
  vault_write_note: handleVaultWriteNote,
  vault_create_note: handleVaultCreateNote,
  vault_search: handleVaultSearch,
  generate_context_map: handleGenerateContextMap,
  query_context: handleQueryContext,
  read_context_map: handleReadContextMap,
  repo_health: handleRepoHealth,
  blast_radius: handleBlastRadius,
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
  check_map_freshness: handleCheckMapFreshness,
  setup_repo: handleSetupRepo
};

const server = new Server(
  { name: 'athena', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const root = process.cwd();
  const outDir = path.join(root, '.athena');
  const resources = [
    ['navigation', 'claude-context-navigation.md', 'text/markdown'],
    ['health', 'repo-health.md', 'text/markdown'],
    ['contradictions', 'contradictions.md', 'text/markdown'],
    ['staleness', 'staleness-report.md', 'text/markdown'],
    ['warnings', 'semantic-warnings.md', 'text/markdown'],
    ['authority', 'authority-graph.md', 'text/markdown'],
    ['duplicates', 'duplicates.md', 'text/markdown'],
    ['graph', 'claude-context-graph.json', 'application/json'],
    ['integrity', 'context-integrity.json', 'application/json']
  ];
  const available = [];
  for (const [name, fileName, mimeType] of resources) {
    const filePath = path.join(outDir, fileName);
    try {
      await stat(filePath);
      available.push({
        uri: `athena://context/${name}?root=${encodeURIComponent(root)}`,
        name: `Athena ${name}`,
        description: `${fileName} for ${root}`,
        mimeType
      });
    } catch {}
  }
  return { resources: available };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = new URL(request.params.uri);
  if (uri.protocol !== 'athena:' || uri.hostname !== 'context') {
    throw new Error(`Unsupported resource URI: ${request.params.uri}`);
  }
  const root = uri.searchParams.get('root') || process.cwd();
  const name = uri.pathname.replace(/^\//, '');
  const fileMap = {
    navigation: 'claude-context-navigation.md',
    health: 'repo-health.md',
    contradictions: 'contradictions.md',
    staleness: 'staleness-report.md',
    warnings: 'semantic-warnings.md',
    authority: 'authority-graph.md',
    duplicates: 'duplicates.md',
    graph: 'claude-context-graph.json',
    integrity: 'context-integrity.json'
  };
  const fileName = fileMap[name];
  if (!fileName) throw new Error(`Unknown Athena resource: ${name}`);
  const filePath = path.join(normalizeAbsolutePath(root, 'Resource root'), '.athena', fileName);
  const text = await readFile(filePath, 'utf8');
  const budget = tokenBudgetToChars(DEFAULT_RESPONSE_TOKEN_BUDGET);
  return {
    contents: [{
      uri: request.params.uri,
      mimeType: fileName.endsWith('.json') ? 'application/json' : 'text/markdown',
      text: text.length > budget ? `${text.slice(0, budget)}\n\n[truncated: use query_context or read_context_map pagination for more]` : text
    }]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = HANDLER_MAP[name];
  if (!handler) {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
  try {
    const result = await handler(args);
    return { content: [{ type: 'text', text: serializeToolResult(result, args) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

// ─── Start server ────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
