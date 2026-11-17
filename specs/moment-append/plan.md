# Plan: moment append (MA1-MA13)

For the owner's review before any code. Decision 0196; spec `specs/moment-append/spec.md`; the mock-up is
`specs/moment-append/mockup.html` (open it in a browser). It builds on moment stacks (0123), whose storage already
holds a moment's pieces: **this slice needs no migration, no new `Db` method and no new table.**

## What the walker sees

- Open any moment's viewer. The dock under it shows **Add**, **Respond** and (for a photo, video or note) **Edit**.
- **Add** opens a pull-down menu titled "Add to this moment": Photo or video, Voice memo, Note. What you keep joins that
  moment, and the viewer pages to the new piece and says "Added to this moment".
- **Respond** opens its own menu, now titled "A new moment, linked to this one", the graph half (0104).
- The top-row Add that showed only for two minutes after a capture is gone; the walk screen's pill is unchanged.
- Nothing says how many pieces a moment holds; a stacked moment keeps its small two-card mark.

## Files

| Where | What |
|---|---|
| `src/components/threads/ReplyDock.tsx` | An **Add** tool (glyph `layers`-style, the moment mark's) and its menu, titled; `cap.takePhoto(into)`, `cap.startVoice(into)` and a note page with `into` already take the moment's id (`useCaptures`, MS2/MS3), so the dock calls them with `answeredId`. Respond's menu gains its title. A recording for an add says "Recording a memo for this moment". |
| `src/components/CaptureView.tsx` | Delete the top-row `viewer-add` block and `openForAdd` (MA6); the `ReplyDock` shows at every time (its condition loses `openForAdd !== current.id`); `kept` says "Added to this moment" and pages to the new piece (`facedAt`). |
| `src/components/notePage/NewNotePage.tsx` | `into` is already a prop; the dock passes the moment's id for an add and null for a reply. |
| `src/lib/useCaptures.ts` | The dock's second `useCaptures` instance carries an `into` per call, no change expected; a test pins it (MA3). |
| `src/lib/momentPill.ts` | `ask(kind)` and the walk screen's relay from the viewer are no longer used by the viewer; the pill's own taps are untouched. Remove only what is dead. |
| `src/lib/moment.ts` | None expected: `faced`, `hasMore` and `sizeWord` already serve MA8. |
| `scripts/vision.allow.json` | None expected; the add to MS9's reason is read first. |

## Data

New truth: none. A piece is a `capture` row with `moment_id` = the moment's id, as `addPiece` writes today. The moment's row
is never edited. No SQLite migration, no IndexedDB version.

## Tests (todos first, one commit)

| Id | Test | Where |
|---|---|---|
| MA1 | journey: open a moment made 5 minutes earlier, tap Add then Note, write, and the moment holds two pieces; the dock's Add is found by its label and glyph from the screenshot, no test id | `scripts/e2e/journeys/stacks.js` |
| MA2 | `MA2: Add offers Photo or video, Voice memo, Note, in Respond's order and words` (a source check of the two menus' items from one list) | `moments/append.test.ts` |
| MA3 | `MA3: a piece added to a closed moment keeps its own time and the moment's place, time, threads, links, reminder and find` (contract over the fake, IndexedDB, SQLite via `dbContract.ts`); `MA3: an add asks for no fix` (`stampFor` with `into`) | `dbContract.ts`, `captures/pieceStamp.test.ts` |
| MA4 | journey: after Add, the viewer pill says "Added to this moment" and the new piece shows, no digit | `stacks.js` |
| MA5 | journey: both menus' titles show; a source check that neither title depends on the moment's size | `stacks.js`, `moments/append.test.ts` |
| MA6 | `MA6: the viewer has one Add` (no `viewer-add` in the source; `openForAdd` is gone); journey: with the pill open and closed the dock's Add is there | `moments/append.test.ts`, `stacks.js` |
| MA7 | `MA7: every host of CaptureViewer is drawn through the one dock` (lists `<CaptureViewer` hosts from the source, asserts `ReplyDock` is rendered in `CaptureView` only and not hidden by `openForAdd`) | `moments/append.test.ts` |
| MA8 | journey: a moment with an added piece is one row with the mark, no digit, "+N" or "of" in text or labels; `MA8: face and size words unchanged` over `moment.ts` | `stacks.js`, `moments/moment.test.ts` |
| MA9 | `MA9: an add to a finished walk's moment and to a loose moment stores media under that moment's folder` (shell over `fakePorts()`) | `captures/append.test.ts` |
| MA10 | `MA10: the Db interface has no merge and the viewer's menus list none` | `moments/oneMoment.test.ts` |
| MA11 | journey: an added piece survives a reload | `stacks.js` |
| MA12 | journey at 320 px: the dock's three tools do not wrap; `MA12: the menu's timing comes from motionTokens` | `stacks.js`, `walk-screen/addPill.test.ts` |
| MA13 | `MA13: an added piece is deleted by the piece's delete with Undo and the moment stays` (shell, as MS13's) | `deletion/deletion.test.ts` |

No new feature folder: the tests join `moments`, `captures`, `walk-screen` and `deletion`, and the slice joins the
`stacks` journey (`scripts/features.js` already lists it). The spec is listed in the same feature's `specs`.

## Cost

Reads: the dock reads nothing new; a moment's pieces load as the viewer loads them today. Writes: one `addPiece` per add (one
`capture` row and its media), no location read. n: a moment with tens of pieces at most; the viewer already pages them. Per
frame, per fix, on focus: nothing. No harness; "device only" for the camera and mic (below).

