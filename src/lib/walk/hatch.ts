// @layer core
import { zlibSync } from 'fflate';

/*
 * The hatch that marks ground built around cars (G5, decision 0232): thin parallel lines in one slate, rising left to
 * right, on a clear ground, so the streets and their names show between them. One tile that repeats with no seam: the
 * lines run corner to corner of a tile of `run` by `rise` steps, so its angle is atan(rise / run). Pure: the same look
 * gives the same pixels, on the web map (`addImage`), the native map and the legend's swatch.
 */

export interface HatchLook {
  /** The tile's proportions: 1:1 is 45 degrees, 2:1 about 27 (flatter), 1:2 about 63 (steeper). */
  run: number;
  rise: number;
  /** Between two lines, across them, in CSS pixels. */
  spacingPx: number;
  /** Each line's width, in CSS pixels. */
  lineWidthPx: number;
  /** How strong a line is, 0 to 1. */
  lineOpacity: number;
  /** The firm edge line's width, in CSS pixels. */
  edgeWidthPx: number;
  edgeOpacity: number;
  /** '#rrggbb'. */
  color: string;
}

export interface HatchImage {
  width: number;
  height: number;
  /** RGBA, not premultiplied, row by row from the top. */
  data: Uint8Array;
  pixelRatio: number;
}

/** The tile's size in device pixels (the look's CSS pixels times the ratio), whole each way, so it repeats without a seam. */
export function hatchTile(look: HatchLook, pixelRatio: number): { w: number; h: number; m: number } {
  const { run, rise } = look;
  // One line per tile: across it the lines are m * run * rise / hypot(run, rise) apart.
  const m = Math.max(1, Math.round((look.spacingPx * pixelRatio * Math.hypot(run, rise)) / (run * rise)));
  return { w: run * m, h: rise * m, m };
}

export function hatchImage(look: HatchLook, pixelRatio: number): HatchImage {
  const { w, h } = hatchTile(look, pixelRatio);
  const across = (w * h) / Math.hypot(w, h);
  const half = (look.lineWidthPx * pixelRatio) / 2;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(look.color.slice(i, i + 2), 16));
  const data = new Uint8Array(w * h * 4);
  const S = 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Four by four samples a pixel, so a line's edge is soft at any angle.
      let cover = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S;
          // Image rows run down, so a line rising to the right is px / w + py / h constant.
          const py = y + (sy + 0.5) / S;
          let u = (px / w + py / h) % 1;
          if (u < 0) u += 1;
          const d = Math.min(u, 1 - u) * across;
          if (d <= half) cover++;
        }
      }
      const k = (y * w + x) * 4;
      data[k] = r;
      data[k + 1] = g;
      data[k + 2] = b;
      data[k + 3] = Math.round((cover / (S * S)) * look.lineOpacity * 255);
    }
  }
  return { width: w, height: h, data, pixelRatio };
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * The hatch as a PNG (8-bit RGBA, no filter), the native map's image (`assets/map/walk-hatch@<ratio>x.png`, CG10): the same
 * pixels as `hatchImage`, so the phone draws what the web does. Deterministic: the same look gives the same bytes.
 */
export function hatchPng(look: HatchLook, pixelRatio: number): Uint8Array {
  const im = hatchImage(look, pixelRatio);
  const raw = new Uint8Array((im.width * 4 + 1) * im.height);
  for (let y = 0; y < im.height; y++) raw.set(im.data.subarray(y * im.width * 4, (y + 1) * im.width * 4), y * (im.width * 4 + 1) + 1);
  const chunk = (type: string, body: Uint8Array) => {
    const out = new Uint8Array(12 + body.length);
    const v = new DataView(out.buffer);
    v.setUint32(0, body.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(body, 8);
    v.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const hv = new DataView(ihdr.buffer);
  hv.setUint32(0, im.width);
  hv.setUint32(4, im.height);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlibSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/**
 * The legend's swatch (CG5): the hatch's lines in a square of `size` CSS pixels, each from the left side to the right at
 * the look's angle and spacing, half a step off the diagonal, so no line runs corner to corner (a slashed box,
 * walkability-car-ground audit 4).
 */
export function swatchLines(look: HatchLook, size: number): { x1: number; y1: number; x2: number; y2: number }[] {
  const theta = Math.atan2(look.rise, look.run);
  const step = look.spacingPx / Math.cos(theta);
  const drop = size * Math.tan(theta);
  const start = (size + drop) / 2 + step / 2;
  const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let c = start - Math.floor(start / step) * step; c < size + drop; c += step) if (c > 0) out.push({ x1: 0, y1: c, x2: size, y2: c - drop });
  return out;
}
