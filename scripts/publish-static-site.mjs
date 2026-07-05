#!/usr/bin/env node

import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { marked } from 'marked';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd', '.txt']);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.hg',
  '.svn',
  '.obsidian',
  '.shibanshu-site',
  '.trash',
  'node_modules',
  'dist',
  'release',
  'build',
  'coverage'
]);
const DEFAULT_MAX_FILES = 1000;
const DEFAULT_MAX_BYTES = 750 * 1024;
const DEFAULT_MAX_DEPTH = 24;
const MAX_TOTAL_BYTES = 120 * 1024 * 1024;
const DEFAULT_PROFILE_PATH = '.shibanshu/publish-profiles.json';

try {
  await main();
} catch (error) {
  console.error(`static-publish: ${error.message}`);
  process.exit(1);
}

async function main() {
  const { flags, positionals } = parseFlags(process.argv.slice(2));
  if (flags.help || flags.h) {
    printHelp();
    return;
  }

  const inputRoot = positionals[0] ? path.resolve(positionals[0]) : null;
  if (!inputRoot) {
    throw new Error('Missing vault folder.');
  }

  const inputStats = await stat(inputRoot);
  if (!inputStats.isDirectory()) {
    throw new Error(`Vault path is not a folder: ${inputRoot}`);
  }

  const profileInfo = await loadPublishProfile(inputRoot, flags);
  if (flags.listProfiles || flags['list-profiles']) {
    printProfileList(profileInfo);
    return;
  }

  const settings = mergePublishSettings(profileInfo.settings, flags);
  const outputRoot = resolveOutputRoot(inputRoot, settings, profileInfo, flags);
  if (samePath(inputRoot, outputRoot)) {
    throw new Error('Output folder must be different from the source vault folder.');
  }

  const options = {
    title: String(settings.title || path.basename(inputRoot) || 'Markdown Site').trim() || 'Markdown Site',
    theme: settings.theme === 'dark' ? 'dark' : 'light',
    maxFiles: parsePositiveInteger(settings.maxFiles || settings['max-files'], DEFAULT_MAX_FILES),
    maxBytes: parsePositiveInteger(settings.maxBytes || settings['max-bytes'], DEFAULT_MAX_BYTES),
    maxDepth: parsePositiveInteger(settings.maxDepth || settings['max-depth'], DEFAULT_MAX_DEPTH)
  };

  const saveProfileName = settings.saveProfile || settings['save-profile'];
  if (saveProfileName === true) {
    throw new Error('Missing profile name after --save-profile.');
  }
  if (saveProfileName && saveProfileName !== true) {
    await savePublishProfile(inputRoot, profileInfo, saveProfileName, settings, options, outputRoot);
  }

  const site = await buildSitePayload(inputRoot, outputRoot, options);
  const writtenFiles = await renderStaticSite(outputRoot, site);

  console.log(`Static site written: ${outputRoot}`);
  console.log(`Index: ${path.join(outputRoot, 'index.html')}`);
  if (profileInfo.selectedName) console.log(`Profile: ${profileInfo.selectedName} (${profileInfo.filePath})`);
  if (saveProfileName && saveProfileName !== true) console.log(`Profile saved: ${saveProfileName} (${profileInfo.filePath})`);
  console.log(`${site.files.length} notes, ${site.graph.edges.length} links, ${writtenFiles} files written`);
}

function printHelp() {
  console.log(`Usage: npm run publish:static -- <vault-folder> --out <site-folder> [options]

Options:
  --out <folder>          Output folder. Defaults to <vault>/.shibanshu-site
  --title <name>          Published site title
  --theme light|dark      Published site theme
  --max-files <number>    Maximum Markdown files to export. Default ${DEFAULT_MAX_FILES}
  --max-bytes <number>    Maximum bytes read per file. Default ${DEFAULT_MAX_BYTES}
  --max-depth <number>    Maximum directory depth. Default ${DEFAULT_MAX_DEPTH}
  --profile <name>        Load a profile from ${DEFAULT_PROFILE_PATH}
  --save-profile <name>   Save the selected options as a reusable profile
  --profiles <file>       Custom profile JSON file
  --list-profiles         List profiles for a vault

Examples:
  npm run publish:static -- ~/Notes --out ~/Desktop/notes-site
  shibanshu-markdown publish ~/Notes --out ~/Desktop/notes-site --theme dark
  shibanshu-markdown publish ~/Notes --save-profile docs --out ../notes-site
  shibanshu-markdown publish ~/Notes --profile docs
`);
}

