import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import path from 'node:path';

const root = process.cwd();
const buildDir = path.join(root, 'build');
const iconsetDir = path.join(buildDir, 'icon.iconset');
const baseIconPath = path.join(buildDir, 'icon-base.png');
const iconPath = path.join(buildDir, 'icon.icns');
const icoPath = path.join(buildDir, 'icon.ico');

const iconEntries = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024]
];

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const sampleOffsets = [
  [0.25, 0.25],
  [0.75, 0.25],
  [0.25, 0.75],
  [0.75, 0.75]
];

await mkdir(iconsetDir, { recursive: true });
const pngBySize = new Map();

for (const [, size] of iconEntries) {
  if (!pngBySize.has(size)) {
    pngBySize.set(size, createIconPng(size));
  }
}

await writeFile(baseIconPath, pngBySize.get(1024));

for (const [fileName, size] of iconEntries) {
  await writeFile(path.join(iconsetDir, fileName), pngBySize.get(size));
}

await writeFile(iconPath, createIcns(pngBySize));
await writeFile(icoPath, createIco(pngBySize.get(256)));

console.log(`App icon generated: ${iconPath}`);

function createIconPng(size) {
  const data = Buffer.alloc(size * size * 4);
  const scale = size / 1024;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const coverage = roundedRectCoverage(x, y, size, size * 0.045, size * 0.045, size * 0.955, size * 0.955, size * 0.22);
      if (coverage <= 0) continue;

      const gradient = Math.max(0, Math.min(1, (x + y * 0.72) / (size * 1.55)));
      const bg = mixColor([24, 50, 92], [34, 170, 132], gradient);
      setPixel(data, index, bg[0], bg[1], bg[2], Math.round(255 * coverage));
    }
  }

  drawRoundedRect(data, size, 238 * scale, 158 * scale, 786 * scale, 868 * scale, 72 * scale, [247, 250, 252, 247]);
  drawPolygon(data, size, [
    [676 * scale, 158 * scale],
    [786 * scale, 268 * scale],
    [676 * scale, 268 * scale]
  ], [213, 229, 239, 255]);
  drawRoundedRect(data, size, 286 * scale, 250 * scale, 626 * scale, 302 * scale, 18 * scale, [197, 207, 216, 255]);
  drawRoundedRect(data, size, 286 * scale, 374 * scale, 706 * scale, 426 * scale, 18 * scale, [197, 207, 216, 255]);
  drawRoundedRect(data, size, 286 * scale, 498 * scale, 548 * scale, 550 * scale, 18 * scale, [197, 207, 216, 255]);
  drawLine(data, size, 308 * scale, 706 * scale, 392 * scale, 560 * scale, 42 * scale, [21, 49, 92, 255]);
  drawLine(data, size, 392 * scale, 560 * scale, 512 * scale, 706 * scale, 42 * scale, [21, 49, 92, 255]);
  drawLine(data, size, 512 * scale, 706 * scale, 636 * scale, 560 * scale, 42 * scale, [24, 136, 118, 255]);
  drawLine(data, size, 636 * scale, 560 * scale, 718 * scale, 706 * scale, 42 * scale, [24, 136, 118, 255]);
  drawCircle(data, size, 308 * scale, 706 * scale, 30 * scale, [21, 49, 92, 255]);
  drawCircle(data, size, 512 * scale, 706 * scale, 30 * scale, [21, 49, 92, 255]);
  drawCircle(data, size, 718 * scale, 706 * scale, 30 * scale, [24, 136, 118, 255]);

  return encodePng(size, size, data);
}

function createIcns(pngBySize) {
  const chunks = [
    ['icp4', 16],
    ['icp5', 32],
    ['icp6', 64],
    ['ic07', 128],
    ['ic08', 256],
    ['ic09', 512],
    ['ic10', 1024],
    ['ic11', 32],
    ['ic12', 64],
    ['ic13', 256],
    ['ic14', 512]
  ].map(([type, size]) => icnsChunk(type, pngBySize.get(size)));

  const totalLength = 8 + chunks.reduce((total, chunk) => total + chunk.length, 0);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(totalLength, 4);
  return Buffer.concat([header, ...chunks]);
}

function icnsChunk(type, data) {
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, 'ascii');
  header.writeUInt32BE(data.length + 8, 4);
  return Buffer.concat([header, data]);
}

function createIco(pngData) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directory = Buffer.alloc(16);
  directory.writeUInt8(0, 0);
  directory.writeUInt8(0, 1);
  directory.writeUInt8(0, 2);
  directory.writeUInt8(0, 3);
  directory.writeUInt16LE(1, 4);
  directory.writeUInt16LE(32, 6);
  directory.writeUInt32LE(pngData.length, 8);
  directory.writeUInt32LE(header.length + directory.length, 12);

  return Buffer.concat([header, directory, pngData]);
}

