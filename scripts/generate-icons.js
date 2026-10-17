import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw pixel data with filter byte 0 per scanline
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Draw rounded emblem pattern
      const cx = width / 2;
      const cy = height / 2;
      const dx = (x - cx) / (width / 2);
      const dy = (y - cy) / (height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.85) {
        // Inner gradient / emblem
        const innerGrad = 1 - dist * 0.4;
        rawData[pxOffset] = Math.min(255, Math.floor(r * innerGrad));
        rawData[pxOffset + 1] = Math.min(255, Math.floor(g * innerGrad));
        rawData[pxOffset + 2] = Math.min(255, Math.floor(b * innerGrad));
        rawData[pxOffset + 3] = a;

        // Subtle shield emblem in center
        if (Math.abs(x - cx) < width * 0.25 && Math.abs(y - cy) < height * 0.3) {
          rawData[pxOffset] = Math.min(255, rawData[pxOffset] + 40);
          rawData[pxOffset + 1] = Math.min(255, rawData[pxOffset + 1] + 50);
          rawData[pxOffset + 2] = Math.min(255, rawData[pxOffset + 2] + 40);
        }
      } else {
        // Background teal #0f766e -> rgb(15, 118, 110)
        rawData[pxOffset] = 15;
        rawData[pxOffset + 1] = 118;
        rawData[pxOffset + 2] = 110;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcInput = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcVal = crc32(crcInput);
  chunk.writeUInt32BE(crcVal, 8 + len);
  return chunk;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192 PNG
const png192 = createPng(192, 192, 16, 185, 129); // emerald
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

// Generate 512x512 PNG
const png512 = createPng(512, 512, 16, 185, 129);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

// Generate apple-touch-icon.png (180x180)
const appleIcon = createPng(180, 180, 16, 185, 129);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

// Generate favicon.ico (using 32x32 PNG)
const fav32 = createPng(32, 32, 16, 185, 129);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), fav32);

console.log('Successfully generated PWA icons in public/');
