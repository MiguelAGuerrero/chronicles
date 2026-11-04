<!-- Repo first: written from the owner's request in a session (Nov 4), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Reminder bell: a pin says it has a reminder

Nov 4, 2026 · @Miguel Guerrero

A capture with "Remind me here" set looks like any other pin on the map, so you only know it's there when it fires, or when you open the capture and see the filled bell. This change adds a small bell badge to the pin's corner, the way an app icon carries a badge, but with a bell instead of a number.

## Decisions (the owner's calls, Nov 4)

- Any capture kind with a reminder gets the bell (note, photo, voice memo, video), not notes only.
- A merged pin (a count) shows the bell when **any** capture in it has a reminder.
- Faint memory pins keep their clock badge top-right; the bell goes top-left.
- The disc is dark ink, the clock's size (after the audit, replacing the first pick, the accent orange: as bright as a note pin's amber).
- The replay and a day show today's reminders, not the walk's (after the audit): the bell means a reminder is set now.
- A badge, never a number: nothing is a score.

## Criteria

1. **RB1** A capture pin whose capture has a reminder shows a bell badge over its head's top-right corner (`pin-reminder` on web): a small solid ink disc, the memory clock's size, white bell, white edge. A pin with no reminder has none. Any kind: note, photo (over its picture too), voice memo, video.
2. **RB2** A merged pin shows the bell when at least one of its captures has a reminder, and none when none does. `pinReminded(pin, ids)` in `lib/pins.ts` is pure. Unit-tested.
3. **RB3** A reminder past its until-date shows no bell (it will never fire again). `remindedIds(recalls, now)` in `lib/discovery/recall.ts` is pure. Unit-tested.
4. **RB4** A faint memory pin with a reminder shows the bell over its top-left corner and keeps its clock top-right; both stay solid and full size outside the fade.
5. **RB5** Setting, changing or stopping a reminder in the viewer shows or hides the bell on the map behind it at once, with no reload, and on the same pin (focus returns to it; a photo keeps its picture). A reminder's end passing with the map open takes its bell off then. A "once" reminder that fires and clears loses its bell; a capture deleted with its reminder takes the bell with it.
6. **RB6** The bell shows on every map that draws capture pins: the walk screen, the replay, a day, Chronicle and Navigate (the home map draws no capture pins).
7. **RB7** The pin's spoken label says so: "Note, reminder set. Open"; "3 captures here, reminder set. Open"; "Memory: Note, reminder set".

## Routes and data

No new storage, routes or dependencies. Reminders are read from the existing `recall` store; the bell is drawn from them, never stored.

## Tests

- Unit: `reminderBell.test.ts` (RB1's any kind, RB2, RB3).
- E2E: the main walk's existing "Remind me here" step checks the note's pin gains `pin-reminder` after Save (RB1, RB5); the "once" fire step checks it is gone after the fire clears it, and back after flagging again (RB5); the replay's pin for the reminded note wears it too (RB6); the note flagged again on the later walk, shown as a memory pin, checks the bell sits left of the clock and says "reminder set" (RB4, RB7).

## Deferred

- Two web tabs open at once: a reminder fired or stopped in one leaves the bell in the other until it reloads (audit 5).
- On native the pin's Marker is still re-keyed when the bell changes, so a photo pin shows its icon for a moment (audit 4's native half; the web redraws in place).

## Audit (Nov 4)

11 findings: 8 fixed, 1 deferred, 2 rejected. Tests: `reminderBell.test.ts` (`reminder-bell audit 1`, `audit 2`), the e2e's `reminder-bell audit 3` and `audit 6` checks and the Stop check.

1. The viewer said "Reminder set" for one past its end, while the pin had no bell: accept; the viewer reads `liveRecalls` like the pin (`reminder-bell audit 1`).
2. A map left open past a reminder's end kept its bell: accept; `useReminded` re-reads at `nextExpiry` (`reminder-bell audit 2`).
3. Web: setting a reminder rebuilt the pin's element, so focus fell to the page when the viewer closed: accept; the bell redraws the same element in place (`reminder-bell audit 3`, e2e).
4. A photo pin flashed its camera icon when its bell changed: accept on web (the same fix, the same check); native deferred (above).
5. Two web tabs: a change in one doesn't reach the other: defer (above).
6. The bell was 16 px, the clock 18 px, and the e2e's "solid" check read the element's own opacity, which is always 1: accept; the clock's size, and the check multiplies the ancestors' opacity and compares sizes (`reminder-bell audit 6`, e2e).
7. The accent disc was as bright as a note pin's amber (about 1.05:1): accept, the owner's call: dark ink.
8. The replay shows today's reminders, not the walk's: reject, the owner's call (today's state).
9. RB6 named the home map, which draws no capture pins: reject as a failure; the spec's wording is fixed.
10. The e2e's "once fired, no bell" check could not fail (the note's pin is hidden while its card is up, MR7): accept; replaced by Stop from the viewer, checked behind the open viewer.
11. Native: a read finishing after a later write could leave a stale set: accept in part; `useReminded` keeps only its latest read. Whether expo-sqlite can reorder them stays unverified (`docs/NATIVE_UNVERIFIED.md`).

## Native (unverified on a device)

The badge inside a MapLibre RN `Marker`, and the Marker re-keyed when the reminder changes.
