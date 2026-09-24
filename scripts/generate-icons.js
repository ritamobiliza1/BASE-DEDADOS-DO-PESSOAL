import fs from 'node:fs';
import zlib from 'node:zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const typeAndData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function generatePNG(size, isMaskable = false) {
  const width = size;
  const height = size;

  const raw = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.44;

  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Deep dark blue / slate background
      let r = 14, g = 22, b = 35, a = 255;

      // Shield / Circle emblem
      if (dist <= rOuter) {
        // Red crest ring
        if (dist > rOuter * 0.82) {
          r = 217; g = 45; b = 43; // Crimson Red
        } else if (dist > rOuter * 0.72) {
          r = 217; g = 164; b = 65; // Gold border
        } else {
          // Inside emblem
          const inCross = (Math.abs(dx) < rOuter * 0.18 && Math.abs(dy) < rOuter * 0.55) ||
                          (Math.abs(dy) < rOuter * 0.18 && Math.abs(dx) < rOuter * 0.55);
          if (inCross) {
            r = 255; g = 255; b = 255;
          } else {
            r = 21; g = 31; b = 47;
          }
        }
      }

      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(raw));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

fs.writeFileSync('public/pwa-192x192.png', generatePNG(192));
fs.writeFileSync('public/pwa-512x512.png', generatePNG(512));
fs.writeFileSync('public/pwa-maskable-512x512.png', generatePNG(512, true));
fs.writeFileSync('public/apple-touch-icon.png', generatePNG(180));
console.log('Icons generated successfully!');
