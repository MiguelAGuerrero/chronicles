// @layer adapter
import { createWebDecoder } from '../decoder.web';
import { registerEngine } from '../engine';
import { webDecodeParts } from './decodeBindings.web';
import { modelFiles } from './modelFiles.web';
import { transformersJs } from './transformersJs.web';

/** The web's registry (MX30): the one line that names the engine in use, its decoder and its model files. */
export const engine = registerEngine(transformersJs);
export const decoder = createWebDecoder(webDecodeParts);
export const files = modelFiles;
