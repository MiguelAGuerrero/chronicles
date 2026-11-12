// @layer shell
import { notePatch } from '../noteEdit';
import { type Faced, facedAll } from '../moment';
import { captureBus, type CapturePatch } from '../captureBus';
import { createStore, type Store } from '../store';
import type { Ports } from '../ports/types';
import type { Pause, Walk } from '../types';
import { DEFAULT_EXTRACTORS, signalsOf } from './extractors';
import { pausedMs } from '../geo';
import { complexAt, COMPLEX_NEAR_DEG } from '../complexes/place';
import { arrivalLine, previousCapture, streetAt } from './context';
import { EMPTY_PREFS, forgetChoices, hideMoment, lessLike, parsePrefs, removeThread, renameThread, restoreWord, revertChange, setOff, shown, unhideMoment, unremoveThread, type PrefsChange } from './prefs';
import type { MomentView, Prefs, SignalExtractor } from './types';
import { openWalkViews, toMomentViews, wordsOf } from './views';

/** Meta: what the user chose (RM21), one JSON value; ids and terms only. */
export const PREFS_KEY = 'resurface_prefs';

export interface ResurfaceState {
  status: 'loading' | 'ready' | 'failed';
  /** Every moment of a stopped walk, and loose ones, oldest first. Deletes are applied by the view (RM19). */
  moments: MomentView[];
  /** Moments of a walk still open: never in the feed (RM17), only here, so an owner's thread can show a reply made mid-walk. */
  inOpenWalk: MomentView[];
  walks: Record<string, Walk>;
  prefs: Prefs;
  /** Orders equals among the resurfaced; new on every open (RM8). */
  seed: string;
  /** Which of the resurfaced moments the top card shows. */
  index: number;
  /** The moment the top card showed at the last open: fixed for this open, so showing one never reorders the rest (RM8). */
  lastShownAtOpen: string | null;
  /** The arrival line of the moments asked about this open (MC1-MC5, MC6, MC17). Absent: not asked yet. */
  context: Record<string, ContextEntry>;
  /** Counts every read of the moments, so a card whose read failed asks again (audit 2). */
  version: number;
}

/** A moment's context: being read, failed (not "no street"), or its line (MC17). */
export type ContextEntry = { state: 'pending' } | { state: 'failed' } | { state: 'done'; line: string };

/** The street cache is read this far around a fix: a little over the 40 m reach, in metres. */
const READ_M = 45;
const M_PER_DEG = 111_320;

export interface ResurfaceOptions {
  /** Where a memo's words come from, once something transcribes them (RM13). */
  transcript?: (c: Faced) => string | null;
  extractors?: SignalExtractor[];
}

/**
 * Chronicle's Memories (specs/resurfaced-moments): reads the moments, keeps
 * the user's choices in meta (RM21) and nothing else. Threads and the feed
 * are derived by `compose` each time the view needs them (RM23).
 */