async function loadPublishProfile(inputRoot, flags) {
  const filePath = resolveProfileFilePath(inputRoot, flags);
  if (flags.profile === true) {
    throw new Error('Missing profile name after --profile.');
  }
  const selectedName = typeof flags.profile === 'string' ? flags.profile.trim() : '';
  const wantsList = Boolean(flags.listProfiles || flags['list-profiles']);
  const result = {
    filePath,
    selectedName: '',
    settings: {},
    profiles: {}
  };

  if (!selectedName && !wantsList) return result;

  const document = await readProfilesDocument(filePath, Boolean(selectedName));
  const profiles = getProfilesMap(document);
  result.profiles = profiles;

  if (!selectedName) return result;
  validateProfileName(selectedName);

  const profile = profiles[selectedName];
  if (!profile) {
    throw new Error(`Publish profile not found: ${selectedName}`);
  }

  result.selectedName = selectedName;
  result.settings = normalizeProfileSettings(profile, selectedName);
  return result;
}

function printProfileList(profileInfo) {
  const names = Object.keys(profileInfo.profiles).sort((a, b) => a.localeCompare(b));
  if (!names.length) {
    console.log(`No publish profiles found at ${profileInfo.filePath}`);
    return;
  }
  console.log(`Publish profiles at ${profileInfo.filePath}:`);
  for (const name of names) {
    const profile = profileInfo.profiles[name] || {};
    const title = profile.title ? ` - ${profile.title}` : '';
    console.log(`- ${name}${title}`);
  }
}

function mergePublishSettings(profileSettings, flags) {
  return {
    ...profileSettings,
    ...flags
  };
}

function resolveOutputRoot(inputRoot, settings, profileInfo, flags) {
  const explicitOut = flags.out || flags.output;
  const profileOut = profileInfo.settings.out || profileInfo.settings.output;
  const rawOut = explicitOut || settings.out || settings.output || path.join(inputRoot, '.shibanshu-site');
  const baseDirectory = explicitOut ? process.cwd() : profileOut ? inputRoot : process.cwd();
  return path.isAbsolute(String(rawOut)) ? path.resolve(String(rawOut)) : path.resolve(baseDirectory, String(rawOut));
}

async function savePublishProfile(inputRoot, profileInfo, rawName, settings, options, outputRoot) {
  const name = String(rawName || '').trim();
  validateProfileName(name);

  const document = normalizeProfilesDocument(await readProfilesDocument(profileInfo.filePath, false));
  const rawOut = settings.out || settings.output;
  document.profiles[name] = {
    out: normalizeProfileOut(rawOut, inputRoot, outputRoot),
    title: options.title,
    theme: options.theme,
    maxFiles: options.maxFiles,
    maxBytes: options.maxBytes,
    maxDepth: options.maxDepth
  };

  await mkdir(path.dirname(profileInfo.filePath), { recursive: true });
  await atomicWriteFile(profileInfo.filePath, `${JSON.stringify(document, null, 2)}\n`);
}

