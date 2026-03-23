// Generate PWA icons as PNG — Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync, existsSync } from "fs";

const sizes = [192, 512];
const iconDir = "public/icons";

if (!existsSync(iconDir)) {
  mkdirSync(iconDir, { recursive: true });
}

function createSVG(size, maskable) {
  const fontSize = Math.round(size * 0.22);
  const subFontSize = Math.round(size * 0.08);
  const cx = size / 2;
  const cy = size / 2;
  const rx = maskable ? 0 : size * 0.12;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#000000" rx="${rx}"/>
  <text x="${cx}" y="${cy - subFontSize}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">SC</text>
  <text x="${cx}" y="${cy + fontSize * 0.55}" font-family="Arial,sans-serif" font-size="${subFontSize}" font-weight="600" fill="#aaaaaa" text-anchor="middle" dominant-baseline="central">SHARE CROW</text>
</svg>`);
}

for (const size of sizes) {
  await sharp(createSVG(size, false))
    .png()
    .toFile(`${iconDir}/icon-${size}x${size}.png`);
  console.log(`Created icon-${size}x${size}.png`);

  await sharp(createSVG(size, true))
    .png()
    .toFile(`${iconDir}/icon-maskable-${size}x${size}.png`);
  console.log(`Created icon-maskable-${size}x${size}.png`);
}

console.log("All PWA icons generated!");
