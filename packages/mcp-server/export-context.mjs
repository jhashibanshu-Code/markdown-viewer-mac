import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd', '.mdx', '.txt', '.canvas']);
const CODE_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.mjs',
  '.py',
  '.rb',
  '.rs',
  '.sh',
  '.sql',
  '.swift',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml'
]);
const IGNORED_DIRECTORIES = new Set([
  '.athena',
  '.cache',
  '.git',
  '.hg',
  '.next',
  '.nuxt',
  '.output',
  '.parcel-cache',
  '.shibanshu',
  '.svn',
  '.venv',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'release',
  'target',
  'vendor'
]);
const IGNORED_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml'
]);
const DEFAULT_MAX_FILES = 20000;
const DEFAULT_MAX_BYTES = 750 * 1024;
const DEFAULT_MAX_DEPTH = 24;
const DEFAULT_OUTPUT_DIR = '.athena';
const DEFAULT_CHUNK_TOKENS = 900;
const MAX_CHUNKS = 20000;
const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','can','could',
  'and','but','or','nor','not','no','so','if','then','else','when','where','how',
  'what','which','who','whom','this','that','these','those','it','its','my','your',
  'his','her','our','their','me','him','us','them','we','they','you','she','he',
  'in','on','at','to','for','of','with','by','from','up','about','into','through',
  'during','before','after','above','below','between','under','over','out','off',
  'than','too','very','just','also','only','own','same','each','every','all','any',
  'few','more','most','other','some','such','many','much','new','old','first','last',
  'long','great','little','right','still','get','got','set','use','used','using',
  'return','returns','const','let','var','function','class','import','export','from',
  'require','module','default','async','await','true','false','null','undefined',
  'string','number','boolean','object','array','type','interface','enum','void',
  'public','private','protected','static','readonly','abstract','extends','implements',
  'try','catch','throw','finally','switch','case','break','continue','while','for',
  'else','elif','def','self','none','pass','yield','lambda','print','console','log',
  'error','warn','info','debug','test','describe','expect','assert','should',
  'todo','fixme','hack','note','param','returns','example','see','since','version'
]);
const DEFAULT_SCENE_NODE_LIMIT = 280;
const DEFAULT_SCENE_EDGE_LIMIT = 540;
const DEFAULT_SCENE_PERSPECTIVE = 900;
const SCENE_LAYOUT_WIDTH = 1160;
const SCENE_LAYOUT_HEIGHT = 760;
const SCENE_ROTATION = { x: -18, y: -34, z: 0 };
const CONTEXT_SCHEMA_VERSION = 'shibanshu.context.v1';
const CONTEXT_EXPORTER_VERSION = '0.2.0';
const DEFAULT_CONTEXT_PROFILE = 'analysis';
const CONTEXT_PROFILES = {
  analysis: {
    label: 'Analysis',
    maxFiles: DEFAULT_MAX_FILES,
    maxBytes: DEFAULT_MAX_BYTES,
    maxDepth: DEFAULT_MAX_DEPTH,
    chunkTokens: DEFAULT_CHUNK_TOKENS,
    sceneNodeLimit: DEFAULT_SCENE_NODE_LIMIT,
    sceneEdgeLimit: DEFAULT_SCENE_EDGE_LIMIT,
    scenePerspective: DEFAULT_SCENE_PERSPECTIVE,
    includeCode: true
  },
  audit: {
    label: 'Audit',
    maxFiles: 7000,
    maxBytes: 1024 * 1024,
    maxDepth: 30,
    chunkTokens: 850,
    sceneNodeLimit: 360,
    sceneEdgeLimit: 760,
    scenePerspective: DEFAULT_SCENE_PERSPECTIVE,
    includeCode: true
  },
  authoring: {
    label: 'Authoring',
    maxFiles: 3500,
    maxBytes: 650 * 1024,
    maxDepth: DEFAULT_MAX_DEPTH,
    chunkTokens: 700,
    sceneNodeLimit: 240,
    sceneEdgeLimit: 480,
    scenePerspective: DEFAULT_SCENE_PERSPECTIVE,
    includeCode: true
  },
  presentation: {
    label: 'Presentation',
    maxFiles: 2500,
    maxBytes: 520 * 1024,
    maxDepth: 20,
    chunkTokens: 650,
    sceneNodeLimit: 180,
    sceneEdgeLimit: 360,
    scenePerspective: 960,
    includeCode: true
  },
  migration: {
    label: 'Migration',
    maxFiles: 8000,
    maxBytes: 900 * 1024,
    maxDepth: 32,
    chunkTokens: 780,
    sceneNodeLimit: 340,
    sceneEdgeLimit: 720,
    scenePerspective: DEFAULT_SCENE_PERSPECTIVE,
    includeCode: true
  }
};

