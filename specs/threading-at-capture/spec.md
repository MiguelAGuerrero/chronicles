<!-- Repo first: not yet a tab of the owner's Claude Docs doc "Explorer App Concept". Written: 2026-11-21, from G11 (docs/STATUS.md, "Next evolutions"). -->

# Thread a moment as it is kept

Nov 21, 2026 · the owner · G11 · decision 0253 · brief: `docs/research/threading-at-capture.md`

The owner's words: "There should be a way to quickly thread a moment captured at the point of accept whether that be
like a little search bar, an annotation chip or something because I frequently noticed myself capturing like murals and
graffiti that I would like to sometimes [group] and trying to thread them after the fact is kind of [onerous] since
things are in timelines … it just seems time-consuming to just scroll back up and thread them."

Today a moment is threaded only after the fact, from the viewer's More or the journal's Thread slot, and Add to a thread
cannot see the walk still open, lists a photo as the word "Photo", and has no search over threads. This slice puts
Thread on the Add to this moment pill and mends the card.

## Vision

Idea: "A way to quickly thread a moment at the point of capture … instead of scrolling back up to thread them after the fact."
Verb: return (threads give moments back by likeness) and honour (the moment is grouped where it is kept, the walk not left)
Touches: Always, "Capture is one tap away on every screen you walk or capture from" (the shutter unchanged; Thread comes after, never before); Never, "A capture behind a menu, a drawer or an extra tap" (nothing is asked before a capture, no mode); Always, "A moment carries its context … It never appears as a bare thumbnail" (a picker row is a picture with its words, place and time); Always, "Counts are words"; Always, "Restraint in motion, colour and copy" (MS6); decisions 0104 (two moments; nothing captured inside a thread), 0105 (the link mark), 0123 and MS2, MS21 (the pill, amended by 0253), 0240 (the editor comes first), 0251 (its line at the top, unchanged)
Verdict: aligned
Shape: as asked, reshaped by the owner's calls: Thread after the moment is kept, on the pill; no tag record, no mode
Precedent: Lightroom Classic's target collection (one key, a remembered target); Day One tags from the editor; Pinterest asks for a board at Save (all unverified; Google Keep's label menu verified). Departs from Lightroom mobile and the iOS album cameras: their choice comes before the shutter
Criteria: the shutter and the edge stack unchanged and one tap; nothing asked before a capture; a picker row never a bare picture; no count in the pill, the card or the acknowledgement; a thread is never made of one moment
Open: the keep-threading mode, after use (not this slice)

## Decisions (the owner, Nov 21; decision 0253)

- **Thread goes on the after-capture pill**, a fifth one-tap button, before ×, on the walk screen and Navigate's ready
  screen, for every kind of moment; with Group captures on, the "Adding to this moment" line carries it beside New
  moment. It acts on the whole moment. Not in the photo editor (0240).
- **The card opens on the thread last added to**, first and one tap, under "Last added to", with a search field over
  threads and moments, closed (no keyboard) until tapped. "Last added to" is the newest `thread_member.added_at`;
  nothing new is stored.
- **One tap per capture.** No mode; nothing is captured "inside" a thread (0104 holds). A keep-threading mode is a later
  question, after use.
- **A thread still needs two moments** (0104, OT6). For the first of a series, A new thread lists this walk's moments
  too, newest first, a photo or video with its small picture; once two are connected, "Name this thread (optional)"
  with "Leave it unnamed" and Done.
- **Built now** (the owner, in person, Nov 21: "Build it now (Recommended)").

## Mock-up

Drawing: https://claude.ai/artifact/LopMYhJDtvUrVEGFrViKce (`docs/mockups/threading-at-capture/`: the pill at 390 and
320 px, Group captures on, the card on Last added to, searching, this walk's moments with pictures, the name step).
Approved: with G11, "Approve as drawn (Recommended)" (the owner, 2026-11-21): the search closed until tapped; Thread
before ×; "Last added to", "Leave it unnamed", "The two moments are a thread now."

## Criteria

1. **TK1** (the owner's task: "quickly thread a moment captured at the point of accept") After a moment is kept on the
   walk screen or Navigate's ready screen, the Add to this moment pill offers a fifth button, Thread (the `link` mark,
   spoken "Add this moment to a thread"), before ×, one tap; the pill's words do not change. **Finding:** someone not
   told where it is finds it on the pill that appears after the capture, by the link mark, the mark the viewer's Add to
   a thread already carries. At 320 px the pill's buttons take two rows, × on the second, as the approved drawing shows
   (the owner's exception to "nothing wraps at 320 px", decision 0253's mock-up).
