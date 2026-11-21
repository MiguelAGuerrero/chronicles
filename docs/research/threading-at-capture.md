# Threading at capture: investigation (2026-11-21)

From: the owner's /investigate, 2026-11-21: "There should be a way to quickly thread a moment captured at the point of
accept whether that be like a little search bar, an annotation chip or something because I frequently noticed myself
capturing like murals and graffiti that I would like to sometimes [group] and trying to thread them after the fact is
kind of [onerous] since things are in timelines … it just seems time-consuming to just scroll back up and thread them."
(Dictated; the bracketed words are read from "Peru" and "owners expect".) Queued as G11. Status: built in thread-at-capture (`specs/thread-at-capture/spec.md`).

## What the owner saw

No picture. The flow, on the walk screen, as the code draws it today:

| Step | What is on screen | Code |
|---|---|---|
| 1. The shutter | The capture stack at the right edge, one tap | `src/components/walk/CaptureStack.tsx` |
| 2. "The point of accept" | The editor opens by itself once the shot is accepted, "Photo kept" where Revert sits, ✕ "Close, the photo stays as it is", Done | `src/components/edit/MediaEditor.tsx:179-204`; decision 0240 |
| 3. After the editor | The Add to this moment pill left of the stack: camera, mic, note, × ("Not now"); nothing about threads | `src/components/walk/AddToMomentPill.tsx:34-42`; hosted at `src/app/walk.tsx:1745`, `src/components/MomentBar.tsx:178` |
| 3b. With Group captures on | "Adding to this moment" and New moment | `AddToMomentPill.tsx:18-28` (MS19, MS21) |
| 4. Threading later, on the walk | Open the moment's pin, the viewer's More, "Add to a thread" | `src/components/CaptureView.tsx:1140-1148`, `:888` |
| 4b. Threading later, in Chronicle | The Thread slot under the entry | `src/lib/journal/actions.ts:23` |
| 5. The card | "Add to a thread": A new thread, then the threads by place-and-date heading; A new thread asks for a second moment with "Search words, places or dates" | `src/components/threads/AddToThread.tsx:115-175` |
| 5b. A photo in that list | the word "Photo" over a place-and-date line, no picture | `AddToThread.tsx:18, 26` |

## Why it reads wrong

1. **Nothing at capture offers a thread.** Threading starts only from the viewer's More (`CaptureView.tsx:1148`) or the
   journal's Thread slot (`journal/actions.ts:23`), so each mural means going back to it. The pill's offer was fixed by
   the owner as "camera, mic and note … nothing else to choose first" (MS2, decision 0123): a call to revisit, not a bug.
2. **The walk on screen cannot be threaded.** `AddToThread.tsx:77` builds its pool with `toMomentViews`, which skips
   every moment of a walk still open (`src/lib/resurface/views.ts:26`). Mid-walk, the earlier mural is not offered as a
   partner, and a thread made only of this walk's moments drops out of the list (`AddToThread.tsx:94`,
   `.filter((r) => r.oldest)`). Known and deferred, not the owner's call (`docs/DEFERRED.md`, "Threads the owner makes":
   "A moment of a walk still open is not offered by the picker"). The responses sheet already reads the open walk
   (`poolWithOpenWalks`, `views.ts:62-69`).
3. **A photo is a word in the picker.** `rowOf` gives a photo with no caption the word "Photo"
   (`AddToThread.tsx:18, 26`), so one mural is told from another only by its date and place line.
4. **The threads list has no search and no memory.** Search exists only on the new-thread step
   (`AddToThread.tsx:144-157`); threads are sorted by their newest moment (`:95`), not by where the owner last added,
   and an unnamed thread's heading is a place and date (`headingOf`, decision 0105), so "Murals" exists only if renamed
   later on the thread screen.
5. **One at a time, by design.** A thread needs two kept moments (0104, OT6) and nothing is captured "inside" one
   (0104): the owner's calls, kept below.

Never seen on a phone: the pill, the card's keyboard lift on the walk screen (fixed for Memories only, `threads.md`),
the walk screen's viewer. The card has run only on the headless web build.

## How adjacent apps do it

From `docs/research/adjacent-apps.md`, "File a moment into a group as it is kept" (new, this run):

