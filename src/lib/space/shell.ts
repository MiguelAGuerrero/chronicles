// @layer shell
import type { Ports } from '../ports/types';
import { createStore } from '../store';
import { persistLine, shouldSay, spaceLevel, spaceLine, type SpaceLevel, type SpaceProbe } from './core';

/** Meta: the level last said beside the captures (SA4); cleared when the room is back above low. */
export const SAID_KEY = 'space_said';
/** Meta: the web's persistence request (SA10): `due` once a capture is kept mid-walk, `refused` to say, `asked` done. */
export const PERSIST_KEY = 'space_persist';

type Persist = 'due' | 'refused' | 'asked';

export interface SpaceState {
  /** The line shown in the pills beside the captures, or null. */
  line: string | null;
}

/** Where the walker is: a walk recording (the walk screen) or not (Navigate, ready; a moment). */
export interface Where {
  recording: boolean;
}

/**
 * Storage awareness (SA1-SA10, decision 0104): reads the room left through the probe, decides with
 * `core`, keeps what was said in meta so a reload doesn't say it again, and holds the one line the
 * pills show. Calls run one at a time, so two looks at once never ask the browser twice.
 */
export function createSpace(p: Pick<Ports, 'db'>, probe: SpaceProbe) {
  const store = createStore<SpaceState>({ line: null });
  let shown: 'space' | 'persist' | null = null;
  // undefined: not read from meta yet.
  let said: SpaceLevel | null | undefined;
  let persist: Persist | null | undefined;
  let chain: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = chain.then(fn, fn);
    chain = next.catch(() => {});
    return next;
  };

  const show = (line: string | null, kind: typeof shown) => {
    shown = line ? kind : null;
    store.set({ line });
  };
  // Meta read once, then kept here; an unreadable or failed read is nothing said, nothing asked.
  const loadSaid = async () => {
    if (said === undefined) {
      const v = await p.db.getMeta(SAID_KEY).catch(() => null);
      said = v === 'low' || v === 'very-low' ? v : null;
    }
    return said;
  };
  const loadPersist = async () => {
    if (persist === undefined) {
      const v = await p.db.getMeta(PERSIST_KEY).catch(() => null);
      persist = v === 'due' || v === 'refused' || v === 'asked' ? v : null;
    }
    return persist;
  };
  const setPersist = (v: Persist) => {
    persist = v;
    return p.db.setMeta(PERSIST_KEY, v).catch(() => {});
  };

  /** The level now; 'unread' when the room can't be read, which changes nothing (SA1). */
  async function read(): Promise<SpaceLevel | null | 'unread'> {
    try {
      const free = await probe.free();
      if (free == null || !Number.isFinite(free) || free < 0) return 'unread';
      return spaceLevel(free);
    } catch {
      return 'unread';
    }
  }

  /** Reads the room and says it once for each level (SA3, SA4). Returns the line it put up, if any. */
  async function look(): Promise<string | null> {
    const level = await read();
    if (level === 'unread') return null;
    const last = await loadSaid();
    if (level === null) {
      // The room is back: the next low is said again, and a line about it goes.
      if (last != null) {
        said = null;
        await p.db.setMeta(SAID_KEY, '').catch(() => {});
      }
      if (shown === 'space') show(null, null);
      return null;
    }
    if (!shouldSay(last, level)) return null;
    said = level;
    await p.db.setMeta(SAID_KEY, level).catch(() => {});
    const line = spaceLine(level);
    show(line, 'space');
    return line;
  }

  /** Asks the browser once to keep the app's data (SA10); a phone has nothing to ask. */
  async function ask() {
    await setPersist('asked');
    const granted = await probe.persist().catch(() => null);
    if (granted === false) await setPersist('refused');
  }

  /** Off the walk: a due request is asked, and a refusal is said when the pills are free (SA10). */
  async function settle() {
    if ((await loadPersist()) === 'due') await ask();
    if (persist === 'refused' && store.get().line == null) {
      show(persistLine(probe.homeScreen()), 'persist');
      await setPersist('asked');
    }
  }

  return {
    store,
    /** When a walk opens or Navigate, ready shows (SA3). */
    check: (where: Where): Promise<string | null> =>
      serial(async () => {
        const line = await look();
        if (!where.recording) await settle();
        return line;
      }),
    /** After a kept photo, video or memo: the room again (SA5); the web's request, never mid-walk (SA10). */
    afterKept: (where: Where): Promise<void> =>
      serial(async () => {
        await look();
        if ((await loadPersist()) == null) {
          if (where.recording) await setPersist('due');
          else await ask();
        }
        if (!where.recording) await settle();
      }),
    /** The line's dismiss button (SA6). */
    dismiss() {
      show(null, null);
    },
  };
}

export type Space = ReturnType<typeof createSpace>;