const MEDIA_LINK_EXTENSION_PATTERN = /\.(avif|bmp|gif|heic|jpeg|jpg|m4a|mov|mp3|mp4|ogg|opus|pdf|png|svg|wav|webm|webp)(?:[?#].*)?$/i;

const options = parseArgs(process.argv.slice(2));

if (options.help || !options.rootPath) {
  printUsage();
  process.exit(options.help ? 0 : 1);
}

const rootPath = path.resolve(options.rootPath);
const outputDir = path.resolve(options.outputDir || path.join(rootPath, DEFAULT_OUTPUT_DIR));
const files = await discoverFiles(rootPath, options);
const documents = await readDocuments(rootPath, files, options.maxBytes);
enrichDocumentSummaries(documents);
computeTfIdfTopics(documents);
const graph = buildGraph(documents);
const analysis = analyzeRepositoryContext(documents, graph);
options.generatedAt = new Date().toISOString();
options.exportFingerprint = buildContextExportFingerprint(rootPath, documents, graph, analysis, options);
const routeValidation = validateNavigationRoutes(analysis.routes, documents);
const markdown = renderClaudeContextMap(rootPath, documents, graph, options, analysis);
const mindMapMarkdown = renderClaudeMindMap(rootPath, documents, graph, options, analysis);
const navigationMarkdown = renderClaudeNavigationGuide(rootPath, documents, graph, options, analysis);
const contextChunks = renderContextChunks(documents, options);
const contradictionsMarkdown = renderContradictionsReport(rootPath, documents, graph, options, analysis);
const stalenessMarkdown = renderStalenessReport(rootPath, documents, graph, options, analysis);
const semanticWarningsMarkdown = renderSemanticWarningsReport(rootPath, documents, graph, options, analysis);
const authorityMarkdown = renderAuthorityGraphReport(rootPath, documents, graph, options, analysis);
const repoHealthMarkdown = renderRepoHealthReport(rootPath, documents, graph, options, analysis);
const duplicatesMarkdown = renderDuplicateReport(rootPath, documents, graph, options, analysis);

await mkdir(outputDir, { recursive: true });
const markdownPath = path.join(outputDir, 'claude-context-map.md');
const mindMapPath = path.join(outputDir, 'claude-context-mind-map.md');
const navigationPath = path.join(outputDir, 'claude-context-navigation.md');
const graphPath = path.join(outputDir, 'claude-context-graph.json');
const chunksPath = path.join(outputDir, 'llm-context-chunks.jsonl');
const scenePath = path.join(outputDir, 'claude-context-scene.json');
const integrityPath = path.join(outputDir, 'context-integrity.json');
const contradictionsPath = path.join(outputDir, 'contradictions.md');
const stalenessPath = path.join(outputDir, 'staleness-report.md');
const semanticWarningsPath = path.join(outputDir, 'semantic-warnings.md');
const authorityPath = path.join(outputDir, 'authority-graph.md');
const repoHealthPath = path.join(outputDir, 'repo-health.md');
const duplicatesPath = path.join(outputDir, 'duplicates.md');

await writeFile(markdownPath, markdown, 'utf8');
await writeFile(mindMapPath, mindMapMarkdown, 'utf8');
await writeFile(navigationPath, navigationMarkdown, 'utf8');
await writeFile(chunksPath, contextChunks, 'utf8');
await writeFile(contradictionsPath, contradictionsMarkdown, 'utf8');
await writeFile(stalenessPath, stalenessMarkdown, 'utf8');
await writeFile(semanticWarningsPath, semanticWarningsMarkdown, 'utf8');
await writeFile(authorityPath, authorityMarkdown, 'utf8');
await writeFile(repoHealthPath, repoHealthMarkdown, 'utf8');
await writeFile(duplicatesPath, duplicatesMarkdown, 'utf8');
const graphPayload = buildClaudeContextGraphPayload(rootPath, documents, graph, analysis, contextChunks, options, routeValidation);
const graphJson = `${JSON.stringify(graphPayload, null, 2)}\n`;
await writeFile(graphPath, graphJson, 'utf8');

const scenePayload = buildScenePayload(rootPath, documents, graph, analysis, graphPayload, {
  nodeLimit: options.sceneNodeLimit,
  edgeLimit: options.sceneEdgeLimit,
  perspective: options.scenePerspective,
  profile: options.profile,
  profileLabel: options.profileLabel,
  exportFingerprint: options.exportFingerprint
});
const sceneJson = `${JSON.stringify(scenePayload, null, 2)}\n`;
await writeFile(scenePath, sceneJson, 'utf8');
const integrityPayload = buildContextIntegrityPayload(rootPath, options, documents, graph, analysis, routeValidation, [
  { key: 'contextMap', file: 'claude-context-map.md', content: markdown },
  { key: 'mindMap', file: 'claude-context-mind-map.md', content: mindMapMarkdown },
  { key: 'navigation', file: 'claude-context-navigation.md', content: navigationMarkdown },
  { key: 'chunks', file: 'llm-context-chunks.jsonl', content: contextChunks },
  { key: 'graph', file: 'claude-context-graph.json', content: graphJson },
  { key: 'scene', file: 'claude-context-scene.json', content: sceneJson },
  { key: 'contradictions', file: 'contradictions.md', content: contradictionsMarkdown },
  { key: 'staleness', file: 'staleness-report.md', content: stalenessMarkdown },
  { key: 'semanticWarnings', file: 'semantic-warnings.md', content: semanticWarningsMarkdown },
  { key: 'authority', file: 'authority-graph.md', content: authorityMarkdown },
  { key: 'repoHealth', file: 'repo-health.md', content: repoHealthMarkdown },
  { key: 'duplicates', file: 'duplicates.md', content: duplicatesMarkdown }
]);
await writeFile(integrityPath, `${JSON.stringify(integrityPayload, null, 2)}\n`, 'utf8');

console.log(`Claude context map written: ${markdownPath}`);
console.log(`Claude mind map written: ${mindMapPath}`);
console.log(`Claude navigation guide written: ${navigationPath}`);
console.log(`LLM context chunks written: ${chunksPath}`);
console.log(`Contradictions report written: ${contradictionsPath}`);
console.log(`Staleness report written: ${stalenessPath}`);
console.log(`Semantic warnings written: ${semanticWarningsPath}`);
console.log(`Authority graph written: ${authorityPath}`);
console.log(`Repo health report written: ${repoHealthPath}`);
console.log(`Duplicate report written: ${duplicatesPath}`);
console.log(`3D scene graph written: ${scenePath}`);
console.log(`Graph JSON written: ${graphPath}`);
console.log(`Context integrity written: ${integrityPath}`);
if (options.discoverySummary) {
  console.log(renderDiscoverySummaryLine(options));
}
console.log(
  `${documents.length} files indexed, ${graph.edges.length} resolved links, ${graph.unresolvedLinks.length} unresolved links. Profile: ${options.profile}. Fingerprint: ${options.exportFingerprint}.`
);

function parseArgs(args) {
  const parsed = {
    rootPath: null,
    outputDir: null,
    profile: DEFAULT_CONTEXT_PROFILE,
    maxFiles: null,
    maxBytes: null,
    maxDepth: null,
    chunkTokens: null,
    sceneNodeLimit: null,
    sceneEdgeLimit: null,
    scenePerspective: null,
    includeCode: true,
    help: false,
    explicit: new Set()
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--profile') {
      parsed.profile = args[index + 1] || DEFAULT_CONTEXT_PROFILE;
      parsed.explicit.add('profile');
      index += 1;
      continue;
    }
    if (arg === '--out') {
      parsed.outputDir = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--max-files') {
      parsed.maxFiles = Number(args[index + 1]) || DEFAULT_MAX_FILES;
      parsed.explicit.add('maxFiles');
      index += 1;
      continue;
    }
    if (arg === '--max-bytes') {
      parsed.maxBytes = Number(args[index + 1]) || DEFAULT_MAX_BYTES;
      parsed.explicit.add('maxBytes');
      index += 1;
      continue;
    }
    if (arg === '--max-depth') {
      parsed.maxDepth = Number(args[index + 1]) || DEFAULT_MAX_DEPTH;
      parsed.explicit.add('maxDepth');
      index += 1;
      continue;
    }
    if (arg === '--chunk-tokens') {
      parsed.chunkTokens = Math.max(200, Number(args[index + 1]) || DEFAULT_CHUNK_TOKENS);
      parsed.explicit.add('chunkTokens');
      index += 1;
      continue;
    }
    if (arg === '--scene-node-limit') {
      parsed.sceneNodeLimit = Math.max(24, Number(args[index + 1]) || DEFAULT_SCENE_NODE_LIMIT);
      parsed.explicit.add('sceneNodeLimit');
      index += 1;
      continue;
    }
    if (arg === '--scene-edge-limit') {
      parsed.sceneEdgeLimit = Math.max(24, Number(args[index + 1]) || DEFAULT_SCENE_EDGE_LIMIT);
      parsed.explicit.add('sceneEdgeLimit');
      index += 1;
      continue;
    }
    if (arg === '--scene-perspective') {
      parsed.scenePerspective = Math.max(240, Number(args[index + 1]) || DEFAULT_SCENE_PERSPECTIVE);
      parsed.explicit.add('scenePerspective');
      index += 1;
      continue;
    }
    if (arg === '--markdown-only') {
      parsed.includeCode = false;
      parsed.explicit.add('includeCode');
      continue;
    }
    if (!parsed.rootPath) {
      parsed.rootPath = arg;
    }
  }

  return normalizeContextOptions(parsed);
}

function normalizeContextOptions(parsed) {
  const profileName = String(parsed.profile || DEFAULT_CONTEXT_PROFILE).trim().toLowerCase();
  const profile = CONTEXT_PROFILES[profileName];
  if (!profile) {
    throw new Error(`Unknown context profile: ${parsed.profile}. Use one of: ${Object.keys(CONTEXT_PROFILES).join(', ')}.`);
  }

  const explicit = parsed.explicit || new Set();
  return {
    rootPath: parsed.rootPath,
    outputDir: parsed.outputDir,
    profile: profileName,
    profileLabel: profile.label,
    maxFiles: explicit.has('maxFiles') ? parsed.maxFiles : profile.maxFiles,
    maxBytes: explicit.has('maxBytes') ? parsed.maxBytes : profile.maxBytes,
    maxDepth: explicit.has('maxDepth') ? parsed.maxDepth : profile.maxDepth,
    chunkTokens: explicit.has('chunkTokens') ? parsed.chunkTokens : profile.chunkTokens,
    sceneNodeLimit: explicit.has('sceneNodeLimit') ? parsed.sceneNodeLimit : profile.sceneNodeLimit,
    sceneEdgeLimit: explicit.has('sceneEdgeLimit') ? parsed.sceneEdgeLimit : profile.sceneEdgeLimit,
    scenePerspective: explicit.has('scenePerspective') ? parsed.scenePerspective : profile.scenePerspective,
    includeCode: explicit.has('includeCode') ? parsed.includeCode : profile.includeCode,
    help: parsed.help
  };
}

function printUsage() {
  console.log(`Usage: npm run context:claude -- <folder> [options]

Options:
  --profile <name>        Context profile: ${Object.keys(CONTEXT_PROFILES).join(', ')}. Default: ${DEFAULT_CONTEXT_PROFILE}
  --out <folder>          Output folder. Default: <folder>/.athena
  --max-files <number>    Maximum files to index. Overrides selected profile.
  --max-bytes <number>    Skip files larger than this many bytes. Overrides selected profile.
  --max-depth <number>    Maximum folder depth. Overrides selected profile.
  --chunk-tokens <number>  Approximate target tokens per JSONL chunk. Overrides selected profile.
  --scene-node-limit <n>   Maximum nodes in 3D scene export. Overrides selected profile.
  --scene-edge-limit <n>   Maximum edges in 3D scene export. Overrides selected profile.
  --scene-perspective <n>  3D projection perspective. Overrides selected profile.
  --markdown-only         Index only Markdown/text files
`);
}

async function readIgnoreRules(root) {
  const rules = [
    { pattern: '.athena/', source: 'default', negated: false, directoryOnly: true },
    { pattern: '.shibanshu/', source: 'default', negated: false, directoryOnly: true }
  ];

  for (const fileName of ['.gitignore', '.athenaignore']) {
    const ignorePath = path.join(root, fileName);
    let content = '';
    try {
      content = await readFile(ignorePath, 'utf8');
    } catch (_error) {
      continue;
    }

    const source = fileName;
    for (const rawLine of content.split(/\r?\n/)) {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const negated = trimmed.startsWith('!');
      const body = negated ? trimmed.slice(1).trim() : trimmed;
      if (!body || body === '/') continue;
      rules.push({
        pattern: body,
        source,
        negated,
        directoryOnly: body.endsWith('/')
      });
    }
  }

  return rules;
}

function createDiscoverySummary() {
  return {
    scannedEntries: 0,
    candidateFiles: 0,
    indexedFiles: 0,
    skippedHidden: 0,
    skippedByDirectory: {},
    skippedByIgnore: {},
    skippedByExtension: 0,
    skippedByDepth: 0,
    skippedByLimit: 0,
    ignoreFiles: ['.gitignore', '.athenaignore']
  };
}

function incrementCounter(record, key, amount = 1) {
  record[key] = (record[key] || 0) + amount;
}

function shouldIgnoreByRules(relativePath, isDirectory, rules) {
  const normalized = String(relativePath || '').replaceAll('\\', '/').replace(/\/+$/, '');
  const basename = path.posix.basename(normalized);
  let ignored = false;
  let source = null;
  let pattern = null;

  for (const rule of rules) {
    if (rule.directoryOnly && !isDirectory) continue;
    if (!ignoreRuleMatches(rule.pattern, normalized, basename, isDirectory)) continue;
    ignored = !rule.negated;
    source = rule.source;
    pattern = rule.pattern;
  }

  return { ignored, source, pattern };
}

function ignoreRuleMatches(pattern, relativePath, basename, isDirectory) {
  let value = String(pattern || '').trim();
  if (!value) return false;
  if (value.endsWith('/')) value = value.slice(0, -1);
  value = value.replaceAll('\\', '/');

  if (value.startsWith('/')) {
    const anchored = value.slice(1);
    return matchIgnorePattern(anchored, relativePath) || (isDirectory && relativePath.startsWith(`${anchored}/`));
  }

  if (!value.includes('/')) {
    if (matchIgnorePattern(value, basename)) return true;
    return relativePath.split('/').some((segment) => matchIgnorePattern(value, segment));
  }

  return matchIgnorePattern(value, relativePath) || (isDirectory && relativePath.startsWith(`${value}/`));
}

function matchIgnorePattern(pattern, value) {
  const escaped = String(pattern)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`).test(value);
}

async function discoverFiles(root, config) {
  const discovered = [];
  const ignoreRules = await readIgnoreRules(root);
  const summary = createDiscoverySummary();
  config.discoverySummary = summary;

  async function walk(directory, depth) {
    if (discovered.length >= config.maxFiles) {
      summary.skippedByLimit += 1;
      return;
    }
    if (depth > config.maxDepth) {
      summary.skippedByDepth += 1;
      return;
    }

    let entries = [];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (_error) {
      return;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      summary.scannedEntries += 1;
      if (discovered.length >= config.maxFiles) {
        summary.skippedByLimit += 1;
        break;
      }

      const entryPath = path.join(directory, entry.name);
      const relativePath = path.relative(root, entryPath).replaceAll(path.sep, '/');
      const ignoreMatch = shouldIgnoreByRules(relativePath, entry.isDirectory(), ignoreRules);
      if (ignoreMatch.ignored) {
        incrementCounter(summary.skippedByIgnore, `${ignoreMatch.source}:${ignoreMatch.pattern}`);
        continue;
      }

      if (entry.name.startsWith('.') && entry.name !== '.github') {
        summary.skippedHidden += 1;
        continue;
      }

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          incrementCounter(summary.skippedByDirectory, entry.name);
          continue;
        }
        await walk(entryPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;
      summary.candidateFiles += 1;
      if (IGNORED_FILES.has(entry.name)) {
        incrementCounter(summary.skippedByDirectory, entry.name);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!MARKDOWN_EXTENSIONS.has(ext) && !(config.includeCode && CODE_EXTENSIONS.has(ext))) {
        summary.skippedByExtension += 1;
        continue;
      }
      discovered.push(entryPath);
      summary.indexedFiles = discovered.length;
    }
  }

  const rootStats = await stat(root);
  if (!rootStats.isDirectory()) {
    throw new Error(`Expected a folder: ${root}`);
  }

  await walk(root, 0);
  summary.indexedFiles = discovered.length;
  return discovered;
}

async function readDocuments(root, filePaths, maxBytes) {
  const documents = [];

  for (const filePath of filePaths) {
    try {
      const fileStats = await stat(filePath);
      if (fileStats.size > maxBytes) continue;

      const content = await readFile(filePath, 'utf8');
      const ext = path.extname(filePath).toLowerCase();
      const relativePath = path.relative(root, filePath).replaceAll(path.sep, '/');
      const type = MARKDOWN_EXTENSIONS.has(ext) ? 'markdown' : 'code';
      const frontmatter = type === 'markdown' ? extractFrontmatterMetadata(content) : { aliases: [], tags: [] };
      const symbols = extractDocumentSymbols(content, ext, type);
      documents.push({
        absolutePath: filePath,
        relativePath,
        title: path.basename(filePath),
        type,
        extension: ext,
        content,
        contentHash: sha256String(content).slice(0, 24),
        size: fileStats.size,
        modified: fileStats.mtime.toISOString(),
        words: countWords(content),
        lines: content.split(/\r?\n/).length,
        headings: extractHeadings(content),
        tags: type === 'markdown' ? mergeUnique([...extractTags(content), ...frontmatter.tags]) : [],
        aliases: frontmatter.aliases,
        links: type === 'markdown' ? extractDocumentLinks(relativePath, content, ext) : [],
        canvasEdges: ext === '.canvas' ? extractJsonCanvasConnectionEdges(content) : [],
        imports: type === 'code' ? extractCodeImports(content, relativePath, ext) : [],
        symbols,
        calls: type === 'code' ? extractCodeCalls(content, ext) : [],
        numericClaims: extractNumericClaims(content, relativePath, type, ext),
        secretFindings: scanDocumentSecrets(content, relativePath)
      });
    } catch (_error) {
      // Skip unreadable files. This exporter is for mapping, not failing the whole run on one path.
    }
  }

  return documents.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function buildGraph(documents) {
  const nodes = documents;
  const keyToDocument = new Map();
  const symbolOwners = new Map();
  const edges = [];
  const edgeKeys = new Set();
  const unresolvedLinks = [];

  for (const doc of documents) {
    for (const key of getDocumentKeys(doc)) {
      if (!keyToDocument.has(key)) keyToDocument.set(key, doc);
    }
    for (const symbol of doc.symbols || []) {
      if (!['function', 'class', 'variable', 'type'].includes(symbol.kind)) continue;
      const key = String(symbol.name || '').toLowerCase();
      if (!key) continue;
      if (!symbolOwners.has(key)) symbolOwners.set(key, []);
      symbolOwners.get(key).push({ doc, symbol });
    }
  }

  for (const source of documents) {
    for (const link of source.links) {
      const target = resolveLinkDocument(link.target, source, keyToDocument);
      if (!target) {
        unresolvedLinks.push({
          source,
          kind: link.kind,
          target: link.target,
          text: link.text || link.target,
          line: link.line,
          specifier: link.target
        });
        continue;
      }
      if (source.relativePath === target.relativePath) continue;

      const edgeKey = `${source.relativePath}->${target.relativePath}:${link.kind}:${link.target}`;
      if (edgeKeys.has(edgeKey)) continue;
      edgeKeys.add(edgeKey);
      edges.push({
        source,
        target,
        kind: link.kind,
        text: link.text || link.target,
        line: link.line,
        specifier: link.target
      });
    }

    for (const canvasEdge of source.canvasEdges || []) {
      const canvasSource = resolveLinkDocument(canvasEdge.sourceTarget, source, keyToDocument);
      const canvasTarget = resolveLinkDocument(canvasEdge.targetTarget, source, keyToDocument);
      if (!canvasSource || !canvasTarget) {
        unresolvedLinks.push({
          source,
          kind: 'canvas-edge',
          target: !canvasSource ? canvasEdge.sourceTarget : canvasEdge.targetTarget,
          text: canvasEdge.text,
          line: canvasEdge.line,
          specifier: !canvasSource ? canvasEdge.sourceTarget : canvasEdge.targetTarget
        });
        continue;
      }
      if (canvasSource.relativePath === canvasTarget.relativePath) continue;

      const edgeKey = `${canvasSource.relativePath}->${canvasTarget.relativePath}:canvas-edge:${canvasEdge.text}`;
      if (edgeKeys.has(edgeKey)) continue;
      edgeKeys.add(edgeKey);
      edges.push({
        source: canvasSource,
        target: canvasTarget,
        kind: 'canvas-edge',
        text: canvasEdge.text,
        line: canvasEdge.line,
        specifier: source.relativePath
      });
    }

    for (const codeImport of source.imports) {
      const target = resolveImportDocument(codeImport.specifier, source, keyToDocument);
      const kind = isTestFile(source.relativePath) ? 'test-coverage' : 'import';
      if (!target) {
        if (isLocalImportSpecifier(codeImport.specifier)) {
          unresolvedLinks.push({
            source,
            kind,
            target: codeImport.specifier,
            text: codeImport.imported || codeImport.specifier,
            line: codeImport.line,
            specifier: codeImport.specifier
          });
        }
        continue;
      }
      if (source.relativePath === target.relativePath) continue;

      const edgeKey = `${source.relativePath}->${target.relativePath}:${kind}:${codeImport.specifier}`;
      if (edgeKeys.has(edgeKey)) continue;
      edgeKeys.add(edgeKey);
      edges.push({
        source,
        target,
        kind,
        text: codeImport.imported || codeImport.specifier,
        line: codeImport.line,
        specifier: codeImport.specifier
      });
    }

    for (const call of source.calls || []) {
      const owners = symbolOwners.get(String(call.name || '').toLowerCase()) || [];
      for (const owner of owners.slice(0, 8)) {
        const target = owner.doc;
        if (!target || source.relativePath === target.relativePath) continue;
        const edgeKey = `${source.relativePath}->${target.relativePath}:call:${call.name}:${call.line}`;
        if (edgeKeys.has(edgeKey)) continue;
        edgeKeys.add(edgeKey);
        edges.push({
          source,
          target,
          kind: 'call',
          text: call.name,
          line: call.line,
          specifier: call.name,
          targetSymbol: owner.symbol
        });
      }
    }
  }

  return {
    nodes,
    edges,
    unresolvedLinks
  };
}

function analyzeRepositoryContext(documents, graph) {
  const metrics = getDocumentGraphMetrics(documents, graph);
  const clusters = buildFolderClusters(documents, graph, metrics);
  const hubs = getTopLinkedDocuments(documents, graph, metrics);
  const bridges = getBridgeDocuments(documents, graph, metrics, clusters);
  const edgeKinds = getEdgeKindCounts(graph);
  const symbolDocuments = documents
    .filter((doc) => doc.symbols.length)
    .sort((left, right) => right.symbols.length - left.symbols.length || left.relativePath.localeCompare(right.relativePath));
  const orphans = documents
    .filter((doc) => (metrics.get(doc.relativePath)?.degree || 0) === 0)
    .sort((left, right) => right.words - left.words || left.relativePath.localeCompare(right.relativePath));
  const unresolvedBySource = getUnresolvedBySource(graph);

  const analysis = {
    metrics,
    clusters,
    hubs,
    bridges,
    edgeKinds,
    symbolDocuments,
    orphans,
    unresolvedBySource
  };

  enrichRepositoryIntelligence(documents, graph, analysis);
  analysis.routes = buildNavigationRoutes(documents, graph, analysis);
  return analysis;
}

function enrichRepositoryIntelligence(documents, graph, analysis) {
  analysis.nearDuplicates = detectNearDuplicateDocuments(documents, analysis);
  analysis.contradictions = detectContradictions(documents);
  analysis.secretFindings = documents.flatMap((doc) => doc.secretFindings || []);
  analysis.authority = buildAuthorityGraph(documents, graph, analysis);
  applyTrustScores(documents, graph, analysis);
  analysis.staleness = documents
    .map((doc) => ({
      path: doc.relativePath,
      score: doc.trust?.score || 0,
      lastVerified: doc.trust?.lastVerified || doc.modified,
      supersededBy: doc.trust?.supersededBy || null,
      signals: doc.trust?.signals || []
    }))
    .sort((left, right) => left.score - right.score || left.path.localeCompare(right.path));
  analysis.semanticWarnings = buildSemanticWarnings(documents, graph, analysis);
  analysis.health = buildRepoHealth(documents, graph, analysis);
}

function detectContradictions(documents) {
  const claimsByKey = new Map();
  for (const doc of documents) {
    for (const claim of doc.numericClaims || []) {
      const entry = claimsByKey.get(claim.key) || [];
      entry.push({ ...claim, path: doc.relativePath });
      claimsByKey.set(claim.key, entry);
    }
  }

  const contradictions = [];
  for (const [key, claims] of claimsByKey.entries()) {
    const distinct = new Map();
    for (const claim of claims) {
      const valueKey = normalizeNumericClaimValue(claim.value);
      if (!valueKey) continue;
      if (!distinct.has(valueKey)) distinct.set(valueKey, []);
      distinct.get(valueKey).push(claim);
    }
    if (distinct.size < 2) continue;

    const examples = [...distinct.values()]
      .map((items) => items[0])
      .sort((left, right) => left.path.localeCompare(right.path))
      .slice(0, 6)
      .map((claim) => ({
        value: claim.value,
        source: `${claim.path}:${claim.line}`,
        excerpt: claim.excerpt
      }));

    contradictions.push({
      key,
      confidence: Math.min(0.92, 0.55 + distinct.size * 0.12 + examples.length * 0.03),
      values: [...distinct.keys()],
      examples
    });
  }

  return contradictions.sort((left, right) => right.confidence - left.confidence || left.key.localeCompare(right.key)).slice(0, 100);
}

function extractNumericClaims(content, relativePath, type, extension) {
  const semanticCodeExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.json', '.yaml', '.yml']);
  if (type === 'code' && !semanticCodeExtensions.has(extension)) return [];
  const claims = [];
  const lines = String(content || '').split(/\r?\n/);
  const tablePattern = /^\s*\|?\s*([^|\n]{3,80}?)\s*\|\s*([$€£₹]?\d[\d,]*(?:\.\d+)?\s*(?:%|k|m|b|K|M|B|\+)?)(?:\s*\||\s*$)/;
  const assignmentPattern = /([A-Za-z][A-Za-z0-9 _./-]{2,70}?)\s*(?:=|:|->|\bis\b|\bare\b)\s*([$€£₹]?\d[\d,]*(?:\.\d+)?\s*(?:%|k|m|b|K|M|B|\+)?)/g;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line || line.length > 240) continue;
    if (type === 'code') {
      if (!/^\s*(?:export\s+)?(?:const|let|var|[A-Z_][A-Z0-9_]*\s*=|["']?[A-Za-z0-9_.-]+["']?\s*:)/.test(rawLine)) continue;
      if (/(width|height|margin|padding|font|color|rgb|rgba|timeout|delay|duration|opacity|radius|x|y|z)\b/i.test(rawLine)) continue;
    }

    const tableMatch = line.match(tablePattern);
    if (tableMatch) {
      addNumericClaim(claims, tableMatch[1], tableMatch[2], line, index + 1, relativePath);
    }

    for (const match of line.matchAll(assignmentPattern)) {
      addNumericClaim(claims, match[1], match[2], line, index + 1, relativePath);
    }
  }

  return dedupeBy(claims, (item) => `${item.key}:${item.value}:${item.line}`);
}

function addNumericClaim(claims, rawKey, rawValue, line, lineNumber, relativePath) {
  const key = normalizeClaimKey(rawKey);
  const value = String(rawValue || '').replace(/\s+/g, '');
  if (!key || key.length < 3 || !/\d/.test(value)) return;
  if (/^(http|https|localhost|version|port|line|width|height|margin|padding|font|z index|rgb|rgba)$/i.test(key)) return;
  claims.push({
    key,
    value,
    line: lineNumber,
    source: `${relativePath}:${lineNumber}`,
    excerpt: createPlainTextExcerpt(line, 180)
  });
}

function normalizeClaimKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[`*_#[\]()"']/g, ' ')
    .replace(/\b(the|a|an|total|current|new|old|approx|around|about|number of)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    .slice(-6)
    .join(' ');
}

function normalizeNumericClaimValue(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[,$€£₹\s]/g, '')
    .trim();
}

function scanDocumentSecrets(content, relativePath) {
  const findings = [];
  const patterns = [
    { type: 'aws_access_key', regex: /\bAKIA[0-9A-Z]{16}\b/g },
    { type: 'openai_or_stripe_key', regex: /\b(?:sk|rk)_(?:live|test|proj)?_[A-Za-z0-9_-]{20,}\b/g },
    { type: 'payment_id', regex: /\b(?:pay|pi|ch|cus|sub)_[A-Za-z0-9]{12,}\b/g },
    { type: 'generic_secret', regex: /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret|password)\b\s*[:=]\s*['"]?([A-Za-z0-9_./+=-]{20,})/gi },
    { type: 'phone_number', regex: /(?:\+?91[-\s]?)?[6-9]\d{9}\b/g }
  ];
  const lines = String(content || '').split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      for (const match of line.matchAll(pattern.regex)) {
        const secretValue = match[1] || match[0];
        if (!secretValue || secretValue.length < 10) continue;
        findings.push({
          type: pattern.type,
          source: `${relativePath}:${index + 1}`,
          line: index + 1,
          fingerprint: sha256String(secretValue).slice(0, 16),
          confidence: pattern.type === 'generic_secret' ? 0.72 : 0.86
        });
      }
    }
  }

  return findings.slice(0, 40);
}

