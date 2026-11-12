<!-- Note pages. Written in the repo first (2026-11-12) from the owner's /slice request and their calls in the
     conversation (decision 0149). Not a concept-doc tab. -->

# Note pages (NP)

A note was a few lines: plain text, 500 characters at most, typed into a small card ("Jot it down", "A line about
here", Edit note). The owner wants a note to be a page that "will feel like a journal or an actual document entry",
"exactly like a journal app", built on established libraries. The reference is Apple Journal: the pencil opens the
entry full screen, it is headed by its date and place, formatting sits under an Aa button above the keyboard, and
what you write is kept as you write it (decision 0149).

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
Criteria: NP1 (one tap), NP2 (context heads the page), NP6 (no count of ticked boxes, no reminder from one), NP10
(marks never read as words elsewhere), NP11 (no streak, count, prompt, colour or cover), NP13 (nothing leaves the
device).
Open: none (the owner's calls below).

## Decisions (the owner's)

- **2026-11-12, structure:** formatting by headings, bullet and numbered lists, checklists, quotes, bold and italic,
  made by typing shortcuts or from a button above the keyboard. No practical length limit. @ mentions stay. No
  dragging of blocks and no "/" menu.
- **2026-11-12, media:** a page holds photos only as @-mention cards of other moments, as today.
- **2026-11-12, storage:** the note's `body` holds Markdown. No migration and no new table.
- **2026-11-12 (decision 0149):** the reference is Apple Journal; the pencil opens the page straight away (the small
  card goes, and with it the earlier "card + Expand"); the page saves as you write; the editor is TipTap in Expo DOM
  components, an established library rather than our own.
- **2026-11-12, defaults in the plan, the owner may still change them:** no separate title field (the vision is
  silent); notes written before are read through the same parser; checkboxes tick only on the page, not in the
  viewer (steward S1, 0114).

## Acceptance criteria

1. **NP1 · The pencil opens the page.** The pencil on Navigate's stack, on the walk, on Memories' band, Respond →
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
7. **NP7 · What is kept is what is shown.** The body holds Markdown, written by the editor, with mentions as
   `@[id|words]` (0125). A page reopens exactly as it was left: formatting, ticks, mentions and line breaks. A note
   never written on the page keeps its stored text byte for byte, however often it is opened. A note written before
   this slice opens with its words and line breaks whole. Markdown outside what the page makes (a link, a table,
   `~~`) is shown and kept as the text that was typed, never dropped.
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
10. **NP10 · Elsewhere a note reads as its words.** Everywhere a note is shown outside its page, it reads as its words
    with the marks dropped and its lines kept: Lately, the resurfaced card, the replay's bubbles and its pause, the
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

## Waiting on the owner (the steward's second pass)

- **Notes written before this slice** (S10): read through the parser, an older note's `> 5 km` reads "5 km",
  `*sigh*` turns italic and `snake_case` loses its underscores, everywhere at once. Keeping them literal needs a
  stored mark on the notes the page writes: a new field, so a SQLite migration. The plan's default is to format them
  anyway.
- **The camera while writing on a walk** (S12): the page covers the capture stack, so a photo needs Done first. One
  shape: a camera beside Aa and @ that keeps the photo as its own moment and mentions it in the note, as Journal's
  toolbar has a camera.

## Retired or amended

The quality-of-life spec's note card and its 500-character cut (the composer's limit, and Edit note's card) are
amended by NP1 and NP8 (decision 0149). Their test reads the limit from `NOTE_MAX` (20,000), and Edit opens the page.

## Record

(Filled in as the slice is built: what passed, what was deferred, the UI review's triage.)
