# Reminder bell: a pin says it has a reminder

Nov 4, 2026 · @Miguel Guerrero

A capture with "Remind me here" set looks like any other pin on the map, so you only know it's there when it fires, or when you open the capture and see the filled bell. This change adds a small bell badge to the pin's corner, the way an app icon carries a badge, but with a bell instead of a number.

## Decisions (the owner's calls, Nov 4)

- Any capture kind with a reminder gets the bell (note, photo, voice memo, video), not notes only.
- A merged pin (a count) shows the bell when **any** capture in it has a reminder.
- Faint memory pins keep their clock badge top-right; the bell goes top-left.
- A badge, never a number: nothing is a score.

## Criteria

1. **RB1** A capture pin whose capture has a reminder shows a bell badge over its head's top-right corner (`pin-reminder` on web): a small solid disc in the accent colour, white bell, white edge. A pin with no reminder has none. Any kind: note, photo (over its picture too), voice memo, video.
2. **RB2** A merged pin shows the bell when at least one of its captures has a reminder, and none when none does. `pinReminded(pin, ids)` in `lib/pins.ts` is pure. Unit-tested.
3. **RB3** A reminder past its until-date shows no bell (it will never fire again). `remindedIds(recalls, now)` in `lib/discovery/recall.ts` is pure. Unit-tested.
4. **RB4** A faint memory pin with a reminder shows the bell over its top-left corner and keeps its clock top-right; both stay solid and full size outside the fade.
5. **RB5** Setting, changing or stopping a reminder in the viewer shows or hides the bell on the map behind it at once, with no reload. A "once" reminder that fires and clears loses its bell; a capture deleted with its reminder takes the bell with it.
6. **RB6** The bell shows on every map that draws capture pins: the walk screen, the replay, a day, Chronicle, Navigate and the home map.
7. **RB7** The pin's spoken label says so: "Note, reminder set. Open"; "3 captures here, reminder set. Open"; "Memory: Note, reminder set".

## Routes and data

No new storage, routes or dependencies. Reminders are read from the existing `recall` store; the bell is drawn from them, never stored.

## Tests

- Unit: `reminderBell.test.ts` (RB1's any kind, RB2, RB3).
- E2E: the main walk's existing "Remind me here" step checks the note's pin gains `pin-reminder` after Save (RB1, RB5); the "once" fire step checks it is gone after the fire clears it, and back after flagging again (RB5); the note flagged again on the later walk, shown as a memory pin, checks the bell sits left of the clock and says "reminder set" (RB4, RB7).

## Deferred

- None yet.

## Native (unverified on a device)

The badge inside a MapLibre RN `Marker`, and the Marker re-keyed when the reminder changes.
