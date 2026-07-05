#!/usr/bin/env node

import { access, mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'shibanshu-extreme-stress-'));
const vaultDir = path.join(tempRoot, 'vault');
const contextDir = path.join(tempRoot, 'context');
const siteDir = path.join(tempRoot, 'site');
const totals = {
  markdownFiles: 0,
  codeFiles: 0
};

await mkdir(vaultDir, { recursive: true });
await createStressVault(vaultDir, totals);

runChecked('validate syntax', [process.execPath, ['scripts/validate-syntax.mjs']]);
runChecked('MCP safety', [process.execPath, ['scripts/mcp-safety-check.mjs']]);

const contextResult = runChecked('context export', [
  process.execPath,
  ['scripts/export-claude-map.mjs', vaultDir, '--out', contextDir, '--profile', 'audit', '--max-files', '900', '--max-bytes', '160000']
]);

if (!contextResult.stdout.includes('Claude navigation guide written')) {
  throw new Error('Context exporter did not report the navigation guide.');
}

await access(path.join(contextDir, 'claude-context-navigation.md'));
await access(path.join(contextDir, 'claude-context-mind-map.md'));
await access(path.join(contextDir, 'claude-context-graph.json'));
await access(path.join(contextDir, 'claude-context-scene.json'));
await access(path.join(contextDir, 'llm-context-chunks.jsonl'));
await access(path.join(contextDir, 'context-integrity.json'));

const graph = JSON.parse(await readFile(path.join(contextDir, 'claude-context-graph.json'), 'utf8'));
assert(graph.schemaVersion === 'shibanshu.context.v1', 'expected graph schema version');
assert(graph.profile === 'audit', 'expected selected context export profile in graph JSON');
assert(typeof graph.fingerprint === 'string' && graph.fingerprint.length >= 16, 'expected context export fingerprint');
assert(graph.routeValidation?.ok === true, 'expected graph route validation to pass');
assert(graph.nodes.length >= totals.markdownFiles + totals.codeFiles - 2, `expected most files to be indexed, got ${graph.nodes.length}`);
assert(graph.nodes.every((node) => node.id && node.startLine === 1 && node.endLine >= node.startLine), 'expected stable node IDs and line ranges');
assert(graph.edges.every((edge) => edge.id && edge.source && edge.target), 'expected stable edge IDs');
assert(graph.navigation?.clusters?.length >= 3, 'expected clustered navigation data');
assert(graph.navigation?.routes?.length >= 2, 'expected LLM navigation routes');
assert(Array.isArray(graph.navigation?.orphans), 'expected orphan analysis');
assert(graph.navigation?.edgeKinds?.some((item) => item.kind === 'import'), 'expected import edge-kind analysis');
assert(graph.navigation?.edgeKinds?.some((item) => item.kind === 'test-coverage'), 'expected test-coverage edge-kind analysis');
assert(graph.navigation?.edgeKinds?.some((item) => item.kind === 'canvas-card'), 'expected canvas-card edge-kind analysis');
assert(graph.navigation?.edgeKinds?.some((item) => item.kind === 'canvas-edge'), 'expected canvas-edge edge-kind analysis');
assert(graph.nodes.some((node) => node.path === 'src/alpha.ts' && node.symbols?.some((symbol) => symbol.name === 'alpha')), 'expected code symbols in graph nodes');
assert(graph.edges.some((edge) => edge.kind === 'import' && edge.source === 'src/index.ts' && edge.target === 'src/alpha.ts'), 'expected resolved local import edge');
assert(graph.edges.some((edge) => edge.kind === 'test-coverage' && edge.source === 'test/index.test.ts' && edge.target === 'src/index.ts'), 'expected test coverage edge');
assert(graph.edges.some((edge) => edge.kind === 'canvas-card' && edge.source === 'Canvas/Project.canvas' && edge.target === 'README.md'), 'expected canvas file-card edge');
assert(
  graph.edges.some((edge) => edge.kind === 'canvas-edge' && edge.source === 'README.md' && edge.target === 'Clusters/Alpha/Alpha 001.md'),
  'expected canvas connection edge'
);
assert(graph.chunks?.path === 'llm-context-chunks.jsonl' && graph.chunks.count > 0, 'expected chunk metadata in graph JSON');
const sceneGraph = JSON.parse(await readFile(path.join(contextDir, 'claude-context-scene.json'), 'utf8'));
assert(sceneGraph.schemaVersion === 'shibanshu.context.v1', 'expected scene schema version');
assert(sceneGraph.profile === '3d-scene', 'expected scene export profile');
assert(sceneGraph.exportProfile === 'audit', 'expected scene to retain selected export profile');
assert(Array.isArray(sceneGraph.nodes) && sceneGraph.nodes.length <= graph.limits.sceneNodeLimit, 'scene export should cap projected node count');
assert(Array.isArray(sceneGraph.edges) && sceneGraph.edges.length <= graph.limits.sceneEdgeLimit, 'scene export should cap projected edge count');
assert(typeof sceneGraph.fingerprint === 'string' && sceneGraph.fingerprint.length >= 8, 'scene export should include deterministic fingerprint');
assert(Array.isArray(sceneGraph.readingOrder) && sceneGraph.readingOrder.length, 'scene export should include reading order');

