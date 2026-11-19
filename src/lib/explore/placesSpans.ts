// @layer core
/*
 * The times Places was on during a walk (specs/modes-to-layers MD9, decision 0234): a walk's replay names what it passed
 * only within these spans, so a stretch with Places off stays quiet. A span is [on, off]; `off` is null while it is open
 * (the walk ended with it on). Kept as JSON in meta `places_spans:<walk>`.
 */

export type Span = [number, number | null];
export type Spans = Span[];

export const placesSpansKey = (walkId: string) => `places_spans:${walkId}`;

/** Places turned on or off at `now`: on opens a span unless one is open; off closes the open one; anything else changes nothing. */
export function toggleSpans(spans: Spans, on: boolean, now: number): Spans {
  const open = spans.length > 0 && spans[spans.length - 1][1] == null;
  if (on) return open ? spans : [...spans, [now, null]];
  if (!open) return spans;
  return [...spans.slice(0, -1), [spans[spans.length - 1][0], now]];
}

/** Whether time `t` is inside a span (an open span runs on). */
export const spansCover = (spans: Spans, t: number): boolean => spans.some(([a, b]) => t >= a && (b == null || t <= b));

export const encodeSpans = (s: Spans): string => JSON.stringify(s);

/** The stored spans, read tolerantly: junk and malformed entries are dropped. */
export function decodeSpans(raw: string | null | undefined): Spans {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is Span => Array.isArray(x) && x.length === 2 && typeof x[0] === 'number' && (x[1] === null || typeof x[1] === 'number'));
  } catch {
    return [];
  }
}
