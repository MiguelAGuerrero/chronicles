# Response thread: plan

For the owner's review before any code (`/slice` step 3). Spec: `specs/response-thread/spec.md` (RT1-RT14).

## What it builds on

- **Data:** nothing new. A response is a moment with a `moment_link (from_id → to_id)` (owner threads, 0104). The
  sheet reads `useThreads()` (links, with what waits in Undo already gone) and the moment pool. **No migration, no
  IndexedDB version, no new truth or cache.**
- **The drawer:** `SheetFrame` (`components/HomeSheet.tsx`), the app's one drag frame (Animated + the responder
  system, the same on phones and web; Back and Escape lower it). Used at `half` and `full`; its `peek` is read as
  "closed". **No new library**, no Reanimated (`motion-polish.md`).
- **Respond:** the viewer's one `ReplyDock` (one recorder per open viewer, owner-threads audit 10). The sheet stops
  above the docked toolbar, so the toolbar *is* the sheet's bottom bar (RT7); while the sheet is up the toolbar shows
  Respond only (Edit is the moment's, not the sheet's).

## Files

| File | Layer | What |
|---|---|---|
| `src/lib/threads/responses.ts` (new) | core | `responsesOf(rootId, links)`: every moment that answers the root or one of its responses, cycle-safe; `responseRows(root, moments, links)`: the root, then the responses oldest first, each with the response it answers when that is not the root (RT4) |
| `src/lib/threads/lines.ts` | core | `responsesWord(n)`: "a response" … "many responses" (RT9) |
| `src/components/threads/ResponsesSheet.tsx` (new) | view | `SheetFrame` at half/full inside the viewer; a header ("Responses", Close); the entries (RT4, RT5, RT10, RT13); a tap opens an entry (RT6) |
| `src/components/threads/ResponseEntry.tsx` (new) | view | one entry: time, place, walk line, content (a note's text through `NoteText`, a photo's or video's small copy, a memo's length), "answering …" when it answers a response |
| `src/components/threads/useMomentPool.ts` | view | also hold the moments of a walk still open (`openWalkViews`, as Memories does since fix thread-in-walk), and read again when the links change, so a response kept from the sheet shows (RT7, RT13) |
| `src/components/CaptureView.tsx` | view | More's **Responses**; the info line's words as a button (a `parts` entry may be `{ text, onPress }`); the swipe up beside the existing swipe across (RT2); the sheet's state, closed on Back/Escape before the viewer; an entry opened goes on `openedStack`, and Back returns to the sheet (RT6) |
| `scripts/e2e/journeys/responses.js` (new) | e2e | the journey for the screens (below) |
| `scripts/features.js` | | the spec under `threads`; the journey under `threads` |
| docs | | `.claude/rules/threads.md`, `captures-and-media.md` (the viewer), `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/STATUS.md`, `docs/NATIVE_UNVERIFIED.md` |

About 8 source files and 1 journey.

## Tests per criterion

Feature folder: `src/lib/__tests__/threads/`; journey: `responses`.

