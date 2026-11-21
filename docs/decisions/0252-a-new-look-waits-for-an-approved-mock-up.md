# 0252. A new or changed look waits for a mock-up the owner approved

Date: 2026-11-21 · Status: accepted · Area: process, ui · Amends: 0128 (what the loop ships unasked), 0130 (a slice from an approved proposal)

## Context
The owner chose looks from mock-ups when one was made: the row under the line (0175), the toolbar at the foot from two
mock-ups of the real app (0178), the composer (0179), the replay's ceremony, held on a branch until it matched its
mock-up (0206). Nothing required one. On Nov 21 `/tend inbox` built T53, Chronicle's Contents regrouped with a switch
drawn in it, from the entry's words alone, and the owner saw the result only after it was live.

## Decision
The owner, Nov 21: "Ensure at each stage of product development, where UI is concerned, there is at least a draft mock
up for me to approve." Asked how far it reaches, the owner chose, each the recommended option:

- **What waits: a new or changed look.** Work that adds, removes, moves, regroups, restyles or rewords what a screen
  shows (a screen, a control, a state, a sheet, its copy) waits for a mock-up the owner approved, before any code or
  test is written: a slice, a `T` or `G` entry's build, a `/fix`, an audit's or a review's fix. A fix whose only visible
  effect is what its cited rule requires (focus order, a label no longer cut, a sheet that scrolls at large text,
  contrast brought to its ratio) restores an existing look and ships as before.
- **The mock-up is a drawn page, before beside after.** One private page, published with the Artifact tool: today's
  screen (a picture of the real build at 390 x 844) beside the change drawn at the same size with the app's tokens and
  its real words, every state the change touches, at 320 px where width matters, and two shapes side by side when
  there is a real choice, the recommended first. Its source is kept in `docs/mockups/<id>/`. The procedure is
  `.claude/skills/mockup.md`.
- **Approved at two stages.** When proposed: a `T` or `G` entry that changes a look carries its `Mock-up:` line when
  filed, so the owner's yes approves the look with the idea. At the plan, before code: `/slice` and `/fix` show the
  mock-up with the plan and wait for the owner's approval; a slice from an approved entry goes on without asking only
  while its plan draws the look the entry's mock-up showed. The built result is not held a third time.
- **Only the owner approves a look.** No proxy, reviewer or run approves one (as decision 0235's review said: a look
  call is never the builder's). The tend orchestrator puts every mock-up to the owner.
- **A script holds it (decision 0174).** `npm run check:docs` fails a spec written after this decision whose Vision
  verdict has a surface and which has no "## Mock-up" section naming its drawing and the owner's approval
  (`scripts/mockup.js`). The specs on `main` before it, and those on branches in flight, are grandfathered in lists
  that only shrink.

## Consequences
- `/tend` ships fewer visible changes unasked: a loop or review finding that would change a look is filed `[owner]`
  with its mock-up instead of shipped (0128 amended). Its run publishes the mock-up page and asks at its close.
- A yes to an entry filed before this decision without a mock-up is not built in that run: the run draws the
  mock-up, notes it on the entry and asks; the next `/tend inbox` builds it. T11 and T54 are the first.
- A departure from the approved drawing found while building (it does not fit at 320 px, a word that does not
  read) stops the build for a redrawn mock-up: asked at once by a skill the owner typed, filed by `/tend`.
- The review of a screen change gives the reviewers the approved drawing beside the built pictures.
