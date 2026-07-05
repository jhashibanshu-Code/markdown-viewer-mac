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
import { readdir, readFile, writeFile, stat, mkdir, rename, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, 'mcp-server.mjs');
const EXPORT_SCRIPT = path.join(__dirname, 'export-context.mjs');

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
          enum: ['navigation', 'map', 'mind-map', 'graph', 'chunks']
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

// ─── Tool handlers ──────────────────────────────────────────────────

async function handleVaultListFiles({ path: vaultPath, max_files, pattern }) {
  const files = await walkVault(vaultPath, max_files || 500);
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
  const s = await stat(notePath);
  if (s.size > MAX_FILE_SIZE) throw new Error(`File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`);
  const content = await readFile(notePath, 'utf8');
  const headings = extractMarkdownHeadings(content);
  const tags = extractMarkdownTags(content);
  const links = extractMarkdownLinks(content);
  return {
    path: notePath,
    name: path.basename(notePath),
    content,
    words: countWords(content),
    headings,
    tags,
    links
  };
}

async function handleVaultWriteNote({ path: notePath, content }) {
  await mkdir(path.dirname(notePath), { recursive: true });
  await writeFile(notePath, content, 'utf8');
  return { path: notePath, name: path.basename(notePath), words: countWords(content), written: true };
}

async function handleVaultCreateNote({ path: notePath, content, title }) {
  const dir = path.dirname(notePath);
  await mkdir(dir, { recursive: true });
  const name = title || path.basename(notePath, path.extname(notePath));
  const body = content || `# ${name}\n\n`;
  // Check if target already exists — refuse to overwrite
  try {
    await stat(notePath);
    throw new Error(`File already exists: ${notePath}. Use vault_write_note to overwrite.`);
  } catch (e) {
    if (e.message.startsWith('File already exists')) throw e;
    // ENOENT means file doesn't exist — safe to proceed
  }
  const tempPath = notePath + `.${process.pid}.${Date.now()}.tmp`;
  const handle = await fsp.open(tempPath, 'wx');
  await handle.writeFile(body, 'utf8');
  await handle.sync();
  await handle.close();
  await rename(tempPath, notePath);
  return { path: notePath, name: path.basename(notePath), words: countWords(body), created: true };
}

async function handleVaultSearch({ path: vaultPath, query, max_results }) {
  const files = await walkVault(vaultPath, MAX_VAULT_FILES);
  const q = query.toLowerCase();
  const limit = Math.min(max_results || 20, MAX_SEARCH_RESULTS);
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
  const outDir = output_dir || path.join(rootPath, '.shibanshu');
  const args = [EXPORT_SCRIPT, rootPath, '--out', outDir];
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
      'llm-context-chunks.jsonl'
    ],
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    hint: 'Use read_context_map to read individual output files. Start with "navigation" for the best overview.'
  };
}

async function handleReadContextMap({ path: rootPath, file, output_dir }) {
  const outDir = output_dir || path.join(rootPath, '.shibanshu');
  const fileMap = {
    navigation: 'claude-context-navigation.md',
    map: 'claude-context-map.md',
    'mind-map': 'claude-context-mind-map.md',
    graph: 'claude-context-graph.json',
    chunks: 'llm-context-chunks.jsonl'
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
  const files = await walkVault(vaultPath, max_files || 1000);
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
  const content = await readFile(filePath, 'utf8');
  const mermaid = generateMindMap(filePath, content);
  const headings = extractMarkdownHeadings(content);
  const tags = extractMarkdownTags(content);
  const links = extractMarkdownLinks(content);

  return {
    path: filePath,
    name: path.basename(filePath),
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
  const content = await readFile(filePath, 'utf8');
  const links = extractMarkdownLinks(content);
  return { path: filePath, total: links.length, links };
}

async function handleExtractHeadings({ path: filePath }) {
  const content = await readFile(filePath, 'utf8');
  const headings = extractMarkdownHeadings(content);
  return { path: filePath, total: headings.length, headings };
}

async function handleExtractTags({ path: filePath }) {
  const content = await readFile(filePath, 'utf8');
  const tags = extractMarkdownTags(content);
  return { path: filePath, total: tags.length, tags };
}

async function handleVaultBacklinks({ vault_path, note_path }) {
  const files = await walkVault(vault_path, MAX_VAULT_FILES);
  const targetName = path.basename(note_path, path.extname(note_path)).toLowerCase();
  const targetRelative = path.relative(vault_path, note_path).toLowerCase().replace(/\.[^.]+$/, '');
  const backlinks = [];

  for (const f of files) {
    if (f.path === note_path) continue;
    try {
      const content = await readFile(f.path, 'utf8');
      const links = extractMarkdownLinks(content);
      for (const link of links) {
        const linkTarget = link.target.replace(/#.*$/, '').trim().toLowerCase().replace(/\.[^.]+$/, '');
        if (linkTarget === targetName || linkTarget === targetRelative || linkTarget.endsWith('/' + targetName)) {
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
  const publishScript = path.join(__dirname, 'scripts', 'publish-static-site.mjs');
  const args = [publishScript, vaultPath, '--out', output_dir];
  if (title) args.push('--title', title);
  if (theme) args.push('--theme', theme);

  const { stdout, stderr } = await execFileAsync('node', args, { maxBuffer: 50 * 1024 * 1024, timeout: 120000 });

  return {
    output_dir,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    hint: `Static site published to ${output_dir}. Open index.html in a browser.`
  };
}

async function handleCreateDailyNote({ vault_path, date, subfolder }) {
  const now = new Date();
  const dateStr = date || now.toISOString().split('T')[0];
  const dateParts = dateStr.split('-');
  const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const fileName = `${dateStr}.md`;
  const dir = subfolder ? path.join(vault_path, subfolder) : vault_path;
  const filePath = path.join(dir, fileName);

  // Check if already exists
  try {
    await stat(filePath);
    const content = await readFile(filePath, 'utf8');
    return { path: filePath, name: fileName, already_existed: true, words: countWords(content) };
  } catch { /* doesn't exist yet */ }

  const template = `# ${dayName}, ${monthDay}\n\n## Tasks\n\n- [ ] \n- [ ] \n- [ ] \n\n## Notes\n\n\n\n## Goals\n\n- \n\n## Log\n\n- ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — Created daily note\n\n`;

  await mkdir(dir, { recursive: true });
  await writeFile(filePath, template, 'utf8');
  return { path: filePath, name: fileName, created: true, words: countWords(template) };
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
  create_daily_note: handleCreateDailyNote
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
