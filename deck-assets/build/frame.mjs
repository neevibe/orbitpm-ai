import sharp from 'sharp';
import { readdirSync } from 'node:fs';

/**
 * Turn each raw screenshot into a premium "browser window" mockup:
 * rounded corners, a title bar with three dots, a hairline border and
 * baked-in soft shadow on a transparent canvas (so it drops onto any slide).
 */

const SRC = '/home/user/orbitpm-ai/deck-assets/shots';
const OUT = '/home/user/orbitpm-ai/deck-assets/framed';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const R = 22;            // corner radius of the window
const BAR = 64;          // title-bar height
const BORDER = 2;        // hairline border
const PAD = 60;          // transparent padding for the shadow
const SHADOW_BLUR = 34;
const SHADOW_DY = 22;

function roundedMask(w, h, r) {
  return Buffer.from(`<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`);
}

async function frameOne(file) {
  const name = file.replace(/\.png$/, '');
  const shot = sharp(`${SRC}/${file}`);
  const meta = await shot.metadata();
  const w = meta.width, h = meta.height;

  // window = titlebar + screenshot
  const winW = w;
  const winH = h + BAR;

  // title bar svg (white with 3 dots + subtle bottom divider)
  const bar = Buffer.from(`
    <svg width="${winW}" height="${BAR}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${winW}" height="${BAR}" fill="#F8FAFC"/>
      <line x1="0" y1="${BAR - 1}" x2="${winW}" y2="${BAR - 1}" stroke="#E2E8F0" stroke-width="2"/>
      <circle cx="42" cy="${BAR / 2}" r="9" fill="#F87171"/>
      <circle cx="76" cy="${BAR / 2}" r="9" fill="#FBBF24"/>
      <circle cx="110" cy="${BAR / 2}" r="9" fill="#34D399"/>
      <rect x="${winW / 2 - 220}" y="${BAR / 2 - 16}" width="440" height="32" rx="16" fill="#EEF2F8"/>
      <text x="${winW / 2}" y="${BAR / 2 + 6}" font-family="Arial" font-size="20" fill="#94A3B8" text-anchor="middle">xyrenis.app</text>
    </svg>`);

  // compose window (bar on top, screenshot below) on white
  const windowImg = await sharp({ create: { width: winW, height: winH, channels: 4, background: '#FFFFFF' } })
    .composite([
      { input: bar, top: 0, left: 0 },
      { input: await shot.png().toBuffer(), top: BAR, left: 0 },
    ])
    .png().toBuffer();

  // round the whole window + add hairline border
  const bordered = await sharp(windowImg)
    .composite([{ input: roundedMask(winW, winH, R), blend: 'dest-in' }])
    .composite([{
      input: Buffer.from(`<svg width="${winW}" height="${winH}"><rect x="${BORDER/2}" y="${BORDER/2}" width="${winW-BORDER}" height="${winH-BORDER}" rx="${R}" ry="${R}" fill="none" stroke="#E2E8F0" stroke-width="${BORDER}"/></svg>`),
      top: 0, left: 0,
    }])
    .png().toBuffer();

  // shadow layer: a rounded soft shape (fill-opacity baked in), blurred, offset down
  const canvasW = winW + PAD * 2;
  const canvasH = winH + PAD * 2;
  const shadow = await sharp(Buffer.from(`<svg width="${winW}" height="${winH}"><rect x="24" y="24" width="${winW-48}" height="${winH-48}" rx="${R}" ry="${R}" fill="#334155" fill-opacity="0.22"/></svg>`))
    .blur(SHADOW_BLUR)
    .png().toBuffer();

  await sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: '#00000000' } })
    .composite([
      { input: shadow, top: PAD + SHADOW_DY, left: PAD },
      { input: bordered, top: PAD, left: PAD },
    ])
    .png()
    .toFile(`${OUT}/${name}.png`);
  console.log('framed', name, `${canvasW}x${canvasH}`);
}

for (const f of readdirSync(SRC).filter(f => f.endsWith('.png'))) {
  await frameOne(f);
}
console.log('ALL FRAMED');
