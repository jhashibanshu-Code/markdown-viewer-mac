#!/usr/bin/env node

import fsp from 'node:fs/promises';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scheme = 'shibanshu-markdown';
const maxUrlContentBytes = 512 * 1024;

const args = process.argv.slice(2);
const command = args[0];

try {
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    process.exit(0);
  }

  if (command === 'context') {
    runContextExporter(args.slice(1));
  } else if (command === 'publish') {
    runStaticPublisher(args.slice(1));
  } else if (command === 'new') {
    await runNew(args.slice(1));
  } else if (command === 'search') {
    runSearch(args.slice(1));
  } else if (command === 'open') {
    runOpen(args.slice(1));
  } else if (command === 'open-vault' || command === 'vault') {
    runUrlCommand('open-vault', parseFlags(args.slice(1)).flags);
  } else if (command === 'command-palette' || command === 'commands') {
    runUrlCommand('command-palette', parseFlags(args.slice(1)).flags);
  } else if (command === 'graph') {
    runUrlCommand('graph', parseFlags(args.slice(1)).flags);
  } else if (command === 'workflow') {
    runUrlCommand('workflow', parseFlags(args.slice(1)).flags);
  } else if (command === 'mind-map' || command === 'mindmap') {
    runUrlCommand('mind-map', parseFlags(args.slice(1)).flags);
  } else if (command === 'create-note') {
    await runCreateNote(args.slice(1));
  } else if (command === 'url') {
    runUrlBuilder(args.slice(1));
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`shibanshu-markdown: ${error.message}`);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage: shibanshu-markdown <command> [options]

Commands:
  context <folder> [options]         Export Claude/OpenAI-ready context maps for a folder
  publish <folder> --out <folder>    Export a local static website without launching the app
                                     Supports --profile, --save-profile, and --list-profiles
  new [--title <name>] [--content <markdown> | --from-file <file>]
                                     Open the app with a new unsaved note
  create-note <file> [--content <markdown> | --from-file <file>]
                                     Create a Markdown file atomically without opening the app
  search <query>                     Open the app search panel
  open [file ...]                    Open files through the OS/app association
  open-vault                         Open the app folder picker
  graph                              Open the app graph surface
  mind-map                           Open the app mind-map surface
  workflow                           Open the app with workflow parameters (surface/mode/space/query/target/path)
  command-palette                    Open the app command palette
  url <action> [options]             Print or open a shibanshu-markdown:// URL

Shared options:
  --print-url                        Print the URL instead of opening it
  --no-open                          For create-note, do not open the created file
  --app <name-or-path>               macOS app name/path for file open commands

Examples:
  shibanshu-markdown context ~/Notes --out ~/Desktop/context
  shibanshu-markdown publish ~/Notes --out ~/Desktop/notes-site
  shibanshu-markdown publish ~/Notes --save-profile docs --out ../notes-site
  shibanshu-markdown publish ~/Notes --profile docs
  shibanshu-markdown new --title Draft.md --content "# Draft"
  shibanshu-markdown create-note ~/Notes/today.md --content "# Today"
  shibanshu-markdown search roadmap
