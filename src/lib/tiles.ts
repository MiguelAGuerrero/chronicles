import { AREA_RULES } from './areas/rules';
import { BOUNDARY_PACKS_ID } from './areas/boundaries';
import { db } from './db';

export { TILE_ZOOM, tileAt, tileRect, onTileEdge, type TileRect } from './tileMath';

/** The vector tile source behind the map style (OpenMapTiles schema). */
export const TILEJSON_URL = 'https://tiles.openfreemap.org/planet';

/**
 * The tile build the map is serving, as a stable string (OpenFreeMap puts a
 * dated build directory in the TileJSON's tile URL). Falls back to the last
 * build seen when offline.
 */
/** The tile URL the last TileJSON gave, stored beside its build by ensureTileBuild (A11). */
let pendingUrl: string | null = null;

export async function currentTileBuild(): Promise<string> {
  try {
    const res = await fetch(TILEJSON_URL);
    const json = (await res.json()) as { tiles?: string[] };
    const url = json.tiles?.[0] ?? '';
    if (url) pendingUrl = url;
    const m = /\/([0-9]{8}_[0-9A-Za-z_]+)\/\{z\}/.exec(url);
    if (m) return m[1];
    if (url) return url;
  } catch {
    // offline: keep using what we have
  }
  return (await db.getMeta('tile_build')) ?? 'unknown';
}

/**
 * Checks the served tile build against the one the street cache was derived
 * from. On a change, the cache is dropped and every walk is marked for
 * re-snapping, which happens when its replay is next opened.
 */
export async function ensureTileBuild(): Promise<string> {
  const build = await currentTileBuild();
  const stored = await db.getMeta('tile_build');
  if (stored !== build && build !== 'unknown') {
    if (stored != null) await db.purgeDerived();
    await db.setMeta('tile_build', build);
  }
  // Streets derived by older code were wrong (STREET_CODE): dropped once, and every walk re-snaps.
  const code = await db.getMeta('street_code');
  if (code !== STREET_CODE) {
    if (code != null || stored != null) await db.purgeDerived();
    await db.setMeta('street_code', STREET_CODE);
  }
  // With its build, never apart: the location task reads tiles itself, tagged with that build (A11).
  if (pendingUrl && build !== 'unknown') await db.setMeta('tile_url', pendingUrl).catch(() => {});
  // The rules for crediting streets changed: walks re-snap when their replay
  // next opens, keeping their old summary until then. Street pieces are kept.
  const rules = `${SNAP_RULES}/${AREA_RULES}/${BOUNDARY_PACKS_ID}`;
  if ((await db.getMeta('snap_rules')) !== rules) {
    for (const w of await db.listWalks()) if (w.snapped_build) await db.updateWalk(w.id, { snapped_build: null });
    await db.setMeta('snap_rules', rules);
  }
  return build;
}

/**
 * The version of the code that derives street pieces (streets.ts). Bump it
 * when a fix changes the pieces derived from the same tiles: the street cache
 * is dropped once and every walk re-snaps, as on a new tile build.
 * 2: junction points no longer collapse onto one spot (the fog streaks, Nov 1).
 */
const STREET_CODE = '2';

/**
 * The version of the snapping rules (snapper.ts). Bump it when they change
 * what counts as walked, so every walk is snapped again. The area rules and
 * the boundary packs' editions count too: a change to either places every
 * walk again.
 * 2: walking along a street, not across it; about a block for a named street.
 */
const SNAP_RULES = '2';
