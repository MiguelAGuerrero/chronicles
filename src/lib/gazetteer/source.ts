// @layer adapter
import { createGazetteerSource, type GazetteerSource } from './loader';

export { createGazetteerSource, indexOf, type GazetteerSource } from './loader';

/**
 * The pack the app ships with (assets/gazetteer, built by scripts/build-gazetteer.js), read on first use. The phone's build
 * bundles it; the web's fetches it as a file of its own (`source.web.ts`).
 */
export const bundledGazetteer: GazetteerSource = createGazetteerSource(() => require('../../../assets/gazetteer/places.json'));
