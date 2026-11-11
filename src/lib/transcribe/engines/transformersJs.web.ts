// @layer adapter
import type { Audio, Engine, InstalledModel, ModelSpec } from '../engine';
import { browserSupports, spawnWorker, type FromWorker, type WorkerLike } from './worker.web';

/**
 * The web's engine (MX25-MX27): an ONNX Whisper model run by transformers.js in a Web Worker that is started for a
 * run and terminated at its end, so no engine and no heap exist while idle (MX16). A web exception to native first
 * (docs/ARCHITECTURE.md): no Expo module transcribes on the web and `whisper.rn` has no web build. The one file, with
 * `worker.web.ts` and the Worker script, that knows the library. Never run in a real browser by this session.
 */
// The model pack on the chronicles-data Pages site (decision 0127): a zip of the ONNX Whisper tiny.en files.
// PENDING: replace with the published pack's SHA-256 (specs/memo-transcripts/handoff.md); until then no download
// can verify, so none installs.
const SHA256 = '0000000000000000000000000000000000000000000000000000000000000000';
export const MODEL: ModelSpec = {
  url: 'https://miguelaguerrero.github.io/chronicles-data/models/whisper-tiny.en-onnx-q8.zip',
  sha256: SHA256,
  bytes: 50 * 1024 * 1024,
  size: 'about fifty megabytes',
  tag: `onnx-whisper-tiny.en-q8@${SHA256.slice(0, 8)}`,
};

export interface WebEngineParts {
  supported(): boolean;
  spawn(): WorkerLike;
}

/** The engine over a Worker factory, so a Node test drives it with a fake Worker. */
export function createWebEngine(parts: WebEngineParts): Engine {
  let worker: WorkerLike | null = null;

  /** The next message of one of these types; an error message, or the Worker failing, rejects. */
  const next = <T extends FromWorker['type']>(w: WorkerLike, type: T) =>
    new Promise<Extract<FromWorker, { type: T }>>((resolve, reject) => {
      w.onmessage = (e) => {
        if (e.data.type === 'error') reject(new Error(e.data.message));
        else if (e.data.type === type) resolve(e.data as Extract<FromWorker, { type: T }>);
      };
      w.onerror = (e) => reject(new Error(String((e as { message?: string })?.message ?? 'The Worker failed.')));
    });

  return {
    id: 'transformers-js',
    model: MODEL,
    offline: true,
    inputs: ['samples16k'],
    async available() {
      return parts.supported();
    },
    async load(model: InstalledModel) {
      worker = parts.spawn();
      try {
        const ready = next(worker, 'ready');
        worker.postMessage({ type: 'load', ref: model.ref });
        await ready;
      } catch (e) {
        worker.terminate();
        worker = null;
        throw e;
      }
    },
    async transcribe(audio: Audio) {
      if (!worker) throw new Error('The model is not loaded.');
      if (audio.kind !== 'samples16k') throw new Error(`The web engine reads samples16k, not ${audio.kind}.`);
      const done = next(worker, 'words');
      worker.postMessage({ type: 'run', samples: audio.data });
      return (await done).text;
    },
    async release() {
      worker?.terminate();
      worker = null;
    },
  };
}

export const transformersJs: Engine = createWebEngine({ supported: browserSupports, spawn: spawnWorker });