function drawRoundedRect(data, size, left, top, right, bottom, radius, color) {
  const minX = Math.max(0, Math.floor(left - 1));
  const maxX = Math.min(size - 1, Math.ceil(right + 1));
  const minY = Math.max(0, Math.floor(top - 1));
  const maxY = Math.min(size - 1, Math.ceil(bottom + 1));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const coverage = roundedRectCoverage(x, y, size, left, top, right, bottom, radius);
      if (coverage <= 0) continue;
      blendPixel(data, (y * size + x) * 4, color, coverage);
    }
  }
}

function drawCircle(data, size, centerX, centerY, radius, color) {
  const minX = Math.max(0, Math.floor(centerX - radius - 1));
  const maxX = Math.min(size - 1, Math.ceil(centerX + radius + 1));
  const minY = Math.max(0, Math.floor(centerY - radius - 1));
  const maxY = Math.min(size - 1, Math.ceil(centerY + radius + 1));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let inside = 0;
      for (const [offsetX, offsetY] of sampleOffsets) {
        const dx = x + offsetX - centerX;
        const dy = y + offsetY - centerY;
        if (dx * dx + dy * dy <= radius * radius) inside += 1;
      }
      if (inside > 0) {
        blendPixel(data, (y * size + x) * 4, color, inside / sampleOffsets.length);
      }
    }
  }
}

function drawLine(data, size, x1, y1, x2, y2, width, color) {
  const radius = width / 2;
  const minX = Math.max(0, Math.floor(Math.min(x1, x2) - radius - 1));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(x1, x2) + radius + 1));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2) - radius - 1));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(y1, y2) + radius + 1));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let inside = 0;
      for (const [offsetX, offsetY] of sampleOffsets) {
        if (distanceToSegment(x + offsetX, y + offsetY, x1, y1, x2, y2) <= radius) inside += 1;
      }
      if (inside > 0) {
        blendPixel(data, (y * size + x) * 4, color, inside / sampleOffsets.length);
      }
    }
  }
}

function drawPolygon(data, size, points, color) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.max(0, Math.floor(Math.min(...xs) - 1));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(...xs) + 1));
  const minY = Math.max(0, Math.floor(Math.min(...ys) - 1));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(...ys) + 1));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let inside = 0;
      for (const [offsetX, offsetY] of sampleOffsets) {
        if (pointInPolygon(x + offsetX, y + offsetY, points)) inside += 1;
      }
      if (inside > 0) {
        blendPixel(data, (y * size + x) * 4, color, inside / sampleOffsets.length);
      }
    }
  }
}

function roundedRectCoverage(x, y, _size, left, top, right, bottom, radius) {
  let inside = 0;
  for (const [offsetX, offsetY] of sampleOffsets) {
    const px = x + offsetX;
    const py = y + offsetY;
    const cx = Math.max(left + radius, Math.min(right - radius, px));
    const cy = Math.max(top + radius, Math.min(bottom - radius, py));
    const dx = px - cx;
    const dy = py - cy;
    if (dx * dx + dy * dy <= radius * radius && px >= left && px <= right && py >= top && py <= bottom) inside += 1;
  }
  return inside / sampleOffsets.length;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  return Math.hypot(px - x, py - y);
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function blendPixel(data, index, color, coverage) {
  const sourceAlpha = (color[3] / 255) * coverage;
  const destAlpha = data[index + 3] / 255;
  const outAlpha = sourceAlpha + destAlpha * (1 - sourceAlpha);
  if (outAlpha <= 0) return;

  data[index] = Math.round((color[0] * sourceAlpha + data[index] * destAlpha * (1 - sourceAlpha)) / outAlpha);
  data[index + 1] = Math.round((color[1] * sourceAlpha + data[index + 1] * destAlpha * (1 - sourceAlpha)) / outAlpha);
  data[index + 2] = Math.round((color[2] * sourceAlpha + data[index + 2] * destAlpha * (1 - sourceAlpha)) / outAlpha);
  data[index + 3] = Math.round(outAlpha * 255);
}

function setPixel(data, index, red, green, blue, alpha) {
  data[index] = red;
  data[index + 1] = green;
  data[index + 2] = blue;
  data[index + 3] = alpha;
}

function mixColor(left, right, amount) {
  return left.map((channel, index) => Math.round(channel + (right[index] - channel) * amount));
}

function encodePng(width, height, rgba) {
  const scanlineLength = width * 4 + 1;
  const raw = Buffer.alloc(scanlineLength * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * scanlineLength] = 0;
    rgba.copy(raw, y * scanlineLength + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', createIhdr(width, height)),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function createIhdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
