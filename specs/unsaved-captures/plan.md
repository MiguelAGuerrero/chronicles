# Unsaved captures have one owner: the plan (UN1-UN15)

Criteria are in `spec.md`. The owner answered the plan's questions in person on Nov 17 (the foot, and decision 0194):
the recommended answers, built as written.

## What exists (main at `d266ed4a`)

- **Each capture path holds its own.** `useCaptures` (`src/lib/useCaptures.ts`) keeps failed photos and videos in its
  own state (`held`, a list, SA8) and one failed memo (`unsaved`, a single slot). Six screens run it: the walk screen
  (`src/app/walk.tsx`), Navigate, ready (`MomentBar`), Memories' open line (`journal/OpenLine`), the recording bar
  (`RecordingBar`), Respond in the viewer (`threads/ReplyDock`) and the planner (`planner/PlannerCapture`). Only the
  first three draw a pill with Retry. When a path unmounts, its state goes, and what it held with it (F1); a second
  failed memo overwrites the slot (F2); the bar, Respond and the planner hold what nobody can see (F4, the bar item).
- **`memoGate`** (`src/lib/memoGate.ts`, a shell with no ports) knows whether a memo records anywhere, the memo saves and
  photo keeps in flight; Start, Walk here and the bar's Stop wait on it. It holds no capture.
- **The walk screen's Stop** reads `cap.unsaved` and `cap.held` from its own path only, and warns once per new held
  count (`giveUpMemo`, `giveUpHeld`). **The bar's Stop** asks nothing about held captures.
