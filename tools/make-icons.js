#!/usr/bin/env node
/*
 * Generates the app icons in icons/.
 *
 * Dev-only tooling. The app ships no dependencies and this script has none
 * either — PNGs are encoded by hand with node's built-in zlib, and the mark is
 * drawn with signed distance fields so the edges come out antialiased without a
 * canvas library.
 *
 * The mark is the flashcard from the Review tab in the nav bar — the same
 * rounded rectangle with two lines inside, in the app's own --accent on --bg.
 * No gradients, no shadows, no illustration.
 *
 * Run:  node tools/make-icons.js
 */
"use strict";
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

/* ---------- palette (from phrasebook.html :root) ---------- */
const BG = [0x12, 0x13, 0x1a];     // --bg
const FG = [0x7c, 0x8c, 0xff];     // --accent

/* ---------- the mark, in the nav icon's 24x24 coordinate space ---------- */
/* <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 10h8M8 14h5"/> */
const VB = 24;
const CARD = { x: 3, y: 5, w: 18, h: 14, r: 2 };
const LINES = [[8, 10, 16, 10], [8, 14, 13, 14]];
const STROKE = 1.9;

/* ---------- signed distance fields ---------- */
function sdRoundedBox(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return Math.min(Math.max(qx, qy), 0) + outside - r;
}
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

/*
 * Coverage of the mark at one pixel, 0..1.
 *
 * `frac` is how much of the icon's width the card should span. Maskable icons
 * get a smaller value so the mark survives being cropped to a circle.
 */
function coverage(x, y, size, frac) {
  const scale = (size * frac) / CARD.w;          // viewBox units -> pixels
  const u = (x + 0.5 - size / 2) / scale + VB / 2; // pixel -> viewBox units
  const v = (y + 0.5 - size / 2) / scale + VB / 2;

  const half = STROKE / 2;
  let d = Math.abs(sdRoundedBox(u, v, CARD.x + CARD.w / 2, CARD.y + CARD.h / 2,
                                CARD.w / 2, CARD.h / 2, CARD.r)) - half;
  for (const [ax, ay, bx, by] of LINES) {
    d = Math.min(d, sdSegment(u, v, ax, ay, bx, by) - half);
  }

  const aa = 1 / scale;                          // one pixel, in viewBox units
  return Math.max(0, Math.min(1, 0.5 - d / aa));
}

/* ---------- render ---------- */
function render(size, frac) {
  // RGB, no alpha: iOS composites transparent icon pixels to black anyway, so
  // an opaque icon is what we want and it keeps the file smaller.
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    const row = y * stride;
    raw[row] = 0;                                // filter type 0 (none)
    for (let x = 0; x < size; x++) {
      const a = coverage(x, y, size, frac);
      const o = row + 1 + x * 3;
      for (let c = 0; c < 3; c++) {
        raw[o + c] = Math.round(BG[c] + (FG[c] - BG[c]) * a);
      }
    }
  }
  return raw;
}

/* ---------- PNG container ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // colour type: truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- outputs ---------- */
/*
 * `frac` 0.60 matches how much of a typical iOS app icon the glyph occupies.
 * The maskable variant drops to 0.42 so the whole mark sits inside the 80%
 * safe zone that maskable icons are cropped to.
 */
const ICONS = [
  { file: "icon-32.png",           size: 32,  frac: 0.66 },
  { file: "icon-180.png",          size: 180, frac: 0.60 },
  { file: "icon-192.png",          size: 192, frac: 0.60 },
  { file: "icon-512.png",          size: 512, frac: 0.60 },
  { file: "icon-512-maskable.png", size: 512, frac: 0.42 },
];

const outDir = path.join(__dirname, "..", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const { file, size, frac } of ICONS) {
  const buf = png(size, render(size, frac));
  fs.writeFileSync(path.join(outDir, file), buf);
  console.log(`${file}  ${size}x${size}  ${buf.length} bytes`);
}
