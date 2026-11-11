# 0141. A note's @ opens a palette: keywords for place and time resolve into the note's text

Date: 2026-11-11 · Status: accepted · Area: chronicle, captures, vision · Amends 0125

## Context
The owner (Nov 11) wanted a note to say "here", "over there" or "tomorrow" and keep what the word meant, because
by the time they recall a moment they may have forgotten it. The gate said aligned (Honour and Return): each
keyword is the owner's own pick, resolved from the moment's own fix and time, with no data leaving the device. The
steward found no breach and eight drifts (S1-S8), all taken into the criteria (RK13-RK17).

## Decision
The owner's calls, Nov 11:
- **`@` opens one menu beside the field**, Notion-style, in front of 0125's picker: where (here, next to me, over there), when (basic time anchors
  in prose) and the moments, which 0125 already embeds without a link. The app never matches free text.
- **A reference is a displayed word and its actual value, like markdown**, in the note's text: `@{kind|word|value|payload}`.
  Nothing else is stored; no table, no migration (0125 holds for the keyword too).
- **Plain text shows the word and its value in parentheses by default** ("here (the science center)"); a setting
  turns the parentheses off. A person who picks a reference means it resolved by the time they recall the moment.
- **Over there is a resolution picker**: the notable places near the moment, nearest first in words, or a point
  picked on the map and named by the owner. The same picker corrects a reference, by a tap in the viewer.
- **Time words** are a fixed list of anchors (now, soon, later, today, tonight, this morning, this afternoon, this
  evening, yesterday, tomorrow), each resolved against the moment's own time and stored absolute.
- **Deletion:** a reference's coordinates live in its note's text, so only deleting that moment removes them. A
  pointer to another moment that is deleted goes alone: the word and value stay. This amends 0125's "a moment no
  longer kept" for a reference that carries its words.
- **A Notion-style experience first, extensible later** (the owner, Nov 11): a note stays quick, easy and accessible; the
  menu filters as you keep typing after the @, on the web the arrows, Enter and Escape drive it, and a keyword is a
  pill where a note is read. Markdown shortcuts and a block editor are later; the entries and the token are open to
  new kinds. The field itself shows the words plainly: a native text field cannot style spans and stay controlled,
  and the web's is a plain text box, so tinted words in the field are deferred.
- **No weather and no temperature**: it needs a network call, and the cloud has no decision that says what it is for (0005).

## Consequences
- `lib/refs.ts` parses both token forms; `lib/refKeywords.ts` (core) holds the entries, the ranges (`REF_RULES`), the
  time words and the distance words; `lib/refPlaces` (shell) reads only the places and streets the app already
  cached; `lib/refValues` (shell) keeps the setting. A nearest-place label is the owner's pick from a list shown
  before it is stored (vision open question 5: read as the owner's own, not calculated for them).
- A reference's value in the palette and in the note are the same words (one form, defined once).
- The strings the core modules build (the resurfaced feed's words, Memories rows, a notification) always show the
  value; the setting reaches the screens that draw a note (`docs/DEFERRED.md`).
