// @layer adapter
// @instance: the read's compute on native, on the JS thread with a turn between stages (explore-dense-city DC11)
import { createOffPage } from './offPage';

/** No Expo module gives native a background JS thread: the compute runs here, yielding a turn before each tile and stage. */
export const offPage = createOffPage({
  makeWorker: null,
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
  pause: () => new Promise((resolve) => setTimeout(resolve, 0)),
});
