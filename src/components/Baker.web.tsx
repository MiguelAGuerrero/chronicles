import type { ReactElement } from 'react';
import { captionMetrics, captionTop } from './Caption';

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

/**
 * Draws a photo with its caption bar into a new JPEG, for export. The bar is
 * sized and placed against the photo with the same numbers as on screen.
 */
async function bake(uri: string, caption: string, y: number): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const g = canvas.getContext('2d')!;
  g.drawImage(bmp, 0, 0);
  const m = captionMetrics(bmp.width);
  g.font = `600 ${m.fontSize}px -apple-system, system-ui, sans-serif`;
  const lines = wrap(g, caption, bmp.width - 2 * m.padX);
  const barH = lines.length * m.lineHeight + 2 * m.padY;
  const top = captionTop(bmp.height, y, barH);
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(0, top, bmp.width, barH);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, bmp.width / 2, top + m.padY + (i + 0.5) * m.lineHeight));
  bmp.close();
  const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
  if (!out) throw new Error('The captioned photo could not be made.');
  return URL.createObjectURL(out);
}

/** On the web baking needs nothing mounted; the element is empty. */
export function useBaker(): [ReactElement | null, typeof bake] {
  return [null, bake];
}
