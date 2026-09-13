import fs from 'node:fs';
import zlib from 'node:zlib';

function createPng(width, height, isMaskable = false) {
  // A raw RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width * 0.48 : width * 0.44;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Background: emerald gradient simulation (#0d9488 to #047857)
      const grad = y / height;
      let r = Math.round(13 * (1 - grad) + 4 * grad);
      let g = Math.round(148 * (1 - grad) + 120 * grad);
      let b = Math.round(136 * (1 - grad) + 87 * grad);
      let a = 255;

      // Cross dimensions
      const crossW = width * 0.52;
      const barThickness = width * 0.18;
      const halfW = crossW / 2;
      const halfT = barThickness / 2;

      // Check if inside cross (horizontal or vertical bar)
      const inHoriz = Math.abs(x - cx) <= halfW && Math.abs(y - cy) <= halfT;
      const inVert = Math.abs(x - cx) <= halfT && Math.abs(y - cy) <= halfW;

      if (inHoriz || inVert) {
        // White cross
        r = 255;
        g = 255;
        b = 255;

        // Inner monogram "M" dot/bar or gold accent
        if (Math.abs(x - cx) <= barThickness * 0.25 && Math.abs(y - cy) <= barThickness * 0.25) {
          r = 13; g = 148; b = 136; // Emerald teal center dot
        }
      }

      // Golden perfume sparkle at top right
      const sparkDist = Math.hypot(x - width * 0.72, y - height * 0.28);
      if (sparkDist <= width * 0.06) {
        r = 245; g = 158; b = 11; // Gold accent
      }

      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  // Encode PNG
  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawScanlines[y * (1 + width * 4)] = 0; // Filter: None
    buffer.copy(
      rawScanlines,
      y * (1 + width * 4) + 1,
      y * width * 4,
      (y + 1) * width * 4
    );
  }

  const idatData = zlib.deflateSync(rawScanlines);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', idatData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crc32Table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

const crc32Table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crc32Table[i] = c;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

fs.mkdirSync('./public', { recursive: true });
fs.writeFileSync('./public/pwa-192x192.png', createPng(192, 192, false));
fs.writeFileSync('./public/pwa-512x512.png', createPng(512, 512, false));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createPng(512, 512, true));
fs.writeFileSync('./public/apple-touch-icon.png', createPng(180, 180, false));
console.log('Generated PNG icons successfully.');
