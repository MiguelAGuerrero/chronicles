// @layer adapter
import { releaseMedia, resolveMedia } from '../../media';
import type { WebDecodeParts } from '../decoder.web';

/**
 * The browser's decoder parts (MX20): a memo's bytes from the media store, `decodeAudioData`, and a 16 kHz mono resample
 * in an `OfflineAudioContext`. Nothing is written. A web exception to native first: no Expo module decodes audio to
 * samples on the web (docs/ARCHITECTURE.md). Never run in a real browser by this session.
 */
export const webDecodeParts: WebDecodeParts = {
  hasAudio: () => typeof AudioContext !== 'undefined' && typeof OfflineAudioContext !== 'undefined',
  async read(ref) {
    const uri = await resolveMedia(ref);
    if (!uri) throw new Error('The memo\'s file is not there.');
    try {
      return await (await fetch(uri)).arrayBuffer();
    } finally {
      releaseMedia(uri);
    }
  },
  async toSamples(bytes) {
    const ctx = new AudioContext();
    try {
      const decoded = await ctx.decodeAudioData(bytes);
      const out = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * 16000)), 16000);
      const src = out.createBufferSource();
      src.buffer = decoded;
      src.connect(out.destination);
      src.start();
      return (await out.startRendering()).getChannelData(0).slice();
    } finally {
      void ctx.close();
    }
  },
};
