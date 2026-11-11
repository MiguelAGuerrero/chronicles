---
name: tend
description: The owner's product loop (decision 0128) - sweep one area for gaps nobody asked about (missing states, broken UI patterns, sibling screens that disagree, slow paths, drift), ship to main what only makes an existing thing conform, one commit per finding, and file every addition, phone-only finding and judgment call in the owner's inbox with a recommended shape. When an area comes up polished it proposes that area's next evolution, sized and ranked by payoff, and each run checks that the app is growing and not only settling (decision 0129). Also triages docs/DEFERRED.md into loop, owner and phone items, and builds what the owner approved from the inbox.
when_to_use: The owner types /tend, optionally with an area, a feature, "triage" or "inbox". Not for one named bug (/fix) or a feature the owner already described (/slice).
argument-hint: "[<area or feature> | triage | evolve [<area>] | inbox <answers>] [--cap=N] [--deploy=main|branch|none]"
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent, Skill, AskUserQuestion, EnterWorktree, ExitWorktree, mcp__github__actions_list, mcp__github__actions_get, mcp__github__get_job_logs
---

# Tend: $ARGUMENTS

The owner shapes the product; this loop finds what they did not think to look
for. Typing `/tend` is the owner's go-ahead to push this run's **loop**
findings to `main` (decision 0128), on the terms in `.claude/skills/ship.md`: no
force push, no rewritten history, no skipped or loosened test, a red deploy
reverted. It grants nothing for an addition: those wait in the inbox. The
map of the skills this one routes through is `.claude/skills/README.md`.

Echo the resolved mode, scope and flags in your first line.

| Argument | The run |
|---|---|
| none | the area whose files changed most on `main` since it was last tended (`.claude/skills/tend/ledger.json`) |
| an area or feature (`scripts/features.js`, `.claude/rules/`) | that scope only |
| `triage` | section 6 only: tag `docs/DEFERRED.md` |
| `evolve [<area>]` | sections 8 and 9 only: the balance, then proposals for that area, or for the app if none is named |
| `inbox <answers>` | section 7 only: act on the owner's answers ("T3 yes, G2 yes, T4 no: too busy a screen") |
| `--cap=N` | stop shipping after N commits; the rest are filed as `[loop]` in `docs/DEFERRED.md` |
| `--deploy` | `main` (default), `branch` (push `tend/<scope>` and stop), `none` |

## 1. The line: what the loop ships and what waits

Classify every finding before touching code. When in doubt, it waits.

