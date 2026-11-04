// @layer core
/**
 * Media editing (ME1-ME23, decision 0084): a photo's or video's edits as
 * data on the untouched original. One order everywhere (screen, bakers,
 * the video module): rotate the original, crop, filter (photos), the
 * drawing, then the caption bar.
 *
 * Everything is kept against the original picture: the crop and the lines'
 * points as fractions of its size, a line's thickness as a fraction of its
 * shorter side. So a later crop or rotation never moves what was marked.
 */

export type Rotation = 0 | 90 | 180 | 270;
export type FilterId = 'original' | 'vivid' | 'warm' | 'cool' | 'dramatic' | 'fade' | 'mono' | 'noir' | 'sepia';
export type PenTool = 'pen' | 'marker';
export type PenColorId = 'black' | 'white' | 'blue' | 'green' | 'yellow' | 'red';
export type Aspect = 'free' | 'square' | '4:5' | '16:9';
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

/** A rectangle as fractions of a frame (0..1). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}

/** A drawn line: points as fractions of the original, flat [x0, y0, x1, y1, ...]. */
export interface Stroke {
  tool: PenTool;
  color: PenColorId;
  /** Thickness as a fraction of the original picture's shorter side. */
  w: number;
  pts: number[];
}

export interface Trim {
  start_ms: number;
  end_ms: number;
}

export interface MediaEdit {
  v: 1;
  /** Clockwise, applied to the original first. */
  rotate: Rotation;
  /** In the original picture's fractions; null is the whole picture. */
  crop: Rect | null;
  /** Photos only. */
  filter: FilterId;
  strokes: Stroke[];
  /** Videos only; null is the whole clip. */
  trim: Trim | null;
}

export const MIN_CROP = 0.1;
export const MAX_STROKES = 50;
export const MIN_TRIM_MS = 1000;
export const MARKER_OPACITY = 0.4;

export const emptyEdit = (): MediaEdit => ({ v: 1, rotate: 0, crop: null, filter: 'original', strokes: [], trim: null });

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };
const isFull = (r: Rect | null) => !r || (r.x <= 1e-6 && r.y <= 1e-6 && r.w >= 1 - 1e-6 && r.h >= 1 - 1e-6);

// ---------------------------------------------------------------- rotation and crop

/** The next quarter turn clockwise (ME5). */
export const rotateBy = (r: Rotation): Rotation => (((r + 90) % 360) as Rotation);

/** A point of the original (fractions) in the rotated frame (fractions). */
export function rotPoint(p: Point, r: Rotation): Point {
  switch (r) {
    case 90:
      return { x: 1 - p.y, y: p.x };
    case 180:
      return { x: 1 - p.x, y: 1 - p.y };
    case 270:
      return { x: p.y, y: 1 - p.x };
    default:
      return { x: p.x, y: p.y };
  }
}

/** A point of the rotated frame back in the original. */
export function unrotPoint(p: Point, r: Rotation): Point {
  switch (r) {
    case 90:
      return { x: p.y, y: 1 - p.x };
    case 180:
      return { x: 1 - p.x, y: 1 - p.y };
    case 270:
      return { x: 1 - p.y, y: p.x };
    default:
      return { x: p.x, y: p.y };
  }
}

/** The original's crop as a rectangle of the rotated frame (axis-aligned at quarter turns). */
export function cropToRotated(c: Rect | null, r: Rotation): Rect {
  const k = c ?? FULL;
  switch (r) {
    case 90:
      return { x: 1 - (k.y + k.h), y: k.x, w: k.h, h: k.w };
    case 180:
      return { x: 1 - (k.x + k.w), y: 1 - (k.y + k.h), w: k.w, h: k.h };
    case 270:
      return { x: k.y, y: 1 - (k.x + k.w), w: k.h, h: k.w };
    default:
      return { ...k };
  }
}

/** A rectangle of the rotated frame as the original's crop. */
export function cropFromRotated(k: Rect, r: Rotation): Rect {
  switch (r) {
    case 90:
      return { x: k.y, y: 1 - (k.x + k.w), w: k.h, h: k.w };
    case 180:
      return { x: 1 - (k.x + k.w), y: 1 - (k.y + k.h), w: k.w, h: k.h };
    case 270:
      return { x: 1 - (k.y + k.h), y: k.x, w: k.h, h: k.w };
    default:
      return { ...k };
  }
}

/** The rotated frame's size in pixels. */
export const rotatedSize = (W: number, H: number, r: Rotation) => (r % 180 === 0 ? { w: W, h: H } : { w: H, h: W });

