#!/usr/bin/env node
/**
 * Record a cinematic fly-through of the real repo 3D graph viewer.
 * Uses Playwright to:
 * 1. Open the graph viewer at 1920x1080
 * 2. Simulate camera movements (zoom in, pan, zoom out)
 * 3. Record as video
 * 4. Output as mp4
 */

import { chromium } from 'playwright';
import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputDir = path.join(root, 'docs', 'marketing', 'ads', 'output');
const graphHtml = path.join(outputDir, 'real-repo-graph.html');
const finalVideo = path.join(outputDir, 'graph-flythrough.mp4');

const WIDTH = 1920;
const HEIGHT = 1080;
const DURATION_MS = 12000; // 12 seconds of footage

execSync(`mkdir -p "${outputDir}"`);
if (existsSync(finalVideo)) await rm(finalVideo);

console.log('▸ Launching browser...');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  recordVideo: { dir: outputDir, size: { width: WIDTH, height: HEIGHT } },
});

const page = await context.newPage();
console.log('▸ Loading graph viewer...');
await page.goto('file://' + graphHtml);
await page.waitForTimeout(1500); // Let graph settle

// Hide the toolbar and detail panel for clean recording
await page.evaluate(() => {
  const tb = document.getElementById('tb');
  const dt = document.getElementById('dt');
  const tt = document.getElementById('tt');
  if (tb) tb.style.display = 'none';
  if (dt) dt.style.display = 'none';
  if (tt) tt.style.display = 'none';
});

console.log('▸ Recording cinematic fly-through...');

// Simulate camera movements via mouse drag + scroll
const cx = WIDTH / 2;
const cy = HEIGHT / 2;

// Phase 1: Slow pan right (3s)
console.log('  Phase 1: Slow pan...');
for (let i = 0; i < 60; i++) {
  await page.mouse.move(cx + i * 3, cy + Math.sin(i * 0.1) * 2);
  if (i === 0) await page.mouse.down();
  await page.waitForTimeout(50);
}
await page.mouse.up();

// Phase 2: Zoom in (3s)
console.log('  Phase 2: Zoom in...');
for (let i = 0; i < 15; i++) {
  await page.mouse.wheel(0, -80);
  await page.waitForTimeout(200);
}

// Phase 3: Slow orbit (3s)
console.log('  Phase 3: Orbit...');
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let i = 0; i < 60; i++) {
  const angle = i * 0.05;
  await page.mouse.move(cx + Math.cos(angle) * 150, cy + Math.sin(angle) * 80);
  await page.waitForTimeout(50);
}
await page.mouse.up();

// Phase 4: Zoom out (3s)
console.log('  Phase 4: Zoom out...');
for (let i = 0; i < 12; i++) {
  await page.mouse.wheel(0, 60);
  await page.waitForTimeout(250);
}

await page.waitForTimeout(1000);

console.log('▸ Saving video...');
await page.close();
await context.close();
await browser.close();

// Find the recorded webm
const files = await readdir(outputDir);
const webms = files.filter(f => f.endsWith('.webm') && f.startsWith('page@')).sort().reverse();
const recordedVideo = webms[0] ? path.join(outputDir, webms[0]) : null;

if (!recordedVideo || !existsSync(recordedVideo)) {
  console.error('✗ No recording found');
  process.exit(1);
}

console.log('  ✓ Raw recording:', recordedVideo);

// Convert to mp4
const ffmpeg = existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';
spawnSync(ffmpeg, [
  '-hide_banner', '-loglevel', 'warning',
  '-y',
  '-i', recordedVideo,
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  '-an',
  finalVideo,
], { stdio: 'inherit' });

await rm(recordedVideo, { force: true });

if (existsSync(finalVideo)) {
  const size = parseInt(execSync(`stat -f%z "${finalVideo}"`).toString().trim());
  console.log('');
  console.log('═'.repeat(50));
  console.log('  ✓ Graph fly-through:', finalVideo);
  console.log('  Size:', (size / 1024 / 1024).toFixed(1), 'MB');
  console.log('═'.repeat(50));
} else {
  console.error('✗ Conversion failed');
  process.exit(1);
}
