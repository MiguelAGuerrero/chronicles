<!-- Repo first: written from the owner's request in a session (Nov 9), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The owner's calls are decision 0112. -->

# Capture from Chronicle: the app opens where moments live, one tap from keeping one

Nov 9, 2026 · @Miguel Guerrero

The owner wants to keep a moment outside a walk and a map, and today the app opens on Explore, which has no way to capture: the camera, mic and note are on Navigate, two taps from launch. The app now opens on Chronicle's Memories, and Memories carries the capture row, so a moment is one tap from opening the app and lands in the feed it opened on.

## Vision

Idea: Capturing a moment outside a walk should be the first thing you see: the app opens on a view other than Explore, and quick capture lives in Chronicle, as three large buttons, so the page becomes more than a list.
Verb: honour (a moment kept one tap from launch, with its time and its one fix), return (the place you keep a moment is the place moments come back).
Touches: VISION.md "What it is": "Chronicle first" and "Chronicle comes first; moments are its spine" (the owner, Nov 5, confirmed); Always "Capture is one tap away on every screen you walk or capture from"; Never "A capture behind a menu, a drawer or an extra tap" (two taps from launch today); Always "Restraint in motion, colour and copy: the content is the novelty, not the chrome"; **[proposed]** "Browse standard, dwell diegetic" (a reason, not a rule); Always "A moment carries its context"; Never "Nagging"; Never "Simulated or sample data"; Never "All-day tracking" (0036); precedents 0070 (opens on Explore, superseded), Navigation & tabs' "Chronicle doesn't" have quick capture and NV11 (amended), 0098 (Memories is where Chronicle opens), 0035 and 0036 (moments without a walk, one fix each), NV9 (the bar's camera files into the open walk), 0076 (an open walk comes straight up).
Verdict: aligned if reshaped
Shape: The app opens on Chronicle's Memories; Explore and Navigate are unchanged. Memories carries the same three kinds as the walk screen's stack (camera, mic, note), same glyphs and order, in plain ink, fixed low where the thumb is and never scrolled away; the feed scrolls under it. A moment kept there is stored at once, placed by its one fix, and heads Lately. The empty feed is one line in words beside the row. Reshaped from "three large buttons" only in register: large enough for a thumb, never a hero block, never the accent colour or prompt copy.
Criteria: HC1-HC5 (the launch and the tabs), HC6-HC8 (one tap, fixed, first for a screen reader, never covering a moment), HC9-HC10 (context, one fix, the open walk), HC12 (restraint, no nagging), HC13 (no sample data, no accent button), HC14 (no location read at launch), HC15 (nothing over the row).
Open: none (the four answered Nov 9: decision 0112).

## Decisions (the owner's calls, Nov 9, decision 0112)

- **The app opens on Chronicle's Memories** when no walk is open (supersedes 0070's "the app opens on Explore"). With a walk open, the walk screen still comes straight up (0076, NV2 launch).
- **The tabs read Chronicle · Explore · Navigate**: the home is the leftmost tab.
- **Explore stays a tab, unchanged**; capture does not belong on it ("Explore doesn't make too much thematic sense" meant capture there).
- **Quick capture moves onto Chronicle, on Memories only** (amends Navigation & tabs' "Chronicle doesn't" and NV11). Walks, Days and Map keep their map and sheet as they are.
- **With a walk open and minimized, Chronicle's capture row files into that walk**, as the recording bar's camera does (NV9).

## Criteria

### The launch and the tabs

1. **HC1** With no walk open, the app opens on Chronicle, on Memories, at the app's root path (`/`, the Home Screen app's start URL), with one tab bar and no live map.
2. **HC2** With a walk open at launch, the walk screen comes straight up, as before (NV2 launch); no frame of Chronicle shows first.
3. **HC3** The tab bar reads **Chronicle · Explore · Navigate**, in that order, each with its icon and label, the same on web and phone. Navigate still opens the walk screen over the tab in front (NR1).
4. **HC4** Back on Explore (Android, the browser) returns to Chronicle; the walk screen's chevron or Minimize with nothing beneath it goes to Chronicle.
5. **HC5** A launch on a replay or a day that finds nothing goes straight to Chronicle's Memories, never "could not be found" (0070's rule, at the new root). The old paths still work: `/chronicle` opens Chronicle at `/` and `/explore` opens Explore, each with one tab bar.