async function readProfilesDocument(filePath, required) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (required) throw new Error(`Publish profile file not found: ${filePath}`);
      return { profiles: {} };
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Publish profile file is not valid JSON: ${filePath}`);
    }
    throw error;
  }
}

function normalizeProfilesDocument(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    return { profiles: {} };
  }
  if (document.profiles && typeof document.profiles === 'object' && !Array.isArray(document.profiles)) {
    return {
      ...document,
      profiles: { ...document.profiles }
    };
  }
  return {
    profiles: { ...document }
  };
}

function getProfilesMap(document) {
  return normalizeProfilesDocument(document).profiles;
}

function normalizeProfileSettings(profile, name) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error(`Publish profile must be an object: ${name}`);
  }

  const allowedKeys = new Set([
    'out',
    'output',
    'title',
    'theme',
    'maxFiles',
    'max-files',
    'maxBytes',
    'max-bytes',
    'maxDepth',
    'max-depth'
  ]);
  const settings = {};
  for (const [key, value] of Object.entries(profile)) {
    if (!allowedKeys.has(key)) continue;
    settings[key] = value;
    settings[toCamelFlag(key)] = value;
  }
  return settings;
}

function resolveProfileFilePath(inputRoot, flags) {
  const rawPath = flags.profiles || flags.profileFile || flags['profile-file'];
  if (rawPath === true) {
    throw new Error('Missing profile file path after --profiles.');
  }
  if (rawPath) {
    return path.resolve(String(rawPath));
  }
  return path.join(inputRoot, DEFAULT_PROFILE_PATH);
}

function normalizeProfileOut(rawOut, inputRoot, outputRoot) {
  if (typeof rawOut === 'string' && rawOut.trim()) {
    return rawOut.trim();
  }
  const relative = toPosixPath(path.relative(inputRoot, outputRoot));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return outputRoot;
  }
  return relative;
}

function validateProfileName(name) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(String(name || ''))) {
    throw new Error('Publish profile names can contain letters, numbers, dots, dashes, and underscores.');
  }
}

async function buildSitePayload(inputRoot, outputRoot, options) {
  const discoveredFiles = await discoverMarkdownFiles(inputRoot, outputRoot, options);
  if (!discoveredFiles.length) {
    throw new Error('No Markdown or text files were found in the selected folder.');
  }

  const routeMap = createRouteMap(discoveredFiles);
  const documents = [];
  let totalBytes = 0;

  for (const file of discoveredFiles) {
    const stats = await stat(file.absolutePath);
    if (stats.size > options.maxBytes) {
      continue;
    }

    totalBytes += stats.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error(`Static publish is larger than ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)} MB.`);
    }

    const content = await readFile(file.absolutePath, 'utf8');
    const normalizedContent = normalizeLineEndings(content);
    const route = routeMap.byRelativePath.get(file.relativePath);
    const markdownLinks = extractMarkdownLinks(normalizedContent);
    const wikiLinks = extractWikiLinks(normalizedContent);
    const outgoing = resolveOutgoingLinks([...markdownLinks, ...wikiLinks], file.relativePath, routeMap);
    const headings = extractHeadings(normalizedContent);
    const tags = extractTags(normalizedContent);
    const title = inferTitle(normalizedContent, file.relativePath);
    const text = stripMarkdown(normalizedContent).slice(0, 12000);
    const body = renderMarkdownBody(normalizedContent, file.relativePath, routeMap, route.url);

    documents.push({
      id: route.url,
      title,
      relativePath: file.relativePath,
      url: route.url,
      body,
      text,
      excerpt: createExcerpt(text),
      words: countWords(text),
      headings,
      tags,
      outgoing,
      backlinks: []
    });
  }

  const fileByUrl = new Map(documents.map((file) => [file.url, file]));
  for (const file of documents) {
    for (const link of file.outgoing) {
      const target = fileByUrl.get(link.url);
      if (!target) continue;
      target.backlinks.push({
        title: file.title,
        relativePath: file.relativePath,
        url: file.url,
        label: link.label || target.title
      });
    }
  }

  const graph = buildGraph(documents);
  return {
    version: 1,
    title: normalizePublishText(options.title, 180),
    theme: options.theme,
    generatedAt: new Date().toISOString(),
    files: documents.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    graph
  };
}

async function discoverMarkdownFiles(inputRoot, outputRoot, options) {
  const files = [];
  const normalizedOutputRoot = normalizeFilePath(outputRoot);

  async function walk(directory, depth) {
    if (depth > options.maxDepth) return;
    if (files.length >= options.maxFiles) return;

    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      if (files.length >= options.maxFiles) break;
      if (entry.name.startsWith('.') && !entry.name.endsWith('.md')) continue;

      const absolutePath = path.join(directory, entry.name);
      const normalizedAbsolutePath = normalizeFilePath(absolutePath);
      if (normalizedAbsolutePath === normalizedOutputRoot || normalizedAbsolutePath.startsWith(`${normalizedOutputRoot}${path.sep}`)) {
        continue;
      }

      if (entry.isDirectory()) {
        if (shouldSkipDirectory(entry.name)) continue;
        await walk(absolutePath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!MARKDOWN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;

      const relativePath = toPosixPath(path.relative(inputRoot, absolutePath));
      files.push({ absolutePath, relativePath });
    }
  }

  await walk(inputRoot, 0);
  return files;
}

function createRouteMap(files) {
  const usedRoutes = new Set();
  const byRelativePath = new Map();
  const lookup = new Map();

  for (const file of files) {
    const routeBase = slugify(file.relativePath.replace(/\.[^.]+$/, '')) || 'note';
    let route = `notes/${routeBase}.html`;
    let suffix = 2;
    while (usedRoutes.has(route)) {
      route = `notes/${routeBase}-${suffix}.html`;
      suffix += 1;
    }
    usedRoutes.add(route);

    const metadata = {
      relativePath: file.relativePath,
      url: route
    };
    byRelativePath.set(file.relativePath, metadata);

    for (const key of createLookupKeys(file.relativePath)) {
      if (!lookup.has(key)) lookup.set(key, metadata);
    }
  }

  return { byRelativePath, lookup };
}

function createLookupKeys(relativePath) {
  const normalized = normalizeLinkTarget(relativePath);
  const withoutExtension = normalized.replace(/\.[^.]+$/, '');
  const basename = path.posix.basename(normalized);
  const basenameWithoutExtension = basename.replace(/\.[^.]+$/, '');
  return [normalized, withoutExtension, basename, basenameWithoutExtension].filter(Boolean);
}

function renderMarkdownBody(content, sourceRelativePath, routeMap, currentUrl) {
  const rewritten = rewriteWikiLinks(content, routeMap, currentUrl);
  const html = marked.parse(rewritten, {
    async: false,
    gfm: true,
    mangle: false,
    headerIds: false
  });
  return sanitizeHtml(rewriteHtmlLinks(String(html || ''), sourceRelativePath, routeMap, currentUrl));
}

function rewriteWikiLinks(content, routeMap, currentUrl) {
  return content.replace(/\[\[([^\]\n]+)\]\]/g, (match, rawTarget) => {
    const [targetPart, labelPart] = String(rawTarget).split('|');
    const cleanTarget = targetPart.trim();
    const target = resolveLinkTarget(cleanTarget, routeMap);
    const label = (labelPart || cleanTarget.split('#')[0] || cleanTarget).trim();
    if (!target) return escapeMarkdownText(label);
    return `[${escapeMarkdownText(label || target.title)}](${relativeUrl(currentUrl, target.url)})`;
  });
}

function rewriteHtmlLinks(html, sourceRelativePath, routeMap, currentUrl) {
  return html.replace(/<a\s+([^>]*?)href="([^"]+)"([^>]*)>/gi, (match, before, href, after) => {
    const cleanHref = decodeHtmlAttribute(href);
    const target = resolveMarkdownHref(cleanHref, sourceRelativePath, routeMap);
    if (target) {
      return `<a ${before}href="${escapeAttribute(relativeUrl(currentUrl, target.url))}"${after}>`;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(cleanHref)) {
      return `<a ${before}href="${escapeAttribute(cleanHref)}" rel="noreferrer" target="_blank"${after}>`;
    }
    return match;
  });
}

function resolveOutgoingLinks(links, sourceRelativePath, routeMap) {
  const result = [];
  const seen = new Set();

  for (const link of links) {
    const target = link.kind === 'markdown'
      ? resolveMarkdownHref(link.target, sourceRelativePath, routeMap)
      : resolveLinkTarget(link.target, routeMap);
    if (!target) continue;
    const key = `${target.url}:${link.label || target.relativePath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      title: inferTitleFromPath(target.relativePath),
      relativePath: target.relativePath,
      url: target.url,
      label: normalizePublishText(link.label || target.relativePath, 180)
    });
  }

  return result;
}

