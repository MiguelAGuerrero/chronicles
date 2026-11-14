// @layer shell
// @instance: the after-dark reader over the app's one Overpass gate (createDarkReader, createDarkSource)
import { net } from '../net';
import { ports } from '../ports';
import { overpassGate } from '../walk/walkApp';
import { createDarkReader } from './reader';
import { createDarkSource } from './source';

/*
 * After dark's instance (DK8, DK9): Overpass by tile through the device's cache, under the gate walkability's fallback uses, so
 * the two together keep to one back-off and one daily count. Views call `darkReader.read(tiles)`.
 */
const source = createDarkSource({ fetch: ((u: RequestInfo | URL, init?: RequestInit) => net.fetch(String(u), init)) as typeof fetch, gate: overpassGate, now: () => Date.now() });

export const darkReader = createDarkReader(ports, source);
