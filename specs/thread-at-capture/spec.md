<!-- Repo first: not a tab of the owner's Claude Docs doc "Explorer App Concept". Written: 2026-11-21, from G11 (/tend inbox G11 yes). -->

# Thread a moment as it is kept

Nov 21, 2026 · the owner

The owner's words (/investigate, Nov 21): "There should be a way to quickly thread a moment captured at the point of
accept whether that be like a little search bar, an annotation chip or something because I frequently noticed myself
capturing like murals and graffiti that I would like to sometimes [group] and trying to thread them after the fact is
kind of [onerous] since things are in timelines … it just seems time-consuming to just scroll back up and thread them."

The brief is `docs/research/threading-at-capture.md` (its causes, `file:line` references and the owner's calls); this
slice builds G11's criteria and no more.

## Vision

Idea: "A way to quickly thread a moment at the point of capture … instead of scrolling back up to thread them after the fact."
Verb: return (threads give moments back by likeness) and honour (the moment is grouped where it is kept, the walk not left)
Touches: Always, "Capture is one tap away on every screen you walk or capture from" (the shutter unchanged; Thread comes after, never before); Never, "A capture behind a menu, a drawer or an extra tap" (nothing is asked before a capture, no mode); Always, "A moment carries its context … It never appears as a bare thumbnail" (a picker row is a picture with its words, place and time); Always, "Counts are words"; Always, "Restraint in motion, colour and copy" (MS6); decisions 0104 (two moments; nothing captured inside a thread), 0105 (the link mark), 0123 and MS2, MS21 (the pill, amended by 0253), 0240 (the editor comes first), 0251 (its line at the top, unchanged)
Verdict: aligned
Shape: as asked, reshaped by the owner's calls: Thread after the moment is kept, on the pill; no tag record, no mode
Precedent: Lightroom Classic's target collection (one key, a remembered target); Day One tags from the editor; Pinterest asks for a board at Save (all unverified; Google Keep's label menu verified). Departs from Lightroom mobile and the iOS album cameras: their choice comes before the shutter
Criteria: CT1-CT14 below
Open: none (the keep-threading mode is a later question, after use; the brief's "After it")

## Decisions (the owner, Nov 21)

- Thread goes on the Add to this moment pill, not in the photo editor (decision 0253, amends 0123's pill: MS2, MS21).
- The card opens on the thread last added to, with a search over threads and moments; the search is closed until tapped.
- One tap per capture; nothing stays switched on (0104 holds). A sequence mode is left for after use.
- A thread still needs two kept moments (OT6); the walk being made is offered, with pictures; an optional name once two are joined.
- The look: the canvas below, approved as drawn.

## Mock-up

Drawing: https://claude.ai/artifact/LopMYhJDtvUrVEGFrViKce (docs/mockups/threading-at-capture/)
Approved: with G11, "Approve as drawn (Recommended)" (the owner, 2026-11-21)

While building (Nov 21) the grouping line could not be built as drawn (three lines, not two); both shapes were drawn on
the canvas and the owner chose "Stack it (Recommended)": the words above Thread and New moment.

The deferred items by reasonable default (decision 0256): the Default* artboards, approved "Approve as drawn
(Recommended)" (the owner, 2026-11-21).

## How adjacent apps do it

- **Adobe Lightroom Classic**: "Set as Target Collection", then B adds the selected photos to it. Source: from memory, unverified (host blocked). **Unverified**. The model for "Last added to": a remembered target, one action.
- **Day One** (iOS): while writing, More above the keyboard, then Tag: type a new tag or choose an existing one. Source: from memory, unverified. **Unverified**.
- **Google Keep** (web): More, "Add label", check a label or Create. Source: https://support.google.com/keep/answer/6191044 . **Verified**.
- **Cam Albums, TidyCam, AlbumCamera** (iOS): choose an album first, every shot goes there. Source: from memory, unverified. **Unverified**. A counter-example here: the choice comes before the shutter (Never, "A capture behind … an extra tap").

## Criteria

1. **CT1** (the owner's task: "thread a moment at the point of capture") After a moment is kept on the walk screen or on Navigate's ready screen, the Add to this moment pill offers a fifth button, Thread: the link icon, before ×, spoken "Add this moment to a thread", one tap. The pill's words ("Add to this moment") and its other buttons are unchanged, with no count, colour or sound (MS6). At 390 px the five sit in one row; where they do not fit left of the stack (320 px) they wrap three, then two, every target 44 pt; at every width camera, mic and note keep the first row in that order, Thread and × after them. **Finding:** someone told only "put this photo with your other murals" finds Thread on the pill that appeared after the shot, by the link icon threads already wear (0105).
2. **CT2** (Group captures) With Group captures on, the "Adding to this moment" line offers Thread, then New moment, below its words, which stay on one line (the owner's call while building, Nov 21: beside both buttons they took three lines at 390 px; the canvas's GroupStacked); it threads the open moment.
3. **CT3** (the card) Thread opens Add to a thread for the whole moment (every piece with it), over the whole screen, in the app's Modal (no Modal over a Modal on these screens). The card covers the capture stack while it is open (the approved drawing); Close is one tap and gives the stack and the pill back as they were, and the card never opens by itself.
4. **CT4** (the last thread) With no search, the card opens on "Last added to": the owner's thread whose newest membership is the latest, one tap to add the moment; then A new thread; then the other threads, newest moment first. Nothing new is stored to know it. With no thread yet, A new thread comes first. A thread the moment is already in shows "This moment is in it" and cannot be tapped. Each thread row says its size in words ("a few moments, since November", `threads/lines.ts`), never a numeral.
5. **CT5** (search) A field, "Search threads and moments", closed until tapped (no keyboard at open), finds threads by their name or their heading's words and moments by their words, place or date, under "Threads" and "Moments". A moment chosen there starts a new thread of the two. Nothing found says "Nothing matches." in words.
6. **CT6** (the walk being made) The card offers moments of the walk still open, newest first, and lists a thread made of its moments, from every host of the card: the pill on the walk screen, the viewer's More and Chronicle's Thread row.
7. **CT7** (pictures) A photo or video row shows its small picture beside its words (its caption, or "Photo", "Video") and its place-and-time line; a voice memo or note keeps its words; a picture is never shown alone.
8. **CT8** (the first of a series) A new thread still needs two kept moments (OT6). Once two are joined, the card says "Connected" and "The two moments are a thread now.", with an optional field, "Name this thread", Leave it unnamed and Done; a name typed is the thread's (OT13), an empty one leaves it unnamed (headed by place and date, OT12), and nothing names it for the owner.
9. **CT9** (said once) Adding or connecting is said once, in words, with no count: "Added to a thread" where the host speaks (the viewer's info line, the walk screen's and Navigate's toast, Chronicle's line); a failure says "Could not connect".
10. **CT10** (the journey) On the web build: two photos on Navigate's ready screen, the second threaded with the first from the pill and named "Murals", a third added with Thread and "Last added to" (two taps); on a walk, two photos threaded from the pill with the walk still open; the grouping line's Thread; and the store holds the threads as made.
11. **CT11** (nothing before the shutter) Before a moment is kept, nothing about threads is drawn on the walk screen or Navigate: the capture stack, its order and its first tap are as before (MS1, MS2), and no thread is asked for or chosen before a capture.

12. **CT12** (rows apart in words; decision 0256) Each moment row in Add to a thread says its time of day after its date ("Nov 21, 4:12 pm · From Saturday afternoon walk"), so two moments of one walk read apart in words as well as by their pictures.
13. **CT13** (Clear; decision 0256) While the threads' search holds text, a Clear button (×, 44 pt, spoken "Clear search") sits at its end; a tap empties it and the card is back on "Last added to". With no text it is not shown.
14. **CT14** (the grouping line's word; decision 0256) With Group captures on, Thread on the line is a labelled button, the link icon and the word "Thread", beside New moment, never an icon alone beside a word (T5).

## Steward (Nov 21)

S1 accepted as words (CT3: the card covers the stack while open, Close gives it back in one tap, the card never opens by
itself); drawing the stack inside the card would change the approved look. S2 deferred to the owner (`docs/DEFERRED.md`,
"Thread at capture"): two moments of one walk read alike in words ("Photo · Nov 21 · From … walk"), told apart by their
pictures; a time of day in the row changes the approved words and every picker's line, so it is the owner's call. S3
accepted (CT11, and CT4's sizes in words). S4 accepted (CT1: camera, mic and note keep the first row). Silent: Undo on
"Added to a thread" deferred to the owner (a control the drawing does not show); a moment found by search that is already
in a thread starts a new thread of the two, as "A new thread" does today (OT5), unchanged; the toast never names the
thread (OT11 kept).

## Every surface (decision 0167)

- The pill (`AddToMomentPill`): the walk screen (`app/walk.tsx`, during a walk) and Navigate's ready screen (`MomentBar`). Chronicle's line has no pill: its entries carry the Thread slot (0197), which opens this card. The recording bar, Respond, the planner and the note page's camera open no pill today, so they get no Thread.
- The card (`AddToThread`): the viewer's More (`CaptureView`), Chronicle's Thread row (`MemoriesScreen`), and the two pill hosts above. All four get CT4-CT9.

## Record (Nov 21)

Built from G11 (`/tend inbox G11 yes`). Tests first: 11 of 11 (`check:test-first`). Unit: `threads/captureThread.test.ts`
(CT4, CT5), `moments/pillRow.test.ts` (CT1, audit 1). Journey `capthread` (26 checks, CT1-CT11, ui 1, audits 2-4);
`threads` (67) and `stacks` (36) green after it; `responses` green before the review's fixes. Typecheck, lint, `npm test` (3833 at the review).

While building: the grouping line could not keep its words to two lines beside Thread and New moment (three at 390 px);
both shapes drawn on the canvas, the owner chose "Stack it (Recommended)". The threads journey takes the new name step.

Cold find (pictures and five tasks in the owner's words): the card's steps found at once; Thread on the pill found late
(a chain with no word reads as a web link; "thread" is not on the map screen): the owner's (the approved look is
icon-only; `docs/DEFERRED.md`). The search's focus ring drawn inside the field: `thread-at-capture ui 1`, fixed (the
field draws an ink edge on its own box). Rows of one walk alike: S2, deferred to the owner. Older than the slice and
rejected here: the second step's search words, the size words, the storage notice, overlapping pins.

UI review: U1 rejected (the name step's dimming measured identical to the other steps, rgb 85, 87, 90); U2 to the
owner (an icon beside a labelled button on the grouping line, T5; as approved); U3 accepted (the 320 px wrap recorded
as an exception in decision 0253); U4 deferred to the owner (a Clear button in the search, not drawn).

Audit (the auditor, one round): F1 accepted (`thread-at-capture audit 1`, no Thread for a moment in Undo), F2 accepted
(`audit 2`, one thread per tap), F3 accepted (`audit 3`, a typed name kept on Escape, Back or Close), F5 accepted
(`audit 4`, the name field's own id and 40 characters); F4 deferred (a reminder can open the viewer over the card),
F6 deferred (no Back from the moment step, older than the slice), F7 deferred (the card builds every moment's row at
open; cost), F8 fixed in the records. Left the threads area no rougher; native unverified.

The deferred items by reasonable default (decision 0256, Nov 21): CT12-CT14 built test-first (a unit test for the row's
line, the capthread journey's checks, 30 in all; `threads` and `stacks` green); a row's line takes two lines so its
time never cuts the walk's name. The pill's icon, no Undo on adding and no keep-threading mode yet stay as they are.
