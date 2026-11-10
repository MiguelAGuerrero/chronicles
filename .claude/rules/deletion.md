---
paths:
  - "src/lib/deletion/**"
  - "src/components/{WalkActions,UndoToast}.tsx"
  - "src/lib/__tests__/deletion/**"
---
# Clearing walks and moments

Deleting a walk, its media, or a moment (`lib/deletion`): what goes, Undo, and what every list must filter. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

- **Three deletes, to free storage** (the owner's calls, Nov 1): a whole walk,
  a walk's photos, videos and memos (the walk stays), or one moment. A walk's
  actions are its More (⋯) button on its home-sheet row (walks list and a
  day's timeline) and on its replay card (`WalkActions`). A moment's is Delete
  in the capture viewer's More (⋯) menu, wherever the viewer opens. No
  Storage screen.
- **As if it never happened:** a deleted walk takes its trace, pauses,
  captures and files, summary, visited and area rows (areas no walk uses go),
  finds, reminders, marks and `explored:<walk>`; later walks' new streets are
  recounted (`recountNewStreets`). A deleted moment takes its reminder and its
  find. Removing a walk's media keeps its finds (`keepFinds`). Offered places,
  checklists and busy areas never move.
- **Threads follow the moments** (decision 0104): `deleteMoments` and `deleteWalk` also delete the memberships and reply links of the moments they delete and dissolve a thread left with fewer than two, in the same transaction. Deleting a thread (`threads.deleteThread`) uses this same Undo window and deletes no moment.
- **Storage:** `db.deleteWalk` and `db.deleteMoments` (a moment with every piece; decision 0123), one transaction each
  (web: any error aborts it, `atomically`). Rows go first, then files
  (`removeMedia`: each ref, plus a whole walk's `walks/<id>/` folder; never
  `walks/moments/`). A file that fails to delete is left behind, never a row
  without its file. `filesOf` skips `THUMB.none` and `data:` refs.
- **Undo is memory, not storage** (`deletion/pending.ts`, pure; `deletion/index.ts`
  wires it). A delete hides its ids at once and runs after 5 s, or at once when
  the app goes to the background or another delete is confirmed. A killed app
  drops a waiting delete. Ids stay hidden after they went, so a screen's stale
  list never shows them. A failure unhides them and says "Couldn't delete."
  - Every screen that lists walks or captures filters by `useHidden` /
    `useVisible`: the home (walks, rows, summaries, capture rows), the walk
    screen (its captures, which also feed Explore, and memory pins), the
    replay (captures and the card's counts via `summaryLess`), the day screen
    (pins) and the viewer itself.
  - `UndoToast` renders in each screen and in the viewer; only the newest
    mounted one shows (a phone's Modal hides what the screen draws).
  - The home reads again when a delete reached storage (`useOnDeleted`).
- **After the audit (Nov 1):** 13 findings, 8 fixed.
  - The recount counts named streets only (`isNamedStreet`, shared with
    `finish.ts`).
  - `saveSnap` writes nothing for a deleted walk, and takes its counts from
    the capture rows inside its transaction (`countsOf`), as `deleteMoments`
    does. A delete overlapping a snap can't leave a count off.
  - A loose moment deleted before its fix finds nothing (`findForMoment`).
  - Explore re-reads finds after a delete.
  - Memory cards and "What happened here" skip what waits in Undo.
  - The viewer's Save and Delete share one More (⋯) menu, so its row fits
    320 px.
  - The pill names the kind ("Photo deleted"), shows an earlier delete's
    failure beside a newer Undo, and is announced on iOS. On the walk screen
    it sits at the top, clear of the voice memo's Undo.
  - Walk actions close on Escape on the web (react-native-web's Modal doesn't
    send it). Cancel shows in every state, and More is disabled while old
    walks are being placed.
  - Regression tests: `deletion.test.ts` (audit 1, 3, 10). The snap guard,
    moment finds, Explore and memory filtering are covered only by the e2e's
    flow and typecheck.
- **Deferred:**
  - A phone's leftover files after a failed delete (no sweep yet).
  - A thumbnail finishing after its moment went leaves its file.
  - A reminder check already running can write a recall back for a capture
    deleted mid-check, and a moment waiting in Undo can still fire.
  - A day replay's "Watch again" still stops at a moment deleted during it.
  - The replay card and the home's finds and checklist counts lag a delete
    until read again.
  - Native legacy `file://` refs from an old container leak on moment and
    media deletes (a walk delete removes its folder).
  - The home's reload after a delete reruns its whole load.
  - On the web, a hidden page counts as the background, so switching tabs
    stores a waiting delete at once.
  - A notification already shown for a deleted moment opens nothing.
- **Native** (unverified on a device): the SQLite deletes, file and folder
  removal, `Directory.size`, the Undo pill over the viewer's Modal, the
  background commit, and `router.dismissTo` right after the actions Modal
  closes (iOS can drop a navigation during a Modal's dismissal).
