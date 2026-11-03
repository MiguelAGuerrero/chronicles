<!-- Mirror of the Claude Docs tab "Moments and days (queued)" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# Moments and days

Nov 1, 2026 · @Miguel Guerrero

A capture becomes a moment that stands on its own: you can jot one down anytime, with or without a walk, and each day collects its moments and walks into one timeline you can replay. Not started; the code waits until the owner has read this.

## The owner's decisions (Nov 1)

- **Moments stand alone.** A capture no longer needs a walk. Example: a dress seen in a store, kept for inspiration and for where it was.
- **Grouped by day**, local midnight to midnight. A walk belongs to the day it started, so one past midnight isn't split.
- **A timeline per day** lists moments and walks in order. Its replay moves the map pin to pin; a walk inside it plays its path.
- **Pins only.** No automatic all-day tracking. A trace is recorded only during a walk.
- **Jotting first.** Remind me here can still be set on a moment, but noting something to look back on is the main use.
- **No evening nudge.** The day's replay opens only when you go to it (restraint).
- **Days live in the home sheet**, beside the walks, not on a new screen.
- **Words:** "moments" for captures, "your day" for the grouping. The walk keeps its name and its own five-beat replay.

## Criteria

Capture anywhere

1. **M1** The home shows camera, mic and pencil beside Start walk. Each makes a moment with no walk open, in one tap plus the capture itself.
2. **M2** A moment made outside a walk takes one location fix: up to 10 s, at 50 m accuracy or better. If none comes, it is saved without a place and says so ("No location").
3. **M3** A moment made during a walk behaves as today: it belongs to that walk and appears in the walk's replay.
4. **M4** Captions, saving a keeper, Remind me here and finding a place work on a moment with or without a walk.
5. **M5** Nothing records location between moments. With no walk open, the app asks for location only while a moment is being made.

Your day

6. **M6** A day runs local midnight to midnight. A moment belongs to the day of its time; a walk to the day it started.
7. **M7** The home sheet lists days, newest first, each as "\<weekday, date> · N moments · M walks". Only days with something in them are listed.
8. **M8** A day's timeline lists its moments and walks in time order. A walk is one row ("Walk · 2.1 km · 4 moments") that opens its own replay. A moment opens in the viewer.
9. **M9** Today is at the top of the list and grows as moments are made.

The day's replay

10. **M10** "Replay this day" moves the map to each moment's pin in time order and shows each the way a walk's replay does: photos and videos full screen, memos and videos played to the end.
11. **M11** A walk inside the day plays its path and its moments, then the day carries on. Its fog beat is skipped inside a day's replay.
12. **M12** The first replay of a day waits at each moment until Continue. Watching again, or opening it later, advances by itself, as walks do.
13. **M13** It ends on a quiet card: "\<weekday> · N moments · P places", with the walk distance if any. No streaks, badges or confetti.
14. **M14** A moment with no place appears in time order without moving the map.
15. **M15** No notification or prompt ever suggests watching the day.

The map

16. **M16** Moments outside walks show as pins on the home map, grouped by screen distance like walk pins. Stars still mark the places walked.
17. **M17** Old walks and their captures keep working unchanged, with no re-import.

## Data model

One field changes: a capture's `walk_id` becomes optional. Days are never stored; they are worked out from times when read.

| Change | Native (SQLite) | Web (IndexedDB) |
| --- | --- | --- |
| `capture.walk_id` may be null | New migration rebuilds the table (SQLite can't drop NOT NULL in place) | Nothing; objects are stored whole |
| Read moments by time | Index on `capture (t)` | Index `t` on the capture store, new version step |
| A find without a walk | `find.walk_id` may be null, same rebuild | Nothing |

- Capture stays truth: append-only apart from its own fields.
- The home's rule widens from walks, summaries, `Area` and `WalkArea` to those plus capture rows by time. It still never reads traces or media files.
- Unstamped moments are placed at stop only inside a walk. Outside one, the place is set when the fix arrives, or never.

## Deferred and open points

- **Quick capture outside the app** (widget, lock screen, share sheet): the next step once moments exist.
- **Remind me here outside a walk** needs background location to fire. Until then, a reminder set on a standalone moment fires only on walks.
- **Places for moments:** moments outside walks aren't counted in a place's stars. Open: should a place view list them?
- **Travel:** days use the phone's current time zone, so a trip across zones can shift a moment to the next day. Accepted for now.
- **Deleting a moment** doesn't exist yet, as for captures.

## Tests

- **Unit (`npm test`):** day grouping and midnight rules (M6), the day's ordering with walks as rows (M8), replay timing for a day (M10–M14).
- **e2e (`scripts/e2e-web.js`):** a moment from the home with and without a fix (M1, M2, M5), the day list and timeline (M7–M9), the day's replay with a walk inside it (M10–M13), home pins (M16), and an old walk still replaying (M17).
- **Native, unverified on a device:** the SQLite migration and the one-fix capture.
