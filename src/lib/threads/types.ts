// @layer core

/**
 * Owner threads (specs/owner-threads, decision 0104): the three records the owner's
 * connections are made of. All truth, none derived. A moment is never edited by them.
 */

/** A group of moments the owner connected. Its name is the owner's, optional. */
export interface Thread {
  id: string;
  name: string | null;
  created_at: number;
}

/** A moment's place in a thread. A moment may be in several threads. */
export interface Member {
  thread_id: string;
  moment_id: string;
  added_at: number;
}

/** A directed reply: `from_id` answers `to_id`. */
export interface Link {
  from_id: string;
  to_id: string;
  created_at: number;
}

export interface ThreadsData {
  threads: Thread[];
  members: Member[];
  links: Link[];
}

/**
 * One atomic change to the three stores. A thread left with fewer than two
 * members by it is dissolved inside the same transaction (OT15).
 */
export interface ThreadsChange {
  putThreads?: Thread[];
  putMembers?: Member[];
  putLinks?: Link[];
  /** Drops the threads and their memberships; the moments and links stay (OT14). */
  deleteThreads?: string[];
  deleteMembers?: { thread_id: string; moment_id: string }[];
  deleteLinks?: { from_id: string; to_id: string }[];
}
