# 0234. The expectation lens: each `/tend` run tests a feature against what a person would reasonably expect, from a list the owner ratifies, and growth from it comes with its workflows

Date: 2026-11-19 · Status: accepted · Area: process, tend · Amends: 0129 (no `G` while outgrowing its base, and none on a rough base: not for growth from the lens), 0128 (what the loop ships without asking: a refinement that serves no expectation and breaks no rule is filed), 0229 (a whole sweep is lenses 0-7) · Relates to: 0157, 0181, 0193

## Context
Since 0129, a balance that reads "outgrowing its base" (more than three rough areas) files no new `G`. Ten areas
are rough, so the loop proposed no growth in more than 60 runs; 0229 (a scoped reset) had just landed to let areas
progress. Every run looked for what was wrong against a rule, and none asked what a person using a feature would
expect of it, so refinement had no compass and growth had no way in.

A first shape of this decision had each run write its expectations afresh. Asked for a view of it, the orchestrator
named three problems: lines regenerated every run drift from run to run, and a model's "reasonable" drifts toward the
average app (likes, sharing, counts), which VISION excludes; an agent grades its own work kindly; and with no
checkpoint, nothing would say whether the compass changes what the loop ships.

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

To the orchestrator's three suggestions (a ratified list per feature, checkable expectations, a compass metric
without a checkpoint), the owner: "Implement your suggestions. Leverage any scripts where we can for deterministic
output. Or encode it in the skills themselves or agent files."

So, in `/tend` (`.claude/skills/tend/SKILL.md`, its lens in `expectations.md` beside it), the orchestrator's skill
and briefs, the `steward` and the `auditor`, and the scripts:

1. **A ratified list per feature.** `docs/expectations/<feature>.md` holds three to five lines, "A person [from
   `docs/VISION.md`, "Who it is for"] using <feature> would reasonably expect …", each grounded in that section and
   in how two or three adjacent apps do the job (`docs/research/adjacent-apps.md`, verified or not; "not yet
   recorded" otherwise; the loop never edits `docs/research/`). The first run on a feature drafts them; the `steward`
   checks them against the Never lines and the persona, and flags a line that reads as what other apps have rather
   than what this person needs; the owner ratifies them once, by their own answer, never the proxy's (0157:
   identity). Later runs test against the ratified lines and propose amendments, which stand beside a ratified line
   until the owner ratifies them; a ratified line never changes.
2. **Checkable expectations.** Each line says what a person sees or does and names its check: a journey check, a
   unit test, a picture a journey takes, or "pending" while none exists. `met` needs that check to exist and pass,
   or a picture while it is pending. The `auditor` checks each `met`'s evidence exists and really tests the line.
3. **The lens, every run.** Each `/tend` run (one iteration) but a triage applies lens 0 first to each feature it
   touches: which lines the feature meets, fails (a defect) and lacks (growth).
4. **The compass in triage.** Every finding names the expectation or the rule it serves. A refinement that serves
   no expectation and breaks no rule or shipped criterion is filed `[loop]` low, not shipped. A defect against an
   expectation is triaged as any other finding.
5. **Growth with its workflows.** An unmet expectation of a feature in scope by VISION becomes a `G` entry
   whatever the balance reads and whatever its area's state. The entry names the existing workflows it
   implicates, and the slice that answers it refines them in its own criteria, so the growth works with what is
   there; that refinement is part of the slice, not a separate sweep. Other `G` sources keep 0129's rule. The
   three-open-`G` cap stays, and a better proposal replaces the weakest. Who says yes is unchanged: the owner, or the
   proxy within 0157.
6. **A compass metric, without a checkpoint.** The run log carries `expectations` (the lines by id, each met with its
   evidence, failed or lacking, a proposed line provisional) and `compass` (refinement shipped, refinement filed low
   by the compass, the `G` entries lens 0 filed). `node scripts/tend.js compass` reads them: per run and in sum, and,
   once twelve runs carry them ("too early to say" before), whether the share of refinement shipped over the last
   twelve is falling ("the compass is biting") or not ("the compass is not biting: tighten it"), read only when each
   half holds three refinement findings at least ("too few refinement findings to say" otherwise). It is read at
   every landing and kept in the ledger by `tend:balance --write`.
