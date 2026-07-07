#!/usr/bin/env node
/**
 * Render ad-film-final.html to mp4 using Playwright screen recording + ffmpeg audio merge.
 *
 * 1. Launches Chromium via Playwright at 1920x1080
 * 2. Records the canvas animation as a silent video
 * 3. Merges with the music.mp3 audio track
 * 4. Outputs final mp4
 */

import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const adsDir = path.join(root, 'docs', 'marketing', 'ads');
const htmlPath = path.join(adsDir, 'ad-film-final.html');
const musicPath = path.join(adsDir, 'music.mp3');
const outputDir = path.join(adsDir, 'output');
const silentVideo = path.join(outputDir, 'ad-film-silent.webm');
const finalVideo = path.join(outputDir, 'ad-film-final.mp4');

const WIDTH = 1920;
const HEIGHT = 1080;
const DURATION_S = 50;

execSync(`mkdir -p "${outputDir}"`);

for (const f of [silentVideo, finalVideo]) {
  if (existsSync(f)) await rm(f);
}

console.log('▸ Launching browser at', WIDTH + 'x' + HEIGHT + '...');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: outputDir,
    size: { width: WIDTH, height: HEIGHT },
  },
});

const page = await context.newPage();

console.log('▸ Loading ad HTML...');
await page.goto('file://' + htmlPath);

// Click to trigger any autoplay-gated content (though we skip audio in headless)
await page.click('canvas').catch(() => {});

console.log('▸ Recording', DURATION_S, 'seconds of animation...');
// Wait for the animation to complete
await page.waitForFunction(
  (dur) => window.__videoDone === true,
  DURATION_S * 1000 + 5000,
  { timeout: (DURATION_S + 10) * 1000 }
).catch(() => {
  console.log('  (animation timeout reached, using recorded frames)');
});

// Small buffer
await page.waitForTimeout(1500);

console.log('▸ Closing browser, saving video...');
await page.close();
const videoPath = await context.pages()[0]?.video()?.path().catch(() => null);
await context.close();
await browser.close();

// Find the recorded video file (Playwright saves as random name in output dir)
const recordedFiles = execSync(`ls -t "${outputDir}"/*.webm 2>/dev/null || true`).toString().trim().split('\n').filter(Boolean);
const recordedVideo = recordedFiles[0];

if (!recordedVideo || !existsSync(recordedVideo)) {
  console.error('✗ No video file recorded. Playwright recording may have failed.');
  process.exit(1);
}

console.log('  ✓ Silent video:', recordedVideo);
console.log('  Size:', (execSync(`stat -f%z "${recordedVideo}"`).toString().trim() / 1024 / 1024).toFixed(1), 'MB');

// Merge with audio using ffmpeg
console.log('▸ Merging video + audio with ffmpeg...');
const ffmpeg = existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';

// Downscale 4K → 1080p with Lanczos (sharpest), add audio, encode
execSync([
  ffmpeg,
  '-hide_banner', '-loglevel', 'warning',
  '-y',
  '-i', `"${recordedVideo}"`,
  '-i', `"${musicPath}"`,
  '-t', '48',
  '-map', '0:v:0',
  '-map', '1:a:0',
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-shortest',
  '-movflags', '+faststart',
  `"${finalVideo}"`,
].join(' '), { stdio: 'inherit' });

// Clean up silent video
await rm(recordedVideo, { force: true });

if (existsSync(finalVideo)) {
  const size = execSync(`stat -f%z "${finalVideo}"`).toString().trim();
  console.log('');
  console.log('═'.repeat(50));
  console.log('  ✓ Video ready:', finalVideo);
  console.log('  Size:', (size / 1024 / 1024).toFixed(1), 'MB');
  console.log('═'.repeat(50));
} else {
  console.error('✗ Final video not created');
  process.exit(1);
}
