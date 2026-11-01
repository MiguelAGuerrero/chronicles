import type { Notifier } from '../../notify.types';
import type { Clock, Ports } from '../../ports/types';
import type { Recorder, RecorderStatus, StartResult } from '../../recorder/types';
import type { TracePoint } from '../../types';
import { CallLog, failable, type Failable } from './failable';
import { DB_READS, memoryDb } from './memoryDb';

export { CallLog, failable, memoryDb };

/** A recorder that records nothing: a test drives it with `emit` and `emitStatus`. */
export interface FakeRecorder extends Recorder {
  /** What the next `start` resolves with (a warning, say). */
  startResult: StartResult;
  /** The walk it is recording, or null. */
  walkId: string | null;
  /** Delivers a fix to subscribers, as the real recorder does after writing it. */
  emit(p: TracePoint): void;
  emitStatus(s: RecorderStatus): void;
}

export function fakeRecorder(opts: { background?: boolean } = {}): FakeRecorder {
  const points = new Set<(p: TracePoint) => void>();
  const statuses = new Set<(s: RecorderStatus) => void>();
  const r: FakeRecorder = {
    capabilities: { background: opts.background ?? true },
    startResult: {},
    walkId: null,
    async start(walkId) {
      r.walkId = walkId;
      r.emitStatus({ kind: 'waiting' });
      return { ...r.startResult };
    },
    async stop() {
      r.walkId = null;
      r.emitStatus({ kind: 'idle' });
    },
    async resume(walkId) {
      r.walkId = walkId;
      r.emitStatus({ kind: 'waiting' });
    },
    isRecording: () => r.walkId != null,
    subscribe(cb) {
      points.add(cb);
      return () => points.delete(cb);
    },
    subscribeStatus(cb) {
      statuses.add(cb);
      return () => statuses.delete(cb);
    },
    emit(p) {
      for (const cb of points) cb(p);
      r.emitStatus({ kind: 'recording' });
    },
    emitStatus(s) {
      for (const cb of statuses) cb(s);
    },
  };
  return r;
}

/** A notifier that shows nothing; `log.effects('notifier.')` says what it was asked to show. */
export function fakeNotifier(): Notifier {
  return {
    async pauseStarted() {},
    async pauseEnded() {},
    async recall() {},
    async ambient() {},
    async walkEnded() {},
    async ask() {},
  };
}

/** A clock that only moves when told to. */
export interface FakeClock extends Clock {
  set(t: number): void;
  advance(ms: number): void;
}

export function fakeClock(start = Date.UTC(2026, 10, 1, 9, 0, 0)): FakeClock {
  let t = start;
  return {
    now: () => t,
    set: (v) => {
      t = v;
    },
    advance: (ms) => {
      t += ms;
    },
  };
}

export interface FakePorts extends Ports {
  db: Ports['db'] & Failable<Ports['db']>;
  recorder: FakeRecorder & Failable<FakeRecorder>;
  notifier: Notifier & Failable<Notifier>;
  clock: FakeClock;
  /** Every call to db, recorder and notifier, in order. */
  log: CallLog;
}

/**
 * Fresh fakes for every port, sharing one call log: what a shell test hands
 * the shell under test in place of `ports`.
 */
export function fakePorts(opts: { background?: boolean; now?: number } = {}): FakePorts {
  const log = new CallLog();
  let n = 0;
  return {
    db: failable(memoryDb(), 'db', log, DB_READS),
    recorder: failable(fakeRecorder(opts), 'recorder', log, ['isRecording', 'subscribe', 'subscribeStatus', 'emit', 'emitStatus']),
    notifier: failable(fakeNotifier(), 'notifier', log),
    clock: fakeClock(opts.now),
    newId: () => `id-${++n}`,
    log,
  };
}
