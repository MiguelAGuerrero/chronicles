# 0272. A walk left running is offered its end where it went quiet: asked at a held Stop, the walk's end moved back

Date: 2026-11-27 · Status: accepted, waits on G16's build · Area: recording, walk screen, recording bar, replay · Amends: [0048](0048-recording-bar-has-its-own-stop.md) and [0220](0220-pause-then-resume-or-stop.md) (a held Stop no longer always ends the walk at once), [0041](0041-three-deletes.md) ("truth is append-only, deletes aside": a walk's end may now be moved back by the walker) · From: the owner's /investigate, in person, Nov 27 (`docs/research/forgotten-stop.md`)

## Context
The owner, Nov 27: "I noticed sometimes I forget to stop a walk and there go hours and hours of the last activity so
that needs to be a smart way to infer like do you wanna trim this walk down so that it's not 20 hours of nothing till
the last known point". On the web build a walk left running and stopped 20 hours later reads "20 h 01 min" on its
replay card, Chronicle's row and the strip, and its end mark sits where the phone was the next day, joined by a dotted
hop: a walk ends only at a held Stop, at the moment of the hold (`session.ts`, `stopWalk`), nothing reads the trace for
a quiet end, and reopening the app records the next day's spot into the walk. Nothing queued, deferred or decided
covered it. The investigation drew the ask and a More (⋯) row on the web build's pictures (`docs/mockups/forgotten-stop/`;
the canvas could not be published from the session, so the owner saw the rendered page).

## Decision
The owner's four answers, in person, Nov 27:
- **The look: "Ask, as drawn (Recommended)".** A held Stop, on the walk screen and on the recording bar, on a walk whose
  last activity (walking on, a ride, a capture, a Resume) was long enough ago asks once, in a card above the strip or
  the bar: "This walk went quiet at 8:35 PM yesterday." with "End it at 8:35 PM" and "Keep it all"; either ends the walk
  and the replay follows. A finished walk with a quiet end has one row in its More (⋯), "End it where it went quiet",
  asking the same. Not the other shape drawn (ended there by itself, with an Undo).
- **Quiet for: "30 minutes (Recommended)".** The ask shows only when the quiet after the last activity is 30 min or
  more, the longest break the app fills as a gap (0071).
- **The data model: "Move the walk's end back (Recommended)".** "End it" writes the quiet time as the walk's end; the
  readings after it stay stored (raw fixes are truth) and are left out when the walk is read; `SNAP_RULES` is bumped so
  kept walks are read again; no migration. The Stop's own time is not kept beyond the readings themselves.
- **A reminder: "No; ask only at Stop (Recommended)".** No notification and no reminder while a walk runs; nothing ends
  a walk by itself.

## Consequences
- G16 in `docs/STATUS.md`, "Next evolutions", built by `/slice --from=G16`.
- 0048 and 0220: the held Stop still ends the walk, and still only by a hold (and on the walk screen after Pause); on a
  quiet walk it asks one question first. A walk without a quiet end stops exactly as before.
- 0041: Walk stays truth; a moved end is the walker's own correction of it, like a delete, never derived. The slice
  updates AGENTS.md's "Truth vs cache" line ("deletes aside") and `.claude/rules/recording-and-traces.md` to say so.
- The lows stay in (0001): only the tail after the last activity is ever cut, never a sit mid-walk, a moment or a ride.
- Native, never run on a phone: the phone's shape of a quiet end (a long stay of a fix a second) and the two Stops' ask.
