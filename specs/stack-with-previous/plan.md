# Plan: stack with previous (SW1-SW14)

For the owner's review before any code. Decision 0196; spec `specs/stack-with-previous/spec.md`; mock-up
`specs/stack-with-previous/mockup.html` (open it in a browser). It replaces this slice's first draft (an Add tool in
the viewer's dock), which the owner simplified on Nov 17. Builds on moment stacks (0123) and the journal (0155).

## What the walker sees

- On Chronicle's page, right after you keep a capture (a line, a photo, a memo), the new entry has a small labelled button,
  **Stack with previous**, under its pieces. One tap: its pieces join the moment before it (same day), and a pill says
  "Stacked with the earlier moment · Undo".
- A moment with more than one piece shows its first piece, the two-card mark and **Show all**.
  Tapping it opens a grid of every piece (three to a row; photos, video stills, notes' first words, voice notes);
  **Show less** closes it. A tile opens the viewer on that piece.
- A piece made later than its moment says "Added later, 4:12 pm" and names no place.
- Nothing says how many pieces a moment holds.

## Files

| Where | What |
|---|---|
| `src/lib/join.ts` (new, core) | `previousFor(moments, entry)`: the latest moment before the entry on the same local day, on the same walk or both loose, within 100 m (SW2); `joinable(entry, refs)`: not offered when any record keyed by its id (threads, memberships, replies, links, reminder, find, reaction, Hidden, resurfaced pick, an @-mention in a note) would differ, or when it is not the last kept or is being written (SW4). `refs` is read from one `db.referencesTo(id)` that lists every table holding a moment id, with a contract test that fails when a new table is added unlisted. Pure, tested first. |
| `src/lib/join/shell.ts` + `index.ts` (new) | As `lib/split`: through the one Undo window (kind `join`); at once the entry's pieces show in the previous moment (`store`, read by the journal page and the viewer), `db.joinMoment` runs once the window has passed, so Undo never leaves a half-joined moment (SW5). |
| `src/lib/db/types.ts`, `index.web.ts`, `sqliteStore.ts`, `__tests__/fakes/memoryDb.ts`, `dbContract.ts` | One new `Db` method, `joinMoment(fromId, intoId)`: repoints the entry's captures' `moment_id`, deletes the emptied moment row; the previous moment's row is never edited (0104). A contract case first, over the fake, IndexedDB and SQLite. **No migration and no schema change**: `capture.moment_id` is updated, a `moment` row deleted. |
| `src/lib/deletion/{core,pending,runner,saved}.ts` | A `join` job kind with its saved spec (`{ type: 'join', fromId, intoId }`) so a killed app finishes it (0113); its words ("Stacked with the earlier moment", Close: "It stays stacked"). |
| `src/lib/moment.ts` | `pieceWhen(moment, piece)` (pure): the words for a piece made later, or null (SW6); `hasMore` and `sizeWord` unchanged. |
| `src/lib/journal/page.ts` | The page reads the join store: the joined entry's pieces show under the previous moment and the emptied entry is gone at once; `openForJoin` for the entry kept in this sitting (the last of `session` and offered). |
| `src/components/journal/Entry.tsx` | The **Stack with previous** button on the offered entry (ink text button, a 44 pt target); a stack's collapsed face and the **Show all** control; the expanded `StackGrid`. |
| `src/components/journal/StackGrid.tsx` (new) | Three-column square grid of `Tile`s (photo and video through `MomentPicture` with the video mark, a note's first words in `OWNER_FONT`, a memo's mic mark); each tile a button that opens the viewer on its piece (`facedAt`); a later piece's "Added later" line (SW6); no digits in any label (SW9). |
| `src/components/CaptureView.tsx` | A piece made later shows its time in words under its caption and no place (SW6). |
| `.claude/rules/journal.md` | The narrow exception to "the past is fixed" (SW3/SW4). |
| `docs/NATIVE_UNVERIFIED.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` | The SQLite `joinMoment` and the grid on a phone; the feature; the codemap. |

## Data

New truth: none. A join repoints `capture.moment_id` of the entry's pieces and deletes the entry's `moment` row; each piece
keeps its own `t`, media and body. The previous moment's row is never edited. **No SQLite migration and no IndexedDB version bump.**
The entry's id is gone after the window (nothing pointed at it, SW4).

## Tests (todos first, one commit)

| Id | Test | Where |
|---|---|---|
| SW1 | journey: keep a note on the page; the entry shows a button named "Stack with previous" found by its label in the screenshot; one tap stacks | `scripts/e2e/journeys/stacks.js` (+ `chronicle` for the page) |
| SW2 | `SW2: previous is the latest moment before it on the same local day, same walk or both loose, within 100 m; none, an earlier day, another walk or farther offers nothing` (core, a DST day) | `moments/join.test.ts` |
| SW3 | `SW3: joinMoment repoints the pieces, keeps each piece's own time, deletes the emptied moment and edits nothing of the previous` (contract over three stores); `SW3: no fix is read` (`stampFor` unaffected) | `dbContract.ts`, `captures/pieceStamp.test.ts` |
| SW4 | `SW4: a thread, a link, a reminder, a find, a reaction, a Hidden mark, a resurfaced pick, an @-mention, or an entry being written, is not joinable`; `SW4: the button leaves at the next capture`; `SW4: every table holding a moment id is listed` (core + contract) | `moments/join.test.ts` |
| SW5 | `SW5: the join shows at once, Undo restores the entry with its id, time and place, the store runs after the window, a killed app finishes it and the page then shows one moment, never both entries` (shell over `fakePorts()`) | `moments/joinShell.test.ts`, `deletion/deletion.test.ts` |
| SW6 | `SW6: a later piece's words say when and name no place; within the same minute, nothing` (core `pieceWhen`); journey: the grid and viewer show it | `moments/moment.test.ts`, `stacks.js` |
| SW7 | journey: a two-piece moment shows its first piece and the mark and the control, collapsed; a one-piece moment is as before | `stacks.js` |
| SW8 | journey: the control opens a grid in capture order, each tile with its own time in words; a tile opens the viewer on its piece; Show less collapses |
| SW7 | (also) `SW7: the collapsed face names its kinds in words, never a number` (core, over `sizeWord`/`quietLines`) | `stacks.js` |
| SW9 | journey: no count digit, "of" or "+N" in any text or label of the stack, grid or tiles (clock times and dates exempt), read from the page and the labels | `stacks.js` |
| SW10 | journey: with the button showing, a new capture is one tap and the button does not block it | `stacks.js` |
| SW11 | `SW11: the only join is joinMoment and the viewer's and page's menus list no other merge` | `moments/oneMoment.test.ts` |
| SW12 | `SW12: the joined moment is one entry on every surface's reader and the emptied entry on none` (the list in MS7) | `moments/oneMoment.test.ts` |
| SW13 | journey: a stack survives a reload | `stacks.js` |
| SW14 | journey at 320 px: nothing wraps, a tile is at least 88 px; `SW14: timing from motionTokens` | `stacks.js`, `walk-screen/addPill.test.ts` |

No new feature folder: tests join `moments`, `captures` and `deletion`, and the slice joins the `stacks` and `chronicle`
journeys (both already listed in `scripts/features.js`).

## Cost

Reads: the page already reads its moments; `previousFor` scans the day's few. The grid mounts tiles only when expanded,
and thumbnails already exist (`video-thumbnails`). Writes: one `joinMoment` per tap, a few rows. n: a stack of tens at most;
three columns, no virtualization needed. Per frame, per fix, on focus: nothing. No harness; device only for the SQLite path.

## Goal-to-control (`docs/research/ui-references.md`, matrix 2)

| Goal | How often, where | Control | Matrix | Adjacent apps |
|---|---|---|---|---|
| Put what I just kept with the moment before | Occasional, right after a capture, Chronicle | **Stack with previous**, a labelled text button on the entry, with Undo | an action on an item that exists belongs on it (0114); one action, labelled (T5); Undo not confirm (F3, A3) | none joins after the fact (Photos stacks automatically); the reverse of our Split out |
| See everything in a stack | Often, reading Chronicle | **Show all** / **Show less**, a disclosure control | disclosure under its row (HIG disclosure, M3 expandable) | Photos' grid on tap (unverified); Day One's entry grid (unverified) |

**Where the owner will look first:** on the entry they just made, under their words or photo; and on the stack's row, at its
foot. **Defaults that make a control quieter:** none; the button is ink and a word. **Departures from precedent:** the apps
in the spec stack automatically or lay media out inside one entry; none joins by a button after the fact. That is the owner's
call (the button is explicit, no delta). The collapsed default (a) and the Chronicle-only grid (b) are defaults to overrule.

## Deferred

The grid on Days, a walk's moments, Memories here, a thread; a stack in the replay's one beat (round 2 of 0123); stacking a
moment that has links or reactions (needs a carry-over rule); joining across days; Add to any moment from the viewer (the
first draft of this slice, set aside Nov 17).

## Native that will not run on a device

`joinMoment` on SQLite and the grid's tiles and touch targets on iOS and Android; each an item in
`docs/NATIVE_UNVERIFIED.md`. Web has run neither.

## The steward

Run on the spec and plan; the first-draft findings S1-S5 (the dock-based draft) were triaged earlier and their topics are carried here.

- **S1 (a joined piece loses its place and context): accepted, in the form that keeps a stack true.** The button is offered only for an entry within 100 m of the previous moment and on the same walk or both loose (SW2), so the stack's one place is true of every piece and no place is dropped. A piece's own fix is not kept (0036). This is the **owner's** call: the 100 m is the pill's number, reused; alternatives are a fix kept on each piece (a migration) or no distance rule.
- **S2 (nothing points at it is incomplete): accepted** (SW4): mentions, Hidden, resurfaced picks and the walk are in the rule, with one `referencesTo` and a contract test listing every table that holds a moment id.
- **S3 (the exception must be mechanical): accepted** (SW4, SW5): the button leaves at the next capture; a killed app completes the join and the page never shows both entries.
- **S4 (tiles and the collapsed default): accepted** (SW7, SW8): every tile carries its time in words; the collapsed face names its kinds in words. Collapsed by default stays the **owner's** call.
- **S5 (control quiet; a test that fails on its own copy): accepted** (SW9): clock times and dates are exempt from the no-digit check. The button stays quiet ink, no hint.
- **S6 (copy and precedent): accepted.** "Show all" / "Show less" replace the longer line; the adjacent-app lines stay marked unverified and Instagram's count is named a counter-example.
- **Silent, for the owner:** (1) may a joined piece keep its own fix (rejected here: it breaks one fix per moment and needs a migration); (2) the grid is on Chronicle's page, the viewer already pages pieces (MS10), the stack's face holds one control, not an action (0114); (3) collapsed by default for the owner's words; (4) the VISION.md edits are the owner's to make.
