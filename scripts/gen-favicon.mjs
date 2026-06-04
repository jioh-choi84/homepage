// 원본 이미지(favicon-src.png)에서 파비콘/아이콘 세트를 생성한다.
// - src/app/favicon.ico (16/32/48, PNG 내장 ICO)
// - src/app/icon.png (512)
// - public/icon-192.png, public/icon-512.png, public/apple-icon.png(180)
// 배경 노란색(253,242,0)으로 정사각형 패딩 → 얼굴 전체 보존.
import sharp from 'sharp';
import { writeFileSync } from 'fs';

const SRC = 'favicon-src.png';
const BG = { r: 253, g: 242, b: 0 }; // 트림 기준 노란 배경

// 정사각형 PNG 버퍼 생성
// 1) 둘레 노란 여백 트림 → 2) cover로 정사각형 꽉 채움(여백 0, 얼굴 최대)
async function squarePng(size) {
  return sharp(SRC)
    .trim({ background: BG, threshold: 40 })
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();
}

// PNG 버퍼들을 내장하는 ICO 파일 생성
function buildIco(entries) {
  // entries: [{ size, buf }]
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const dirSize = 16 * count;
  let offset = 6 + dirSize;
  const dir = Buffer.alloc(dirSize);
  entries.forEach((e, i) => {
    const o = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 0); // width
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1); // height
    dir.writeUInt8(0, o + 2); // color count
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // color planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(e.buf.length, o + 8); // bytes in resource
    dir.writeUInt32LE(offset, o + 12); // image data offset
    offset += e.buf.length;
  });

  return Buffer.concat([header, dir, ...entries.map((e) => e.buf)]);
}

async function main() {
  // ICO용 16/32/48
  const icoEntries = [];
  for (const size of [16, 32, 48]) {
    icoEntries.push({ size, buf: await squarePng(size) });
  }
  writeFileSync('src/app/favicon.ico', buildIco(icoEntries));
  console.log('✓ src/app/favicon.ico (16/32/48)');

  // PNG 아이콘들
  const targets = [
    ['src/app/icon.png', 512],
    ['public/icon-192.png', 192],
    ['public/icon-512.png', 512],
    ['public/apple-icon.png', 180],
  ];
  for (const [path, size] of targets) {
    writeFileSync(path, await squarePng(size));
    console.log(`✓ ${path} (${size})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
