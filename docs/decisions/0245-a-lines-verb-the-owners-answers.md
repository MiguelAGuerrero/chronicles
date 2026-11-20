# 0245. A line's verb: the owner's answers on the lines answered before it, and on a line serving none

Date: 2026-11-20 · Status: accepted · Area: process, tend · Relates to: 0094, 0236, 0244

## Context
Decision 0244 had the owner's yes to "each expectation line names the verb it serves" (Earn, Honour, Return; VISION's
"The three verbs"), and left the tooling to a run of its own (run 17). At its diff review the `auditor` (F1, high) and
the `steward` (S1, S2) found two calls the run had made for the owner. First, the fifteen lines already ratified
(presence, tabs, map) had been grandfathered: no verb for good, and no operation that could give them one, since an
amendment with a line's own words was refused as a duplicate. Second, a line serving no verb was dropped at the
steward's check before the owner saw it, though lines such as E-map-3 (units) and E-map-5 (pins' shape) rest on an
Always line or on legibility rather than on a verb's question. VISION holds a *feature* to serving a verb, not each
line of one, and the gate advises while the owner decides (0094). Both went to the owner, through the tend orchestrator.

## Decision
The owner's answers, in person, verbatim, Nov 20.

- **The fifteen lines answered before 0244:** "Yes, ask me (Recommended)". The option read: "The tools learn a
  verb-only amendment. A run proposes a verb for each of the 15 lines, and I put them to you as one question per
  feature, like an approval. The line's words stay yours."
- **A line serving no verb:** "Feature's verb, else flag (Recommended)". The option read: "A line that upholds an Always
  rule names its feature's verb and says how in a clause. A line truly serving none comes to you flagged with the
  steward's reason, and is dropped only by your answer."

## Consequences
- `npm run expectations -- amend <id> --serves <verb>`, with no `--file`, proposes a verb-only amendment: the line's own
  words, check and grounds, and the verb it lacks. It is exempt from the duplicate check against that line only, and
  the owner's answer commit supersedes the line with it. A line that has a verb changes it only with its words.
- `Serves:` takes a clause after a `;` (`Earn; upholds "<the Always line>": <how>`), and `none; <the steward's reason>`
  for a line flagged as serving no verb; the reason is required. A flagged line is proposed like any other; the owner's
  decline drops it.
- `list` names a line in force with no verb "awaiting the owner's verb", with the amendment that proposes one.
- `check:tend` refuses an agent commit adding a proposed line without `Serves`, or one with another line's words but a
  verb-only amendment, so a commit by hand cannot do what `draft` and `amend` refuse. The run log carries
  `"serves":"none"` on a flagged line, apart from `dropped`, which names a Never line only.
- Run 17 drafts the fifteen verb-only amendments; the orchestrator puts them to the owner, one question per feature, and
  records the answers in the answer commit. Until then the fifteen lines stand as ratified, without a verb.
