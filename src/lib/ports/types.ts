import type { Db } from '../db/types';
import type { Notifier } from '../notify.types';
import type { Recorder } from '../recorder/types';

/**
 * Everything a feature shell may reach outside itself. A shell takes its
 * ports as an argument and never imports `db`, `recorder` or `notifier`
 * directly, so a Node test can hand it fakes (`__tests__/fakes`). The real
 * instance is `ports` in `./index`, built once at module load.
 *
 * Types only: this file must stay importable from `npm test`.
 */
export interface Ports {
  db: Db;
  recorder: Recorder;
  notifier: Notifier;
  clock: Clock;
  /** A new unique id (`lib/id` in the app, a counter in tests). */
  newId: () => string;
}

/** Time as a port, so a test can set and advance it. */
export interface Clock {
  /** Milliseconds since the epoch, like `Date.now()`. */
  now(): number;
}
