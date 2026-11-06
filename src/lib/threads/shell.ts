// @layer shell
import { createStore, type Store } from '../store';
import type { Ports } from '../ports/types';
import { addChange, canMakeThread, cleanName, replyChange } from './rules';
import type { ThreadsData } from './types';

export interface ThreadsState {
  loaded: boolean;
  data: ThreadsData;
}

const NONE: ThreadsData = { threads: [], members: [], links: [] };

/** A delete that waits in the Undo window; the app's `deletions` runs it, a test runs it by hand (OT14). */
export interface ThreadDeleteJob {
  /** The thread id every screen hides while it waits. */
  ids: string[];
  run(): Promise<void>;
}

/**
 * Owner threads (specs/owner-threads, decision 0102): reads and writes the owner's threads, memberships and replies.
 * A moment is never touched. The Chronicle's own threads (`lib/resurface`) are a separate, computed thing; nothing
 * here reads them (OT19).
 */
export function createThreads(p: Pick<Ports, 'db' | 'clock' | 'newId'>, deps: { schedule: (job: ThreadDeleteJob) => void }) {
  const store: Store<ThreadsState> = createStore<ThreadsState>({ loaded: false, data: NONE });
  let writes: Promise<unknown> = Promise.resolve();

  async function load(): Promise<ThreadsData> {
    const data = await p.db.listThreads();
    store.set({ loaded: true, data });
    return data;
  }
  /** Changes are written one after another, and the store follows what was stored. */
  function apply(change: Parameters<typeof p.db.applyThreads>[0]): Promise<ThreadsData> {
    const run = writes.then(async () => {
      await p.db.applyThreads(change);
      return load();
    });
    writes = run.catch(() => {});
    return run;
  }
  const keptIds = async (ids: string[]) => new Set((await p.db.getCapturesByIds([...new Set(ids)])).map((c) => c.id));

  return {
    store,
    load,

    /** A new thread of at least two kept moments (OT5, OT6); null when it cannot be made. */
    async startThread(momentIds: string[], name: string | null = null): Promise<string | null> {
      if (!canMakeThread(momentIds, await keptIds(momentIds))) return null;
      const now = p.clock.now();
      const id = p.newId();
      await apply({
        putThreads: [{ id, name: name ? cleanName(name) : null, created_at: now }],
        putMembers: [...new Set(momentIds)].map((moment_id) => ({ thread_id: id, moment_id, added_at: now })),
      });
      return id;
    },

    /** Adds a kept moment to a thread; false if the thread or the moment does not exist, true if it was already in (OT7). */
    async addToThread(threadId: string, momentId: string): Promise<boolean> {
      const data = await p.db.listThreads();
      if (!data.threads.some((t) => t.id === threadId) || !(await keptIds([momentId])).has(momentId)) return false;
      const change = addChange(threadId, momentId, data.members, p.clock.now());
      if (change) await apply(change);
      return true;
    },

    /** Takes one moment out of one thread; the moment and its other threads stay (OT8). A thread left thin dissolves. */
    async removeFromThread(threadId: string, momentId: string): Promise<void> {
      await apply({ deleteMembers: [{ thread_id: threadId, moment_id: momentId }] });
    },

    /** Names a thread; a blank name clears it (OT13). */
    async rename(threadId: string, name: string): Promise<void> {
      const t = (await p.db.listThreads()).threads.find((x) => x.id === threadId);
      if (t) await apply({ putThreads: [{ ...t, name: cleanName(name) }] });
    },

    /** Deletes the thread and its memberships after the Undo window; every moment stays (OT14). */
    deleteThread(threadId: string): void {
      deps.schedule({ ids: [threadId], run: async () => void (await apply({ deleteThreads: [threadId] })) });
    },

    /**
     * A saved reply: the directed link, and the membership in the thread it was started from, or in the answered
     * moment's thread, or in a new unnamed thread of the two (OT2). Both moments must be kept.
     */
    async reply(replyId: string, answeredId: string, from: string | null = null): Promise<boolean> {
      if (replyId === answeredId || (await keptIds([replyId, answeredId])).size < 2) return false;
      const { members } = await p.db.listThreads();
      await apply(replyChange({ replyId, answeredId, members, from, newThreadId: p.newId(), now: p.clock.now() }));
      return true;
    },
  };
}

export type Threads = ReturnType<typeof createThreads>;
