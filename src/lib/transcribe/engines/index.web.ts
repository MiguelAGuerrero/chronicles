// @layer adapter
import { createWebDecoder } from '../decoder.web';
import { registerEngine, type Engine } from '../engine';
import { webDecodeParts } from './decodeBindings.web';
import { modelFiles } from './modelFiles.web';
import { transformersJs } from './transformersJs.web';

/**
 * The web's registry (MX30): the one line that names the engine in use, its decoder and its model files.
 * The e2e harness may put an engine in `__transcribeStub` before the app loads (a test harness, as with mocked GPS), so the
 * whole web path runs in headless Chromium without a model; the app sets it nowhere.
 */
const stub = (globalThis as { __transcribeStub?: { engine?: Engine } }).__transcribeStub?.engine;
export const engine = registerEngine(stub ?? transformersJs);
export const decoder = createWebDecoder(webDecodeParts);
export const files = modelFiles;
