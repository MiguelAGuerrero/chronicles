// @layer core
import { dayOfRow, rowAt, type Row } from './layout';
import type { GalleryView, Shape, Size } from './types';

/** Media gallery's saved view (MG22): Newest First, the largest tiles, a square grid at first. */
export const DEFAULT_VIEW: GalleryView = { order: 'newest', size: 0, shape: 'square' };

export function isGalleryView(v: unknown): v is GalleryView {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (o.order === 'newest' || o.order === 'oldest') && (o.size === 0 || o.size === 1 || o.size === 2) && (o.shape === 'square' || o.shape === 'aspect');
}

/** A saved value read back: the default when it is missing or unreadable (MG22). */
export const readView = (v: unknown): GalleryView => (isGalleryView(v) ? v : DEFAULT_VIEW);

/** Zoom In makes tiles larger (fewer across), Zoom Out smaller (MG20); null past either end. */
export function zoomed(size: Size, dir: 'in' | 'out'): Size | null {
  const next = size + (dir === 'in' ? -1 : 1);
  return next === 0 || next === 1 || next === 2 ? next : null;
}

/** A pinch (MG20): spreading the fingers by a quarter zooms in, closing them by a fifth zooms out. */
export function pinchStep(startDistance: number, distance: number): 'in' | 'out' | null {
  if (startDistance <= 0) return null;
  const r = distance / startDistance;
  return r >= 1.25 ? 'in' : r <= 0.8 ? 'out' : null;
}

/** Where to scroll after the size changed (MG20): the header of the day that was at the top. */
export function anchorAfter(before: Row[], offset: number, after: Row[]): number {
  if (!before.length) return 0;
  const day = dayOfRow(before[rowAt(before, offset)]);
  const h = after.find((r) => r.kind === 'header' && r.day.key === day);
  return h ? h.offset : 0;
}

/** How a photo sits in its square cell (MG21): cropped to fill it, or whole inside it. The cell's size never changes. */
export const fitFor = (shape: Shape): 'cover' | 'contain' => (shape === 'square' ? 'cover' : 'contain');
