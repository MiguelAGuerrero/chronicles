# 0240. Capture at a place: the card carries the capture row

Date: 2026-11-20 · Status: accepted · Area: explore, captures · Amends: 0224 (its "Capture here" arming and the armed line) · From: `/slice capture-at-a-place`

## Context
Since 0224 a moment found a place only after "Capture here" on the place's card. That armed the place, and a line
said "The next moment is about X" until the next capture from the stack. The owner found it unnecessary friction: tap
the place, tap Capture here, read the line, then capture somewhere else.

## Decision (the owner's answers, Nov 20)
- A tap on a place's pin opens its card, which carries the capture stack's three kinds in a row: Camera (photo or
  video), Voice, Note. A tap closes the card and begins that capture. The moment it keeps finds the place. Nothing is
  armed, and no screen says "the next moment".
- Within 60 m only, as before. Farther away the card says so in words and keeps Route here.
- Within 60 m the row comes first and Route here becomes a secondary button (steward S1, the owner's yes).
- The card closes once a capture starts. More pieces go through the usual "Add to this moment" pill.
- A found place offers the row again (steward S4, the owner's "Offer the row again"). Its pin opens its card, which
  lists the moments taken here: newest first, three at most, each in words, each opening it, never counted.
- No new stored link (the owner, after an audit of `moment` and `find`: "I'm not sure why we need a foreign key for
  this. What we're doing is capturing a moment"). A moment keeps its spot, so a found card lists the moments within
  60 m of the place, read by spot. A capture from a found card is a plain moment there. Only the first card capture at
  an unfound place writes the `find` row, as before.

## Consequences
The place rides on the capture's stamp (`pieceStamp.stampFor`'s `place`), so a cancelled or discarded capture leaves
nothing waiting, and a Retry of a held capture still finds. The found card lists by spot, so a moment about something
next door within 60 m is listed too; its words say "Moments here", never "about it". No schema change: no SQLite
migration, no IndexedDB version. A found pin takes taps again, which 0224's audit had made see-through. Where it
overlaps the moment's own pin, the card's lines open the same moments. `specs/tap-to-capture-places` TC3 and TC4 are
retired (CA1-CA12 replace them).