`);
}

function runContextExporter(contextArgs) {
  if (!contextArgs.length || contextArgs.includes('--help') || contextArgs.includes('-h')) {
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/export-claude-map.mjs'), '--help'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    process.exit(result.status ?? 0);
  }

  const result = spawnSync(process.execPath, [path.join(root, 'scripts/export-claude-map.mjs'), ...contextArgs], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  process.exit(result.status ?? 0);
}

function runStaticPublisher(publishArgs) {
  if (!publishArgs.length || publishArgs.includes('--help') || publishArgs.includes('-h')) {
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/publish-static-site.mjs'), '--help'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    process.exit(result.status ?? 0);
  }

  const result = spawnSync(process.execPath, [path.join(root, 'scripts/publish-static-site.mjs'), ...publishArgs], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  process.exit(result.status ?? 0);
}

async function runNew(commandArgs) {
  const { flags, positionals } = parseFlags(commandArgs);
  const content = await readContentFlag(flags);
  const title = flags.title || flags.name || positionals[0] || 'URL Note.md';
  const encodedContentBytes = Buffer.byteLength(content, 'utf8');
  if (encodedContentBytes > maxUrlContentBytes) {
    throw new Error(`URL note content is larger than ${Math.round(maxUrlContentBytes / 1024)} KB. Use create-note for large files.`);
  }
  runUrlCommand('new', {
    ...flags,
    title,
    content
  });
}

function runSearch(commandArgs) {
  const { flags, positionals } = parseFlags(commandArgs);
  const query = flags.query || flags.q || positionals.join(' ');
  if (!query) {
    throw new Error('Missing search query.');
  }
  runUrlCommand('search', {
    ...flags,
    q: query
  });
}

function runOpen(commandArgs) {
  const { flags, positionals } = parseFlags(commandArgs);
  if (!positionals.length) {
    runUrlCommand('open', flags);
    return;
  }

  for (const filePath of positionals) {
    openPath(filePath, flags);
  }
}

async function runCreateNote(commandArgs) {
  const { flags, positionals } = parseFlags(commandArgs);
  const targetPath = positionals[0] ? path.resolve(positionals[0]) : null;
  if (!targetPath) {
    throw new Error('Missing target file path.');
  }

  const content = await readContentFlag(flags);
  const finalContent = content || defaultNoteContent(targetPath);
  if (!flags.force) {
    try {
      await access(targetPath);
      throw new Error(`File already exists: ${targetPath}. Pass --force to replace it.`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await mkdir(path.dirname(targetPath), { recursive: true });
  await atomicWriteFile(targetPath, finalContent);

  if (!flags.noOpen && !flags['no-open']) {
    openPath(targetPath, flags);
  }
  console.log(`Note created: ${targetPath}`);
}

function runUrlBuilder(commandArgs) {
  const action = commandArgs[0];
  if (!action) {
    throw new Error('Missing URL action.');
  }
  const { flags } = parseFlags(commandArgs.slice(1));
  runUrlCommand(action, {
    ...flags,
    printUrl: true
  });
}

function runUrlCommand(action, flags = {}) {
  const url = buildAppUrl(action, flags);
  if (flags.printUrl || flags['print-url']) {
    console.log(url);
    return;
  }
  openUrl(url);
}

function buildAppUrl(action, flags = {}) {
  const normalizedAction = String(action || '').replaceAll('_', '-').trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(normalizedAction)) {
    throw new Error('Invalid URL action.');
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(flags)) {
    if (['printUrl', 'print-url', 'app', 'noOpen', 'no-open', 'fromFile', 'from-file'].includes(key)) continue;
    if (value === true || value === false || value == null) continue;
    params.set(key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`), String(value));
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `${scheme}://${normalizedAction}${suffix}`;
}

function openUrl(url) {
  if (process.platform === 'darwin') {
    const result = spawnSync('open', [url], { stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error(`open failed with exit code ${result.status}`);
    }
    return;
  }

  console.log(url);
}

function openPath(filePath, flags = {}) {
  const absolutePath = path.resolve(filePath);
  if (process.platform !== 'darwin') {
    console.log(`Open this file with Shibanshu Markdown Viewer: ${absolutePath}`);
    return;
  }

  const appTarget = flags.app || 'Shibanshu Markdown Viewer';
  const args = ['-a', appTarget, absolutePath];
  const result = spawnSync('open', args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`open ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

async function readContentFlag(flags) {
  if (flags.fromFile || flags['from-file']) {
    return readFile(path.resolve(flags.fromFile || flags['from-file']), 'utf8');
  }
  return String(flags.content || flags.body || '');
}

async function atomicWriteFile(filePath, content) {
  const directory = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const tempPath = path.join(directory, `.${baseName}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`);
  let handle = null;

  try {
    handle = await fsp.open(tempPath, 'wx');
    await handle.writeFile(String(content), 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(tempPath, filePath);
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
    }
    await fsp.unlink(tempPath).catch(() => {});
    throw error;
  }
}

function defaultNoteContent(filePath) {
  const title = path.basename(filePath).replace(/\.(md|markdown|mdown|mkd|txt)$/i, '') || 'Untitled';
  return `# ${title}\n\n`;
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
    const key = toCamelFlag(rawKey);
    const dashedKey = rawKey;
    const next = commandArgs[index + 1];
    const value = inlineValue !== undefined ? inlineValue : next && !next.startsWith('--') ? next : true;
    if (inlineValue === undefined && value === next) index += 1;

    flags[key] = value;
    flags[dashedKey] = value;
  }

  return { flags, positionals };
}

function toCamelFlag(value) {
  return String(value || '').replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}
