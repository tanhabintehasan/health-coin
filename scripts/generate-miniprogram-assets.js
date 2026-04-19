const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ASSETS_DIR = path.resolve(__dirname, '../apps/miniprogram/src/assets');

const FILES = [
  { name: 'home.png', color: [0x99, 0x99, 0x99] },
  { name: 'home-active.png', color: [0x16, 0x77, 0xff] },
  { name: 'cart.png', color: [0x99, 0x99, 0x99] },
  { name: 'cart-active.png', color: [0x16, 0x77, 0xff] },
  { name: 'order.png', color: [0x99, 0x99, 0x99] },
  { name: 'order-active.png', color: [0x16, 0x77, 0xff] },
  { name: 'wallet.png', color: [0x99, 0x99, 0x99] },
  { name: 'wallet-active.png', color: [0x16, 0x77, 0xff] },
  { name: 'profile.png', color: [0x99, 0x99, 0x99] },
  { name: 'profile-active.png', color: [0x16, 0x77, 0xff] },
];

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 1);
    c >>>= 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createSolidPng(width, height, [r, g, b]) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // color type: RGB
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter method
  ihdrData.writeUInt8(0, 12); // interlace

  const rowSize = 1 + width * 3;
  const raw = Buffer.allocUnsafe(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const i = rowStart + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }

  const idatData = zlib.deflateSync(raw);
  const iendData = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    writeChunk('IHDR', ihdrData),
    writeChunk('IDAT', idatData),
    writeChunk('IEND', iendData),
  ]);
}

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

for (const { name, color } of FILES) {
  const png = createSolidPng(64, 64, color);
  fs.writeFileSync(path.join(ASSETS_DIR, name), png);
  console.log(`Created ${name}`);
}

console.log('All mini-program assets generated.');
