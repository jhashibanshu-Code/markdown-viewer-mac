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
  '.cache',
  '.git',
  '.hg',
  '.next',
  '.nuxt',
  '.output',
  '.parcel-cache',
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

await mkdir(outputDir, { recursive: true });
const markdownPath = path.join(outputDir, 'claude-context-map.md');
const mindMapPath = path.join(outputDir, 'claude-context-mind-map.md');
const navigationPath = path.join(outputDir, 'claude-context-navigation.md');
const graphPath = path.join(outputDir, 'claude-context-graph.json');
const chunksPath = path.join(outputDir, 'llm-context-chunks.jsonl');
const scenePath = path.join(outputDir, 'claude-context-scene.json');
const integrityPath = path.join(outputDir, 'context-integrity.json');

await writeFile(markdownPath, markdown, 'utf8');
await writeFile(mindMapPath, mindMapMarkdown, 'utf8');
await writeFile(navigationPath, navigationMarkdown, 'utf8');
await writeFile(chunksPath, contextChunks, 'utf8');
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
  { key: 'scene', file: 'claude-context-scene.json', content: sceneJson }
]);
await writeFile(integrityPath, `${JSON.stringify(integrityPayload, null, 2)}\n`, 'utf8');

console.log(`Claude context map written: ${markdownPath}`);
console.log(`Claude mind map written: ${mindMapPath}`);
console.log(`Claude navigation guide written: ${navigationPath}`);
console.log(`LLM context chunks written: ${chunksPath}`);
console.log(`3D scene graph written: ${scenePath}`);
console.log(`Graph JSON written: ${graphPath}`);
console.log(`Context integrity written: ${integrityPath}`);
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

async function discoverFiles(root, config) {
  const discovered = [];

  async function walk(directory, depth) {
    if (discovered.length >= config.maxFiles || depth > config.maxDepth) return;

    let entries = [];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (_error) {
      return;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (discovered.length >= config.maxFiles) break;
      if (entry.name.startsWith('.') && entry.name !== '.github') continue;

      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue;
        await walk(entryPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!MARKDOWN_EXTENSIONS.has(ext) && !(config.includeCode && CODE_EXTENSIONS.has(ext))) continue;
      discovered.push(entryPath);
    }
  }

  const rootStats = await stat(root);
  if (!rootStats.isDirectory()) {
    throw new Error(`Expected a folder: ${root}`);
  }

  await walk(root, 0);
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
      documents.push({
        absolutePath: filePath,
        relativePath,
        title: path.basename(filePath),
        type,
        extension: ext,
        content,
        size: fileStats.size,
        words: countWords(content),
        lines: content.split(/\r?\n/).length,
        headings: extractHeadings(content),
        tags: type === 'markdown' ? mergeUnique([...extractTags(content), ...frontmatter.tags]) : [],
        aliases: frontmatter.aliases,
        links: type === 'markdown' ? extractDocumentLinks(relativePath, content, ext) : [],
        canvasEdges: ext === '.canvas' ? extractJsonCanvasConnectionEdges(content) : [],
        imports: type === 'code' ? extractCodeImports(content, relativePath, ext) : [],
        symbols: extractDocumentSymbols(content, ext, type)
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
  const edges = [];
  const edgeKeys = new Set();
  const unresolvedLinks = [];

  for (const doc of documents) {
    for (const key of getDocumentKeys(doc)) {
      if (!keyToDocument.has(key)) keyToDocument.set(key, doc);
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

  return {
    metrics,
    clusters,
    hubs,
    bridges,
    edgeKinds,
    symbolDocuments,
    orphans,
    unresolvedBySource,
    routes: buildNavigationRoutes(documents, graph, { clusters, hubs, bridges, edgeKinds, symbolDocuments, orphans, unresolvedBySource })
  };
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
      headings: node.headings.map((heading) => heading.text),
      tags: node.tags,
      aliases: node.aliases,
      symbols: node.symbols,
      imports: node.imports.map((item) => ({
        specifier: item.specifier,
        line: item.line,
        imported: item.imported
      }))
    })),
    edges: graph.edges.map((edge) => ({
      id: buildStableEdgeId(edge),
      source: edge.source.relativePath,
      target: edge.target.relativePath,
      kind: edge.kind,
      text: edge.text,
      line: edge.line,
      specifier: edge.specifier
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
    navigation: serializeContextAnalysis(analysis)
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
    `Limits: max ${config.maxFiles} files, max ${config.maxBytes} bytes per file, max depth ${config.maxDepth}`,
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
    `Limits: max ${config.maxFiles} files, max ${config.maxBytes} bytes per file, max depth ${config.maxDepth}`,
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
      lines.push(`- ${doc.relativePath} — ${doc.words} words, ${doc.headings.length} headings`);
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