export function createResurface(p: Pick<Ports, 'db' | 'clock'>, opts: ResurfaceOptions = {}) {
  const extractors = opts.extractors ?? DEFAULT_EXTRACTORS;
  const store: Store<ResurfaceState> = createStore<ResurfaceState>({ status: 'loading', moments: [], inOpenWalk: [], walks: {}, prefs: EMPTY_PREFS, seed: '0', index: 0, lastShownAtOpen: null, context: {}, version: 0 });

  /** The saved choices; damage or nothing reads as none (RM21). */
  async function readPrefs(): Promise<Prefs> {
    try {
      const raw = await p.db.getMeta(PREFS_KEY);
      return (raw ? parsePrefs(JSON.parse(raw)) : null) ?? EMPTY_PREFS;
    } catch {
      return EMPTY_PREFS;
    }
  }

  // Choices are written one after another, and a read waits for them (audit 3).
  let writes: Promise<unknown> = Promise.resolve();
  // Pauses by walk, read once per open (MC6).
  const pausesByWalk = new Map<string, Promise<Pause[]>>();
  const pausesOf = (walkId: string) => {
    let got = pausesByWalk.get(walkId);
    if (!got) {
      got = p.db.getPauses(walkId);
      pausesByWalk.set(walkId, got);
      // A read that fails is not kept for the open: the next ask reads again (audit 1).
      got.catch(() => pausesByWalk.delete(walkId));
    }
    return got;
  };

  // Context reads run one at a time (audit 8).
  let readQueue: Promise<void> = Promise.resolve();

  // The newest read wins: an older one that finishes late is dropped (audit 3).
  let generation = 0;
  // Counts the owner's choices: a read that began before one never overwrites it (audit 6).
  let choices = 0;

  /** Sets the choices at once, then keeps them; says whether they were kept (audit 10). */
  function setPrefs(next: Prefs): Promise<PrefsChange> {
    const before = store.get().prefs;
    choices += 1;
    store.set((s) => ({ ...s, prefs: next }));
    const saved = writes.then(() => p.db.setMeta(PREFS_KEY, JSON.stringify(next)).then(() => true, () => false));
    writes = saved;
    return saved.then((ok) => ({ before, after: next, saved: ok }));
  }

  /**
   * The context a refresh keeps: finished lines only (a failed or pending read is asked again), and not those of
   * a walk that lost a capture (MC5, audit 9) or whose area changed (audit 14).
   */
  function keepContext(prev: ResurfaceState, next: MomentView[], walks: Walk[]): Record<string, ContextEntry> {
    const now = new Set(next.map((m) => m.id));
    const lost = new Set(prev.moments.filter((m) => m.walkId && !now.has(m.id)).map((m) => m.walkId as string));
    for (const w of walks) if (prev.walks[w.id] && (prev.walks[w.id].area ?? null) !== (w.area ?? null)) lost.add(w.id);
    const walkOf = new Map(prev.moments.map((m) => [m.id, m.walkId]));
    return Object.fromEntries(Object.entries(prev.context).filter(([id, e]) => e.state === 'done' && !lost.has(walkOf.get(id) ?? '')));
  }

  /** Reads the moments and the choices; `open` also starts a new open (a new seed, the top card first). */
  async function read(open: boolean): Promise<void> {
    const mine = ++generation;
    const choicesThen = choices;
    try {
      await writes;
      const [prefs, captures, walks] = await Promise.all([readPrefs(), p.db.momentsBetween(0, Number.MAX_SAFE_INTEGER).then(facedAll), p.db.listWalks()]);
      if (mine !== generation) return;
      store.set((s) => ({
        status: 'ready',
        moments: toMomentViews(captures, walks, opts.transcript),
        inOpenWalk: openWalkViews(captures, walks, opts.transcript),
        walks: Object.fromEntries(walks.map((w) => [w.id, w])),
        // A choice made while this read was running is newer than what it read (audit 6).
        prefs: choices === choicesThen ? { ...EMPTY_PREFS, ...prefs } : s.prefs,
        seed: open ? String(p.clock.now()) : s.seed,
        index: open ? 0 : s.index,
        lastShownAtOpen: open ? prefs.lastShown ?? null : s.lastShownAtOpen,
        // A new open reads its context afresh; a refresh keeps what it has (MC6), except for a walk that lost a
        // capture: its neighbours' lines may name the one that is gone (MC5).
        context: open ? {} : keepContext(s, toMomentViews(captures, walks, opts.transcript), walks),
        version: s.version + 1,
      }));
      if (open) pausesByWalk.clear();
    } catch {
      if (mine === generation) store.set((s) => ({ ...s, status: 'failed' }));
    }
  }

  return {
    store,
    /** On every open of Memories, coming from elsewhere: the choices first (RM21), then the moments, in a new order. */
    load: () => read(true),
    /** Reads again within the same open (a delete, coming back from a replay): the top card and its order stay (audit 4). */
    refresh: () => read(false),
    /**
     * The arrival line of each moment asked about, read once per open and only for those (MC6). A moment is
     * `pending` while it is read and `failed` if the read fails, never "no street" (MC17); a failed one is
     * asked again next time. Reads run one at a time (audit 8), and one that a refresh overtook writes nothing
     * (audit 9). `deleted` are captures a delete has hidden: never named as "just before" (MC5).
     */
    async contextFor(ids: string[], deleted: ReadonlySet<string> = new Set()): Promise<void> {
      const todo = ids.filter((id) => {
        const c = store.get().context[id];
        return !c || c.state === 'failed';
      });
      if (!todo.length) return;
      const put = (entries: Record<string, ContextEntry>) => store.set((s) => ({ ...s, context: { ...s.context, ...entries } }));
      const drop = (id: string) =>
        store.set((s) => {
          const { [id]: _gone, ...rest } = s.context;
          return { ...s, context: rest };
        });
      put(Object.fromEntries(todo.map((id) => [id, { state: 'pending' } as ContextEntry])));
      const readOne = async (id: string): Promise<void> => {
        const began = generation;
        const { moments, walks } = store.get();
        const m = moments.find((x) => x.id === id);
        if (!m) return put({ [id]: { state: 'failed' } });
        try {
          const c = m.capture;
          const walk = c.walk_id ? walks[c.walk_id] : undefined;
          const fix = c.lat != null && c.lon != null ? ([c.lon, c.lat] as [number, number]) : null;
          const dLon = fix ? READ_M / (M_PER_DEG * Math.max(0.05, Math.cos((fix[1] * Math.PI) / 180))) : 0;
          const dLat = READ_M / M_PER_DEG;
          const segments = fix ? await p.db.getSegmentsIn([fix[0] - dLon, fix[1] - dLat, fix[0] + dLon, fix[1] + dLat]) : [];
          const pauses = walk ? await pausesOf(walk.id) : [];
          // The moments were read again while this was running: what it knows may name a capture that is gone.
          if (began !== generation) return drop(id);
          let walkedMs: number | null = null;
          let prev: { kind: Faced['kind']; walkedGapMs: number } | null = null;
          if (walk) {
            walkedMs = Math.max(0, c.t - walk.started_at - pausedMs(pauses, walk.started_at, c.t));
            const before = previousCapture(moments.filter((x) => x.walkId === walk.id).map((x) => x.capture), id, deleted);
            if (before) prev = { kind: before.kind, walkedGapMs: Math.max(0, c.t - before.t - pausedMs(pauses, before.t, c.t)) };
          }
          const street = streetAt(fix, segments, c.segment_id);
          // CX11, CX12: a complex already on the phone leads the line; nothing is fetched to show it. A cache that cannot be read is no complex, never no line.
          const hit = fix ? complexAt(fix, await p.db.complexesNear(fix, COMPLEX_NEAR_DEG).catch(() => [])) : null;
          const line = arrivalLine({ street: street?.name ?? null, streetNear: street?.near, town: walk?.area?.trim() || null, complex: hit ? { name: hit.complex.name, near: hit.near } : null, t: c.t, now: p.clock.now(), walkedMs, prev });
          put({ [id]: { state: 'done', line } });
        } catch {
          put({ [id]: { state: 'failed' } });
        }
      };
      await Promise.all(todo.map((id) => (readQueue = readQueue.then(() => readOne(id)))));
    },
    /** A delete began: the lines of the walks it touches are read again, so none names the capture that is going (audit 9). */
    dropContextOfWalks(walkIds: string[]): void {
      if (!walkIds.length) return;
      const gone = new Set(walkIds);
      store.set((s) => {
        const walkOf = new Map(s.moments.map((m) => [m.id, m.walkId]));
        const context = Object.fromEntries(Object.entries(s.context).filter(([id]) => !gone.has(walkOf.get(id) ?? '')));
        return Object.keys(context).length === Object.keys(s.context).length ? s : { ...s, context, version: s.version + 1 };
      });
    },
    /** Whether a walk is open: a reminder waiting from a cold start opens on the walk then, else on Memories (NV13). */
    async openWalk(): Promise<boolean> {
      return !!(await p.db.getOpenWalk().catch(() => null));
    },
    /** Another (RM8): the next resurfaced moment. The view takes it modulo how many there are. */
    another(): void {
      store.set((s) => ({ ...s, index: s.index + 1 }));
    },
    /** The top card showed this moment: kept, so the next open starts elsewhere (RM8). */
    async shown(id: string): Promise<void> {
      const prefs = store.get().prefs;
      if (prefs.lastShown === id) return;
      await setPrefs(shown(prefs, id));
    },
    /** Not this one (RM20). Returns the change, for Undo and to say whether it was kept. */
    hide: (id: string) => setPrefs(hideMoment(store.get().prefs, id)),
    /** Show less like this (RM20): the moment, and the terms it is about. */
    less(id: string): Promise<PrefsChange> {
      const m = store.get().moments.find((x) => x.id === id);
      const signals = m ? signalsOf(m, extractors) : [];
      const written = Object.fromEntries(signals.map((s) => [s.term, s.shown ?? s.term]));
      return setPrefs(lessLike(store.get().prefs, id, signals.map((s) => s.term), written));
    },
    /** Bring back (MC8): a hidden or fewer-like-this moment, a removed thread, a softened word. */
    restoreMoment: (id: string) => setPrefs(unhideMoment(store.get().prefs, id)),
    restoreThread: (term: string) => setPrefs(unremoveThread(store.get().prefs, term)),
    restoreWord: (term: string) => setPrefs(restoreWord(store.get().prefs, term)),
    /** Bring moments back, the switch (MC9). */
    setOff: (off: boolean) => setPrefs(setOff(store.get().prefs, off)),
    /** Forget my choices (MC10): the lists and renames go, the switch stays. */
    forget: () => setPrefs(forgetChoices(store.get().prefs)),
    rename: (term: string, name: string) => setPrefs(renameThread(store.get().prefs, term, name)),
    removeThread: (term: string) => setPrefs(removeThread(store.get().prefs, term)),
    /** A change made in the viewer (a note, a caption, an edit) shows here at once (RM18). */
    patch(id: string, change: CapturePatch): void {
      const patched = (m: MomentView): MomentView => {
        if (m.id !== id) return m;
        const capture = { ...m.capture, ...change } as Faced;
        return { ...m, capture, words: wordsOf(capture, opts.transcript) };
      };
      store.set((s) => ({ ...s, moments: s.moments.map(patched), inOpenWalk: s.inOpenWalk.map(patched) }));
    },
    /** Edit note in the viewer: stored first, then told to the other screens (QL25). */
    async saveNote(c: Faced, body: string): Promise<void> {
      await p.db.updatePiece(c.piece_id, notePatch(body));
      captureBus.patch(c.walk_id, c.id, notePatch(body), null);
      this.patch(c.id, notePatch(body));
    },
    /** Takes back that one choice (RM20's Undo); choices made since stay (audit 2). */
    async undo(change: PrefsChange): Promise<void> {
      await setPrefs(revertChange(store.get().prefs, change));
    },
  };
}