/** The edited picture's size in the original's pixels (ME5, ME7). */
export function editedSize(W: number, H: number, e: Pick<MediaEdit, 'rotate' | 'crop'>): { w: number; h: number } {
  const rs = rotatedSize(W, H, e.rotate);
  const c = cropToRotated(e.crop, e.rotate);
  return { w: rs.w * c.w, h: rs.h * c.h };
}

/** A point of the original (fractions) as fractions of the edited frame (ME11). */
export function toFrame(p: Point, e: Pick<MediaEdit, 'rotate' | 'crop'>): Point {
  const q = rotPoint(p, e.rotate);
  const c = cropToRotated(e.crop, e.rotate);
  return { x: (q.x - c.x) / c.w, y: (q.y - c.y) / c.h };
}

/** A point of the edited frame (fractions) back in the original (for drawing on it). */
export function fromFrame(p: Point, e: Pick<MediaEdit, 'rotate' | 'crop'>): Point {
  const c = cropToRotated(e.crop, e.rotate);
  return unrotPoint({ x: c.x + p.x * c.w, y: c.y + p.y * c.h }, e.rotate);
}

/** A crop inside its frame and no smaller than a tenth of either side (ME6). */
export function clampCrop(r: Rect, min = MIN_CROP): Rect {
  const w = clamp(r.w, min, 1);
  const h = clamp(r.h, min, 1);
  return { x: clamp(r.x, 0, 1 - w), y: clamp(r.y, 0, 1 - h), w, h };
}

