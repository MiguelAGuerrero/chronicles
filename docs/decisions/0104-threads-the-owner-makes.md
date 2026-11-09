# 0104. Threads the owner makes: moments stay whole, connections are separate records

Date: 2026-11-06 · Status: accepted · Area: chronicle, storage, vision

## Context
The owner wants to respond to a moment when back in its area, and to connect moments across walks, days and places (the example: every time someone compliments their physique) so that recall is easier. `docs/VISION.md` listed "threads the owner makes first" as **[proposed]** and left open question 1 (threads the owner makes, groups the app suggests, or both) and question 5 (where "nothing is calculated for you" stops). Decision 0098 already derives threads from recurring words; those are computed on read and never stored (RM23).

The gate (`/vision`, decision 0094) found the idea aligned if reshaped: it serves Return and Honour, and the rules it must keep are counts in words, a moment carries its context, and capture stays one tap.

## Decision
The owner's calls, Nov 5-6:
- **Moments stay whole.** A moment is a node and gets no new field. Linking or unlinking never edits it. Every moment has its own time and place; nothing is captured "inside" a thread.
- **Connections are separate, owner-authored records:**
  - `thread (id, name nullable, created_at)`: a group. Its name is the owner's, optional and editable; a suggested name is only ever a suggestion.
  - `thread_member (thread_id, moment_id, added_at)`: membership. A moment may be in several threads.
  - `moment_link (from_id, to_id, created_at)`: a directed reply, "from answers to". Directed replies are supported.
- **A thread exists only because moments were connected.** It is never created empty and never started before a moment is made; there is no top-down thread. A thread with no moments, rooted in a place, is a journal: a separate feature, judged at its own gate (`docs/DEFERRED.md`).
- **A reply is a new moment** with its own place and time, plus a `moment_link` to the moment it answers, and it joins that moment's thread. If the answered moment has none, an unnamed thread of the two is created.
- **A thread with fewer than two moments dissolves**, name and all. The delete that causes it is undoable.
- **Deleting a thread deletes its memberships and nothing else.** Every moment stays. Deleting a moment deletes its memberships and links and nothing else.
- **The Chronicle's own connections are a separate environment.** The suggested threads of 0098 share the same shape but stay computed on read and never stored; they do not read the owner's threads, and the owner's threads do not read them. A rule change (`THREAD_RULES`) cannot touch an owner-made thread. A suggestion becomes the owner's only by a tap, as a copy.
- **Owner-made threads are truth** (append-only apart from deletes), unlike the cache of the derived threads. Words, not digits, say a thread's size.

## Consequences
- A new spec carries these as criteria; it starts at `/slice`. Storage is two new tables plus `moment_link`: new `MIGRATIONS` entries (SQLite) and a `VERSION` bump with an `oldVersion < N` step (IndexedDB); no existing migration is edited.
- Capture from the edge stack is unchanged (one tap). "Respond" is an optional entry from a moment's viewer and from "Memories here" on a faint pin (0037).
- Deletion rules (`.claude/rules/deletion.md`) gain the cascades above.
- **Proposed edit to `docs/VISION.md`** (the owner makes it): replace the **[proposed]** "threads the owner makes first; suggested groups only once there is a corpus to learn from" with this record's rule, answer open question 1 (owner-made threads and the Chronicle's suggestions are independent), and note under question 5 that calculated connections live only in the Chronicle's own environment. Add 0104 to Precedents. Until then the page still shows the old line.