7. **Scripts decide what they can.** `npm run expectations` (`scripts/expectations.js`) is the only way the store
   changes: `draft` refuses a duplicate, a line not in the form, fewer than three in a first draft or more than five
   in force; `amend`, one open at a time, of a ratified line; `ratify` and `decline` only `--by owner` with the answer
   verbatim, on one line; `set-check`, never from a check back to pending; no operation writes a store that does not
   read, or leaves one that reads back otherwise. `check` fails a named check it cannot find (a journey check's whole
   plain-string message, a test's whole title, a shot of the feature's own journeys) and runs in `check:docs` (so in
   CI) and in `check:affected` when a journey or a test changed; `due` names the features with no line, and those
   awaiting the owner. `tend:log` marks its lines `"lens":"0234"`, writes the date itself, and holds a marked sweep,
   or a run whose range built a `T` entry or a slice, to both fields, each line read against the store. `check:tend`,
   which CI runs on every push, reads every agent commit by its trailers: only the owner's answer commit,
   `expectations <feature>: the owner's answer, <date>`, changes a line's status (proposed to ratified or declined,
   dated as its subject says, and the line a ratified amendment replaces superseded), made outside any `/tend` run;
   no other agent commit changes a line's words, status, grounds or answer.
8. **What the scripts cannot know.** They cannot tell the owner from an agent: `--by owner` and the answer commit's
   subject are written by whoever records the answer. An answer is trusted as every recorded answer is under 0157:
   the orchestrator writes the owner's words verbatim from the question it asked, and the proxy never ratifies.

## Why
A rule says what is wrong; it cannot say what is missing or what is worth polishing. A person's reasonable
expectation, held to the narrow audience VISION names, says both: a refinement no person would notice waits, and
a gap a person would meet is growth the loop may propose even while areas are rough, built with the workflows it
touches so the base improves as the app grows. Ratifying the list once keeps it from drifting toward the average
app; naming a check for each line keeps "met" from being the loop's own kind grade; and the compass reading says,
from the log, whether the test changes what ships, without a checkpoint the owner declined. Adjacent apps ground
what a person expects of a feature already in scope; 0193's "precedent informs how, never what" holds for which
features exist, and the steward's check keeps a counter-example (a streak, a rating) out.

## Consequences
- The next sweeps (presence, tabs, map, after walk-screen; 0229) start with lens 0: `npm run expectations -- due`
  names their features, each drafts its features' three to five lines, has the steward check them at the first
  pause, records them with `draft`, uses them provisionally, and sends them to the owner for ratification. A lacking
  line is filed as a `G` naming its workflows though the balance still reads outgrowing; a refinement that serves
  none is filed `[loop]` low instead of shipped. A whole sweep is lenses 0-7.
- The compass's reading appears in each landing's report to the owner (the orchestrator runs `tend.js compass` at
  each landing); until twelve runs carry it, it says "too early to say".
- The orchestrator puts proposed lines to the owner in its batch, one question per feature, "Ratify as drafted"
  first, and records the answer with `npm run expectations -- ratify` in a commit of its own, landed before or between
  runs (a non-loop write; a `/tend` run never makes it). An
  inbox build applies lens 0 to the feature it builds; an `evolve` run gains a steward pause before it files; the
  proxy does not hold a `G` from lens 0 for the balance.
- Run-log lines without the `"lens":"0234"` mark (every line before this, and any a run logs with an older script)
  are read as they were.
- Each run costs a steward check more, and a feature's first run a question to the owner. The owner chose no
  checkpoint: nothing reviews the lens every ten runs; the compass reading is the only look back.
