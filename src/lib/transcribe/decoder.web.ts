// @layer core
import type { AudioKind } from './engine';
import type { Decoded, Decoder } from './types';

/**
 * The browser's decoder (MX20): `decodeAudioData` and a 16 kHz mono resample, in memory, writing nothing. A web
 * exception to native first (docs/ARCHITECTURE.md): no Expo module decodes audio to samples on the web.
 * (Imported by the web registry as `./decoder.web`, never as `./decoder`.)
 */
export interface WebDecodeParts {
  hasAudio(): boolean;
  /** The memo's bytes from the media store. */
  read(ref: string): Promise<ArrayBuffer>;
  /** The bytes as 16 kHz mono samples. */
  toSamples(bytes: ArrayBuffer): Promise<Float32Array>;
}

export function createWebDecoder(parts: WebDecodeParts): Decoder {
  return {
    can: (k: AudioKind) => k === 'samples16k' && parts.hasAudio(),
    async decode(ref: string, kind: AudioKind): Promise<Decoded> {
      if (kind !== 'samples16k') throw new Error(`This decoder gives samples16k, not ${kind}.`);
      const data = await parts.toSamples(await parts.read(ref));
      return { audio: { kind: 'samples16k', data }, dispose: async () => {} };
    },
  };
}
