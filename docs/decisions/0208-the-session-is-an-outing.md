# 0208. The session is an outing; walking is one way to spend it

Date: 2026-11-17 · Status: accepted · Area: product, vision, recording, trace, fog, navigation · Amends [0020](0020-positioning.md) ("on foot"), [0040](0040-rides.md) (a ride never counts for streets) and [0121](0121-drive-there-walk-back.md) (the drive kept out of the record)

## Context
Reviewing Plan an outing (0194), the owner described the journey they had expected: a destination, towns passed through, a drive with stops
that hold moments. Asked what that meant for the walk, they said the docs had mistranslated the goal: "Walking was just one of the main ways
of achieving moment capture ... a lot of the times you have to drive to the place to walk around"; "nothing in the feature set really depends
on the action of walking. It's on the action of being present." `docs/VISION.md` already said the walks are "one way into" the corpus of
moments, but its first line ("making memories on foot") and its audience line ("people who walk to notice") made walking the identity, and
0040 and 0121 were built on that reading.

## Decision
The owner's calls, Nov 17:
- **The goal is moments**: capturing them, and surfacing opportunities to have them. Walking is the most common way, never the definition.
- **The session is an outing**, a working name ("leaning on outing, I suppose, for now"; the owner is unsure how it sits beside Explore, so
  the word may change and is copy, not structure). It is intentional: you begin it and you end it.
- **Nothing records until you begin one.** "All-day tracking" stays on the Never list (0036 holds).
- **Travel by any means is part of the outing**: a drive inside a session is recorded and traced and can hold moments. This reverses the
  part of 0121 that treated a recorded drive as the fault; "When I get there" stays as a choice.
- **Driven roads clear the fog as walked ones do**, "assuming that the app is up and able to trace". This amends 0040's "counted for places,
  never for streets".
- **Gaps in a driven stretch are inferred too.** Today's gap filling covers walked gaps only (between two walked fixes, at most 30 minutes,
  over streets most likely walked); the driven case needs its own rules.

## The vision page
Edited with this record, on the owner's "proceed with your amendments": "What it is" says "making memories while out" in place of "on
foot", citing this record; "Who it is for" says "people who go out to notice". The Never and Always lists are unchanged. The page is at its
size budget (12,000 bytes), so the Precedents table has no row for this record yet: the owner's to add when the page is next trimmed.

## Consequences
- Nothing in the code changes with this record. The slices it implies, in order: (1) the session's name in the app's words, and a ridden
  stretch as a full part of the outing (distance said for the whole, the part on foot in words); (2) streets and fog from a driven trace
  (a snapping rule at driving speed, so `SNAP_RULES` and `STREET_CODE` move; 0014's "along, not across" is a walking rule); (3) driven gap
  inference; (4) shops and attractions in one pool for the outing page; (5) the destination-first journey (`specs/outing-journey/`).
- The app's own routing stays on foot; the phone's maps app does the driving (0195).
- Still open, the owner's: capture while moving at driving speed (the stack as it is, or voice only); "walked there often" and "passed"
  for a driven stretch; whether Walk me back and the replay's beats need a driven form.
- Agent instructions that assume a session is on foot (skills, the steward's and the ux-reviewer's criteria, the area rules) are reworded
  as each slice lands; a scan of them was taken on Nov 17.
- Native: nothing new; a long driven recording has never run on a device.
