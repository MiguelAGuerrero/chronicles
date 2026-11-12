<!-- Repo first: written from the owner's request in a session (Nov 12), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The owner's calls are decision 0151. The approved drawing: https://claude.ai/artifact/GvCtF3iCjh1CksvojJcvoF -->

# Chronicle journal, cut 1: the page and the pen

Nov 12, 2026 · @Miguel Guerrero

Memories is a feed with three capture buttons at its foot, and the owner finds that the feed does not say "capture here". Memories becomes a journal: one sheet in the order moments were made, opening at today, ending in an open line where writing, a photo or a voice note is the capture. This is the first of four cuts (decision 0151); Walks, Days, Map and Media stay as they are in this one.

## Vision

Idea: Chronicle becomes a journal: a book in the order moments were captured, where writing in it is the capture (replacing the three buttons against the timeline), and which is the quiet way to be out: no walk, no trace, only what you write and where.
Verb: honour (a moment kept by writing on the page, with its time and its one fix), return (the page you write on is the page you read).
Touches: Always "Capture is one tap away on every screen you walk or capture from"; Never "A capture behind a menu, a drawer or an extra tap"; Always "A moment carries its context: place, time, its walk, what came just before"; Always "Restraint in motion, colour and copy: the content is the novelty, not the chrome"; Never "Writing the owner's words for them"; Never "All-day tracking" (0036); Never "Nagging"; Never "Scores, streaks, completion"; **[proposed]** "Browse standard, dwell diegetic ... A row that could appear unchanged in a generic journal app is wrong" (a reason, not a rule); precedents 0112 (the band), 0098 (resurfacing leads), 0123 (a moment holds several media), 0125 (a note references moments with @), 0131 (responses).
Verdict: aligned if reshaped
Shape: A typographic journal, never a costume: white ground, the app's ink, no paper, binding or page turns. Entries are prose without cards, each under a dateline that carries its context; the owner's words are set in a serif and everything the app says in its plain sans, so the app never appears to write in the book. The page ends in an open line that is always on screen: a caret, with the camera and the mic at its end, one tap each. Writing in the journal starts no walk and no trace; an entry reads one fix when it begins. New entries land only at the end; a past entry can be corrected or responded to, never inserted before. Reshaped from the owner's first telling in three places: the camera and mic stay one tap (a journal must not demote them behind the pen); the book is structure, not texture; and "controlling Navigate from the journal" became "the journal is the quiet mode, Navigate is the walk".
Criteria: JN3-JN5 (context, two voices, no cards), JN9-JN11 (one tap, no hint, no prompt, no location at open), JN12 (one fix at the entry's start, no trace), JN17 (the past is fixed), JN20 (the slip never leads or nags), JN22 (restraint), JN2 (no empty days, nothing counted).
Open: the owner's remark of Nov 12 that a moment need not belong to a walk (an association by time and place, read at recall) is a change to the data model; it is recorded in decision 0151 as a direction and is not part of this cut.

## Decisions (the owner's calls, Nov 12, decision 0151)

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
4. **JN4** The owner's words (a note, a caption, the open line as it is typed) are set in the platform's serif. Everything the app says (the date heading, a dateline, a memo's line, "answering …", an error, the words a reference reads as wherever a note is shown as plain text) is set in the app's sans, in the muted ink. No sentence the app composed is ever set in the serif, and no entry text is generated. (Steward 9.)
5. **JN5** A dateline says when, and where once it is known: the time alone until the moment's context is read, then its arrival line. Today's entries read "8:15 this morning · Elm Street, by the bakery"; an earlier day's give the clock time; an entry made on a walk says so, open or finished ("40 minutes in, just after the bakery"). It never claims a place that was not read, and says "No location", or "No location (location is off)", when the fix never came. An entry belongs to the day it began. (Steward 5, 11.)
6. **JN6** A tap on a placed entry's dateline shows that moment on Chronicle's Map, framed on its pin. A tap on the entry itself opens it in the viewer, as a moment opens today. An entry with no place offers only the viewer.
7. **JN7** An entry from a finished walk keeps its line to that walk ("From …"), which opens the walk's replay, as Lately's cards do today.
8. **JN8** With a walk recording and minimized, an entry made in the journal shows on today's page at once and stays there when the walk stops. It is also the walk's: it shows on the walk screen and plays in the walk's replay.

### The pen

9. **JN9** The open line is fixed at the foot of Memories at every scroll position, and in a thread, one of your threads and Hidden when they are open, above the tab bar and above the recording bar when a walk is minimized. It holds an empty text field with a still ink mark where writing begins, then the camera, then the mic. From launch each is one tap, with no tab, menu, drawer or scroll first, and it works while the page loads and after the page failed to read; an entry kept then is drawn on those states too. Any capture from the line brings today's foot into view, so what was kept is seen. (Steward 1, 6, 11.)
10. **JN10** At rest the line shows no hint text, no accent colour, no number and no prompt copy, and nothing on the page invites, reminds or nudges the owner to write. Each control is at least 44 pt and has a spoken name ("Write an entry", "Add a photo or video", "Record a voice note"). The keyboard is not raised when the app opens.
11. **JN11** Opening the journal reads no location. A tap in the line brings today's page to the foot and raises the keyboard.
12. **JN12** The first character typed begins an entry on today's page with that time. With no walk open, one fix is read for it, and the dateline gains its place when the fix comes; an entry begun by the camera or the mic reads its one fix the same way. Deleting every word before the fix arrives cancels the read, and writing again in the same sitting asks no second one. With a walk open no fix is read: the entry is placed from the walk's trace, as the walk's captures are. Writing never waits for a place, nothing tracks before, between or after entries, and no walk or trace starts. (Steward 4.)
13. **JN13** An entry is kept as it is written: there is no Save. What was typed survives leaving the page, a reload (web) and the app being closed mid-sentence, after which the words sit on the page as an entry and the line is empty. With the keyboard up, the line rides above it as one row: the field, the camera, the mic and Done, with "Kept as you write" in the app's voice; Done lowers the keyboard and ends the entry. If a save fails, the row says so in place of "Kept as you write" and holds the words for Retry. An entry whose words are all deleted, with no other piece, is not kept. (Steward 10.)
14. **JN14** The camera keeps a photo or video and the mic a voice note, each landing on today's page at once. While a note records, Stop & save, Discard and the timer take the mic's place only: the field, what is typed in it and the camera keep their boxes and still work. Leaving Memories, opening an entry, the contents or a replay saves the note first, and nothing plays over a recording. A note under a second is dropped with "Too short, not kept". (Steward 2.)
15. **JN15** Pieces made right after each other are one entry: a photo and the line typed under it, or words and then a voice note, share one dateline, place and moment. The open entry is the last on the page, with the writing mark under it. It ends on Done, two minutes after its last piece (for words, the last keystroke, so a pause never splits a sentence being typed), when Memories is left, or on a walk once the trace has gone 100 m from where it began; the next piece then begins a new entry. A response is always an entry of its own, and no two kept entries are ever merged. While an entry is open its viewer offers Add to this moment, as MS12 says. This holds whatever the walk's "Group captures into one moment" setting says, takes no new fix, and shows no count. (Steward 3.)
16. **JN16** Typing **@** in the open line opens the moment picker; the chosen moment is embedded at that point as a reference, removed whole by one delete. On the page a reference is drawn as RF4 says, whole: the referenced moment's first piece, kind, date and place, and its walk, never a bare thumbnail; a tap opens that moment, and a deleted one reads "A moment no longer kept". The reference is stored as 0125 says: in the note's text and nowhere else. (Steward 8.)
17. **JN17** A new entry can only be made at the end. No control inserts an entry on a past page or changes an entry's time or place. A past entry's words can be corrected in its viewer, and a response to it is a new entry at the end, which says what it answers.
18. **JN18** A capture that fails says why in the app's voice above the line, with Retry where a retry can work; a denied camera or microphone says where to allow it. Undo for a delete or a hide sits above the line too. Nothing covers the line, and its controls keep their places while a message shows.
19. **JN19** With the keyboard up, the entry being written and the bar above the keyboard stay in view, on a phone and in a phone's browser.

### The slip and the contents

20. **JN20** A resurfaced moment is a slip on today's page, under today's date and above today's entries: the reason in the app's voice with the moment's own date and place ("A year ago today · Mill Lane"), the moment's own words or picture, and a tap that opens it. Its More holds Relive it, Another, Fewer like this and Hide. It never raises the keyboard and never moves the page from the open line. It keeps its place for that open of the app whether or not an entry is written, so it never behaves as a prompt; it is absent when resurfacing is off or there is nothing to bring back. (Steward 7.)
21. **JN21** A contents button at the top of the page opens a list: Threads, Your threads, Hidden, the resurfacing switch and Forget. Each opens or does what it does today, with a way back to the page, and none shows a count.
22. **JN22** The page has no paper texture, binding, page-turn or accent colour; outside the owner's own words its only digits are dates, times and a memo's length; every motion's timing comes from `motionTokens`.
23. **JN23** For a screen reader the contents button comes first, then the open line and its controls, then the slip, then the entries from the newest back. An entry is spoken as its kind, its words and its dateline.
24. **JN24** Chronicle's section bar and its Walks, Days, Map and Media sections work as before this cut, and the recording bar still shows no camera while Memories is in front.

## Amends

- **Capture from Chronicle** (`specs/capture-from-chronicle/spec.md`): HC6-HC13 and HC15 (the band becomes the open line; "<Kind> kept here" and "saved to your walk" toasts go, since the entry itself appears); HC9's "heads Lately" and HC10's "not shown until the walk stops".
- **Resurfaced moments** (`specs/resurfaced-moments/spec.md`): the top card becomes the slip; Lately, the threads rail and the options button leave the page for the sheet and the contents; an open walk's moments now show (RM17).
- **Memories context** (`specs/memories-context/spec.md`): MC13's newest first becomes book order.
- **Moment stacks** (`specs/moment-stacks/spec.md`): in the journal, MS19's grouping holds without MS18's setting.
- **Moment references** (`specs/moment-references/spec.md`): RF1 reaches the journal's open line.
- **0098, 0112**: superseded where they describe Memories' layout; the app still opens on Chronicle's Memories.

## Record

Not built. The plan is `specs/chronicle-journal/plan.md`.
