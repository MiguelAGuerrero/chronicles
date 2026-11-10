<!-- Repo first: written from the owner's request in a session (Nov 5-6), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The owner's calls are decision 0104. -->

# Owner threads: respond to a moment, connect moments across walks

Nov 6, 2026 · @Miguel Guerrero

Back in an area where moments were kept, the owner wants to answer one, and to connect moments across days, walks and places so that recall has something to follow (the example: every time someone compliments their physique). A moment stays whole; a connection is a separate record the owner makes. The Chronicle's own derived threads (decision 0098) are a different, computed thing and stay independent of these.

## Vision

Idea: Respond to a moment, and connect moments across walks into threads the owner makes, kept separate from the moments and from the Chronicle's own suggestions.
Verb: return (it gives moments back as a thread across days and places), honour (a reply is a new moment, kept where and when it happened, in context).
Touches: Never "Celebration" and "Nagging" (no new-reply cue, no unread mark, no pill beyond the neutral Undo); Always "Moments and the trace are truth"; Always "A moment carries its context"; Always "Counts are words"; Never "Tallies such as '12 of 87'"; Never "Scores, streaks, completion, coverage"; Never "A capture behind a menu, a drawer or an extra tap"; Never "Writing the owner's words for them"; Never "Data leaving the device without a tap"; precedents 0098 (derived threads), 0037 (memories on revisit), 0104 (this slice's decision).
Verdict: aligned if reshaped
Shape: A moment is unchanged. `thread`, `thread_member` and a directed `moment_link` are separate stored records. A thread arises only from connecting existing moments and dissolves below two. A reply is a new moment that joins the thread. The Chronicle's suggestions stay computed and independent.
Criteria: OT1 (capture stays one tap), OT4 and OT9 (context on every moment), OT6 (no thread without two kept moments), OT10 (size in words), OT13 (the name is the owner's), OT14-OT17 (deletes), OT18 (truth), OT19 (the two kinds stay independent), OT20 (nothing leaves the device).
Open: none (OT23 and OT24 answered Nov 6). The reasons rest on decision 0104, not on VISION.md's **[proposed]** line, which the owner has yet to edit.

## Decisions (the owner's calls, Nov 5-6, decision 0104)

- A moment is a node and gets no new field. Linking or unlinking never edits it.
- Three stored records: `thread (id, name nullable, created_at)`, `thread_member (thread_id, moment_id, added_at)`, `moment_link (from_id, to_id, created_at)`. A moment may be in several threads.
- A thread is never created empty and never before a moment exists: there is no top-down thread. A place-rooted journal is a separate feature (`docs/DEFERRED.md`).
- A reply is a new moment with its own place and time, a directed link to the moment it answers, and it joins that moment's thread; if there is none, an unnamed thread of the two is made.
- A thread with fewer than two moments dissolves, name and all; the delete that causes it is undoable.
- Deleting a thread deletes its memberships only. Deleting a moment deletes its memberships and links only.
- **One word for both kinds, told apart by a mark** (Nov 9, decision 0105): the owner's threads and the Chronicle's suggested threads are both "threads"; an icon tells them apart, and an unnamed thread's heading may change as its moments do, and be renamed whenever the owner likes.
- A moment in an owner thread is eligible for the resurfaced card like any moment, with no thread name and no opt-out (Nov 6, OT23). A reply is placed where its author is when they write it (Nov 6, OT24).
- The Chronicle's suggested threads are computed, never stored, and neither reads the other kind. A suggestion becomes the owner's only by a tap, as a copy.

## Criteria

### Responding

1. **OT1** A moment's viewer has a toolbar docked under the photo, below its info line, with **Respond** (and **Edit** where the moment can be edited). Respond opens a pull-down menu from its button: Photo or video, Voice memo, Note (a tap outside closes it). The new moment is saved by the capture's own path with its own time and place (the fix, or placed later, as a moment outside a walk is). Capture from the edge stack takes the same one tap as before, with no thread step in front of it. (Amended Nov 9, decision 0114: Respond was a row of kinds on the viewer's face, one tap each.)
2. **OT2** Saving a reply writes a directed link from the new moment to the one it answers, and adds the new moment to the answered moment's thread. If the answered moment is in no thread, an unnamed thread of the two is made. If it is in several, the reply joins the one the Respond started from (OT3).
3. **OT3** Respond is offered from a moment seen in a thread (it answers that moment and joins that thread), from the viewer opened on a faint pin ("Memories here"), and from the viewer anywhere else (it answers that moment). (Amended Nov 9: the faint pin's preview carries no kinds of its own.)
4. **OT4** A reply is a moment like any other: it appears in Lately, its walk, its day and the map. It never appears as a bare note: its row names the moment it answers and when ("answering Oct 20, just after the bakery"). A reply whose answered moment is gone shows no "answering" line, only its own place and time (OT16). (Steward S4.)

### Connecting

5. **OT5** A moment's More menu has **Add to a thread**. It lists the owner's threads by name or by their first words, and **A new thread**, which asks for a second existing moment to join it with (a picker of moments by time, each row with its place and date and its walk line when it has one, searchable by the words in them). Nothing makes a thread without two existing moments.
6. **OT6** There is no way to make an empty thread, to start a thread before its first moment is kept, or to add something that is not a kept moment (a place, a walk, a street, a note typed into the thread).
7. **OT7** A moment can be in several threads. Adding it to a thread it is already in changes nothing.
8. **OT8** **Remove from this thread** takes one moment out of one thread, keeping the moment, its other threads and its links.

### Reading a thread

9. **OT9** A thread opens as a plain typographic timeline of its moments, oldest first, read like a conversation with yourself. Every moment shows its place and its time, and what came just before it (its walk's context line) when it has a walk; a moment with no walk shows place and date. Never a bare thumbnail, filename or count; the same holds for every row of the moment picker. (Steward S4.) A reply is set under the moment it answers.
10. **OT10** A thread's size is one of a short fixed set of words ("a couple of moments", "a few", "several", "many"), never a number word above "three", a digit, rank, total, streak or percentage; its span is "since March". No unread, new-reply or progress mark ever appears on a thread. Dates and times are fine. (Steward S3.)
11. **OT11** Where a moment is in a thread, its viewer's info line says "In a thread" without the name, and the More menu's **Open its thread** opens it. The viewer shows the thread's name only when it was opened from that thread. (Amended Nov 9, decision 0114: was a chip over the photo.)
12. **OT12** The owner's threads are listed on Memories in a block of their own beside the Chronicle's own threads (the 0098 rail), both headed **Threads** and told apart by a mark (OT25): the owner's ordered by the latest moment in them, and saying so, with no rank, count or progress shown. The Chronicle's threads are unchanged by this slice. (Amended Nov 9, decision 0105: was "their own heading", "Threads you made".)
13. **OT13** A thread has a name only the owner gives it: **Name this thread** in its menu, optional, editable, never overwritten. A thread with no name is headed by its oldest moment's place and date, with the first words of that moment as a second line; no heading is a clipped fragment on its own. (Steward S5.)

### Ending a thread

14. **OT14** **Delete this thread** removes the thread and its memberships and no moment, link or file. It acts at once and offers Undo until the pill is closed, as a moment delete does (amended Nov 10 by `specs/ui-conformance` UC4, decision 0113: it asked first).
15. **OT15** When a delete or Remove leaves a thread with fewer than two moments, the thread dissolves, name and all, at once; Undo of that delete brings back the moment and the thread with its name and members.
16. **OT16** Deleting a moment deletes its memberships and links and nothing else. A reply whose answered moment is deleted stays, as its own moment, in its thread if the thread still has two moments.
17. **OT17** Deleting a walk deletes the memberships and links of its moments in the same transaction, and dissolves the threads that leave.

### Truth and independence

18. **OT18** Threads, memberships and links are truth: stored, never derived, kept across any recompute of streets, areas, summaries, tile builds and `THREAD_RULES` bumps. A moment's own row is identical before and after linking.
19. **OT19** The Chronicle's derived threads (0098) are unchanged and never stored; they do not read the owner's threads or links, and the owner's threads do not read them. A Chronicle thread offers **Keep as my thread** (a tap), which copies its moments into a new owner's thread; the Chronicle thread itself is untouched.
20. **OT20** Nothing about a thread, a membership or a link leaves the device. No export, share or notification is added by this slice. A thread's name, or a title made from a thread, never appears on the resurfaced card, in Lately, in a notification, or in a share or reel. A reply sets no reminder: "Remind me here" stays opt-in per capture (0032). (Steward S2, Silent 3, 4.)
21. **OT21** The owner's threads survive a restart, a reload (web) and an app update: a migration adds the stores and never edits an existing one (SQLite and IndexedDB).
22. **OT22** The viewer's other behaviour is unchanged: Save, Open in Maps, edit, delete (with Undo), and every list's filter on moments waiting in Undo (`useHidden`).

### Resurfacing, and replying away

23. **OT23** A moment in an owner thread is eligible for the resurfaced card like any moment (the owner's call, Nov 6: no per-thread opt-out). The card, Lately and every notification never show the thread's name or a title made from it (OT20).
24. **OT24** A reply made away from the answered moment's place is placed where its author is, at the time they write it (one fix per moment, 0036); its row says "answering" and the answered moment's place, so both places are in the words.

### One word, two marks (the owner's call, Nov 9, decision 0105)

25. **OT25** Wherever a thread is listed or opened, a small mark says who made it: one icon for a thread the owner made, another for a thread the Chronicle suggests (from the user's own words, 0098). The mark is an icon in the ink colour, never a colour on its own, and it carries a spoken name ("connected by you", "found for you"). No accent colour, badge or count marks either kind. The Chronicle's threads keep their own words (0098) beside the mark.
26. **OT26** An unnamed thread's heading follows its moments (the place and date of its oldest, with its first words beneath) and may change as they do; the owner may name it, or rename it, at any time, and a name they gave never changes by itself.

### The viewer's actions (the owner's call, Nov 9, decision 0114)

27. **OT27** Nothing the viewer offers sits over the moment itself: the photo or video area, and a note's or memo's card, are clear of every loose button (a photo fills the screen and the bars sit over its margins, amended by `specs/ui-conformance` audit 28). Actions live in the top bar (Close, More), the docked toolbar (Respond, Edit) and the More menu; no row of controls wraps onto a second line on a 320 px phone.

## Record (Nov 6)

Built on `claude/owner-threads-decision`; not audited (decision 0074). Tests first: `Owner threads: tests first (OT1-OT24, failing)`. Unit tests in `src/lib/__tests__/threads/` (`core`, `shell`, `arch`) and the contract cases in `dbContract.ts` (OT14-OT18); the journey `threads` covers the screens. Typecheck, lint, `npm test` and the journeys `threads`, `resurface`, `deletion`, `edit`, `qol`, `walk` pass on the web build.

- **Built as written:** OT1-OT24.
- **Gate steward (Nov 6):** 1 breach, 4 drift, 1 tone, all accepted (see `plan.md`).
- **Choices made in the build, for the owner to confirm:**
  - The heading is **Threads** ("Moments you connected, the latest first"), beside the Chronicle's own Threads and told apart by a mark (decision 0105, OT25; it was "Your threads", then "Threads you made"); the Chronicle's rail keeps **Threads** ("Things you keep coming back to"). Two near names, as the plan warned.
  - **Respond** sat in a floating row under the viewer's top buttons, not at the bottom, because the viewer's own strip and card fill the bottom. Changed by the owner (fix respond-bottom, Nov 10): the row stands just above the moment's strip or card, with no "Respond" label; its place says what it is, and a reply note being written rises with the keyboard.
  - **Keep as my thread** keeps no name (audit 13): the Chronicle's is only a placeholder in the name field.
  - A reply made from a viewer opened during a walk belongs to that walk (audit 11).
- **Native:** every path is unverified on a device (`docs/NATIVE_UNVERIFIED.md`, "Owner threads").

## Audit (Nov 9)

19 findings: the auditor's 12 (F1-F12) and the steward's 7 (S1-S7, numbered 13-19). 16 accepted (14 fixed in full, 2 in part), 3 deferred, 0 rejected whole (parts of 9, 12 rejected). The steward found no breach. Triage, each fixed one behind a test named `owner-threads audit N` (unit in `src/lib/__tests__/threads/audit.test.ts`, or a check in the `threads` journey):

1. A reply's row says "answering" only in the thread: **accept**. A reply names what it answers in Lately too (`MomentCard answering`), and inside a thread even when the answered moment is outside it (`answeredBy`). Its walk, day and map surfaces are **deferred** (they draw captures as pins or day entries, not cards). Tests: `audit 1` (unit and journey).
2. Loose moments and replies show no place: **defer**. The app names a place only for a walk (`Walk.area`); a loose moment has a pin and a date and no place words anywhere. Giving it words is a new reading of where it was (an area lookup for a moment, a dataset), not a fix here. A thread headed by a loose moment shows its date. For the owner (DEFERRED).
3. The picker could not reach most moments: **accept**. Paged ("Show more"), found by words, place or date. Test: `audit 3`.
4. The picker offered moments waiting in Undo: **accept**. `useHidden` in the picker. Test: `audit 4`.
5. Remove ends a named two-moment thread with no ask and no Undo: **accept**. It asks first when it would end the thread (`removalDissolves`). Tests: `audit 5` (unit and journey).
6. Two replies at once made two threads: **accept**. Every read-then-write runs one after another (`serial`). Test: `audit 6`.
7. A reply lost or a ghost member when the answered moment is deleted mid-capture: **accept in part**. The kept check now runs just before the write, inside the chain (`audit 7`). A storage-level check that `applyThreads` ignores members whose moment is gone is **deferred**: the window is one round trip, and the views already ignore a member they cannot read.
8. A memo reply saved after the viewer closed missed the refresh: **accept**. Memories reads again when a thread's members change. Covered by the journey's flow and typecheck only.
9. Typed reply text lost on Back or Escape or a swipe: **accept in part**. Back closes the note first (`composeFor`); Cancel is tested on web (the web's viewer takes no Escape; Back is a device item). A swipe discards a note addressed to another moment on purpose: **rejected**.
10. Every swipe reloaded the threads and built a recorder: **accept**. The store is read once and the Respond bar is one per viewer. Covered by the journey's flow and typecheck only.
11. A Respond bar mid-walk (a reply made on a walk is not part of it): **accept**. The viewer's `walkId` (the open walk) is the reply's walk. Covered by the flow; native unverified.
12. One chip target, Keep twice, an open walk: **accept in part**. Keep makes one thread per tap (a guard); the chip opens the oldest thread, by design (**rejected**); the open-walk branch the auditor described does not exist in `MemoriesScreen` (**rejected**, not reproduced).
13. Keep as my thread stored the Chronicle's derived name as the owner's: **accept**. The thread is made unnamed, and the Chronicle's name is only the name field's placeholder. Tests: `audit 13` (unit and journey).
14. A reply made from a walk's viewer is placed outside the walk: **accept** (same fix as 11).
15. Your threads' order is a silent new-reply cue: **accept**. The order is said ("the latest first"). Test: the journey (`audit 15`).
16. An unnamed thread's second line clipped mid-word: **accept**. `clipWords` cuts at a word with an ellipsis. Test: `audit 16`.
17. A reply loses "answering" when its answered moment is kept but not in the thread: **accept**. Test: `audit 1`.
18. The two headings mislead: **accept**. Mine is **Threads you made** ("A thread you made"); the Chronicle's rail keeps its words. For the owner to confirm.
19. "Thread made" reads warm; the Respond label is unreadable on a bright photo: **accept**. "Connected"; the label has a dark pill. Journey `audit 19`.

**Left for the owner (the steward's Silent):** whether an unnamed thread's heading may change when an older moment is added (it does today); whether the "In a thread" chip may stand on every moment in a thread or should live in More; whether the picker should also search a memo's words once transcribed.

## Round 2 (Nov 9, decision 0105)

OT12 amended and OT25, OT26 added at the owner's word: "thread" for both kinds, an icon to tell them apart, an unnamed heading free to change and be renamed. Built as `ThreadMark` (a link for the owner's, a repeat arrow for the Chronicle's, in ink, with a spoken name); the choice of an icon over a colour is the build's, for restraint and screen readers. Unit test `OT26` (`threads/core.test.ts`); journey checks OT12 and OT25 (`threads`). Native: the marks' spoken names are on the device list.

## Round 3 (Nov 9, decision 0114)

The owner saw Respond on a phone: a row of buttons floating over the photo, wrapping onto two lines. "This UI is atrocious." The viewer now follows the standard photo-viewer pattern: a top bar (Close, More, and the existing Remind and Go here), a toolbar docked under the moment (Respond, Edit), and the More menu (Add to a thread, Open its thread, Save, Open in Maps, Delete). Respond opens a pull-down menu of kinds (first built as an action sheet; the HIG keeps action sheets for clarifying an action already started, M3 in `docs/research/ui-references.md`); a note reply uses the note editor titled Reply. "In a thread" is a phrase in the info line. A photo or video starts under the top bar, so nothing sits over it. OT1, OT3 and OT11 amended; OT27 added; tests first (`Viewer toolbar: tests first`), then the code. Checked by the `threads` journey (the action sheet, the dock on one row, no button over the note's card) and the `edit` journey (the photo between the top bar and the dock), and by looking at both screens at 390 x 844 (`73-viewer-toolbar`, `45-photo-viewer`).

The steward's S1 (Respond one tap from the face) is overruled by the owner: a reply is an action on a moment that exists, not the capture stack. Guardrails added: `.claude/rules/ui-patterns.md` and a screenshot review in `/audit` (the auditor and the steward open the pictures).

Left for the owner: the top bar still carries four round buttons (Remind, Go here, More, Close) on a photo. The patterns page says at most two actions and More; moving Remind and Go here into More is a change to Remind me here (R) and Go here (NH) and was not made here.

