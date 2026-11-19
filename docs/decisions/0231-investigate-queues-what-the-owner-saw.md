# 0231. `/investigate`: what the owner saw is researched, their calls asked at once, and queued as a G entry with a brief

Date: 2026-11-19 · Status: accepted · Area: process, skills · Amends: 0129 (the three-entry cap), 0130 (`/slice --from` reads a brief) · From: the owner, in person, Nov 19

## Context
The owner sent a screenshot of the Walkability layer ("it's not apparently clear which way it is") and asked for a read-only
investigation that would "queue up future work". It was done by hand: every mark on the screen decoded to the code that draws it,
the causes ranked, precedent from adjacent apps, options with their vision risk, a recommendation and three questions for the owner.
Then the owner asked for that to be a workflow "that can slot in easy with the current orchestration skills". No skill did this job:
`/tend` finds what nobody asked about, `/fix` builds one known bug, `/slice` builds a feature already described, and `/vision` judges
an idea without investigating it.

## Decision
The owner's four answers, Nov 19, each the recommended option:
- **Queue as a `G` entry, reusing the pipeline.** The run files a `G` entry under "Next evolutions" with numbered criteria and a
  `From: /investigate` line; `/tend inbox G<n> yes` builds it through `/slice --from=G<n>` as today (0130). An entry from
  `/investigate` is the owner's own ask: it counts toward none of `/tend`'s three open `G` entries (0129), no loop proposal replaces it,
  and the balance does not hold it. One commit's worth is a `T [owner]` entry instead.
- **The write-up lives in `docs/research/<slug>.md`**, named on the entry's `Brief:` line. `/slice --from` reads it first and does not
  investigate again what it settled.
- **The owner's calls are asked in the same run**, with AskUserQuestion, recommended option first with its precedent. An answer that
  amends a decision is a decision record in the same run; a call left unanswered is an `Open:` line, and `/tend` does not build an entry
  that has one.
- **It publishes its record to `main`** (the brief, precedent lines, decisions, the entry), never app code; `--deploy=branch|none`
  withholds it.

## Consequences
- `.claude/skills/investigate/SKILL.md`; a row and a route in `.claude/skills/README.md`; `/tend` sections 7 and 9 and `/slice`'s
  `--from` paragraph name it.
- Unlike the loop, `/investigate` may add lines to `docs/research/adjacent-apps.md`: the owner typed it.
- The first run is the walkability one (decision 0232, `docs/research/walkability-car-ground.md`).
