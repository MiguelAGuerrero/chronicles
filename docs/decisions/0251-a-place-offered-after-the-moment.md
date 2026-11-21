# 0251. A place offered after the moment

Date: 2026-11-20 · Status: accepted · Area: explore, captures · Amends: 0224 (its "no which-place chip"), with 0246 and 0247 · From: `/slice moment-assignment-fallback`

## Context
Since 0224 a moment finds a place only when the walker starts from the place (Capture here, then 0246's card row). The
owner often takes a picture of a place without looking at the screen, so the deliberate way is missed and the moment
stays plain, with no way back. They asked for a fallback: a little prompt after the moment, assign it or leave it.

## Decision (the owner's answers, Nov 20)
- A moment kept on the walk screen, with Places on and not begun on a place's card, within **30 m** of unfound places
  shown on the map, brings one quiet line at the top: "Was this photo about Old Bridge?" with **Yes** and **Leave it**.
  The words say "about" (the owner's pick over "assign"), and name the moment's kind.
- **Two or more** places in reach become choices on the map: a ring around each pin, their names written and in the
  line ("Tap one on the map"), never counted; a tap on one ties the moment to it. With one place its pin is a choice too.
- A tie is the same find a card capture makes, and shows "Found: X" with **Undo** until used or dismissed; Undo removes
  that find only (`removeFind`), the moment stays.
- **Only with Places on.** Nothing is asked of a moment kept on another screen (the recording bar, Chronicle, the ready
  screen, a reply), with no fix, or by places already found, of a kind switched off, or left.
- The line stays until answered or the walker moves on: a newer moment, 60 m away, Pause, Places off, the moment
  deleted, every place found. **No time limit** (the owner). Going away leaves the moment independent; silence is not a no.
- Leave it is remembered per walk (`offer_left:<walk>`, gone with the walk): that place is not offered again on the walk.
- Vision: aligned if reshaped (steward S1-S6 accepted, S2 in part: an explicit Leave it is remembered, silence is not).

## Consequences
One new `Db` method (`removeFind`, held by the contract) and one meta family; no migration, no IndexedDB version. The
line makes no sound and no buzz; only a Yes or a tap gives the find's usual feedback. On the web a choice's marker stands
over the moments' pins (a photo's own pin covered the place it was offered for); native order is unverified. A reload
drops a line not yet answered (the moment stays independent). Tying a moment to a place later, from its viewer, was
offered and not chosen (`docs/DEFERRED.md`).
