// @layer adapter
import { GAZETTEER_CREDIT } from '../../components/map/types';
import { createGazetteerSource, type GazetteerSource } from './loader';
import { packUrl } from './pack';

export { createGazetteerSource, indexOf, type GazetteerSource } from './loader';

/**
 * The pack on the web (a web exception, docs/ARCHITECTURE.md; the owner's answer of Nov 16, "Fetch on first search"):
 * a `require` would inline its megabytes in the one entry script, scanned at every launch. So the web fetches it from the
 * app's own site, under the base path as the map's worker, the first time search opens, and keeps it in memory. No host
 * is added and nothing is sent. A failed fetch (offline before the first search, a missing file) is the search's
 * "unavailable" state, tried again by its button.
 */
export const bundledGazetteer: GazetteerSource = createGazetteerSource(async () => {
  const res = await fetch(packUrl(process.env.EXPO_BASE_URL ?? '', GAZETTEER_CREDIT));
  if (!res.ok) throw new Error(`gazetteer pack: ${res.status}`);
  return res.json();
});
