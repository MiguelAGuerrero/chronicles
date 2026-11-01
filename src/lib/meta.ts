import type { Db } from './db/types';
import type { Prefs } from './discovery/scan';
import type { Waypoint } from './nav/types';

/**
 * Every key in the meta store, with its owner and how its value is encoded.
 * New code reads and writes meta only through `metaStore(db)`, never with a
 * string key (lint enforces it outside this file and the db adapters).
 *
 * The codecs match what each key already holds on disk, so moving an old
 * call site over here later changes nothing stored. An empty string has
 * always meant "cleared": every codec reads it as null, and `clear` writes it.
 *
 * Pure: takes the db as an argument, so `npm test` can use it with a fake.
 */

interface Codec<T> {
  encode(v: T): string;
  /** Called only on a non-empty string; returns null for an unreadable value. */
  decode(raw: string): T | null;
}

const text: Codec<string> = { encode: (v) => v, decode: (raw) => raw };

/** A walk id: "on for this walk" (quiet walk, ambient hints, done-once flags). */
const walkId = text;

/** On is '1'; off is cleared. */
const flag: Codec<true> = { encode: () => '1', decode: (raw) => (raw === '1' ? true : null) };

const number: Codec<number> = {
  encode: (v) => String(v),
  decode: (raw) => {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  },
};

function json<T>(): Codec<T> {
  return {
    encode: (v) => JSON.stringify(v),
    decode: (raw) => {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
  };
}

/** The meta schema. Add a key here before using it; `owner` names the feature that writes it. */
export const META = {
  // Tiles and snapping (lib/tiles)
  tile_build: { owner: 'tiles', codec: text },
  tile_url: { owner: 'tiles', codec: text },
  snap_rules: { owner: 'tiles', codec: text },
  // Navigation (lib/nav/store): where the open walk is heading, so a reload resumes.
  nav: { owner: 'nav', codec: json<{ walk_id: string; dest: Waypoint }>() },
  // Walk options (walk screen)
  quiet_walk: { owner: 'walk', codec: walkId },
  ambient_walk: { owner: 'walk', codec: walkId },
  // Walk screen, once per walk or once ever
  auto_scanned: { owner: 'walk', codec: walkId },
  deadzone_walk: { owner: 'walk', codec: walkId },
  hint_go: { owner: 'walk', codec: flag },
  // Discovery (lib/discovery)
  discovery_prefs: { owner: 'discovery', codec: json<Prefs>() },
  auto_scan: { owner: 'discovery', codec: flag },
  ambient_fired: { owner: 'discovery', codec: json<{ walkId: string; count: number; lastAt: number | null }>() },
  mark_open: { owner: 'discovery', codec: text },
  recall_open: { owner: 'discovery', codec: json<string[]>() },
  recall_last: { owner: 'discovery', codec: number },
} as const;

export type MetaKey = keyof typeof META;
export type MetaValue<K extends MetaKey> = (typeof META)[K]['codec'] extends Codec<infer T> ? T : never;

/** Typed access to the meta store over any `Db` (the real one, or a fake in tests). */
export function metaStore(db: Pick<Db, 'getMeta' | 'setMeta'>) {
  return {
    async get<K extends MetaKey>(key: K): Promise<MetaValue<K> | null> {
      const raw = await db.getMeta(key);
      if (!raw) return null;
      return (META[key].codec as Codec<MetaValue<K>>).decode(raw);
    },
    async set<K extends MetaKey>(key: K, value: MetaValue<K>): Promise<void> {
      await db.setMeta(key, (META[key].codec as Codec<MetaValue<K>>).encode(value));
    },
    async clear(key: MetaKey): Promise<void> {
      await db.setMeta(key, '');
    },
  };
}

export type MetaStore = ReturnType<typeof metaStore>;
