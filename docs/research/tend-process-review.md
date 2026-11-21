# The tend orchestration, reviewed: refinement against growth (investigation, 2026-11-19)

From: the owner's ask of Nov 19: "orchestrate a sub-agent with fresh context to perform their own research and how to scope and
define agentic processes towards feature development while balancing refinement and product development, and then have that
agent review your work, compare and contrast your own independent findings with you to better sharpen the tend orchestration."
Queued as G6 and G7. Decision 0235. Status: G6 built in area-states (decision 0250); G7 queued.

## How it was done

1. **Blind research.** A fresh-context agent researched agentic software process and the refinement/growth balance on the web,
   reading only `docs/VISION.md` and `docs/PRODUCT.md` from the repository: `docs/research/agentic-process-framework.md` (seven
   stages, three balance meters with scripted consequences, the owner's decisions, the gates that should be scripts).
2. **Independent findings.** Meanwhile the coordinating session wrote its own findings from the run log, the ledger and the
   skills, without seeing the framework (section "Findings, merged" marks whose each was).
3. **Review, then comparison.** The agent reviewed the system as built against its framework, and only then read the
   coordinator's findings: it confirmed ten of fourteen points, corrected four, and added seven the coordinator missed.

## The evidence (origin/main, Nov 19; a deep clone, see finding S1)

- 66 runs (Nov 11-19): 33 inbox, 31 sweep. Found 208 in all, 158 of them loop findings (high 3, medium 64, low 91); shipped 110;
  filed 51; 174 review fixes; 27 entries built; 0 reverted.
- **No area has ever left `rough`**: the state reads rough→rough 30 times; the one whole sweep (walk-screen, Nov 19) shipped all
  seven of its mediums and stayed rough. 26 of 36 areas never swept (memories, moments, threads, journal, recording, storage among
  them); explore was touched in 20 runs.
- **The balance reads "outgrowing its base" every day since at least Nov 12**, so the loop has filed no `G` since Nov 11, while
  64 slices grew in 14 days (commits: growth 186, refinement 666, other 757).
- **Review ships almost everything**: 297 accepted, 8 rejected, 116 deferred.
- **The owner takes the recommended option almost always**: 62 yes, 6 reshape, 0 no in the run log; 14 of 14 in decisions
  0231-0233; who answered (owner or proxy) is free text only.
- **The inbox is bigger than the script sees**: "Needs the owner" is about 58,000 characters, 16 sections, 81 bullets;
  `readStatus` counts 11.
- **Coordination is a large share**: about 21% of commits touch process files and about 22% are coordination (merges,
  renumbering, records filed again); 45 renumberings and 51 re-filings in 14 days.

## Findings, merged

| # | Finding | From |
|---|---|---|
| F1 | The balance is a sensor with almost no actuator: "outgrowing" only stops the loop's own `G`; it never reaches the owner's slices | both |
| F2 | `rough` cannot be left: it means "the sweep found something", and adversarial reviewers always do | both |
| F3 | Sweeping new ground raises the alarm: `areasByState` counts only areas in the ledger, and every first sweep adds one as rough | agent (the coordinator had the effect, wrongly blamed on the count of 36) |
| F4 | Coverage follows recency: `next` sends sweeps back to the hottest areas | both |
| F5 | Review creates work faster than it closes it, with no budget | both |
| F6 | The recommended option is taken almost always; nothing measures it, and anchoring explains it as well as good advice does. Delegate a class only on a second signal (yeses later kept), and offer real alternatives | both; the agent's caution on delegating |
| F7 | Process is a third side with no meter; "other" in the balance is not it (it is mostly slices' spec, plan and tests-first commits) | coordinator, corrected by the agent |
| F8 | Two sessions edit process files and take decision numbers at once (two 0234s were in flight on Nov 19) | coordinator |
| S1 | On a shallow clone `tend.js balance` and `next` print `fatal:` and return wrong answers (growth 21 against 186; `next` = explore, not journal) | agent |
| S2 | Who answered and which option are not in the run log; 0157's keep-or-revert list leaves no record | agent |
| S3 | The builder writes its reviewers' prompts: the author frames what the judge sees | agent |
| S4 | No demand signal: for a local-only app, the owner's walks are the only usage data, and nothing collects them | agent |
| I1 | `/investigate` shipped a red `main`: "docs only" skipped `npm test`, and `records audit 14` reads skills | coordinator |
| I2 | `/investigate` cited unverified precedent in the owner's options without saying so | both |
| I3 | `/investigate` has no check that the original observation is answered | both |
| I4 | G5's look question (the hatch) sits under "Not settled" with no `Open:` line, so a yes would let a builder or the proxy make a look call | agent |

Corrected in the coordinator's findings: 208 was every finding, not loop findings; "other" is not process; G5 is a legitimate
M (the eight-file line is for fixes, not slices), though sizing should count files and native code; "fold the area's items into
the owner's slice" would breach `/slice --from`'s bound ("anything its approved criteria do not name"), so the rule is "leave the
area no rougher".

## The owner's calls (Nov 19)

1. **Rough rule: open defects plus a backstop** (over "open defects only" and "keep as is").
2. **Balance: shares plus both actuators** (over "shares only" and "keep as is").
3. **Review: at most one review fix per fix** (over "cap highs only" and "no cap").
4. **Inbox and process**: count the whole inbox; expire after 30 days; a lease on process files and decision numbers at publish.
   **Not chosen:** a process share that stops the orchestrator.

All four were the recommended options, which is F6's pattern; G7's answer log is what will measure it.

## What is queued

**G6 (M), the states and the balance**: changes 1, 2 and the inbox count, with the shallow-history guard. **G7 (M), after G6**:
the review budget, coverage by rotation, the answer log, inbox expiry, the lease and decision numbers at publish. Their criteria
are in `docs/STATUS.md`, "Next evolutions". G7 follows G6 because rotation onto new ground only raises the alarm until areas can
leave `rough`.

Built in this run, mechanical (decision 0231 already covers them): `/investigate` runs `npm test` before publishing; its options
mark unverified precedent and always include "leave it"; its brief splits "Open for the owner" (each an `Open:` line) from
"Engineering unknowns"; its entry carries a `Done when:` line restating the owner's observation; G5 gains its `Open:` (the
hatch's look, candidates side by side) and `Done when:` lines.

## Left out, and why

- **The process share with a stop**: the owner did not choose it.
- **Walk notes (S4)**: the strongest new idea in the framework, and an addition the owner has not been asked about: a
  one-minute note after a walk ("what did I reach for that wasn't there; what got in the way; what would I keep") as the only
  demand signal a local-only app can have. To be put to the owner as its own question.
- **Reviewer prompts written by the builder (S3)**: a change to `ship.md` "Review" and the orchestrator's briefs, the files the
  orchestrator session is changing on Nov 19; noted for after its expectation lens lands.
- **Signals that expire unless seen twice, a "do nothing" option on every brief, defaults that stand if the owner is silent**:
  framework ideas the owner was not asked about; `docs/research/agentic-process-framework.md` 2.2-2.4.

## Not settled

- The numbers (three sweeps, 14 days, 30 days, one review fix per fix) are starting values, to be tuned from the run log.
- The expectation lens (the orchestrator session, Nov 19) had not landed when this was written: G6 and G7 rebase onto it, and
  must not redo what it does to `scripts/tend.js` or `tend/SKILL.md`.
