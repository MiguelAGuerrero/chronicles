<!-- Repo first: written from the owner's request in a session (Nov 17), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The owner's calls are decision 0196. Builds on specs/moment-stacks (decision 0123). -->

# Moment append: add to a moment you already made

Nov 17, 2026 · @Miguel Guerrero

Moments made back to back ("turn left onto Maple Street", then "at the stop sign, turn right onto East Union Boulevard")
are separate moments, and in Chronicle, outside a walk, there is no way to bring them together. The Add to this moment
pill (0123) lives on the walk screen for two minutes after a capture, and the viewer offers Add only while that pill is
open (MS12). The owner wants it the other way: open a moment you made earlier, at any time, and add to it. Each piece
stays its own unit; the moment is what shows them together.

## Vision

Idea: Open a previous moment, in Chronicle or anywhere it appears, and append a photo, video, voice memo or note to it, so a stack of pieces reads as one moment; a graph of linked moments (Respond) stays beside it.
Verb: honour (the moment arrives whole: what was seen and said at the corner, kept together however long after).
Touches: Always "A moment carries its context" and "Moments and the trace are truth"; 0036 "a moment's one fix"; 0123 ("Separate moments are never merged", the container model); 0104 (Respond is a new moment with a link; a thread is separate); the spec `moment-stacks` MS12, reversed by this slice; Never "A capture behind a menu, a drawer or an extra tap" (a capture of a new moment stays one tap on the edge stack; adding to an old one is an action on a moment that exists, which decision 0114 puts in its toolbar).
Verdict: aligned if reshaped
Shape: The viewer's dock offers **Add** beside **Respond** on every moment, always. Add keeps the new piece in that moment, with its own capture time and no new fix; the moment keeps its one place and time. Respond makes a new, linked moment at its own place. Existing moments are never merged. A moment's size is said in words, never a number.
Criteria: MA1 (the task, found), MA3 (own time, one fix), MA5 (Add and Respond say what each does), MA6 (reverses MS12), MA10 (never merged), MA8 (no count), MA12 (restraint).
Open: where an added piece's own place goes when it differs from the moment's (the vision is silent; this slice takes option 1, "dropped, as 0123 does", and names it as a default for the owner to overrule, decision 0196).

## How adjacent apps do it

- **Day One**: an entry opened later can take more media, and entries link to each other from selected text; no backlinks documented. Source: https://dayoneapp.com/guides/tips-and-tutorials/linking-journal-entries/ (the linking; adding media to an entry later from memory, unverified). **Verified** (linking), **Unverified** (adding later).
- **Apple Journal**: an entry can be opened and edited to add photos, audio and places after it was written. Source: from memory, unverified (support.apple.com/guide/iphone/write-in-your-journal-iph9824e83ce/27/ios/27 describes writing an entry; adding to one afterwards not read). **Unverified**.
- **Apple Messages** (reply): a reply is a new message that quotes the original, the graph half of this slice (Respond). Source: https://support.apple.com/guide/iphone/send-and-reply-to-messages-iph82fb73ba3/27/ios/27 . **Verified**.

## Decisions (the owner's calls, Nov 17, decision 0196)