### One tap, from Memories

6. **HC6** Memories shows a capture row: camera (photo or video), mic (voice memo) and note, in that order, with the walk screen's glyphs. Each keeps a moment in one tap, with no tab, menu, drawer or scroll first. The row shows and works while Memories loads and after it failed to read its moments (keeping one needs no feed). Walks, Days and Map show no capture row. (Steward S7.)
7. **HC7** The row stays where it is while Lately scrolls, and while a thread, a Chronicle thread or Hidden is open in Memories; the list's last card scrolls clear above it, so the row never covers a moment's words. It sits above the tab bar, and above the recording bar when a walk is minimized.
8. **HC8** Each button is a thumb's target (at least 44 pt) and is named for a screen reader as on the ready screen ("Keep a moment: take a photo or video", "… record a voice memo", "… write a note"), or, with a walk open, for the walk ("Add to your walk: take a photo or video", …). In screen-reader order the row comes right after the Memories options button, before the resurfaced card and Lately. A capture from the row never joins a thread: Respond (OT1) is the way to answer one. (Steward S1, Silent 3.)

### The moment, whole

9. **HC9** With no walk open, a moment kept from the row is stored at once and heads Lately with its time, without leaving Memories; when its one fix comes it shows its place, or the toast says "No location". Each moment reads one fix and nothing tracks between moments (0036).
10. **HC10** With a walk open and minimized, the row's photo, memo or note belongs to that walk: it is placed as the walk's own captures are (the latest fix, else at stop), shows on the walk screen when it is opened, and plays in the walk's replay. It is not a loose moment. Its toast says "<Kind> saved to your walk", since Lately takes a walk's moments only once the walk is stopped (0098, unchanged). (Steward S2.)
11. **HC11** While a memo records from the row, Stop & save and Discard take their slots in place, with the timer beside them; nothing in the row moves. Leaving Memories mid-memo (another tab, another section, the recording bar's way back) saves the memo, and so does opening a moment, a menu, Relive or a replay from Memories: nothing plays over a recording. A memo under a second is dropped with "Too short, not kept", as elsewhere. (Steward S6.)

### Restraint and truth

12. **HC12** At rest, the row uses no accent colour, no number and no prompt copy; nothing on Memories invites, reminds or nudges the owner to capture, and no notification is added. While a memo records, the row keeps the walk screen's recording colours and its timer (a length, not a count). (Steward S8.)
13. **HC13** With nothing kept, Memories is "Nothing kept yet." and the row: no other button, no accent colour, never sample moments or a count. (Steward S3: the old empty state's orange Navigate button goes; Navigate is a tab.)
14. **HC14** Opening the app on Chronicle reads no location. Explore reads its one fix the first time it comes to the front in a launch, and frames it (NV16, moved from the launch to Explore's first focus).
15. **HC15** Memories' own toast (Undo), the moment's toast, the Edit offer and the voice pills sit above the row, never over it, and every button in the row keeps its box while one shows. The moment's toast says, verbatim: "<Kind> kept here", "<Kind> kept · No location", "<Kind> kept · No location (location is off)", or, with a walk open, "<Kind> saved to your walk". (Steward S5.)

## Amends

- **Navigation & tabs** (`specs/navigation-and-tabs/spec.md`): NV1 (the order), NV2 (the opening tab and the stale-link target), NV5 (paths and Back), NV11 (quick capture on Chronicle's Memories), NV16 (Explore's fix on its first focus), and the "Quick capture belongs to navigating and walking" line.
- **0070** is superseded on the opening tab; its stale-link and replay-error rules carry over to the new root.

## Record (Nov 9-10)

- **Built as written:** HC1-HC15, on branch `claude/eager-fermat-6bcwrd`. Tests first at `aec466c`; the code in
  `caf8b38` (HC1, HC3, HC4, HC5) and `26f7a94` (HC6-HC15).
- **Tests:** unit tests in `src/lib/__tests__/tabs/homeCapture.test.ts` and `resurface/section.test.ts`; the
  `capturehome` journey (every criterion, including a walk minimized, a memo cut short by leaving and by
  opening a moment, and a note played in the walk's replay); HC2 in `reload`, HC3 and HC5 in `launch`.
- **Typecheck, lint and `npm test` pass** (1455 tests). Each journey `check:affected` named passes on its latest
  run, as do the five whose start or paths changed (atlas, grading, kindwalk, outlines, scenic).
- **Flaky under load, not changed by this slice:** `chronicle`'s star settle (M9) and `walk`'s video pin (inside
  `atlas`) failed once with two journeys running at once and passed alone; `edit`'s video step failed once
  alone and passed on the next run. `launch`'s fresh "Walk here on Explore starts a walk, recording" step
  failed in two of five runs and never in a standalone script, even with the location delayed; the audit
  found the race (audit 1) and fixed it.
- **`check:test-first`:** HC2 and HC13 report "never a todo first". Their todos are in `aec466c` but split
  across two lines, which the line-based reader cannot see; both now sit on one line.
- **Amended:** NV1, NV2, NV5, NV11, NV16 (Navigation & tabs), NR3 (Navigate, ready), RM4 (resurfaced moments).
- **Native:** never run on a device; four items in `docs/NATIVE_UNVERIFIED.md`, and the launch items there now
  say Chronicle.

## Audit (Nov 10)

The auditor's report-only pass (1-9, 12, 13) and the steward's (10, 11), triaged. 13 findings: 11 fixed, 1 deferred, 1 rejected.
Each fix has a regression test named `capture-from-chronicle audit N`, run failing before its fix: unit tests in
`src/lib/__tests__/tabs/homeCapture.test.ts` (1, 6, 7), checks in the `capturehome` journey (2, 3, 4, 5, 8, 9, 11).

1. A walk screen up before the keeper reads the new walk never says "Walk started · recording" (the notice was set only as the screen mounted; the likely cause of `launch`'s flaky Walk here step): accept, the notice follows the walk's arrival (`arrivalNotice`, `walk.tsx`).
2. A moment's toast covers Memories' Undo: accept, Memories' toast goes in the band's pills column (`above`), which stacks.
3. The band's error pill covers a failed memo's Retry: accept, the error goes in the same column. The journey checks the error and a toast together (a denied mic); a failed save needs a broken store, so Retry itself is covered by the column, not its own check.
4. "Settings" on the band's error throws on the web (`Linking.openSettings` is missing): accept, no button on the web.
5. A tap between the band's buttons opens a card scrolled beneath: accept, the band's strip takes its taps (`pointerEvents="auto"`).
6. The bar's Stop doesn't wait for a photo or video being kept from the band: accept, `memoGate.keep` / `kept()` track every capture path's keep, and Stop waits for them.
7. With the keeper not yet known, the band keeps a loose moment for a walk that is open: accept, `captureTarget(walk, known)` says wait and the band is disabled until it knows. Covered by the unit test; the delayed keeper is not staged in the journey.
8. A reminder (or a moment) opened mid-memo can play over the recording: accept, Memories holds every viewer back until the band's memo has stopped.
9. In a thread or Hidden, the band comes before the screen's Back for a screen reader: accept, the band goes after the screen there.
10. The steward's B1, a moment's toast over Undo: reject, the same as 2, fixed there.
11. The failed state's orange "Try again" is on the launch screen now (steward B2): accept, `variant="secondary"`.
12. HC9 and HC10's unit tests reached `captureTarget`, which no view called: accept, `MemoriesBand` decides with it now. Covered by typecheck and the journey's HC9, HC10 checks.
13. Lost toasts: "Too short, not kept" under a viewer opened mid-memo, and "saved to your walk" when the walk stops and the band remounts: defer (`docs/DEFERRED.md`).

**After the fixes:** typecheck, lint and `npm test` (1458) pass; the 21 journeys `check:affected` named pass on their latest run. `walk`'s video pin (its own comment calls it timing-sensitive), `edit`'s video step and `chronicle`'s star settle each failed once in a sequential run and passed on the next; `launch` and `edit` now take the recording bar's camera from Explore, since Memories hides it (0112).

For the owner, from the steward (silent): the note editor's placeholder, "What's worth remembering?", now one tap from launch, asks the walker to judge worth (VISION.md: "every moment captured is worth remembering"); keep it or say something neutral? And with a walk open, only the toast and the screen reader say a capture goes to the walk; the recording bar beneath is the visible cue.

