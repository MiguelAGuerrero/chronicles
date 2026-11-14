<!-- Errors handled by kind. Written in the repo first (2026-11-14) from the owner's calls in session (decision 0179);
     follows "Code quality" (specs/code-quality/), whose gate found the swallowed errors. -->

# Errors handled by kind, and a diagnostics log you can share (EH)

The code-quality gate found errors caught and dropped without a word: 307 `.catch(() => {})` and empty `catch`
blocks, 132 fallbacks that hand back a default (`.catch(() => [])`) without saying so, and 26 promises nothing awaits.
A failed save of the walker's own data is lost in silence; a bug report has nothing to go on. The owner's call
(decision 0179): no swallowed errors. Every caught error is handled by its kind, and recorded in a diagnostics log on
the device that the walker can share as text.

## Vision

Idea: no swallowed errors; a caught error is handled by its kind and written to a local diagnostics log, shared as text from the walk settings.
Verb: honour (a failed save of a moment's context, a still spell or a choice is said, with Try again, instead of lost in silence); the log itself serves none of the three verbs, and is in by the owner's call, as Share GPS log is.
Touches: Never "Data leaving the device without a tap: accounts, analytics, telemetry, crash reports, a server as truth" (the log is the opposite of a crash report: it never leaves without the walker's tap, precedent Share GPS log, Nov 1); Never "Nagging"; Always "Counts are words, in a clause"; Always "Restraint in motion, colour and copy"; Never "A capture behind a menu, a drawer or an extra tap" (nothing here may cover or delay capture); precedents 0005 (local only), 0107 (every failed save held for Retry, why in words; never a limit on capturing), 0179 (this slice).
Verdict: aligned (settled by decision 0179)
Shape: as asked, with the gate's criteria: the log leaves only through the share sheet on a tap; a failed save is one line in words with Try again, never a dialog, never a count; an expected refusal (a browser that won't play a sound) changes what the screen offers, never shows an error; nothing about the log is ever counted on screen.
Criteria: EH3a, EH4, EH7, EH13, EH14 below (the steward's read folded in).
Open: none

## Criteria

### Share the log (the owner's task: "ensure diagnostic logs can be exported")

1. **EH1 · Share diagnostics.** In the walk settings (the ready bar pulled up, where Distances is), a row "Share
   diagnostics" hands the log to the share sheet as plain text; where a browser has no share sheet (a desktop), it is
   copied. The row's note says what happened ("Shared", "Copied", or why it failed), as Share GPS log's does.
2. **EH2 · Found.** Someone told only "send the app's diagnostics" finds the row from the walk settings, by its title
   in words, without being told where it is (the cold find).
3. **EH3 · The text.** A header (the app, its version, the device, the day the log was shared), then the entries newest
   first, each on one line: the local date and time, the kind in words ("A save failed", "Refused", "Cache work
   failed", "Read in place of", "Unexpected"), where (the module and function), and the error's message. An empty log
   says so in one line ("Nothing has gone wrong since …").
3a. **EH3a · What it never holds** (the steward's S1). An entry never holds a position, a tile number, a URL's path or
   query, a street or place name, a file path, an id, the walker's words or a setting's value: a core `scrub` strips
   them from every message before it is written, and a fallback records what it stood in for, never the value. The
   header names the platform and its version, never the device's model. The row's note says, before the tap, what the
   text holds: "When and where in the app something went wrong; no places, times of walks or words."
4. **EH4 · Nothing leaves without a tap.** The app contacts no host with the log; it leaves the device only through
   the share sheet or the clipboard, after the tap on the row (the e2e's "nothing is sent" check).

### Every caught error, handled by its kind

5. **EH5 · Recorded.** Every caught error writes an entry: time, kind, where, message. Writing it never throws and
   never waits on the screen; when the store can't take it (full, closed), the entry is kept in memory for the
   session and shared with the rest.
6. **EH6 · Kept.** The log keeps the newest 500 entries and none older than 30 days; older ones go when a new one is
   written.
7. **EH7 · A failed save is said.** When a save of something the walker made or chose fails (part of the walk, a
   destination, a setting), one line in the flow of the screen where it happened, in the slot the storage line uses
   (0107), says what wasn't saved and why in words when known ("the phone is full"), never the platform's message,
   with Retry, the verb captures already use. Retry repeats every failed save, and the line goes when they succeed.
   Several failures are one line naming them in a clause ("Your destination and a setting weren't saved"), never a
   number; a new failure of the same thing replaces the old. A capture's failed save keeps its own Retry (0107), so
   the walker's words are never held only by this line (the steward's S2-S5).
8. **EH8 · A refusal is state.** A platform's refusal (a sound the browser won't play, keep-awake, a notification
   permission, audio mode) is recorded, and where it changes what a person can do, the screen offers the way on
   (a tap to play); it never shows an error message.
9. **EH9 · Cache and background work.** A failure of work the app does for itself (a tile read, a backfill, a
   derived row, a hint flag) is recorded and nothing is shown; derived data is recomputed on its next read
   (truth vs cache).
10. **EH10 · Fallbacks say so.** A read that falls back to a default records what it fell back to ("[] in place of
    the walk's still spells").
11. **EH11 · No floating promise.** Every promise is awaited, returned, or handed to a handler; the gate's floating
    count is zero.
12. **EH12 · The gate holds it.** `check:quality` counts a fallback without the handler as swallowed; at the end of
    the slice the baseline holds no `swallowed:` and no `floating:` entry, and a new one fails.

### The gate's criteria

13. **EH13 · No count, no badge, no alarm.** Nothing on any screen counts errors or marks that something went wrong
    (no number, dot or badge). The failed-save line is plain ink, no red, icon or accent; it has no haptic, sound or
    motion of its own and is announced politely, never as an alert; the row says nothing of how much the log holds
    (the steward's S6).
14. **EH14 · Capture first.** The failed-save line never covers or moves a capture control, never blocks a capture,
    is never a dialog, and never floats over the way, Undo or the replay's beats; during a replay it waits for the
    card (the steward's S2).

## Decisions

- 2026-11-14 (the owner, decision 0179): no swallowed errors; handled by kind; a local diagnostics log, shared as
  text from the walk settings ("Share sheet, as text").
- 2026-11-14 (the owner): this slice follows code quality on the same branch.
- 2026-11-14 (the owner, on the plan): one slice, the codemod for the mechanical sites and a hand pass for the saves
  and refusals; the row in the walk settings after Distances (0179's "settings dialog"); the log keeps 500 entries and
  30 days.

## Open

- None: the owner answered the plan's questions (Decisions). With EH3a an entry names no walk or moment, so deleting
  one leaves nothing in the log to remove.
