# 0276. A walk left running: the plan review's calls, the proxy's under 0157

Date: 2026-11-28 · Status: accepted · Area: recording, walk screen, recording bar · Amends: none (applies 0272) · From:
the steward's review of `specs/forgotten-stop/plan.md` (G16, `/tend inbox G16 yes`)

## Context
G16's plan, read by the steward before any code (Nov 28), found one reader of a finished walk's trace missed (Plan an
outing's "visited on foot"), the ask drawn over the capture stack, "the hours after it" in the More row's hint, two filled
accent buttons with the ask up, and the date's words for a day further back; and asked four questions nothing had
answered. The owner said "Proceed autonomously" (Nov 28): each call below is the proxy's call under 0157, 2026-11-28, not
the owner's.

## Decision
- **Every reader of a finished walk's trace reads it up to `ended_at`** (`untilEnd`); only Share GPS log, the export
  bundle and the backup read it whole; a test names every `getPoints(` by class (steward 1).
- **The approved drawing's look is kept; a capture tap with the ask up closes it and captures in the same tap** (steward
  2; VISION Always, "Capture is one tap away"): the card sits above the strip clear of the capture column, and above the
  bar in the page's flow; it is not modal to a screen reader (forgotten-stop audit 13).
- **The words:** the More row's hint names no unit of time, "At 8:35 pm yesterday; what came after it leaves the walk"
  (steward 3); "8:35 pm", as every clock time in the app (`clockOf`), where the drawing wrote "8:35 PM"; "yesterday" in
  lower case, no word for today, "on <day>" further back (steward 5).
- **With the ask up, End it is the only filled accent**; a tap on the strip, outside the card, Back or Escape closes it
  and ends nothing (steward 4).
- **Share GPS log, the export and the backup keep every reading, unmarked** (QE8 as approved; the trace is truth).
- **A linger within 50 m for 30 min or more at the end reads as quiet**: nothing ends without the walker's tap, and Keep
  it all is one tap.
- **Keep it all is not remembered**: the More row stays on a kept walk with a quiet end; remembering it would be a stored
  field, a data-model change, the owner's (filed `[owner]` low in `docs/DEFERRED.md`, walk-screen).

## The diff review's calls (Nov 28)

The built slice, read by the auditor, the ux-reviewer and the steward; the proxy's calls under 0157, 2026-11-28:
- **A Stop loses no reading:** a finished walk is read up to its end and the minute after it (`END_GRACE_MS`), since a
  Stop writes the end before the recorder stops and a phone's clock runs a few seconds ahead; not a cut only where End it
  moved the end, which would need a stored field (forgotten-stop audit 9).
- **The Stop's ask keeps End it first, as drawn**; the HIG and Material put the default trailing: the owner's question,
  filed `[owner]` low (ux 4). The More's ask follows the sheet's Delete confirm, Cancel leading (ux 1).
- **Departures from the drawing, kept:** the walk screen's card is narrower than drawn, clear of the capture column, and
  its buttons stack at 390 with End it on top (ux 5, steward 2); the bar's card sits under the page's own capture row,
  which the drawing replaced (ux 6); the More's ask is the sheet itself, no card shadow (ux 7); the paused strip at 320
  puts the distance under a time in hours (ux 8, QE10).
- **The bar's ask** is asked only where it was held: another tab, a click on the page outside it, Back, Escape or a
  capture kept into the walk close it, ending nothing (steward 9, audit 5, 14).
- **Left to the owner** (`[owner]` low in `docs/DEFERRED.md`, walk-screen): an Undo for End it (the steward's silent 1),
  the bar's "20:00" beside a clock time (silent 2), the HIG order of the Stop's ask (ux 4); E-walk-screen-4's amendment
  (silent 3) is the owner's, under 0236.

## Consequences
- `specs/forgotten-stop/spec.md`, "The plan's review" and "Open questions"; QE3, QE5 and QE9 carry the accepted
  findings, each with its test (`forgotten-stop steward N`).
- AGENTS.md's "Truth vs cache" and "Raw fixes" lines, in the steward's wording, under a lease (0235).
- E-walk-screen-4 ("… to bring the walk straight back as its replay") meets one question on a quiet walk; an amendment is
  the owner's (0236), named in the run's report.
