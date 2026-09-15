const zlib = require('zlib');
const fs = require('fs');

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const CIMA = [0xe4, 0xa0, 0x3c];

function dist(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function distSegmento(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return dist(px, py, cx, cy);
}

/**
 * Alpha del glifo (ruota timone) scalato dentro la "safe zone" (66% del
 * canvas) di un'icona adattiva Android, sfondo trasparente.
 */
function alphaGlifo(size, x, y) {
  const cx = size / 2;
  const cy = size / 2;
  const scala = size * 0.33; // raggio della ruota entro la safe zone

  const anelloR = scala;
  const anelloSpessore = size * 0.05;
  const centroR = size * 0.065;
  const razzaSpessore = size * 0.045;
  const razzaInterno = size * 0.13;
  const razzaEsterno = scala * 1.42;

  const d = dist(x, y, cx, cy);
  if (Math.abs(d - anelloR) < anelloSpessore / 2) return 255;
  if (d < centroR) return 255;

  const angoli = [0, 45, 90, 135, 180, 225, 270, 315];
  for (const gradi of angoli) {
    const rad = (gradi * Math.PI) / 180;
    const x1 = cx + razzaInterno * Math.cos(rad);
    const y1 = cy + razzaInterno * Math.sin(rad);
    const x2 = cx + razzaEsterno * Math.cos(rad);
    const y2 = cy + razzaEsterno * Math.sin(rad);
    if (distSegmento(x, y, x1, y1, x2, y2) < razzaSpessore / 2) return 255;
  }
  return 0;
}

function makePngRGBA(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowLen = size * 4 + 1;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowLen;
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const a = alphaGlifo(size, x + 0.5, y + 0.5);
      const off = rowStart + 1 + x * 4;
      raw[off] = CIMA[0];
      raw[off + 1] = CIMA[1];
      raw[off + 2] = CIMA[2];
      raw[off + 3] = a;
    }
  }
  const idatData = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idatData), chunk('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync(process.argv[2], makePngRGBA(parseInt(process.argv[3], 10)));