function resolveMarkdownHref(href, sourceRelativePath, routeMap) {
  const cleanHref = String(href || '').trim();
  if (!cleanHref || cleanHref.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(cleanHref)) return null;
  if (cleanHref.startsWith('//')) return null;

  const [pathPart] = cleanHref.split('#');
  if (!pathPart) return null;
  const sourceDirectory = path.posix.dirname(toPosixPath(sourceRelativePath));
  const relativeTarget = path.posix.normalize(path.posix.join(sourceDirectory === '.' ? '' : sourceDirectory, pathPart));
  return resolveLinkTarget(relativeTarget, routeMap);
}

function resolveLinkTarget(rawTarget, routeMap) {
  const target = normalizeLinkTarget(rawTarget);
  if (!target) return null;

  const direct = routeMap.lookup.get(target);
  if (direct) return direct;

  for (const extension of MARKDOWN_EXTENSIONS) {
    const withExtension = routeMap.lookup.get(`${target}${extension}`);
    if (withExtension) return withExtension;
  }

  return null;
}

function extractMarkdownLinks(content) {
  const withoutCode = removeFencedCode(content);
  const links = [];
  const regex = /!?\[([^\]\n]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;
  while ((match = regex.exec(withoutCode))) {
    if (match[0].startsWith('!')) continue;
    links.push({
      kind: 'markdown',
      label: stripMarkdown(match[1]).trim(),
      target: match[2].trim()
    });
  }
  return links;
}

function extractWikiLinks(content) {
  const withoutCode = removeFencedCode(content);
  const links = [];
  const regex = /\[\[([^\]\n]+)\]\]/g;
  let match;
  while ((match = regex.exec(withoutCode))) {
    const [targetPart, labelPart] = match[1].split('|');
    links.push({
      kind: 'wiki',
      label: (labelPart || targetPart).trim(),
      target: targetPart.trim()
    });
  }
  return links;
}

