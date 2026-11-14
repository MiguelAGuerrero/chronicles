// @layer core
import { KIND_NAME } from '../pins';
import type { CaptureKind } from '../types';

/** What a found place's pin wears: the kind of the moment that found it. */
export interface FoundFace {
  kind: CaptureKind;
}

/**
 * The face each found place's pin wears (decision 0172, O26): the kind of the moment that found it (a camera, a
 * note…), never a tick, which reads as a checklist's "done". `live` are the walk's own moments, as they are now;
 * `read` copies read from the store for the others. The walk's own copy wins over one read earlier (tend walk-screen
 * audit 8). A find whose moment is not known (yet) has no face, never a guess.
 */
export function foundFaces(
  finds: readonly { key: string; capture_id: string }[],
  live: readonly { id: string; kind: CaptureKind }[],
  read: readonly { id: string; kind: CaptureKind }[],
): Map<string, FoundFace> {
  const byId = new Map([...read, ...live].map((m) => [m.id, m]));
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

/**
 * A found place's spoken name (tend walk-screen audit 11; the owner, Nov 14, adding to 0172's O26: "Found with a video:
 * …"): the kind of the moment that found it, in the pins' words, which the corner's glyph shows; left out while that
 * moment is not known.
 */
export function foundLabel(name: string, category: string, kind: CaptureKind | undefined): string {
  return kind ? `Found with a ${KIND_NAME[kind].toLowerCase()}: ${name}, ${category}` : `Found: ${name}, ${category}`;
}
