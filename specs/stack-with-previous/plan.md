# Plan: stack with previous (SW1-SW18)

For the owner's review before any code. Decision 0196; spec `specs/stack-with-previous/spec.md`; mock-up
`specs/stack-with-previous/mockup.html` (open it in a browser). It replaces this slice's first draft (an Add tool in
the viewer's dock), which the owner simplified on Nov 17. Builds on moment stacks (0123) and the journal (0155).

## What the walker sees

- Under every entry on Chronicle's page, a row of four ink icons, no captions: **Respond** (a reply arrow), **Add to a thread**
  (a link), **Edit** (a pencil), **Stack with previous** (an up arrow, the earlier entry being above). Each slot is fixed; one
  that does not apply is empty.
- Respond opens the kinds pull-down (titled "A new moment, linked to this one"); Add to a thread opens its sheet; Edit opens the
  piece's editor; Stack with previous joins the entry just kept into the one before it (same day, same walk, within 100 m) and a
  pill says "Stacked with the earlier moment · Undo".
- A moment with more than one piece shows its first piece, the two-card mark, a line naming its kinds in words, and **Show all**.
  Tapping opens a grid of every piece, each tile with its own time; **Show less** closes it. A tile opens the viewer on that piece.
- A piece made later says "Added later, 4:12 pm". Nothing says how many pieces a moment holds.

## Files

| Where | What |
|---|---|
| `src/components/journal/QuickActions.tsx` (new) | The row: four fixed slots of `Icon` buttons, 44 pt, ink, each with a spoken name and (web) a `title`; `arrow-undo-outline`, `link-outline`, `create-outline`, `arrow-up-circle-outline`. Respond opens `ReplyDock`'s kinds menu logic (the menu items and `useCaptures` `replyTo` are lifted into a small hook, `useRespond(answeredId)`, shared with the dock); Add to a thread opens the existing `AddToThread`; Edit calls the editor the viewer's Edit uses. No logic of its own: it receives `available` from core. |
| `src/lib/journal/actions.ts` (new, core) | `quickActions(entry, ctx)`: which of the four slots apply (Edit not on a stack; Stack only when `joinable` and `previousFor` say so). Pure, tested first (SW1, SW4, SW5). |
| `src/components/threads/ReplyDock.tsx` | Its menu and `useCaptures` wiring move to `useRespond`; the dock keeps its look. |
| `src/lib/join.ts` (new, core) | `previousFor(moments, entry)`: the latest moment before the entry on the same local day, on the same walk or both loose, within 100 m (SW6); `joinable(entry, refs)`: not offered when any record keyed by its id (threads, memberships, replies, links, reminder, find, reaction, Hidden, resurfaced pick, an @-mention in a note) would differ, or when it is not the last kept or is being written (SW8). `refs` is read from one `db.referencesTo(id)` that lists every table holding a moment id, with a contract test that fails when a new table is added unlisted. |
| `src/lib/join/shell.ts` + `index.ts` (new) | As `lib/split`: through the one Undo window (kind `join`); at once the entry's pieces show in the previous moment (`store`, read by the journal page and the viewer), `db.joinMoment` runs once the window has passed (SW9). |
| `src/lib/db/types.ts`, `index.web.ts`, `sqliteStore.ts`, `__tests__/fakes/memoryDb.ts`, `dbContract.ts` | Two new `Db` methods: `referencesTo(id)` (read) and `joinMoment(fromId, intoId)`: repoints the entry's captures' `moment_id`, deletes the emptied moment row; the previous moment's row is never edited (0104). A contract case first, over the fake, IndexedDB and SQLite. **No migration and no schema change.** |
| `src/lib/deletion/{core,pending,runner,saved}.ts` | A `join` job kind with its saved spec (`{ type: 'join', fromId, intoId }`) so a killed app finishes it (0113); its words ("Stacked with the earlier moment", Close: "It stays stacked"). |
| `src/lib/moment.ts` | `pieceWhen(moment, piece)` (pure): the words for a piece made later, or null (SW10); `kindsLine(moment)` (pure): "a photo, a note and a voice note" (SW11); `hasMore` and `sizeWord` unchanged. |
| `src/lib/journal/page.ts` | The page reads the join store: the joined entry's pieces show under the previous moment and the emptied entry is gone at once; the entry kept in this sitting is known for SW5/SW8. |
| `src/components/journal/Entry.tsx` | Renders `QuickActions` under its pieces; a stack's collapsed face (mark, kinds line, **Show all**) and the expanded `StackGrid`. |
| `src/components/journal/StackGrid.tsx` (new) | Three-column square grid of tiles (photo and video through `MomentPicture` with the video mark, a note's first words in `OWNER_FONT`, a memo's mic mark); each tile has its time in words and opens the viewer on its piece (`facedAt`); no digits in any label (SW13). |
| `src/components/CaptureView.tsx` | A piece made later shows its time in words under its caption and no place (SW10). |
| `.claude/rules/journal.md` | The narrow exception to "the past is fixed" (SW7, SW8) and the quick-action row. |
| `docs/NATIVE_UNVERIFIED.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` | The SQLite join and the row and grid on a phone; the feature; the codemap. |

## Data

New truth: none. A join repoints `capture.moment_id` of the entry's pieces and deletes the entry's `moment` row; each piece
keeps its own `t`, media and body. The previous moment's row is never edited. **No SQLite migration and no IndexedDB version bump.**
The entry's id is gone after the window (nothing pointed at it, SW4).

## Tests (todos first, one commit)

