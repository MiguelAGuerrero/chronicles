<!-- Repo first: written from the owner's request in a session (Nov 11), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Response thread: a moment's responses in a sheet of their own

Nov 11, 2026 · @Miguel Guerrero

A reply to a moment is a moment of its own, linked to the one it answers (owner threads, decision 0104). Today the
only way to read a moment with what it drew out of you is the whole thread's screen on Memories. The owner wants the
responses to one moment in a dedicated context: a sheet pulled up over the viewer, read top to bottom like a
conversation, each response with its time. The viewer stays for that one moment and nothing more.

## Vision

Idea: A moment's responses open in a sheet of their own, pulled up over the viewer, read oldest first like a conversation, each response with its time, so the viewer stays for that one moment and the linked data has its own context.
Verb: return (a moment given back with what it drew out of you since), honour (each response keeps its own place, time and walk).
Touches: Always "A moment carries its context" (a chat timestamp alone is not enough); Always "Counts are words" and Never "Tallies" (no "5 replies"); Never "Nagging" and "Celebration" (no unread, new, typing, receipts, avatars, reactions, badges); Always "Restraint" (plain ink, no coloured bubbles); precedents 0104 (a reply is a moment plus a directed link; nothing new is stored), 0114 and OT27 (nothing sits over the moment; a swipe is only a shortcut to something visible), 0105 (both kinds are threads); `ui-patterns.md` S2 (one modal at a time; inside the viewer, an overlay, never a Modal on a Modal).
Verdict: aligned if reshaped
Shape: A bottom sheet drawn inside the viewer's own Modal, opened from a visible control (the info line's words and More's Responses), with the swipe up as a shortcut. The moment first, then its responses oldest first, each under what it answers, as plain timeline entries with time, place, walk line and content; a tap opens a response in the viewer with Back. Respond in the sheet's bottom bar answers the sheet's moment. A moment with no responses has no sheet and no way in. Nothing is stored.
Criteria: RT1-RT14 below.
Open: none (answered Nov 11, see Decisions).

## Decisions (the owner's calls, Nov 11, decision 0131)

- **A sheet of its own, not more viewer.** The viewer is for one moment only; the responses are linked data with their own context. The sheet is pulled up over the viewer, like a phone's conversation thread, top to bottom, each response timed.
- **The way in is the info line's words and More's Responses**, with the swipe up as the shortcut (gate, Nov 11; a gesture alone is never the only route, `ui-patterns.md`).
- **Respond lives in the sheet too**, so a response can be made while reading; it answers the moment the sheet was opened for.
- **Two departures from the matrix, on this call** (steward S10; accepted Nov 11, decision 0131): a sheet whose entries lead to a moment (matrix 11 avoids "sheets used to navigate"), and long content in a full-height sheet (matrix 24); both as iMessage's focused reply view (`docs/research/ui-teardown.md` (c)).
- **The swipe up as in iOS Photos**, where a phone user expects it; **the moment shows twice** at half height, its first entry short (context line and a few words); the thread screen's note bubbles stay as they are.
- **Entries, not bubbles:** plain ink timeline entries, each with its time, place, walk line and content; no bubble or colour says who wrote it.

## Criteria