- Google Keep (web): More, "Add label", check a label or Create. **Verified** (support.google.com/keep/answer/6191044).
- Google Keep (mobile): # offers labels as you type. Unverified.
- Day One (iOS): Tag from the editor while writing, existing tags offered; no recent tags. Unverified (host blocked).
- Pinterest: Save asks for a board each time on mobile; desktop suggests one. Unverified.
- Lightroom Classic: a Target Collection, B adds the selected photos. Unverified. The model for "last thread first".
- Lightroom mobile: an album's Camera captures into it. Unverified. A sequence mode, chosen before the shutter.
- Cam Albums, TidyCam, AlbumCamera (iOS): choose an album, every shot goes there. Unverified.
- Google Photos Group Camera: a review screen, then Add. Unverified.

Every one but Keep's menu files the item where it is made, and the quick ones remember a target. The modes put the
choice before the shutter, which is where Chronicles departs: "A capture behind … an extra tap" is a Never.

## Options

| # | The change | Answers | Vision risk | Rough cost |
|---|---|---|---|---|
| A | **Leave it** | none | none | none; each mural costs the pin, More, Add to a thread, and on a walk still open the partner cannot be found at all |
| B | Mend the card only: the open walk, pictures, search over threads, last thread first | 2, 3, 4 | none | S: `AddToThread.tsx`, `threads/picker.ts`; no native |
| C | B plus **Thread on the after-capture pill**, one tap, every kind | 1-4 | low: the pill's restraint (MS6) | M: B plus `AddToMomentPill.tsx`, `walk.tsx`, `MomentBar.tsx`; no native |
| D | C plus a **keep-threading mode**: every capture joins a chosen thread until off | 1-5 | medium: amends 0104 ("nothing captured inside a thread"), a state the walker must remember is on | M-L: a setting, the stack's words, `useCaptures` |
| E | **Tags** (annotation chips) as a new record beside threads | 1, 4 | high: a second grouping beside threads (0105 kept one word) | L: data model, migration, every list |

## The owner's calls

Asked in person, Nov 21:

1. *Where should a one-tap Thread go?* Offered: the after-capture pill (Recommended); the photo editor; both.
   **The pill.**
2. *What should the card show first?* Offered: the last thread and a search (Recommended); a search box first; the list
   as today. **The last thread and a search.**
3. *Should the app keep threading a series by itself?* Offered: no, one tap each (Recommended); a keep-threading switch;
   decide after using the first. **"One tap each, or I should be able to define a mode to toggle on or off … capturing
   [a] sequence; maybe that could be worth investigating if other products have something similar."** Read as: build
   the one tap; the mode is researched here (above: Lightroom mobile, the iOS album cameras) and left as the next
   question, after use.
4. *The first mural of a series?* Offered: pick the earlier one, this walk's moments with pictures, then an optional
   name (Recommended); a named thread of one (reverses 0104); two moments with no name prompt. **Pick the earlier one.**

