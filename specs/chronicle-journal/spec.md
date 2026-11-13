<!-- Repo first: written from the owner's request in a session (Nov 12), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The owner's calls are decision 0155. The approved drawing: https://claude.ai/artifact/GvCtF3iCjh1CksvojJcvoF -->

# Chronicle journal, cut 1: the page and the pen

Nov 12, 2026 · @Miguel Guerrero

Memories is a feed with three capture buttons at its foot, and the owner finds that the feed does not say "capture here". Memories becomes a journal: one sheet in the order moments were made, opening at today, ending in an open line where writing, a photo or a voice note is the capture. This is the first of four cuts (decision 0155); Walks, Days, Map and Media stay as they are in this one.

## Vision

Idea: Chronicle becomes a journal: a book in the order moments were captured, where writing in it is the capture (replacing the three buttons against the timeline), and which is the quiet way to be out: no walk, no trace, only what you write and where.
Verb: honour (a moment kept by writing on the page, with its time and its one fix), return (the page you write on is the page you read).
Touches: Always "Capture is one tap away on every screen you walk or capture from"; Never "A capture behind a menu, a drawer or an extra tap"; Always "A moment carries its context: place, time, its walk, what came just before"; Always "Restraint in motion, colour and copy: the content is the novelty, not the chrome"; Never "Writing the owner's words for them"; Never "All-day tracking" (0036); Never "Nagging"; Never "Scores, streaks, completion"; **[proposed]** "Browse standard, dwell diegetic ... A row that could appear unchanged in a generic journal app is wrong" (a reason, not a rule); precedents 0112 (the band), 0098 (resurfacing leads), 0123 (a moment holds several media), 0125 (a note references moments with @), 0131 (responses).
Verdict: aligned if reshaped
Shape: A typographic journal, never a costume: white ground, the app's ink, no paper, binding or page turns. Entries are prose without cards, each under a dateline that carries its context; the owner's words are set in a serif and everything the app says in its plain sans, so the app never appears to write in the book. The page ends in an open line that is always on screen: a caret, with the camera and the mic at its end, one tap each. Writing in the journal starts no walk and no trace; an entry reads one fix when it begins. New entries land only at the end; a past entry can be corrected or responded to, never inserted before. Reshaped from the owner's first telling in three places: the camera and mic stay one tap (a journal must not demote them behind the pen); the book is structure, not texture; and "controlling Navigate from the journal" became "the journal is the quiet mode, Navigate is the walk".
Criteria: JN3-JN5 (context, two voices, no cards), JN9-JN11 (one tap, no hint, no prompt, no location at open), JN12 (one fix at the entry's start, no trace), JN17 (the past is fixed), JN20 (the slip never leads or nags), JN22 (restraint), JN2 (no empty days, nothing counted).
Open: the owner's remark of Nov 12 that a moment need not belong to a walk (an association by time and place, read at recall) is a change to the data model; it is recorded in decision 0155 as a direction and is not part of this cut.

## Decisions (the owner's calls, Nov 12, decision 0155)

- **The journal is the whole Chronicle tab**, built in four cuts. This spec is the first: Memories becomes the page; Walks, Days, Map and Media stay.
- **Typographic**, in book order (oldest above, newest below), opening at today.
- **Quiet mode is the journal.** No walk and no trace starts from it; a walk is started from Navigate.
- **One moment** for pieces made right after each other (0123's rules), without the setting.
- **Edit and respond only** on past pages.
- **The serif is the phone's own**; no font is bundled.
- **What is written during a walk shows on the page at once**: a moment is a moment, whether or not a walk is recording.
- **Threads, Your threads, Hidden and the resurfacing options go behind the contents button.**
- **The open line accepts @ references** (0125), so a moment can be recalled and referenced while writing.
- The approved drawing fixes: no hint text on the open line; the fix at the entry's start; "Kept as you write" with Done.

## Criteria

### The page

1. **JN1** Memories shows every kept moment as an entry on one sheet, in the order made: older above, newer below, ties by id. It opens at the foot, with the latest entry and the open line on screen without a scroll. Scrolling up goes back in time; older entries load as they are reached, and the entries on screen do not move when they do. A long journal draws only its latest page of entries when it opens, and never reads media for an entry that is not drawn.
2. **JN2** Each day that has an entry begins with its date in full ("Thursday, November 12") as a heading. A day with nothing does not appear, and nothing says how long it has been since an entry or how many there are. Today's date always shows, with nothing under it but the open line when nothing was kept today. A journal with nothing kept at all is today's date and the open line: no other button, no sample entry, no prompt.
3. **JN3** An entry has no card, border or tile around it. It is its dateline, then its pieces in the order captured: words as prose, a photo or video set into the column, a voice memo as one line with play and its length. A moment with several pieces is one entry under one dateline, with every piece shown.
4. **JN4** The owner's words (a note, a caption, the open line as it is typed) are set in the platform's serif. Everything the app says (the date heading, a dateline, a memo's line, "answering …", an error, the words a reference reads as wherever a note is shown as plain text) is set in the app's sans: the day's heading in the ink, as drawn, and the rest in the muted ink. No sentence the app composed is ever set in the serif, and no entry text is generated. (Steward 9.)
5. **JN5** A dateline says when, and where once it is known: the time alone until the moment's context is read, then its arrival line. Today's entries read "8:15 this morning · Elm Street, by the bakery"; an earlier day's give the clock time; an entry made on a walk says so, open or finished ("40 minutes in, just after the bakery"). It never claims a place that was not read, and says "No location", or "No location (location is off)", when the fix never came. An entry belongs to the day it began. (Steward 5, 11.)
6. **JN6** A tap on a placed entry's dateline, which wears a small pin, shows that moment on Chronicle's Map, framed around where it was made; Show on the map in the entry's More does the same. A tap on the entry itself opens it in the viewer, as a moment opens today. An entry with no place offers only the viewer.
7. **JN7** An entry from a finished walk keeps its line to that walk ("From …"), which opens the walk's replay, as Lately's cards do today.
8. **JN8** With a walk recording and minimized, an entry made in the journal shows on today's page at once and stays there when the walk stops. It is also the walk's: it shows on the walk screen and plays in the walk's replay.

### The pen

9. **JN9** The open line is fixed at the foot of Memories at every scroll position, and in a thread, one of your threads and Hidden when they are open, above the tab bar and above the recording bar when a walk is minimized. It holds an empty text field with a still ink mark where writing begins, then the camera, then the mic. From launch each is one tap, with no tab, menu, drawer or scroll first, and it works while the page loads and after the page failed to read; an entry kept then is drawn on those states too. Any capture from the line brings today's foot into view, so what was kept is seen: from a thread or Hidden the page comes back once something is kept. (Steward 1, 6, 11.)
10. **JN10** At rest the line's only hint is a muted placeholder, "What’s on your mind?" (the owner's call, Nov 13, decision 0165, amending 0155); it shows no accent colour, no number and no prompt copy, and nothing on the page invites, reminds or nudges the owner to write. Each control is at least 44 pt and has a spoken name ("Write an entry", "Add a photo or video", "Record a voice note"). The keyboard is not raised when the app opens.
11. **JN11** Opening the journal reads no location. A tap in the line brings today's page to the foot and raises the keyboard.
12. **JN12** The first character typed begins an entry on today's page with that time. With no walk open, one fix is read for it, and the dateline gains its place when the fix comes; an entry begun by the camera or the mic reads its one fix the same way. Deleting every word before the fix arrives cancels the read, and writing again in the same sitting asks no second one. With a walk open no fix is read: the entry is placed from the walk's trace, as the walk's captures are. Writing never waits for a place, nothing tracks before, between or after entries, and no walk or trace starts. (Steward 4.)
13. **JN13** An entry is kept as it is written: there is no Save. What was typed survives leaving the page, a reload (web) and the app being closed mid-sentence, after which the words sit on the page as an entry and the line is empty. With the keyboard up, the line rides above it as one row: the field, the camera, the mic and Done, with "Kept as you write" in the app's voice; Done lowers the keyboard and ends the entry. If a save fails, the row says so in place of "Kept as you write" and holds the words for Retry. An entry whose words are all deleted, with no other piece, is not kept. (Steward 10.)
14. **JN14** The camera keeps a photo or video and the mic a voice note, each landing on today's page at once. While a note records, Stop & save, Discard and the timer take the mic's place only: the field and the camera keep their boxes and still work. The words typed before the mic stand on the page as their own piece once the note starts, and a tap on the camera mid-note saves the note first, then opens the camera. Leaving Memories, opening an entry, the contents or a replay saves the note first, and nothing plays over a recording. A note under a second is dropped with "Too short, not kept". (Steward 2.)
15. **JN15** Pieces made right after each other are one entry: a photo and the line typed under it, or words and then a voice note, share one dateline, place and moment. The open entry is the last on the page, with the writing mark under it. It ends on Done, two minutes after its last piece (for words, the last keystroke, so a pause never splits a sentence being typed), when Memories is left, or on a walk once the trace has gone 100 m from where it began; the next piece then begins a new entry. A response is always an entry of its own, and no two kept entries are ever merged. While an entry is open its viewer offers Add to this moment, as MS12 says. This holds whatever the walk's "Group captures into one moment" setting says, takes no new fix, and shows no count. (Steward 3.)
16. **JN16** Typing **@** in the open line opens the moment picker; the chosen moment is embedded at that point as a reference, removed whole by one delete. On the page a reference is drawn as RF4 says, whole: the referenced moment's first piece, kind, date and place, and its walk, never a bare thumbnail; a tap opens that moment, and a deleted one reads "A moment no longer kept". The reference is stored as 0125 says: in the note's text and nowhere else. (Steward 8.)
17. **JN17** A new entry can only be made at the end. No control inserts an entry on a past page or changes an entry's time or place. A past entry's words can be corrected in its viewer, and a response to it is a new entry at the end, which says what it answers.
18. **JN18** A capture that fails says why in the app's voice above the line, with Retry where a retry can work; a denied camera or microphone says where to allow it. Undo for a delete or a hide sits above the line too. Nothing covers the line, and its controls keep their places while a message shows.
19. **JN19** With the keyboard up, the entry being written and the bar above the keyboard stay in view, on a phone and in a phone's browser.

### The slip and the contents

20. **JN20** A resurfaced moment is a slip on today's page, under today's date and above today's entries: the reason in the app's voice with the moment's own date and place ("A year ago today · Mill Lane"), the moment's own words or picture, and a tap that opens it. Its More holds Relive it, Another, Show less like this and Not this one. It never raises the keyboard and never moves the page from the open line. It keeps its place for that open of the app whether or not an entry is written, so it never behaves as a prompt; it is absent when resurfacing is off or there is nothing to bring back. (Steward 7.)
21. **JN21** A contents button at the top of the page labelled Contents, opens a list: Threads (the Chronicle's and your own, on one screen), Hidden, the resurfacing switch and Forget. Each opens or does what it does today, with a way back to the page, and none shows a count.
22. **JN22** The page has no paper texture, binding, page-turn or accent colour; outside the owner's own words its only digits are dates, times and a memo's length; every motion's timing comes from `motionTokens`.
23. **JN23** For a screen reader the contents button comes first, then the open line and its controls, then the slip, then the entries from the newest back. An entry is spoken as its kind, its words and its dateline.
24. **JN24** Chronicle's section bar and its Walks, Days, Map and Media sections work as before this cut, and the recording bar still shows no camera while Memories is in front.

### The line and the page (added Nov 12, after note pages shipped; the owner's call)

Note pages (decision 0151) made a note a full-screen page written in a rich-text editor. The owner's call, Nov 12: the line is for a thought, the page is for an entry, and one stored note is under both. Vision: Honour (capture stays one tap in the line; the page is one more for a long entry); it adds no prompt, count or hint; verdict aligned.

25. **JN25** While the line has the keyboard or holds words, its status row offers **Open as a page** (a thumb's target, named so for a screen reader). With words in the line it opens the note's page on that same entry, with what was typed already there; what the page then writes is that entry's, kept as Markdown. From an empty line it opens a new page, which keeps nothing if left empty. Done on the page returns to the sheet at its foot, with the line empty. A photo taken in the line joins the entry as a piece; the page's own camera keeps a photo as its own moment and mentions it (NP14): two rules, by the owner's call.
26. **JN26** An entry the page wrote is drawn on the sheet in its shape: a heading, bullets, numbered lines, checkboxes (ticked or not, never counted) and quotes, as plain native text in the owner's serif, with each mention as that moment's card. No raw mark (`#`, `-`, `[ ]`, `**`) shows, and the sheet never holds the editor or a web view. A note the page did not write stays literal (NP7).
27. **JN27** A long entry shows its first twelve blocks on the sheet, then one line in the app's voice: "The entry goes on; open it to read the rest". The whole entry is in its viewer.

### Writing on the page (added Nov 13, from the owner's phone)

The owner's screenshot of the built line on an iPhone, and their call: it felt like a chat box, the field was small and boxed, and the recording bar, the tab bar and a blank band sat between it and the keyboard. The words are written on the page itself, as the approved drawing showed. Vision: Honour, with less chrome between the hand and the page; verdict aligned. This amends JN9, JN10, JN13, JN23 and JN25 where they place the field, the status and Open as a page in a row at the foot.

28. **JN28** The words are written on the page: the field is the last line of today's page, under the entry being written (its dateline, its photo), the full width of the column, in the owner's serif, with no box, border or focus frame. It is not in the bar at the foot. Where no page is shown (a thread, the threads, Hidden) the field is in the bar, so the line is still one tap there.
29. **JN29** One bar is fixed at the foot. At rest it holds a pen (named "Write an entry": it brings today's foot into view and puts the caret on the page, from anywhere on the sheet), the camera and the mic, each a thumb's target. While writing it holds, in one row, "Kept as you write" (or the failure and Retry), Open as a page (an icon with that name), the camera, the mic and Done; nothing wraps at 320 px.
30. **JN30** While the field has the keyboard, the tab bar and the recording bar fold away and the bar sits directly on the keyboard: nothing else stands between the entry and the keys. They come back when writing stops, and a walk being recorded goes on recording.

### The page at rest, and the empty page as the pen (added Nov 13, the owner's call)

The owner, on seeing the page pushed to its foot: "have like a peek to show the last entry, but the page is mostly aligned to the top, and when you click on the empty space, it expands out, or rather transitions out to create a moment." Vision: Honour (the empty page is where writing begins, with no prompt and no control standing for it), Return (where you left off is the first thing seen); verdict aligned. This amends JN1 (the page rests with its last entry on top, not at the foot), JN11 and JN29 (the empty page is the pen; the bar holds no pen).

31. **JN31** At rest the page is aligned to the top: the day's date, then the most recent entry under it, then the empty page filling the rest of the screen above the bar. Nothing older shows until the page is pulled down, which reads back through the journal with each day's date held at the top as its entries pass. A last entry too long for this shows its end, and the empty page still takes at least a third of the screen.
32. **JN32** A tap anywhere on the empty page (named "Write an entry") puts the caret on the page, directly under the last entry, and the bar sits on the keyboard (JN30). The bar at rest holds only the camera and the mic. (Amended by JN33 the same day: the last entry no longer slides away, and Done no longer rearranges the page.)

### The day's entries stack (added Nov 13, the owner's call)

The owner, after the grown page hid everything but the line being written: "keep it like a stack where the page just grows per entry and moment, and it just slides up almost like a typewriter"; and, on what it is for, "once you start writing, you don't feel like it's just writing and no multimedia. It's just growing entries throughout the day." The resting state of JN31 stays as how the page opens. Adjacent practice (typewriter scrolling in iA Writer, Ulysses and Typora; the append view asked of Day One) is in the record. Vision: Honour and Return, as JN31; verdict aligned.

33. **JN33** The page opens as JN31 says, on the entry you left off at. From there the entries of the sitting stack beneath it in the order made, words, photos and voice notes alike, and stay in view while the next is written: nothing slides away when writing begins, and Done moves nothing. When the stack has filled two thirds of the page, it slides up as it grows, and the line being written holds its place a third of the way up from the bar.

## Amends

- **Capture from Chronicle** (`specs/capture-from-chronicle/spec.md`): HC6-HC13 and HC15 (the band becomes the open line; "<Kind> kept here" and "saved to your walk" toasts go, since the entry itself appears); HC9's "heads Lately" and HC10's "not shown until the walk stops".
- **Resurfaced moments** (`specs/resurfaced-moments/spec.md`): the top card becomes the slip; Lately, the threads rail and the options button leave the page for the sheet and the contents; an open walk's moments now show (RM17).
- **Memories context** (`specs/memories-context/spec.md`): MC13's newest first becomes book order.
- **Moment stacks** (`specs/moment-stacks/spec.md`): in the journal, MS19's grouping holds without MS18's setting.
- **Moment references** (`specs/moment-references/spec.md`): RF1 reaches the journal's open line.
- **0098, 0112**: superseded where they describe Memories' layout; the app still opens on Chronicle's Memories.

## Record (Nov 12)

- **Built as written:** JN1-JN24 on `claude/vigilant-ptolemy-tdkzm6`. Tests first at `50e6e8e`; the core in `a72adbe`; the screens in `e43c64a`; the band removed in `6fd740a`; the audit's fixes in `9e84f2e`.
- **Tests:** unit tests in `src/lib/__tests__/journal/` (`page`, `lines`, `pen`, `section`); the `journal` journey (57 checks: every criterion with a screen, and the audit's regression checks). JN19 has the lift's arithmetic as a unit test and a stubbed keyboard in the journey; a real keyboard is a device item.
- **Typecheck, lint and `npm test` pass** (2,026 tests).
- **Journeys run:** `journal`, `capturehome`, `resurface`, `threads`, `stacks`, `responses`, `upgrade`, `launch`, `gallery` (rewritten or touched), then `chronicle`, `days`, `edit`, `qol`, `ready`, `reload`, `space`, `tabs`, `walk` (covering the changed files). After the audit's fixes: `journal`, `capturehome`, `resurface`, `threads`, `stacks`, `responses`, `edit`, `space`, `walk` again. All pass on their latest run. `chronicle` ran twice: its star-settle check (M9) failed once while three review agents loaded the machine and passed alone. `journal` ran seven times while it was being written and fixed.
- **Changed from the plan:** the slip's More says "Show less like this" and "Not this one" (the existing words); "Your threads" is not its own row in the contents (Threads holds both); a voice note commits the words typed before it (audit 3); from a thread, the page comes back when something is kept, not on the tap (audit 15). `lately` was removed, not kept: nothing else called it.
- **Amended elsewhere:** HC8, HC11, HC12 and HC13 retired to JN10, JN14 and JN2 (`scripts/features.js`); RM17, RM20 and MC13's tests read book order; MC1, MC3, MC4, MC7 and MC15 are checked on the dateline (`resurface` journey); the hidden toast says "It stays in your journal and in its walk."
- **Native:** never run on a device; the items are in `docs/NATIVE_UNVERIFIED.md`, "Capture from Chronicle and the journal".

## Audit (Nov 12)

Report-only passes by the auditor (1-13), the steward (14-25) and the UX reviewer (ui 1-14), triaged. 39 findings: 25 fixed (four of them the same fix as another), 6 deferred, 7 rejected, 1 a pass with nothing to change. Each fix has a regression test named `chronicle-journal audit N` or `chronicle-journal ui N`: unit tests in `src/lib/__tests__/journal/` (audit 1, 2, 4, 5, 7, 9, 10), checks in the `journal` journey (audit 1, 3, 6, 7, 8, 14, 15; ui 2-6, 8, 10). The tests and their fixes were committed together (`9e84f2e`); the unit tests were run failing first.

1. Nothing lifted the line above the keyboard (high): accept, the line rises by what the keyboard covers above the bars under it (`lineLift`, `useKeyboardHeight`).
2. Today's heading and the slip drawn twice once an entry is dated after the page's clock (high): accept, today is the later of the two days.
3. A voice note recorded into an entry whose words were then deleted could not be saved; a begin read its entry outside the queue (high): accept, the words typed before the mic are committed as the note starts, a begin reads its entry inside the queue, and Done ends the entry at once.
4. A save that failed as the line let go lost the words: accept, the line empties only once the write is known to be kept; after a failed begin the next words begin again.
5. A spare location read was aged from when its entry was emptied: accept, from when it was read (`spareFresh`).
6. On the failed or loading page an entry showed only its first character and an emptied one stayed: accept, the line tells the page what it wrote and removed.
7. An entry on a walk could read a location and say "No location": accept, no fix on a walk, and no place claim while the walk is open.
8. The slip's Relive it and Another showed in a thread moment's menu: accept.
9. A map focus never taken framed a later map open: accept, dropped when the section leaves Map.
10. Leaving during a begin did not end the entry, and the hidden piece could stick: accept, `closed` is remembered, the line clears `writing` as it goes, and it stays mounted when it moves after a screen.
11. The page's clock never advanced in a sitting: accept, it ticks and follows each entry. Covered by typecheck and the flow; no test waits a minute.
12. `lines.ts` reads the phone's time zone in core: defer, with the known ones (`docs/DEFERRED.md`).
13. A size change with the same rows was taken for older entries arriving: accept, told apart by the rows asked with. Covered by the journey's paging check, not a test of its own.
14. The camera was dimmed while a note records: accept, a tap saves the note, then opens the camera.
15. A capture from a thread or Hidden landed unseen: accept, the page comes back at its foot once something is kept.
16. An open walk's entry could read "No location": the same as 7, fixed there.
17. A fix could be read on a walk: the same as 7, fixed there.
18. Every entry carries a More the spec never gave it: reject as removal (RM20 gives every moment its two choices; moving them into the viewer changes another screen); its place is fixed under ui 4. For the owner (`docs/STATUS.md`).
19. The dateline's tap arrives at a cluster with a count, over a sheet that urges a walk: defer.
20. The recording purple is the page's one accent: reject, it is the walk screen's recording colour, kept as HC12 kept it.
21. A picked reference's words are in the serif while typing: defer (accepted at the plan's triage as a limit of one text field).
22. The day's heading is ink and heavier than the words: reject, it is as drawn and approved; JN4's wording now says so.
23. The storage notice covers the newest entry: reject, 0107's notice, shown once per level and dismissed with OK.
24. The failed state was not in its picture: the same as ui 8.
25. Two headings both read "Threads": reject, OT12 and OT25 are the owner's call (told apart by their marks).

ui 1. Three bars at the foot with a walk minimized: defer, for the owner (`docs/STATUS.md`).
ui 2. A voice note's line looked like a play button: accept, a mic.
ui 3. The dateline was the only way to the map, with no sign of it: accept, Show on the map in More and a pin on a placed dateline; marking the one pin on arrival is deferred with 19.
ui 4. More floated on a row of its own: accept, it trails the dateline.
ui 5. The line read as a focused field with no boundary: accept, an edge at 3:1; the no-label field is recorded as a house departure in `.claude/rules/ui-patterns.md`.
ui 6. The contents button was a small muted icon: accept, the word "Contents" in ink. The switch drawn as a menu row is deferred.
ui 7. Two sections titled "Threads": reject, as 25.
ui 8. The failed picture showed neither the notice nor the entry, and the page read again did not return to its foot: accept, both.
ui 9. The storage pill covers the last entry's More: reject, as 23.
ui 10. The slip's rule read as the date's underline: accept, more room above it. A thread named for a common word ("entry") reading oddly is the seeded data's.
ui 11. Done is a word beside two icons: defer to the first look on a phone, with the keyboard up.
ui 12. The line on the Threads screen: settled by 15.
ui 13. "answering …" looks like a dateline: defer.
ui 14. Passes (contrast, hierarchy, wrapping, targets, the sheets): no change.

## The line and the page: record and review (Nov 12, `/fix`, branch `fix/journal-note-pages`)

- **Why:** `main` shipped note pages (NP1-NP14, decision 0151) while this slice was built. Both owned how a note is written (`useCaptures`, `MomentBar`), and with the band gone Memories had no way to open a note's page. The owner's call: the line for a thought, the page for an entry, one stored note under both; the photo rule stays two rules.
- **Merged:** the journal onto `main` (three conflicts). The capture bar keeps `main`'s note page for the ready screen and the walk; the line's own methods are `beginLine`, `writeLine`, `dropLine`. The journal's decision is 0155 (0151 is note pages').
- **Built:** JN25-JN27, tests first at `9313af4`, the code at `aa992a7`, the review's fixes at `9d5a846`. Note pages' own journey opens its pages from the line.
- **Checked:** typecheck, lint, `npm test` (2,088), and on the `/chronicles` build the journeys `journal`, `notepage`, `capturehome`, `resurface`, `threads`, `stacks`, `responses`, `ready` and `walk`. Reached and not rerun after the merge, since none holds a check on what changed: `chronicle`, `days`, `edit`, `qol`, `reload`, `space`, `tabs`, `upgrade`, `launch`, `gallery` (each green on the journal's branch before it).
- **Review** (the auditor 1-11, the UX reviewer ui 1-8), 19 findings: 11 fixed, 6 deferred, 2 notes with nothing to change. Tests are named `fix journal-note-pages audit N` or `ui N`: unit tests in `src/lib/__tests__/journal/` (audit 3, 4, 8), checks in the `journal` journey (audit 1, 7, 10; ui 1, 2, 6, 7).
  1. Words typed after an entry was emptied on its page joined the moment being deleted, and the delete's Undo pill sat over the line (high): accept, the emptied page ends the open entry and the pill waits above the line.
  2. A URL with `_` or `*` gains backslashes when the page saves it, doubling on each edit (high): defer. It is note pages' own serializer (`notePage/schema.ts`, on `main` before this); filed for the owner (`docs/STATUS.md`).
  3. A long entry was cut by block count alone: accept, by characters too, and a long plain entry says it goes on.
  4. The hand-off reset the pen before its write landed and swallowed a failure: accept, the page opens only once the write has landed; a failure is said in the line; a late result on an empty line is ignored.
  5. A new page from the line reads a fix where the line reads none (a walk with a stale fix; an empty page left): defer, it is the pencil's rule everywhere (note pages' S9).
  6. The sitting's copy did not know a page's write is Markdown: accept. Covered by typecheck and the flow, no test of its own.
  7. A checkbox with a mention spoke the raw token: accept.
  8. A nested list lost its lines, and a private-use character was deleted: accept. A list inside a quote still reads as the quote's lines: defer.
  9. Hard breaks that look like a heading rule or a table reopen wrongly in the page: defer, with 2.
  10. Closing an empty page threw you from the threads back to the journal; the page's camera left its photo as the open entry: accept, both. A walk ending while a page is up closes the page (its words are kept): defer.
  11. Docs drift: accept.
  ui 1. The taller line covered the sheet's foot: accept, the foot follows the line's measured height.
  ui 2. Two equal bold words stacked at the right: accept, Open as a page is set lighter than Done.
  ui 3. The same words are serif on the sheet and sans on the page: defer, the page's type is note pages'; for the owner.
  ui 4, ui 5. The lone button on an empty line's row; the label from an empty line: notes, no change.
  ui 6. A list's lines sat as far apart as paragraphs: accept.
  ui 7. The sheet's checkbox looked live: accept, drawn muted.
  ui 8. The page's own bar: a pass.
- **`check:test-first`:** 26 of 27. JN26 reports its todo and its real test in one commit: its journey todo at `9313af4` was written across three lines, which the line-based reader takes for a real check (as HC2 and HC13 once did). Its unit tests were todos at `9313af4` and real at `aa992a7`.
- **Seen once, not reproduced:** the `journal` journey's "the entry that was on screen stays on screen" check failed in two of five runs while the journey was being changed and passed in the rest; it holds the page's position by adding the height that arrived, on the web. If it recurs, that is where to look.
- **Native:** none of this has run on a device.

## Writing on the page: record (Nov 13, branch `fix/write-on-the-page`)

- **Why:** the owner's screenshot of the built line on an iPhone. The field was a small box with a black focus frame, the recording bar, the tab bar and a blank band stood between it and the keyboard, and it read as a chat box. The frame was the app's `:focus-visible` ring overriding the field's own style.
- **Built:** JN28-JN30, tests first at `f7a45c4`. The field is the page's last line; the foot is one bar; the tab bar and the recording bar fold away while writing. JN9, JN10, JN13, JN23 and JN25 are read with these: the bar is what is fixed at the foot, the pen is its first control for a screen reader, and Open as a page is an icon in it.
- **Checked:** typecheck, lint, `npm test`; the `journal` journey (74 checks), `notepage` and `capturehome`.
- **Not yet seen on the phone:** whether the bar sits directly on the keyboard in the Home Screen app and in Safari, and whether the pen raises the keyboard in one tap. Both are the owner's to try (`docs/NATIVE_UNVERIFIED.md`).

## The page at rest: record (Nov 13, branch `fix/write-on-the-page`)

- **Why:** the owner, on the page that opened pushed to its foot with the field against the bar: a peek of the last entry, the page aligned to the top, and the empty space as what is tapped to make a moment. Their three answers: the last entry on top with the blank below; the page itself grows; a thin bar at the foot.
- **Built:** JN31, JN32, tests first at `b56811f`. The rule is `lib/journal/rest.ts` (the empty page's height; which rows are the peek); the dates are held at the top; the pen left the bar. JN29 is read with this: the bar at rest holds the camera and the mic.
- **Checked:** typecheck, lint, `npm test`; the `journal`, `notepage` and `capturehome` journeys.
- **Found on the way:** a pill above the bar (room left) covers the middle of the empty page and takes a tap aimed there. It has its own OK and the rest of the page takes the tap; left as it is, and the journeys tap the first lines.
- **Not yet seen on the phone:** the movement as the page grows and comes back, the sticky date, and whether a tap on the empty page raises the keyboard in that one tap (`docs/NATIVE_UNVERIFIED.md`).

## The day's entries stack: record (Nov 13, branch `fix/write-on-the-page`)

- **Why:** the owner, on the grown page: a stack that grows per entry and slides up like a typewriter, so that writing shows the day's photos and voice notes with it; the page still opens as JN31 says.
- **Adjacent practice, read Nov 13:** typewriter scrolling (iA Writer keeps the cursor vertically centred with nothing dimmed, and notes the screen can jump when a tap elsewhere fights the centring; Ulysses' fixed scrolling; Typora) holds the line and moves the document. Chat-style streams (Strflow, Monoline, Mynd) stack entries in time order over a docked field, the look the owner rejected. Day One and Apple Journal write in a separate editor; a Day One user's "Daily Stream / Append View" request, logged and not built, asks for this stack. Daily notes (Logseq, Roam, Reflect) put today on top. Ours takes the stream's order and the typewriter's movement, with the line a third of the way up from the bar rather than centred: a phone with its keyboard up has little room.
- **Built:** JN33, tests first at `f4a922c`; JN32 amended. `lib/journal/rest.ts` lost its `writing` case and gained the anchor.
- **Checked:** typecheck, lint, `npm test`; the journeys named in the commit.
- **Not yet seen on the phone:** the slide as the stack grows with the keyboard up.
- **`check:test-first`:** JN31 reports its todo and its real test in one commit, as JN26 did: its journey todo at `b56811f` was written across lines, which the line-based reader takes for a real check. JN32 and JN33 read as tested first.

## Audit of JN28-JN33 (Nov 13)

Report-only passes by the auditor (40-49), the steward (S1-S3) and the UX reviewer (U1-U10), triaged. 23 findings: 10 fixed, 4 deferred, 6 to the owner (three questions; S1, U1 and audit 44's order are one, S2 and U7 another), 3 rejected. Regression tests are named `chronicle-journal audit N`: a unit test in `src/lib/__tests__/journal/rest.test.ts` (48) and checks in the `journal` journey (40, 42, 43, 44, 45), committed as todos first.

- audit 40: The sheet does not know the keyboard, so the line being written sits behind it: accept. The bar reports its height and its lift together, and the sheet pads its foot by both.
- audit 41: Tabs stay folded when the focused field moves from the bar to the page: accept. Typing belongs to the slot it began in. No automated test: the path needs an entry to close by time while the field is focused in a thread; covered by typecheck and the phone check.
- audit 42: The anchor outlives the sitting: accept. Coming back to Memories is a new sitting.
- audit 43: A reader scrolled back is pulled to the foot when the keyboard goes: accept.
- audit 44: A screen reader reaches the field last, and twice: the double name, accept (the tappable page is not said); the order, to the owner with S1.
- audit 45: A dead band directly under the last entry: accept. The tappable page lies under the whole empty page.
- audit 46: Recording from a thread at 320 px: defer.
- audit 47: Deleting the anchor rearranges the page: defer.
- audit 48: The sticky height is the oldest drawn day's: accept (`stickyDay`).
- audit 49: The slide ignores reduce motion: accept; the hard-coded settle time is deferred with it.
- steward 1: Scrolled back, the pen is no longer one tap: to the owner (it reverses part of their call on the bar).
- steward 2: The typewriter cuts the top entry out of its context: to the owner (how the slide should settle).
- steward 3: The spec calls the empty page "the invitation": accept, reworded.
- ux 1: As S1.
- ux 2: The still mark is the only sign of where to write: reject, the owner's call (decision 0155, JN10); it rests on S1's answer.
- ux 3: A toolbar and the tab bar show together at rest: to the owner (the bars, as ui 1).
- ux 4: Open as a page is an ambiguous document icon: accept, an expand glyph.
- ux 5: Camera and mic change position between rest and writing: to the owner.
- ux 6: The bar at rest reads as a blank band: reject as its own finding; settled by S1 or U3.
- ux 7: The held date has no edge; a More shows through it: the More, accept (the date is above the entries passing under it); the edge, to the owner with S2.
- ux 8: The line being written sits 22 px lower than a kept entry: defer.
- ux 9: The bar's failed save is not pictured at 320 px: defer.
- ux 10: Nothing at rest says there is a journal above: reject, the owner's call (JN31); Contents is in view.

- **Journeys:** `journal` ran four times while the checks were made to pass (three stopped at an older check that read the spoken name off the tappable page); the others named by `check:affected` once.
- **Native:** none of it has run on a device; three checks added to `docs/NATIVE_UNVERIFIED.md`.

### The owner's answers (Nov 13): "go with your recommendations"

Built as `chronicle-journal audit 50-54`, checks in the `journal` journey, committed as todos first. JN29 and JN32 are read with these.

- audit 50 (steward 1, ux 1, audit 44's order): with the empty page out of view the bar holds a pen ("Write an entry") at its leading side; one tap brings today's foot back with the caret on the page. In view, the empty page is the pen and the bar holds none.
- audit 51 (ux 5): Done's place is kept at rest, so the camera and the mic never move between rest and writing.
- audit 52 (steward 2, ux 7): entries fade under the held date instead of being cut. The slide still stops where the stack ends; settling on an entry's first line was the other option, not taken.
- ux 3 (a second bar above the tab bar at rest): left as it is.
- audit 53 (the steward's question): while the field has the keyboard on a walk, the bar keeps the recording's mark, a red dot said as "Walk recording".
- audit 54 (the owner: note types "are no longer accessible given the new UI"): the journal's entry draws a note's type above its words, as the moment card it replaced did (note types NY9, decision 0161). Choosing a type is still on the note's page only; where it should live in the journal waits on the owner (`docs/STATUS.md`).
- Counts after the answers: 23 findings, 15 fixed, 4 deferred, 4 rejected.

## Audit (Nov 13, the in-line voice note)

The owner's request: a voice note on the page plays in line, with a progress bar, and does not open the viewer (`components/journal/MemoLine`). Report-only passes by the auditor (1-9), the steward (10-12) and the UX reviewer (13-19), triaged. 19 findings: 12 fixed (three of them the same fix as another), 3 deferred, 3 rejected, 1 a pass with nothing to change. The owner chose ink over the voice purple, and one note at a time with a recording pausing playback.

1. A trimmed note could stop again right after a restart (high): accept, `isRestarting` (`lib/journal/memoPlay`), as the viewer's player does. Test `journal voice audit 1`.
2. The play button is not its own focus target for a screen reader on a phone, being inside the entry's open button (high): defer, the viewer still plays a note for a screen reader; the fix changes the entry's open target (`docs/DEFERRED.md`).
3. Nothing stopped a playing note when a recording started (high): accept, `nowPlaying` (`lib/journal/nowPlaying`) and `startVoice` claims it. Test `journal voice audit 3`.
4. Two notes played at once (medium): accept, the owner's call: the second takes the sound, the first lets go of its player. Test `journal voice audit 4`.
5. A file that would not resolve left a pause button that plays nothing (medium): accept, the row is given back after `MEMO_LOAD_WAIT_MS`. Test `journal voice audit 5` (the constant and its use; the timer itself is covered by typecheck and the journey).
6. A refused autoplay (web, iOS) has no handling (medium): reject, the row is left with a Play button that works on the next tap, as the viewer's player does; the replay's own refusal path is for a replay that moves on by itself.
7. The purple against "no accent colour" (medium): accept, the owner's call: the disc and fill are ink (`theme.ink`), the track `theme.edge`. Test `journal voice audit 7`. The recording purple stays the line's own (audit 20 of Nov 12).
8. An untrimmed note whose stored length outruns its file did not restart from 0 (low): accept, `fileEnded`. Test `journal voice audit 9`.
9. Sizes and screen reader (low): accept the size and the position (13 and 16); a tap on the bar or clock now does nothing instead of opening the viewer, because they sit beside the entry's open button, not in it (see 2).
10. The purple again (steward S1): the same fix as 7.
11. The digits are within the rule (steward S2): a pass with nothing to change.
12. In-line playback fits a quiet page (steward S3): a note; the bar returns to nothing after the end, as built.
13. The play button was 44 pt only by hit slop (medium): accept, 48 pt in itself (`MEMO_PLAY_HIT`). Test `journal voice audit 13` and the journey.
14. The clock changed width when play began, so the bar jumped (medium): accept, always "a / b" (`memoClockText`). Test `journal voice audit 14` and the journey.
15. The unfilled track under 3:1 (medium): accept, `theme.edge`. Test `journal voice audit 7`.
16. Progress hidden from a screen reader (medium): accept, the bar is a progress bar with its position in words (`memoProgressText`). Test `journal voice audit 16` and the journey. The viewer says "voice memo", the journal "voice note": defer.
17. Scrubbing (low, opinion): reject, the viewer's bar is not seekable either; scrubbing is built there first if ever.
18. The purple (UX U6): the same fix as 7.
19. The loading state shows a pause glyph before the file resolves, and the clock floors while the bar is exact (low, opinion): defer the first, reject the second.

Journeys run: `journal` (80 checks), `edit`, `walk`, `space`, `threads`, each once, green. Native, not run on a device: `expo-audio`'s player, `seekTo` and `updateInterval`, whether a finished file rewinds, the interruption by a recording, silent mode after a recording (`docs/NATIVE_UNVERIFIED.md`).
