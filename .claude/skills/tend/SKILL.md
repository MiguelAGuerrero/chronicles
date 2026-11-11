---
name: tend
description: The owner's product loop (decision 0128) - sweep one area for gaps nobody asked about (missing states, broken UI patterns, sibling screens that disagree, slow paths, drift), ship to main what only makes an existing thing conform, one commit per finding, and file every addition, phone-only finding and judgment call in the owner's inbox with a recommended shape. Also triages docs/DEFERRED.md into loop, owner and phone items, and builds what the owner approved from the inbox.
when_to_use: The owner types /tend, optionally with an area, a feature, "triage" or "inbox". Not for one named bug (/fix) or a feature the owner already described (/slice).
argument-hint: "[<area or feature> | triage | inbox <answers>] [--cap=N] [--deploy=main|branch|none]"
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent, Skill, AskUserQuestion, EnterWorktree, ExitWorktree, mcp__github__actions_list, mcp__github__actions_get, mcp__github__get_job_logs
---

# Tend: $ARGUMENTS

The owner shapes the product; this loop finds what they did not think to look
for. Typing `/tend` is the owner's go-ahead to push this run's **loop**
findings to `main` (decision 0128), under the same terms as `/fix` (decision
0081): no force push, no rewritten history, no skipped or loosened test, a red
deploy reverted. It grants nothing for an addition: those wait in the inbox.

Echo the resolved mode, scope and flags in your first line.

| Argument | The run |
|---|---|
| none | the area whose files changed most on `main` since it was last tended (`ledger.md` beside this file) |
| an area or feature (`scripts/features.js`, `.claude/rules/`) | that scope only |
| `triage` | section 6 only: tag `docs/DEFERRED.md` |
| `inbox <answers>` | section 7 only: act on the owner's answers ("T3 yes, T4 no: too busy a screen") |
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

- Drop what `ledger.md` lists as declined, and what the inbox or
  `docs/DEFERRED.md` already holds (tag it there instead).
- Order the loop findings by severity, then by how many screens share the cause.
- A finding without a source is opinion: class **owner**, marked so.

## 4. Ship the loop findings

Follow `.claude/skills/fix/SKILL.md` (read it; the Skill tool cannot run it),
with these differences:

- **One worktree for the run**, `tend/<scope>` from `origin/main` (its section 0).
- **One commit per finding**, each with its failing-first regression test
  (`tend <scope> N`) or journey step, and a message that names the finding, its
  source and its test. No finding shares a commit; none rides along untested.
- **Tests:** `scoped`; `e2e` for storage, the recorder, the walk screen and the
  replay, and for any change to what a screen shows (its journey, with a
  before and after picture kept for the report).
- **Review:** `self` per commit. Before the push, one `auditor` pass over the
  run's whole diff; accepted findings are fixed first, as in `/fix` section 5.
- Its section 2 hard stops hold. A hard stop reclassifies the finding; it
  never ends the run.
- **Push once**, at the end (or at `--cap`): `git fetch origin main`, rebase,
  re-run `npm run check:affected` and `npm test`, then
  `git push origin tend/<scope>:main`. Watch the one Pages run.
- **Red run:** find the commit that owns the failure, `git revert` it alone,
  push, confirm green, and file the finding as `[owner]` with the log's cause.
  Never leave `main` red; never revert a commit that is not this run's.
- Clean up as its section 9.

## 5. File the rest

**The inbox** is `docs/STATUS.md`, "Needs the owner", under "From /tend". One
entry per finding, numbered on from the last `T` number ever used
(`ledger.md` holds it), written so a yes or no is enough:

```
- **T12 [owner] Threads: no way back to the moment a reply answers** (2026-11-11)
  Seen: <picture or file:line>. Rests on: <source, quoted>.
  Recommended: <the one shape, concretely, with its /vision verdict>.
  Otherwise: <the next shape>, or leave it.
```

Run `/vision` on each `[owner]` entry first; an **out** is not filed at all
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

- **Yes** to a small addition (inside `/fix`'s size limits): build it as
  section 4, one commit, its entry removed from the inbox.
- **Yes** to more than that: it is a slice. Write its line under "Queued" in
  `docs/STATUS.md` with the approved shape and stop; `/slice` builds it.
- **Reshape:** rewrite the entry as told and build that.
- **No:** remove the entry and add one line to `ledger.md`, "Declined", with
  the date and the owner's reason, so no sweep proposes it again. A no that
  states a rule ("never a count there") is a decision record too.
- An answer that changes `docs/VISION.md` is the owner's edit; propose the
  wording and leave the page.

## 8. Close the run

1. `ledger.md`: the scope's row (date, `main`'s head after the push), the last
   `T` number, any declined lines.
2. `docs/STATUS.md`, "Last tend": replace it with this run's digest (scope,
   commits with one line each, entries filed, what was not looked at). Git
   holds the earlier ones.
3. `npm run check:docs`; `/docs-gc` only if a rule, a behaviour or a file
   location changed.

## Report

Scope and flags; each lens and what it found or "nothing found"; every
finding's triage line; per shipped commit its hash, source, test and pictures;
the Pages run and the live check; the inbox entries filed, with their
numbers; what was dropped as **out**; what was not run or not looked at, and
that nothing here has run on a phone.