function detectNearDuplicateDocuments(documents, analysis) {
  const fingerprints = documents.map((doc) => ({
    doc,
    tokens: buildSimilarityTokenSet(doc)
  }));
  const duplicates = [];

  for (let leftIndex = 0; leftIndex < fingerprints.length; leftIndex += 1) {
    const left = fingerprints[leftIndex];
    if (left.tokens.size < 40) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < fingerprints.length; rightIndex += 1) {
      const right = fingerprints[rightIndex];
      if (right.tokens.size < 40) continue;
      if (left.doc.extension !== right.doc.extension && left.doc.type !== right.doc.type) continue;
      const ratio = Math.min(left.doc.words, right.doc.words) / Math.max(left.doc.words || 1, right.doc.words || 1);
      if (ratio < 0.35) continue;
      const similarity = jaccardSimilarity(left.tokens, right.tokens);
      if (similarity < 0.82) continue;
      const canonical = chooseCanonicalDocument(left.doc, right.doc, analysis);
      const duplicate = canonical.relativePath === left.doc.relativePath ? right.doc : left.doc;
      duplicates.push({
        left: left.doc.relativePath,
        right: right.doc.relativePath,
        similarity: Math.round(similarity * 100) / 100,
        canonical: canonical.relativePath,
        candidateToArchive: duplicate.relativePath,
        reason: buildDuplicateReason(canonical, duplicate, analysis)
      });
    }
  }

  return duplicates.sort((left, right) => right.similarity - left.similarity || left.left.localeCompare(right.left)).slice(0, 120);
}

function buildSimilarityTokenSet(doc) {
  const text = createPlainTextExcerpt(doc.content, 60000).toLowerCase();
  const tokens = text
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 4 && token.length <= 36 && !STOP_WORDS.has(token) && !/^\d+$/.test(token));
  const shingles = new Set();
  for (let index = 0; index < tokens.length - 2; index += 1) {
    shingles.add(`${tokens[index]} ${tokens[index + 1]} ${tokens[index + 2]}`);
    if (shingles.size >= 600) break;
  }
  return shingles;
}

