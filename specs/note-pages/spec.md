<!-- Note pages. Written in the repo first (2026-11-12) from the owner's /slice request and their calls in the
     conversation (decision 0151). Not a concept-doc tab. -->

# Note pages (NP)

A note was a few lines: plain text, 500 characters at most, typed into a small card ("Jot it down", "A line about
here", Edit note). The owner wants a note to be a page that "will feel like a journal or an actual document entry",
"exactly like a journal app", built on established libraries. The reference is Apple Journal: the pencil opens the
entry full screen, it is headed by its date and place, formatting sits under an Aa button above the keyboard, and
what you write is kept as you write it (decision 0151).

## Vision

Idea: Support a Notion-style editing feature per note: you can expand out a note, and it feels like a journal or an
actual document entry, "exactly like a journal app" (the owner, Nov 12): Apple Journal's page, with headings, lists,
checklists, quotes, bold and italic, @ mentions kept, saved as you write, stored as Markdown in the note's body,
written in an established editor (TipTap).
Verb: **honour** (a longer thought is kept with its moment, at its place and time, not in another app); **return**
(the note read back as a page, in its context).
Touches:
- Always: "A moment carries its context: place, time, its walk, what came just before ... It never appears as a
  bare thumbnail, filename or count." A page with only a title and words is a generic document.
- Always: "Capture is one tap away on every screen you walk or capture from." The pencil must still start a note in
  one tap.
- Never: "Scores, streaks, completion, coverage, levels, badges, leaderboards" and "Tallies such as '12 of 87' or
  '40%'". Checklists invite "2 of 5 done". Apple Journal's own insights show "your current streak" and "number of
  words written" (`docs/research/ui-teardown.md` §2: "This is a pattern Chronicles must not copy").
- Never: "Nagging: off-route alarms, 'time for a walk', re-engagement pushes". An unticked box invites a reminder.
- Never: "Writing the owner's words for them". Apple Journal offers writing prompts and suggestions (§2).
- Never: "Data leaving the device without a tap". The editor runs as web code: it must load nothing from a network.
- Always: "Restraint in motion, colour and copy: the content is the novelty, not the chrome."
- **[proposed]** "Browse standard, dwell diegetic ... A row that could appear unchanged in a generic journal app is
  wrong." Cited as a reason, not a rule.
- Decision 0104 and `docs/DEFERRED.md` ("A place-rooted journal: a thread with no moments ... goes through /vision
  first"). A page must stay a moment's note, never a journal of its own.
- Decision 0114 (an action on a moment that exists lives in its toolbar or menu, nothing over the moment);
  0125 (mentions are text in the body); 0098 (threads found in the words of notes).
Verdict: aligned if reshaped
Shape: Apple Journal's page, with these guards. It is headed by its moment's context, never by a title alone. It is
always a moment's note, started from the capture stack, Respond or a note that exists. Checklists are never counted
or made into reminders. It has none of Journal's streaks, insights, word counts, prompts or suggestions, and no
covers, colours or highlights. Everywhere outside the page, a note reads as its words without marks. The editor
loads nothing from a network.
Criteria: NP1 and NP14 (one tap, the camera on the page too), NP2 (context heads the page), NP6 (no count of ticked boxes, no reminder from one), NP10
(marks never read as words elsewhere), NP11 (no streak, count, prompt, colour or cover), NP13 (nothing leaves the
device).
Open: none (the owner's calls below).

## Decisions (the owner's)

- **2026-11-12, structure:** formatting by headings, bullet and numbered lists, checklists, quotes, bold and italic,
  made by typing shortcuts or from a button above the keyboard. No practical length limit. @ mentions stay. No
  dragging of blocks and no "/" menu.
- **2026-11-12, media:** a page holds photos only as @-mention cards of other moments, as today.
- **2026-11-12, storage:** the note's `body` holds Markdown. No migration and no new table.
- **2026-11-12 (decision 0151):** the reference is Apple Journal; the pencil opens the page straight away (the small
  card goes, and with it the earlier "card + Expand"); the page saves as you write; the editor is TipTap in Expo DOM
  components, an established library rather than our own.
- **2026-11-12, older notes stay literal** (steward S10): a note is read as Markdown only once the page has written
  it, which the note says by a stored mark. Notes written before read character for character.
- **2026-11-12, a camera on the page** (steward S12): beside Aa and @, it keeps a photo as its own moment and mentions
  it in the note.
- **2026-11-12, defaults in the plan, the owner may still change them:** no separate title field (the vision is
  silent); checkboxes tick only on the page, not in the viewer (steward S1, 0114).

## Acceptance criteria

1. **NP1 · The pencil opens the page.** The pencil on Navigate's stack, on the walk, on Memories from the journal's open line (Open as a page, chronicle journal JN25, since the band went with decision 0155), Respond →
   Note and Add to this moment's note open the note's page full screen in one tap, with the keyboard up and the cursor
   in the body. The small note card is gone. What is written joins the moment that the card's Save made before: the
   same placing by one fix, the same walk, the same Add to this moment, the same reply link. The moment's time, its
   fix and its "just after" are those of the pencil's tap, however long the first words take (steward S9).
2. **NP2 · The page is headed by its context.** At the top of the page, as Journal heads an entry, comes the day in
   large type ("Wednesday, November 12"). Under it, one line gives the time of day; the place in words, as Lately
   says it ("Place not kept yet" while the fix is on the way, "No place kept" without one); the walk ("on a walk in
   …", "not on a walk"); how far into the walk; and "just after a photo" when the capture before it was close
   (decision 0098). Once that head has scrolled away, the date and the place stay in the top bar. The page never shows
   a bare title or a count (steward S4).
3. **NP3 · Typing shortcuts.** At the start of a line, `# ` makes a heading, `## ` a subheading, `- ` or `* ` a bullet,
   `1. ` a numbered item, `[ ] ` a checklist item and `> ` a quote, at once and with the marks gone. `**words**` turns
   bold and `_words_` italic. Return on a list item starts another; Return on an empty one ends the list; Backspace at
   the start of a formatted line makes it a plain line.
4. **NP4 · Aa above the keyboard.** While writing, a toolbar sits just above the keyboard with **Format** (Aa) and
   **Mention** (@). Format opens a panel in Journal's manner: Heading, Subheading and Body; Bold and Italic; Bulleted
   list, Numbered list, Checklist and Quote. Each applies to the line, or to the selected words for Bold and Italic,
   and shows whether it is on (a pressed state that is not colour alone). Every target is at least 44 pt and has a
   spoken name, and nothing in the toolbar or panel wraps at 320 px. Mention opens the moment picker, as typing `@`
   does.
5. **NP5 · Reading in the viewer.** A note opened in the viewer shows its page read-only, under the same head (NP2),
   with its formatting drawn and its mentions as cards that open their moment (RF4, RF5). It scrolls to its last
   line, however long. Edit in the viewer's toolbar, or a tap on the words, opens the page for writing. In the viewer,
   a tap on a checkbox changes nothing (steward S1, 0114).
6. **NP6 · Checklists are never counted.** On the page, a tap on a checkbox ticks or unticks it, and that is kept as
   any writing is (NP9). Nothing anywhere says how many boxes are ticked or left: no "2 of 5", no progress bar or ring.
   A box never makes a reminder, a notification or a badge. The resurfaced card and recall never choose a note by its
   boxes.
7. **NP7 · What is kept is what is shown, and older notes stay literal.** A note the page has written holds Markdown,
   with mentions as `@[id|words]` (0125), and says so by a stored mark. It reopens exactly as it was left:
   formatting, ticks, mentions and line breaks. A note without the mark (every note written before this slice) reads
   character for character everywhere, on the page too: `> 5 km`, `*sigh*`, `snake_case` and `# 3` stay as typed.
   Its stored text is never changed by being opened. Written in on the page, it is kept as Markdown that shows the
   same characters, and the mark is set. Markdown outside what the page makes (a link, a table, `~~`) is shown and
   kept as the text that was typed, never dropped (steward S10).
8. **NP8 · Room for a long entry.** A note holds up to 20,000 characters, counted as they are shown (a mention counts
   as its words). With fewer than 1,000 left, the page says "Room for a few more lines"; at the limit it takes no more
   and says "This note is full". No number is shown. A mention picked at the end never takes the note past the limit
   (`docs/DEFERRED.md` 12, "A reference picked at the end of a note can take it past 500 characters").
9. **NP9 · Kept as you write.** What is written is kept within a second of a pause in typing and on every way out
   (Done, Back, Escape, a swipe down, the app going to the background), with no Save button and no question. A new
   page left with nothing written keeps no moment. A page emptied while open never writes an empty body: a pause
   leaves the stored text as it was, and a killed app reopens the note with its last words. Only leaving it empty
   deletes an existing note, with the usual Undo (matrix 7; steward S8). A save that fails leaves everything on the page, says "Not saved yet" in the top bar, and tries again
   on the next change and on the way out. If the app is killed, at most the last second of writing is lost.
10. **NP10 · Elsewhere a note reads as its words.** Everywhere a note the page wrote is shown outside its page, it
    reads as its words with the marks dropped and its lines kept (a note without the mark reads as stored, NP7): Lately, the resurfaced card, the replay's bubbles and its pause, the
    screen reader's steps, the home sheet, a memory preview, the responses sheet, the owner's thread's bubble, the
    moment picker and its search, notifications and shares. So `# Bakery` reads "Bakery", `- [x] rye` reads "rye" and
    `**warm**` reads "warm". A heading is drawn at the row's own size (steward S6). The Chronicle's threads (0098)
    never take a mark as a word or part of one. The replay's screen-reader steps read a note's first 300 characters,
    then "The note goes on; open it to read the rest" (steward S7).
11. **NP11 · A journal page, without a journal app's chrome.** The page has no streak, insight, word or entry count,
    writing prompt, suggestion, template, cover, emoji icon, colour, highlight or font choice. Its only placeholder is
    "Start writing", which names the space and asks nothing (steward S13). Text, headings, quotes and checkboxes are in `theme.ink` (`theme.muted` for the head's
    line and a quote's rule), and a ticked box is told apart by its mark, not its colour.
12. **NP12 · A screen reader hears its structure.** The head is heard first. Then each line with its kind: "Heading",
    "Bullet", "Numbered item 2", "Checkbox, ticked" (a checkbox that can be ticked from the reader on the page).
    The toolbar's and panel's buttons are heard by name and state. On the web, the text being written is 16 px or
    more.
13. **NP13 · Nothing leaves the device.** Opening, writing in or reading a page makes no network request: the editor's
    code is bundled with the app. A URL in a note is text; it is never fetched, previewed or made a link (steward S5).
    On a phone the WebView navigates nowhere but its own bundle, and pasted HTML keeps only the page's own marks: no
    `img`, `iframe`, link or remote style survives a paste (steward S11).
14. **NP14 · A camera on the page.** Beside Aa and @, a camera takes a photo or a video as the stack's camera does,
    one tap. It is kept as its own moment, with its own time, fix and walk (never a piece of the note), and the note
    gets an @-mention card of it where the cursor was, as if it had been picked (NP5, RF4). The page stays open with
    the keyboard back. A photo whose save fails is held with Retry, as on the walk (SA8), and no mention is added until
    it is kept. Cancelled, nothing changes (steward S12; Always, "Capture is one tap away").

## Retired or amended

The quality-of-life spec's note card and its 500-character cut (the composer's limit, and Edit note's card) are
amended by NP1 and NP8 (decision 0151). Their test reads the limit from `NOTE_MAX` (20,000), and Edit opens the page.

## Record

Built 2026-11-12 on `claude/blissful-ptolemy-o3q79x`: NP1-NP14 tested first by history (14 of 14, `check:test-first`),
unit tests in `src/lib/__tests__/notes/`, the dbContract NP7 case, and the `notepage` journey. Native unverified.

### Audit (2026-11-12, at the owner's request; auditor, steward and ux-reviewer together, decision 0145)

27 findings: 20 fixed (two in part), 3 deferred, 4 merged into others. Pictures: `np-01` to `np-05` (390 x 844).

1. A stack's note takes its face's mark (`facedAt`): accept, fixed; `note-pages audit 1`.
2. The viewer heads a placed note "No place kept": accept, fixed (the head says what it knows; Memories passes its lines as `heads`); `note-pages audit 2` (unit and e2e).
3. A new page's head says no place: accept in part, fixed: "Place not kept yet" while the fix is on the way; `note-pages audit 3`. The walk's "how far in" and "just after" on a page being written are deferred (they need the walk's start and the capture before, at the tap).
4. A failed save on the way out loses a new note: accept, fixed (the page stays open until it is kept); `note-pages audit 4` (unit and e2e, with a storage fault).
5. The viewer shows a failed edit as kept: accept, fixed (rolled back; the page stays open); `note-pages audit 5` (e2e).
6. Empty bullets, boxes or quotes count as words: accept, fixed; `note-pages audit 6`.
7. `---` and indented lines are dropped once written in: accept, fixed; `note-pages audit 7`.
8. The editor's limit and the room line count differently: accept, fixed (the line uses the editor's count); `note-pages audit 8`.
9. The page's camera fails out of sight: defer (`docs/DEFERRED.md`): the photo is held and its Retry shows once the page closes.
10. The reader's mentions are chips, a gone moment keeps its words: accept, fixed: cards through TipTap's React node views (RF4's words and spoken name; the `threads` journey's RF4 checks), and a gone moment reads "A moment no longer kept"; `note-pages audit 10`. The card's picture is deferred.
11. A second leave deletes twice: accept, fixed; `note-pages audit 11`.
12. Marks split at a mention in a thread's bubble: accept, fixed (`noteParts`); `note-pages audit 12`.
13. The planner's pencil keeps the old card: accept, fixed; `note-pages audit 13` (`planner` journey).
14. A reply's page has no camera: accept, fixed; `note-pages audit 14`.
15. (steward S1) A new page's head lacks context: merged into 3.
16. (steward S2) The viewer says "No place kept": merged into 2.
17. (steward S3) A reply's page has no camera: merged into 14.
18. (steward S4) A ticked item's words are struck through: accept, fixed (the tick is the mark); `note-pages audit 18`.
19. (UX U1) Back and Done both keep: accept, fixed: Done is the one way out (Escape and system Back still leave and keep); `note-pages audit 19`.
20. (UX U2) The head leaves out context: merged into 2 and 3.
21. (UX U3) The keyboard bar is icon-only: accept, fixed (Format, Mention, Camera under their marks); `note-pages audit 21`.
22. (UX U4) The panel's typed glyphs and grouping: defer (a segmented style row and symbols are polish; nothing wraps or misleads).
23. (UX U5) The reader's boxes look tickable and do nothing: accept, fixed (a box opens the page, as the words do; it ticks nothing); `note-pages audit 23`.
24. (UX U6) The reader's info line repeats the date: defer (other journeys read the viewer's info line; a change of its own).
25. (UX U7) A focus frame round the page: accept, fixed (`webStyles`' `!important` outline is beaten on the page); `note-pages audit 25`.
26. (UX U8) The chip's edge is faint, its words generic: accept in part, fixed: the edge is `theme.edge` (3:1); `note-pages audit 26`. "A photo" as a camera mention's words is deferred.
27. (auditor, UI) A buzz a second into writing, its toast under the page: accept, fixed (no haptic for a note; the toast after); covered by review only.

Open: the `notepage` journey's NP9 check (the Undo after an emptied note is left) failed once in eight runs on the branch and
passed the other seven; the journey prints the page, viewer and toast counts when it fails, so the next failure says why.
