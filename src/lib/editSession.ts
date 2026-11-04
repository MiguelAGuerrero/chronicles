// @layer core
import {
  aspectRect,
  clampTrim,
  cropFromRotated,
  emptyEdit,
  isFullTrim,
  MAX_STROKES,
  parseEdit,
  rotatedSize,
  rotateBy,
  serializeEdit,
  type Aspect,
  type FilterId,
  type MediaEdit,
  type PenColorId,
  type Rect,
  type Stroke,
} from './mediaEdit';

/**
 * The editor's own state (ME2, ME3, ME10, ME14): a draft of the moment's
 * edits and caption, the drawing's undo history, and the close/discard flow.
 * Nothing is saved until Done; Done with no change writes nothing.
 */

export type EditTool = 'crop' | 'filter' | 'draw' | 'text' | 'trim';
export type DrawTool = 'pen' | 'marker' | 'eraser';

export interface Saved {
  edit: MediaEdit | null;
  caption: string | null;
  caption_y: number | null;
}

export interface Session {
  kind: 'photo' | 'video';
  tool: EditTool;
  edit: MediaEdit;
  caption: string;
  captionY: number;
  aspect: Aspect;
  pen: { tool: DrawTool; color: PenColorId; size: { pen: number; marker: number }; sizesOpen: boolean };
  /** Earlier line lists, for Undo; later ones, for Redo. */
  past: Stroke[][];
  future: Stroke[][];
  /** The 50-line limit was reached (ME11). */
  full: boolean;
  confirming: boolean;
  saved: Saved;
}

export type SessionEvent =
  | { type: 'tool'; tool: EditTool }
  | { type: 'rotate' }
  | { type: 'crop'; crop: Rect | null }
  | { type: 'aspect'; aspect: Aspect; W: number; H: number }
  | { type: 'filter'; id: FilterId }
  | { type: 'penTool'; tool: DrawTool }
  | { type: 'penColor'; color: PenColorId }
  | { type: 'penSize'; size: number }
  | { type: 'stroke'; stroke: Stroke }
  | { type: 'erase'; indexes: number[] }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'caption'; text: string; y: number }
  | { type: 'trim'; start: number; end: number; duration: number }
  | { type: 'revert' }
  | { type: 'close' }
  | { type: 'keepEditing' }
  | { type: 'discard' }
  | { type: 'done' };

export type SessionEffect = { type: 'close' } | { type: 'save'; saved: Saved } | null;

export const DEFAULT_CAPTION_Y = 0.6;
export const TOOLS: Record<'photo' | 'video', EditTool[]> = {
  photo: ['crop', 'filter', 'draw', 'text'],
  video: ['crop', 'draw', 'text', 'trim'],
};

const captionOf = (text: string): string | null => text.trim() || null;
const isFullCrop = (r: Rect | null) => !r || (r.x <= 1e-6 && r.y <= 1e-6 && r.w >= 1 - 1e-6 && r.h >= 1 - 1e-6);

export function openSession(kind: 'photo' | 'video', saved: Saved, tool: EditTool = 'crop'): Session {
  const edit = parseEdit(saved.edit) ?? emptyEdit();
  return {
    kind,
    tool: TOOLS[kind].includes(tool) ? tool : 'crop',
    edit,
    caption: saved.caption ?? '',
    captionY: saved.caption_y ?? DEFAULT_CAPTION_Y,
    aspect: 'free',
    pen: { tool: 'pen', color: 'black', size: { pen: 1, marker: 1 }, sizesOpen: false },
    past: [],
    future: [],
    full: false,
    confirming: false,
    saved: { edit: saved.edit ?? null, caption: saved.caption ?? null, caption_y: saved.caption ? (saved.caption_y ?? DEFAULT_CAPTION_Y) : null },
  };
}

/** What Done would store. */
export function result(s: Session): Saved {
  const caption = captionOf(s.caption);
  const edit = serializeEdit(s.edit) ? s.edit : null;
  return { edit, caption, caption_y: caption ? s.captionY : null };
}

/** Whether Done would change anything (ME2). */
export function changed(s: Session): boolean {
  const now = result(s);
  return serializeEdit(now.edit) !== serializeEdit(s.saved.edit) || now.caption !== s.saved.caption || (!!now.caption && now.caption_y !== s.saved.caption_y);
}

