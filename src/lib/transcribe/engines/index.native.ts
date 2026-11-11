// @layer adapter
import { createDecoder } from '../decoder';
import { registerEngine } from '../engine';
import { nativeDecode, tempFiles } from './decodeBindings.native';
import { modelFiles } from './modelFiles.native';
import { whisperRn } from './whisperRn.native';

/**
 * The phone's registry (MX30): the one line that names the engine in use, its decoder and its model files. A more
 * optimized native engine is a file beside `whisperRn.native.ts` and a change to `engine` here, nothing else.
 */
export const engine = registerEngine(whisperRn);
export const decoder = createDecoder(nativeDecode, tempFiles);
export const files = modelFiles;
