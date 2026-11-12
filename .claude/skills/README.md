# The skills as one system

Each skill does one job and can be run by the owner. Since decisions 0128-0130 they are also the
stages `/tend` routes work through, so each one states what it takes, what it leaves behind, where it
stops for the owner, and what it may push. This page is the map; a skill's own file is the procedure.
`ship.md` beside this file holds what the publishing skills share.

## The route a piece of work takes

```
/tend sweep ─┬─ loop finding ─────────────► ship.md (one commit each) ──► main
             ├─ addition / opinion ─► /vision ─► inbox T<n> ─► owner ─► one commit ► main
             ├─ phone-only ─────────────────► inbox T<n> [phone]   (larger additions are filed as G)
             └─ area polished ─► evolve ─► /vision ─► inbox G<n> ─► owner ─► /slice --from=G<n> ► main
a slice lands ─► its area is rough ─► the next /tend sweeps it
```

## What each skill takes and leaves

| Skill | Run by | Takes | Leaves behind | Stops for the owner | Pushes |
|---|---|---|---|---|---|
| `/vision` | the owner; `/slice` 1b; `/fix`; `/tend` | an idea in one sentence | the Vision block (verdict, shape, criteria); a decision record only when the owner overrules | only when the owner is the caller and the verdict is out, not now or silent; called by a skill it returns the block and the caller decides | nothing; it reads and judges |
| `/slice` | the owner; `/tend inbox G<n> yes` | a slug; with `--from=G<n>` the approved entry (criteria, verdict) | spec, plan, tests-first commit, code, docs, the STATUS row | the plan, unless `--from` (decision 0130); architecture always | nothing, ever; under `--from` the `/tend` run that called it publishes |
| `/fix` | the owner only | one issue and its flags | one commit with its regression test; DEFERRED for anything else found | hard stops (`ship.md`) | `main` by default (0081) |
| `/audit` | the owner only (0074) | a built slice's slug | the spec's audit record, regression tests named `<slug> audit N`, fixes | architectural findings | nothing; `/deploy` follows |
| `/tend` | the owner only | an area, `triage`, `evolve` or `inbox <answers>` | loop commits, inbox entries, DEFERRED tags, the ledger | never mid-run; it files and goes on, and asks about its entries after it has published | `main`: loop findings and its record (0128); an approved entry (0130) |
| `/tend-orchestrator` | the owner only | a deploy target, a stop rule, a proxy authority (asked first) | `/tend` runs through subagents, reviewers spawned at their review points, the inbox answered within that authority, an insights file in the scratchpad | at the start; then only for `[arch]`, `[phone]`, VISION edits and entries that amend an owner's decision, batched | nothing itself; each run publishes under the grant the owner gave it |
| `/deploy` | the owner only | a green branch | `main` moved, the Pages run checked | a failed precondition; a merge that is not a fast-forward | `main` |
| `/e2e` | anyone | a journey name | a pass or failure; pictures with `E2E_SHOTS` | never | nothing |
| `/docs-gc` | anyone, at the end of a slice | the tree | docs brought back in line | never | nothing |

Subagents (`.claude/agents/`): `auditor`, `steward`, `ux-reviewer`. All report-only by configuration (decision 0133): the `ux-reviewer` has no
shell, and the other two a shell that `.claude/hooks/readonly-bash.sh` keeps to reads and test runs; each expects pictures for any screen it judges, and says so first when it has none.

## Rules of the system

- **One writer of the app at a time per worktree.** Subagents read and report; the calling skill edits.
- **A skill called by another never asks the owner and never pushes on its own authority.** It returns
  its result block (`ship.md`) with "Stopped on", and the caller files or asks. Only the skill the
  owner typed holds a grant, and it passes on no more than it was given.
- **State lives in files, not in a session:** `docs/STATUS.md` (slices, in flight, the inbox, next
  evolutions), `docs/DEFERRED.md` (tagged), `docs/NATIVE_UNVERIFIED.md`, `specs/<slug>/`,
  `.claude/skills/tend/ledger.json` (area states, numbering, the balance, what was declined),
  `.claude/skills/tend/runs.jsonl` (one line a run: what it found, shipped, filed and was told).
  A new session reads these and `git log` first. The copies on `main` are the only ones that count:
  a run reads them from a worktree of `origin/main` and publishes its changes to them with its work.
- **A stopped slice is parked, not lost:** its branch is pushed as `slice/<slug>-parked`, its question
  is a `T` entry on `main`, and the owner's answer resumes it (`/tend`, section 7).
- **Gates are scripts where they can be:** `check:docs` (a criterion without a test), `check:vision`,
  `check:test-first`, the layer check, `check:tend` (a loop commit without a test or a source), the Stop
  hook and CI. A procedure step that keeps being missed becomes a check, not a louder sentence.
- **One piece of work per run.** A `/fix` is one issue; a `/tend` sweep is one area; an approved
  proposal is one run of its own.
- **Naming is the record.** `fix <name>`, `fix <name> audit N`, `tend <scope> N`, `<Slice>: … (XX1-XX9)`:
  `scripts/tend.js` reads subjects to tell growth from refinement.
