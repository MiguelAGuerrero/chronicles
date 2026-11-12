# 0153. The replay's cards: one accent action, no accent light, named places, no lows on the day

Date: 2026-11-12 · Status: accepted · Area: replay, map · From: the owner's answers in person to the steward's questions of the `/tend replay` sweep (Nov 12)

## Context
The first sweep of the replay put five questions to the owner that `docs/VISION.md` does not settle (the steward's
"Silent" Q1-Q5, pause 1 of `/tend replay`, Nov 12). The replay rule says "No accent colour or large number on the
card", yet Name it, Keep it and Done are filled in the accent (`theme.accent`, `#c2410c`), and only Name it was ruled
(tabs audit U14). Beat one lights the walked streets in `COLORS.walked`, the same hex as the accent, and they stay lit
through the path (VISION.md Never: "Celebration: confetti, fanfare, big numbers, accent-coloured wins"). The day's card
(M13) says "N moments · P places", where "places" counts spots within `SPOT_M`, while the rest of the app means named
places. The day's card carries no lows, though "the lows stay in" (0001). Leaving the name step dropped what was typed.
The owner answered in person; these are the owner's calls, not a proxy's.

## Decision
1. **A card's single primary action may carry the accent**, as U14 kept for Name it: Name it, Keep it, and the day
   card's Done. Everything else on a card stays ink.
2. **The replay never lights anything in the accent.** The walked colour is to be its own, apart from the accent; the
   palette is not chosen yet. Filed as `/tend` entry T22; nothing changes until the owner picks it.
3. **"Places" on the day's card means named places only**, as elsewhere in the app, said in words. Folded into `/tend`
   entry T19 (the cards' counts in words), which amends M13.
4. **The day's card carries no lows.** Each walk's own replay carries its lows; the day's card stays a quiet summary.
5. (Settled in the same run, by `tend replay 4` and `5`.) Leaving the name step by Back or Escape returns to the card
   with the words typed kept.

## Consequences
- The steward and the e2e's accent scan exempt one primary action per card; any other accent on a card is a finding.
- T22 reaches every map that draws walked streets (the replay's fog and path, Chronicle's map, the walk's end marker of
  QL2, which is "a thick ring in the walked orange"), not only the replay.
- M13's wording changes only through T19's answer.