const firstChunk = JSON.parse((await readFile(path.join(contextDir, 'llm-context-chunks.jsonl'), 'utf8')).trim().split('\n')[0]);
assert(firstChunk.schemaVersion === 'shibanshu.context.v1' && firstChunk.profile === 'audit', 'expected chunk schema/profile metadata');
assert(firstChunk.id && firstChunk.path && firstChunk.startLine >= 1 && firstChunk.endLine >= firstChunk.startLine, 'expected stable chunk metadata');
assert(typeof firstChunk.tokenEstimate === 'number' && firstChunk.tokenEstimate > 0, 'expected chunk token estimate');

const integrity = JSON.parse(await readFile(path.join(contextDir, 'context-integrity.json'), 'utf8'));
assert(integrity.schemaVersion === 'shibanshu.context.v1', 'expected integrity schema version');
assert(integrity.profile === 'audit' && integrity.fingerprint === graph.fingerprint, 'expected integrity profile/fingerprint to match graph');
assert(integrity.routeValidation?.ok === true, 'expected route validation in integrity output');
assert(integrity.artifacts?.some((artifact) => artifact.file === 'claude-context-graph.json' && artifact.sha256?.length === 64), 'expected graph checksum in integrity output');

const navigation = await readFile(path.join(contextDir, 'claude-context-navigation.md'), 'utf8');
for (const phrase of ['Orientation Route', 'Cluster Index', 'Risk And Cleanup Route', 'Shibanshu Markdown Viewer', 'Code Import And Test Coverage Map', 'Symbol Index', 'Edge Kinds']) {
  assert(navigation.includes(phrase), `navigation guide missing ${phrase}`);
}

runChecked('static publish save profile', [
  process.execPath,
  [
    'scripts/publish-static-site.mjs',
    vaultDir,
    '--out',
    siteDir,
    '--title',
    'Extreme Stress Site',
    '--save-profile',
    'stress',
    '--theme',
    'dark',
    '--max-files',
    '650',
    '--max-bytes',
    '160000'
  ]
]);

await access(path.join(siteDir, 'index.html'));
await access(path.join(siteDir, 'assets/site-data.js'));
await access(path.join(siteDir, 'assets/graph.json'));
await access(path.join(vaultDir, '.shibanshu/publish-profiles.json'));

const publishedGraph = JSON.parse(await readFile(path.join(siteDir, 'assets/graph.json'), 'utf8'));
assert(publishedGraph.nodes.length >= totals.markdownFiles - 2, 'static publish graph missed expected Markdown nodes');
assert(publishedGraph.edges.length > 120, 'static publish graph did not preserve dense links');

const unsafePublishedNotePath = path.join(siteDir, 'notes/security/unsafe.html');
await access(unsafePublishedNotePath);
const unsafePublishedNote = await readFile(unsafePublishedNotePath, 'utf8');
assert(!unsafePublishedNote.includes('<script>alert'), 'static publish failed to strip script payloads');
assert(!unsafePublishedNote.includes('javascript:alert'), 'static publish failed to strip javascript URLs');

const profileList = runChecked('static publish list profiles', [
  process.execPath,
  ['scripts/publish-static-site.mjs', vaultDir, '--list-profiles']
]);
assert(profileList.stdout.includes('stress'), 'publish profile list did not include saved profile');

const profileReuseSite = path.join(tempRoot, 'profile-site');
runChecked('static publish reuse profile with override', [
  process.execPath,
  ['scripts/publish-static-site.mjs', vaultDir, '--profile', 'stress', '--out', profileReuseSite, '--max-files', '650']
]);
await access(path.join(profileReuseSite, 'assets/graph.json'));

const badProfile = spawnSync(process.execPath, ['scripts/publish-static-site.mjs', vaultDir, '--save-profile', '../bad', '--out', path.join(tempRoot, 'bad')], {
  cwd: root,
  encoding: 'utf8'
});
assert(badProfile.status !== 0, 'invalid publish profile name should fail');

const cliUrl = runChecked('CLI URL command', [
  process.execPath,
  ['bin/shibanshu-markdown.mjs', 'url', 'mind-map', '--print-url']
]);
assert(cliUrl.stdout.trim() === 'shibanshu-markdown://mind-map', 'CLI URL command emitted an unexpected URL');

