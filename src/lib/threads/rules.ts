// @layer core
import type { Link, Member, Thread, ThreadsChange, ThreadsData } from './types';

/** A thread holds at least two moments, or it is not a connection (OT15). */
export const MIN_MEMBERS = 2;

/** Thread ids, among `ids`, that fewer than two distinct moments of `members` belong to. */
export function thinThreads(ids: Iterable<string>, members: Member[]): string[] {
  const seen = new Map<string, Set<string>>();
  for (const m of members) {
    const s = seen.get(m.thread_id) ?? new Set<string>();
    s.add(m.moment_id);
    seen.set(m.thread_id, s);
  }
  return [...new Set(ids)].filter((id) => (seen.get(id)?.size ?? 0) < MIN_MEMBERS);
}

/** Can a thread be made of these? Only from at least two distinct kept moments (OT5, OT6). */
export function canMakeThread(momentIds: string[], kept: ReadonlySet<string>): boolean {
  const distinct = new Set(momentIds);
  return distinct.size >= MIN_MEMBERS && [...distinct].every((id) => kept.has(id));
}

/**
 * Which thread a reply joins (OT2, OT3): the thread it was started from if the answered moment
 * is in it, else the answered moment's oldest thread, else none (a new unnamed one is made).
 */
export function threadForReply(answeredId: string, members: Member[], from?: string | null): string | null {
  const mine = members.filter((m) => m.moment_id === answeredId).sort((a, b) => a.added_at - b.added_at);
  if (from && mine.some((m) => m.thread_id === from)) return from;
  return mine[0]?.thread_id ?? null;
}

/** The change a saved reply makes: the link, and the membership (a new unnamed thread of the two when there is none). */
export function replyChange(o: {
  replyId: string;
  answeredId: string;
  members: Member[];
  from?: string | null;
  newThreadId: string;
  now: number;
}): ThreadsChange {
  const existing = threadForReply(o.answeredId, o.members, o.from);
  const link: Link = { from_id: o.replyId, to_id: o.answeredId, created_at: o.now };
  if (existing) return { putLinks: [link], putMembers: [{ thread_id: existing, moment_id: o.replyId, added_at: o.now }] };
  return {
    putThreads: [{ id: o.newThreadId, name: null, created_at: o.now }],
    putMembers: [
      { thread_id: o.newThreadId, moment_id: o.answeredId, added_at: o.now },
      { thread_id: o.newThreadId, moment_id: o.replyId, added_at: o.now },
    ],
    putLinks: [link],
  };
}

/** The change that adds a moment to a thread; none if it is already in it (OT7). */
export function addChange(threadId: string, momentId: string, members: Member[], now: number): ThreadsChange | null {
  if (members.some((m) => m.thread_id === threadId && m.moment_id === momentId)) return null;
  return { putMembers: [{ thread_id: threadId, moment_id: momentId, added_at: now }] };
}

/** The thread name the owner typed: trimmed, and none when blank (OT13). */
export function cleanName(name: string): string | null {
  const t = name.trim();
  return t ? t : null;
}

/**
 * The owner's threads as a screen shows them while deletes wait in the Undo window: hidden moments,
 * their links and hidden threads gone, and a thread that is thin without them gone too (OT14, OT15).
 */
export function visibleThreads(data: ThreadsData, hidden: ReadonlySet<string>): ThreadsData {
  const members = data.members.filter((m) => !hidden.has(m.moment_id) && !hidden.has(m.thread_id));
  const thin = new Set(thinThreads(data.threads.map((t) => t.id), members));
  const threads = data.threads.filter((t) => !hidden.has(t.id) && !thin.has(t.id));
  const live = new Set(threads.map((t) => t.id));
  return {
    threads,
    members: members.filter((m) => live.has(m.thread_id)),
    links: data.links.filter((l) => !hidden.has(l.from_id) && !hidden.has(l.to_id)),
  };
}

/** Threads a moment is in, oldest membership first. */
export function threadsOf(momentId: string, data: ThreadsData): Thread[] {
  const byId = new Map(data.threads.map((t) => [t.id, t]));
  return data.members
    .filter((m) => m.moment_id === momentId)
    .sort((a, b) => a.added_at - b.added_at)
    .map((m) => byId.get(m.thread_id))
    .filter((t): t is Thread => !!t);
}

/** Would taking one moment out of this thread leave it thin, so the thread ends (audit 5)? */
export function removalDissolves(members: Member[], threadId: string): boolean {
  return new Set(members.filter((m) => m.thread_id === threadId).map((m) => m.moment_id)).size <= MIN_MEMBERS;
}
