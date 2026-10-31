import type { ReactElement } from 'react';
import { CAPTION_BAR } from './Caption';

/**
 * Draws a photo with its caption bar into a new JPEG, for export. The bar is
 * placed and sized against the photo exactly as it is on screen.
 */
async function bake(uri: string, caption: string, y: number): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const g = canvas.getContext('2d')!;
  g.drawImage(bmp, 0, 0);
  const h = bmp.height;
  const font = Math.max(15, h * CAPTION_BAR.fontFrac);
  g.font = `600 ${font}px -apple-system, system-ui, sans-serif`;
  // Wrap to the photo's width, as the on-screen bar does.
  const words = caption.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > bmp.width * 0.92 && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  const barH = Math.max(Math.max(36, h * CAPTION_BAR.heightFrac), lines.length * font * 1.25 + font * 0.6);
  const top = Math.max(0, Math.min(y * h - barH / 2, h - barH));
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(0, top, bmp.width, barH);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, bmp.width / 2, top + barH / 2 + (i - (lines.length - 1) / 2) * font * 1.25));
  bmp.close();
  const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
  if (!out) throw new Error('The captioned photo could not be made.');
  return URL.createObjectURL(out);
}

/** On the web baking needs nothing mounted; the element is empty. */
export function useBaker(): [ReactElement | null, typeof bake] {
  return [null, bake];
}