const cliWorkflowGraphUrl = runChecked('CLI workflow URL command', [
  process.execPath,
  [
    'bin/shibanshu-markdown.mjs',
    'url',
    'workflow',
    '--surface',
    'graph',
    '--mode',
    'global',
    '--space',
    '3d',
    '--query',
    'extreme stress',
    '--print-url'
  ]
]);
const workflowGraphUrl = cliWorkflowGraphUrl.stdout.trim();
assert(workflowGraphUrl.startsWith('shibanshu-markdown://workflow?'), 'workflow URL should use workflow action');
for (const fragment of ['surface=graph', 'mode=global', 'space=3d']) {
  assert(workflowGraphUrl.includes(fragment), `workflow URL missing ${fragment}`);
}
assert(workflowGraphUrl.includes('query=extreme+stress') || workflowGraphUrl.includes('query=extreme%20stress'), 'workflow URL missing query=extreme stress');

const cliWorkflowMindMapUrl = runChecked('CLI workflow target URL command', [
  process.execPath,
  [
    'bin/shibanshu-markdown.mjs',
    'url',
    'workflow',
    '--surface',
    'mind-map',
    '--target',
    'README.md',
    '--open',
    'true',
    '--print-url'
  ]
]);
const workflowMindMapUrl = cliWorkflowMindMapUrl.stdout.trim();
assert(
  workflowMindMapUrl === 'shibanshu-markdown://workflow?surface=mind-map&target=README.md&open=true',
  `Unexpected workflow mind-map URL: ${workflowMindMapUrl}`
);

const unicodeNote = path.join(tempRoot, 'नोट.md');
runChecked('CLI create unicode note', [
  process.execPath,
  ['bin/shibanshu-markdown.mjs', 'create-note', unicodeNote, '--content', '# Unicode', '--no-open']
]);
assert((await readFile(unicodeNote, 'utf8')).includes('# Unicode'), 'CLI did not create Unicode note path');

const releaseChecksum = runChecked('release checksums', [process.execPath, ['scripts/release-checksums.mjs']]);
assert(releaseChecksum.stdout.includes('Release manifest written'), 'release checksum script did not write manifest');
await access(path.join(root, 'release/release-manifest.json'));

const downloadPage = runChecked('download page', [process.execPath, ['scripts/generate-download-page.mjs']]);
assert(downloadPage.stdout.includes('Download page written'), 'download page script did not run');
const downloadHtml = await readFile(path.join(root, 'docs/download/index.html'), 'utf8');
for (const phrase of ['works offline', 'SHA-256', 'Install', 'Trust And Privacy']) {
  assert(downloadHtml.includes(phrase), `download page missing ${phrase}`);
}

const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
assert(packageJson.build.fileAssociations.some((item) => item.ext === 'mkd'), 'package metadata is missing mkd file association');
assert(packageJson.build.fileAssociations.some((item) => item.ext === 'canvas'), 'package metadata is missing canvas file association');
assert(packageJson.build.win?.target?.includes('nsis'), 'Windows NSIS target missing');
assert(packageJson.build.linux?.target?.includes('AppImage'), 'Linux AppImage target missing');
assert(packageJson.scripts.stress, 'stress script missing from package.json');

const iconStats = await stat(path.join(root, 'build/icon.ico')).catch(() => null);
assert(iconStats && iconStats.size > 1000, 'Windows icon was not generated');

console.log(`Extreme stress check passed in ${tempRoot}`);
console.log(`${totals.markdownFiles} Markdown files and ${totals.codeFiles} code/config files exercised.`);

