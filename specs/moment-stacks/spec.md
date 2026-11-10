<!-- Repo first: written from the owner's request in a session (Nov 9), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The owner's calls are decision 0106. Round 0, the moment table, is its own spec: specs/moment-table/spec.md. -->

# Moment stacks: several media, one moment

Nov 9, 2026 · @Miguel Guerrero

Looking at an oddity, the owner takes it from several angles, says something about it, maybe writes a line. Today each of
those is its own moment, and keeping them means going back through the screens between shots. A stack makes them one
moment: one place, one time, its pieces in the order they were made. Separate moments that belong together stay a thread
(0104); a stack is the moment itself.

## Vision

Idea: The capture context serves as one moment: any media produced within that context or session (photo, video, voice memo, note) belongs to it, grouped explicitly by default and automatically only by a setting.
Verb: honour (the moment arrives whole: the angles, what was said and written about one subject, at one place and time).
Touches: Never "A capture behind a menu, a drawer or an extra tap"; Always "Counts are words"; Always "A moment carries its context… never… a bare thumbnail, filename or count"; Always "Moments and the trace are truth"; 0036 "a moment gets one fix… nothing tracks between moments"; 0104 (a stack is not a thread; groups of separate moments stay threads); open question 5, "Nothing is ever calculated for you" (the concept doc's line, cited as a reason, not a rule).
Verdict: aligned if reshaped
Shape: The edge stack is unchanged: each tap makes a new moment. After a capture, an "Add to this moment" pill offers each kind, one tap each; it closes when you leave the screen, walk on, or dismiss it. A setting, off by default, groups automatically until two minutes pass with no capture or a one-tap "New moment". One moment, one place, one time, everywhere moments appear; its size never a number. Split out moves a piece into its own moment. Separate moments are never merged; Add to a thread is unchanged.
Criteria: MS1 (one tap, unchanged), MS2-MS4 (one tap to add, own time, one fix, the pill closes without tracking), MS6 (restraint), MS7-MS8 (one moment, its context), MS9 (no count), MS12 (no adding out of context), MS14 (no merge), MS17 (one beat in the replay, the lows kept), MS18-MS21 (the setting, the words, no tracking).
Open: none (the owner's answers, Nov 9). The reasons rest on decision 0106; open question 5 of VISION.md is cited as a reason, not a rule.

## Decisions (the owner's calls, Nov 9, decision 0106)

- Every kind of media can share a moment: photo, video, voice memo, note.
- Grouping is explicit by default: an **Add to this moment** pill after a capture, beside the edge stack, one tap per kind. The edge stack itself always makes a new moment while the setting is off.
- Automatic grouping is a setting, off by default, closing after **two minutes** with no capture or on a one-tap **New moment**.
- A piece can be **split out** into a moment of its own, keeping its own capture time.
- Separate moments are never merged; grouping them is a thread (0104), unchanged.
- The data model is a container: a moment table with captures as its media; existing captures migrate under the same ids (round 0, `specs/moment-table/spec.md`).
- Two rounds after round 0: round 1 is MS1-MS15; round 2 is MS16-MS21.
- **Round 1's plan, the owner's answers (Nov 10):** a piece is named on screen by its kind, never "piece"; the mark is a two-card glyph in ink; the 100 m is measured from the moment's first capture (amending the Nov 10 "since the last capture"); a capture begun from the pill joins the moment even if the pill closes before it is kept.
- **The steward's review (Nov 9), the owner's answers (Nov 10):** the pill closes after two minutes with no capture everywhere, and on a walk also after 100 m of walked trace; the viewer adds only while the pill is open, otherwise it offers Respond; a walk's row keeps counting pieces by kind; with the setting on, a separate moment takes New moment and then the capture.

## Criteria

### Round 1: adding to a moment, one moment everywhere

#### Capture

1. **MS1 · One tap, unchanged.** With the setting off (the default), each tap on the edge stack's camera, mic or note, or the recording bar's camera, makes a new moment, in one tap, on Navigate's ready screen and on a walk, as before this slice.
2. **MS2 · Add to this moment.** Once a capture is kept, an **Add to this moment** pill shows in the walk screen's pills, left of the stack, on the ready screen and on a walk, offering camera, mic and note, one tap each, with nothing else to choose first. Each button has a spoken name ("Add a photo to this moment"). A memo started from the pill's mic records as one from the stack does (NR10): Stop & save takes the mic's slot.
3. **MS3 · A piece keeps its own time; the moment keeps its one place.** What the pill saves joins that moment as a piece with its own capture time. The moment's place and time stay its first capture's: adding a piece takes no new location fix (0036), and the moment's place never moves.
4. **MS4 · The pill closes.** The pill closes two minutes after the moment's last capture, on a walk or off one; on a walk, also once the walk's own recorded trace has gone 100 m from the moment's first capture, the place every piece is shown at (no other location is read, 0036); and when the walker dismisses it, opens a tab, minimizes the walk, opens another moment, or starts or stops a walk. Launching the system camera, recording a memo, writing a note, the Edit offer's editor and the app going to the background do not close it (the two minutes still run). A photo, video, memo or note begun from the pill while it was open joins the moment even if the pill closes before it is kept. Once closed, the next capture is a new moment, and a dismissed pill does not come back for that moment.
5. **MS5 · Each new piece keeps the pill.** After a piece is added, the pill stays for the same moment and its two minutes start again; a capture from the edge stack starts a new moment and the pill then offers that one.
6. **MS6 · Restraint.** The pill is ink-coloured, enters with a `motionTokens` timing, and has no pulse, sound or haptic beyond what a capture already gives. A saved piece is acknowledged by the existing saved toast, with no count. Its words never change with the moment's size.

#### One moment everywhere

7. **MS7 · Once, wherever moments appear.** A moment with several pieces appears once, with its one place and time, in Lately, a walk's and a day's moments, Memories here, a thread, the resurfaced card, the reminder card, What happened here, Explore's finds, the replay's pile, and as one pin on every map. A test lists these surfaces.
8. **MS8 · Its face.** A moment's row, pin and card show its first photo or video when it has one (else its first piece), with a quiet mark that it holds more than one piece (a two-card glyph in ink, never the accent colour or beside a number, adding "with more in this moment" to the spoken label), and its context line as any moment's (place, time, what came before).
9. **MS9 · No count.** Inside a moment, no visible text or spoken label gives a piece's position or the total. Map pins that gather nearby moments count moments, and one moment's pin shows no digit. Where a moment's size is said, it is a word from `sizeWord`'s cut-offs (2, 5, 11) and never a number word, digit, "+N" or percentage. A walk's row keeps counting pieces by kind, as today (the owner's call, Nov 10).

#### The viewer

10. **MS10 · Its pieces in order.** The viewer opened on a moment shows its pieces in capture order, one at a time. A horizontal swipe, the left and right arrow keys (web) and buttons spoken "Previous in this moment" and "Next in this moment" move between pieces, drawn unlike the viewer's paging between moments, which is named "Previous moment" and "Next moment". On screen a piece is named by its kind ("photo", "memo"), never "piece". Each piece shows as a lone capture of its kind does today (a photo with its caption and edits, a video, a memo, a note).
11. **MS11 · What acts on a piece, what acts on the moment.** Edit, caption, Save and a note's text act on the piece shown. Respond, Add to a thread, Remind me here, Open in Maps and the moment's place and time act on the moment.
12. **MS12 · Add from the viewer, only while the pill is open.** The viewer offers **Add to this moment** (camera, mic, note, one tap each) only while that moment's pill is open (MS4); at any other time it offers Respond (0104), which makes a new moment with its own place and time (the owner's call, Nov 10).

