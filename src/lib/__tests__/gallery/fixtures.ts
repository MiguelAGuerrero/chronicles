import { faced, type Faced } from '../../moment';
import type { Capture, CaptureKind, Walk } from '../../types';

/** Wednesday, 11 Nov 2026, noon local. */
export const NOW = new Date(2026, 10, 11, 12).getTime();
/** Local `h`:`min` on `y`-`m` (1-12)-`d`. */
export const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();

/** A moment of pieces, each `[kind, t]` (a memo's or video's body is its length). */
export function mo(id: string, pieces: [CaptureKind, number, string?][], walkId: string | null = null): Faced {
  const ps: Capture[] = pieces.map(([kind, t, body], i) => ({
    id: i === 0 ? id : `${id}.${i}`,
    moment_id: id,
    t,
    kind,
    file_path: kind === 'text' ? null : `${id}-${i}.bin`,
    body: body ?? (kind === 'text' ? 'words' : kind === 'photo' ? null : '42000'),
    thumb_path: kind === 'photo' ? `${id}-${i}.thumb.jpg` : null,
    caption: kind === 'photo' ? 'A caption never on the tile' : null,
  }));
  return faced({ id, walk_id: walkId, t: ps[0].t, lat: null, lon: null, segment_id: null, pieces: ps });
}

export function walk(id: string, started_at: number, o: Partial<Walk> = {}): Walk {
  return { id, started_at, ended_at: started_at + 3600_000, title: null, epilogue: null, open: false, area: null, snapped_build: null, ...o };
}
