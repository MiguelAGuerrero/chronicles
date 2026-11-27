# 0275. Explore with no fix says no walk time, ages its fix out, keeps the pick, and a dismissed "location is off" waits for the next launch

Date: 2026-11-27 · Status: accepted, built in current-position (G17) · Area: location, Explore · Amends: [0273](0273-a-fresh-fix-when-a-screen-needs-where-you-are.md) ("Quiet notice each time") · Keeps: [0036](0036-no-all-day-tracking.md), NV17 · From: the steward's review of G17's plan (`specs/current-position/plan.md`), the owner in person, Nov 27

## Context
G17 builds 0273 on Explore. The steward's review of its plan found four questions 0273 had not settled: with location
refused, Explore still said "Providence · 44 min walk", measured from the area it last listed (a position it never
read); a fix Explore read kept saying "You're here" however long Explore stayed in front; a read 100 m on between tabs
would have dropped the walker's pick and reframed the map; and a walker who refused location on purpose would be told so
at every front, dismissed or not.

## Decision
The owner's four answers, in person, Nov 27:
- **"No walk time (Recommended)".** With no fix read, no card, row or tile on Explore says a walk time or distance from
  you. The areas stay listed; only the "from you" words go.
- **"Age it out (Recommended)".** A timer (no read, no watch) ages Explore's fix: a fix that stood in is drawn muted and
  said "From where you were twenty minutes ago." up to 30 minutes, and past 30 minutes no fix is shown: no dot, no
  "You're here", no walk time, until the next read.
- **"Keep the pick (Recommended)".** A read reframes the map and selects your own town only when the town you stand in
  differs from the one listed before; otherwise only the dot moves.
- **"Next launch (Recommended)".** A dismissed "location is off" notice stays dismissed until the app is next launched;
  still no dot either way. This amends 0273's "each time it comes to the front": each front until dismissed.

## Consequences
- YH4, YH5, YH6 and YH1 in `specs/current-position/spec.md` carry them.
- Also from the same review, engineering calls without a question: Explore reads by itself only while the permission
  reads granted, and asks (a read that may raise the system prompt) only at its first front in a launch, Find me and
  Locate being the way to ask after (Never "Nagging"); its return read waits while Plan an outing or the walk planner is
  open over it.
