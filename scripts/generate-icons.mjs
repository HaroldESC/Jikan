#!/usr/bin/env node
/**
 * Regenerates every rasterised PWA icon from the SVG sources in public/.
 *
 * The SVGs are the source of truth; the PNG/ICO files are build artifacts.
 * Edit public/icon.svg or public/icon-maskable.svg, then run `npm run icons`.
 *
 * Requires sharp: `npm install`.
 */

import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/** Rasterisations to emit: [source SVG, output PNG, width, height]. */
const PNG_TARGETS = [
  ['icon.svg', 'icon-192.png', 192, 192],
  ['icon.svg', 'icon-512.png', 512, 512],
  ['icon.svg', 'apple-touch-icon.png', 180, 180],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512, 512],
];

/** Sizes packed into favicon.ico. Windows uses 16; keep the rest for scaling. */
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

/**
 * Packs PNG buffers into a multi-size ICO container.
 * Vista and later read PNG-compressed ICO entries natively, so no BMP
 * encoding is needed. A width/height byte of 0 means 256.
 */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(images.length, 4);

  const entries = Buffer.alloc(16 * images.length);
  let offset = header.length + entries.length;

  images.forEach((image, i) => {
    const at = i * 16;
    const dimension = image.size >= 256 ? 0 : image.size;
    entries.writeUInt8(dimension, at); // width
    entries.writeUInt8(dimension, at + 1); // height
    entries.writeUInt8(0, at + 2); // palette size
    entries.writeUInt8(0, at + 3); // reserved
    entries.writeUInt16LE(1, at + 4); // colour planes
    entries.writeUInt16LE(32, at + 6); // bits per pixel
    entries.writeUInt32LE(image.data.length, at + 8);
    entries.writeUInt32LE(offset, at + 12);
    offset += image.data.length;
  });

  return Buffer.concat([header, entries, ...images.map((image) => image.data)]);
}

/** Rasterises an SVG file to a PNG buffer at the requested size. */
async function rasterize(svgFile, width, height) {
  return sharp(join(publicDir, svgFile), { density: 384 })
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  for (const [svg, png, width, height] of PNG_TARGETS) {
    const data = await rasterize(svg, width, height);
    await writeFile(join(publicDir, png), data);
    console.log(`${png.padEnd(24)} ${width}x${height}  ${(data.length / 1024).toFixed(1)} kB`);
  }

  const icoImages = [];
  for (const size of ICO_SIZES) {
    icoImages.push({ size, data: await rasterize('icon.svg', size, size) });
  }
  const ico = buildIco(icoImages);
  await writeFile(join(publicDir, 'icon.ico'), ico);
  console.log(
    `${'icon.ico'.padEnd(24)} ${ICO_SIZES.join('/')}  ${(ico.length / 1024).toFixed(1)} kB`
  );

  console.log('\nDone. Remember to rebuild (`npm run build`) — the PNGs are hashed into the precache.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});