const withStrokes = (s: Session, strokes: Stroke[]): Session => ({
  ...s,
  edit: { ...s.edit, strokes },
  past: [...s.past, s.edit.strokes],
  future: [],
  full: strokes.length >= MAX_STROKES,
});

export function step(s: Session, e: SessionEvent): { state: Session; effect: SessionEffect } {
  const done = (state: Session, effect: SessionEffect = null) => ({ state, effect });
  switch (e.type) {
    case 'tool':
      return done({ ...s, tool: TOOLS[s.kind].includes(e.tool) ? e.tool : s.tool, pen: { ...s.pen, sizesOpen: false } });
    case 'rotate':
      // The crop is kept against the original, so it stays on the same part of the picture; an aspect would now be sideways.
      return done({ ...s, edit: { ...s.edit, rotate: rotateBy(s.edit.rotate) }, aspect: 'free' });
    case 'crop':
      return done({ ...s, edit: { ...s.edit, crop: isFullCrop(e.crop) ? null : e.crop } });
    case 'aspect': {
      const rs = rotatedSize(e.W, e.H, s.edit.rotate);
      const crop = e.aspect === 'free' ? s.edit.crop : cropFromRotated(aspectRect(e.aspect, rs.w, rs.h), s.edit.rotate);
      return done({ ...s, aspect: e.aspect, edit: { ...s.edit, crop: isFullCrop(crop) ? null : crop } });
    }
    case 'filter':
      return done({ ...s, edit: { ...s.edit, filter: s.kind === 'photo' ? e.id : 'original' } });
    case 'penTool':
      if (e.tool === s.pen.tool && e.tool !== 'eraser') return done({ ...s, pen: { ...s.pen, sizesOpen: !s.pen.sizesOpen } });
      return done({ ...s, pen: { ...s.pen, tool: e.tool, sizesOpen: false } });
    case 'penColor':
      return done({ ...s, pen: { ...s.pen, color: e.color, tool: s.pen.tool === 'eraser' ? 'pen' : s.pen.tool } });
    case 'penSize': {
      if (s.pen.tool === 'eraser') return done(s);
      const size = Math.max(0, Math.min(2, Math.round(e.size)));
      return done({ ...s, pen: { ...s.pen, size: { ...s.pen.size, [s.pen.tool]: size }, sizesOpen: false } });
    }
    case 'stroke':
      if (s.edit.strokes.length >= MAX_STROKES) return done({ ...s, full: true });
      return done(withStrokes(s, [...s.edit.strokes, e.stroke]));
    case 'erase': {
      const gone = new Set(e.indexes);
      const strokes = s.edit.strokes.filter((_, i) => !gone.has(i));
      return done(strokes.length === s.edit.strokes.length ? s : withStrokes(s, strokes));
    }
    case 'undo': {
      const prev = s.past[s.past.length - 1];
      if (!prev) return done(s);
      return done({ ...s, edit: { ...s.edit, strokes: prev }, past: s.past.slice(0, -1), future: [s.edit.strokes, ...s.future], full: prev.length >= MAX_STROKES });
    }
    case 'redo': {
      const next = s.future[0];
      if (!next) return done(s);
      return done({ ...s, edit: { ...s.edit, strokes: next }, past: [...s.past, s.edit.strokes], future: s.future.slice(1), full: next.length >= MAX_STROKES });
    }
    case 'caption':
      return done({ ...s, caption: e.text, captionY: e.y });
    case 'trim': {
      if (s.kind !== 'video') return done(s);
      const t = clampTrim(e.start, e.end, e.duration);
      return done({ ...s, edit: { ...s.edit, trim: isFullTrim(t, e.duration) ? null : t } });
    }
    case 'revert':
      return done({ ...s, edit: emptyEdit(), caption: '', captionY: DEFAULT_CAPTION_Y, aspect: 'free', past: [], future: [], full: false });
    case 'close':
      return changed(s) ? done({ ...s, confirming: true }) : done(s, { type: 'close' });
    case 'keepEditing':
      return done({ ...s, confirming: false });
    case 'discard':
      return done(s, { type: 'close' });
    case 'done':
      return changed(s) ? done(s, { type: 'save', saved: result(s) }) : done(s, { type: 'close' });
  }
}
