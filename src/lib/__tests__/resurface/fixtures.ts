import type { Capture, CaptureKind } from '../../types';
import type { MomentView } from '../../resurface/types';

export const DAY = 24 * 60 * 60 * 1000;
/** Thursday, 5 Nov 2026, noon local. */
export const NOW = new Date(2026, 10, 5, 12).getTime();
/** Local noon, `y`-`m` (1-12)-`d`. */
export const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

let n = 0;
export function moment(t: number, words: string | null, o: Partial<MomentView> & { kind?: CaptureKind } = {}): MomentView {
  const kind = o.kind ?? 'text';
  const id = o.id ?? `m${++n}`;
  const capture: Capture = { id, walk_id: o.walkId ?? null, t, lat: null, lon: null, kind, file_path: kind === 'text' ? null : 'f', body: kind === 'text' ? words : null, segment_id: null, caption: kind === 'photo' ? words : null };
  return { id, t, kind, walkId: null, words, place: null, hasMedia: true, capture, ...o };
}
