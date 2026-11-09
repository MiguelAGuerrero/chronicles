---
paths:
  - "src/lib/threads/**"
  - "src/lib/__tests__/threads/**"
---
# Owner threads

Threads the owner makes: a moment stays whole, and a thread, its members and a directed reply are separate stored records (specs/owner-threads, decision 0104). The criteria are OT1-OT24; their tests are written before their code.

- **Truth, not cache.** `thread`, `thread_member` and `moment_link` are never derived and never carry a tile build. The Chronicle's derived threads (`lib/resurface`, 0098) are a separate environment: neither reads the other.
- **No empty thread.** A thread exists only because two kept moments were connected (OT6); one left, and it dissolves (OT15).
- **Everything that reads then writes is one chain** (`serial` in `shell.ts`): two replies at once must join one thread, and a deleted moment is found out just before the write (owner-threads audit 6, 7). A new shell method follows it.
- **Both kinds are "threads"** (decision 0105): `ThreadMark` (`made`: link, `found`: repeat) tells the owner's from the Chronicle's wherever one is listed or opened; an ink icon with a spoken name, never a colour alone. The Chronicle's rail and screen use it too (components may use both modules).
- **The picker is `filterPicker`** (core): not the moment itself, nothing waiting in Undo, words or place or date, a page at a time (audit 3, 4).
- **A kept Chronicle thread has no name** (audit 13): its own name is only the name field's placeholder.
- **Three records, one writer.** `db.applyThreads(change)` is the only write; it dissolves a thread left with fewer than two members in the same transaction, in every store (the fake, IndexedDB, SQLite; `dbContract.ts` holds them to it). `deleteCaptures` and `deleteWalk` cascade by hand (no foreign keys). A new write path that skips `thinThreads` can leave a thread of one.
- **Undo is memory.** `deleteThread` schedules `{ ids: [threadId], run }` in the app's `deletions` window; a screen shows `visibleThreads(data, useHidden())`, so a thread under two visible moments, or a hidden one, is gone at once and Undo costs nothing.
- **A reply is written after its moment.** `useCaptures` takes `replyTo` and calls `threads.reply` once `db.addCapture` resolved; both must be kept. A reply from a viewer outside a walk is a loose moment placed by one fix; a reply made from a viewer opened during a walk (`walkId`) belongs to that walk.
- **The viewer never says a name** except for the thread it was opened from (`thread`); the resurfaced card, Lately, notifications and shares never carry a thread's name or a title made from it. `ThreadChip` is the one place the viewer speaks of a thread.
- **No digit but a date** leaves `threads/lines.ts`; a test checks the size words are the four-phrase set.
- **Independence** is by import: `lib/threads` imports nothing from `lib/resurface` and `lib/resurface` nothing from `lib/threads` (`threads/arch.test.ts`). Components may use both; Keep as my thread copies, one way.
- **"in a thread" opens a thread** through `threads.requestOpen` / `takeOpen` and the store, then `router.navigate('/')` (Chronicle, since 0106); `MemoriesScreen` takes the request on focus and on any later change.
- **E2E:** `E2E_ONLY=threads` (seeds IndexedDB, checks the stores directly).
