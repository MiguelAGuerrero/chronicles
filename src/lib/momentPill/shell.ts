// @layer shell
import { initial, openId, step, target, OPEN_MS, type OpenEvent, type OpenState } from '../openMoment';
import type { Ports } from '../ports/types';
import { createStore, type Store } from '../store';

/** Group captures into one moment, kept in meta (declared in `META`). */
const GROUP_KEY = 'group_captures';

/** What a view reads: the moment the Add to this moment pill is open for, or null (MS2, MS12). */
export interface PillState {
  id: string | null;
  /**
   * The viewer asked to add to the open moment (MS12): the walk screen beneath, which holds the camera, the mic and
   * the note, runs it. `seq` changes with each ask, so a view can react to it as a primitive.
   */
  ask: { kind: 'photo' | 'voice' | 'text'; seq: number } | null;
  /** Group captures into one moment (MS18, MS19): the edge stack adds to the open moment; off by default. */
  grouping: boolean;
}

/**
 * The Add to this moment pill's state (moment stacks MS4, MS5, MS12; decision 0123): `openMoment`'s reducer with
 * the app's clock and one timer, so the pill goes by itself when its two minutes are up. The walk screen tells it
 * what happened; the pill and the viewer read `store`. `setTimer` is passed in (the app's `setTimeout`; a test's
 * hand-driven clock).
 */
export function createMomentPill(
  p: Pick<Ports, 'clock' | 'db'>,
  deps: { setTimer: (fn: () => void, ms: number) => unknown; clearTimer: (id: unknown) => void },
) {
  let state: OpenState = initial;
  let timer: unknown = null;
  const store: Store<PillState> = createStore<PillState>({ id: null, ask: null, grouping: false });

  let seq = 0;
  const settle = () => {
    const now = p.clock.now();
    const id = openId(state, now);
    if (store.get().id !== id) store.set({ ...store.get(), id });
    if (timer != null) deps.clearTimer(timer);
    timer = null;
    // Looked at again when its two minutes are up (MS4).
    if (id && state.open) timer = deps.setTimer(settle, Math.max(0, state.open.last + OPEN_MS - now) + 1);
  };
  const send = (e: OpenEvent) => {
    state = step(state, e);
    settle();
  };
  return {
    store,
    /** A new moment kept from the edge stack: the pill opens for it. */
    kept: (id: string, walking: boolean) => send({ k: 'kept', id, t: p.clock.now(), walking }),
    /** A piece added to a moment: its two minutes start again. */
    piece: (id: string) => send({ k: 'piece', id, t: p.clock.now() }),
    /** Metres the walk's own trace went (MS4: 100 m from the first capture). */
    walked: (m: number) => send({ k: 'walked', m }),
    dismiss: () => send({ k: 'dismiss' }),
    leave: () => send({ k: 'leave' }),
    /** A walk started or stopped. */
    walk: () => send({ k: 'walk' }),
    /** A moment opened in the viewer. */
    opened: (id: string) => send({ k: 'opened', id }),
    /** The viewer's Add to this moment (MS12): only while a moment is open. */
    ask: (kind: 'photo' | 'voice' | 'text') => {
      if (openId(state, p.clock.now())) store.set({ ...store.get(), ask: { kind, seq: ++seq } });
    },
    /** The walk screen took the ask. */
    asked: () => store.set({ ...store.get(), ask: null }),
    /** Reads the Group captures setting kept on the device (MS18); off when none was kept. */
    async loadGrouping(): Promise<boolean> {
      const on = (await p.db.getMeta(GROUP_KEY).catch(() => null)) === '1';
      store.set({ ...store.get(), grouping: on });
      return on;
    },
    /** Keeps the setting on the device and applies it at once (MS18). */
    async setGrouping(on: boolean): Promise<void> {
      store.set({ ...store.get(), grouping: on });
      await p.db.setMeta(GROUP_KEY, on ? '1' : '0');
    },
    /**
     * The moment an edge-stack capture begun now joins: with grouping on, the open one (MS19); with it off, none, so the
     * edge always starts a new moment (MS1, MS21).
     */
    edgeTarget: (): string | null => (store.get().grouping ? target(state, p.clock.now()) : null),
    /** New moment (MS19): the open moment closes, so the next capture starts another. */
    newMoment: () => send({ k: 'leave' }),
    /** The moment a capture begun now from the pill joins, or null (MS4: begun while open, it joins). */
    target: (): string | null => target(state, p.clock.now()),
  };
}

export type MomentPill = ReturnType<typeof createMomentPill>;