| Class | It is | Where it goes |
|---|---|---|
| **loop** | An existing element made to behave or look right against a **cited** source: `docs/research/ui-references.md`, `.claude/rules/ui-patterns.md`, a rule file, WCAG 2.2, the platform's guidelines, a spec criterion the build does not meet, `docs/VISION.md`'s Always list. Also bugs, performance, cleanup, missing tests and journeys, docs drift. | Shipped, one commit each |
| **owner** | Anything new a person can see or act on: a control, a screen, a setting, a stored field, a notification, copy that says something new or changes what a line means (an empty state's words included). Anything removed. Anything whose only source is opinion. Anything `/vision` answers with other than **aligned** or **no surface**. The replay's beats, order or copy. | The inbox, with a recommended shape |
| **architecture** | A dependency, a migration or data-model change, a navigation-flow change, a host, a derivation-rule bump (`SNAP_RULES`, `STREET_CODE`, `LANDING_CODE`), more than about 8 files. | The inbox; never started |
| **phone** | Anything only a device can show or verify: haptics, gestures, native map behaviour, background recording, VoiceOver and TalkBack, real GPS. | The inbox as `[phone]`, with **Do** and **Expect**; never shipped |

A loop fix that turns out to need an owner or architecture change stops there
and is filed; the half-made change is dropped, not shipped smaller.

The loop never edits `docs/VISION.md`, never adds a `vision-ok:` or an entry
to `scripts/vision.allow.json`, and never grows a baseline.

## 2. Sweep: deduce, do not wait to be told

Read `docs/STATUS.md`, the scope's rule files, its specs and its `docs/DEFERRED.md`
section first, so nothing known is found twice. Then look through each lens;
a finding names its lens, its evidence (a picture, a file and line, a failing
input) and its source.

1. **The screens as a person sees them.** Run the scope's journeys
   (`docs/TESTING.md`, "Choosing the journeys") with
   `E2E_SHOTS=<scratchpad>/tend-shots`. A screen of the scope with no journey
   or no `shot()` is itself a loop finding: add it. Give the pictures to the
   `ux-reviewer` and `steward` subagents together.
2. **The states nobody listed.** For each screen and each control in scope, walk
   this list and say which the code and journeys handle: empty; first use; one
   item; very many; very long text or name; loading and slow; failed and
   retried; a refused permission; offline; 320 px wide and the largest text
   size; screen reader names and focus order; keyboard and Escape on web;
   interrupted (the app killed or backgrounded mid-action); done twice
   quickly; undone; a walk recording, paused or minimized meanwhile; a moment
   with no walk; data from before the latest migration.
3. **Siblings.** The same job done on two screens must look and act the same
   (`.claude/rules/ui-patterns.md`). List where one screen has what its sibling
   lacks: an Undo, a confirm, a spoken name, a context line on a moment, a
   pressed state, a way back.
4. **The promises.** Each numbered criterion in the scope's specs against what
   the build does now, beyond what its test pins; each line of the rule files.
5. **The code.** The `auditor` subagent on the scope's modules against the
   AGENTS.md invariants: truth vs cache, `readTrace` inputs, layers, anything
   over features not indexed, re-renders on the walk screen
   (`scripts/perf-walk.js`), dead code, a layer baseline that could shrink.
6. **The identity.** `npm run check:vision -- --list`; score words, numerals
   and accent colour in the scope's copy and pictures.
7. **The ledger.** `[loop]` items of the scope in `docs/DEFERRED.md`.

Run the subagents in one message. An empty lens is a result: say "nothing
found" and move on. Never invent a finding to fill a run, and never turn a
missing feature into a "gap": restraint is part of the product
(`docs/VISION.md`, Always).

## 3. Triage

One line per finding, in the report and nowhere else until it ships or is filed:
`N. [loop|owner|architecture|phone] <title>: <evidence>; <source>; <the change>`.

- Drop what the ledger lists under `declined`, and what the inbox or
  `docs/DEFERRED.md` already holds (tag it there instead).
- Order the loop findings by severity, then by how many screens share the cause.
- A finding without a source is opinion: class **owner**, marked so.

## 4. Ship the loop findings

The shared steps are in `.claude/skills/ship.md`; name them by heading.

1. **One worktree for the run**, `tend/<scope>` ("Open the worktree").
2. **One commit per finding.** Reproduce it first as a failing regression test
   (`tend <scope> N`, in the feature's folder under `src/lib/__tests__/`) or a
   journey step, then the smallest change that removes its cause; no
   refactors beside it. The message names the finding and its test, and
   carries a line `Source: <the rule it conforms to, quoted or cited>`. No
   finding shares a commit; none rides along untested.
3. **Checks per commit:** `npm run check:affected`. For storage, the
   recorder, the walk screen, the replay, and any change to what a screen
   shows: `npm test` and the journey that covers it, once, with a before and
   after picture kept for the report.
4. **A "Hard stop"** reclassifies the finding as `[arch]` or `[owner]` and
   drops the half-made change; it never ends the run.
5. **Before the push:** `npm run check:tend -- origin/main..HEAD` (every loop
   commit has its test and its source), `npm run typecheck && npm run lint &&
   npm test`, then "Review": one `auditor` pass over the run's whole diff,
   one round, tests named `tend <scope> audit N`.
6. **"Publish to main"**, once, at the end or at `--cap`. On a red run the
   commit that owns the failure is reverted alone and its finding filed as
   `[owner]` with the log's cause.
7. **"Clean up".**

## 5. File the rest

**The inbox** is `docs/STATUS.md`, "Needs the owner", under "From /tend". One
entry per finding, numbered on from the last `T` number ever used
(the ledger's `lastT`), written so a yes or no is enough:

```
- **T12 [owner] Threads: no way back to the moment a reply answers** (2026-11-11)
  Seen: <picture or file:line>. Rests on: <source, quoted>.
  Recommended: <the one shape, concretely, with its /vision verdict>.
  Otherwise: <the next shape>, or leave it.
```

Run `/vision` on each `[owner]` entry first (it returns its block and asks nothing); an **out** is not filed at all
(say so in the report, with the rule), and a reshaping is filed in its
reshaped form. `[phone]` entries carry **Do** and **Expect** instead of a
recommendation. Findings that are real but not worth the owner's time now go
to the scope's section of `docs/DEFERRED.md`, tagged.

End the run by asking the owner about this run's new entries with
AskUserQuestion (the recommended shape first, four entries per call). An
answer in the same session is handled as section 7.

## 6. Triage the deferred ledger (`/tend triage`)

Give every untagged bullet in `docs/DEFERRED.md` (or the named section's) one
tag at its start, by the table in section 1, changing no other word:

- `[loop]`: the loop may ship it;
- `[owner]`: an addition, a product question, or an owner's call already
  named as one;
- `[arch]`: needs an architectural decision;
- `[phone]`: needs a device;
- `[kept]`: a limit recorded on purpose (a decision says so); nothing to do.

A bullet holding several items is split first, one item per bullet. Then put
the `[owner]` and `[arch]` items the owner would most want to answer (ten at
most per run) in the inbox with recommendations; the rest stay tagged in
place. Commit as docs only; nothing else ships in a triage run.

## 7. Act on the owner's answers (`/tend inbox …`)

- **Yes** to a small addition (inside the "Hard stops" size): build it as
  section 4, one commit, its entry removed from the inbox.
- **Yes** to a `G` entry, or to an addition larger than that: one slice, and
  the whole of this run (decision 0130). Run the `slice` skill with
  `<slug> --from=G<n>` (or `--from=T<n>`): the entry's criteria and verdict
  are its start, the plan is written and reviewed by the steward but not
  held for the owner, and it publishes by `.claude/skills/ship.md`. It stops
  only on a hard stop or a steward finding that changes the approved shape;
  put that question to the owner. Several yeses are built one run each, in
  the order given; say which wait.
- **Reshape:** rewrite the entry as told and build that.
- **No:** remove the entry and add an item to the ledger's `declined` (the
  entry's title, the date, the owner's reason), so no sweep proposes it again. A no that
  states a rule ("never a count there") is a decision record too.
- An answer that changes `docs/VISION.md` is the owner's edit; propose the
  wording and leave the page.

## 8. The balance: is the app growing or only settling?

Every run that ships or sweeps ends with this check, before the close. It is
for the owner and the ledger; none of it ever appears in the app.

**Each area has a state**, kept in the ledger's `areas` and moved only by a sweep
(or to `rough` by a slice landing):

| State | It means | What the loop does there |
|---|---|---|
| `rough` | The last sweep found loop findings of high or medium severity, or a slice landed since the last sweep | Tend it. No evolution is proposed on a rough base. |
| `settling` | Only low findings were left, or its inbox entries are unanswered | Tend once more, or wait for the owner's answers |
| `polished` | A whole sweep (every lens run) shipped nothing above low, its screens all have journeys, and its inbox is empty | **Owes an evolution:** section 9, in the same run |
| `resting` | Polished, and the owner said no to its evolutions for now (the ledger says until when or what) | Left alone; a slice landing there makes it rough again |

**Then run `npm run tend:balance -- --write`** (`scripts/tend.js`). It sorts
the last 14 days of `origin/main` by commit subject into **growth** (a
slice's criteria), **refinement** (`fix`, `tend`, an audit, a revert) and
**other**, counts the areas by state, the open `T` and `G` entries and the
rows in flight in `docs/STATUS.md`, and writes its reading to the ledger.
The reading is the script's; the two signs it cannot see (a red `main` in
the window, a slice whose area was never swept) are yours to add:

| Sign | Reading | The run ends by |
|---|---|---|
| No growth commit in 14 days, or nothing in flight in `docs/STATUS.md` and no open `G` entry | **Settling.** Polish is outrunning the product. | Running section 9 for the app (not only this area) and saying so first in the report |
| More than three `rough` areas, or more than ten unanswered inbox entries, or a red `main` in the window | **Outgrowing its base.** | Filing no new `G` entry; the report names the areas to tend and the entries to answer first |
| A slice shipped and its area has not been swept since | **Unpaid polish.** | Naming that area as the next `/tend` |
| Otherwise | **In step.** | Section 9 only if this area is polished |

The cycle this keeps turning: a slice lands (rough), the loop tends it
(settling, polished), a polished area owes its next evolution, the owner
picks, a slice lands. An area that is polished with nothing proposed, or
rough with something new stacked on it, is the loop failing.

## 9. Evolve: propose the next iteration

For a polished area, or for the whole app when it is settling. At most
**three** open `G` entries exist at once; a better proposal replaces the
weakest, with a line saying why.

**Where an evolution comes from.** Each proposal names its source; one that
has none is not made.

1. `docs/VISION.md`: the question of the verb the area serves, asked of the
   area as built; a Shapes row that is aligned and unbuilt; what the page says
   comes "later" (recall, search, likeness). Chronicle first.
2. What was left out on purpose: the area's `[owner]` items and "left out"
   lists in `docs/DEFERRED.md`, a spec's later rounds, a decision's "waits for".
3. **The next thing a person would try.** From each screen of the area, the job
   they would reach for next and cannot do, or can do only by leaving the app.
4. What the area now makes possible elsewhere: a corpus big enough to search,
   a kind that could drive a route, a context line another screen could carry.
5. Repeated loop findings with one cause: three patches to the same screen
   say the screen wants a redesign, which is an evolution, not a fix.

Never from: what other apps have (`docs/research/ui-teardown.md` informs how,
never what), a Never row, or the wish to have something to propose. "This
area is whole; nothing to add" is an answer, and makes it `resting`.

**Shape each one as the thinnest slice a person would notice.** Run `/vision`
on it; **out** is dropped, a reshaping is proposed reshaped. Then size it:

- **S**: inside `/fix`'s limits; the loop builds it on a yes.
- **M**: one slice, about ten criteria or fewer, no architectural decision.
- **L**: anything more. Never proposed whole: propose its first S or M slice
  and say what the rest would be.

**Rank by payoff against cost and risk**, in words, not points:

- *Payoff:* which verb (Return, then Honour, then Earn, since Chronicle comes
  first); how often a person meets it (every walk, every time the app opens,
  now and then); whether it deepens the replay or the corpus of moments;
  whether later evolutions need it first.
- *Cost:* S, M, the screens and modules touched, new native code (unverified).
- *Risk to what is stable:* which polished areas it reopens, whether it
  touches truth (walks, traces, captures) or only cache and views, whether a
  wrong guess can be reverted in one commit.

Prefer a noticed S over a deep M, and an M on a polished base over anything on
a rough one. Across the three entries keep a spread: not three in one area,
and one small enough to ship this week.

**File** under "Next evolutions" in `docs/STATUS.md`, numbered `G<n>`:

```
- **G4 [M] Chronicle: search over moments, by word** (2026-11-11) · Return · aligned
  From: VISION.md Shapes, "Search over moments"; Memories is polished since <sha>.
  The slice: <three to six criteria, in the spec's own style>.
  Payoff: <words>. Cost: <words>. Reopens: <areas>. After it: <what it unlocks>.
  Instead: <the smaller shape>.
```

The owner picks; the loop never starts a `G` entry unasked.

## 10. Close the run

1. The ledger: the scope's entry in `areas` (`state`, `swept`, `main` after
   the push, a note), `lastT` and `lastG`, anything declined. Keep it valid
   JSON and change only those fields; the balance is written by the script.
2. `docs/STATUS.md`, "Last tend": replace it with this run's digest (scope,
   commits with one line each, entries filed, the balance in a sentence, what
   was not looked at). Git holds the earlier ones.
3. `npm run check:docs`; `/docs-gc` only if a rule, a behaviour or a file
   location changed.

## Report

Scope and flags; each lens and what it found or "nothing found"; every
finding's triage line; per shipped commit its hash, source, test and pictures;
the Pages run and the live check; the inbox entries filed, with their
numbers; the balance (the shares, the areas by state, the reading) and any `G`
entries with their ranking; what was dropped as **out**; what was not run or not looked at, and
that nothing here has run on a phone.
