# Thread a moment as it is kept: plan

From G11 (`/tend inbox G11 yes`, the owner, Nov 21). Mock-up approved: https://claude.ai/artifact/LopMYhJDtvUrVEGFrViKce.

## Files

- `src/lib/threads/picker.ts` (core): `lastAddedTo(members, threadIds)` (CT4), `threadMatches(row, query)` and
  `threadChoices(rows, { query, last, self })` (CT4, CT5); `filterPicker` unchanged.
- `src/lib/momentPill/row.ts` (core, new): `pillPerRow(room)`: 5 when the five buttons fit left of the stack, else 3 (CT1).
- `src/components/threads/AddToThread.tsx` (view): the pool from `poolWithOpenWalks` (CT6); "Last added to" first, the
  search over threads and moments (CT4, CT5); rows with `MomentPicture` (CT7); the name step after a new thread (CT8);
  its prop narrowed to `{ id }`, so the viewer and Memories pass what they pass today.
- `src/components/walk/AddToMomentPill.tsx` (view): Thread on the pill and on the grouping line (CT1, CT2); `onThread(id)`.
- `src/app/walk.tsx`, `src/components/MomentBar.tsx` (views): host the card in the app's `Modal`, transparent, and say
  "Added to a thread" in their toast (CT3, CT9).

No new truth, no cache, no migration, no IndexedDB version: "last added to" is read from `thread_member.added_at`;
naming is `threads.rename` (OT13).

## Tests per criterion

- Unit, `src/lib/__tests__/threads/captureThread.test.ts`: CT4 (`lastAddedTo`, `threadChoices` order and the moment's
  own thread disabled), CT5 (`threadMatches` by name, heading words, nothing found), CT6 (`poolWithOpenWalks` offers an
  open walk's moment to the picker), CT1 (`pillPerRow` at 390 and 320 px room).
- Journey, new `scripts/e2e/journeys/capthread.js` (`E2E_ONLY=capthread`): CT1-CT3, CT5, CT7-CT10 on the web build,
  with shots of each changed state; CT6 on a walk.
- Testing's size: **flow** (`docs/TESTING.md`): the new journey, plus `stacks` (the pill's MS2 names: a fifth button)
  and `threads` (the card from the viewer) and `responses` (it reads the viewer); about 4 + 6 + 5 + 3 minutes.

## Screens: one line per action

- Put the just-kept moment in a thread: the goal is grouping a series, several times a walk, on foot, one-handed; the
  control is a 44 pt icon button on the pill already in view (matrix: "an action on the object just made: inline, next to
  it"). Adjacent apps: Lightroom Classic's remembered target, Day One's Tag in the editor. Where the owner looks first:
  the pill that appears after the shot; they see the link icon threads already wear.
- Add to the same thread again: "Last added to", the first row, one tap (Lightroom Classic's target).
- Find a thread or a moment: the search field at the card's top (Day One's tag search), closed until tapped.
- Name a new thread: an optional field right after the two are joined; Leave it unnamed beside Done.

Defaults that make a control quieter: Thread is an icon without a word, as the pill's other buttons (the owner approved
the drawing); the search is closed until tapped (the approved drawing's recommended shape).

## Against precedent

Lightroom mobile and the iOS album cameras choose the album before the shutter; we never do (Never, "A capture behind
… an extra tap"; 0104, nothing captured inside a thread). One tap per capture is the owner's call.

## Cost

The card reads every moment once when it opens (`threads.moments()`, as today) plus the open walk's (the same read);
threads and members are already in the store. n: a library of years is thousands of moments, read once per open, paged
40 at a time as today. `MomentPicture` loads only the rows shown. Nothing per frame or per fix. Harness: none needed.

## Native, never run on a phone

The card in a transparent Modal over the walk screen and Navigate (iOS: no other Modal is open there when the pill
shows); the keyboard's lift inside that Modal; the small copies in rows. Added to `docs/NATIVE_UNVERIFIED.md`.

## Deferred

The keep-threading mode (the owner: after use). The `MomentPicker` keyboard item stays deferred (`docs/DEFERRED.md`).