- **The first attempt** (`tend/captures-20261117-1418`, `225c81b1`, unpushed, kept): `memoGate.hold/taking`, a memo
  failed after its screen went is handed to the next path of its walk that shows a Retry. Not reused: a hand-off keeps
  the one-slot-per-screen shape, which is what F1-F6 break (a screen that unmounts holding one, a full slot, a taker
  that never pulls again, a hidden tab taking it). Its e2e block (the chevron and Memories' pill) is the model for the
  new journey's first step.

## Design (the owner's Q1)

**One holder, outside every screen, in memory.** A shell `src/lib/unsaved/` owns every unsaved capture of the app as
one list, in the order taken. Each entry carries what a Retry needs on any screen:

```ts
type Unsaved = {
  id: string;                       // the entry's own id, never the capture's
  kind: 'photo' | 'video' | 'voice';
  walkId: string | null;            // the walk it was taken on; null outside a walk (UN4)
  stamp: Stamp;                     // t, at, into (an open moment), replyTo, a loose moment's fix on its way
  uri: string | null;               // the picker's or recorder's file, until kept
  ext: string; ms: number | null;   // a video's or memo's length
  path: string | null;              // the kept file, once kept: every later Retry uses it (UN12)
  line: string;                     // why, in SA9's words (UN9)
  said: boolean;                    // said on a screen in front already (UN9)
  retrying: boolean;                // taken by one Retry; another skips it (UN3)
};
```

- `hold(entry)`, `heldFor(walkId)` (read synchronously by both Stops: the dropped `/tend tabs` fix read a stale closure,
  the DEFERRED item's F2), `take()` (marks every entry not already being retried and returns them), `settle(id, kept |
  { path, line })`, `letGo(walkId)` (removes the walk's entries and their files: `dropTemp` for a picker or recorder
  file, `removeMedia` for a kept one, UN8, UN12), `unsaid()`/`said(id)` (UN9), `lost(walkId, line)`/`takeLost()` (UN13).
  The list is a `Store`; views read it with `useStore` and a selector returning a string key of the kinds (the render
  budget: never a new array).
- **Retry runs on the pressing screen's `useCaptures`**, but files each entry by its own walk: `Stamp` gains `walk:
  string | null`, and `add`, `addPiece`, `keepShot`, `saveMemo`, `placeMoment` and `thumbFor` read the folder and walk
  from the stamp, not from the hook's `walkId`. The moment is shown locally only when it is that path's walk, and goes on
  the bus (`captureBus.emit`, `LOOSE_MOMENTS` outside a walk) either way, so the walk screen and Memories show it as they
  show the bar's photo today. A stamp whose `into` moment is gone (`db.getMomentsByIds` finds nothing) is kept as a
  moment of its own (UN11; the decision `retryInto` in core).
- **Every pill-drawing screen shows every entry**, of any walk: the walk screen (with a walk open, the only walk with
  entries is that one; a memo held on Navigate, ready before Start is a loose one, shown and kept as its own, UN4),
  Navigate, ready, and Memories' open line. Each says the entries no screen in front has said yet (UN9) when it is in
  front (`focused`), and the lost memos waiting (UN13).
- **Both Stops ask `heldFor(walk.id)`**: the walk screen's warning in today's words, now across every path's entries
  (`stopWarning(kinds)` in core); the bar's in UN6's words. A second hold calls `letGo(walk.id)` and ends the walk.
- **`memoGate` is unchanged.** It answers "is anything recording or being saved"; the holder answers "what is held".
- **Lifetime** (Q2): in memory only. On the web a held file is a `blob:` URL, which a reload ends anyway; on a phone the
  picker's and the recorder's files sit in the cache directory, which a reload leaves behind for the system to clear
  (expo-audio 58 deletes no recording when its recorder is released, read in `ios/AudioRecorder.swift` and
  `android/.../AudioRecorder.kt`; iOS and Android name a new file per prepare, so the next memo never overwrites a held
  one). Unverified on a device.

## Files

- New `src/lib/unsaved/core.ts` (core): the entry's type, `retryInto`, `stopWarning(kinds)`, `barWarning(several)`,
  `memoLabel(count words, noun)` ("Voice memo not saved", "Voice memos not saved", "Voice note…" on Memories),
  `heldWhere(kind, outOfSpace, where: 'here' | 'walk' | 'memories')` (SA9 and UN10's words), the Stop decision
  (`stopHolds(heldKinds, warnedFor)`: warn again only when something new is held, the rule `giveUpHeld` keeps today).
- New `src/lib/unsaved/shell.ts` (shell, `createUnsaved(p: { dropTemp, removeMedia })`, passed in as functions so a Node
  test loads it) and `src/lib/unsaved/index.ts` (`// @instance`, built on `lib/media`).
- `src/lib/useCaptures.ts`: `held`/`unsaved` state go to the holder; `keepOrHold`, `memoFailed` (also when `!alive`),
  `retryHeld`, `retrySave`, `undoDiscard`'s failure; the stamp's walk; the option `retryShown: false` for paths with no
  pill (the words of UN10); returns `heldKinds`, `memosHeld`, `heldFor`.
- `src/lib/media/memoSave.ts`: `failedMemo` keeps `'here' | 'none'`; `'here'` now means "to the holder".
- `src/lib/space/core.ts`: `saveFailLine` stays SA9's; UN10's variants live in `unsaved/core`.
- `src/app/walk.tsx`: `stop()` (the holder's `heldFor`, the lost memo of UN13, `letGo` on the second hold), the two
  pills' words (plural memos). Nothing in its navigation bar or Go here.
- `src/components/RecordingBar.tsx`: `stop()` warns (UN5, UN6); the bar's capture passes `retryShown: false`.
- `src/components/ui.tsx`: `HoldButton` empties its fill after a refused hold (a `refusedAt` prop the screen bumps), UN7.
- `src/components/MomentBar.tsx`: the memo pill's plural; says unsaid lines when focused.
- `src/components/journal/OpenLine.tsx`: the same, in its pills (two lines). See Q4.
- `src/components/threads/ReplyDock.tsx`, `src/components/planner/PlannerCapture.tsx`: `retryShown: false` (one line each).
- `scripts/features.js`: `src/lib/unsaved/**` in the captures feature's `source`; the journey `unsaved` in its `journeys`.
- `scripts/e2e/journeys/unsaved.js` (new) and a shared `scripts/e2e/failStorage.js` (the `__failMedia` refusal lifted
  out of `space.js`, plus `__failMoment` for the moment store, so a file is kept and its row refused, UN12). `space.js`
  imports it; its checks are unchanged.

About 13 source files: a slice, not a fix.

## Data

No new truth or cache, no SQLite migration, no IndexedDB version, no meta key (Q2's recommended answer). The holder is
module state in a shell, as `memoGate` and `momentPill` are. A held capture is not a moment until Retry keeps it.

## Tests per criterion (written first, as todos, committed alone)

Unit tests in `src/lib/__tests__/captures/` (the captures feature): `unsaved.test.ts` (core, no fakes) and
`unsavedShell.test.ts` (the shell with fake `dropTemp`/`removeMedia` recording their calls). `useCaptures` has no hook
harness (a React Native hook), so its wiring is held by the journey; no source-reading checks (the review's "weak
tests"). Each unit test is seen failing with its wiring reverted before it counts.

| Id | Unit | Journey `unsaved` (e2e, `E2E_ONLY=unsaved`) |
|---|---|---|
| UN1 | shell: an entry stays after the path that held it unsubscribes | a memo refused on Navigate, ready (`__failMedia = 1`); the chevron, then Memories shows its pill; back, then Start, then the walk screen shows it; Minimize, then Memories shows it |
| UN2 | | the pill on each of the three screens, whatever path failed (the bar's camera, Respond, the planner); the cold find (below) |
| UN3 | shell: two holds, two entries, in order; `take()` twice gives each once | two memos refused in turn: "Voice memos not saved"; Retry keeps two voice rows in the order taken; one refused again stays |
| UN4 | core: the stamp's walk decides the folder | UN1's loose memo, Retry on the walk screen: the row's `walk_id` is null, under `moments/` |
| UN5 | core: `stopHolds` | the bar's Stop with a photo held by the walk screen: warned, the walk goes on; a second hold ends it; a photo refused while Stop waited is warned of |
| UN6 | core: `barWarning`'s words | the bar's warning box at 320 px: one line, nothing cut (`scrollWidth <= clientWidth`) |
| UN7 | | after a refused hold the button's fill is 0, on both Stops |
| UN8 | shell: `letGo` calls `dropTemp`/`removeMedia` for the walk's entries only | after the second hold: no pill anywhere, no media key left for it (`__failMoment` keeps a file first) |
| UN9 | shell: `unsaid`, `said` | a memo refused out of room as the chevron goes: Memories says "Not saved: there is no room left. It is held here for Retry." once, and not again on return |
| UN10 | core: `heldWhere` | Respond's memo refused out of room: the viewer's pill says "… on Memories."; the bar's photo during a walk "… on the walk screen." |
| UN11 | core: `retryInto` | a memo into an open moment refused; the moment deleted; Retry keeps it as its own moment |
| UN12 | shell: `settle` keeps the path; the next `take` hands it back | `__failMoment = 2`: Retry twice, one media key for the photo |
| UN13 | | a memo whose stop is ignored (`__stopOff`, as `space`) at the walk's Stop: said, the walk goes on; the second hold ends it |
| UN14 | core: no label or warning holds a digit | capture buttons enabled and in the same boxes while held |
| UN15 | shell: a new holder is empty | a reload: no pill (memory only) |

Names: `test('UN3: …', { todo: 'test first' }, …)`, `check.todo(ok, 'UN3: …')`; commit `Unsaved captures: tests first
(UN1-UN15, failing)`.

## The journeys

- New `unsaved` (the slice's own; files: `src/lib/unsaved/**`, `useCaptures.ts`, `RecordingBar.tsx`, the pills).
- Run at the end, once: `unsaved`, `space` (its harness moved), `launch` (the smoke), and what `check:affected` names
  for `walk.tsx`, `MomentBar`, `OpenLine`, `ui.tsx` (`walk`, `ready`, `tabs`, `capturehome`, `journal` likely).
- Pictures at 320 and 390 (`E2E_SHOTS`): each pill on each screen, the bar's warning, the walk screen's warning.
- **The cold find** (0167), before the UI review: the `ux-reviewer` gets the pictures and "a voice memo you recorded
  didn't save; save it again" and "end the walk, knowing a photo isn't saved", nothing else.

## Per-action lines (UI)

- **Retry a held capture.** Goal: keep what didn't save; rare, after a failure, often out of room. Control: today's pill
  with Retry, left of the stack above the strip (walk screen, Navigate, ready) or above the open line (Memories), matrix
  row 21 (a failure: inline, says why). Where the owner looks first: the screen they are on, at the pills; they see
  "Voice memo not saved · Retry". Default taken that is quieter: no ✕ on the pill (Q5).
- **End a walk with something held.** Goal: stop, knowing what is lost; rare. Control: the hold on Stop, warned once,
  held again to end (row 9, "confirm before losing work", by a second deliberate hold, as SA8 already does). Where
  looked for: Stop, on the walk screen or the bar. Default: the bar's warning is its line's words, not a dialog.
- **Know why.** Row 21 / row 19: one line in the screen's notice, SA9's words.

## Cost

n is the number of held captures: a handful, bounded by failures. Nothing runs per frame, per fix or on a tab's focus
beyond one store read; the selectors return strings. A web-held video is a `blob:` of tens of MB kept in memory until
Retry or let go (as today while its screen is up; now across screens): noted, no harness ("device only").

## Docs and records (at the build, not at this pause)

- `docs/DEFERRED.md` (`npm run records`): remove "A memo that fails to save as the screen unmounts…" and "The recording
  bar's Stop ends the walk without a photo the bar holds…" (each `--reason "shipped as unsaved-captures UN…"`); note
  "Held captures live in memory" (leaving a screen no longer drops them; a reload still does) and "Retry on the
  recording bar's camera" (its words now say where the Retry is). F9 and F10 stay `[loop]` items, not this slice.
- `docs/NATIVE_UNVERIFIED.md`: the items under Native below.
- `docs/STATUS.md`: "In flight" at step 4 (after the go-ahead), "Slices" at the end.
- `.claude/rules/captures-and-media.md` ("A failed photo or video is held"), `walk-screen.md` ("A memo that fails to save
  offers Retry. Leaving the screen mid-memo…"), `tabs-and-home.md` (the bar's Stop); `docs/ARCHITECTURE.md`'s codemap;
  `docs/PRODUCT.md`; a decision record for the owner's answers to Q1-Q3 (`npm run book:next-decision`).

## Deferred

- A held capture across a reload (Q2): needs a file kept where a full disk often refuses it, and a stored record.
- A way to let go of a held capture outside a walk (Q5).
- F9 (a web stop answered after 3 s) and F10 (Discard, then Undo, of a memo with no file): their `[loop]` items stay.

## Native

Never run on a phone, each a `NATIVE_UNVERIFIED.md` item at the build: a held photo's picker file and a held memo's
recorder file outlive the screen that took them and the next memo's prepare (iOS, Android); Retry from another screen
keeps them; the second hold removes them; after a force-quit nothing shows and the cache is the system's to clear.
`UNTESTED` in `scripts/features.js` gets none: every criterion has a web check.

## Coordination

- No navigation or Go here file is touched (`src/lib/nav/**`, `src/lib/here/**`, the Go here sheet): `walk.tsx` changes
  only in `stop()`, its pills and its `useCaptures` options.
- The parallel `/tend chronicle` run works on thread screens and the journal toolbar: this slice needs two pill lines in
  `journal/OpenLine.tsx` and one option in `threads/ReplyDock.tsx` (Q4).

## The steward's lens (done in this run, per the skill; no subagent)

- **S1 [tone] A lost memo holds up Stop (UN13).** One more hold for a memo that cannot be kept. Kept: said while the
  walker is still there, they can record it again on the spot (honour); the screen it was said on today is replaced at
  once, so it is said to no one.
- **S2 [drift] A pill that stays.** A capture held outside a walk now shows on Memories and Navigate until Retry or the
  app closes; out of room, Retry fails each time. Restraint, not nagging (it is in place, never a notification), but it
  can stand for a long time. Triage: Q5.
- **S3 [breach?] "The app never deletes a capture" (SA6).** UN8 removes files, but only on the walker's second hold
  after a warning that says "without it": the walker's act, not the app's. Kept.
- **S4 [drift] Two nouns.** "Voice memo" on the walk and Navigate, "Voice note" on Memories (`docs/DEFERRED.md`, journal
  voice audit 16). Kept as each screen has it; not this slice's call.
- No count, no celebration, nothing leaves the device, no capture button moves.

## Against the adjacent apps (spec, "How adjacent apps do it")

Google Photos, Apple Photos and Day One each keep what has not been saved where it was put, with one owner of its
state that no screen holds: the holder here. Where we depart: their failure is a copy to a server that can wait, ours
is the only copy, so a failure is said on the screen in front (UN9) and a walk's Stop warns before ending without it
(UN5); and their state is read behind a profile button, ours in the pills beside the captures (UN2), since the walker
is already there and capture is one tap away.

## The owner's answers (Nov 17, in person; decision 0194)

1. Where held captures live: "One app-wide holder": a new in-memory module `src/lib/unsaved/`.
2. How long: "While the app is open" (UN15 as written).
3. A walk ended without them, and the build: "Let them go; build as written". At the second hold of Stop, a walk's held
   captures are let go and their files removed (UN8); no ✕ on a pill outside a walk (Q5); two pills as today (Q6).
4. The order beside `/tend chronicle`: it landed first (`7f210fc7`); the branch is rebased onto it.

The questions as they were put:

1. **Where do held captures live?** (architectural: the data's home)
   - **A new app-wide holder, `src/lib/unsaved/`** (recommended): one list, in memory, that every screen reads and both
     Stops ask. It outlives every screen, so nothing is handed on and nothing is taken twice (F1-F6 close together).
   - Grow `memoGate` into it: the same, in a module whose job today is "is anything recording".
   - Keep each screen's own and hand on what a screen leaves (the first attempt): F2 and F6 need a list and a re-pull per
     screen, and a hidden tab can still take one.
2. **How long does a held capture live?**
   - **While the app is open** (recommended): a reload or a closed app drops them, as `docs/DEFERRED.md` records now.
     Most failures are a full disk or browser quota, where writing the file somewhere that survives is the write that
     just failed.
   - Across a reload: the file kept in a holding folder (a phone) or IndexedDB (the web) and a stored list (a meta key or
     a table, so a migration), with its own failure when there is no room.
3. **A walk ended without its held captures**, by the second hold:
   - **They are let go, files removed** (recommended): what SA8's warning already says ("end the walk without it").
   - They stay held after the walk, and Retry files them into the ended walk, placed by its trace: its places and
     summary are then recomputed (a derivation after the end), more than this slice.
4. **This slice beside `/tend chronicle`** (it touches the journal toolbar and thread screens):
   - **Build after that run lands on `main`, then merge** (recommended): this slice's edits there are two pill lines in
     `OpenLine.tsx` and one option in `ReplyDock.tsx`, small to re-apply.
   - Build now and resolve the overlap at merge.
5. **A way to let go of a held capture outside a walk:**
   - **None in this slice** (recommended): Retry, or closing the app (Q2). A ✕ that deletes is a destructive act with no
     Undo (matrix row 8: confirm), a control to add only if the pill turns out to stand too long.
   - A ✕ on the pill with a confirm ("Let go of this photo?").
6. **One pill or two:**
   - **Two, as today** (recommended): photos and videos in one, memos in the other, each with Retry. One pill naming all
     three kinds ("Photos, videos and voice memos not saved") does not fit a 320 px line beside the stack.
   - One pill and one Retry for everything held.
