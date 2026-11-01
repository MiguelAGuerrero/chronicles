/**
 * Shared plumbing for the port fakes: one ordered log of every call across
 * all ports (so a test can check write order, say `db.updateWalk` before
 * `recorder.stop`), and failure on cue (`failNext`) for any method.
 */

export interface LoggedCall {
  /** `<port>.<method>`, e.g. `db.updateWalk`. */
  call: string;
  args: unknown[];
  /** True when the call was failed on cue. */
  failed: boolean;
  /** A read (get, list, isRecording...): left out of `effects()`. */
  read: boolean;
}

export class CallLog {
  readonly entries: LoggedCall[] = [];

  /** Every call so far, in order, optionally only those starting with `prefix` (`'db.'`). */
  calls(prefix = ''): string[] {
    return this.entries.filter((e) => e.call.startsWith(prefix)).map((e) => e.call);
  }

  /** Calls that change something (writes, starts, stops, notifications), in order. */
  effects(prefix = ''): string[] {
    return this.entries.filter((e) => !e.read && e.call.startsWith(prefix)).map((e) => e.call);
  }

  /** The arguments of each call to `call`, in order. */
  argsOf(call: string): unknown[][] {
    return this.entries.filter((e) => e.call === call).map((e) => e.args);
  }

  clear(): void {
    this.entries.length = 0;
  }
}

export interface Failable<T> {
  /**
   * The next call to `method` fails with `error` instead of running: an async
   * method rejects, a sync one throws. Queue several to fail several calls.
   */
  failNext(method: keyof T & string, error?: Error): void;
}

/**
 * Wraps every method of `target` so it is logged as `<name>.<method>` and can
 * be failed on cue. Methods named in `reads` are logged as reads. Non-function
 * properties (a recorder's `capabilities`) are passed through as they are.
 */
export function failable<T extends object>(target: T, name: string, log: CallLog, reads: readonly string[] = []): T & Failable<T> {
  const pending = new Map<string, Error[]>();
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(target)) {
    const value = (target as Record<string, unknown>)[key];
    if (typeof value !== 'function') {
      Object.defineProperty(out, key, {
        get: () => (target as Record<string, unknown>)[key],
        set: (v: unknown) => {
          (target as Record<string, unknown>)[key] = v;
        },
        enumerable: true,
      });
      continue;
    }
    const fn = value as (...args: unknown[]) => unknown;
    const isAsync = fn.constructor.name === 'AsyncFunction';
    out[key] = (...args: unknown[]) => {
      const queued = pending.get(key);
      const error = queued?.shift();
      log.entries.push({ call: `${name}.${key}`, args, failed: !!error, read: reads.includes(key) });
      if (error) {
        if (isAsync) return Promise.reject(error);
        throw error;
      }
      return fn.apply(target, args);
    };
  }
  out.failNext = (method: string, error = new Error(`${name}.${method} failed (on cue)`)) => {
    const queued = pending.get(method) ?? [];
    queued.push(error);
    pending.set(method, queued);
  };
  return out as T & Failable<T>;
}
