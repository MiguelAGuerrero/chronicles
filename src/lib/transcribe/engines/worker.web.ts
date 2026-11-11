// @layer adapter
/**
 * The web engine's Worker, as the page sees it (MX25, MX26). The Worker itself is `public/transcribe-worker.mjs`,
 * served from the app's own origin like the map's worker: it needs no bundler, loads the engine's code only when told
 * to, and runs one thread. Nothing here imports the engine's library, so it is never in the entry bundle (MX22).
 */
const base = process.env.EXPO_BASE_URL ?? '';

/** The Worker script, under the sub-path build too. */
export const workerUrl = () => `${base}/transcribe-worker.mjs`;

/** Where the installed model's files are keyed in Cache Storage: a URL on the app's own origin that is never requested. */
export const MODEL_CACHE = 'chronicles-models';
export const modelBase = () => `${location.origin}${base}/__models/`;

export type ToWorker = { type: 'load'; ref: string } | { type: 'run'; samples: Float32Array };
export type FromWorker = { type: 'ready' } | { type: 'words'; text: string } | { type: 'error'; message: string };

/** The part of a Worker the engine uses: a fake stands in for it in a Node test. */
export interface WorkerLike {
  postMessage(message: ToWorker, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((e: { data: FromWorker }) => void) | null;
  onerror: ((e: unknown) => void) | null;
}

export const spawnWorker = (): WorkerLike => new Worker(workerUrl(), { type: 'module' }) as unknown as WorkerLike;

/** Whether this browser can run the engine at all: WebAssembly, Workers and an AudioContext (MX27). */
export const browserSupports = (): boolean =>
  typeof WebAssembly === 'object' && typeof Worker !== 'undefined' && typeof AudioContext !== 'undefined' && typeof caches !== 'undefined';
