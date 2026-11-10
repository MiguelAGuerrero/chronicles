// @layer shell
import { createStore, type Store } from '../store';
import type { Ports } from '../ports/types';
import type { Capture, Walk } from '../types';
import { addChange, canMakeThread, cleanName, replyChange } from './rules';
import type { ThreadsData } from './types';
import { membershipKey, type PendingJob } from '../deletion/pending';

export interface ThreadsState {
  loaded: boolean;
  data: ThreadsData;
  /** A thread another screen asked Memories to open (OT11); taken once by the screen that shows it. */
  open: string | null;
}

const NONE: ThreadsData = { threads: [], members: [], links: [] };

/** A delete that waits in the Undo window; the app's `deletions` stores it, a test stores it by hand (OT14, UC6). */
export type ThreadDeleteJob = Pick<PendingJob, 'kind' | 'ids' | 'spec'>;

/**
 * Owner threads (specs/owner-threads, decision 0104): reads and writes the owner's threads, memberships and replies.
 * A moment is never touched. The Chronicle's own threads (`lib/resurface`) are a separate, computed thing; nothing
 * here reads them (OT19).
 */
export function createThreads(
  p: Pick<Ports, 'db' | 'clock' | 'newId'>,
  deps: {
    schedule: (job: ThreadDeleteJob) => void;
    /** Stores whatever waits in the Undo window, so a write never works against a removal about to land (audit 4). */
    flush?: () => Promise<void>;
  },
) {
  const store: Store<ThreadsState> = createStore<ThreadsState>({ loaded: false, data: NONE, open: null });
  let writes: Promise<unknown> = Promise.resolve();

  async function load(): Promise<ThreadsData> {
    const data = await p.db.listThreads();
    store.set({ ...store.get(), loaded: true, data });
    return data;
  }
  /**
   * Everything that reads then writes runs one after another, reads included: two replies fired together join one thread
   * (owner-threads audit 6), and a moment deleted meanwhile is found out just before the write (audit 7).
   */
  function serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = writes.then(async () => {
      await deps.flush?.();
      return fn();
    });
    writes = run.catch(() => {});
    return run;
  }
  const commit = async (change: Parameters<typeof p.db.applyThreads>[0]): Promise<ThreadsData> => {
    await p.db.applyThreads(change);
    return load();
  };
  const keptIds = async (ids: string[]) => new Set((await p.db.getCapturesByIds([...new Set(ids)])).map((c) => c.id));

  return {
    store,
    load,

    /** Asks Memories to open a thread (the viewer's "in a thread", OT11). */
    requestOpen(threadId: string): void {
      store.set({ ...store.get(), open: threadId });
    },
    /** The thread asked for, once; null if none. */
    takeOpen(): string | null {
      const id = store.get().open;
      if (id) store.set({ ...store.get(), open: null });
      return id;
    },

    /** Every kept moment, newest first, with the walks they belong to: what the moment picker lists (OT5). */
    async moments(): Promise<{ captures: Capture[]; walks: Walk[] }> {
      const [captures, walks] = await Promise.all([p.db.capturesBetween(0, p.clock.now() + 1), p.db.listWalks()]);
      return { captures: captures.sort((a, b) => b.t - a.t), walks };
    },

    /** A new thread of at least two kept moments (OT5, OT6); null when it cannot be made. */
    startThread(momentIds: string[], name: string | null = null): Promise<string | null> {
      return serial(async () => {
        if (!canMakeThread(momentIds, await keptIds(momentIds))) return null;
        const now = p.clock.now();
        const id = p.newId();
        await commit({
          putThreads: [{ id, name: name ? cleanName(name) : null, created_at: now }],
          putMembers: [...new Set(momentIds)].map((moment_id) => ({ thread_id: id, moment_id, added_at: now })),
        });
        return id;
      });
    },

    /** Adds a kept moment to a thread; false if the thread or the moment does not exist, true if it was already in (OT7). */
    addToThread(threadId: string, momentId: string): Promise<boolean> {
      return serial(async () => {
        const data = await p.db.listThreads();
        if (!data.threads.some((t) => t.id === threadId) || !(await keptIds([momentId])).has(momentId)) return false;
        const change = addChange(threadId, momentId, data.members, p.clock.now());
        if (change) await commit(change);
        return true;
      });
    },

    /**
     * Takes one moment out of one thread, through the Undo window (UC6): hidden at once, stored on Close or the next
     * delete. The moment and its other threads stay (OT8); a thread left thin dissolves when it is stored.
     */
    removeFromThread(threadId: string, momentId: string): void {
      deps.schedule({ kind: 'remove', ids: [membershipKey(threadId, momentId)], spec: { type: 'remove', threadId, momentId } });
    },

    /** Names a thread; a blank name clears it (OT13). */
    async rename(threadId: string, name: string): Promise<void> {
      await serial(async () => {
        const t = (await p.db.listThreads()).threads.find((x) => x.id === threadId);
        if (t) await commit({ putThreads: [{ ...t, name: cleanName(name) }] });
      });
    },

    /** Deletes the thread and its memberships after the Undo window; every moment stays (OT14). */
    deleteThread(threadId: string): void {
      deps.schedule({ kind: 'thread', ids: [threadId], spec: { type: 'thread', threadId } });
    },

    /**
     * A saved reply: the directed link, and the membership in the thread it was started from, or in the answered
     * moment's thread, or in a new unnamed thread of the two (OT2). Both moments must be kept.
     */
    reply(replyId: string, answeredId: string, from: string | null = null): Promise<boolean> {
      return serial(async () => {
        if (replyId === answeredId || (await keptIds([replyId, answeredId])).size < 2) return false;
        const { members } = await p.db.listThreads();
        await commit(replyChange({ replyId, answeredId, members, from, newThreadId: p.newId(), now: p.clock.now() }));
        return true;
      });
    },
  };
}

export type Threads = ReturnType<typeof createThreads>;
