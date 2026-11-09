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
Criteria: MS1 (one tap, unchanged), MS2-MS3 (one tap to add, own time, one fix), MS6 and MS7 (one moment, its context), MS8 (no count), MS13 (no merge), MS16 (one beat in the replay), MS18-MS20 (the setting, the words, no tracking).
Open: none (the owner's answers, Nov 9). The reasons rest on decision 0106; open question 5 of VISION.md is cited as a reason, not a rule.

## Decisions (the owner's calls, Nov 9, decision 0106)

- Every kind of media can share a moment: photo, video, voice memo, note.
- Grouping is explicit by default: an **Add to this moment** pill after a capture, beside the edge stack, one tap per kind. The edge stack itself always makes a new moment while the setting is off.
- Automatic grouping is a setting, off by default, closing after **two minutes** with no capture or on a one-tap **New moment**.
- A piece can be **split out** into a moment of its own, keeping its own capture time.
- Separate moments are never merged; grouping them is a thread (0104), unchanged.
- The data model is a container: a moment table with captures as its media; existing captures migrate under the same ids (round 0, `specs/moment-table/spec.md`).
- Two rounds after round 0: round 1 is MS1-MS14; round 2 is MS15-MS20.

## Criteria

### Round 1: adding to a moment, one moment everywhere

#### Capture

1. **MS1 · One tap, unchanged.** With the setting off (the default), each tap on the edge stack's camera, mic or note makes a new moment, in one tap, on Navigate's ready screen and on a walk, as before this slice.
2. **MS2 · Add to this moment.** Once a capture is kept, an **Add to this moment** pill shows in the walk screen's pills, left of the stack, offering camera, mic and note, one tap each, with nothing else to choose first. Each button has a spoken name ("Add a photo to this moment").
3. **MS3 · A piece keeps its own time; the moment keeps its one place.** What the pill saves joins that moment as a piece with its own capture time. The moment's place and time stay its first capture's: adding a piece takes no new location fix (0036), and the moment's place never moves.
4. **MS4 · The pill closes.** The pill closes when the walker leaves the walk screen (or minimizes the walk), starts or stops a walk, dismisses it, or, on a walk, walks on: the trace is more than 50 m from the moment's place. Once it has closed, the next capture is a new moment.
5. **MS5 · Each new piece re-offers the pill.** After a piece is added, the pill stays for the same moment; a capture from the edge stack starts a new moment and the pill then offers that one.

#### One moment everywhere

6. **MS6 · Once, wherever moments appear.** A moment with several pieces appears once, with its one place and time, in Lately, a walk's and a day's moments, Memories here, a thread, the resurfaced card, the reminder card, What happened here and as one pin on every map.
7. **MS7 · Its face.** A moment's row, pin and card show its first photo or video when it has one (else its first piece), with a quiet mark that it holds more than one piece, and its context line as any moment's (place, time, what came before).
8. **MS8 · No count.** No view shows how many pieces a moment holds as a digit, a "+N", a number word above "three" or a percentage; where its size is said, it is a word from the fixed set ("a couple", "a few", "several", "many").

#### The viewer

9. **MS9 · Its pieces in order.** The viewer opened on a moment shows its pieces in capture order, one at a time; a swipe, the arrow keys (web) and Next/Previous buttons with spoken names move between them. Each piece shows as a lone capture of its kind does today (a photo with its caption and edits, a video, a memo, a note).
10. **MS10 · What acts on a piece, what acts on the moment.** Edit, caption, Save and a note's text act on the piece shown. Respond, Add to a thread, Remind me here, Open in Maps and the moment's place and time act on the moment.
11. **MS11 · Add from the viewer.** The viewer's **Add to this moment** offers camera, mic and note, one tap each; the piece keeps its own capture time and the moment its place (MS3).

#### Deleting

12. **MS12 · A piece, the moment.** The viewer offers **Delete this piece** (when the moment holds more than one) and **Delete this moment**, each asking once in words and offering Undo for 5 s. Deleting a piece keeps the rest and the moment's threads, links, reminder and find. Deleting the last piece, or the moment, deletes the moment with its memberships, links, reminder and find (OT16), and every piece's files.

#### Rules that hold

13. **MS13 · Never merged.** No control joins two existing moments into one; connecting them stays Add to a thread (OT5), unchanged.
14. **MS14 · Kept on the device.** A moment's pieces survive a restart, a reload (web) and an app update, and nothing about them leaves the device without a tap.

### Round 2: the replay, splitting, automatic grouping

15. **MS15 · Split out.** In the viewer of a moment with more than one piece, **Split out** moves the piece shown into a moment of its own, with its own capture time; on a walk it is placed from the walk's trace at that time, off a walk at the original moment's place. The original keeps its threads, links, reminder and find. Undo for 5 s.
16. **MS16 · One beat in the replay.** In a walk's and a day's replay, a moment with several pieces is one beat at its one pin: its photos and videos as one card that turns through them, its notes and memos as its bubbles, together, and the replay's wait at a moment (0002) is one wait per moment.
17. **MS17 · The setting.** The walk's settings offer **Group captures into one moment**, off by default, with a line in words saying what it does; it is kept on the device and survives a restart.
18. **MS18 · Grouping by itself.** With it on, a capture opens a moment and the edge stack's captures join it until two minutes pass with no capture, or the walker taps **New moment**, leaves the screen, starts or stops a walk, or walks on (MS4). While it is open, the screen says so in words ("Adding to this moment") beside **New moment**.
19. **MS19 · Nothing tracks.** Off a walk, nothing watches the location to close a moment: it closes by time, a tap or leaving the screen (0036).
20. **MS20 · The pill gives way.** With the setting on, the Add to this moment pill is not shown (the edge stack adds); with it off, behaviour is MS1-MS5.

## Record

Not started. Round 0 (`specs/moment-table/spec.md`) comes first.