| Id | Test | Where |
|---|---|---|
| SW1 | `SW1: the row has four fixed slots in order Respond, Thread, Edit, Stack, each named, none with a caption, an unavailable one empty and no other moved` (core `quickActions`); journey: the row is on every entry, each icon's spoken name read, the screenshot reviewed cold | `journal/actions.test.ts`, `scripts/e2e/journeys/stacks.js` (+ `chronicle`) |
| SW2 | journey: Respond on an entry opens the kinds menu with its title; a note kept is a new entry at the end of the page, linked | `stacks.js` |
| SW3 | journey: the link icon opens Add to a thread; kept, it says "Added to a thread" | `stacks.js` |
| SW4 | `SW4: Edit is available on a one-piece entry and empty on a stack` (core); journey: Edit opens the note's page | `journal/actions.test.ts`, `stacks.js` |
| SW5 | journey: keep a note; the entry's Stack slot shows; after another capture it is empty on that entry | `stacks.js` |
| SW6 | `SW6: previous is the latest moment before it on the same local day, same walk or both loose, within 100 m; none, an earlier day, another walk or farther empties the slot` (core, a DST day) | `moments/join.test.ts` |
| SW7 | `SW7: joinMoment repoints the pieces, keeps each piece's own time, deletes the emptied moment and edits nothing of the previous` (contract over three stores); `SW7: no fix is read` | `dbContract.ts`, `captures/pieceStamp.test.ts` |
| SW8 | `SW8: a thread, a link, a reminder, a find, a reaction, a Hidden mark, a resurfaced pick, an @-mention, or an entry being written, is not joinable`; `SW8: the slot empties at the next capture`; `SW8: every table holding a moment id is listed` (core + contract) | `moments/join.test.ts`, `dbContract.ts` |
| SW9 | `SW9: the join shows at once, Undo restores the entry with its id, time and place, the store runs after the window, a killed app finishes it and the page then shows one moment, never both entries` (shell over `fakePorts()`) | `moments/joinShell.test.ts`, `deletion/deletion.test.ts` |
| SW10 | `SW10: a later piece's words say when and name no place; within the same minute, nothing` (core `pieceWhen`); journey: the grid and viewer show it | `moments/moment.test.ts`, `stacks.js` |
| SW11 | `SW11: the collapsed face names its kinds in words, never a number` (core `kindsLine`); journey: a two-piece moment shows its first piece, the mark, the kinds line and Show all; a one-piece moment is as before | `moments/moment.test.ts`, `stacks.js` |
| SW12 | journey: Show all opens a grid in capture order, each tile with its own time in words; a tile opens the viewer on its piece; Show less collapses | `stacks.js` |
| SW13 | journey: no count digit, "of" or "+N" in any text or label of the stack, grid, tiles or row (clock times and dates exempt) | `stacks.js` |
| SW14 | journey: with the row showing, a new capture is one tap and the row does not block it | `stacks.js` |
| SW15 | `SW15: the only join is joinMoment and the page's, the row's and the viewer's menus list no other merge` | `moments/oneMoment.test.ts` |
| SW16 | `SW16: the joined moment is one entry on every surface's reader and the emptied entry on none` (the list in MS7); `SW16: Entry is the row's only host` (source) | `moments/oneMoment.test.ts` |
| SW17 | journey: a stack survives a reload | `stacks.js` |
| SW18 | journey at 320 px: the row's four slots fit, nothing wraps, a tile is at least 88 px; `SW18: timing from motionTokens` | `stacks.js`, `walk-screen/addPill.test.ts` |

No new feature folder: tests join `moments`, `captures`, `journal` and `deletion`, and the slice joins the `stacks` and `chronicle`
journeys (both already listed in `scripts/features.js`).

## Cost

Reads: the page already reads its moments; `previousFor` scans the day's few. The grid mounts tiles only when expanded,
and thumbnails already exist (`video-thumbnails`). Writes: one `joinMoment` per tap, a few rows. n: a stack of tens at most;
three columns, no virtualization needed. Per frame, per fix, on focus: nothing. No harness; device only for the SQLite path.

## Goal-to-control (`docs/research/ui-references.md`, matrix 2)

| Goal | How often, where | Control | Matrix | Adjacent apps |
|---|---|---|---|---|
| Answer an entry with a new moment | Occasional, reading Chronicle | **Respond**, a reply icon in the entry's row | an action on an item that exists belongs on it (0114); symbols with spoken names (T5) | Messages' Reply (verified); Instagram's row (unverified) |
| Connect an entry to a thread | Occasional | **Add to a thread**, a link icon | as above | Day One links (verified) |
| Change what I wrote or shot | Occasional | **Edit**, a pencil | as above | Day One, Apple Journal (unverified) |
| Put what I just kept with the moment before | Occasional, right after a capture | **Stack with previous**, an up arrow, with Undo | Undo not confirm (F3, A3) | none joins after the fact (Photos stacks automatically); the reverse of our Split out |
| See everything in a stack | Often | **Show all** / **Show less**, a labelled disclosure | disclosure under its row | Photos' grid on tap (unverified) |

**Where the owner will look first:** under the entry, in a row. **Defaults that make a control quieter:** none, the icons are ink
at 44 pt. **Departures from precedent:** T5 and decision 0167 prefer a word or a known symbol and a labelled bar; the owner chose
icons only, with spoken names, so the cold find stands as the check and a caption is the fallback for any glyph it cannot place. No
adjacent app joins by a button after the fact; that is the owner's call. The collapsed default, Edit absent on a stack and the
Chronicle-only grid are defaults to overrule.

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
