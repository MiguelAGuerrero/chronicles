// @layer adapter
import { createGazetteerSource, type GazetteerSource } from './loader';

/**
 * The pack the app ships with (assets/gazetteer, built by scripts/build-gazetteer.js), read on first use. The phone's build
 * bundles it; the web's fetches it as a file of its own (`source.web.ts`). Both export this alone (tsc reads only this file,
 * so a name only it exported would be undefined on the web); the shared loading is imported from `./loader`.
 */
export const bundledGazetteer: GazetteerSource = createGazetteerSource(() => require('../../../assets/gazetteer/places.json'));
