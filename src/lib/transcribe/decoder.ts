// @layer core
import type { AudioKind } from './engine';
import type { Decoded, Decoder } from './types';

/**
 * The phone's decoder (MX20, MX31): a memo's AAC file to a 16 kHz mono 16-bit PCM WAV in the cache, through the
 * local native module, and the temporary file removed when the audio is let go. The memo is only read.
 * (Imported by the phone's registry only: on the web `decoder.web` is the file Metro would pick for `./decoder`.)
 */
export interface NativeDecode {
  isAvailable(): boolean;
  decodeToPcm(uri: string, outPath: string): Promise<void>;
}

export interface TempFiles {
  tempPath(): string;
  remove(path: string): Promise<void>;
  /** A memo's media reference as a file URI. */
  resolve?(ref: string): Promise<string>;
}

export function createDecoder(native: NativeDecode, fs: TempFiles): Decoder {
  return {
    can: (k: AudioKind) => k === 'wav16k' && native.isAvailable(),
    async decode(ref: string, kind: AudioKind): Promise<Decoded> {
      if (kind !== 'wav16k') throw new Error(`This decoder gives wav16k, not ${kind}.`);
      const out = fs.tempPath();
      try {
        await native.decodeToPcm(fs.resolve ? await fs.resolve(ref) : ref, out);
      } catch (e) {
        await fs.remove(out).catch(() => {});
        throw e;
      }
      return { audio: { kind: 'wav16k', path: out }, dispose: () => fs.remove(out).catch(() => {}) };
    },
    async container(ref: string) {
      return fs.resolve ? fs.resolve(ref) : ref;
    },
  };
}
