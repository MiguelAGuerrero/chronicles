# 0231. The expectation lens: each `/tend` run asks what a person would reasonably expect, and growth from it comes with its workflows

Date: 2026-11-19 · Status: accepted · Area: process, tend · Amends: 0129 (no `G` while outgrowing its base, and none on a rough base: not for growth from the lens), 0128 (what the loop ships without asking: a refinement that serves no expectation and breaks no rule is filed), 0229 (a whole sweep is lenses 0-7) · Relates to: 0157, 0181, 0193

## Context
Since 0129, a balance that reads "outgrowing its base" (more than three rough areas) files no new `G`. Ten areas
are rough, so the loop proposed no growth in more than 60 runs; 0229 (a scoped reset) had just landed to let areas
progress. Every run looked for what was wrong against a rule, and none asked what a person using a feature would
expect of it, so refinement had no compass and growth had no way in.

## Decision
The owner, in person on Nov 19 (through the tend orchestrator session): "Per an iteration of 10, I want there to
be a basic conceptual test to be applied on each and every turn, which is, given this feature, what would I, a
user, expect reasonably to be provided? That should serve as a compass for how we assess the code, the behaviors
of the app against our philosophy, and move towards sharpening each 10 iteration towards progressing the product
versus an endless cycle of refinement."

Asked how to apply it, the owner chose:
- **Cadence:** "Every run, no checkpoint". Clarified: "Iteration of /tend". The test applies once per `/tend` run,
  every run; there is no ten-run checkpoint.
- **Grounding:** "VISION user + adjacent apps".
- **Its power:** "Let there be a a synthesis of refinement and growth her growth feature as we encounter them.
  Let's refine the implicated workflows around it to ensure that it works seamlessly that way as we grow we are
  iterating and polishing on areas that require it."

So, in `/tend` (`.claude/skills/tend/SKILL.md`) and the orchestrator's skill and briefs:

1. **The expectation, lens 0.** Each `/tend` run (one iteration) but a triage, before the other lenses, writes
   three to five lines per feature it touches: "A person [from `docs/VISION.md`, "Who it is for"] using <feature>
   would reasonably expect …", each grounded in that section and in how two or three adjacent apps do the job
   (`docs/research/adjacent-apps.md`, verified or not; a source the file lacks is marked "not yet recorded"; the
   loop never edits `docs/research/`). The `steward` checks the lines against VISION's Never lines at the run's
   first review pause (an `evolve` run, before it files); a line that breaks one is dropped and named. The lines
   go in the report and the run log (`expectations`, which `scripts/tend.js` requires of a sweep and a build).
   The lens answers which expectations the feature meets, which it fails (a defect) and which it lacks (growth).
2. **The compass in triage.** Every finding names the expectation or the rule it serves. A refinement that serves
   no expectation and breaks no rule or shipped criterion is filed `[loop]` low, not shipped. A defect against
   an expectation is triaged as any other finding.
3. **Growth with its workflows.** An unmet expectation of a feature in scope by VISION becomes a `G` entry
   whatever the balance reads and whatever its area's state. The entry names the existing workflows it
   implicates, and the slice that answers it refines them in its own criteria, so the growth works with what is
   there; that refinement is part of the slice, not a separate sweep. Other `G` sources keep 0129's rule. The
   three-open-`G` cap stays, and a better proposal replaces the weakest.
4. **Who says yes is unchanged:** the owner, or the proxy within 0157 (aligned or no surface, no architectural
   impact).

## Why
A rule says what is wrong; it cannot say what is missing or what is worth polishing. A person's reasonable
expectation, held to the narrow audience VISION names, says both: a refinement no person would notice waits, and
a gap a person would meet is growth the loop may propose even while areas are rough, built with the workflows it
touches so the base improves as the app grows. Adjacent apps ground what a person expects of a feature already in
scope; 0193's "precedent informs how, never what" holds for which features exist, and the steward's Never check
keeps a counter-example (a streak, a rating) out.

## Consequences
- The next sweeps (presence, tabs, map, after walk-screen; 0229) start with lens 0: each writes its features'
  expectation lines, has the steward check them at the first pause, files a lacking one as a `G` with the
  workflows it implicates though the balance still reads outgrowing, and files `[loop]` low any refinement that
  serves none of them instead of shipping it. Their run-log lines carry `expectations`; a whole sweep is lenses
  0-7.
- An inbox build applies lens 0 to the feature it builds, and the orchestrator adds the `steward` to its first
  pause (the diff, for a `T` build) for the lines; an `evolve` run gains a steward pause before it files.
- The proxy does not hold a `G` from lens 0 for the balance (orchestrator section 2).
- Run-log lines dated before 2026-11-20, and backfilled lines, are read as they were.
- The lens's steps are in `.claude/skills/tend/expectations.md`, beside the skill, which is at its 500-line budget.
- Each run costs a steward check more. The owner chose no checkpoint: nothing reviews the lens every ten runs.
