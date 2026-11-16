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

## Cold find (2026-11-14, the `ux-reviewer`, from the journey's pictures)

Told only "send the app's diagnostics", from the walk settings. 5 findings: 3 fixed, each behind a check named
`errors-handled ui N` in the `diagnostics` journey; 2 rejected.

1. (high) fix: the row read as a heading, not a control. It is the sheet's outlined `Button` now
   (`errors-handled ui 1`).
2. (medium) fix: it sat under Distances, with no heading of its own. It has a rule and a heading, Help
   (`errors-handled ui 2`).
3. (medium) fix: the failed-save line said "a setting" and not what to do. It names the setting ("Your
   Distances choice") and, for a full phone, says "Free some room first." (`errors-handled ui 3`).
4. (medium) reject: a dialog for a failed save. EH14 and the plan chose one line that stays until it saves;
   a dialog over the map betrays EH13.
5. (low) reject: a dismiss control and a place higher up. The line goes when the save works (S4, by design),
   and it sits in the walk screen's pill slot, beside the captures, never over them.

## Audit (decision 0074, 2026-11-14 to 16)

The `auditor`, the `steward` and the `ux-reviewer` (a cold find first, then the full review) read the built slice at
`9147aad`, with the `diagnostics` journey's pictures at 390 x 844. 25 findings: the auditor's 13, the steward's 4 and
the ux-reviewer's 8, merged into the 22 below where two named the same failure. The owner answered four
(2026-11-16): a line carries the day only; a message from outside the app is kept as its error type; the walk's line
can be hidden until something new fails; a failure shows on the screen where it happened. Each accepted finding has
a test named `errors-handled audit N` in `src/lib/__tests__/diagnostics/audit.test.ts` or a check of that name in the
`diagnostics` journey.

1. One failed SQLite write logged forever (auditor 1): accept. The write queue's own catch reported the failure, and
   the report's write failed the same way, around and around. The queue now hands its failure to the caller only,
   and the log stops writing to a store that refused an entry, keeping the session's entries in memory instead.
2. A later save that succeeded left the old failure, and Retry wrote back the old value (auditor 2): accept. Every
   save of the walker's goes through `saved`, and a success clears its thing. The line not surviving a reload:
   defer (a store that just refused a write can't keep the line either).
3. Retrying a still spell's start after its end left an open spell (auditor 3): accept. The start is retried only
   while the spell is still open; after its end, start and end are saved together.
4. Two different things under one key, and the same words said three times (auditor 4): accept. A save names its
   thing (`key`: the moment, the spell), and the line says each thing once.
5. A double Retry ran every save twice, and an old retry's success cleared a newer failure (auditor 5): accept.
6. The scrub let an unquoted name, a low-zoom tile, a scheme-less URL and a path with a space through (auditor 6,
   steward 2): accept, the owner's way. A message from outside the app is kept as its error type and the reason in
   words where one is known; only the app's own messages (`AppError`, a fallback's "in place of") keep their words.
7. Failed saves on Explore and the gallery shown nowhere, and the journal showing a failed Distances choice (auditor
   7, the steward's question 2): accept, the owner's way. Each failure is tagged with its screen; Explore and the
   gallery have the line; each screen shows its own, the walk and ready screens the settings too.
8. Saves of the walker's logged as cache work, so never said (auditor 8): accept. A thread's rename, a split and, on
   the web, a find go through `saved`.
9. A repeating error filled the log and pushed out its first cause (auditor 9): accept. The same kind, place and
   message within a minute of the last is written once.
10. The shared text read when the settings opened, leaving out later failures (auditor 10): accept. It is read
    again after each new report, so the tap still shares at once.
11. "The phone is full" in a browser; the web header without the browser's version; "since" before the log began
    (auditor 11, steward 4, ux 1): accept. The web says "there's no room left"; the header names the browser and its
    major version; "since" is no earlier than the log's first day.
12. A failed snap dropped in the replay, and the Baker's failure logged as a refusal (auditor 12): accept. The
    codemod's fallback words ("what loadSettings read") are rejected as a finding: they name the read the value
    stood in for, which is what EH10 asks.
13. A cancelled share copied the text and said "Copied", and on a phone a dismissed sheet said "Shared" (auditor
    13): accept.
14. Every line said the minute it happened, against the note's "no times of walks" (steward 1): accept, the owner's
    way. A line carries the day only.
15. The walk's line could not be set aside, so a full phone kept it on the map all walk (steward 3): accept, the
    owner's way. Hide keeps it hidden until something new fails; once the walk ends it shows again, on the next
    screen that draws the line (the replay draws none, EH14).
16. "Free some room first" beside Retry, and a retry that failed said nothing new (ux 2): accept. "Free some room,
    then Retry"; a retry that fails again says "still".
17. Retry 13 px from the capture stack (ux 3): accept. The line keeps 16 px clear of the stack.
18. Help and Distances drawn as a heading of a different level from the sheet's others (ux 4): accept. One heading
    style for the sheet.
19. "Copied." with no next step, and no picture of the after-state (ux 5): accept. "Copied: paste it into a message
    or an email."; the journey shoots it.
20. Retry's spoken name has no object (ux 6): accept. "Retry saving <the things>".
21. The sheet's title doesn't say it holds Help (ux 7): reject. The plan put the row in the walk settings, the
    owner's call (0179), and the cold find found it by scrolling.
22. The sheet's grab handle draws over the text under it (ux 8, auditor's picture note): defer. The ready bar's, not
    this slice's (DEFERRED).

**22 findings: 20 fixed, 1 deferred, 1 rejected** (2026-11-16). Of the fixed, 2 leave a part deferred (a line lost
on reload; the map layers' failures not said on Explore, both in DEFERRED) and 12 rejects its wording part. Tests:
`errors-handled audit 1-16, 18, 20` in `src/lib/__tests__/diagnostics/audit.test.ts` (3 also by a `putStill` contract
case), `audit 14, 17, 19` as checks in the `diagnostics` journey. Each failed before its fix, at its import or its
assertion.

## Decisions

- 2026-11-14 (the owner, decision 0179): no swallowed errors; handled by kind; a local diagnostics log, shared as
  text from the walk settings ("Share sheet, as text").
- 2026-11-14 (the owner): this slice follows code quality on the same branch.
- 2026-11-16 (the owner, on the audit): a shared line carries its day, never its time; a message from outside the
  app is shared as its error type; the walk's failed-save line can be hidden until something new fails; a failure
  shows on the screen where it happened.
- 2026-11-14 (the owner, on the plan): one slice, the codemod for the mechanical sites and a hand pass for the saves
  and refusals; the row in the walk settings after Distances (0179's "settings dialog"); the log keeps 500 entries and
  30 days.

## Open

- None: the owner answered the plan's questions (Decisions). With EH3a an entry names no walk or moment, so deleting
  one leaves nothing in the log to remove.