function buildGraph(files) {
  const nodes = files.map((file) => ({
    id: file.url,
    label: file.title,
    title: file.title,
    relativePath: file.relativePath,
    url: file.url,
    incoming: file.backlinks.length,
    outgoing: file.outgoing.length
  }));

  const edgeKeys = new Set();
  const edges = [];
  for (const file of files) {
    for (const link of file.outgoing) {
      if (file.url === link.url) continue;
      const key = `${file.url}->${link.url}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({
        source: file.url,
        target: link.url,
        label: link.label || ''
      });
    }
  }

  return {
    nodes,
    edges,
    unresolvedLinks: []
  };
}

async function renderStaticSite(outputRoot, site) {
  await mkdir(outputRoot, { recursive: true });
  const writes = [
    ['index.html', buildIndexHtml(site)],
    ['assets/site.css', buildSiteCss(site)],
    ['assets/site.js', buildSiteJs()],
    ['assets/site-data.js', buildSiteDataJs(site)],
    ['assets/graph.json', JSON.stringify(site.graph, null, 2)]
  ];

  for (const file of site.files) {
    writes.push([file.url, buildNoteHtml(site, file)]);
  }

  for (const [relativePath, content] of writes) {
    await writePublishFile(outputRoot, relativePath, content);
  }

  return writes.length;
}

function buildIndexHtml(site) {
  const cards = site.files.map((file) => `<article class="note-card">
      <a href="${escapeAttribute(file.url)}">${escapeHtml(file.title)}</a>
      <p>${escapeHtml(file.excerpt || 'No preview text.')}</p>
      <small>${escapeHtml(file.relativePath)} - ${file.words} words</small>
    </article>`).join('');

  return buildShell(site, {
    title: site.title,
    currentUrl: 'index.html',
    body: `<section class="hero">
      <p class="kicker">Local static publish</p>
      <h1>${escapeHtml(site.title)}</h1>
      <p>${site.files.length} notes exported with backlinks, search data, and graph context.</p>
    </section>
    <section class="tool-panel" aria-labelledby="search-heading">
      <h2 id="search-heading">Search</h2>
      <label class="search-box">
        <span>Search notes</span>
        <input id="search-input" type="search" autocomplete="off" />
      </label>
      <div id="search-results" class="search-results"></div>
    </section>
    <section class="tool-panel" aria-labelledby="graph-heading">
      <div class="section-header">
        <h2 id="graph-heading">Graph</h2>
        <a href="assets/graph.json">graph.json</a>
      </div>
      <svg id="graph-canvas" class="graph-canvas" role="img" aria-label="Published vault graph"></svg>
    </section>
    <section class="notes-grid" aria-label="Published notes">${cards}</section>`
  });
}

function buildNoteHtml(site, file) {
  const backlinks = file.backlinks.length
    ? `<ul>${file.backlinks.map((link) => `<li><a href="${escapeAttribute(relativeUrl(file.url, link.url))}">${escapeHtml(link.title)}</a></li>`).join('')}</ul>`
    : '<p>No backlinks in this export.</p>';
  const outgoing = file.outgoing.length
    ? `<ul>${file.outgoing.map((link) => `<li><a href="${escapeAttribute(relativeUrl(file.url, link.url))}">${escapeHtml(link.title)}</a></li>`).join('')}</ul>`
    : '<p>No outgoing note links in this export.</p>';
  const tags = file.tags.length
    ? `<div class="tags">${file.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>`
    : '';

  return buildShell(site, {
    title: `${file.title} - ${site.title}`,
    currentUrl: file.url,
    body: `<nav class="breadcrumb"><a href="${escapeAttribute(relativeUrl(file.url, 'index.html'))}">${escapeHtml(site.title)}</a><span>${escapeHtml(file.relativePath)}</span></nav>
    <article class="markdown-body">${file.body}</article>
    ${tags}
    <aside class="link-panels" aria-label="Note relationships">
      <section>
        <h2>Backlinks</h2>
        ${backlinks}
      </section>
      <section>
        <h2>Outgoing</h2>
        ${outgoing}
      </section>
    </aside>`
  });
}

function buildShell(site, { title, currentUrl, body }) {
  const basePrefix = currentUrl.includes('/') ? '../' : '';
  return `<!doctype html>
<html lang="en" data-theme="${site.theme}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'none'; object-src 'none'; frame-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self' data:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="generator" content="Shibanshu Markdown Viewer" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${basePrefix}assets/site.css" />
</head>
<body>
  <header class="site-header">
    <a class="site-title" href="${basePrefix}index.html">${escapeHtml(site.title)}</a>
    <span>${site.files.length} notes</span>
  </header>
  <main class="site-main">${body}</main>
  <script src="${basePrefix}assets/site-data.js"></script>
  <script src="${basePrefix}assets/site.js"></script>
</body>
</html>`;
}

function buildSiteCss(site) {
  const dark = site.theme === 'dark';
  return `:root {
  color-scheme: ${dark ? 'dark' : 'light'};
  --bg: ${dark ? '#111316' : '#f7f7f4'};
  --surface: ${dark ? '#181b20' : '#ffffff'};
  --surface-strong: ${dark ? '#22262d' : '#f0f4f1'};
  --text: ${dark ? '#f2f4f0' : '#1d2520'};
  --muted: ${dark ? '#a8b0ab' : '#66716b'};
  --border: ${dark ? '#323841' : '#d9ded8'};
  --accent: ${dark ? '#7dd3a8' : '#236f55'};
  --accent-2: ${dark ? '#8ab4f8' : '#315e9f'};
  --code-bg: ${dark ? '#0d1014' : '#f2f3ef'};
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.58;
}
a {
  color: var(--accent-2);
}
.site-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 56px;
  padding: 0 24px;
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
}
.site-title {
  color: var(--text);
  font-weight: 700;
  text-decoration: none;
}
.site-header span,
.kicker,
.note-card small,
.breadcrumb span {
  color: var(--muted);
}
.site-main {
  width: min(1120px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 34px 0 64px;
}
.hero {
  padding: 22px 0 28px;
}
.hero h1 {
  max-width: 820px;
  margin: 4px 0 10px;
  font-size: clamp(2rem, 4vw, 4.5rem);
  line-height: 0.96;
  letter-spacing: 0;
}
.hero p {
  max-width: 720px;
  color: var(--muted);
  font-size: 1.05rem;
}
.tool-panel,
.note-card,
.link-panels section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.tool-panel {
  margin: 18px 0;
  padding: 18px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.search-box {
  display: grid;
  gap: 8px;
  color: var(--muted);
}
.search-box input {
  width: 100%;
  min-height: 42px;
  padding: 8px 12px;
  color: var(--text);
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: 6px;
  font: inherit;
}
.search-results {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}
.search-result {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  background: var(--surface-strong);
  border-radius: 6px;
}
.search-result p {
  margin: 0;
  color: var(--muted);
}
.graph-canvas {
  width: 100%;
  height: 380px;
  display: block;
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: 6px;
}
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 20px;
}
.note-card {
  display: grid;
  gap: 10px;
  padding: 16px;
}
.note-card a {
  color: var(--text);
  font-weight: 700;
  text-decoration: none;
}
.note-card p {
  margin: 0;
  color: var(--muted);
}
.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}
.markdown-body {
  max-width: 820px;
  padding-bottom: 28px;
}
.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
  line-height: 1.12;
}
.markdown-body img,
.markdown-body svg {
  max-width: 100%;
}
.markdown-body pre,
.markdown-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: var(--code-bg);
  border-radius: 6px;
}
.markdown-body code {
  padding: 0.15em 0.35em;
}
.markdown-body pre {
  overflow: auto;
  padding: 16px;
  border: 1px solid var(--border);
}
.markdown-body pre code {
  padding: 0;
  background: transparent;
}
.markdown-body blockquote {
  margin-left: 0;
  padding-left: 1rem;
  color: var(--muted);
  border-left: 0.25rem solid var(--border);
}
.markdown-body table {
  width: 100%;
  border-collapse: collapse;
}
.markdown-body th,
.markdown-body td {
  padding: 8px 10px;
  border: 1px solid var(--border);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0;
}
.tags span {
  padding: 4px 9px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border-radius: 999px;
}
.link-panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}
.link-panels section {
  padding: 14px;
}
@media (max-width: 720px) {
  .site-header {
    padding: 0 16px;
  }
  .site-main {
    width: min(100vw - 24px, 1120px);
    padding-top: 20px;
  }
  .graph-canvas {
    height: 280px;
  }
}`;
}

function buildSiteJs() {
  return `(() => {
  const data = window.SHIBANSHU_PUBLISH_DATA || { files: [], graph: { nodes: [], edges: [] } };
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const graphCanvas = document.getElementById('graph-canvas');

  if (searchInput && searchResults) {
    const renderSearch = () => {
      const query = searchInput.value.trim().toLowerCase();
      searchResults.innerHTML = '';
      if (!query) return;
      const terms = query.split(/\\s+/).filter(Boolean);
      const matches = data.files
        .map((file) => {
          const haystack = [file.title, file.relativePath, file.text, ...(file.tags || [])].join(' ').toLowerCase();
          const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
          return { file, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.file.title.localeCompare(b.file.title))
        .slice(0, 20);
      for (const item of matches) {
        const result = document.createElement('article');
        result.className = 'search-result';
        const title = document.createElement('a');
        title.href = item.file.url;
        title.textContent = item.file.title;
        const excerpt = document.createElement('p');
        excerpt.textContent = item.file.excerpt || item.file.relativePath;
        result.append(title, excerpt);
        searchResults.append(result);
      }
    };
    searchInput.addEventListener('input', renderSearch);
  }

  if (graphCanvas) {
    renderGraph(graphCanvas, data.graph || { nodes: [], edges: [] });
  }

  function renderGraph(svg, graph) {
    const nodes = (graph.nodes || []).slice(0, 160);
    const nodeSet = new Set(nodes.map((node) => node.id));
    const edges = (graph.edges || []).filter((edge) => nodeSet.has(edge.source) && nodeSet.has(edge.target)).slice(0, 360);
    const width = svg.clientWidth || 900;
    const height = svg.clientHeight || 360;
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.innerHTML = '';
    if (!nodes.length) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38;
    const positions = new Map();
    nodes.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / nodes.length;
      const weight = Math.min(18, 5 + (node.incoming || 0) + (node.outgoing || 0));
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius * (0.72 + (index % 5) * 0.06),
        y: centerY + Math.sin(angle) * radius * (0.72 + (index % 7) * 0.04),
        weight
      });
    });

    for (const edge of edges) {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) continue;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', source.x);
      line.setAttribute('y1', source.y);
      line.setAttribute('x2', target.x);
      line.setAttribute('y2', target.y);
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-opacity', '0.2');
      svg.append(line);
    }

    for (const node of nodes) {
      const position = positions.get(node.id);
      const link = document.createElementNS('http://www.w3.org/2000/svg', 'a');
      link.setAttribute('href', node.url);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', position.x);
      circle.setAttribute('cy', position.y);
      circle.setAttribute('r', position.weight);
      circle.setAttribute('fill', 'currentColor');
      circle.setAttribute('opacity', position.weight > 9 ? '0.95' : '0.48');
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = node.title || node.label || node.relativePath;
      link.append(circle, title);
      svg.append(link);
    }
  }
})();`;
}

function buildSiteDataJs(site) {
  const data = {
    version: site.version,
    title: site.title,
    generatedAt: site.generatedAt,
    files: site.files.map((file) => ({
      title: file.title,
      relativePath: file.relativePath,
      url: file.url,
      excerpt: file.excerpt,
      text: file.text,
      words: file.words,
      headings: file.headings,
      tags: file.tags,
      outgoing: file.outgoing,
      backlinks: file.backlinks
    })),
    graph: site.graph
  };
  return `window.SHIBANSHU_PUBLISH_DATA = ${JSON.stringify(data)};\n`;
}

async function writePublishFile(outputRoot, relativePath, content) {
  const filePath = resolveOutputPath(outputRoot, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await atomicWriteFile(filePath, content);
}

function resolveOutputPath(outputRoot, relativePath) {
  const normalizedRoot = normalizeFilePath(outputRoot);
  const relative = String(relativePath || '').replaceAll('\\', '/').trim();
  if (!relative || relative.startsWith('/') || /^[a-z]:/i.test(relative)) {
    throw new Error('Invalid static publish output path.');
  }

  const normalizedRelative = path.posix.normalize(relative);
  if (
    normalizedRelative === '.' ||
    normalizedRelative.startsWith('../') ||
    normalizedRelative.includes('/../') ||
    normalizedRelative.endsWith('/..')
  ) {
    throw new Error('Static publish output cannot escape the selected folder.');
  }

  const target = path.join(normalizedRoot, ...normalizedRelative.split('/'));
  const relativeFromRoot = path.relative(normalizedRoot, target);
  if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
    throw new Error('Static publish output cannot escape the selected folder.');
  }
  return target;
}

async function atomicWriteFile(filePath, content) {
  const directory = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const tempPath = path.join(directory, `.${baseName}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`);
  await writeFile(tempPath, content, 'utf8');
  await rename(tempPath, filePath);
}

function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\s(?:href|src)\s*=\s*"javascript:[^"]*"/gi, '')
    .replace(/\s(?:href|src)\s*=\s*'javascript:[^']*'/gi, '');
}

function extractHeadings(content) {
  const headings = [];
  const regex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(removeFencedCode(content))) && headings.length < 80) {
    headings.push({
      level: match[1].length,
      text: stripMarkdown(match[2]).trim().slice(0, 180)
    });
  }
  return headings.filter((heading) => heading.text);
}

function extractTags(content) {
  const tags = new Set();
  const regex = /(^|[\s([{])#([A-Za-z0-9][A-Za-z0-9/_-]{1,80})\b/g;
  let match;
  while ((match = regex.exec(removeFencedCode(content))) && tags.size < 80) {
    tags.add(`#${match[2]}`);
  }
  return [...tags];
}