export const ASPECTS: { id: Aspect; label: string; ratio: number | null }[] = [
  { id: 'free', label: 'Free', ratio: null },
  { id: 'square', label: 'Square', ratio: 1 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
];

export const aspectRatio = (a: Aspect): number | null => ASPECTS.find((x) => x.id === a)?.ratio ?? null;

/** The largest centred rectangle of an aspect (width over height, in pixels) in a frame of fw x fh (ME6). */
export function aspectRect(a: Aspect, fw: number, fh: number): Rect {
  const ratio = aspectRatio(a);
  if (!ratio) return { ...FULL };
  let w = 1;
  let h = 1;
  if (fw / fh > ratio) w = (fh * ratio) / fw;
  else h = fw / ratio / fh;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

/** The crop moved by a drag inside it, kept inside the frame. */
export function moveCrop(r: Rect, dx: number, dy: number): Rect {
  return { x: clamp(r.x + dx, 0, 1 - r.w), y: clamp(r.y + dy, 0, 1 - r.h), w: r.w, h: r.h };
}

/**
 * The crop resized by dragging one corner by (dx, dy), in the frame's
 * fractions; the opposite corner stays. With a ratio (pixels, width over
 * height) the height follows the width (ME6).
 */
export function resizeCrop(r: Rect, corner: Corner, dx: number, dy: number, ratio: number | null, fw: number, fh: number, min = MIN_CROP): Rect {
  const left = corner === 'tl' || corner === 'bl';
  const top = corner === 'tl' || corner === 'tr';
  let x0 = r.x;
  let y0 = r.y;
  let x1 = r.x + r.w;
  let y1 = r.y + r.h;
  if (left) x0 = clamp(x0 + dx, 0, x1 - min);
  else x1 = clamp(x1 + dx, x0 + min, 1);
  if (top) y0 = clamp(y0 + dy, 0, y1 - min);
  else y1 = clamp(y1 + dy, y0 + min, 1);
  if (ratio) {
    let w = x1 - x0;
    let h = (w * fw) / ratio / fh;
    const maxH = top ? y1 : 1 - y0;
    const maxW = left ? x1 : 1 - x0;
    if (h > maxH) {
      h = maxH;
      w = (h * fh * ratio) / fw;
    }
    if (w < min || h < min) {
      const k = Math.max(min / w, min / h);
      w = Math.min(w * k, maxW);
      h = Math.min(h * k, maxH);
    }
    if (left) x0 = x1 - w;
    else x1 = x0 + w;
    if (top) y0 = y1 - h;
    else y1 = y0 + h;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ---------------------------------------------------------------- the export plan

/** A 2D affine transform, canvas order: x' = a x + c y + e, y' = b x + d y + f. */
export type Affine = [number, number, number, number, number, number];

export const applyAffine = (m: Affine, p: Point): Point => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });

/** The original's pixels to the rotated frame's pixels. */
function rotationAffine(r: Rotation, W: number, H: number): Affine {
  switch (r) {
    case 90:
      return [0, 1, -1, 0, H, 0];
    case 180:
      return [-1, 0, 0, -1, W, H];
    case 270:
      return [0, -1, 1, 0, 0, W];
    default:
      return [1, 0, 0, 1, 0, 0];
  }
}

export interface ExportPlan {
  /** The output's size in pixels. */
  out: { w: number; h: number };
  /** The crop in the rotated frame's pixels. */
  crop: { x: number; y: number; w: number; h: number };
  rotate: Rotation;
  /** The original's pixels to the output's pixels. */
  matrix: Affine;
  /** Output pixels per original pixel. */
  scale: number;
}

/**
 * How an edited picture is rendered out (ME19): the output size (capped by
 * width for photos, by the long side and with even sides for video), the crop
 * in the rotated frame, and one transform from the original's pixels to the
 * output's, which the canvas, SVG and the video module all use.
 */
export function exportPlan(src: { w: number; h: number }, e: Pick<MediaEdit, 'rotate' | 'crop'>, o: { maxW?: number; maxLong?: number; even?: boolean }): ExportPlan {
  const rs = rotatedSize(src.w, src.h, e.rotate);
  const c = cropToRotated(e.crop, e.rotate);
  const crop = { x: rs.w * c.x, y: rs.h * c.y, w: rs.w * c.w, h: rs.h * c.h };
  let s = 1;
  if (o.maxW && crop.w * s > o.maxW) s = o.maxW / crop.w;
  if (o.maxLong && Math.max(crop.w, crop.h) * s > o.maxLong) s = o.maxLong / Math.max(crop.w, crop.h);
  const round = (v: number) => (o.even ? Math.max(2, 2 * Math.round(v / 2)) : Math.max(1, Math.round(v)));
  const out = { w: round(crop.w * s), h: round(crop.h * s) };
  const sx = out.w / crop.w;
  const sy = out.h / crop.h;
  const [a, b, cc, d, ee, f] = rotationAffine(e.rotate, src.w, src.h);
  const matrix: Affine = [a * sx, b * sy, cc * sx, d * sy, (ee - crop.x) * sx, (f - crop.y) * sy];
  return { out, crop, rotate: e.rotate, matrix, scale: sx };
}

// ---------------------------------------------------------------- filters

/** A 4x5 colour matrix, SVG's feColorMatrix order (offsets on a 0..1 scale). */
export type ColorMatrix = readonly number[];

const IDENTITY: ColorMatrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

/** A then B: B applied first. */
function mul(a: ColorMatrix, b: ColorMatrix): ColorMatrix {
  const out: number[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 5; j++) {
      let v = j === 4 ? a[i * 5 + 4] : 0;
      for (let k = 0; k < 4; k++) v += a[i * 5 + k] * b[k * 5 + j];
      out.push(Math.round(v * 1e6) / 1e6);
    }
  }
  return out;
}

/** SVG's saturate: s = 0 is grey by luminance, 1 unchanged. */
function saturate(s: number): ColorMatrix {
  return [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0, 0,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0, 0,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** Contrast about mid-grey. */
function contrast(c: number): ColorMatrix {
  const o = (1 - c) / 2;
  return [c, 0, 0, 0, o, 0, c, 0, 0, o, 0, 0, c, 0, o, 0, 0, 0, 1, 0];
}

/** Each channel scaled, then lifted. */
function channels(r: number, g: number, b: number, lift: [number, number, number] = [0, 0, 0]): ColorMatrix {
  return [r, 0, 0, 0, lift[0], 0, g, 0, 0, lift[1], 0, 0, b, 0, lift[2], 0, 0, 0, 1, 0];
}

const SEPIA: ColorMatrix = [0.393, 0.769, 0.189, 0, 0, 0.349, 0.686, 0.168, 0, 0, 0.272, 0.534, 0.131, 0, 0, 0, 0, 0, 1, 0];

export const FILTER_IDS: readonly FilterId[] = ['original', 'vivid', 'warm', 'cool', 'dramatic', 'fade', 'mono', 'noir', 'sepia'];

/**
 * The presets (ME8, ME9): the set a phone's photo app offers, each one colour
 * matrix, under plain names (decision 0084).
 */
export const FILTERS: Readonly<Record<FilterId, { label: string; matrix: ColorMatrix }>> = {
  original: { label: 'Original', matrix: IDENTITY },
  vivid: { label: 'Vivid', matrix: mul(contrast(1.08), saturate(1.45)) },
  warm: { label: 'Warm', matrix: mul(channels(1.06, 1.0, 0.86, [0.02, 0.01, 0]), saturate(1.1)) },
  cool: { label: 'Cool', matrix: mul(channels(0.9, 1.0, 1.08, [0, 0.005, 0.03]), saturate(1.05)) },
  dramatic: { label: 'Dramatic', matrix: mul(channels(0.97, 0.97, 0.97), mul(contrast(1.35), saturate(0.8))) },
  fade: { label: 'Fade', matrix: mul(contrast(0.82), saturate(0.75)) },
  mono: { label: 'Mono', matrix: saturate(0) },
  noir: { label: 'Noir', matrix: mul(contrast(1.5), saturate(0)) },
  sepia: { label: 'Sepia', matrix: SEPIA },
};

/** One pixel (0-255 each) through a matrix, clamped and rounded; alpha is taken as opaque. */
export function applyMatrix(px: readonly [number, number, number] | readonly number[], m: ColorMatrix): [number, number, number] {
  const r = px[0] / 255;
  const g = px[1] / 255;
  const b = px[2] / 255;
  const ch = (i: number) => Math.round(clamp(m[i] * r + m[i + 1] * g + m[i + 2] * b + m[i + 3] + m[i + 4], 0, 1) * 255);
  return [ch(0), ch(5), ch(10)];
}

/** A matrix for SVG's `values`. */
export const matrixValues = (m: ColorMatrix): string => m.join(' ');

// ---------------------------------------------------------------- drawing

/** The swatches of the iPhone's Markup, Black first (ME10). */
export const PEN_COLORS: readonly { id: PenColorId; label: string; hex: string }[] = [
  { id: 'black', label: 'Black', hex: '#000000' },
  { id: 'white', label: 'White', hex: '#FFFFFF' },
  { id: 'blue', label: 'Blue', hex: '#0A84FF' },
  { id: 'green', label: 'Green', hex: '#30D158' },
  { id: 'yellow', label: 'Yellow', hex: '#FFD60A' },
  { id: 'red', label: 'Red', hex: '#FF453A' },
];
export const penHex = (id: PenColorId): string => PEN_COLORS.find((c) => c.id === id)?.hex ?? '#000000';

/** Thin, medium, thick: fractions of the shorter side of the frame being drawn on. */
export const PEN_SIZES: Readonly<Record<PenTool, readonly [number, number, number]>> = {
  pen: [0.006, 0.012, 0.022],
  marker: [0.03, 0.045, 0.065],
};
export const SIZE_LABELS = ['Thin', 'Medium', 'Thick'] as const;

/** A new line's thickness against the original's shorter side, so it shows the chosen size on the frame drawn on (ME11). */
export function strokeWidthFor(tool: PenTool, size: number, W: number, H: number, e: Pick<MediaEdit, 'rotate' | 'crop'>): number {
  const f = editedSize(W, H, e);
  return (PEN_SIZES[tool][clamp(Math.round(size), 0, 2)] * Math.min(f.w, f.h)) / Math.min(W, H);
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Whether the eraser at `p` (original fractions), `radius` as a fraction of
 * the original's shorter side, touches a line (ME10): Markup's object eraser.
 */
export function strokeHit(s: Stroke, p: Point, radius: number, W: number, H: number): boolean {
  const short = Math.min(W, H);
  const reach = (radius + s.w / 2) * short;
  const X = p.x * W;
  const Y = p.y * H;
  const n = s.pts.length / 2;
  if (n === 1) return Math.hypot(X - s.pts[0] * W, Y - s.pts[1] * H) <= reach;
  for (let i = 0; i < n - 1; i++) {
    if (segDist(X, Y, s.pts[2 * i] * W, s.pts[2 * i + 1] * H, s.pts[2 * i + 2] * W, s.pts[2 * i + 3] * H) <= reach) return true;
  }
  return false;
}

/** Ramer-Douglas-Peucker on flat points: the ends kept, points within `tol` of the line dropped (ME11). */
export function simplifyStroke(pts: readonly number[], tol: number): number[] {
  const n = Math.floor(pts.length / 2);
  if (n <= 2) return pts.slice(0, n * 2);
  const keep = new Array<boolean>(n).fill(false);
  keep[0] = true;
  keep[n - 1] = true;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    let best = -1;
    let at = -1;
    for (let k = i + 1; k < j; k++) {
      const d = segDist(pts[2 * k], pts[2 * k + 1], pts[2 * i], pts[2 * i + 1], pts[2 * j], pts[2 * j + 1]);
      if (d > best) {
        best = d;
        at = k;
      }
    }
    if (at >= 0 && best > tol) {
      keep[at] = true;
      stack.push([i, at], [at, j]);
    }
  }
  const out: number[] = [];
  for (let k = 0; k < n; k++) if (keep[k]) out.push(pts[2 * k], pts[2 * k + 1]);
  return out;
}

// ---------------------------------------------------------------- trim

/** A trim inside the clip keeping at least a second; a clip under a second keeps all of it (ME14). */
export function clampTrim(start: number, end: number, duration: number): Trim {
  const dur = Math.max(0, Math.round(duration));
  if (dur <= MIN_TRIM_MS) return { start_ms: 0, end_ms: dur };
  const s = Math.round(clamp(start, 0, dur - MIN_TRIM_MS));
  const e = Math.round(clamp(end, s + MIN_TRIM_MS, dur));
  return { start_ms: s, end_ms: e };
}

const clock = (ms: number) => {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** "0:02 – 0:09" (ME14). */
export const trimLabel = (start: number, end: number): string => `${clock(start)} – ${clock(end)}`;

/** The longest a clip can be (the camera's cap on phones), for a source that says no length. */
const LONGEST_S = 30;

/**
 * The part of a video an export plays (media-editing audit 10): the trim, else
 * the whole clip by the media's own duration, else by the capture's stored
 * length (MediaRecorder's WebM reports none), else the longest a clip can be.
 */
export function exportSpan(trim: Trim | null, mediaDurationS: number, captureMs: number): { startS: number; endS: number } {
  if (trim) return { startS: trim.start_ms / 1000, endS: trim.end_ms / 1000 };
  if (Number.isFinite(mediaDurationS) && mediaDurationS > 0) return { startS: 0, endS: mediaDurationS };
  if (captureMs > 0) return { startS: 0, endS: captureMs / 1000 };
  return { startS: 0, endS: LONGEST_S };
}

/** Whether a trim keeps the whole clip (stored as none). */
export const isFullTrim = (t: Trim | null, duration: number) => !t || (t.start_ms <= 0 && t.end_ms >= duration);

// ---------------------------------------------------------------- storage

/** Nothing changed from the original. */
export function isEmptyEdit(e: MediaEdit | null | undefined): boolean {
  return !e || (e.rotate === 0 && isFull(e.crop) && e.filter === 'original' && e.strokes.length === 0 && !e.trim);
}

/** The stored form (ME21): JSON, or null for no edits. */
export function serializeEdit(e: MediaEdit | null | undefined): string | null {
  return !e || isEmptyEdit(e) ? null : JSON.stringify(e);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const COLOR_IDS = new Set<string>(PEN_COLORS.map((c) => c.id));

function parseStroke(v: unknown): Stroke | null {
  if (!isObj(v)) return null;
  if (v.tool !== 'pen' && v.tool !== 'marker') return null;
  if (typeof v.color !== 'string' || !COLOR_IDS.has(v.color)) return null;
  if (!isNum(v.w) || v.w <= 0) return null;
  if (!Array.isArray(v.pts) || v.pts.length < 2 || v.pts.length % 2 || !v.pts.every(isNum)) return null;
  return { tool: v.tool, color: v.color as PenColorId, w: v.w, pts: v.pts.slice() };
}

/**
 * Reads a stored edit (ME21): the JSON text (SQLite) or the object
 * (IndexedDB). Anything unreadable, or from a newer format, is no edit; a bad
 * crop, line or trim alone is dropped and the rest kept.
 */
export function parseEdit(raw: unknown): MediaEdit | null {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isObj(v) || v.v !== 1) return null;
  const rotate = v.rotate ?? 0;
  if (rotate !== 0 && rotate !== 90 && rotate !== 180 && rotate !== 270) return null;
  const filter = v.filter ?? 'original';
  if (typeof filter !== 'string' || !(FILTER_IDS as readonly string[]).includes(filter)) return null;
  let crop: Rect | null = null;
  if (isObj(v.crop) && isNum(v.crop.x) && isNum(v.crop.y) && isNum(v.crop.w) && isNum(v.crop.h) && v.crop.w > 0 && v.crop.h > 0) {
    crop = clampCrop({ x: v.crop.x, y: v.crop.y, w: v.crop.w, h: v.crop.h });
    if (isFull(crop)) crop = null;
  }
  const strokes = Array.isArray(v.strokes) ? v.strokes.map(parseStroke).filter((s): s is Stroke => !!s).slice(0, MAX_STROKES) : [];
  let trim: Trim | null = null;
  if (isObj(v.trim) && isNum(v.trim.start_ms) && isNum(v.trim.end_ms) && v.trim.start_ms >= 0 && v.trim.end_ms > v.trim.start_ms) {
    trim = { start_ms: v.trim.start_ms, end_ms: v.trim.end_ms };
  }
  return { v: 1, rotate, crop, filter: filter as FilterId, strokes, trim };
}
