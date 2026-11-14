# 0175. The camera and the mic sit under the open line

Date: 2026-11-14 · Status: accepted · Area: memories · Amends: JN29, JN32, chronicle-journal audit 51; an exception to ui-patterns T7

## Context
The journal's open line says "What’s on your mind?" (0171), but the camera and the mic were in a bar at the foot of the
screen, a screen-height away. The owner: "co-locate the action buttons with the placeholder text … that way it seems
like it's more suggestive that that's how you enter entries into the Chronicles."

## Decision
The owner, offered three layouts with their industry practice (Nov 14), chose the composer pattern (Facebook's
"What's on your mind?", Threads, X): the placeholder stays left-aligned on the page's last line, and the camera and the
mic sit in a row directly under it. While typing, the row moves to the bar on the keyboard, as today (Apple Notes,
Day One). Not taken: a centred, bottom-aligned prompt with the buttons above it (centred typing either reads as verse
or jumps left on the first letter, buttons above a prompt read against the eye's path, and a field at the foot read
as a chat box, JN28).

## Consequences
- JN34-JN40 in `specs/chronicle-journal/spec.md`. The bar shows exactly when the row is not wholly in view, the
  keyboard is up, or the sheet has not opened; never both.
- audit 51 (the camera and the mic never move) is reversed: they move from the row to the keyboard bar while typing.
- T7 ("no loose buttons on content") gets an exception: the row belongs to the line. T7's "container and 3:1" is
  waived: the row is on the page's own ground in ink, and a container would make it the block 0112 forbids.
- Native is unverified on a device.
- From the mock-up (Nov 14): a Notion-style "+" in ink in the margin before the placeholder (a tap puts the caret on
  the line; it leaves once there are words). On the steward's question, the owner: the placeholder "is not requesting
  you to do anything. It's more of a suggestion", so 0171's "one hint, no other prompt" holds.
