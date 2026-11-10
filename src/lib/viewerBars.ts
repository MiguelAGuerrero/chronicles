// @layer core
import { dateLine } from './threads/lines';
import type { CaptureKind } from './types';

/**
 * Whether the moment viewer's bars are up (UC7, UC8; ui-conformance audit 3, 16): a tap on a photo can hide them;
 * any other kind keeps them, as do a screen reader and a reply being recorded (its Stop must stay on screen).
 */
export function barsShown(o: { chrome: boolean; reader: boolean; recording: boolean; kind: CaptureKind }): boolean {
  return o.kind !== 'photo' || o.chrome || o.reader || o.recording;
}

/**
 * The viewer's info line (ui-conformance audit 19, 21): the kind, the day and the time first, so a moment always says
 * when it was; then the walk's context and what the owner just did. "Added to a thread" stands in for "In a thread".
 */
export function viewerLine(o: { kind: string; t: number; time: string; now: number; parts: (string | null | undefined)[] }): string {
  const parts = o.parts.filter((p): p is string => !!p);
  const added = parts.some((p) => p === 'Added to a thread');
  const kept = added ? parts.filter((p) => !p.startsWith('In a thread')) : parts;
  return [o.kind, `${dateLine(o.t, o.now)}, ${o.time}`, ...kept].join(' · ');
}