async function createStressVault(vaultRoot, counters) {
  await writeFile(
    path.join(vaultRoot, 'README.md'),
    [
      '# Extreme Vault',
      '',
      'Start at [[Clusters/Alpha/Alpha 001]] and [[Security/Unsafe]].',
      'See [relative beta](Clusters/Beta/Beta 001.md), [duplicate](Duplicates/A/Same.md), and [[Missing Note]].',
      '',
      '#overview #stress'
    ].join('\n'),
    'utf8'
  );
  counters.markdownFiles += 1;

  await mkdir(path.join(vaultRoot, 'Canvas'), { recursive: true });
  await writeFile(
    path.join(vaultRoot, 'Canvas/Project.canvas'),
    JSON.stringify(
      {
        nodes: [
          { id: 'readme', type: 'file', file: 'README.md', x: 0, y: 0, width: 360, height: 220 },
          { id: 'alpha', type: 'file', file: 'Clusters/Alpha/Alpha 001.md', x: 460, y: 0, width: 360, height: 220 },
          { id: 'context', type: 'text', text: 'Bridge through [[Security/Unsafe]] before release.', x: 230, y: 300, width: 340, height: 180 }
        ],
        edges: [{ id: 'readme-to-alpha', fromNode: 'readme', toNode: 'alpha', label: 'start here' }]
      },
      null,
      2
    ),
    'utf8'
  );

  await writeFile(
    path.join(vaultRoot, 'package.json'),
    JSON.stringify({ name: 'stress-vault', scripts: { test: 'node test/index.test.js' }, dependencies: { demo: '1.0.0' } }, null, 2),
    'utf8'
  );
  counters.codeFiles += 1;

  await mkdir(path.join(vaultRoot, 'src'), { recursive: true });
  await writeFile(path.join(vaultRoot, 'src/index.ts'), 'import { alpha } from "./alpha";\nexport const run = () => alpha();\n', 'utf8');
  await writeFile(path.join(vaultRoot, 'src/alpha.ts'), 'export function alpha() { return "alpha"; }\n', 'utf8');
  counters.codeFiles += 2;

  await writeFile(path.join(vaultRoot, 'src/worker.py'), 'from .tools import normalize\n\nclass Worker:\n    def run(self):\n        return normalize("alpha")\n', 'utf8');
  await writeFile(path.join(vaultRoot, 'src/tools.py'), 'def normalize(value):\n    return value.strip().lower()\n', 'utf8');
  counters.codeFiles += 2;

  await mkdir(path.join(vaultRoot, 'test'), { recursive: true });
  await writeFile(path.join(vaultRoot, 'test/index.test.ts'), 'import { run } from "../src/index";\nif (!run()) throw new Error("missing");\n', 'utf8');
  counters.codeFiles += 1;

  await mkdir(path.join(vaultRoot, 'Security'), { recursive: true });
  await writeFile(
    path.join(vaultRoot, 'Security/Unsafe.md'),
    '# Unsafe\n\n<script>alert("xss")</script>\n\n[bad](javascript:alert(1))\n\n<iframe src="https://example.com"></iframe>\n\nBack to [[../README|Readme]].\n',
    'utf8'
  );
  counters.markdownFiles += 1;

  await mkdir(path.join(vaultRoot, 'Duplicates/A'), { recursive: true });
  await mkdir(path.join(vaultRoot, 'Duplicates/B'), { recursive: true });
  await writeFile(path.join(vaultRoot, 'Duplicates/A/Same.md'), '# Same A\n\nLinks to [[Same]].\n', 'utf8');
  await writeFile(path.join(vaultRoot, 'Duplicates/B/Same.md'), '# Same B\n\nLinks to [[../A/Same]].\n', 'utf8');
  counters.markdownFiles += 2;

  const clusters = ['Alpha', 'Beta', 'Gamma', 'Delta'];
  const filesPerCluster = 56;
  for (const cluster of clusters) {
    const clusterDir = path.join(vaultRoot, 'Clusters', cluster);
    await mkdir(clusterDir, { recursive: true });
    for (let index = 1; index <= filesPerCluster; index += 1) {
      const fileName = `${cluster} ${String(index).padStart(3, '0')}.md`;
      const next = `${cluster} ${String((index % filesPerCluster) + 1).padStart(3, '0')}`;
      const previous = `${cluster} ${String(index === 1 ? filesPerCluster : index - 1).padStart(3, '0')}`;
      const crossCluster = clusters[(clusters.indexOf(cluster) + 1) % clusters.length];
      const crossTarget = `${crossCluster} ${String(((index + 7) % filesPerCluster) + 1).padStart(3, '0')}`;
      const content = [
        `# ${cluster} ${index}`,
        '',
        `## Purpose`,
        `${cluster} node ${index} validates graph scale, relative links, tasks, tags, and excerpts.`,
        '',
        `- [ ] Follow up ${cluster} ${index}`,
        `- [x] Indexed ${cluster} ${index}`,
        '',
        `Links: [[${next}]], [[${previous}]], [[../${crossCluster}/${crossTarget}]], [relative](./${next}.md), [[Missing ${cluster} ${index}]].`,
        '',
        `#${cluster.toLowerCase()} #stress/node`
      ].join(index % 3 === 0 ? '\r\n' : '\n');
      await writeFile(path.join(clusterDir, fileName), content, 'utf8');
      counters.markdownFiles += 1;
    }
  }

  await mkdir(path.join(vaultRoot, 'Large'), { recursive: true });
  await writeFile(path.join(vaultRoot, 'Large/Too Big.md'), `# Too Big\n\n${'large '.repeat(40000)}`, 'utf8');
  counters.markdownFiles += 1;
}

function runChecked(label, [command, args]) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed:\n${result.stderr || result.stdout}`);
  }
  return result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
