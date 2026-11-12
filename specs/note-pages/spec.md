<!-- Note pages. Written in the repo first (2026-11-12) from the owner's /slice request and their calls in the
     conversation. Not a concept-doc tab. -->

# Note pages (NP)

A note today is a few lines: plain text, 500 characters at most, typed into a small card ("Jot it down", "A line
about here", Edit note). The owner wants a note to be able to grow into a page, "Notion-style": expand it out and it
feels like a journal or document entry. The quick card stays for a quick line; **Expand** turns it into a full page
with light formatting, and an existing note opens as its page.

## Vision

Idea: Support a Notion-style editing feature per note: you can expand out a note, and it feels like a journal or an
actual document entry (the owner, Nov 12), with formatting (headings, bullet and numbered lists, checkboxes, quotes,
bold and italic) by typing shortcuts and a bar above the keyboard, no practical length limit, @ mentions kept,
opened by Expand on today's note card and when a note is opened from the viewer, stored as a small Markdown subset
in the note's body.
Verb: **honour** (a longer thought is kept with its moment, at its place and time, not in another app); **return**
(the note read back as a page, in its context).
Touches:
- Always: "A moment carries its context: place, time, its walk, what came just before ... It never appears as a
  bare thumbnail, filename or count." A page with only a title and words is a generic document.
- Always: "Capture is one tap away on every screen you walk or capture from." The pencil must still keep a note
  with one Save; the page is offered, never in the way.
- Never: "Scores, streaks, completion, coverage, levels, badges, leaderboards" and "Tallies such as '12 of 87' or
  '40%'". Checkboxes invite "2 of 5 done" and progress bars.
- Never: "Nagging: off-route alarms, 'time for a walk', re-engagement pushes". An unchecked box invites a reminder.
- Never: "Writing the owner's words for them". Notion and journal apps offer templates and writing prompts (Apple
  Journal's "Show Writing Prompts", `docs/research/ui-teardown.md` section 2).
- Never: "Data leaving the device without a tap". An editor must load nothing from a network.
- Always: "Restraint in motion, colour and copy: the content is the novelty, not the chrome." Notion's covers,
  emoji icons, colours and highlights are chrome.
- **[proposed]** "Browse standard, dwell diegetic ... A row that could appear unchanged in a generic journal app is
  wrong." Cited as a reason, not a rule.
- Decision 0104 and `docs/DEFERRED.md` ("A place-rooted journal: a thread with no moments, started top-down ... its
  own feature and goes through /vision first"). A page must stay a moment's note, never a blank document.
- Decision 0125 (mentions are text in the body) and 0098 (threads found in the words of notes). Formatting marks
  must not become words.
Verdict: aligned if reshaped
Shape: as asked, with these guards. The page is headed by its moment's context (date and time, place, walk), never
by a title alone. A page is always a note's: it opens from the note card or from a note that exists, and nothing
starts a page with no moment. Checkboxes are never counted or turned into reminders. No covers, icons, colours,
highlights, templates or prompts: formatting is in ink. Everywhere a note is shown outside its page, it reads as its
words without marks.
Criteria: NP2 (the head carries the moment's context), NP6 (no count of checked boxes, no reminder from one), NP12
(no colour, cover, icon, template or prompt), NP10 (marks never read as words elsewhere), NP1 (the card still keeps a
note with one Save), NP14 (nothing leaves the device).
Open: the editor's technology (plan, "Questions for the owner"); a separate title (the vision is silent; the plan
recommends none).

## Decisions (the owner's)

- **2026-11-12, structure:** a formatted page, with headings, bullet and numbered lists, checkboxes, quotes, bold
  and italic, made with typing shortcuts and a small bar above the keyboard. No practical length limit. @ mentions
  stay. No dragging of blocks and no "/" menu.
- **2026-11-12, entry point:** a quick capture keeps today's small card (one tap and Save). The card gets Expand,
  which grows it into the page. An existing note opened from the viewer shows as the page, read first; Edit, or a
  tap on its words, edits it.
- **2026-11-12, media:** a page holds photos only as @-mention cards of other moments, as today. Nothing new is
  stored.
- **2026-11-12, storage:** the note's `body` holds a small subset of Markdown. No migration and no new table.

## Acceptance criteria

1. **NP1 · The card stays quick, and Expands.** The pencil (Navigate's stack, the walk, Memories' band), Respond →
   Note and the note card keep a note with one Save, exactly as now. The card has **Expand**, which opens the page
   with everything typed so far, the cursor where it was and the mentions whole. Nothing typed is lost either way.
   Done on the page keeps the note as the card's Save would (same moment, same placing, same Add to this moment).
   "Exactly as now" is held by the tests that stay green unchanged: QL24, QL25 (its limit amended, below), MS1-MS6
   and the journeys `capturehome`, `stacks` and `walk` (steward S7).
2. **NP2 · The page is headed by its context.** Above the words, one line says when (the date and time of day), where
   (the moment's place in words, as Lately says it, or "Place not kept yet" while its fix is on the way, or "No place
   kept"), its walk ("On a walk in …", "not on a walk"), how far into the walk it was, and, when the capture before
   it was close, what came just before ("just after a photo"), in the words Lately uses (decision 0098). A note being
   written says when it is being written and whether it goes to a walk. Once the head has scrolled away, a short
   form of it (the date and the place) stays in the page's top bar at any scroll position. The page never shows a
   bare title or a count (steward S4).
3. **NP3 · Typing shortcuts.** At the start of a line, `# ` makes a heading, `## ` a subheading, `- ` or `* ` a bullet,
   `1. ` a numbered item, `[] ` or `[ ] ` a checkbox, and `> ` a quote, at once, with the marks gone from what is seen.
   Return on a list or checkbox item starts another of the same kind; Return on an empty one ends the list. Backspace
   at the start of a formatted line makes it plain text again. `**words**` reads bold and `_words_` italic.
4. **NP4 · The bar above the keyboard.** While the page is being edited, a bar sits just above the keyboard with
   Heading, Bullet list, Numbered list, Checkbox, Quote, Bold, Italic and Mention. Each sets or unsets its format on the
   line, or on the selected words for Bold and Italic, and says whether it is on (a pressed state that is not only
   colour). Each target is at least 44 pt, has a spoken name, and the bar scrolls sideways rather than wrap at 320 px.
   Mention opens the moment picker as typing @ does.
5. **NP5 · Reading the page.** A note opened from the viewer shows its page read-only: headings, lists, numbering,
   checkboxes, quotes, bold and italic drawn, and mentions as cards that open their moment (RF4, RF5). It scrolls
   from the head to the last line, however long. Edit in the viewer's toolbar, or a tap on the words, opens it for
   editing at the line tapped.
6. **NP6 · Checkboxes are never counted.** A tap on a checkbox while editing ticks or unticks it, and Done keeps
   it (ticking while reading: see "Waiting on the owner"). Nothing anywhere says how many boxes are ticked or left
   (no "2 of 5", no progress bar or ring). A box never makes a reminder, a notification or a badge, and the
   resurfaced card and recall never choose a note by its boxes (steward, silent 3).
7. **NP7 · What is kept is what is shown.** The body holds a small subset of Markdown. Every page reopens as it was
   left, formatting and mentions included (parse, then write, gives back the same text). A note written before this
   slice opens unchanged, as plain lines. Markdown outside the subset (a link, a table, `~~`) stays as the text that
   was typed, never dropped or rewritten. Any body in the subset, canonical or not, round-trips byte for byte: `* `
   stays `* ` and a list's numbers stay as typed (steward S3).
8. **NP8 · Room for a long entry.** A note holds up to 20,000 characters, counted as they are shown (a mention
   counts as its words). With fewer than 1,000 characters left, the page says "Room for a few more lines"; at the
   limit it takes no more and says "This note is full". No number is shown (steward S7). A mention picked at the end never takes the note past
   the limit (`docs/DEFERRED.md` 12, "A reference picked at the end of a note can take it past 500 characters").
9. **NP9 · Leaving the page.** Done keeps the note (a new note becomes a moment; an edited one is saved). Back,
   Escape or a swipe down on a new note returns to the card with the draft whole. On a note being edited, they leave
   at once if nothing changed. With changes, they ask once, Discard changes or Keep editing (matrix 9). A failed save
   keeps the page open with what was written and says so in words.
10. **NP10 · Elsewhere a note reads as its words.** Everywhere a note is shown outside its page (Lately, the
    resurfaced card, the replay's bubbles, the screen reader's steps, the home sheet, a memory preview, the responses
    sheet, the moment picker and its search, notifications and shares), it reads as its words without marks:
    `# Bakery` reads "Bakery", `- [x] rye` reads "rye", `**warm**` reads "warm", and lines stay lines. A heading
    is drawn at the row's own text size, after the place and time as the row already puts them (steward S6). The
    Chronicle's threads (0098) never take a mark (`#`, `[x]`, `**`) as a word or part of one. The screen reader's
    steps in the replay read a note's first 300 characters and then "The note goes on; open it to read the rest",
    since a step moves on by itself (steward S7).
11. **NP11 · In the owner's thread, a note is drawn formatted.** A note bubble in the owner's thread (fix thread-log)
    draws its headings, lists, checkboxes and quotes as the page does, in the bubble's size, and its checkboxes tick
    only as drawn: a tap there changes nothing in the body (steward S1).
12. **NP12 · Restraint.** The page has no cover, icon, emoji picker, colour, highlight, font choice, template or
    writing prompt. Its only placeholder is the card's own ("What's worth remembering?"). Headings, quotes and
    checkboxes are in `theme.ink` (`theme.muted` for a quote's rule and the head), and a ticked box is told apart by
    its mark, not its colour.
13. **NP13 · A screen reader hears its structure.** Each line is heard with its kind ("Heading", "Bullet",
    "Numbered item 2", "Checkbox, ticked"), a checkbox is a checkbox that can be ticked from the reader, and the page's
    head is heard first. The bar's buttons are heard by name and state. On the web every field is 16 px or more.

14. **NP14 · Nothing leaves the device.** Opening, editing or reading a page makes no network request. A URL in a
    note is text: never fetched, previewed or made a link (steward S5; Never, "Data leaving the device").

## Waiting on the owner (from the steward)

- **Ticking while reading** (S1): decision 0114 puts every action on a moment that exists in its toolbar or menu,
  and a stray tap while reading would rewrite the moment. The steward recommends ticking only while editing.
- **Notes written before this slice** (S2): `# 12 bus`, `- 3 pints` or `_x_` in an old note would turn into a
  heading, a bullet or italics. Keeping them literal means marking the notes saved from the page.

## Retired or amended

The quality-of-life spec's note limit ("cut to 500 characters, as the composer", in `specs/quality-of-life`) is
amended by NP8 to the new limit; its test reads the limit from `NOTE_MAX` (20,000).

## Record

(Filled in as the slice is built: what passed, what was deferred, the UI review's triage.)
