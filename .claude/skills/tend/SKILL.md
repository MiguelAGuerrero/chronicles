---
name: tend
description: The owner's product loop (decisions 0128-0130) - sweep one area for gaps nobody asked about (missing states, broken UI patterns, sibling screens that disagree, slow paths, drift), ship to main what only makes an existing thing conform, one commit per finding, and file every addition, phone-only finding and judgment call in the owner's inbox with a recommended shape. When an area comes up polished it proposes that area's next evolution, sized and ranked by payoff, and each run checks that the app is growing and not only settling. Also triages docs/DEFERRED.md into loop, owner and phone items, and builds what the owner approved from the inbox.
when_to_use: The owner types /tend, optionally with an area, "triage", "evolve" or "inbox". Not for one named bug (/fix) or a feature the owner already described (/slice).
argument-hint: "[<area> | triage [<section>] | evolve [<area>] | inbox <answers>] [--cap=N] [--deploy=main|branch|none]"
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent, Skill, AskUserQuestion, EnterWorktree, ExitWorktree, mcp__github__actions_list, mcp__github__actions_get, mcp__github__get_job_logs
---

# Tend: $ARGUMENTS

The owner shapes the product; this loop finds what they did not think to look
for. Typing `/tend` is the owner's go-ahead to push this run's **loop**
findings and its record to `main` (decision 0128), on the terms in
`.claude/skills/ship.md`: no force push, no rewritten history, no skipped or
loosened test, a red deploy reverted. It grants nothing for an addition:
those wait in the inbox. The map of the skills this one routes through is
`.claude/skills/README.md`.

Echo the resolved mode, area and flags in your first line.

