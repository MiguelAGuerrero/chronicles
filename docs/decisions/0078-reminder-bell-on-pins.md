# 0078. A pin with a reminder wears a bell

Date: 2026-11-04 · Status: accepted · Area: map, notifications, memories

## Context
"Remind me here" set on a capture left no mark on the map: the pin looked like any other, and you only saw the reminder by opening the capture or when it fired. The owner asked for a badge in the pin's corner, like an app icon's badge, but with a bell instead of a number.

## Decision
The owner's calls (Nov 4):
- Any capture kind with a live reminder gets the bell, not notes only.
- A merged pin shows the bell when any capture in it has a reminder.
- A faint memory pin keeps its clock top right, and the bell goes top left.
- The disc is dark ink, the clock's size; the bell tells it from the clock. The first pick, the accent orange, was changed after the audit measured it as bright as a note pin's amber (about 1.05:1). It is a bell, never a number (nothing is a score).
- The replay and a day show today's reminders, not the walk's (asked after the audit): the bell means a reminder is set now.

## Consequences
- The bell is drawn from the live `recall` rows and never stored. A reminder past its until-date shows none (`remindedIds`).
- `recallCheck` tells listeners after every reminder write (set, fired, stopped, deleted with its capture), and `useReminded` reads them once per map, so the bell changes at once on every map with no screen code.
- The web marker key and the native Marker key include the bell, so a change redraws only that pin.
- Spec: `specs/reminder-bell/spec.md` (RB1-RB7).
