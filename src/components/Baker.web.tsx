import type { ReactElement } from 'react';
import { emptyEdit, exportPlan, FILTERS, MARKER_OPACITY, penHex, type ExportPlan, type MediaEdit } from '../lib/mediaEdit';
import { captionMetrics, captionTop } from './Caption';
import type { BakeJob, BakeOpts, Baker } from './Baker.types';

/** Breaks text into lines no wider than `max`, by word, and by character for a word (or a CJK run) too wide alone. */
function wrap(g: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  const push = (piece: string, sep: string) => {
    const next = line ? `${line}${sep}${piece}` : piece;
    if (g.measureText(next).width <= max) line = next;
    else if (g.measureText(piece).width <= max) {
      if (line) lines.push(line);
      line = piece;
    } else {
      for (const ch of piece) push(ch, '');
    }
  };
  for (const w of text.split(/\s+/).filter(Boolean)) push(w, line ? ' ' : '');
  if (line) lines.push(line);
  return lines;
}

/** The caption bar, sized and placed against the output with the same numbers as on screen. */
function drawCaption(g: CanvasRenderingContext2D, w: number, h: number, caption: string, y: number) {
  const m = captionMetrics(w);
  g.font = `600 ${m.fontSize}px -apple-system, system-ui, sans-serif`;
  const lines = wrap(g, caption, w - 2 * m.padX);
  const barH = lines.length * m.lineHeight + 2 * m.padY;
  const top = captionTop(h, y, barH);
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(0, top, w, barH);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, w / 2, top + m.padY + (i + 0.5) * m.lineHeight));
}

/** The lines, in the original's pixels through the plan's transform, as on screen (ME11). */
function drawStrokes(g: CanvasRenderingContext2D, plan: ExportPlan, edit: MediaEdit, W: number, H: number) {
  const short = Math.min(W, H);
  g.save();
  g.setTransform(...plan.matrix);
  g.lineJoin = 'round';
  for (const s of edit.strokes) {
    const color = penHex(s.color);
    g.globalAlpha = s.tool === 'marker' ? MARKER_OPACITY : 1;
    g.lineWidth = s.w * short;
    g.lineCap = s.tool === 'marker' ? 'butt' : 'round';
    if (s.pts.length === 2) {
      g.fillStyle = color;
      g.beginPath();
      g.arc(s.pts[0] * W, s.pts[1] * H, (s.w * short) / 2, 0, Math.PI * 2);
      g.fill();
      continue;
    }
    g.strokeStyle = color;
    g.beginPath();
    for (let i = 0; i < s.pts.length; i += 2) {
      const x = s.pts[i] * W;
      const y = s.pts[i + 1] * H;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.restore();
}

/**
 * The filter applied to the pixels with the very matrix the tests check
 * (`applyMatrix`'s arithmetic, inlined for speed). `ctx.filter` isn't
 * dependable in Safari, and this matches the screen's sRGB matrix exactly.
 */
function filterPixels(g: CanvasRenderingContext2D, w: number, h: number, m: readonly number[]) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const ch = (r: number, gg: number, b: number, i: number) => {
    const v = (m[i] * r + m[i + 1] * gg + m[i + 2] * b + m[i + 3] + m[i + 4]) * 255;
    return v < 0 ? 0 : v > 255 ? 255 : v;
  };
  for (let p = 0; p < d.length; p += 4) {
    const r = d[p] / 255;
    const gg = d[p + 1] / 255;
    const b = d[p + 2] / 255;
    d[p] = ch(r, gg, b, 0);
    d[p + 1] = ch(r, gg, b, 5);
    d[p + 2] = ch(r, gg, b, 10);
  }
  g.putImageData(img, 0, 0);
}

const toUrl = async (canvas: HTMLCanvasElement, type: string, quality?: number) => {
  const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));
  // iOS keeps a canvas's memory until it is shrunk.
  canvas.width = 0;
  canvas.height = 0;
  if (!out) throw new Error('The photo could not be made.');
  return URL.createObjectURL(out);
};

/**
 * Renders a photo with its edits and caption into a new JPEG (ME16): rotate
 * and crop through the plan's transform, the filter on the pixels, the
 * lines, then the caption bar on the result.
 */
async function bake(uri: string, job: BakeJob, opts: BakeOpts = {}): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const edit = job.edit ?? emptyEdit();
  const plan = exportPlan({ w: bmp.width, h: bmp.height }, edit, opts);
  const canvas = document.createElement('canvas');
  canvas.width = plan.out.w;
  canvas.height = plan.out.h;
  const g = canvas.getContext('2d', { willReadFrequently: edit.filter !== 'original' })!;
  g.imageSmoothingQuality = 'high';
  g.setTransform(...plan.matrix);
  g.drawImage(bmp, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const W = bmp.width;
  const H = bmp.height;
  bmp.close();
  if (edit.filter !== 'original') filterPixels(g, plan.out.w, plan.out.h, FILTERS[edit.filter].matrix);
  drawStrokes(g, plan, edit, W, H);
  if (job.caption) drawCaption(g, plan.out.w, plan.out.h, job.caption, job.captionY ?? 0.6);
  return toUrl(canvas, 'image/jpeg', 0.9);
}

/** The lines and caption alone on a clear PNG the size of the plan's output, laid over a video (ME17). */
async function bakeOverlay(src: { w: number; h: number }, job: BakeJob, plan: ExportPlan): Promise<string | null> {
  const edit = job.edit ?? emptyEdit();
  if (!edit.strokes.length && !job.caption) return null;
  const canvas = document.createElement('canvas');
  canvas.width = plan.out.w;
  canvas.height = plan.out.h;
  const g = canvas.getContext('2d')!;
  drawStrokes(g, plan, edit, src.w, src.h);
  if (job.caption) drawCaption(g, plan.out.w, plan.out.h, job.caption, job.captionY ?? 0.6);
  return toUrl(canvas, 'image/png');
}

/** On the web baking needs nothing mounted; the element is empty. */
export function useBaker(): [ReactElement | null, Baker] {
  return [null, { bake, bakeOverlay }];
}