Written: decision 0253 (amends 0123's pill, MS2, MS21). Mock-up drawn and approved (see "Open for the owner").

Engineering calls made here: "the thread last added to" is the thread of the newest `thread_member.added_at`, read
from truth, nothing new stored; the pool is `poolWithOpenWalks` (as the responses sheet); the picture is the moment's
existing small copy (`Picture`); the icon is the `link` mark the viewer's Add to a thread already uses (0105).

## The recommendation

Shape C, **M**.

```
## Vision
Idea: "A way to quickly thread a moment at the point of capture … instead of scrolling back up to thread them after the fact."
Verb: return (threads give moments back by likeness) and honour (the moment is grouped where it is kept, the walk not left)
Touches: Always, "Capture is one tap away on every screen you walk or capture from" (the shutter unchanged; Thread comes after, never before); Never, "A capture behind a menu, a drawer or an extra tap" (nothing is asked before a capture, no mode); Always, "A moment carries its context … It never appears as a bare thumbnail" (a picker row is a picture with its words, place and time); Always, "Counts are words"; Always, "Restraint in motion, colour and copy" (MS6); decisions 0104 (two moments; nothing captured inside a thread), 0105 (the link mark), 0123 and MS2, MS21 (the pill, amended by 0253), 0240 (the editor comes first), 0251 (its line at the top, unchanged)
Verdict: aligned
Shape: as asked, reshaped by the owner's calls: Thread after the moment is kept, on the pill; no tag record, no mode
Precedent: Lightroom Classic's target collection (one key, a remembered target); Day One tags from the editor; Pinterest asks for a board at Save (all unverified; Google Keep's label menu verified). Departs from Lightroom mobile and the iOS album cameras: their choice comes before the shutter
Criteria: the shutter and the edge stack unchanged and one tap; nothing asked before a capture; a picker row never a bare picture; no count in the pill, the card or the acknowledgement; a thread is never made of one moment
Open: the keep-threading mode, after use (not this slice)
```

**The slice (TC1-TC10):**

1. After a moment is kept on the walk screen or Navigate's ready screen, the Add to this moment pill offers a fifth
   button, Thread (the `link` mark, spoken "Add this moment to a thread"), one tap; the pill's words do not change.
2. With Group captures on, the "Adding to this moment" line offers Thread beside New moment (MS21 amended).
3. Thread opens Add to a thread for the moment just kept, the whole moment with its pieces, drawn over the screen
   (never a Modal over a Modal); closing it leaves the pill and the stack as they were.
4. The thread last added to (newest `added_at` among the owner's threads) is the first row, said "Last added to", one
   tap to add; nothing new is stored.
5. A search field over the threads finds a thread by its name or its heading's words, and the moments by words,
   place or date; an empty search shows the list.
6. A moment of the walk still open is offered, newest first, and a thread of this walk's moments is listed, here and
   from the viewer's More (the DEFERRED line answered).
7. A photo or video row shows its small picture beside its words and its place-and-time line, never the picture
   alone; a memo or note keeps its words.
8. A new thread still needs two kept moments (OT6); once made, an optional "Name this thread" field saves what the
   owner types, empty allowed, and nothing names it for them.
9. "Connected" is said once, with no count; a thread holding the moment is shown disabled, "This moment is in it".
10. A journey (`stacks` or a new `capthread`): on the walk screen two photos, the second threaded with the first from
    the pill and named "Murals", a third added with Thread and the first row; the thread holds all three.

Files: `src/components/walk/AddToMomentPill.tsx`, `src/components/threads/AddToThread.tsx`,
`src/lib/threads/picker.ts` (core: the last thread, the threads' search), `src/app/walk.tsx`,
`src/components/MomentBar.tsx`, perhaps `src/lib/threads/lines.ts`: six source files, no native module, no migration,
no new dependency.

## Done when

On the walk screen at 390 x 844 on the web build, after photographing a second mural, the owner threads it with the
first from the pill without leaving the walk (Thread, A new thread, the first mural by its picture), names it, and a
third mural joins that thread with two taps (Thread, "Last added to").

## What the slice will touch

- Layers: `lib/threads/picker.ts` is core (test first); `AddToThread`, the pill and the hosts are views; the shell
  (`threads.addToThread`, `startThread`, `rename`) is unchanged.
- Journeys: `stacks`, `threads`, `responses`, `edit` (the editor before the pill); `launch` as the smoke.
- Specs: `specs/moment-stacks/spec.md` (MS2, MS21 amended by 0253), `specs/owner-threads/spec.md` (OT5's picker).
- Rules: `.claude/rules/threads.md` (the picker's pool and the keyboard lift on a new host), `moments-and-days.md`.
- Checks first: `npm run check:affected`, then typecheck, lint, `npm test`.

## Open for the owner

Nothing for this slice. The mock-up (decision 0252) was drawn as a Design canvas,
https://claude.ai/artifact/LopMYhJDtvUrVEGFrViKce (`docs/mockups/threading-at-capture/`), today's screens from the web
build beside the change, and the owner approved it in person on Nov 21, "Approve as drawn (Recommended)": the search
closed until tapped, Thread before ×, two rows at 320 px, the words "Last added to", "Leave it unnamed" and "The two
moments are a thread now." (A first HTML drawing was superseded by the canvas.)

After it, from answer 3: whether a keep-threading mode is wanted once the one tap has been used
on a walk. If yes, it amends 0104 and goes through `/vision`; the precedents are the "choose an album, then shoot"
cameras above.

## Engineering unknowns

- The card on the walk screen: the keyboard lift was fixed for Memories' host (`threads.md`, fix picker-keyboard);
  the walk screen and Navigate's ready screen are new hosts, and `MomentPicker`'s own lift is still deferred.
- The pill's room at 320 px: four 44 px buttons already wrap under the label (`AddToMomentPill.tsx:56-57`); a fifth
  may need two rows.
- 0251's "Was this photo about X?" line at the top coexists with the pill; check both on screen at once.
- Native: the pill, the card and the small copies have never run on a phone.
