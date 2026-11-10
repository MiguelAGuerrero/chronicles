// The tiles a new archive version changed (a staged places build, SB6, decision 0110): the z12 tiles where a
// place was added, removed or changed (name, class or position) since the version before it, as osm2pgsql's
// expiry lists the tiles an update touched. Phones rebuild only the areas that read one of them (SB10).
import { tileOf, ZOOM } from './archive.mjs';

const keyOf = (p) => p.id ?? `${p.src}:${p.name}`;
const tile = (p) => {
  const t = tileOf(p.lon, p.lat, ZOOM);
  return [t.x, t.y];
};
const differs = (a, b) => a.name !== b.name || a.class !== b.class || a.lon !== b.lon || a.lat !== b.lat;

/**
 * SB6: the z12 tiles, each once and in order, where `next`'s places differ from `prev`'s.
 * @param {{ id?: string, src?: string, name: string, class: string, lon: number, lat: number }[]} prev
 * @param {{ id?: string, src?: string, name: string, class: string, lon: number, lat: number }[]} next
 * @returns {[number, number][]}
 */
export function changedTiles(prev, next) {
  const before = new Map(prev.map((p) => [keyOf(p), p]));
  const after = new Map(next.map((p) => [keyOf(p), p]));
  const out = new Map();
  const add = (t) => out.set(`${t[0]}/${t[1]}`, t);
  for (const [k, b] of after) {
    const a = before.get(k);
    if (!a) add(tile(b));
    else if (differs(a, b)) {
      add(tile(a));
      add(tile(b));
    }
  }
  for (const [k, a] of before) if (!after.has(k)) add(tile(a));
  return [...out.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
