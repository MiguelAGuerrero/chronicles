// @layer adapter
import { GAZETTEER_CREDIT } from '../../components/map/types';
import { createGazetteerSource, type GazetteerSource } from './loader';
import { PACK_FETCH_MS, packUrl } from './pack';

/**
 * The pack on the web (a web exception, docs/ARCHITECTURE.md; the owner's answer of Nov 16, "Fetch on first search"):
 * a `require` would inline its megabytes in the one entry script, scanned at every launch. So the web fetches it from the
 * app's own site, under the base path as the map's worker, the first time search opens, and keeps it in memory. No host
 * is added and nothing is sent. A failed fetch (offline before the first search, the owner's "Acceptable" of Nov 17; a
 * missing file; no answer within `PACK_FETCH_MS`, audit 1) is the search's "unavailable" state, tried again by its button.
 */
export const bundledGazetteer: GazetteerSource = createGazetteerSource(async () => {
  // Safari before 16 has no AbortSignal.timeout: it waits as before rather than failing every search.
  const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(PACK_FETCH_MS) : undefined;
  const res = await fetch(packUrl(process.env.EXPO_BASE_URL ?? '', GAZETTEER_CREDIT), { signal });
  if (!res.ok) throw new Error(`gazetteer pack: ${res.status}`);
  return res.json();
});