#### Deleting

13. **MS13 · A piece, the moment.** The viewer offers **Delete this photo** (or memo, video, note: the piece shown, when the moment holds more than one) and **Delete this moment**, each asking once in words and offering Undo for 5 s; a moment with more than one piece is asked as "Delete this moment and everything in it?", toasts "Moment deleted" and counts every piece's size. Deleting a piece keeps the rest, and the moment keeps its place, time, threads, links, reminder and find; its face becomes the next by MS8. Deleting the last piece, or the moment, deletes the moment with its memberships, links, reminder and find (OT16), and every piece's files.

#### Rules that hold

14. **MS14 · Never merged.** No control joins two existing moments into one; connecting them stays Add to a thread (OT5), unchanged.
15. **MS15 · Kept on the device.** A moment's pieces survive a restart, a reload (web) and an app update, and nothing about them leaves the device without a tap.

### Round 2: the replay, splitting, automatic grouping

16. **MS16 · Split out.** In the viewer of a moment with more than one piece, **Split out** (spoken by kind: "Split this photo out") moves the piece shown into a moment of its own, with its own capture time; on a walk it is placed from the walk's trace at that time (in a gap or a pause, at the last fix before it, as captures are placed today), off a walk at the original moment's place. The original keeps its threads, links, reminder and find. Undo for 5 s.
17. **MS17 · One beat in the replay.** In a walk's and a day's replay, a moment with several pieces is one beat at its one pin: its photos and videos as one card that turns through them within the rhythm's photo slot and under the 60 s soft cap (0085); its memos play one after another in capture order, its notes as its bubbles; nothing waits for a tap (0085). The pile holds one card per moment. What the replay says of places passed without stopping (`passedLine`) is the same as with the pieces as separate moments.
18. **MS18 · The setting.** The walk's settings offer **Group captures into one moment**, off by default, with a line in words saying what it does; it is kept on the device and survives a restart.
19. **MS19 · Grouping by itself.** With it on, a capture opens a moment and the edge stack's captures join it until it closes as the pill does (MS4) or the walker taps **New moment**. While it is open, the screen says "Adding to this moment" beside **New moment**, in words that never change with its size. Starting a separate moment takes New moment and then the capture (the owner accepted the two taps, Nov 10).
20. **MS20 · Nothing tracks.** Off a walk, nothing watches the location to close a moment: it closes by time, a tap or leaving (0036).
21. **MS21 · The pill gives way.** With the setting on, the Add to this moment pill is not shown (the edge stack adds); with it off, behaviour is MS1-MS6.

