// @layer shell
import type { NearRead } from './atlas/atlas';
import type { Db } from './db/types';
import type { Waypoint } from './nav/types';
import type { StartMode } from './startPlan';
import { parsePrefs } from './resurface/prefs';
import type { Prefs } from './resurface/types';
import type { Units } from './units';

/**
 * Every key in the meta store, with its owner and how its value is encoded.
 * New code reads and writes meta only through `metaStore(db)`, never with a
 * string key.
 *
 * The codecs match what each key already holds on disk, so moving an old
 * call site over here later changes nothing stored. An empty string has
 * always meant "cleared": every codec reads it as null, and `clear` writes it.
 *
 * Takes the db as an argument, so `npm test` can use it with a fake.
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

/**
 * JSON, kept only when it has the shape the key holds: a value written by an
 * older build, or by hand, reads as null rather than crashing the reader
 * (functional-core audit 12).
 */
function json<T>(valid: (v: unknown) => boolean): Codec<T> {
  return {
    encode: (v) => JSON.stringify(v),
    decode: (raw) => {
      try {
        const v: unknown = JSON.parse(raw);
        return valid(v) ? (v as T) : null;
      } catch {
        return null;
      }
    },
  };
}

/** Text that must be one of a few words. */
function oneOf<T extends string>(...words: T[]): Codec<T> {
  return { encode: (v) => v, decode: (raw) => ((words as string[]).includes(raw) ? (raw as T) : null) };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isLngLat = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
const isStrings = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isNav = (v: unknown) =>
  isObject(v) &&
  (v.walk_id === null || typeof v.walk_id === 'string') &&
  isObject(v.dest) &&
  isLngLat(v.dest.at) &&
  typeof v.dest.label === 'string' &&
  typeof v.dest.kind === 'string';
const isLayerState = (v: unknown) => isObject(v) && Object.values(v).every((x) => typeof x === 'boolean');
const isNearRead = (v: unknown) => isObject(v) && isLngLat(v.at) && typeof v.build === 'string' && typeof v.code === 'string';

/** '1' is on, '0' is off (the Explore haptic). */
const onOff: Codec<boolean> = { encode: (v) => (v ? '1' : '0'), decode: (raw) => (raw === '1' ? true : raw === '0' ? false : null) };

/**
 * The meta schema. Add a key here before using it; `owner` names the feature
 * that writes it. `meta.test.ts` fails on a key in use that isn't listed, and
 * on a listed key nothing uses any more (FC8).
 */
export const META = {
  // Tiles and snapping (lib/tiles): what the cached streets were derived with.
  tile_build: { owner: 'tiles', codec: text },
  tile_url: { owner: 'tiles', codec: text },
  snap_rules: { owner: 'tiles', codec: text },
  /** The Overture release busy streets are measured with, and when the listing was last checked (AD6). */
  overture_release: { owner: 'activity', codec: text },
  overture_checked_at: { owner: 'activity', codec: number },
  street_code: { owner: 'tiles', codec: text },
  // Navigation (lib/nav/store, lib/startPlan): where the open walk, or the drawer, is heading.
  nav: { owner: 'nav', codec: json<{ walk_id: string | null; dest: Waypoint }>(isNav) },
  // Scenic routes (lib/routeLeanings): the leanings switched on in the walk settings (SR1).
  route_leanings: { owner: 'nav', codec: json<string[]>(isStrings) },
  // Navigate tab (lib/startPlan, the Start dialog)
  start_mode: { owner: 'navigate', codec: oneOf<StartMode>('quiet', 'explore') },
  web_note_dismissed: { owner: 'navigate', codec: flag },
  // Walk screen, once per walk or once ever
  deadzone_walk: { owner: 'walk', codec: walkId },
  hint_go: { owner: 'walk', codec: flag },
  // Explore (lib/explore): the walk exploring, and what I'm into
  explore_walk: { owner: 'explore', codec: walkId },
  explore_hidden: { owner: 'explore', codec: json<string[]>(isStrings) },
  explore_range: { owner: 'explore', codec: number },
  explore_haptic: { owner: 'explore', codec: onOff },
  // Explore tab: the long-press hint was seen once (AT, atlas round 2)
  atlas_press_seen: { owner: 'explore', codec: flag },
  // Walkability (lib/walk/switch): the layer on the Explore and Navigate maps, off until switched on (WK13)
  // Map layers (lib/layers): every layer's state as one setting for every map (ML7). `walk_layer` is the walkability switch from
  // before layers; it is read once into this when no setting is stored.
  map_layers: { owner: 'map', codec: json<Record<string, boolean>>(isLayerState) },
  walk_layer: { owner: 'walk', codec: onOff },
  // Recall (lib/discovery/recallCheck): captures a notification opened
  recall_open: { owner: 'discovery', codec: json<string[]>(isStrings) },
  // Town outlines (lib/areas/outlineRead): the localities found to be wards of a city, whose outlines are never towns.
  outline_nested: { owner: 'areas', codec: json<string[]>(isStrings) },
  // Kind walk (lib/kindWalk): how far a suggested walk is, in metres, and what to do about a stretch built around cars (KW8, KW11)
  kindwalk_budget: { owner: 'kindwalk', codec: number },
  kindwalk_pref: { owner: 'kindwalk', codec: oneOf<'warn' | 'skip'>('warn', 'skip') },
  // Chronicle's Memories (lib/resurface): what the user chose to see less of, renamed or removed (RM21)
  resurface_prefs: { owner: 'resurface', codec: json<Prefs>((v) => parsePrefs(v) !== null) },
  // Settings
  units: { owner: 'settings', codec: oneOf<Units>('km', 'mi') },
  notify_off: { owner: 'notifications', codec: json<string[]>(isStrings) },
} as const;

/**
 * Keys made of a prefix and an id (`explored:<walk id>`). The id is free; the
 * prefix and the value's encoding are fixed here.
 */
export const META_FAMILIES = {
  // When Explore was first switched on for a walk (ms): its replay counts finds from then.
  explored: { owner: 'explore', codec: number },
  // A day's replay was watched (ms), so it advances by itself next time.
  day_watched: { owner: 'days', codec: number },
  // The last read of areas near you, per level (lib/atlas/read).
  atlas_near: { owner: 'atlas', codec: json<NearRead>(isNearRead) },
} as const;

export type MetaKey = keyof typeof META;
export type MetaFamily = keyof typeof META_FAMILIES;
type AnyKey = MetaKey | `${MetaFamily}:${string}`;
type FamilyOf<K> = K extends `${infer F}:${string}` ? (F extends MetaFamily ? F : never) : never;
type CodecOf<K> = K extends MetaKey ? (typeof META)[K]['codec'] : (typeof META_FAMILIES)[FamilyOf<K>]['codec'];
export type MetaValue<K extends AnyKey> = CodecOf<K> extends Codec<infer T> ? T : never;

function codecFor(key: string): Codec<unknown> {
  if (key in META) return META[key as MetaKey].codec as Codec<unknown>;
  const family = key.slice(0, key.indexOf(':'));
  if (key.includes(':') && family in META_FAMILIES) return META_FAMILIES[family as MetaFamily].codec as Codec<unknown>;
  throw new Error(`meta key "${key}" is not in META or META_FAMILIES (src/lib/meta.ts)`);
}

/** Typed access to the meta store over any `Db` (the real one, or a fake in tests). */
export function metaStore(db: Pick<Db, 'getMeta' | 'setMeta'>) {
  return {
    async get<K extends AnyKey>(key: K): Promise<MetaValue<K> | null> {
      const codec = codecFor(key);
      const raw = await db.getMeta(key);
      if (!raw) return null;
      return codec.decode(raw) as MetaValue<K> | null;
    },
    async set<K extends AnyKey>(key: K, value: MetaValue<K>): Promise<void> {
      await db.setMeta(key, codecFor(key).encode(value));
    },
    async clear(key: AnyKey): Promise<void> {
      codecFor(key);
      await db.setMeta(key, '');
    },
  };
}

export type MetaStore = ReturnType<typeof metaStore>;