function inferTitle(content, relativePath) {
  const heading = /^(?:#)\s+(.+)$/m.exec(removeFencedCode(content));
  if (heading?.[1]) return stripMarkdown(heading[1]).trim().slice(0, 180);
  return inferTitleFromPath(relativePath);
}

function inferTitleFromPath(relativePath) {
  const basename = path.posix.basename(String(relativePath || '').replace(/\.[^.]+$/, ''));
  return basename
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Untitled';
}

function stripMarkdown(content) {
  return String(content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createExcerpt(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > 220 ? `${clean.slice(0, 217).trim()}...` : clean;
}

function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function normalizeLinkTarget(value) {
  const withoutHash = String(value || '').split('#')[0].trim();
  if (!withoutHash || /^[a-z][a-z0-9+.-]*:/i.test(withoutHash) || withoutHash.startsWith('//')) return '';
  return path.posix.normalize(toPosixPath(withoutHash)).replace(/^\.\//, '');
}

function normalizeLineEndings(content) {
  return String(content || '').replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
}

function normalizePublishText(value, maxLength) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function removeFencedCode(content) {
  return String(content || '').replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '');
}

function shouldSkipDirectory(name) {
  return IGNORED_DIRECTORIES.has(name) || name.startsWith('.');
}

function slugify(value) {
  return String(value || '')
    .replaceAll('\\', '/')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9/._-]+/g, '-')
    .replace(/[._]+/g, '-')
    .replace(/\/+/g, '/')
    .split('/')
    .map((part) => part.replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('/');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/[\r\n\t]/g, ' ');
}

function decodeHtmlAttribute(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function escapeMarkdownText(value) {
  return String(value || '').replace(/([\\[\]])/g, '\\$1');
}

function toPosixPath(value) {
  return String(value || '').replaceAll(path.sep, '/').replaceAll('\\', '/');
}

function relativeUrl(fromUrl, toUrl) {
  const fromDirectory = path.posix.dirname(String(fromUrl || 'index.html'));
  const baseDirectory = fromDirectory === '.' ? '' : fromDirectory;
  const relative = path.posix.relative(baseDirectory, String(toUrl || 'index.html'));
  return relative || path.posix.basename(String(toUrl || 'index.html'));
}

function normalizeFilePath(value) {
  return path.resolve(String(value || ''));
}

function samePath(left, right) {
  return normalizeFilePath(left) === normalizeFilePath(right);
}

function parsePositiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.floor(number);
}

function parseFlags(commandArgs) {
  const flags = {};
  const positionals = [];

  for (let index = 0; index < commandArgs.length; index += 1) {
    const arg = commandArgs[index];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }

    const raw = arg.slice(2);
    const [rawKey, inlineValue] = raw.split(/=(.*)/s).filter((part) => part !== undefined);
    const next = commandArgs[index + 1];
    const value = inlineValue !== undefined ? inlineValue : next && !next.startsWith('--') ? next : true;
    if (inlineValue === undefined && value === next) index += 1;

    flags[rawKey] = value;
    flags[toCamelFlag(rawKey)] = value;
  }

  return { flags, positionals };
}

function toCamelFlag(value) {
  return String(value || '').replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}