## Steward (Nov 9) and triage

S1 (adding later breaks context): accepted, MS12, the owner's call. S2 (no close off a walk): accepted, MS4. S3 (digits in the viewer, a pin, the walks row): accepted, MS9; the walks row is the owner's call (pieces, as today). S4 (size words): accepted, MS9. S5 (the 50 m): accepted, MS4, 100 m of walked trace, the owner's number. S6 (the replay's restraint; 0002 superseded by 0085): accepted, MS17. S7 ("leaves the screen"): accepted, MS4 lists each. S8 (restraint of the pill): accepted, MS6. S9 (surfaces left out): accepted, MS1, MS2, MS7. S10 (ambiguities): accepted, MS10, MS13, MS16, MS2. None rejected.

## Record

Round 0 (`specs/moment-table/spec.md`) built 2026-11-10.

**Round 1 (MS1-MS15) built 2026-11-10** on `claude/wizardly-mayer-k9vmge` (tests first `6006598`; code `9854b74` to `07c3aae`; journey real at `396741f`).

- Unit tests: `moments/openMoment`, `moments/momentPill`, `moments/oneMoment`, `moments/moment`, `captures/pieceStamp`, `walk-screen/addPill`, `deletion/deletion`, and `addPiece` / `deletePieces` in the Db contract over the fake, IndexedDB and SQLite. 1542 unit tests, typecheck and lint pass.
- The `stacks` journey passes on the web build (19 checks), and every journey `check:affected` names: chronicle, days, deletion, edit, gaps, headsup, hidden, layers, marks, memories, nudge, outlines, qol, ready, reload, replay, resurface, snap, tabs, threads, upgrade, walk, walkability. The journeys' "Next capture" became "Next moment" (MS10). `deletion`'s walk check "a short video is kept, sharing a pin with the memo nearby" failed twice and passed on the third run (the pins regroup after a save): a timing flake, its message now names the pins seen.
- Found by the journeys and fixed: the viewer read a stacked moment's face from its `pieces` copy, which a screen's patch (an edit, a note's new text) does not update; it now reads the face from the faced fields (`facedAt`, a unit test).
- `check:test-first`: all fifteen round-1 criteria pass, on the history rebuilt on Nov 10 at the owner's call. In the first history MS2, MS9, MS10 and MS11 were `check.todo` in the tests-first commit, but their ids sat on the line after `check.todo(`, which the checker (one line at a time) does not read. The branch was replayed with only `scripts/e2e/journeys/stacks.js` rewritten, each check on one line, in the four commits that had the old layout; every other file, message and date is kept, and the final tree is unchanged (tests first is now `6006598`).
- Native: the pill over the system camera's return, a memo from the pill, swiping pieces, and a piece's delete have never run on a phone (`docs/NATIVE_UNVERIFIED.md`, Moment stacks).
- Round 2 (MS16-MS21) is not started; the spec stays in `IN_PROGRESS` (`scripts/features.js`, since 2026-11-10, 7 days).