2. **TK2** With Group captures on, the "Adding to this moment" line offers Thread (the same mark and spoken name)
   before New moment, the words wrapping beside them as drawn.
3. **TK3** Thread opens Add to a thread for the moment just kept, the whole moment with its pieces, drawn over the
   screen, never a Modal over a Modal; closing it (×, Escape, Back) leaves the pill and the capture stack as they were.
4. **TK4** The thread last added to (the newest `added_at` among the owner's visible threads) is the first row, under
   the words "Last added to", one tap to add; nothing new is stored. With no thread yet, there is no such row. Top to
   bottom, as drawn: the search field, "Last added to" and its row, A new thread, the other threads (steward S4).
5. **TK5** A search field ("Search threads and moments"), not focused when the card opens, finds threads by their name
   or their heading's words, and moments by words, place or date; a found thread adds the moment to it, a found
   moment starts a thread of the two, under the words "Threads" and "Moments", threads first. An empty search shows the
   list; a search that finds nothing says so in words.
6. **TK6** A moment of the walk still open is offered, newest first, and a thread of this walk's moments is listed, in
   the card from the pill and from the viewer's More (the DEFERRED line answered).
7. **TK7** A photo or video row shows its small picture beside its words (or its kind's word) and its place-and-time
   line, never the picture alone; a memo or note keeps its words.
8. **TK8** A new thread still needs two kept moments (OT6); once made, the card says "The two moments are a thread
   now." with an optional "Name this thread" field, "Leave it unnamed" and Done: Done saves what was typed, an empty
   field leaves it unnamed, and nothing names it for the owner.
9. **TK9** "Connected" is said once, with no count (the name step's heading, or the host's line after an add to an
   existing thread); a thread holding the moment is shown disabled, "This moment is in it". No digit but a date leaves
   the pill, the card or the acknowledgement (steward S3).
10. **TK10** A journey (`capthread`): on the walk screen two photos, the second threaded with the first from the pill
    and named "Murals", a third added with Thread and the first row; the thread holds all three.
11. **TK11** (failed) An add or a new thread that cannot be made says "Could not connect" and changes nothing; a name
    that cannot be saved leaves the thread unnamed and the card says so ("Could not name it") with the field kept.

## Every surface (decision 0167)

- `AddToMomentPill` is drawn by `src/app/walk.tsx` (the walk) and `src/components/MomentBar.tsx` (Navigate, ready):
  both carry Thread (TK1, TK2).
- `AddToThread` is drawn by the viewer (`CaptureView.tsx`, More's Add to a thread), Memories (`MemoriesScreen.tsx`,
  the journal's Thread slot) and, new, the two pill hosts. All four get TK4-TK9 and TK11: the card is one component.
  The name step (TK8) shows in every host; the hosts say nothing more after it.
- The recording bar's minimized band and Chronicle's open line have no Add to this moment pill (MS2's hosts only);
  Thread is not there.

## How adjacent apps do it

- **Google Keep (web)**: a note's More, "Add label", a checklist of labels with a filter field and Create. Source: support.google.com/keep/answer/6191044. **Verified**.
- **Lightroom Classic**: a collection set as the Target Collection; B adds the selected photos to it, one key to a remembered target. Source: from memory, unverified. **Unverified**.
- **Pinterest**: Save asks for a board each time on mobile, the last board used offered first. Source: from memory, unverified. **Unverified**.
- **Lightroom mobile, Cam Albums (counter-example)**: an album chosen before the shutter, every shot filed there. Source: from memory, unverified. **Unverified**.

Ours files after the moment is kept, as Pinterest and Lightroom Classic do, and remembers the last target; it departs
from the album cameras because a choice before the shutter is a capture behind an extra tap (VISION.md, Never).

## Steward (Nov 21)

S3 accepted (TK9: "no digit but a date", the house rule; the card's rows carry dates). S4 accepted (TK4, TK5: the order
the approved drawing shows). S2 rejected: the owner approved the card drawn over the screen at full width (TK3), as the
note page both hosts already open; it is closed by ×, Escape or Back, and opened only after the capture, never before
it. S1 deferred to the owner: two photos of the walk still open read alike but for their pictures ("Photo / Nov 21 ·
From Saturday afternoon walk"), since an open walk has no place yet; giving each its time of day changes words beyond
the approved drawing, so it is filed as an inbox entry, not built here. Silent: the name field takes the keyboard as
drawn (NameAfter shows it up, "Leave it unnamed" one tap); the pill's two rows at 320 px and the Group captures line's
wrapping are as drawn and approved.

## Record

In progress (tests first).
