# 0125. A note references other moments with @: the reference lives in the note's text

Date: 2026-11-10 · Status: accepted · Area: chronicle, captures, vision

## Context
The owner could not connect two moments from the Chronicle as a response (Nov 10). A first shape (an
"Answers another moment…" item in a card's ⋯ menu and the viewer's More, writing a `moment_link`) was gated
and answered, then reshaped by the owner: threads connect moments by an idea; a link connects one moment to
another directly, and the most primitive way is a reference, like an @ mention, embedded in the response
itself. Since decision 0123 a moment holds several media, so a response that mixes text, photos and memos is
already one moment; the reference is what was missing.

## Decision
The owner's calls, Nov 10:
- **A note can reference moments with @.** Typing @ in a note opens the moment picker; the chosen moment is
  embedded at that point and drawn as a card of its kind (its first piece, its date and place); a tap opens it.
- **The reference lives in the note's text** (a token in the body). It is the truth; nothing else is stored.
  What mentions a moment is read from notes when it is shown. No new table, no migration. Deleting the note
  removes its references with it.
- **Notes only.** A photo's or video's caption stays plain text (text over a picture, V4).
- **A reference touches no thread**, no `moment_link` and no referenced moment's row. Respond keeps its link
  and its thread (0104).
- **No menu item for it.** "Answers another moment…" is dropped: to connect two existing moments, write a
  note that references them (Respond → Note on one, @ the other).
- Any moment may be referenced, older or newer; the earlier answer "one at a time" applied to the dropped
  link and does not limit a note's references.

## Consequences
- A spec (`specs/moment-references`) carries these as criteria.
- Every place that shows a note's text as plain text (rows, Lately, the resurfaced card, notifications, the
  replay) reads a token as words, through one core function, so no raw token is ever shown.
- 0104's "moments stay whole" holds: a reference is part of the note's own content, written by its author.
