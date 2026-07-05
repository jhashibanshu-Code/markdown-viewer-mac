#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'shibanshu-mcp-safety-'));
const vaultDir = path.join(tempRoot, 'vault');
const serverPath = path.join(root, 'mcp-server.mjs');

await mkdir(vaultDir, { recursive: true });
await writeFile(path.join(vaultDir, 'README.md'), '# Vault\n\nLinks to [[MCP/Safe]].\n', 'utf8');
await writeFile(path.join(tempRoot, 'secret.json'), '{"secret":true}\n', 'utf8');

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  cwd: root,
  stderr: 'pipe'
});

const client = new Client({ name: 'shibanshu-mcp-safety-check', version: '0.1.0' });

try {
  await client.connect(transport);

  const tools = await client.listTools();
  assert(tools.tools.some((tool) => tool.name === 'vault_create_note'), 'MCP server did not expose vault_create_note.');

  const safeNotePath = path.join(vaultDir, 'MCP', 'Safe.md');
  const createResult = await callTool('vault_create_note', {
    path: safeNotePath,
    content: '# Safe\n\nCreated by the MCP safety check.\n'
  });
  assert(!createResult.isError, `Safe note creation failed: ${createResult.text}`);
  assert((await readFile(safeNotePath, 'utf8')).includes('MCP safety check'), 'Safe note content was not written.');

  const readResult = await callTool('vault_read_note', { path: safeNotePath });
  assert(!readResult.isError, `Safe note read failed: ${readResult.text}`);
  assert(readResult.json?.links && Array.isArray(readResult.json.links), 'Read note result did not include extracted links.');

  const nonMarkdownWrite = await callTool('vault_write_note', {
    path: path.join(tempRoot, 'should-not-exist.json'),
    content: 'wrong target'
  });
  assert(nonMarkdownWrite.isError, 'MCP allowed writing a non-Markdown target.');
  await assertMissing(path.join(tempRoot, 'should-not-exist.json'), 'Non-Markdown write created a file.');

  const nonMarkdownRead = await callTool('vault_read_note', { path: path.join(tempRoot, 'secret.json') });
  assert(nonMarkdownRead.isError, 'MCP allowed reading a non-Markdown target.');

  const escapedDailyNote = path.join(tempRoot, 'outside', '2026-07-05.md');
  const traversalResult = await callTool('create_daily_note', {
    vault_path: vaultDir,
    date: '2026-07-05',
    subfolder: '../outside'
  });
  assert(traversalResult.isError, 'MCP allowed daily-note subfolder traversal.');
  await assertMissing(escapedDailyNote, 'Traversal created a file outside the vault.');

  const dailyResult = await callTool('create_daily_note', {
    vault_path: vaultDir,
    date: '2026-07-05',
    subfolder: 'Daily'
  });
  assert(!dailyResult.isError, `Safe daily note creation failed: ${dailyResult.text}`);
  await access(path.join(vaultDir, 'Daily', '2026-07-05.md'));

  const viewerPath = path.join(tempRoot, 'graph-viewer.html');
  const viewerResult = await callTool('generate_3d_graph_viewer', {
    path: vaultDir,
    output: viewerPath,
    max_files: 20,
    open: false
  });
  assert(!viewerResult.isError, `3D graph viewer generation failed: ${viewerResult.text}`);
  const viewerHtml = await readFile(viewerPath, 'utf8');
  assert(viewerHtml.includes('Shibanshu 3D Graph Viewer') && viewerHtml.includes('const GRAPH_DATA ='), '3D graph viewer did not include the standalone graph payload.');

  const badViewerResult = await callTool('generate_3d_graph_viewer', {
    path: vaultDir,
    output: path.join(tempRoot, 'graph-viewer.json'),
    open: false
  });
  assert(badViewerResult.isError, 'MCP allowed 3D graph viewer output to a non-HTML file.');
  await assertMissing(path.join(tempRoot, 'graph-viewer.json'), 'Non-HTML graph viewer output created a file.');

  console.log(`MCP safety check passed in ${tempRoot}`);
} finally {
  await client.close().catch(() => {});
}

async function callTool(name, args) {
  const result = await client.callTool(
    {
      name,
      arguments: args
    },
    undefined,
    { timeout: 15000 }
  );
  const text = result.content.find((item) => item.type === 'text')?.text || '';
  let json = null;
  if (!result.isError && text) {
    json = JSON.parse(text);
  }
  return { ...result, text, json };
}

async function assertMissing(filePath, message) {
  try {
    await access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
