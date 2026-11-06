# Plan: owner threads

Spec: `specs/owner-threads/spec.md` (OT1-OT22). Decision: `docs/decisions/0102-threads-the-owner-makes.md`.

Read this, then say go (or what to change). No code has been written.

## Shape

A new feature, `threads`, beside `resurface`. Pure modules decide; one shell writes; the viewer and Memories read.

```
db: thread, thread_member, moment_link           truth, three new tables/stores
        │
createThreads(ports)   shell: add, remove, name, delete (with Undo), respond
        │
threads/core           pure: dissolve rule, membership, order, the timeline, lines
        │
useThreads()           view hook ──► viewer "Add to a thread / Respond",
                                     ThreadTimeline, Memories "Your threads"
```

Reply path: `useCaptures.add()` is the one place every moment is saved (`src/lib/useCaptures.ts:143`). Respond passes it `replyTo` (the answered moment's id and thread); after `db.addCapture(c)` it calls the shell's `connect`. A moment is never edited.

## Files

New, pure (`// @layer core`) in `src/lib/threads/`:

| File | Holds |
|---|---|
| `types.ts` | `Thread`, `Member`, `Link` |
| `rules.ts` | `afterRemove` (dissolve below two), `joinFor` (which thread a reply joins), `canMakeThread` (two kept moments), no empty thread (OT6) |
| `timeline.ts` | `buildTimeline(thread, moments, links)`: oldest first, a reply under what it answers (OT9) |
| `lines.ts` | the words: size and span (OT10), "answering …" (OT4), "in a thread: …" (OT11), an unnamed thread's title (OT13); numbers as words, reusing `resurface/lines.ts`'s number words |

New shell (`// @layer shell`): `src/lib/threads/shell.ts` (`createThreads(ports)`: `connect`, `addToThread`, `makeThread`, `remove`, `rename`, `deleteThread`, `read`, with Undo as `deletion/pending.ts` does) and `index.ts` (the app instance). `useThreads.ts` is the view hook.

Changed: `src/lib/db/types.ts`, `index.native.ts`, `index.web.ts`, `stores.ts` (the three tables, plus cascades in `deleteCaptures` and `deleteWalk`, same transaction, OT16, OT17); `src/lib/useCaptures.ts` (`replyTo`); `src/components/CaptureView.tsx` (More: Respond, Add to a thread; "in a thread"); `src/components/MemoryPreview.tsx` (Respond from a faint pin, OT3); `src/components/chronicle/MemoriesScreen.tsx` (a "Your threads" block, OT12); `src/components/chronicle/ThreadScreen.tsx` stays the 0098 thread (its **Keep as my thread** is the one new control, OT19). New components: `ThreadTimeline.tsx`, `ThreadPicker.tsx`, `MomentPicker.tsx` in `src/components/chronicle/`.

## Data

All three are **truth**, not cache (OT18). No tile build tag.

- **SQLite migration 21** (`MIGRATIONS` holds 20 entries today; `docs/ARCHITECTURE.md`'s data model is out of date and `/docs-gc` fixes it): `thread(id PK, name, created_at)`, `thread_member(thread_id, moment_id, added_at, PK(thread_id, moment_id))` with an index on `moment_id`, `moment_link(from_id, to_id, created_at, PK(from_id, to_id))` with an index on `to_id`. No foreign keys are enforced by the engine (the repo cascades in code, in the delete transaction).
- **IndexedDB `VERSION` 17** (it is 16): three stores, `oldVersion < 17`, indexes `moment_id`, `to_id`. Web deletes run through `atomically` as the others do.
- Meta: none.

## Tests per criterion

New feature `threads` in `scripts/features.js` (rule `threads`, source `src/lib/threads/**` and the components above, journey `threads`, spec `owner-threads`); tests in `src/lib/__tests__/threads/`.

| Criteria | Where | Test name starts |
|---|---|---|
| OT1, OT2, OT3 | `shell.test.ts` over `fakePorts()` (a reply writes the link and the membership; unnamed thread of two; joins the origin thread); `useCaptures` guard in `captures/` | `OT1:` … |
| OT4, OT9, OT10, OT11, OT13 | `lines.test.ts`, `timeline.test.ts` (no digit leaves `lines`; context on every row; a reply sits under its parent) | `OT9:` … |
| OT5, OT6, OT7, OT8 | `rules.test.ts` and `shell.test.ts` (two kept moments, no empty thread, idempotent add, remove) | `OT6:` … |
| OT12, OT19 | `shell.test.ts` (the two kinds never read each other; Keep as my thread copies) + journey | `OT19:` … |
| OT14, OT15, OT16, OT17 | `deletion/` and `storage/` (the cascades in the one transaction; dissolve below two; Undo restores the name and members) | `OT15:` … |
| OT18, OT21 | `storage/` over `dbContract.ts` (both stores, the migration, a moment row unchanged; a `THREAD_RULES` bump leaves threads) | `OT18:` … |
| OT20 | `arch/` (the vision check: no new host, no data-sending dependency) | `OT20:` … |
| OT22 | the existing viewer and deletion tests, unchanged and green | none new |
| Screens: OT1, OT3, OT5, OT9, OT11, OT12, OT13, OT14, OT19 | a new journey `scripts/e2e/journeys/threads.js` | `check.todo(…, 'OT9: …')` |

## Deferred, and why

- Moment picker search over memo transcripts (needs the transcriber, already deferred in 0098).
- Drawing a thread on the map and replaying a thread as a ceremony (DEFERRED already, 0086).
- Reordering or hand-ordering a thread (time is the order; nothing in the owner's request needs more).
- A place-rooted journal (decision 0102).
- Android's Back on a thread screen (same as 0098, audit 14).

## Native paths that will not run on a device

The SQLite migration and cascades; the viewer's More menu items over the Modal; Respond opening the camera, mic and note flows from the viewer on a phone; the Undo pill over the viewer's Modal. Each goes into `docs/NATIVE_UNVERIFIED.md` as a Do/Expect item with its OT ids. Native has never run on a device.

## For you to decide

1. **The word "thread".** Memories already has a rail of Chronicle threads ("the things you keep coming back to"). Two things called threads, one computed and one yours, will confuse. My recommendation: yours keep **Thread** (the owner's word), and the Chronicle's rail becomes **Keeps coming up**. That changes 0098's copy and RM texts; say if you want it, or give another pair of names.
2. **Where Add to a thread / Respond live.** The viewer's More menu (my plan) is one tap deeper than the capture row. That is fine for the optional path; capture itself stays one tap (OT1).
3. **Respond away from the place.** If you answer a moment at home, the reply is placed where you are and at the time you write it (one fix per moment, 0036). The link, not the place, ties it to the original. Is that what you want?
