# 0178. The journal's capture is a toolbar at the foot

Date: 2026-11-14 · Status: accepted · Area: memories · Replaces: decision 0175 (the row under the line); an exception to ui-patterns T8

## Context
Decision 0175 put the camera and the mic in a row under the open line's placeholder, with a "+" in the margin. Built,
deployed and audited, it did not look right to the owner: "This doesn't look good … the interface doesn't seem
standard." The "+" sat against the screen's edge, nothing shared a left edge, and the row floated apart from the line.

## Decision
The owner, Nov 14, choosing from two mock-ups of the real app: "a toolbar that says what's on your mind and you have
the three action buttons." It is fixed at the foot above the tab bar, wherever the page is scrolled: a soft grey
field "What’s on your mind?" in the app's sans, then the pen, the camera and the mic. A tap on the field or the pen
writes on the page, in the owner's serif, as JN28 has it; the toolbar rides the keyboard as the writing row. While an
entry is open, Done takes the pen's place. On a 320 px phone the field's words are whole (15 px, tighter padding).

## Consequences
- JN41-JN46 in `specs/chronicle-journal/spec.md`; JN34-JN40 are retired (`scripts/features.js`, `RETIRED`), with the
  row's machinery: the "+", the row and its slot, `controlsAt`, the page's "opened" signal.
- ui-patterns T8 (no toolbar with the tab bar) gets an exception for the journal's capture toolbar: the owner's
  call, as 0112's "fixed low" stack was. The bar that showed when the page was pulled back (audit 50) is now the
  toolbar at all times.
- The page carries no placeholder; 0171's words are the toolbar's, and they stay at every scroll rather than leaving at the first character: this amends 0171.
- The docked field the owner turned down on Nov 13 as a "chat box" (JN28) returns by the owner's call: what keeps it apart is that the words are still written on the page, never in the bar.
- Native is unverified on a device.
