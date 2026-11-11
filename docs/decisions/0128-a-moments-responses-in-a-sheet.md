# 0128. A moment's responses open in a sheet over the viewer, as iMessage's reply view

Date: 2026-11-11 · Status: accepted · Area: chronicle, viewer, ui

## Context
A reply to a moment is a moment of its own with a directed link (0104). The only way to read a moment with what it
drew out was the whole thread's screen on Memories. The owner wanted the responses to one moment in a dedicated
context, without adding to the viewer, which "is for that moment and that moment only" (Nov 11). The vision gate
found it aligned if reshaped (`specs/response-thread`); the goal-to-control matrix lists two of its parts under Avoid.

## Decision
The owner's calls, Nov 11:
- **A sheet of its own.** A moment's responses open in a bottom sheet drawn inside the viewer (never a second Modal or
  a route), read top to bottom, oldest first, the moment first, as plain ink entries, each with its time, place, walk
  line and content. Not bubbles; the thread screen's note bubbles (fix thread-log) stay as they are.
- **The way in:** the info line's words ("a few responses") and More's Responses; a swipe up is the shortcut, as a
  swipe up in iOS Photos opens a photo's details: the same gesture where a phone user expects it.
- **Respond lives in the sheet too**; a response made there answers the sheet's moment.
- **Two departures from the matrix, accepted** as iMessage's focused reply view (`docs/research/ui-teardown.md` (c)):
  a sheet whose entries lead to a moment (matrix 11 avoids "sheets used to navigate"; the moment opens on the
  viewer's own stack and Back returns to the sheet), and long content in a full-height sheet (matrix 24).
- **The moment shows twice** at half height (behind the sheet and as the first entry), kept: a full sheet still opens
  on what is answered; the first entry is short (its context line and a few words).

## Consequences
- `specs/response-thread` (RT1-RT14) carries these. Nothing new is stored.
- `.claude/rules/ui-patterns.md` gains the exception, pointing here.
