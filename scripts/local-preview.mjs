#!/usr/bin/env node

import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const host = getArg('--host') || '127.0.0.1';
const preferredPort = Number(getArg('--port') || process.env.PORT || 4173);
const port = await findAvailablePort(preferredPort);

await access(path.join(distDir, 'index.html'));

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);
  const filePath = resolveSafeDistPath(requestUrl.pathname);

  try {
    const details = await stat(filePath);
    if (!details.isFile()) return serveIndex(response);
    response.writeHead(200, {
      'Content-Type': getContentType(filePath),
      'Cache-Control': 'no-store'
    });
    createReadStream(filePath).pipe(response);
  } catch (_error) {
    serveIndex(response);
  }
});

server.listen(port, host, () => {
  console.log('');
  console.log('Shibanshu Markdown Viewer local web app is running.');
  console.log(`Open: http://${host}:${port}/`);
  console.log('');
  console.log('Press Ctrl+C to stop this local preview server.');
});

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index === process.argv.length - 1) return null;
  return process.argv[index + 1];
}

function resolveSafeDistPath(urlPathname) {
  const decoded = decodeURIComponent(urlPathname);
  const cleanPath = decoded === '/' ? '/index.html' : decoded;
  const candidate = path.normalize(path.join(distDir, cleanPath));
  if (!candidate.startsWith(distDir + path.sep) && candidate !== distDir) {
    return path.join(distDir, 'index.html');
  }
  return candidate;
}

function serveIndex(response) {
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  createReadStream(path.join(distDir, 'index.html')).pipe(response);
}

async function findAvailablePort(startPort) {
  for (let offset = 0; offset < 20; offset += 1) {
    const candidate = startPort + offset;
    if (await canListen(candidate)) return candidate;
  }
  throw new Error(`No available local preview port found from ${startPort} to ${startPort + 19}.`);
}

function canListen(candidatePort) {
  return new Promise((resolve) => {
    const probe = http.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => {
      probe.close(() => resolve(true));
    });
    probe.listen(candidatePort, host);
  });
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
  };
  return types[ext] || 'application/octet-stream';
}