## Goal-to-control, per action (`docs/research/ui-references.md`, matrix 2)

| Goal | How often, where | Control | Matrix | Adjacent apps |
|---|---|---|---|---|
| Add more to a moment I made earlier | Occasional, standing or sitting, in Chronicle or on a walk | **Add** in the viewer's dock, labelled, a pull-down menu of kinds | Matrix 11 (an action on an item that exists: its toolbar, decision 0114); a choice of three kinds is a pull-down (ui-patterns) | Day One edits the entry; Apple Journal edits the entry |
| Say something that follows it, at another place | Occasional | **Respond**, unchanged, menu titled | as above | Apple Messages' Reply; Day One links |
| Find them | On every viewer | Dock, bottom, labelled, ink | T5 (labels in a bar), found before quiet (0167) | as above |

**Where the owner will look first:** the bottom of the moment's viewer, beside Respond, where Edit and Respond already are. It
is drawn in ink with a word. **Defaults that make a control quieter:** none; Add is as loud as Respond. **Departure from precedent:**
none; every adjacent app edits an entry in place. The single departure, Add's piece not keeping its own place, is the
open question below (a Never-adjacent rule: one fix per moment, 0036).

## Open for the owner

1. The added piece's own place: dropped (this plan, 0123's rule), kept on the piece (a migration, breaks one fix per moment) or
   warned when far from the moment (needs a location read at add time). Recommended: dropped; Respond keeps a corner.
2. Add replaces the top-row Add (MA6), and the viewer no longer sends you back to the walk screen to add.
3. Two labelled tools plus Edit in the dock: at 320 px they fit; at 200% text labels may wrap (WCAG 1.4.4).

## Deferred

Moving a piece from one moment to another, and merging existing moments (never, 0123). Showing a piece's own place. A
stack as a display rule over separate moments (the owner chose explicit Add instead of a delta, Nov 17).

## Native that will not run on a device

The camera, the mic and the note page launched from the dock's Add on iOS and Android (they are the Respond dock's
paths with an `into`); each is an item in `docs/NATIVE_UNVERIFIED.md`. Web has run neither.

## The steward

Run on this spec and plan before the owner reads it; findings below are triaged here.

(pending)