| Argument | The run | Sections |
|---|---|---|
| none | a sweep of the area `node scripts/tend.js next` names (the one changed most since it was swept, else one left rough or settling); if it names none, the run is `evolve` | 0-5, 8-10 |
| an area (a name in `scripts/features.js`; say so and stop on any other word) | a sweep of that area | 0-5, 8-10 |
| `triage [<section>]` | tag `docs/DEFERRED.md` | 0, 6 (with 5's entry form), 10 |
| `evolve [<area>]` | the balance, then proposals for that area, or for the app if none is named | 0, 8, 9, 10 |
| `inbox <answers>` | act on the owner's answers ("T3 yes, G2 yes, T4 no: too busy a screen") | 0, 7, 10 |
| `--cap=N` | ship at most N commits; the rest are filed `[loop]` in `docs/DEFERRED.md`. A capped sweep never moves an area to polished. | |
| `--deploy` | `main` (default); `branch`: push the run's branch for review and stop; `none`: commit locally and save a patch. Only `main` moves an area's state. | |

## 0. Open the run

Every mode works in a worktree from `origin/main` and ends by publishing one
branch (section 10), so the inbox, the tags and the ledger reach `main` with
the code. Nothing is written in the primary checkout.

1. `git fetch origin main`; in a shallow clone, `git fetch --shallow-since='30 days ago' origin main`,
   so the script reads a whole window. Then `.claude/skills/ship.md`, "Open the worktree",
   with the branch `tend/<area or mode>-<yyyymmdd-hhmm>`.
2. Read `docs/STATUS.md` and `.claude/skills/tend/ledger.json` there: they are
   `main`'s, and the only copies that count. An entry number means the entry
   on `main` with that number; say each entry's title back when acting on it.

## 1. The line: what the loop ships and what waits

Classify every finding before touching code. When in doubt, it waits.

| Class | It is | Where it goes |
|---|---|---|
| **loop** | An **existing** element made to behave or look right against a **cited** source: `docs/research/ui-references.md`, `.claude/rules/ui-patterns.md`, a rule file, WCAG 2.2, the platform's guidelines, a line of `docs/VISION.md`'s Always that an existing screen breaks, or a spec criterion that shipped (its test exists, its slice's record says shipped) and the build now breaks. Also bugs, performance, cleanup, missing tests and journeys, docs drift. | Shipped, one commit each |
| **owner** | Anything new a person can see or act on: a control, a screen, a setting, a stored field, a notification, copy that says something new or changes what a line means (an empty state's words included). Anything removed. A criterion never built: one in `UNTESTED` or `IN_PROGRESS` (`scripts/features.js`), in `docs/DEFERRED.md`, or in a queued spec. Anything whose only source is opinion. Anything `/vision` answers with other than **aligned** or **no surface**. The replay's beats, order or copy. | The inbox, with a recommended shape |
| **architecture** | A dependency, a migration or data-model change, a navigation-flow change, a host, a derivation-rule bump (`SNAP_RULES`, `STREET_CODE`, `LANDING_CODE`), more than about 8 files. | The inbox as `[arch]`; never started |
| **phone** | Anything only a device can show or verify: haptics, gestures, native map behaviour, background recording, VoiceOver and TalkBack, real GPS. | The inbox as `[phone]`, with **Do** and **Expect**; never shipped |

A loop fix that turns out to need an owner or architecture change stops there
and is filed; the half-made change is dropped, not shipped smaller.

The loop never edits `docs/VISION.md`, a spec, a `vision-ok:` or
`scripts/vision.allow.json`, a baseline, a hook, a skill, a script, CI or
`package.json`; `npm run check:tend` fails a run that does, and CI runs the
same check on every `tend …` commit pushed to `main` (decision 0133).

A rule file (`.claude/rules/`) is where a fix notes the trap it settled, so
the loop may **add** lines to one. It never changes or removes a line
already there (a reworded rule is the owner's, filed as a `T` entry), and no
commit of a run names as its `Source:` a rule file the run edited (decision
0135): a rule the loop wrote is not a source.

## 2. Sweep: deduce, do not wait to be told

Read the area's rule files, its specs and its `docs/DEFERRED.md` section first,
so nothing known is found twice. Then look through each lens; a finding names
its lens, its evidence (a picture, a file and line, a failing input) and its
source.

1. **The screens as a person sees them.** In the worktree, run the area's
   journeys (`docs/TESTING.md`, "Choosing the journeys") with
   `E2E_SHOTS=<scratchpad>/tend-shots`. A screen of the area with no journey
   or no `shot()` is itself a loop finding: add it. Give the pictures to the
   `ux-reviewer` and `steward` subagents together.
2. **The states nobody listed.** For each screen of the area, and for the
   controls a person uses on every visit, walk this list and say which the
   code and journeys handle: empty; first use; one item; very many; very long
   text or name; loading and slow; failed and retried; a refused permission;
   offline; 320 px wide and the largest text size; screen reader names and
   focus order; keyboard and Escape on web; interrupted (the app killed or
   backgrounded mid-action); done twice quickly; undone; a walk recording,
   paused or minimized meanwhile; a moment with no walk; data from before the
   latest migration. A state the screen cannot be in is not a finding.
3. **Siblings.** The same job done on two screens must look and act the same
   (`.claude/rules/ui-patterns.md`). List where one screen has what its sibling
   lacks: an Undo, a confirm, a spoken name, a context line on a moment, a
   pressed state, a way back.
4. **The promises.** Each shipped criterion in the area's specs against what
   the build does now, beyond what its test pins; each line of the rule files.
5. **The code.** The `auditor` subagent on the area's modules against the
   AGENTS.md invariants: truth vs cache, `readTrace` inputs, layers, anything
   over features not indexed, re-renders on the walk screen
   (`scripts/perf-walk.js`), dead code, a layer baseline entry that is fixed.
6. **The identity.** `npm run check:vision -- --list`; score words, numerals
   and accent colour in the area's copy and pictures.
7. **The ledger.** `[loop]` items of the area in `docs/DEFERRED.md`.

Run the subagents in one message. An empty lens is a result: say "nothing
found" and move on. Never invent a finding to fill a run, and never turn a
missing feature into a "gap": restraint is part of the product
(`docs/VISION.md`, Always). A sweep that ran every lens is a **whole sweep**;
say which lenses did not run and why.

## 3. Triage

One line per finding, with a severity (high, medium, low, as the `ux-reviewer`
defines them), in the report and nowhere else until it ships or is filed:
`N. [loop|owner|arch|phone] <severity> <title>: <evidence>; <source>; <the change>`.

- Drop what the ledger lists under `declined`, and what the inbox or
  `docs/DEFERRED.md` already holds (tag it there instead).
- Order the loop findings by severity, then by how many screens share the cause.
- A finding without a source is opinion: class **owner**, marked so.

## 4. Ship the loop findings

The shared steps are in `.claude/skills/ship.md`; they are named by heading.

1. **One commit per finding.** Reproduce it first as a failing regression test
   (`tend <area> N`, in the feature's folder under `src/lib/__tests__/`) or a
   journey step, then the smallest change that removes its cause; no
   refactors beside it. No finding shares a commit; none rides along
   untested. The message, exactly in this form:

   ```
   tend memories 3: the Undo toast is a button with a spoken name

   Test: tend memories 3 (src/lib/__tests__/memories/undo.test.ts)
   Source: WCAG 2.2, 4.1.2 Name, Role, Value (docs/research/ui-references.md, section 4)
   ```
2. **Checks per commit:** `npm run check:affected`. For storage, the
   recorder, the walk screen, the replay, and any change to what a screen
   shows: `npm test` and the journey that covers it, once, with a before and
   after picture kept for the report.
3. **A hard stop** (`.claude/skills/ship.md`, "Hard stops") reclassifies the
   finding and drops the half-made change.
4. Stop at `--cap`; file what is left as `[loop]` in `docs/DEFERRED.md`.

## 5. File the rest

**The inbox** is `docs/STATUS.md`, "Needs the owner", under "From /tend". One
entry per finding, written so a yes or no is enough:

```
- **T12 [owner] Threads: no way back to the moment a reply answers** (2026-11-11)
  Area: threads. Seen: <picture or file:line>. Rests on: <source, quoted>.
  Recommended: <the one shape, concretely, with its /vision verdict>.
  Otherwise: <the next shape>, or leave it.
```

- **Numbers** go on from `lastT` in the worktree's ledger (which is `main`'s);
  write the new `lastT` back. Section 10 renumbers if `main` moved meanwhile.
- Run `/vision` on each `[owner]` entry first (it returns its block and asks
  nothing): an **out** is not filed at all (say so in the report, with the
  rule), and a reshaping is filed in its reshaped form.
- `[phone]` entries carry **Do** and **Expect** in place of a recommendation.
- An addition too large for one commit is not a `T` entry: shape it as a `G`
  entry with criteria (section 9's form), so a yes has something to hold it to.
- Findings that are real but not worth the owner's time now go to the area's
  section of `docs/DEFERRED.md`, tagged.

## 6. Triage the deferred ledger (`/tend triage`)

Give every untagged bullet in `docs/DEFERRED.md` (or the named section's) one
tag at its start, by the table in section 1, keeping its words:

- `[loop]`: the loop may ship it;
- `[owner]`: an addition, a product question, or an owner's call already
  named as one;
- `[arch]`: needs an architectural decision;
- `[phone]`: needs a device;
- `[kept]`: a limit recorded on purpose (a decision says so); nothing to do.

A bullet holding several items is split first, one item per bullet, the
words kept. Then put
the `[owner]` and `[arch]` items the owner would most want to answer (**five
at most** per run, and none while ten wait) in the inbox with
recommendations; the rest stay tagged in place. Nothing but docs ships in a
triage run.

## 7. Act on the owner's answers (`/tend inbox …`)

Say back each entry's number and title as `main` holds it before acting; an
entry that is gone, or whose title the owner's words plainly do not fit, is
not acted on. One build per run: with several yeses, build the first and say
which wait for the next `/tend inbox`. Every no is recorded in the same run.

- **Yes to an `[owner]` `T` entry** (one commit's worth, by section 5): build
  its recommended shape as section 4 does, one commit, subject
  `tend <area> T<n>: …`, its test named the same, `Source:` naming the entry
  and what it rests on. The entry leaves the inbox.
- **Yes to an `[arch]` entry** is the owner's architectural call, not a
  build: write its decision record, and shape the work as a `G` entry with
  criteria (section 9's form) for a yes of its own.
- **A `[phone]` entry** is answered with what the owner saw on the device:
  as expected, and it leaves; otherwise it becomes a `/fix` the owner types.
- **Yes to a `G` entry**, of any size: one slice (decision 0130). Run the
  `slice` skill with `<slug> --from=G<n>` **in this run's worktree**: the
  entry's criteria and verdict are its start, its plan is written and read by
  the steward but not held for the owner, and it returns its result block
  without publishing or asking. Remove the entry from "Next evolutions", then
  section 10 (its checks are the slice's own step 9; the review's fixes are
  named `<slug> audit N`; `check:tend` is not run, since a slice's commits
  are not loop commits).
- **A slice that returns "Stopped on":** push its branch as
  `slice/<slug>-parked` and leave `main` without it. Then, on a new branch
  from `origin/main` in the same worktree, file the question as a `T` entry
  (`[arch]` or `[owner]`, naming the parked branch, the question and the
  recommended answer), keep the `G` entry, and publish that record alone.
  **A yes or no to such an entry** resumes it: check out the parked branch,
  rebase it on `origin/main`, apply the answer, and finish the slice as above;
  if the answer ends it, delete the parked branch and decline the `G` entry.
- **Reshape** ("yes, but…"): rewrite the entry as told and run `/vision` on
  the new shape. A reshaped `T` entry is built only if it is still aligned
  and still one commit's worth. A reshaped `G` entry is never built in the
  same run: its rewritten criteria are filed for the owner's plain yes.
- **No:** remove the entry and add `{ title, area, date, reason }` to the
  ledger's `declined`, so no sweep proposes it again. A no that states a rule
  ("never a count there") is a new decision record too. A no to every
  evolution of a polished area makes it `resting`.
- An answer that changes `docs/VISION.md` is the owner's edit; propose the
  wording and leave the page.

## 8. The balance: is the app growing or only settling?

Every sweep and every `evolve` runs this before the close. It is for the
owner and the ledger; none of it ever appears in the app.

**Each area has a state** in the ledger's `areas`, set by a sweep published
to `main`; an area the ledger does not list has never been swept and is
`rough`. The script overrides the ledger: an area whose source changed since its
sweep, by a slice, a `/fix` or anything but the loop's own commits (a slice
the loop built included), counts as `rough` whoever landed the change.

| State | It means | What the loop does there |
|---|---|---|
| `rough` | The last sweep **found** loop findings of high or medium severity, the sweep was not whole or was capped, or its source changed since | Tend it. No evolution is proposed on a rough base; `evolve <area>` says so and stops. |
| `settling` | A whole sweep found only low findings, or `[owner]` or `[arch]` entries of the area are unanswered | Tend once more, or wait for the owner's answers |
| `polished` | A whole, uncapped sweep found nothing above low, every screen of the area has a journey, and no `[owner]` or `[arch]` entry of the area is open (`[phone]` entries do not count: no device has run this) | **Owes an evolution:** section 9, in the same run |
| `resting` | Polished, and the owner said no to its evolutions (the ledger says when and why) | Left alone until its source changes |

**Then run `npm run tend:balance -- --write`** in the worktree
(`scripts/tend.js`). Over the last 14 days of `origin/main` it names the
slices that grew (commits carrying a spec's criteria and changing the app's
source), counts refinement beside them, groups the areas by state, counts the
open `T` and `G` entries, and writes its reading to the ledger. The reading is the script's; a red `main` in the
window is the one sign it cannot see, and reads as outgrowing its base.

| Reading | Means | The run ends by |
|---|---|---|
| **settling** | No slice grew in 14 days | Section 9 for the app (not only this area), said first in the report. Proposals may sit on a rough area then, each saying what must be tended first. |
| **outgrowing its base** | More than three `rough` areas, more than ten unanswered `[owner]` and `[arch]` entries, or a red `main` | Filing no new `G` entry; the report names the areas to tend and the entries to answer first |
| **in step** | Otherwise | Section 9 only if this area is polished. `/tend evolve`, typed by the owner, proposes for polished areas whatever the reading, and names the area to tend first when there is none. |

## 9. Evolve: propose the next iteration

For a polished area, or for the whole app when it is settling. At most
**three** open `G` entries exist at once; a better proposal replaces the
weakest, with a line in the report saying why.

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

- **S**: three criteria or so, inside the size of "Hard stops".
- **M**: one slice, about ten criteria or fewer, no architectural decision.
- **L**: anything more. Never proposed whole: propose its first S or M slice
  and say what the rest would be.

Every size is built the same way on a yes: `/slice --from=G<n>`, held to the
entry's criteria.

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

**File** under "Next evolutions" in `docs/STATUS.md`, numbered on from the
ledger's `lastG`:

```
- **G4 [M] Chronicle: search over moments, by word** (2026-11-11) · Return · aligned
  Area: memories. From: VISION.md Shapes, "Search over moments"; polished since <sha>.
  Touches: <the gate's Never and Always lines and decisions, quoted, or none>.
  The slice: 1. <criterion, an observable outcome> 2. <…> (three to ten, the gate's own criteria among them).
  Payoff: <words>. Cost: <words>. Reopens: <areas>. After it: <what it unlocks>.
  Instead: <the smaller shape>.
```

The owner picks; the loop never starts a `G` entry unasked.

## 10. Close and publish

1. **The record**, in the worktree: the ledger (the area's `state`, `swept`
   date, a note, and `main`: the `origin/main` commit this worktree was
   opened from, never a later one, so that anything landing during the run
   reads as a change since the sweep; `lastT`, `lastG`; anything declined;
   valid JSON, only those fields, the balance left to the script) and
   `docs/STATUS.md`, "Last tend", replaced with this run's digest (area,
   commits with one line each, entries filed, the balance in a sentence,
   lenses not run). Commit it with the inbox and `docs/DEFERRED.md` edits as
   `tend <area>: the run's record`. It holds documents, the ledger and the
   run log only.

   **The run log** (decision 0134) is `.claude/skills/tend/runs.jsonl`, one
   line a run, never edited afterwards. Every mode writes one, in its last
   record commit:

   ```
   npm run tend:log -- origin/main..HEAD '{"mode":"sweep","area":"memories","deploy":"main","base":"<the worktree's base>",
     "lenses":{"whole":false,"skipped":["2: offline not pictured"]},
     "found":{"loop":{"high":0,"medium":2,"low":5},"owner":2,"arch":0,"phone":1,"out":1},
     "filed":{"T":["T4","T5","T6"],"G":[]},"answers":[],"state":{"from":"rough","to":"settling"}}'
   ```

   The script adds the date and what the commits say (findings shipped, the
   review's fixes, entries built, reverts) and refuses a line that leaves a
   count out. `found` counts everything the sweep found, shipped or not,
   zeros included; `answers` is each entry the owner answered this run, as
   `yes`, `no` or `reshape`; `review` is the auditor's findings
   (`accepted`, `rejected`, `deferred`). The line is written once: when the
   review of step 2 leads to a second record commit, write it there.
   Write facts, never a judgment of the run: no lesson, no rating, no advice.
2. **Checks:** `npm run check:docs`. A run that changed code (a sweep, a `T`
   build) also runs `npm run check:tend -- origin/main..HEAD` (every commit is
   a loop commit with its own named, real test and its source, and none
   touches what the loop may not), `npm run typecheck && npm run lint &&
   npm test`, then `.claude/skills/ship.md`, "Review": one `auditor` pass over
   the run's whole diff, one round, fixes named `tend <area> audit N`. A `G`
   build runs the slice's step 9 and the same review in place of `check:tend`.
3. **Publish**, by `--deploy`:
   - `main`: `.claude/skills/ship.md`, "Publish to main", once. Whenever
     `main` moved, compare its `lastT` and `lastG` with the ones this run
     started from: if they changed, or the rebase conflicts in
     `docs/STATUS.md`, `docs/DEFERRED.md` or the ledger, take `main`'s side of
     those three and write this run's entries again, numbered on from
     `main`'s. Any other conflict is `ship.md`'s stop. A red run is handled
     by `ship.md`, "A red run".
   - `branch`: push the run's branch and stop; `none`: save a patch. Neither
     moves an area's state, the entry numbers are provisional, and step 5 is
     skipped: say the record is not on `main`.
4. `.claude/skills/ship.md`, "Clean up".
5. **Then ask the owner** about this run's new entries with AskUserQuestion
   (the recommended shape first, four entries per call). Their answers are a
   new run: `/tend inbox …`, section 7, never work added to this one.

## Report

Mode, area and flags; each lens and what it found or "nothing found"; every
finding's triage line; per shipped commit its hash, source, test and
pictures; the Pages run and the live check; the entries filed, with their
numbers; the balance (the slices that grew, the areas by state, the reading)
and any `G` entries with their ranking; what was dropped as **out**; what was
not run or not looked at, and that nothing here has run on a phone. End with
the result block (`.claude/skills/ship.md`).
