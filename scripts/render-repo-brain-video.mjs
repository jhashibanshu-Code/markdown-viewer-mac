import { existsSync } from 'node:fs';
import { rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputDir = path.join(root, 'docs', 'marketing', 'ads', 'output');
const framesDir = path.join(outputDir, 'repo-brain-frames');
const videoPath = path.join(outputDir, 'repo-brain-video.mp4');
const posterPath = path.join(outputDir, 'repo-brain-video-poster.png');
const swiftScript = path.join(root, 'scripts', 'render-repo-brain-video.swift');
const ffmpegCandidates = [
  '/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg',
  '/opt/homebrew/bin/ffmpeg',
  'ffmpeg',
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      CLANG_MODULE_CACHE_PATH: path.join(root, '.build', 'module-cache'),
      SWIFT_MODULE_CACHE_PATH: path.join(root, '.build', 'swift-cache'),
      ...options.env,
    },
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function resolveFfmpeg() {
  for (const candidate of ffmpegCandidates) {
    if (candidate.includes('/') && existsSync(candidate)) {
      return candidate;
    }
    if (!candidate.includes('/')) {
      return candidate;
    }
  }
  throw new Error('No ffmpeg binary found. Install ffmpeg or update ffmpegCandidates in this script.');
}

await rm(videoPath, { force: true });

run('swift', [swiftScript, '--frames']);

const ffmpeg = resolveFfmpeg();
run(ffmpeg, [
  '-y',
  '-framerate',
  '30',
  '-i',
  path.join(framesDir, 'frame-%04d.png'),
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '18',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  videoPath,
]);

await rm(framesDir, { recursive: true, force: true });
await rm(path.join(root, '.build'), { recursive: true, force: true });

const video = await stat(videoPath);
const poster = await stat(posterPath);
console.log(`Video written: ${videoPath}`);
console.log(`Poster written: ${posterPath}`);
console.log(`Video size: ${(video.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`Poster size: ${(poster.size / 1024).toFixed(0)} KB`);