- A stack is a way a moment's pieces are shown together; each piece stays its own unit with its own capture time.
- No delta decides it: the owner chooses, by Add, which moment a piece belongs to. No time window, no setting.
- Add is offered from the viewer of any moment, outside a walk and on one, at any time, not only while the pill is open.
- A moment made earlier can take pieces from Chronicle, Memories, a day, a walk's list, a thread: wherever the viewer opens.
- Respond stays, and is the graph: a new moment at its own place, linked to the one it answers (0104).
- **Defaults taken, for the owner to overrule:** (a) the added piece keeps no place of its own (option 1; the moment's one fix stays, 0036); Respond is how a corner is kept; (b) Add replaces the top-row Add that shows only while the pill is open (MS12), so one control does one job; (c) the dock's Add is in ink with a word, the same as Respond.

## Criteria

#### The task

1. **MA1 · Add to a moment you made earlier.** From the viewer of any moment, in one tap on **Add** and one on a kind, a photo, video, voice memo or note is kept in that moment, however long ago the moment was made, on a walk or off one. **Finding criterion:** someone who was not told where it is can find Add from the viewer: it is a labelled tool in the viewer's dock beside Respond, drawn in ink at a target's size, with its own plus glyph and its word; the stacked-cards glyph stays the moment's mark for stacks only (MS8), never on a control.
2. **MA2 · The kinds.** Add opens a pull-down menu from its button titled "Add to this moment", offering Photo or video, Voice memo and Note, as Respond's does, in the same order and words (UI patterns: three kinds are a menu).

#### What stays true

3. **MA3 · A piece keeps its own time; the moment keeps its one place.** What Add keeps joins the moment as a piece with its own capture time. The moment's place and time, its threads, links, reminder and find are unchanged, and no location is read (0036). **A piece made later than its moment says so:** it is shown with its own time in words on the piece ("Added Nov 20, later"), never under the moment's time alone, in the viewer and in the replay, and the viewer states no place for it (steward S1). A piece made within the same minute as its moment says nothing extra.
4. **MA4 · Shown at once.** After a piece is added the viewer stays on that moment, shows the new piece, and says "Added to this moment" in the viewer's pill, with no count and no position. A voice memo recording for an add says "Recording a memo for this moment" and keeps the viewer's bars up (as a reply's does, audit 16).
5. **MA5 · Add and Respond say what each does.** The dock shows both, always, on every moment. Add's menu is titled "Add to this moment"; Respond's menu is titled "A new moment, linked to this one". Add's menu also says, before a kind is chosen, that the piece joins this moment's place and keeps its own time ("Keeps this moment's place; your piece keeps its own time"), so Add is not mistaken for a way to keep a new corner (steward S3). Neither title changes with the moment's size.
6. **MA6 · One Add, not two.** The viewer's top-row Add that shows only while the pill is open (MS12) is gone; the dock's Add is the one control, offered at every time. The walk screen's own pill (MS2-MS5) is unchanged.
7. **MA7 · Every host.** Add is on every surface that opens the viewer, because it is drawn by the one `ReplyDock` the viewer carries: the Chronicle's Memories (three hosts), a day, a walk's list and replay, Lately, the Media gallery, a thread, and the walk screen's own viewers; a moment opened from any of them offers it. A test lists the hosts of `CaptureViewer` and that the dock is the only one.
8. **MA8 · No count, a quiet mark.** A moment that gains a piece shows once everywhere (MS7) with the two-card mark (MS8) on its row, pin and card only where it holds more than one piece, and its size, where said, is a word (MS9). A moment that gains its sixth or twelfth piece changes no text except through `sizeWord`'s words. No visible text or spoken label gives a piece's position or the total.
9. **MA9 · A moment made on a finished walk, or on none.** Add works on a moment of a finished walk, an open one, and a loose moment, and the new piece's media is stored where the moment's own are (a walk's folder, or `walks/moments/`).
10. **MA10 · Never merged.** Add keeps new media in a moment; no control moves or joins two existing moments, and no Db method does (MS14 holds). Connecting existing moments stays Add to a thread (OT5).
11. **MA11 · Kept on the device.** An added piece survives a restart, a reload (web) and an app update, and nothing leaves the device without a tap (MS15).
12. **MA12 · Restraint, and a phone.** The dock holds three labelled tools (Add, Respond, Edit) without wrapping at 320 px at the default text size; the menu has no pulse, sound or haptic beyond what a capture gives; it enters with a `motionTokens` timing.
13. **MA13 · An added piece can be deleted.** An added piece is deleted as any piece is (MS13), with Undo, and the moment is kept.
