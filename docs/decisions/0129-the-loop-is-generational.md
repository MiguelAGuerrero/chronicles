# 0129. The loop is generational: a polished area owes its next evolution, and each run reads growth against refinement

Date: 2026-11-11 · Status: accepted · Area: process, product · Extends: 0128

## Context
With `/tend` (0128) the loop only refines. The owner asked that it also evolve the app: once a feature set is
polished or ready for its next iteration, the loop proposes that iteration, and some check keeps the app growing
and not only stabilizing, balancing a slice's size against its payoff.

## Decision
- **Each area has a state** in the loop's ledger, moved only by a sweep: `rough`, `settling`, `polished`,
  `resting`. A slice landing makes its area rough; a whole sweep that ships nothing above low, with every screen
  under a journey and an empty inbox, makes it polished.
- **A polished area owes an evolution** in the same run: up to three open proposals (`G<n>`, under "Next
  evolutions" in `docs/STATUS.md`), each with its source, its `/vision` verdict, the thinnest slice a person would
  notice, and its payoff, cost and risk in words. Sources are the vision page, what was left out on purpose, the
  next thing a person would try, what the area now makes possible, and repeated findings with one cause. Never what
  other apps have, and never a Never row. "Nothing to add" is an answer and makes the area `resting`.
- **Sizes:** S (the loop builds it on a yes), M (one slice), L (never proposed whole; its first S or M slice is).
- **Ranking:** Return, then Honour, then Earn (Chronicle first); how often a person meets it; whether it deepens
  the replay or the corpus; against cost and what stable areas it reopens. A noticed S over a deep M; nothing new
  on a rough base.
- **The balance, read every run** from 14 days of `main`: no growth commit, or nothing queued and no open
  proposal, is *settling* and the run must propose for the whole app; more than three rough areas, more than ten
  unanswered entries or a red `main` is *outgrowing its base* and the run proposes nothing new.
- The owner picks; the loop never starts an evolution unasked (0128's line holds).

## Why
Polish has no natural end, and a loop rewarded only for findings would keep finding them. Tying proposals to an
area's state gives growth a trigger and gives polish a finish; refusing to stack on a rough base is what keeps
velocity from turning into rework.

## Consequences
- The states and the shares are the loop's working notes, for the owner and the ledger only. Nothing is a score
  in the app (0020), and none of this is shown there.
- The thresholds (14 days, three proposals, three rough areas, ten entries) are first guesses; the owner changes
  them by saying so, and the skill is edited.
- Commit subjects are how growth is told from refinement, so the habit of naming criteria in them now matters twice.
