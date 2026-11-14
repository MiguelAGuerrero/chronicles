// @layer core
import type { CaptureKind } from '../types';

/** What a found place's pin wears: the kind of the moment that found it. */
export interface FoundFace {
  kind: CaptureKind;
}

/**
 * The face each found place's pin wears (decision 0172, O26): the kind of the moment that found it (a camera, a
 * note…), never a tick, which reads as a checklist's "done". `moments` are those known, by id; a find whose moment is
 * not known (yet) has no face, never a guess.
 */
export function foundFaces(
  finds: readonly { key: string; capture_id: string }[],
  moments: readonly { id: string; kind: CaptureKind }[],
): Map<string, FoundFace> {
  const byId = new Map(moments.map((m) => [m.id, m]));
  const out = new Map<string, FoundFace>();
  for (const f of finds) {
    const m = byId.get(f.capture_id);
    if (m) out.set(f.key, { kind: m.kind });
  }
  return out;
}

/**
 * The moments to read for the found places on the map: a shown find's moment that is neither known nor asked for
 * already, so one deleted meanwhile is asked for once, not round and round.
 */
export function facesToRead(
  finds: readonly { key: string; capture_id: string }[],
  shown: ReadonlySet<string>,
  known: ReadonlySet<string>,
  asked: ReadonlySet<string>,
): string[] {
  return finds.filter((f) => shown.has(f.key) && !known.has(f.capture_id) && !asked.has(f.capture_id)).map((f) => f.capture_id);
}