function jaccardSimilarity(left, right) {
  let intersection = 0;
  const smaller = left.size < right.size ? left : right;
  const larger = left.size < right.size ? right : left;
  for (const item of smaller) {
    if (larger.has(item)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union ? intersection / union : 0;
}

function chooseCanonicalDocument(left, right, analysis) {
  const leftScore = scoreAuthorityCandidate(left, analysis);
  const rightScore = scoreAuthorityCandidate(right, analysis);
  if (leftScore !== rightScore) return leftScore > rightScore ? left : right;
  const leftTime = Date.parse(left.modified || '') || 0;
  const rightTime = Date.parse(right.modified || '') || 0;
  if (leftTime !== rightTime) return leftTime > rightTime ? left : right;
  return left.relativePath.localeCompare(right.relativePath) <= 0 ? left : right;
}

function scoreAuthorityCandidate(doc, analysis) {
  const metrics = analysis.metrics?.get(doc.relativePath) || {};
  let score = (metrics.degree || 0) * 4 + Math.min(20, doc.words / 120);
  if (/(^|\/)(readme|index|overview|architecture|schema|source-of-truth)\.(md|markdown|txt|json|ya?ml)$/i.test(doc.relativePath)) score += 28;
  if (/^(docs|src|packages)\//.test(doc.relativePath)) score += 8;
  if (isLikelyGeneratedPath(doc.relativePath)) score -= 35;
  return score;
}

function buildDuplicateReason(canonical, duplicate, analysis) {
  const canonicalMetrics = analysis.metrics?.get(canonical.relativePath) || {};
  const duplicateMetrics = analysis.metrics?.get(duplicate.relativePath) || {};
  if ((canonicalMetrics.degree || 0) !== (duplicateMetrics.degree || 0)) {
    return `${canonical.relativePath} has higher graph degree (${canonicalMetrics.degree || 0} vs ${duplicateMetrics.degree || 0}).`;
  }
  const canonicalTime = canonical.modified ? canonical.modified.slice(0, 10) : 'unknown';
  const duplicateTime = duplicate.modified ? duplicate.modified.slice(0, 10) : 'unknown';
  return `${canonical.relativePath} appears more canonical or newer (${canonicalTime} vs ${duplicateTime}).`;
}

function buildAuthorityGraph(documents, graph, analysis) {
  const authorities = [];
  const topicOwners = new Map();

  for (const doc of documents) {
    const topics = new Set([...(doc.topics || []), ...doc.tags.map((tag) => tag.replace(/^#/, ''))]);
    for (const claim of doc.numericClaims || []) topics.add(claim.key);
    for (const topic of topics) {
      if (!topic || topic.length < 3) continue;
      const entry = topicOwners.get(topic) || [];
      entry.push(doc);
      topicOwners.set(topic, entry);
    }
  }

  for (const [topic, docs] of topicOwners.entries()) {
    if (docs.length < 2) continue;
    const canonical = [...docs].sort((left, right) => scoreAuthorityCandidate(right, analysis) - scoreAuthorityCandidate(left, analysis))[0];
    authorities.push({
      topic,
      canonical: canonical.relativePath,
      confidence: Math.min(0.9, 0.5 + docs.length * 0.04 + (analysis.metrics?.get(canonical.relativePath)?.degree || 0) * 0.03),
      sources: docs
        .sort((left, right) => scoreAuthorityCandidate(right, analysis) - scoreAuthorityCandidate(left, analysis))
        .slice(0, 8)
        .map((doc) => ({
          path: doc.relativePath,
          score: Math.round(scoreAuthorityCandidate(doc, analysis)),
          citation: `${doc.relativePath}:1`
        }))
    });
  }

  return authorities.sort((left, right) => right.confidence - left.confidence || left.topic.localeCompare(right.topic)).slice(0, 120);
}

function applyTrustScores(documents, graph, analysis) {
  const duplicateSupersededBy = new Map();
  for (const duplicate of analysis.nearDuplicates || []) {
    duplicateSupersededBy.set(duplicate.candidateToArchive, duplicate.canonical);
  }
  const contradictionPaths = new Set(
    (analysis.contradictions || []).flatMap((item) =>
      (item.examples || []).map((example) => String(example.source || '').split(':')[0])
    )
  );
  const secretPaths = new Set((analysis.secretFindings || []).map((finding) => String(finding.source || '').split(':')[0]));
  const now = Date.now();

  for (const doc of documents) {
    const metrics = analysis.metrics?.get(doc.relativePath) || {};
    const signals = [];
    let score = 62;
    score += Math.min(18, (metrics.degree || 0) * 3);
    if ((metrics.incoming || 0) > 0) {
      score += Math.min(10, metrics.incoming * 2);
      signals.push(`${metrics.incoming} inbound reference${metrics.incoming === 1 ? '' : 's'}`);
    }
    if (/(^|\/)(readme|index|overview|architecture|schema|source-of-truth)\./i.test(doc.relativePath)) {
      score += 10;
      signals.push('canonical-looking filename');
    }
    const modifiedTime = Date.parse(doc.modified || '') || 0;
    const ageDays = modifiedTime ? Math.max(0, Math.round((now - modifiedTime) / 86400000)) : null;
    if (ageDays !== null) {
      if (ageDays <= 30) {
        score += 8;
        signals.push(`modified ${ageDays} day${ageDays === 1 ? '' : 's'} ago`);
      } else if (ageDays > 180) {
        score -= 10;
        signals.push(`old filesystem mtime (${ageDays} days)`);
      }
    }
    if ((metrics.degree || 0) === 0) {
      score -= 12;
      signals.push('orphan in resolved graph');
    }
    if (contradictionPaths.has(doc.relativePath)) {
      score -= 18;
      signals.push('appears in contradiction report');
    }
    if (secretPaths.has(doc.relativePath)) {
      score -= 20;
      signals.push('contains possible secret/PII');
    }
    const supersededBy = duplicateSupersededBy.get(doc.relativePath) || null;
    if (supersededBy) {
      score -= 24;
      signals.push(`near-duplicate superseded by ${supersededBy}`);
    }
    if (isLikelyGeneratedPath(doc.relativePath)) {
      score -= 22;
      signals.push('generated or vendored-looking path');
    }

    doc.trust = {
      score: Math.max(0, Math.min(100, Math.round(score))),
      lastVerified: doc.modified || null,
      supersededBy,
      signals: signals.slice(0, 8)
    };
  }
}

function buildSemanticWarnings(documents, graph, analysis) {
  const warnings = [];
  if (graph.unresolvedLinks.length) {
    warnings.push({
      type: 'broken_links',
      severity: graph.unresolvedLinks.length > 10 ? 'high' : 'medium',
      message: `${graph.unresolvedLinks.length} unresolved links/imports found.`,
      citations: graph.unresolvedLinks.slice(0, 8).map((link) => `${link.source.relativePath}:${link.line || 1}`),
      confidence: 0.92
    });
  }
  for (const contradiction of (analysis.contradictions || []).slice(0, 8)) {
    warnings.push({
      type: 'contradiction',
      severity: 'high',
      message: `Conflicting values for "${contradiction.key}".`,
      citations: contradiction.examples.map((example) => example.source),
      confidence: contradiction.confidence
    });
  }
  for (const duplicate of (analysis.nearDuplicates || []).slice(0, 8)) {
    warnings.push({
      type: 'near_duplicate',
      severity: duplicate.similarity >= 0.92 ? 'medium' : 'low',
      message: `${duplicate.left} and ${duplicate.right} are ${Math.round(duplicate.similarity * 100)}% similar.`,
      citations: [`${duplicate.left}:1`, `${duplicate.right}:1`],
      confidence: duplicate.similarity
    });
  }
  for (const finding of (analysis.secretFindings || []).slice(0, 8)) {
    warnings.push({
      type: 'secret_or_pii',
      severity: 'high',
      message: `Possible ${finding.type} in tracked/indexed content.`,
      citations: [finding.source],
      confidence: finding.confidence
    });
  }

  const lowTrust = documents.filter((doc) => (doc.trust?.score || 0) < 45).slice(0, 8);
  if (lowTrust.length) {
    warnings.push({
      type: 'low_trust_files',
      severity: 'medium',
      message: `${lowTrust.length} low-trust files need review.`,
      citations: lowTrust.map((doc) => `${doc.relativePath}:1`),
      confidence: 0.74
    });
  }

  return warnings;
}

function buildRepoHealth(documents, graph, analysis) {
  const generated = documents.filter((doc) => isLikelyGeneratedPath(doc.relativePath));
  const lowTrust = documents.filter((doc) => (doc.trust?.score || 0) < 45);
  const score = Math.max(
    0,
    Math.min(
      100,
      100
        - Math.min(24, graph.unresolvedLinks.length * 3)
        - Math.min(20, (analysis.contradictions || []).length * 5)
        - Math.min(18, (analysis.nearDuplicates || []).length * 2)
        - Math.min(24, (analysis.secretFindings || []).length * 8)
        - Math.min(16, lowTrust.length)
        - Math.min(12, generated.length ? 8 : 0)
    )
  );

  return {
    score: Math.round(score),
    files: documents.length,
    edges: graph.edges.length,
    unresolvedLinks: graph.unresolvedLinks.length,
    orphans: analysis.orphans.length,
    nearDuplicates: (analysis.nearDuplicates || []).length,
    contradictions: (analysis.contradictions || []).length,
    possibleSecretsOrPii: (analysis.secretFindings || []).length,
    lowTrustFiles: lowTrust.length,
    generatedOrVendoredIndexed: generated.length,
    topActions: buildRepoHealthActions(documents, graph, analysis, generated, lowTrust)
  };
}

function buildRepoHealthActions(documents, graph, analysis, generated, lowTrust) {
  const actions = [];
  if (generated.length) {
    actions.push({
      priority: 'P0',
      action: `Exclude generated/vendored-looking paths; ${generated.length} are currently indexed.`,
      citations: generated.slice(0, 6).map((doc) => `${doc.relativePath}:1`)
    });
  }
  if ((analysis.secretFindings || []).length) {
    actions.push({
      priority: 'P0',
      action: 'Review possible secrets/PII and rotate anything real.',
      citations: analysis.secretFindings.slice(0, 8).map((finding) => finding.source)
    });
  }
  if ((analysis.contradictions || []).length) {
    actions.push({
      priority: 'P1',
      action: 'Resolve conflicting metric/value definitions.',
      citations: analysis.contradictions.slice(0, 6).flatMap((item) => item.examples.map((example) => example.source)).slice(0, 10)
    });
  }
  if ((analysis.nearDuplicates || []).length) {
    actions.push({
      priority: 'P1',
      action: 'Choose canonical files and archive near-duplicates.',
      citations: analysis.nearDuplicates.slice(0, 6).flatMap((item) => [`${item.left}:1`, `${item.right}:1`])
    });
  }
  if (graph.unresolvedLinks.length) {
    actions.push({
      priority: 'P1',
      action: 'Fix unresolved links/imports.',
      citations: graph.unresolvedLinks.slice(0, 10).map((link) => `${link.source.relativePath}:${link.line || 1}`)
    });
  }
  if (lowTrust.length) {
    actions.push({
      priority: 'P2',
      action: 'Review low-trust stale/orphan files.',
      citations: lowTrust.slice(0, 10).map((doc) => `${doc.relativePath}:1`)
    });
  }
  return actions;
}

function isLikelyGeneratedPath(relativePath) {
  return /(^|\/)(dist|build|release|node_modules|coverage|android\/app\/src\/main\/assets\/public\/assets|vendor|target)\//i.test(relativePath)
    || /(^|\/)package-lock\.json$/i.test(relativePath)
    || /\.(min|bundle)\.[cm]?js$/i.test(relativePath);
}

function renderDiscoverySummaryLine(config) {
  const summary = config.discoverySummary;
  if (!summary) return 'Discovery: no exclusion summary available';
  const skippedByIgnore = Object.entries(summary.skippedByIgnore || {})
    .map(([key, count]) => `${key}=${count}`)
    .join(', ') || 'none';
  const skippedByDirectory = Object.entries(summary.skippedByDirectory || {})
    .map(([key, count]) => `${key}=${count}`)
    .join(', ') || 'none';
  return `Discovery: indexed ${summary.indexedFiles || 0} of ${summary.candidateFiles || 0} candidate files; skipped by ignore: ${skippedByIgnore}; skipped by directory defaults: ${skippedByDirectory}`;
}

function buildClaudeContextGraphPayload(rootPath, documents, graph, analysis, contextChunks, options = {}, routeValidation = null) {
  const chunkLines = String(contextChunks || '')
    .trim()
    .split('\n')
    .filter(Boolean);

  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    exporterVersion: CONTEXT_EXPORTER_VERSION,
    profile: options.profile || DEFAULT_CONTEXT_PROFILE,
    profileLabel: options.profileLabel || CONTEXT_PROFILES[DEFAULT_CONTEXT_PROFILE].label,
    fingerprint: options.exportFingerprint,
    root: rootPath,
    generatedAt: options.generatedAt || new Date().toISOString(),
    limits: {
      maxFiles: Number(options.maxFiles),
      maxBytes: Number(options.maxBytes),
      maxDepth: Number(options.maxDepth),
      chunkTokens: Number(options.chunkTokens) || DEFAULT_CHUNK_TOKENS,
      sceneNodeLimit: Number(options.sceneNodeLimit) || DEFAULT_SCENE_NODE_LIMIT,
      sceneEdgeLimit: Number(options.sceneEdgeLimit) || DEFAULT_SCENE_EDGE_LIMIT,
      includeCode: Boolean(options.includeCode)
    },
    nodes: graph.nodes.map((node) => ({
      id: buildStableNodeId(node.relativePath),
      path: node.relativePath,
      type: node.type,
      startLine: 1,
      endLine: node.lines,
      words: node.words,
      summary: node.summary || '',
      topics: node.topics || [],
      modified: node.modified,
      trust: node.trust || null,
      headings: node.headings.map((heading) => heading.text),
      tags: node.tags,
      aliases: node.aliases,
      symbols: node.symbols,
      imports: node.imports.map((item) => ({
        specifier: item.specifier,
        line: item.line,
        imported: item.imported
      })),
      calls: (node.calls || []).slice(0, 80)
    })),
    edges: graph.edges.map((edge) => ({
      id: buildStableEdgeId(edge),
      source: edge.source.relativePath,
      target: edge.target.relativePath,
      kind: edge.kind,
      text: edge.text,
      line: edge.line,
      specifier: edge.specifier,
      targetSymbol: edge.targetSymbol || null
    })),
    unresolvedLinks: graph.unresolvedLinks.map((link) => ({
      source: link.source.relativePath,
      kind: link.kind,
      target: link.target,
      text: link.text,
      line: link.line,
      specifier: link.specifier
    })),
    chunks: {
      path: 'llm-context-chunks.jsonl',
      count: chunkLines.length,
      targetTokens: Number(options.chunkTokens) || DEFAULT_CHUNK_TOKENS
    },
    routeValidation,
    navigation: serializeContextAnalysis(analysis),
    intelligence: {
      health: analysis.health,
      contradictions: analysis.contradictions,
      semanticWarnings: analysis.semanticWarnings,
      authority: analysis.authority,
      nearDuplicates: analysis.nearDuplicates,
      secretFindings: analysis.secretFindings,
      staleness: analysis.staleness
    }
  };
}

function buildScenePayload(rootPath, documents, graph, analysis, graphPayload, options = {}) {
  const projection = buildSceneProjection(documents, graph, analysis, {
    nodeLimit: Number(options.nodeLimit) || DEFAULT_SCENE_NODE_LIMIT,
    edgeLimit: Number(options.edgeLimit) || DEFAULT_SCENE_EDGE_LIMIT,
    routeSeedPaths: buildSceneRouteSeeds(analysis.routes || [])
  });
  const activePath = projection.activePath;
  const layoutSource = layoutForceGraphNodes3D(projection.nodes, projection.edges, SCENE_LAYOUT_WIDTH, SCENE_LAYOUT_HEIGHT, activePath);
  const layoutProjected = projectSceneLayout(layoutSource, SCENE_LAYOUT_WIDTH / 2, SCENE_LAYOUT_HEIGHT / 2, SCENE_ROTATION, options.perspective || DEFAULT_SCENE_PERSPECTIVE, {
    zSort: true
  });
  const activeDoc = projection.nodeByPath.get(activePath);
  const seeds = projection.seeds;
  const routeScoreByPath = buildSceneRouteScores(analysis.routes || [], projection.nodes);
  const bounds = computeSceneBounds(layoutProjected);
  const documentsByPathCache = documentsByPath(documents);
  const routeDocs = (analysis.routes || [])
    .slice(0, 6)
    .map((route) => ({
      name: route.name,
      goal: route.goal,
      documents: route.documents.map((document) => ({
        path: document.relativePath || document,
        words: (documentsByPathCache.get(document.relativePath || document) || {}).words || 0
      }))
    }));

  const nodesPayload = projection.nodes.map((node) => {
    const projectionPoint = layoutProjected.get(node.path);
    const doc = projection.nodeByPath.get(node.path) || {};
    return {
      path: node.path,
      type: node.type,
      degree: node.degree || 0,
      incoming: node.incoming,
      outgoing: node.outgoing,
      tags: node.tags,
      aliases: node.aliases,
      words: node.words,
      symbols: node.symbols.slice(0, 12),
      summary: doc.summary || '',
      topics: doc.topics || [],
      trust: doc.trust || null,
      routeScore: routeScoreByPath.get(node.path) || 0,
      active: node.path === activePath,
      hasMedia: hasMediaReferences(doc),
      hasCanvas: doc.extension === '.canvas',
      coordinates: projectionPoint
        ? {
            x: roundNumber(projectionPoint.x),
            y: roundNumber(projectionPoint.y),
            z: roundNumber(projectionPoint.z)
          }
        : null,
      projection: projectionPoint
        ? {
            x: roundNumber(projectionPoint.screenX),
            y: roundNumber(projectionPoint.screenY),
            depth: roundNumber(projectionPoint.depth),
            scale: roundNumber(projectionPoint.scale)
          }
        : null,
      seed: seeds.includes(node.path)
    };
  });

  const seenEdges = new Set();
  const edgesPayload = [];
  for (const edge of projection.edges) {
    const key = `${edge.source.path}->${edge.target.path}:${edge.kind || 'link'}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    edgesPayload.push({
      source: edge.source.path,
      target: edge.target.path,
      kind: edge.kind || 'link',
      text: edge.text,
      line: edge.line,
      specifier: edge.specifier
    });
  }

  const unresolved = graph.unresolvedLinks.filter(
    (link) => projection.nodeByPath.has(link.source.relativePath) || projection.nodeByPath.has(resolveLinkPath(link.target))
  );

  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    exporterVersion: CONTEXT_EXPORTER_VERSION,
    profile: '3d-scene',
    exportProfile: options.profile || DEFAULT_CONTEXT_PROFILE,
    exportProfileLabel: options.profileLabel || CONTEXT_PROFILES[DEFAULT_CONTEXT_PROFILE].label,
    exportFingerprint: options.exportFingerprint || graphPayload.fingerprint,
    root: rootPath,
    generatedAt: graphPayload.generatedAt || new Date().toISOString(),
    activePath,
    counts: {
      nodes: documents.length,
      edges: graph.edges.length,
      unresolved: graph.unresolvedLinks.length,
      sceneNodes: projection.nodes.length,
      sceneEdges: projection.edges.length
    },
    limits: {
      nodeLimit: Number(options.nodeLimit) || DEFAULT_SCENE_NODE_LIMIT,
      edgeLimit: Number(options.edgeLimit) || DEFAULT_SCENE_EDGE_LIMIT
    },
    viewport: {
      width: SCENE_LAYOUT_WIDTH,
      height: SCENE_LAYOUT_HEIGHT,
      rotation: SCENE_ROTATION,
      perspective: options.perspective || DEFAULT_SCENE_PERSPECTIVE
    },
    bounds,
    seeds,
    unresolvedCount: unresolved.length,
    activeDocument: activeDoc ? activeDoc.relativePath : null,
    readingOrder: buildSceneReadingOrder(projection.nodes, analysis.routes || [], activePath),
    routes: routeDocs.map((route) => ({
      ...route,
      documents: route.documents.slice(0, 24)
    })),
    nodes: nodesPayload,
    edges: edgesPayload.slice(0, Number(options.edgeLimit) || DEFAULT_SCENE_EDGE_LIMIT),
    navigation: graphPayload.navigation,
    fingerprint: buildSceneFingerprint(projection.nodes, edgesPayload, routeScoreByPath),
    source: {
      graphPath: 'claude-context-graph.json'
    }
  };
}

function buildSceneRouteSeeds(routes = []) {
  const seen = new Set();
  const seeds = [];

  for (const route of routes.slice(0, 5)) {
    for (const document of route?.documents || []) {
      const pathValue = document.relativePath || document;
      if (!pathValue || seen.has(pathValue)) continue;
      seen.add(pathValue);
      seeds.push(pathValue);
      if (seeds.length >= 24) return seeds;
    }
  }
  return seeds;
}

function buildSceneProjection(documents, graph, analysis, options = {}) {
  const nodeLimit = Number(options.nodeLimit) || DEFAULT_SCENE_NODE_LIMIT;
  const edgeLimit = Number(options.edgeLimit) || DEFAULT_SCENE_EDGE_LIMIT;
  const routeSeedPaths = new Set((options.routeSeedPaths || []).filter(Boolean));
  const nodeByPath = new Map(documents.map((doc) => [doc.relativePath, doc]));
  const degreeByPath = new Map();
  for (const edge of graph.edges) {
    degreeByPath.set(edge.source.relativePath, (degreeByPath.get(edge.source.relativePath) || 0) + 1);
    degreeByPath.set(edge.target.relativePath, (degreeByPath.get(edge.target.relativePath) || 0) + 1);
  }

  const adjacency = new Map();
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source.relativePath)) adjacency.set(edge.source.relativePath, new Set());
    if (!adjacency.has(edge.target.relativePath)) adjacency.set(edge.target.relativePath, new Set());
    adjacency.get(edge.source.relativePath).add(edge.target.relativePath);
    adjacency.get(edge.target.relativePath).add(edge.source.relativePath);
  }

  const seeds = new Set();
  const addSeed = (path) => {
    if (!path || !nodeByPath.has(path)) return;
    seeds.add(path);
  };

  const topDegree = [...documents]
    .map((doc) => ({
      path: doc.relativePath,
      degree: (analysis.metrics?.get(doc.relativePath)?.degree || 0) + (degreeByPath.get(doc.relativePath) || 0)
    }))
    .sort((left, right) => right.degree - left.degree || left.path.localeCompare(right.path));
  for (const item of topDegree.slice(0, 48)) addSeed(item.path);
  const hubs = (analysis.hubs || []).map((entry) => entry.doc?.relativePath).filter(Boolean);
  for (const pathValue of hubs.slice(0, 36)) addSeed(pathValue);
  for (const pathValue of routeSeedPaths) addSeed(pathValue);
  for (const value of analysis.unresolvedBySource?.map((item) => item.doc?.relativePath).filter(Boolean) || []) addSeed(value);

  const activePath = options.activePath || hubs[0] || topDegree[0]?.path || null;
  if (activePath) addSeed(activePath);

  const queue = [...[...seeds].map((path) => ({ path, depth: 0 }))];
  const selected = new Set(seeds);
  while (queue.length && selected.size < nodeLimit) {
    const current = queue.shift();
    if (current.depth >= 2) continue;
    const neighbors = adjacency.get(current.path);
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      if (selected.size >= nodeLimit || selected.has(neighbor)) continue;
      if (!nodeByPath.has(neighbor)) continue;
      selected.add(neighbor);
      addSeed(neighbor);
      queue.push({ path: neighbor, depth: current.depth + 1 });
    }
  }

  if (selected.size < nodeLimit) {
    for (const item of topDegree) {
      if (selected.size >= nodeLimit) break;
      addSeed(item.path);
    }
  }

  const selectedPaths = new Set(seeds);
  const scoredEdges = [];

  for (const edge of graph.edges) {
    if (!selectedPaths.has(edge.source.relativePath) || !selectedPaths.has(edge.target.relativePath)) continue;
    const sourceDegree = degreeByPath.get(edge.source.relativePath) || 0;
    const targetDegree = degreeByPath.get(edge.target.relativePath) || 0;
    let score = sourceDegree + targetDegree;
    if (edge.source.relativePath === activePath || edge.target.relativePath === activePath) score += 45;
    scoredEdges.push({ edge, score });
  }

  const sceneEdges = scoredEdges
    .sort((left, right) => right.score - left.score)
    .slice(0, edgeLimit)
    .map((item) => ({
      source: { path: item.edge.source.relativePath },
      target: { path: item.edge.target.relativePath },
      kind: item.edge.kind,
      text: item.edge.text,
      line: item.edge.line,
      specifier: item.edge.specifier
    }));

  const selectedNodes = [...selectedPaths]
    .map((pathValue) => {
      const doc = nodeByPath.get(pathValue);
      return {
        ...doc,
        path: pathValue,
        degree: (analysis.metrics?.get(pathValue)?.degree || 0) + (degreeByPath.get(pathValue) || 0),
        incoming: analysis.metrics?.get(pathValue)?.incoming || 0,
        outgoing: analysis.metrics?.get(pathValue)?.outgoing || 0
      };
    })
    .sort((left, right) => right.degree - left.degree || left.path.localeCompare(right.path));

  return {
    activePath,
    nodes: selectedNodes,
    edges: sceneEdges,
    seeds: [...seeds],
    nodeByPath
  };
}

function buildSceneRouteScores(routes, nodes) {
  const scoreByPath = new Map();
  for (let index = 0; index < (routes || []).length; index += 1) {
    const route = routes[index];
    for (let documentIndex = 0; documentIndex < (route.documents || []).length; documentIndex += 1) {
      const document = route.documents[documentIndex];
      const pathValue = document?.relativePath || document;
      const score = 300 - index * 45 - documentIndex * 4;
      const nextScore = scoreByPath.get(pathValue) || 0;
      if (score > nextScore) scoreByPath.set(pathValue, score);
    }
  }
  for (const node of nodes) {
    const fallbackScore = node?.degree || 0;
    if (!scoreByPath.has(node.path)) scoreByPath.set(node.path, fallbackScore > 40 ? fallbackScore : 0);
  }
  return scoreByPath;
}

function buildSceneReadingOrder(nodes, routes, activePath) {
  const byPath = new Map(nodes.map((node) => [node.path, node]));
  const order = [];
  const addToOrder = (path) => {
    if (!path || !byPath.has(path) || order.includes(path)) return;
    order.push(path);
  };

  addToOrder(activePath);
  for (const route of routes || []) {
    for (const document of route.documents || []) {
      addToOrder(document?.relativePath || document);
    }
  }
  const ranked = [...nodes].sort((left, right) => right.degree - left.degree || left.path.localeCompare(right.path));
  for (const node of ranked) {
    addToOrder(node.path);
  }
  return order;
}

function layoutForceGraphNodes3D(nodes, edges, width, height, activePath) {
  const layout = new Map();
  if (!nodes.length) return layout;
  const centerX = width / 2;
  const centerY = height / 2;
  const padding = 48;

  const positions = nodes.map((node, index) => {
    const hash = Math.abs(hashStringToNumber(node.path || node.label || String(index)));
    const angle = (index * 2.399963229728653 + (hash % 360) * (Math.PI / 180)) % (Math.PI * 2);
    const radius = 84 + (hash % 320);
    const isActive = node.path === activePath;
    return {
      path: node.path,
      x: isActive ? centerX : centerX + Math.cos(angle) * radius,
      y: isActive ? centerY : centerY + Math.sin(angle) * radius,
      z: isActive ? 0 : (hash % 130) - 65,
      vx: 0,
      vy: 0,
      vz: 0,
      fixed: isActive
    };
  });

  const positionByPath = new Map(positions.map((position) => [position.path, position]));
  const iterations = nodes.length > 300 ? 58 : nodes.length > 160 ? 78 : 108;
  const repulsion = nodes.length > 260 ? 6200 : 9100;
  const attraction = nodes.length > 260 ? 0.01 : 0.013;
  const centerPull = 0.016;
  const damping = 0.835;

  for (let index = 0; index < iterations; index += 1) {
    for (let leftIndex = 0; leftIndex < positions.length; leftIndex += 1) {
      const left = positions[leftIndex];
      for (let rightIndex = leftIndex + 1; rightIndex < positions.length; rightIndex += 1) {
        const right = positions[rightIndex];
        let dx = left.x - right.x;
        let dy = left.y - right.y;
        let dz = left.z - right.z;
        let distanceSquared = dx * dx + dy * dy + dz * dz;
        if (distanceSquared < 0.01) {
          dx = 0.12 + (leftIndex % 4) * 0.03;
          dy = 0.12 + (rightIndex % 6) * 0.02;
          dz = 0.12 + (leftIndex % 7) * 0.02;
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
      const source = positionByPath.get(edge.source.path);
      const target = positionByPath.get(edge.target.path);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dz = target.z - source.z;
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz));
      const desired = 92;
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
      x: roundNumber(position.x),
      y: roundNumber(position.y),
      z: roundNumber(position.z)
    });
  }
  return layout;
}

function projectSceneLayout(layout, centerX, centerY, rotation, perspective, options = {}) {
  const normalized = normalizeSceneRotation(rotation);
  const rx = (Math.PI / 180) * normalized.x;
  const ry = (Math.PI / 180) * normalized.y;
  const rz = (Math.PI / 180) * normalized.z;
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const projected = new Map();

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
    projected.set(path, {
      ...point,
      screenX: Math.round(centerX + x3 * cameraDepth),
      screenY: Math.round(centerY + y3 * cameraDepth),
      depth: Math.max(0, Math.min(1, (z2 + 130) / 260)),
      scale: cameraDepth,
      z: roundNumber(point.z)
    });
  }

  if (!options.zSort) {
    return projected;
  }

  const entries = [...projected.values()];
  const minDepth = Math.min(...entries.map((item) => item.depth), 1);
  const maxDepth = Math.max(...entries.map((item) => item.depth), 0);
  const depthRange = Math.max(0.0001, maxDepth - minDepth);
  for (const item of entries) {
    item.depth = Math.max(0, Math.min(1, (item.depth - minDepth) / depthRange));
  }
  return projected;
}

function computeSceneBounds(layout) {
  if (!layout?.size) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of layout.values()) {
    const x = Number(point.screenX);
    const y = Number(point.screenY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  return {
    minX: roundNumber(minX),
    minY: roundNumber(minY),
    maxX: roundNumber(maxX),
    maxY: roundNumber(maxY)
  };
}

function buildSceneFingerprint(nodes = [], edges = [], routeScoreByPath = new Map()) {
  const nodeTokens = [...nodes]
    .map((node) => `${node.path}:${node.degree || 0}:${routeScoreByPath.get(node.path) || 0}`)
    .sort()
    .slice(0, DEFAULT_SCENE_NODE_LIMIT);
  const edgeTokens = [...edges]
    .map((edge) => `${edge.source}->${edge.target}:${edge.kind}:${edge.text || ''}`)
    .sort()
    .slice(0, DEFAULT_SCENE_EDGE_LIMIT);
  return hashString(`${nodeTokens.join('|')}|${edgeTokens.join('|')}`);
}

function buildContextExportFingerprint(rootPath, documents, graph, analysis, options = {}) {
  const payload = {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    profile: options.profile || DEFAULT_CONTEXT_PROFILE,
    limits: {
      maxFiles: Number(options.maxFiles),
      maxBytes: Number(options.maxBytes),
      maxDepth: Number(options.maxDepth),
      chunkTokens: Number(options.chunkTokens),
      includeCode: Boolean(options.includeCode)
    },
    rootName: path.basename(rootPath),
    nodes: documents.map((doc) => ({
      path: doc.relativePath,
      type: doc.type,
      size: doc.size,
      lines: doc.lines,
      words: doc.words,
      headings: doc.headings.map((heading) => `${heading.line}:${heading.depth}:${heading.text}`),
      tags: doc.tags,
      aliases: doc.aliases,
      symbols: doc.symbols.map((symbol) => `${symbol.kind}:${symbol.name}:${symbol.line}`),
      contentHash: sha256String(doc.content).slice(0, 24)
    })),
    edges: graph.edges
      .map((edge) => `${edge.source.relativePath}->${edge.target.relativePath}:${edge.kind}:${edge.specifier || ''}:${edge.line || 0}`)
      .sort(),
    unresolved: graph.unresolvedLinks.map((link) => `${link.source.relativePath}->${link.target}:${link.kind}:${link.line || 0}`).sort(),
    routes: (analysis.routes || []).map((route) => ({
      name: route.name,
      documents: route.documents.map((doc) => doc.relativePath)
    }))
  };
  return sha256String(JSON.stringify(payload)).slice(0, 24);
}

function validateNavigationRoutes(routes = [], documents = []) {
  const validPaths = new Set(documents.map((doc) => doc.relativePath));
  const missing = [];
  let documentRefs = 0;

  for (const route of routes) {
    for (const doc of route.documents || []) {
      documentRefs += 1;
      const docPath = doc?.relativePath || doc;
      if (!validPaths.has(docPath)) {
        missing.push({
          route: route.name,
          path: docPath
        });
      }
    }
  }

  return {
    ok: missing.length === 0,
    routeCount: routes.length,
    documentRefs,
    missingCount: missing.length,
    missing: missing.slice(0, 80)
  };
}

function buildContextIntegrityPayload(rootPath, options, documents, graph, analysis, routeValidation, artifacts) {
  const artifactRecords = artifacts.map((artifact) => ({
    key: artifact.key,
    file: artifact.file,
    bytes: Buffer.byteLength(artifact.content || '', 'utf8'),
    lines: String(artifact.content || '').split('\n').length,
    sha256: sha256String(artifact.content || '')
  }));
  const warnings = [];
  if (!routeValidation?.ok) warnings.push('Navigation routes reference files that were not emitted.');
  if (documents.length >= Number(options.maxFiles || 0)) warnings.push('File discovery reached the selected max-files limit.');
  if (graph.unresolvedLinks.length) warnings.push(`${graph.unresolvedLinks.length} unresolved links were found.`);
  if (analysis.contradictions?.length) warnings.push(`${analysis.contradictions.length} possible contradictions were found.`);
  if (analysis.secretFindings?.length) warnings.push(`${analysis.secretFindings.length} possible secrets/PII findings were found.`);
  if (analysis.nearDuplicates?.length) warnings.push(`${analysis.nearDuplicates.length} near-duplicate file pairs were found.`);

  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    exporterVersion: CONTEXT_EXPORTER_VERSION,
    generatedAt: options.generatedAt || new Date().toISOString(),
    profile: options.profile || DEFAULT_CONTEXT_PROFILE,
    profileLabel: options.profileLabel || CONTEXT_PROFILES[DEFAULT_CONTEXT_PROFILE].label,
    fingerprint: options.exportFingerprint,
    root: rootPath,
    counts: {
      files: documents.length,
      markdown: documents.filter((doc) => doc.type === 'markdown').length,
      code: documents.filter((doc) => doc.type === 'code').length,
      edges: graph.edges.length,
      unresolved: graph.unresolvedLinks.length,
      clusters: analysis.clusters.length,
      routes: analysis.routes.length
    },
    limits: {
      maxFiles: Number(options.maxFiles),
      maxBytes: Number(options.maxBytes),
      maxDepth: Number(options.maxDepth),
      chunkTokens: Number(options.chunkTokens),
      sceneNodeLimit: Number(options.sceneNodeLimit),
      sceneEdgeLimit: Number(options.sceneEdgeLimit),
      includeCode: Boolean(options.includeCode)
    },
    routeValidation,
    discovery: options.discoverySummary || null,
    health: analysis.health || null,
    intelligence: {
      contradictions: analysis.contradictions?.length || 0,
      semanticWarnings: analysis.semanticWarnings?.length || 0,
      nearDuplicates: analysis.nearDuplicates?.length || 0,
      possibleSecretsOrPii: analysis.secretFindings?.length || 0,
      lowTrustFiles: analysis.health?.lowTrustFiles || 0
    },
    artifacts: artifactRecords,
    warnings
  };
}

function buildStableNodeId(relativePath) {
  return `node:${hashString(relativePath)}`;
}

function buildStableEdgeId(edge) {
  return `edge:${hashString(`${edge.source.relativePath}->${edge.target.relativePath}:${edge.kind}:${edge.specifier || edge.text || ''}:${edge.line || 0}`)}`;
}

function normalizeSceneRotation(rotation) {
  const normalized = {
    x: Number(rotation?.x) || SCENE_ROTATION.x,
    y: Number(rotation?.y) || SCENE_ROTATION.y,
    z: Number(rotation?.z) || SCENE_ROTATION.z
  };
  normalized.x = Math.max(-85, Math.min(85, normalized.x));
  normalized.y = ((normalized.y % 360) + 360) % 360;
  if (normalized.y > 180) normalized.y -= 360;
  normalized.z = ((normalized.z % 360) + 360) % 360;
  if (normalized.z > 180) normalized.z -= 360;
  return normalized;
}

function hashString(value) {
  return createHash('sha1').update(String(value || '')).digest('hex').slice(0, 16);
}

function sha256String(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

function hashStringToNumber(value) {
  const hash = hashString(value);
  return Number.parseInt(hash.slice(0, 12), 16);
}

function roundNumber(value) {
  return Math.round(Number(value) * 10) / 10;
}

function hasMediaReferences(document) {
  const markdown = String(document?.content || '');
  const mediaLinks = markdown.match(/!\[[^\]]*]\([^)]+\)|\[[^\]]+]\([^)]+\)/g) || [];
  for (const rawMatch of mediaLinks) {
    const match = rawMatch.match(/\(([^)]+)\)/);
    const target = match?.[1]?.trim().split('#')[0];
    if (!target) continue;
    if (MEDIA_LINK_EXTENSION_PATTERN.test(target)) return true;
  }

  return Boolean(document?.relativePath && MEDIA_LINK_EXTENSION_PATTERN.test(document.relativePath));
}

function documentsByPath(documents) {
  return new Map(documents.map((document) => [document.relativePath, document]));
}

function resolveLinkPath(rawPath) {
  return String(rawPath || '')
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '')
    .trim();
}

function getDocumentGraphMetrics(documents, graph) {
  const metrics = new Map(
    documents.map((doc) => [
      doc.relativePath,
      {
        incoming: 0,
        outgoing: 0,
        degree: 0,
        crossClusterEdges: 0
      }
    ])
  );

  for (const edge of graph.edges) {
    const source = metrics.get(edge.source.relativePath);
    const target = metrics.get(edge.target.relativePath);
    if (source) {
      source.outgoing += 1;
      source.degree += 1;
    }
    if (target) {
      target.incoming += 1;
      target.degree += 1;
    }
    if (getTopFolder(edge.source.relativePath) !== getTopFolder(edge.target.relativePath)) {
      if (source) source.crossClusterEdges += 1;
      if (target) target.crossClusterEdges += 1;
    }
  }

  return metrics;
}

function buildFolderClusters(documents, graph, metrics) {
  const clusterByName = new Map();

  for (const doc of documents) {
    const name = getTopFolder(doc.relativePath);
    if (!clusterByName.has(name)) {
      clusterByName.set(name, {
        name,
        files: 0,
        words: 0,
        markdownFiles: 0,
        codeFiles: 0,
        internalEdges: 0,
        externalEdges: 0,
        docs: []
      });
    }
    const cluster = clusterByName.get(name);
    cluster.files += 1;
    cluster.words += doc.words;
    cluster.markdownFiles += doc.type === 'markdown' ? 1 : 0;
    cluster.codeFiles += doc.type === 'code' ? 1 : 0;
    cluster.docs.push(doc);
  }

  for (const edge of graph.edges) {
    const sourceCluster = getTopFolder(edge.source.relativePath);
    const targetCluster = getTopFolder(edge.target.relativePath);
    const cluster = clusterByName.get(sourceCluster);
    if (!cluster) continue;
    if (sourceCluster === targetCluster) {
      cluster.internalEdges += 1;
    } else {
      cluster.externalEdges += 1;
    }
  }

  return [...clusterByName.values()]
    .map((cluster) => ({
      ...cluster,
      topDocs: [...cluster.docs]
        .sort((left, right) => {
          const leftMetrics = metrics.get(left.relativePath) || {};
          const rightMetrics = metrics.get(right.relativePath) || {};
          return (rightMetrics.degree || 0) - (leftMetrics.degree || 0) || right.words - left.words || left.relativePath.localeCompare(right.relativePath);
        })
        .slice(0, 12)
    }))
    .sort((left, right) => right.files - left.files || right.externalEdges - left.externalEdges || left.name.localeCompare(right.name));
}

function getBridgeDocuments(documents, graph, metrics, clusters) {
  const clusterNames = new Set(clusters.map((cluster) => cluster.name));
  return documents
    .map((doc) => {
      const docMetrics = metrics.get(doc.relativePath) || {};
      return {
        doc,
        degree: docMetrics.degree || 0,
        crossClusterEdges: docMetrics.crossClusterEdges || 0,
        cluster: getTopFolder(doc.relativePath)
      };
    })
    .filter((item) => item.crossClusterEdges > 0 || (clusterNames.size > 1 && item.degree >= 3))
    .sort((left, right) => right.crossClusterEdges - left.crossClusterEdges || right.degree - left.degree || left.doc.relativePath.localeCompare(right.doc.relativePath));
}

function getUnresolvedBySource(graph) {
  const counts = new Map();
  for (const link of graph.unresolvedLinks) {
    const entry = counts.get(link.source.relativePath) || { doc: link.source, count: 0, targets: [] };
    entry.count += 1;
    if (entry.targets.length < 12) entry.targets.push(link.target);
    counts.set(link.source.relativePath, entry);
  }
  return [...counts.values()].sort((left, right) => right.count - left.count || left.doc.relativePath.localeCompare(right.doc.relativePath));
}

function getEdgeKindCounts(graph) {
  const counts = new Map();
  for (const edge of graph.edges) {
    counts.set(edge.kind, (counts.get(edge.kind) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((left, right) => right.count - left.count || left.kind.localeCompare(right.kind));
}

function buildNavigationRoutes(documents, graph, analysis) {
  const routes = [];
  const hubDocs = analysis.hubs.map((item) => item.doc);
  const bridgeDocs = analysis.bridges.map((item) => item.doc);
  const docsByPath = new Map(documents.map((doc) => [doc.relativePath, doc]));

  const overviewDocs = uniqueDocs([
    ...documents.filter((doc) => /(^|\/)(readme|index|overview|architecture|getting-started)\.(md|markdown|mdx|txt)$/i.test(doc.relativePath)),
    ...hubDocs.slice(0, 12),
    ...analysis.clusters.flatMap((cluster) => cluster.topDocs.slice(0, 2))
  ]).slice(0, 24);

  if (overviewDocs.length) {
    routes.push({
      name: 'Orientation Route',
      goal: 'Start here to understand the repo or vault shape before reading detailed files.',
      documents: overviewDocs
    });
  }

  const graphDocs = uniqueDocs([...hubDocs.slice(0, 16), ...bridgeDocs.slice(0, 12)]).slice(0, 24);
  if (graphDocs.length) {
    routes.push({
      name: 'Graph Hubs And Bridges Route',
      goal: 'Read these files to understand the most connected nodes and cross-cluster transitions.',
      documents: graphDocs
    });
  }

  const implementationDocs = uniqueDocs(
    documents
      .filter((doc) => doc.type === 'code' || /\.(json|yaml|yml)$/i.test(doc.relativePath))
      .sort((left, right) => {
        const leftScore = scoreImplementationDoc(left, docsByPath, graph);
        const rightScore = scoreImplementationDoc(right, docsByPath, graph);
        return rightScore - leftScore || left.relativePath.localeCompare(right.relativePath);
      })
  ).slice(0, 24);
  if (implementationDocs.length) {
    routes.push({
      name: 'Implementation Route',
      goal: 'Use this path when the task needs code, package, imports, symbols, config, or automation context.',
      documents: implementationDocs
    });
  }

  const symbolDocs = uniqueDocs(analysis.symbolDocuments || []).slice(0, 18);
  if (symbolDocs.length) {
    routes.push({
      name: 'Symbol And Import Route',
      goal: 'Use this path to inspect exported symbols, local imports, and test coverage edges before editing code.',
      documents: symbolDocs
    });
  }

  const cleanupDocs = uniqueDocs([
    ...analysis.unresolvedBySource.map((item) => item.doc),
    ...analysis.orphans.filter((doc) => doc.words > 80).slice(0, 20)
  ]).slice(0, 24);
  if (cleanupDocs.length) {
    routes.push({
      name: 'Risk And Cleanup Route',
      goal: 'Use this path to repair weak navigation, unresolved links, orphan notes, and stale docs.',
      documents: cleanupDocs
    });
  }

  return routes.slice(0, 5);
}

function scoreImplementationDoc(doc, docsByPath, graph) {
  let score = doc.words > 0 ? Math.min(40, doc.words / 80) : Math.min(28, doc.lines / 25);
  if (/(^|\/)(package|vite|main|renderer|preload|config|index|app)\./i.test(doc.relativePath)) score += 20;
  score += Math.min(24, doc.imports.length * 4);
  score += Math.min(20, doc.symbols.length * 3);
  for (const edge of graph.edges) {
    if (edge.source.relativePath === doc.relativePath || edge.target.relativePath === doc.relativePath) score += 4;
    if ((edge.kind === 'import' || edge.kind === 'test-coverage') && (edge.source.relativePath === doc.relativePath || edge.target.relativePath === doc.relativePath)) score += 4;
  }
  if (docsByPath.has(doc.relativePath.replace(/\.(js|mjs|cjs|ts|tsx|jsx)$/i, '.md'))) score += 8;
  return score;
}

function uniqueDocs(docs) {
  const seen = new Set();
  const result = [];
  for (const doc of docs) {
    if (!doc || seen.has(doc.relativePath)) continue;
    seen.add(doc.relativePath);
    result.push(doc);
  }
  return result;
}

function getTopFolder(relativePath) {
  const normalized = String(relativePath || '').replaceAll('\\', '/');
  if (!normalized.includes('/')) return '/';
  return normalized.split('/')[0] || '/';
}

function serializeContextAnalysis(analysis) {
  return {
    clusters: analysis.clusters.map((cluster) => ({
      name: cluster.name,
      files: cluster.files,
      words: cluster.words,
      markdownFiles: cluster.markdownFiles,
      codeFiles: cluster.codeFiles,
      internalEdges: cluster.internalEdges,
      externalEdges: cluster.externalEdges,
      topDocs: cluster.topDocs.map((doc) => doc.relativePath)
    })),
    hubs: analysis.hubs.map((item) => ({
      path: item.doc.relativePath,
      degree: item.degree,
      incoming: item.incoming,
      outgoing: item.outgoing
    })),
    bridges: analysis.bridges.map((item) => ({
      path: item.doc.relativePath,
      degree: item.degree,
      crossClusterEdges: item.crossClusterEdges,
      cluster: item.cluster
    })),
    edgeKinds: analysis.edgeKinds,
    symbolDocuments: analysis.symbolDocuments.slice(0, 80).map((doc) => ({
      path: doc.relativePath,
      symbols: doc.symbols.slice(0, 20)
    })),
    orphans: analysis.orphans.map((doc) => doc.relativePath),
    unresolvedBySource: analysis.unresolvedBySource.map((item) => ({
      path: item.doc.relativePath,
      count: item.count,
      targets: item.targets
    })),
    trust: (analysis.staleness || []).slice(0, 120).map((item) => ({
      path: item.path,
      score: item.score,
      lastVerified: item.lastVerified,
      supersededBy: item.supersededBy || null,
      signals: item.signals
    })),
    health: analysis.health,
    contradictions: (analysis.contradictions || []).slice(0, 80),
    nearDuplicates: (analysis.nearDuplicates || []).slice(0, 80),
    secretFindings: (analysis.secretFindings || []).slice(0, 80),
    routes: analysis.routes.map((route) => ({
      name: route.name,
      goal: route.goal,
      documents: route.documents.map((doc) => doc.relativePath)
    }))
  };
}

function renderClaudeContextMap(root, documents, graph, config, analysis) {
  const generatedAt = config.generatedAt || new Date().toISOString();
  const markdownDocs = documents.filter((doc) => doc.type === 'markdown');
  const codeDocs = documents.filter((doc) => doc.type === 'code');
  const topLinked = analysis.hubs.slice(0, 30);
  const lines = [
    `# Claude Context Map`,
    '',
    `Generated: ${generatedAt}`,
    `Schema: ${CONTEXT_SCHEMA_VERSION}`,
    `Profile: ${config.profile || DEFAULT_CONTEXT_PROFILE} (${config.profileLabel || CONTEXT_PROFILES[DEFAULT_CONTEXT_PROFILE].label})`,
    `Fingerprint: ${config.exportFingerprint || 'pending'}`,
    `Root: ${root}`,
    `Files indexed: ${documents.length}`,
    `Markdown/text files: ${markdownDocs.length}`,
    `Code/config files: ${codeDocs.length}`,
    `Resolved links: ${graph.edges.length}`,
    `Unresolved links: ${graph.unresolvedLinks.length}`,
    `Repo health score: ${analysis.health?.score ?? 'n/a'}/100`,
    `Limits: max ${config.maxFiles} files, max ${config.maxBytes} bytes per file, max depth ${config.maxDepth}`,
    renderDiscoverySummaryLine(config),
    '',
    '## Use With Claude',
    '',
    'Paste this file into Claude when you need grounded help with this repo or vault. It is an offline map: no files were uploaded while generating it. Ask Claude to cite paths from this map before proposing edits.',
    '',
    'Useful prompts:',
    '',
    '- Explain the architecture using only the mapped files and cite paths.',
    '- Find missing documentation or weak links between notes.',
    '- Build a work plan for the highest-impact files.',
    '- Suggest a graph/mind-map structure from the linked documents.',
    '- Follow the LLM navigation model before reading individual files.',
    '',
    '## LLM Navigation Model',
    '',
    `This map includes ${analysis.clusters.length} folder/topic clusters, ${analysis.hubs.length} ranked hubs, ${analysis.bridges.length} bridge files, and ${analysis.orphans.length} orphan files.`,
    'Use the routes below to traverse the context with less token waste:',
    ''
  ];

  for (const route of analysis.routes) {
    lines.push(`- ${route.name}: ${route.goal}`);
    for (const doc of route.documents.slice(0, 8)) {
      lines.push(`  - ${doc.relativePath}`);
    }
  }

  if (analysis.edgeKinds.length) {
    lines.push('', '## Edge Kind Mix', '');
    for (const item of analysis.edgeKinds) {
      lines.push(`- ${item.kind}: ${item.count}`);
    }
  }

  if (analysis.health) {
    lines.push('', '## Intelligence Layer', '');
    lines.push(`- Repo health: ${analysis.health.score}/100`);
    lines.push(`- Contradictions: ${(analysis.contradictions || []).length}`);
    lines.push(`- Near duplicates: ${(analysis.nearDuplicates || []).length}`);
    lines.push(`- Possible secrets/PII: ${(analysis.secretFindings || []).length}`);
    lines.push(`- Low-trust files: ${analysis.health.lowTrustFiles}`);
    lines.push('- Reports: `contradictions.md`, `staleness-report.md`, `semantic-warnings.md`, `authority-graph.md`, `repo-health.md`, `duplicates.md`');
  }

  lines.push('', '## Topic Clusters', '');
  for (const cluster of analysis.clusters.slice(0, 40)) {
    lines.push(`- ${cluster.name} — ${cluster.files} files, ${cluster.words} words, ${cluster.internalEdges} internal links, ${cluster.externalEdges} external links`);
    for (const doc of cluster.topDocs.slice(0, 4)) {
      lines.push(`  - ${doc.relativePath}`);
    }
  }

  lines.push('', '## Hub And Bridge Files', '');
  if (analysis.hubs.length) {
    lines.push('Hubs:');
    for (const hub of analysis.hubs.slice(0, 20)) {
      lines.push(`- ${hub.doc.relativePath} — ${hub.degree} total links, ${hub.incoming} in, ${hub.outgoing} out`);
    }
  }
  if (analysis.bridges.length) {
    lines.push('', 'Bridges:');
    for (const bridge of analysis.bridges.slice(0, 20)) {
      lines.push(`- ${bridge.doc.relativePath} — ${bridge.crossClusterEdges} cross-cluster links, ${bridge.degree} total links`);
    }
  }

  const importEdges = graph.edges.filter((edge) => edge.kind === 'import' || edge.kind === 'test-coverage');
  if (importEdges.length) {
    lines.push('', '## Code Import Map', '');
    for (const edge of importEdges.slice(0, 240)) {
      const lineLabel = edge.line ? ` line ${edge.line}` : '';
      lines.push(`- ${edge.source.relativePath} -> ${edge.target.relativePath} (${edge.kind}, ${edge.specifier || edge.text}${lineLabel})`);
    }
    if (importEdges.length > 240) lines.push(`- ...${importEdges.length - 240} more import/test edges`);
  }

  if (analysis.symbolDocuments.length) {
    lines.push('', '## Symbol Index', '');
    for (const doc of analysis.symbolDocuments.slice(0, 80)) {
      const symbols = doc.symbols
        .slice(0, 12)
        .map((symbol) => `${symbol.kind}:${symbol.name}@${symbol.line}`)
        .join(', ');
      lines.push(`- ${doc.relativePath}: ${symbols}`);
    }
  }

  if (analysis.orphans.length) {
    lines.push('', '## Orphan Candidates', '');
    for (const orphan of analysis.orphans.slice(0, 40)) {
      lines.push(`- ${orphan.relativePath} — no resolved links in or out`);
    }
  }

  lines.push(
    '',
    '## High-Signal Files',
    ''
  );

  if (topLinked.length) {
    for (const item of topLinked) {
      lines.push(
        `- ${item.doc.relativePath} — ${item.degree} links, ${item.doc.words} words, ${item.doc.headings.length} headings`
      );
    }
  } else {
    for (const doc of documents.slice(0, 30)) {
      lines.push(`- ${doc.relativePath} — ${doc.words} words, ${doc.lines} lines`);
    }
  }

  lines.push('', '## Folder Map', '');
  for (const entry of renderFolderMap(documents).slice(0, 240)) {
    lines.push(entry);
  }

  lines.push('', '## Link Graph', '');
  if (graph.edges.length) {
    for (const edge of graph.edges.slice(0, 300)) {
      lines.push(`- ${edge.source.relativePath} -> ${edge.target.relativePath} (${edge.kind}: ${edge.text})`);
    }
    if (graph.edges.length > 300) lines.push(`- ...${graph.edges.length - 300} more resolved links`);
  } else {
    lines.push('No Markdown note links resolved.');
  }

  if (graph.unresolvedLinks.length) {
    lines.push('', '## Unresolved Links', '');
    for (const link of graph.unresolvedLinks.slice(0, 200)) {
      lines.push(`- ${link.source.relativePath} -> ${link.target} (${link.kind})`);
    }
    if (graph.unresolvedLinks.length > 200) lines.push(`- ...${graph.unresolvedLinks.length - 200} more unresolved links`);
  }

  lines.push('', '## File Summaries', '');
  for (const doc of documents) {
    lines.push(`### ${doc.relativePath}`);
    lines.push(`- Type: ${doc.type}`);
    lines.push(`- Size: ${doc.size} bytes`);
    lines.push(`- Words: ${doc.words}`);
    lines.push(`- Lines: ${doc.lines}`);
    lines.push(`- Headings: ${doc.headings.length ? doc.headings.map((heading) => heading.text).join(' | ') : 'None'}`);
    lines.push(`- Tags: ${doc.tags.length ? doc.tags.join(', ') : 'None'}`);
    lines.push(`- Aliases: ${doc.aliases.length ? doc.aliases.join(', ') : 'None'}`);
    lines.push(`- Symbols: ${doc.symbols.length ? doc.symbols.slice(0, 12).map((symbol) => `${symbol.kind}:${symbol.name}@${symbol.line}`).join(', ') : 'None'}`);
    lines.push(`- Imports: ${doc.imports.length ? doc.imports.slice(0, 12).map((item) => `${item.specifier}@${item.line}`).join(', ') : 'None'}`);
    lines.push(`- Trust: ${doc.trust ? `${doc.trust.score}/100${doc.trust.supersededBy ? `, superseded by ${doc.trust.supersededBy}` : ''}` : 'Not scored'}`);
    lines.push(`- Excerpt: ${createPlainTextExcerpt(doc.content, 420) || 'No readable text.'}`);
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function renderClaudeMindMap(root, documents, graph, config, analysis) {
  const generatedAt = config.generatedAt || new Date().toISOString();
  const rootLabel = cleanMermaidMindMapLabel(path.basename(root) || 'Repository');
  const topLinked = analysis.hubs.slice(0, 30);
  const highSignal = topLinked.length ? topLinked.map((item) => item.doc) : documents.slice(0, 30);
  const folders = renderFolderMap(documents).slice(0, 40);
  const tags = getTopTags(documents).slice(0, 40);
  const lines = [
    '# Claude Context Mind Map',
    '',
    `Generated: ${generatedAt}`,
    `Schema: ${CONTEXT_SCHEMA_VERSION}`,
    `Profile: ${config.profile || DEFAULT_CONTEXT_PROFILE} (${config.profileLabel || CONTEXT_PROFILES[DEFAULT_CONTEXT_PROFILE].label})`,
    `Fingerprint: ${config.exportFingerprint || 'pending'}`,
    `Root: ${root}`,
    `Files indexed: ${documents.length}`,
    `Resolved links: ${graph.edges.length}`,
    `Unresolved links: ${graph.unresolvedLinks.length}`,
    `Repo health score: ${analysis.health?.score ?? 'n/a'}/100`,
    `Limits: max ${config.maxFiles} files, max ${config.maxBytes} bytes per file, max depth ${config.maxDepth}`,
    renderDiscoverySummaryLine(config),
    '',
    '## Mermaid Mind Map',
    '',
    '```mermaid',
    'mindmap',
    `  root((${rootLabel}))`
  ];

  lines.push('    High Signal Files');
  for (const doc of highSignal) {
    lines.push(`      ${cleanMermaidMindMapLabel(doc.relativePath)}`);
    for (const heading of doc.headings.slice(0, 4)) {
      lines.push(`        ${cleanMermaidMindMapLabel(heading.text)}`);
    }
  }

  if (analysis.routes.length) {
    lines.push('    LLM Navigation Routes');
    for (const route of analysis.routes) {
      lines.push(`      ${cleanMermaidMindMapLabel(route.name)}`);
      for (const doc of route.documents.slice(0, 6)) {
        lines.push(`        ${cleanMermaidMindMapLabel(doc.relativePath)}`);
      }
    }
  }

  const importEdges = graph.edges.filter((edge) => edge.kind === 'import' || edge.kind === 'test-coverage');
  if (importEdges.length) {
    lines.push('    Code Imports');
    for (const edge of importEdges.slice(0, 28)) {
      lines.push(`      ${cleanMermaidMindMapLabel(`${edge.source.relativePath} -> ${edge.target.relativePath}`)}`);
    }
  }

  if (analysis.symbolDocuments.length) {
    lines.push('    Symbols');
    for (const doc of analysis.symbolDocuments.slice(0, 18)) {
      lines.push(`      ${cleanMermaidMindMapLabel(doc.relativePath)}`);
      for (const symbol of doc.symbols.slice(0, 4)) {
        lines.push(`        ${cleanMermaidMindMapLabel(`${symbol.kind}: ${symbol.name}`)}`);
      }
    }
  }

  if (analysis.clusters.length) {
    lines.push('    Clusters');
    for (const cluster of analysis.clusters.slice(0, 18)) {
      lines.push(`      ${cleanMermaidMindMapLabel(`${cluster.name} - ${cluster.files} files`)}`);
      for (const doc of cluster.topDocs.slice(0, 3)) {
        lines.push(`        ${cleanMermaidMindMapLabel(doc.relativePath)}`);
      }
    }
  }

  lines.push('    Folders');
  for (const folderEntry of folders) {
    lines.push(`      ${cleanMermaidMindMapLabel(folderEntry.replace(/^- /, ''))}`);
  }

  if (tags.length) {
    lines.push('    Tags');
    for (const tag of tags) {
      lines.push(`      ${cleanMermaidMindMapLabel(`${tag.tag} - ${tag.count}`)}`);
    }
  }

  if (graph.edges.length) {
    lines.push('    Link Hubs');
    for (const item of topLinked.slice(0, 18)) {
      lines.push(`      ${cleanMermaidMindMapLabel(`${item.doc.relativePath} - ${item.degree} links`)}`);
    }
  }

  if (graph.unresolvedLinks.length) {
    lines.push('    Unresolved Links');
    for (const link of graph.unresolvedLinks.slice(0, 24)) {
      lines.push(`      ${cleanMermaidMindMapLabel(`${link.source.relativePath} to ${link.target}`)}`);
    }
  }

  lines.push('```', '', '## Claude Prompts', '');
  lines.push('- Use the Mermaid mind map above to explain this repo or vault as a system.');
  lines.push('- Identify weakly connected files and suggest missing links or docs.');
  lines.push('- Propose a better folder/topic map, citing source paths from this file.');
  lines.push('- Convert the map into an implementation plan with risks and test targets.');
  lines.push('', '## Source Nodes', '');

  for (const doc of highSignal) {
    lines.push(`- ${doc.relativePath}: ${doc.words} words, ${doc.lines} lines, ${doc.headings.length} headings`);
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function renderClaudeNavigationGuide(root, documents, graph, config, analysis) {
  const generatedAt = config.generatedAt || new Date().toISOString();
  const lines = [
    '# Claude Context Navigation Guide',
    '',
    `Generated: ${generatedAt}`,
    `Schema: ${CONTEXT_SCHEMA_VERSION}`,
    `Profile: ${config.profile || DEFAULT_CONTEXT_PROFILE} (${config.profileLabel || CONTEXT_PROFILES[DEFAULT_CONTEXT_PROFILE].label})`,
    `Fingerprint: ${config.exportFingerprint || 'pending'}`,
    `Root: ${root}`,
    `Files indexed: ${documents.length}`,
    `Resolved links: ${graph.edges.length}`,
    `Unresolved links: ${graph.unresolvedLinks.length}`,
    `Limits: max ${config.maxFiles} files, max ${config.maxBytes} bytes per file, max depth ${config.maxDepth}`,
    renderDiscoverySummaryLine(config),
    '',
    '## How Claude Or ChatGPT Should Use This',
    '',
    '1. Read this navigation guide first.',
    '2. Use the routes to choose which files matter for the question.',
    '3. Cite paths from the route or cluster before proposing edits.',
    '4. Ask for missing files only when the route does not contain enough evidence.',
    '5. Save useful new summaries back into the vault as Markdown notes when asked.',
    '',
    '## Routes',
    ''
  ];

  for (const route of analysis.routes) {
    lines.push(`### ${route.name}`);
    lines.push(route.goal);
    lines.push('');
    for (const doc of route.documents) {
      const trust = doc.trust ? `, trust ${doc.trust.score}/100` : '';
      lines.push(`- ${doc.relativePath} — ${doc.words} words, ${doc.headings.length} headings${trust}`);
    }
    lines.push('');
  }

  if (analysis.edgeKinds.length) {
    lines.push('## Edge Kinds', '');
    for (const item of analysis.edgeKinds) {
      lines.push(`- ${item.kind}: ${item.count}`);
    }
    lines.push('');
  }

  const importEdges = graph.edges.filter((edge) => edge.kind === 'import' || edge.kind === 'test-coverage');
  if (importEdges.length) {
    lines.push('## Code Import And Test Coverage Map', '');
    for (const edge of importEdges.slice(0, 120)) {
      const lineLabel = edge.line ? ` line ${edge.line}` : '';
      lines.push(`- ${edge.source.relativePath} -> ${edge.target.relativePath} (${edge.kind}, ${edge.specifier || edge.text}${lineLabel})`);
    }
    if (importEdges.length > 120) lines.push(`- ...${importEdges.length - 120} more import/test edges`);
    lines.push('');
  }

  if (analysis.symbolDocuments.length) {
    lines.push('## Symbol Index', '');
    for (const doc of analysis.symbolDocuments.slice(0, 60)) {
      const symbols = doc.symbols
        .slice(0, 8)
        .map((symbol) => `${symbol.kind}:${symbol.name}@${symbol.line}`)
        .join(', ');
      lines.push(`- ${doc.relativePath}: ${symbols}`);
    }
    lines.push('');
  }

  lines.push('## Cluster Index', '');
  for (const cluster of analysis.clusters) {
    lines.push(`### ${cluster.name}`);
    lines.push(`Files: ${cluster.files}. Words: ${cluster.words}. Internal links: ${cluster.internalEdges}. External links: ${cluster.externalEdges}.`);
    if (cluster.topDocs.length) {
      lines.push('Start here:');
      for (const doc of cluster.topDocs.slice(0, 8)) {
        lines.push(`- ${doc.relativePath}`);
      }
    }
    lines.push('');
  }

  lines.push('## Risk And Cleanup Signals', '');
  if (analysis.health) {
    lines.push(`Repo health: ${analysis.health.score}/100`);
    if (analysis.health.topActions?.length) {
      lines.push('');
      lines.push('Top actions:');
      for (const action of analysis.health.topActions.slice(0, 8)) {
        const citations = action.citations?.length ? ` (${action.citations.slice(0, 3).join(', ')})` : '';
        lines.push(`- ${action.priority}: ${action.action}${citations}`);
      }
    }
  }
  if (analysis.contradictions?.length) {
    lines.push('', 'Contradictions:');
    for (const item of analysis.contradictions.slice(0, 12)) {
      lines.push(`- ${item.key} — ${item.values.join(' vs ')} (${item.examples.map((example) => example.source).join(', ')})`);
    }
  }
  if (analysis.nearDuplicates?.length) {
    lines.push('', 'Near-duplicate candidates:');
    for (const item of analysis.nearDuplicates.slice(0, 12)) {
      lines.push(`- ${item.left} ≈ ${item.right} (${Math.round(item.similarity * 100)}%); canonical: ${item.canonical}`);
    }
  }
  if (analysis.secretFindings?.length) {
    lines.push('', 'Possible secrets/PII:');
    for (const finding of analysis.secretFindings.slice(0, 12)) {
      lines.push(`- ${finding.type} at ${finding.source} (fingerprint ${finding.fingerprint})`);
    }
  }
  if (analysis.bridges.length) {
    lines.push('Bridge files that connect distant clusters:');
    for (const bridge of analysis.bridges.slice(0, 30)) {
      lines.push(`- ${bridge.doc.relativePath} — ${bridge.crossClusterEdges} cross-cluster links`);
    }
  }
  if (analysis.orphans.length) {
    lines.push('', 'Orphans with no resolved links:');
    for (const orphan of analysis.orphans.slice(0, 60)) {
      lines.push(`- ${orphan.relativePath}`);
    }
  }
  if (analysis.unresolvedBySource.length) {
    lines.push('', 'Files with unresolved links:');
    for (const item of analysis.unresolvedBySource.slice(0, 30)) {
      lines.push(`- ${item.doc.relativePath} — ${item.count} unresolved`);
    }
  }

  lines.push('', '## App Workflow', '');
  lines.push('- Open the folder in Shibanshu Markdown Viewer to browse this same graph visually.');
  lines.push('- Use the graph search to jump between hubs and bridge files.');
  lines.push('- Use Mind Map on a specific note to inspect headings, tasks, backlinks, and unresolved links.');
  lines.push('- Use Copy for AI after changing notes to create a fresh model-readable map.');
  lines.push('- Use `athena context <folder> --out <folder>` to regenerate this guide offline.');

  return `${lines.join('\n').trimEnd()}\n`;
}

function renderContradictionsReport(root, documents, graph, config, analysis) {
  const lines = [
    '# Contradictions Report',
    '',
    `Generated: ${config.generatedAt || new Date().toISOString()}`,
    `Root: ${root}`,
    '',
    'Every item below is heuristic and must be resolved against the cited source lines.',
    ''
  ];
  if (!analysis.contradictions?.length) {
    lines.push('No numeric contradictions detected.');
  } else {
    for (const item of analysis.contradictions) {
      lines.push(`## ${item.key}`);
      lines.push(`Confidence: ${Math.round(item.confidence * 100)}%`);
      lines.push(`Values: ${item.values.join(' vs ')}`);
      lines.push('');
      for (const example of item.examples) {
        lines.push(`- ${example.value} at ${example.source} — ${example.excerpt}`);
      }
      lines.push('');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function renderStalenessReport(root, documents, graph, config, analysis) {
  const lines = [
    '# Staleness And Trust Report',
    '',
    `Generated: ${config.generatedAt || new Date().toISOString()}`,
    `Root: ${root}`,
    '',
    'Trust combines graph references, recency, contradictions, near-duplicates, generated-path risk, and secret/PII findings.',
    '',
    '## Lowest Trust Files',
    ''
  ];
  for (const item of (analysis.staleness || []).slice(0, 80)) {
    const superseded = item.supersededBy ? `; superseded by ${item.supersededBy}` : '';
    const signals = item.signals?.length ? `; ${item.signals.join('; ')}` : '';
    lines.push(`- ${item.path} — ${item.score}/100; last verified ${item.lastVerified || 'unknown'}${superseded}${signals}`);
  }
  if (!analysis.staleness?.length) lines.push('No staleness data available.');
  return `${lines.join('\n').trimEnd()}\n`;
}

function renderSemanticWarningsReport(root, documents, graph, config, analysis) {
  const lines = [
    '# Semantic Warnings',
    '',
    `Generated: ${config.generatedAt || new Date().toISOString()}`,
    `Root: ${root}`,
    '',
    'Warnings are generated locally from indexed content and graph structure.',
    ''
  ];
  if (!analysis.semanticWarnings?.length) {
    lines.push('No semantic warnings detected.');
  } else {
    for (const warning of analysis.semanticWarnings) {
      lines.push(`## ${warning.type}`);
      lines.push(`Severity: ${warning.severity}`);
      lines.push(`Confidence: ${Math.round(warning.confidence * 100)}%`);
      lines.push(warning.message);
      if (warning.citations?.length) {
        lines.push('');
        for (const citation of warning.citations) lines.push(`- ${citation}`);
      }
      lines.push('');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function renderAuthorityGraphReport(root, documents, graph, config, analysis) {
  const lines = [
    '# Authority Graph',
    '',
    `Generated: ${config.generatedAt || new Date().toISOString()}`,
    `Root: ${root}`,
    '',
    'Canonical sources are inferred from graph degree, file naming, path, recency, and topic coverage.',
    ''
  ];
  if (!analysis.authority?.length) {
    lines.push('No multi-source authority topics detected.');
  } else {
    for (const item of analysis.authority.slice(0, 120)) {
      lines.push(`## ${item.topic}`);
      lines.push(`Canonical: ${item.canonical}`);
      lines.push(`Confidence: ${Math.round(item.confidence * 100)}%`);
      lines.push('');
      for (const source of item.sources) {
        lines.push(`- ${source.path} — authority score ${source.score}; citation ${source.citation}`);
      }
      lines.push('');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function renderRepoHealthReport(root, documents, graph, config, analysis) {
  const health = analysis.health || {};
  const lines = [
    '# Repo Health',
    '',
    `Generated: ${config.generatedAt || new Date().toISOString()}`,
    `Root: ${root}`,
    '',
    `Score: ${health.score ?? 'n/a'}/100`,
    '',
    '## Counts',
    '',
    `- Files: ${health.files ?? documents.length}`,
    `- Edges: ${health.edges ?? graph.edges.length}`,
    `- Unresolved links/imports: ${health.unresolvedLinks ?? graph.unresolvedLinks.length}`,
    `- Orphans: ${health.orphans ?? analysis.orphans.length}`,
    `- Near duplicates: ${health.nearDuplicates ?? 0}`,
    `- Contradictions: ${health.contradictions ?? 0}`,
    `- Possible secrets/PII: ${health.possibleSecretsOrPii ?? 0}`,
    `- Low-trust files: ${health.lowTrustFiles ?? 0}`,
    '',
    '## Action List',
    ''
  ];
  if (!health.topActions?.length) {
    lines.push('No high-priority health actions detected.');
  } else {
    for (const action of health.topActions) {
      lines.push(`### ${action.priority}`);
      lines.push(action.action);
      if (action.citations?.length) {
        lines.push('');
        for (const citation of action.citations.slice(0, 12)) lines.push(`- ${citation}`);
      }
      lines.push('');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function renderDuplicateReport(root, documents, graph, config, analysis) {
  const lines = [
    '# Near-Duplicate Files',
    '',
    `Generated: ${config.generatedAt || new Date().toISOString()}`,
    `Root: ${root}`,
    ''
  ];
  if (!analysis.nearDuplicates?.length) {
    lines.push('No near-duplicate files detected.');
  } else {
    for (const item of analysis.nearDuplicates) {
      lines.push(`- ${item.left} is ${Math.round(item.similarity * 100)}% similar to ${item.right}; canonical: ${item.canonical}; archive candidate: ${item.candidateToArchive}. ${item.reason}`);
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function getTopLinkedDocuments(documents, graph, metrics = getDocumentGraphMetrics(documents, graph)) {
  return documents
    .map((doc) => {
      const docMetrics = metrics.get(doc.relativePath) || {};
      return {
        doc,
        degree: docMetrics.degree || 0,
        incoming: docMetrics.incoming || 0,
        outgoing: docMetrics.outgoing || 0
      };
    })
    .filter((item) => item.degree > 0)
    .sort((left, right) => right.degree - left.degree || left.doc.relativePath.localeCompare(right.doc.relativePath));
}

function getTopTags(documents) {
  const counts = new Map();
  for (const doc of documents) {
    for (const tag of doc.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));
}

function renderFolderMap(documents) {
  const folders = new Map();
  for (const doc of documents) {
    const folder = path.dirname(doc.relativePath) === '.' ? '/' : path.dirname(doc.relativePath);
    folders.set(folder, (folders.get(folder) || 0) + 1);
  }
  return [...folders.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([folder, count]) => `- ${folder} — ${count} file${count === 1 ? '' : 's'}`);
}

function cleanMermaidMindMapLabel(value) {
  return String(value || 'Untitled')
    .replace(/[`*_~[\](){}<>|\\]/g, ' ')
    .replace(/:/g, ' -')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

function getDocumentKeys(doc) {
  const withoutExt = stripKnownExtension(doc.relativePath);
  const basename = path.basename(doc.relativePath);
  const basenameWithoutExt = stripKnownExtension(basename);
  return new Set(
    [doc.relativePath, withoutExt, basename, basenameWithoutExt, doc.title, stripKnownExtension(doc.title), ...(doc.aliases || [])]
      .map(normalizeLinkTarget)
      .filter(Boolean)
  );
}

function resolveLinkDocument(target, source, keyToDocument) {
  for (const candidate of getLinkTargetCandidates(target, source)) {
    const doc = keyToDocument.get(candidate);
    if (doc) return doc;
  }
  return null;
}

function getLinkTargetCandidates(target, source) {
  const rawTarget = String(target || '').split('#')[0].split('?')[0].trim();
  const candidates = new Set([normalizeLinkTarget(rawTarget)]);
  if (!rawTarget || /^[a-z][a-z0-9+.-]*:/i.test(rawTarget)) return [...candidates].filter(Boolean);

  const sourceDir = path.posix.dirname(source.relativePath);
  if (sourceDir && sourceDir !== '.') {
    candidates.add(normalizeLinkTarget(path.posix.normalize(path.posix.join(sourceDir, rawTarget))));
  }
  if (rawTarget.startsWith('/')) {
    candidates.add(normalizeLinkTarget(rawTarget.slice(1)));
  }

  return [...candidates].filter(Boolean);
}

function extractFrontmatterMetadata(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { aliases: [], tags: [] };

  const aliases = [];
  const tags = [];
  let currentList = null;

  for (let index = 1; index < Math.min(lines.length, 120); index += 1) {
    const line = lines[index];
    if (line.trim() === '---') break;

    const keyValue = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (keyValue) {
      const key = keyValue[1].toLowerCase();
      const value = keyValue[2].trim();
      currentList = ['aliases', 'alias', 'tags'].includes(key) && !value ? key : null;
      if (key === 'aliases' || key === 'alias') aliases.push(...parseFrontmatterValues(value));
      if (key === 'tags') tags.push(...parseFrontmatterValues(value).map(normalizeFrontmatterTag));
      continue;
    }

    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && currentList) {
      const values = parseFrontmatterValues(listItem[1]);
      if (currentList === 'aliases' || currentList === 'alias') aliases.push(...values);
      if (currentList === 'tags') tags.push(...values.map(normalizeFrontmatterTag));
    }
  }

  return {
    aliases: mergeUnique(aliases.map(cleanFrontmatterValue).filter(Boolean)),
    tags: mergeUnique(tags.map(cleanFrontmatterValue).filter(Boolean))
  };
}

function parseFrontmatterValues(value) {
  const cleaned = cleanFrontmatterValue(value);
  if (!cleaned) return [];
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    return cleaned
      .slice(1, -1)
      .split(',')
      .map(cleanFrontmatterValue)
      .filter(Boolean);
  }
  return [cleaned];
}

function cleanFrontmatterValue(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function normalizeFrontmatterTag(value) {
  const cleaned = cleanFrontmatterValue(value).replace(/^#/, '');
  return cleaned ? `#${cleaned}` : '';
}

function extractHeadings(markdown) {
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
    headings.push({ level: match[1].length, text: match[2], line: index + 1 });
  }

  return headings;
}

function extractTags(markdown) {
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

function extractMarkdownLinks(markdown) {
  const links = [];
  let inFence = false;
  const lines = String(markdown || '').split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    for (const match of line.matchAll(/(!?)\[\[([^\]]+)]]/g)) {
      const rawTarget = match[2].split('|')[0].split('#')[0].trim();
      links.push({
        target: rawTarget,
        text: match[2].trim(),
        kind: match[1] ? 'embed' : 'wiki-link',
        line: index + 1
      });
    }

    for (const match of line.matchAll(/(!?)\[([^\]]+)]\(([^)]+)\)/g)) {
      const rawTarget = match[3].split('#')[0].trim();
      if (/^[a-z][a-z0-9+.-]*:/i.test(rawTarget)) continue;
      links.push({
        target: rawTarget,
        text: match[2].trim(),
        kind: match[1] ? 'embed' : 'markdown-link',
        line: index + 1
      });
    }
  }

  return links;
}

function extractDocumentLinks(relativePath, content, extension) {
  const markdownLinks = extractMarkdownLinks(content);
  if (extension !== '.canvas') return markdownLinks;
  return [...markdownLinks, ...extractJsonCanvasLinks(content)];
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
        kind: 'canvas-card',
        line: 1
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
        text: String(edge.label || 'Canvas connection').trim() || 'Canvas connection',
        line: 1
      };
    })
    .filter(Boolean);
}

function extractCodeImports(content, relativePath, extension) {
  const imports = [];
  const lines = String(content || '').split(/\r?\n/);
  const isJavaScriptLike = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'].includes(extension);
  const isPython = extension === '.py';
  const isCss = extension === '.css';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isJavaScriptLike) {
      for (const match of line.matchAll(/\b(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
        imports.push({
          specifier: match[1],
          imported: inferImportedNameFromJsImport(line, match[1]),
          line: index + 1
        });
      }
      for (const match of line.matchAll(/\b(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        imports.push({
          specifier: match[1],
          imported: match[1],
          line: index + 1
        });
      }
    } else if (isPython) {
      const fromMatch = line.match(/^\s*from\s+([.\w]+)\s+import\s+(.+?)\s*$/);
      if (fromMatch) {
        imports.push({
          specifier: pythonModuleToSpecifier(fromMatch[1], relativePath),
          imported: fromMatch[2].split('#')[0].trim(),
          line: index + 1
        });
        continue;
      }
      const importMatch = line.match(/^\s*import\s+([.\w]+)(?:\s+as\s+\w+)?\s*$/);
      if (importMatch && importMatch[1].startsWith('.')) {
        imports.push({
          specifier: pythonModuleToSpecifier(importMatch[1], relativePath),
          imported: importMatch[1],
          line: index + 1
        });
      }
    } else if (isCss) {
      for (const match of line.matchAll(/@import\s+(?:url\()?['"]?([^'")]+)['"]?\)?/g)) {
        imports.push({
          specifier: match[1],
          imported: match[1],
          line: index + 1
        });
      }
    }
  }

  return dedupeBy(imports, (item) => `${item.specifier}:${item.line}:${item.imported}`);
}

function inferImportedNameFromJsImport(line, specifier) {
  const named = line.match(/\{\s*([^}]+?)\s*}/);
  if (named) return named[1].replace(/\s+as\s+/g, ' as ').replace(/\s+/g, ' ').trim();
  const defaultMatch = line.match(/^\s*import\s+([A-Za-z_$][\w$]*)/);
  if (defaultMatch) return defaultMatch[1];
  return specifier;
}

function pythonModuleToSpecifier(moduleName, relativePath) {
  const module = String(moduleName || '');
  const leadingDots = module.match(/^\.+/)?.[0].length || 0;
  const body = module.slice(leadingDots).replaceAll('.', '/');
  if (!leadingDots) return body;

  let current = path.posix.dirname(relativePath);
  for (let count = 1; count < leadingDots; count += 1) {
    current = path.posix.dirname(current);
  }
  return path.posix.normalize(path.posix.join(current === '.' ? '' : current, body || '__init__'));
}

function extractDocumentSymbols(content, extension, type) {
  if (type === 'markdown') {
    return extractHeadings(content).slice(0, 40).map((heading) => ({
      name: heading.text,
      kind: 'heading',
      line: heading.line
    }));
  }

  const symbols = [];
  const lines = String(content || '').split(/\r?\n/);
  const isJavaScriptLike = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'].includes(extension);
  const isPython = extension === '.py';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isJavaScriptLike) {
      const functionMatch = line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/);
      const classMatch = line.match(/^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/);
      const variableMatch = line.match(/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
      const typeMatch = line.match(/^\s*export\s+(?:type|interface|enum)\s+([A-Za-z_$][\w$]*)/);
      if (functionMatch) symbols.push({ name: functionMatch[1], kind: 'function', line: index + 1 });
      if (classMatch) symbols.push({ name: classMatch[1], kind: 'class', line: index + 1 });
      if (variableMatch) symbols.push({ name: variableMatch[1], kind: 'variable', line: index + 1 });
      if (typeMatch) symbols.push({ name: typeMatch[1], kind: 'type', line: index + 1 });
    } else if (isPython) {
      const functionMatch = line.match(/^\s*def\s+([A-Za-z_][\w]*)\s*\(/);
      const asyncFunctionMatch = line.match(/^\s*async\s+def\s+([A-Za-z_][\w]*)\s*\(/);
      const classMatch = line.match(/^\s*class\s+([A-Za-z_][\w]*)/);
      if (functionMatch) symbols.push({ name: functionMatch[1], kind: 'function', line: index + 1 });
      if (asyncFunctionMatch) symbols.push({ name: asyncFunctionMatch[1], kind: 'function', line: index + 1 });
      if (classMatch) symbols.push({ name: classMatch[1], kind: 'class', line: index + 1 });
    }
  }

  return dedupeBy(symbols, (item) => `${item.kind}:${item.name}:${item.line}`).slice(0, 80);
}

function extractCodeCalls(content, extension) {
  const supported = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.py'];
  if (!supported.includes(extension)) return [];
  const calls = [];
  const lines = String(content || '').split(/\r?\n/);
  const ignored = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'new',
    'class', 'import', 'export', 'await', 'yield', 'console', 'Math', 'Date',
    'len', 'print', 'range', 'super'
  ].map((item) => item.toLowerCase()));

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/\/\/.*$/, '').replace(/#.*$/, '');
    for (const match of line.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = match[1];
      if (ignored.has(name.toLowerCase())) continue;
      calls.push({ name, line: index + 1 });
    }
  }

  return dedupeBy(calls, (item) => `${item.name}:${item.line}`).slice(0, 240);
}

function resolveImportDocument(specifier, source, keyToDocument) {
  if (!isLocalImportSpecifier(specifier)) return null;

  const sourceDir = path.posix.dirname(source.relativePath);
  const base = path.posix.normalize(path.posix.join(sourceDir === '.' ? '' : sourceDir, specifier));
  const candidates = [
    base,
    stripKnownExtension(base),
    ...[...CODE_EXTENSIONS, ...MARKDOWN_EXTENSIONS].map((extension) => `${base}${extension}`),
    ...[...CODE_EXTENSIONS, ...MARKDOWN_EXTENSIONS].map((extension) => path.posix.join(base, `index${extension}`)),
    path.posix.join(base, '__init__.py')
  ];

  for (const candidate of candidates) {
    const doc = keyToDocument.get(normalizeLinkTarget(candidate));
    if (doc) return doc;
  }
  return null;
}

function isLocalImportSpecifier(specifier) {
  return String(specifier || '').startsWith('.') || String(specifier || '').startsWith('/');
}

function isTestFile(relativePath) {
  return /(^|\/)(__tests__|test|tests|spec|specs)\//i.test(relativePath) || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(relativePath);
}

function normalizeLinkTarget(value) {
  return String(value || '')
    .replaceAll('\\', '/')
    .replace(/^\.\//, '')
    .replace(/\.(md|markdown|mdown|mkd|mdx|txt|canvas)$/i, '')
    .trim()
    .toLowerCase();
}

function stripKnownExtension(value) {
  return String(value || '').replace(/\.(md|markdown|mdown|mkd|mdx|txt|canvas|cjs|css|html|js|json|jsx|mjs|py|rb|rs|sh|sql|swift|ts|tsx|yaml|yml)$/i, '');
}

function mergeUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function dedupeBy(values, getKey) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function renderContextChunks(documents, config) {
  const chunks = [];
  const targetTokens = Math.max(200, Number(config.chunkTokens) || DEFAULT_CHUNK_TOKENS);

  for (const doc of documents) {
    const lines = String(doc.content || '').split(/\r?\n/);
    let startLine = 1;
    let chunkLines = [];
    let tokenEstimate = 0;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const nextEstimate = estimateTokens(`${line}\n`);
      if (chunkLines.length && tokenEstimate + nextEstimate > targetTokens) {
        chunks.push(buildContextChunk(doc, startLine, index, chunkLines.join('\n'), tokenEstimate, chunks.length, config));
        startLine = index + 1;
        chunkLines = [];
        tokenEstimate = 0;
        if (chunks.length >= MAX_CHUNKS) break;
      }
      chunkLines.push(line);
      tokenEstimate += nextEstimate;
    }

    if (chunks.length >= MAX_CHUNKS) break;
    if (chunkLines.length) {
      chunks.push(buildContextChunk(doc, startLine, startLine + chunkLines.length - 1, chunkLines.join('\n'), tokenEstimate, chunks.length, config));
    }
    if (chunks.length >= MAX_CHUNKS) break;
  }

  return chunks.map((chunk) => JSON.stringify(chunk)).join('\n') + (chunks.length ? '\n' : '');
}

function buildContextChunk(doc, startLine, endLine, text, tokenEstimate, index, config = {}) {
  const id = createHash('sha1')
    .update(`${doc.relativePath}:${startLine}:${endLine}:${index}`)
    .digest('hex')
    .slice(0, 16);
  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    profile: config.profile || DEFAULT_CONTEXT_PROFILE,
    id,
    nodeId: buildStableNodeId(doc.relativePath),
    path: doc.relativePath,
    type: doc.type,
    startLine,
    endLine,
    tokenEstimate,
    headings: doc.headings.filter((heading) => heading.line >= startLine && heading.line <= endLine),
    symbols: doc.symbols.filter((symbol) => symbol.line >= startLine && symbol.line <= endLine),
    tags: doc.tags,
    text
  };
}

function estimateTokens(value) {
  return Math.max(1, Math.ceil(String(value || '').length / 4));
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

// ─── Content Understanding ──────────────────────────────────────────

function extractHeuristicSummary(content, extension, symbols) {
  if (!content || !content.trim()) return '';

  const lines = content.split('\n');
  const ext = (extension || '').toLowerCase();

  // Code files: extract module docstring + exported names
  if (['.js','.mjs','.cjs','.ts','.tsx','.jsx'].includes(ext)) {
    let docstring = '';
    // Look for JSDoc /** ... */ at the top (within first 30 lines)
    const jsDocMatch = content.slice(0, 3000).match(/\/\*\*\s*([\s\S]*?)\*\//);
    if (jsDocMatch) {
      docstring = jsDocMatch[1].replace(/^\s*\*\s?/gm, '').trim().split('\n')[0].trim();
    }
    // Or leading // comments
    if (!docstring) {
      const commentLines = [];
      for (const line of lines.slice(0, 15)) {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') && !trimmed.startsWith('#!/')) {
          commentLines.push(trimmed.replace(/^\/\/\s*/, ''));
        } else if (trimmed && !trimmed.startsWith('#!')) break;
      }
      if (commentLines.length) docstring = commentLines.join(' ').substring(0, 200);
    }
    // Add exported function/class names
    const exportedNames = (symbols || [])
      .filter(s => s.name && (s.kind === 'function' || s.kind === 'class' || s.kind === 'variable'))
      .slice(0, 6)
      .map(s => s.name);
    const exports = exportedNames.length ? `Exports: ${exportedNames.join(', ')}.` : '';
    return [docstring, exports].filter(Boolean).join(' ').substring(0, 300) || '';
  }

  // Python
  if (ext === '.py') {
    // Module docstring
    const pyDocMatch = content.slice(0, 2000).match(/^(?:#!.*\n)?(?:#.*\n)*\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)''')/);
    if (pyDocMatch) {
      const doc = (pyDocMatch[1] || pyDocMatch[2] || '').trim().split('\n')[0];
      const exportedNames = (symbols || []).filter(s => s.kind === 'function' || s.kind === 'class').slice(0, 6).map(s => s.name);
      return [doc, exportedNames.length ? `Defines: ${exportedNames.join(', ')}.` : ''].filter(Boolean).join(' ').substring(0, 300);
    }
  }

  // Markdown: first paragraph after first heading
  if (['.md','.markdown','.mdown','.mkd','.mdx','.txt'].includes(ext)) {
    let pastFirstHeading = false;
    let paragraph = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) { pastFirstHeading = true; continue; }
      if (trimmed === '---' && !pastFirstHeading) continue; // frontmatter
      if (pastFirstHeading && trimmed.length > 20) {
        paragraph = trimmed.replace(/[[\]*_`#>]/g, '').trim();
        break;
      }
    }
    return paragraph.substring(0, 250) || '';
  }

  // JSON config
  if (ext === '.json') {
    try {
      const obj = JSON.parse(content);
      const parts = [];
      if (obj.name) parts.push(obj.name);
      if (obj.description) parts.push(obj.description);
      if (obj.main) parts.push(`Entry: ${obj.main}`);
      return parts.join(' — ').substring(0, 250);
    } catch { return ''; }
  }

  // CSS: first block comment
  if (ext === '.css') {
    const cssComment = content.match(/\/\*([\s\S]*?)\*\//);
    if (cssComment) return cssComment[1].replace(/\s+/g, ' ').trim().substring(0, 200);
    return '';
  }

  return '';
}

function computeTfIdfTopics(documents) {
  if (!documents.length) return;

  // Tokenize each document
  const docTokens = new Map();
  const docFreq = new Map(); // how many docs contain each term

  for (const doc of documents) {
    const text = createPlainTextExcerpt(doc.content, 50000).toLowerCase();
    const tokens = text.split(/[\s,.;:!?()\[\]{}<>"'`/\\|=+\-*&^%$#@~]+/)
      .filter(t => t.length >= 3 && t.length <= 30 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));

    // Count term frequency in this doc
    const tf = new Map();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    docTokens.set(doc.relativePath, { tf, totalTerms: tokens.length });

    // Count document frequency
    for (const term of tf.keys()) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  const totalDocs = documents.length;

  // Compute TF-IDF and assign topics
  for (const doc of documents) {
    const entry = docTokens.get(doc.relativePath);
    if (!entry || !entry.totalTerms) { doc.topics = []; continue; }

    const scores = [];
    for (const [term, count] of entry.tf) {
      const tf = count / entry.totalTerms;
      const idf = Math.log(totalDocs / (docFreq.get(term) || 1));
      scores.push({ term, score: tf * idf });
    }

    scores.sort((a, b) => b.score - a.score);
    doc.topics = scores.slice(0, 8).map(s => s.term);
  }
}

function enrichDocumentSummaries(documents) {
  for (const doc of documents) {
    doc.summary = extractHeuristicSummary(doc.content, doc.extension, doc.symbols);
    if (!doc.topics) doc.topics = [];
  }
}