| Id | Where | Test name |
|---|---|---|
| RT1 | unit `responses.test.ts`; journey | `RT1: a moment answered, directly or through a response, has responses; one never answered has none`; journey `RT1: More has Responses and the info line names them, only on a moment with responses` |
| RT2 | journey | `RT2: a swipe up opens the sheet on a moment with responses, does nothing on one without; a swipe across still steps the pieces` |
| RT3 | journey | `RT3: the sheet is inside the viewer (one dialog), opens at half, drags to full, closes with a drag down, Close and Escape` |
| RT4 | unit | `RT4: the moment first, then every response oldest first; a response to a response says which it answers` |
| RT5 | journey | `RT5: every entry shows its date and time, place, walk line and content` |
| RT6 | journey | `RT6: an entry opens alone in the viewer and Back returns to the sheet` |
| RT7 | journey | `RT7: a note kept from the sheet's Respond answers the sheet's moment and shows at the end of the sheet` |
| RT8 | unit; journey | unit `RT8: a response gone (or waiting in Undo) leaves, and the responses that answered only it go with it`; journey `RT8: delete a response, it leaves the sheet; Undo brings it back` |
| RT9 | unit | `RT9: the size words are the fixed set and no digit leaves responsesWord` |
| RT10 | journey | `RT10: no badge, unread or avatar mark, and every entry has the same ink and the same alignment` |
| RT11 | journey | `RT11: with the sheet closed nothing interactive sits over the photo; the toolbar fits on 320 px` |
| RT12 | journey | `RT12: opening, reading and closing the sheet writes nothing to IndexedDB` |
| RT13 | unit (`poolWithOpenWalks`, the pool's pure step); the journey seeds no open walk (it would bring the walk screen up at launch), deferred | `RT13: a response on a walk still open is listed, with no replay link` |
| RT14 | unit (`threads/arch.test.ts` already holds lib/threads to no resurface import) | `RT14: responses reads only moment_link` |

Every test is written first as a todo and committed alone (`Response thread: tests first (RT1-RT14, failing)`).

## Screens and actions

The viewer (changed) and the sheet (new). The matrix is `docs/research/ui-references.md` section 2, and the
precedents are in `docs/research/ui-teardown.md` (c).

| Action | Goal, how often | Control | Matrix row | Precedent |
|---|---|---|---|---|
| See a moment's responses | Return to what a moment drew out; occasional | The info line's words ("a few responses"), a button inside the info line | 11 (navigate to a related item: a link in content) | Teardown (c): "a quiet line under the original that opens the thread, in words, not a number" |
| The same, from the menu | Same; for whoever looks in More | More → Responses | 3 (secondary action in More) | |
| The same, quickly | Power use | Swipe up on the moment | 25 (a swipe plus the same thing without it) | iMessage's swipe to reply (verified) |
| Close the sheet | Constant | Close in its header, drag down, Back, Escape | 23 (a close control plus swipe down; never a grab handle alone) | |
| Open a response | Occasional | Tap the entry; Back returns to the sheet | 11 (push with the standard Back) | **Departs:** matrix 11 lists "sheets used to navigate" under Avoid. The opened moment is pushed onto the viewer's own stack, not the sheet's, and Back lands on the sheet where it was. Your Nov 11 call (a dedicated sheet) is the reason. |
| Respond while reading | Occasional | The docked Respond, a pull-down of three kinds (unchanged) | 1, 5 | |
| Read a long thread | Occasional | The sheet at full height, scrolling | 24 | **Departs:** matrix 24 lists "long or complex content in a sheet" under Avoid. A full-height sheet is iMessage's focused reply view (teardown (c)). Your Nov 11 call is the reason. |

## Deferred

- **Deeper nesting.** A response to a response is listed in time order and says what it answers (one level, as the
  thread screen does). A tree view is out of scope.
- **The sheet from other surfaces** (Lately's card, the thread screen's rows): the viewer is the only way in for now.
- **A response's own responses inside the sheet:** opening a response shows its viewer, whose own info line opens its
  own sheet. The sheet does not expand in place.

## Native, never run on a device

- The swipe up on the viewer, read by the responder system beside the swipe across, under a video's own controls.
- `SheetFrame` inside the viewer's Modal on iOS (an overlay, so no Modal over a Modal), its spring, and Back on
  Android closing the sheet before the viewer.
- Each goes into `docs/NATIVE_UNVERIFIED.md` as a `- [ ] **Do:** … **Expect:** … (RT2, RT3)` item.

## For you to decide

1. **Notes as bubbles?** A parallel fix this morning (`fix thread-log`, on `main` now) draws a note in the
   owner's thread screen as a `NoteBubble`. You chose plain entries for the sheet. The two would then differ: a note
   is a bubble on the thread screen and a plain entry in the sheet. I recommend keeping your sheet call and leaving
   the thread screen as it is. Say if you want them to match.
2. **The two departures** in the table above (a sheet that leads to a moment; long content in a sheet) rest on
   your call. I'll record them in a decision record if you accept them.
3. **The swipe up.** iOS Photos uses a swipe up on a photo for its info. Taking it for Responses is fine inside this
   app, but it means a swipe up on a moment with no responses does nothing (RT2). Keep it?
4. **The moment twice.** At half height the moment shows behind the sheet and again as its first entry. I recommend
   keeping the first entry (a full-height sheet then still opens on what is being answered), shortened to its
   context line and a few words. Say if you'd rather the sheet start at the first response.

## Steward (Nov 11): no breach; 5 drifts, 4 gaps, 1 tone, all accepted into the criteria

| # | Finding | Triage |
|---|---|---|
| S1 | An entry with no place says nothing about it | Accept → RT5: says so in words |
| S2 | "says which one it answers" has no shape | Accept → RT4: in words through `answeringLine`, never a picture alone |
| S3 | An open walk has no line | Accept, reshaped → RT13: `fromLine` from its start, as any walk; never a made-up name |
| S4 | A new response could be celebrated | Accept → RT7: no toast, highlight, colour or haptic |
| S5 | Respond inside the sheet stacks overlays | Accept → RT7: the viewer's own overlays, the sheet beneath, back at the same height |
| S6 | The first entry and Back after the last delete | Accept → RT6, RT8 |
| S7 | A thread's name could reach an entry | Accept → RT10 |
| S8 | The info line could crowd | Accept → RT11: one line at 320 px, the responses' words last |
| S9 | The fifth size word meets the four-phrase test | Accept → RT9: its own test, the thread set unchanged |
| S10 | The departures live only in the plan | Accept → the spec's Decisions; a decision record once you accept |

The steward also left three questions open; they are in "For you to decide" (3, 4).
