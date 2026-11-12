// @layer adapter
// @instance: the read's compute on the web, in a worker (explore-dense-city DC7, DC8; a web exception, docs/ARCHITECTURE.md)
import { perfCount } from '../perfCount';
import { createOffPage, type WorkerLike } from './offPage';

/**
 * A worker per read, its file built by Expo's export. If it can't be made or fails, the page computes the read itself,
 * yielding a turn between stages (DC8): a page left open across a deploy asks for the old worker's file and gets a 404.
 */
export const offPage = createOffPage({
  makeWorker: typeof Worker === 'undefined' ? null : () => new Worker(new URL('./compute.worker', import.meta.url)) as unknown as WorkerLike,
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
  pause: () => new Promise((resolve) => setTimeout(resolve, 0)),
  onWorker: () => perfCount('busy:worker'),
});
