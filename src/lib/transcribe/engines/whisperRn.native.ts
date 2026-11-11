// @layer adapter
import type { Audio, Engine, InstalledModel, ModelSpec } from '../engine';

/**
 * The phone's engine (MX29): whisper.cpp through `whisper.rn`, the quantized `base.en` model. The library is imported
 * inside `available` and `load`, so nothing of it runs until a run is due (MX16). The one file that names it; a more
 * optimized native engine is one file beside this and one line in `index.native.ts` (MX30). Never run on a device.
 */
// The file on the chronicles-data Pages site (decision 0127). PENDING: replace with the published file's SHA-256 (specs/memo-transcripts/handoff.md);
// until then no download can verify, so none installs.
const SHA256 = '0000000000000000000000000000000000000000000000000000000000000000';
export const MODEL: ModelSpec = {
  url: 'https://miguelaguerrero.github.io/chronicles-data/models/ggml-base.en-q5_1.bin',
  sha256: SHA256,
  bytes: 60 * 1024 * 1024,
  size: 'about sixty megabytes',
  tag: `whisper-base.en-q5_1@${SHA256.slice(0, 8)}`,
};

type Lib = typeof import('whisper.rn');
type Context = Awaited<ReturnType<Lib['initWhisper']>>;
let lib: Promise<Lib> | null = null;

export const whisperRn: Engine = {
  id: 'whisper-rn',
  model: MODEL,
  offline: true,
  inputs: ['wav16k'],
  async available() {
    try {
      lib = lib ?? import('whisper.rn');
      return typeof (await lib).initWhisper === 'function';
    } catch {
      return false;
    }
  },
  async load(model: InstalledModel) {
    lib = lib ?? import('whisper.rn');
    context = await (await lib).initWhisper({ filePath: model.ref });
  },
  async transcribe(audio: Audio, signal?: AbortSignal) {
    if (!context) throw new Error('The model is not loaded.');
    if (audio.kind !== 'wav16k') throw new Error(`whisper.rn reads wav16k, not ${audio.kind}.`);
    const { stop, promise } = context.transcribe(audio.path, { language: 'en' });
    signal?.addEventListener('abort', () => void stop(), { once: true });
    return (await promise).result.trim();
  },
  async release() {
    const c = context;
    context = null;
    if (c) await c.release();
  },
};
let context: Context | null = null;