1. **RT1** A moment that has responses (a kept moment that answers it, or answers one of its responses) offers **Responses** in its viewer's More menu, and its viewer's info line names them in words ("a couple of responses") as a button that opens them. A moment with no responses shows neither.
2. **RT2** A swipe up on the moment in the viewer opens the same sheet when the moment has responses, and does nothing when it has none; a swipe left or right still steps a stack's pieces, on the web too. Every use of the sheet is also reachable without the swipe.
3. **RT3** The responses open in a sheet drawn inside the viewer, never a second Modal and never a new route. It opens at half the screen, drags to full, and closes with a drag down, its Close button, Back on Android or Escape on the web; closed, it leaves the viewer as it was.
4. **RT4** The sheet lists the moment first, then every response oldest first. A response to a response is listed in time order like the others and says which one it answers in words: its time, place and walk line (`answeringLine`), never a picture alone; a response to the moment itself says nothing more (steward S2).
5. **RT5** Every entry shows its date and time, its place, or that none was kept, in words, never a blank (steward S1), its walk's line when it has a walk ("From Sunday morning walk"), and its content: a note's whole text, a photo's or video's small picture, a memo's length and kind. No entry is a bare thumbnail, filename or count.
6. **RT6** A tap on a response opens that moment in the viewer, alone, with a Back that returns to the sheet where it was; a tap on the first entry (the moment itself) lowers the sheet (steward S6).
7. **RT7** The sheet's bottom bar has **Respond**, the same pull-down of Photo or video, Voice memo and Note. A response made there is kept by the capture's own path, answers the moment the sheet was opened for, joins that moment's thread (OT2), and appears at the end of the sheet once kept, like the others: no toast, highlight, colour or haptic; the sheet only scrolls it into view (S4). The camera and the note editor open as the viewer's own overlays with the sheet beneath, never a second Modal; Cancel or Save returns to the sheet at the same height (S5).
8. **RT8** A response deleted (from its own viewer opened from the sheet) leaves the sheet at once and comes back with Undo (UC4); the responses that answered it alone are no longer this moment's while it is gone. When the last response goes, the sheet closes and the way in goes with it, and Back from the response's viewer lands on the moment's viewer with no sheet (steward S6).
9. **RT9** The sheet's own words have no digit but a date or a time; the info line's size is one of a fixed set of words ("a response", "a couple of responses", "a few responses", "several responses", "many responses"), never a number word above "a couple"; that set has its own test, and the four-phrase thread size set and its test are unchanged (steward S9).
10. **RT10** No unread, new, typing, read-receipt, avatar, reaction or badge mark appears in the sheet or the info line; entries are plain ink, and no bubble, colour or side tells one entry's author from another's; no entry names a thread or carries a thread mark (steward S7).
11. **RT11** Nothing interactive sits over the moment's photo, video or card while the sheet is closed (OT27): the info line's words are the viewer's only new control, inside the info line; no row wraps on a 320 px phone, and with "In a thread" shown the info line keeps to two lines at 320 px, the responses' words last (steward S8; amended Nov 11: one line cannot hold the kind, the date and both phrases at 320 px).
12. **RT12** Opening, reading and closing the sheet write nothing.
13. **RT13** A response made on a walk still open is listed with its time, its content, the walk's line from its start as any walk's is ("From Wednesday morning walk"), never a made-up name, and no replay link (fix thread-in-walk; steward S3).
14. **RT14** The sheet reads only the owner's replies (`moment_link`), never the Chronicle's derived threads or words (OT19).

## Record (Nov 11)

Built on `claude/elegant-cannon-gs9yrk`: tests first in `ca11e7d`, the build in `7a01416`.
- **Unit** (`src/lib/__tests__/threads/responses.test.ts`): RT1, RT4, RT8, RT9, RT13, RT14.
- **Journey** `responses` (`E2E_ONLY=responses`): RT1, RT2 (with a swipe across a stack), RT3, RT5, RT6, RT7, RT8, RT10, RT11 (at 390 and 320 px), RT12; shots 90-94.
- **Found on the way:** the viewer's touch handlers read `nativeEvent.pageX`, which the web's TouchEvent does not have, so the swipe across a stack's pieces (MS10) never worked on the web; both swipes now read `touchPoint`. A `SheetFrame` inside a Modal read Escape twice and closed the viewer too (`ownKeys`).
- **Amended:** RT11's info line keeps to two lines at 320 px, not one (one line cannot hold the kind, the date and both phrases).
- **Deferred:** `docs/DEFERRED.md` (response thread). **Native, never run on a device:** `docs/NATIVE_UNVERIFIED.md` (RT2, RT3, RT7).
- Not audited (decision 0074).

