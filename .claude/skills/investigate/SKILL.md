---
name: investigate
description: Turn something the owner saw or wants (a screenshot, a confusing screen, a half-formed idea) into queued work - read-only on the app - by decoding what is on screen to the code that draws it, ranking the causes, grounding the options in how adjacent apps do the job, gating the recommended shape with /vision, putting the owner's open calls to them in the same run, and filing one inbox entry with numbered criteria that /tend inbox G<n> yes builds through /slice --from=G<n>. The write-up is kept in docs/research/<slug>.md (decision 0231).
when_to_use: The owner types /investigate, or asks to "look into", "research", "investigate and queue up" or "scope" something without asking for it to be built now. Not for one known bug (/fix), a feature the owner already described and wants built (/slice), or a sweep for gaps nobody asked about (/tend).
argument-hint: "<what you saw or want; a screenshot helps> [--deploy=main|branch|none]"
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Agent, Skill, AskUserQuestion, ToolSearch, EnterWorktree, ExitWorktree, mcp__github__actions_list, mcp__github__actions_get
---

# Investigate: $ARGUMENTS

The stage before a slice: find out what is wrong or wanted, how it could be built, and what the owner
must decide, then leave it queued so a yes builds it. **It never changes the app**: no file under `src/`,
`scripts/`, `specs/` or a test. What it writes is the brief, precedent lines, a decision record when the
owner's answer amends a call, and one inbox entry. The map of the skills is `.claude/skills/README.md`;
the shared publishing steps are `.claude/skills/ship.md`.

Typing `/investigate` grants publishing **this run's record** to `main` (the brief, `adjacent-apps.md`
lines, decision records, the entry) on `ship.md`'s terms; `--deploy=branch` stops at a pushed branch,
`--deploy=none` at a local commit. It grants no build: the build waits for the owner's yes to the entry.

Echo the resolved ask (one sentence, the owner's words, not softened) and the deploy flag in your first line.

## 0. Open

1. A worktree of `origin/main` (`ship.md`, "Open the worktree"), branch `investigate/<slug>`; `<slug>`
   is kebab-case naming the subject, not the fix (`walkability-car-ground`, not `hatch-the-tint`).
2. Read what is already queued so you do not file a twin: `docs/STATUS.md`, "Needs the owner" (the
   inbox, "Next evolutions", the "From …" sections); the ledger's `declined`
   (`.claude/skills/tend/ledger.json`); `docs/DEFERRED.md` for the area. A match ends the run with a
   pointer to it, or becomes a note on it (`npm run records -- inbox note <id>`), never a second entry.
3. Is it this skill's? One reproducible bug with one cause: say it is a `/fix` and stop. An idea with
   no surface (tooling, a refactor): say so and stop. The owner may overrule either.

## 1. Decode what the owner saw

When there is a picture, name every mark on it and the code that draws it (`file:line`): colours, lines,
pills, icons, which layer is which. A table, one row per mark. Read the area's `.claude/rules/<area>.md`
first, then its spec, the decisions it cites and its `DEFERRED.md` items. Without a picture, make one
when the screen is reachable on the web build (`/e2e`, `E2E_SHOTS`; 390 px, `deviceScaleFactor` 1).
Wide sweeps (more than a handful of files) go to an `Explore` subagent; keep its conclusion, not its dumps.

## 2. Find the causes

Rank them, most to least, each one sentence with its `file:line` and, where it is a look, the measured
effect (a tint blended over the base map is a colour you can state; say how close it lands to something
that means otherwise). Name what the code, a spec or a decision chose on purpose: those are the owner's
calls to revisit, not bugs. Say what has never been seen on a phone.

## 3. Precedent (decision 0193)

Read the job's section of `docs/research/adjacent-apps.md`. For what it lacks, look on the web (several
searches in one turn) and have the `web-fetch` agent read the pages you would cite. Record each new line
there, in its job's section (add the job if new), in the file's own form: **Verified** only for a page
read, otherwise "from memory, unverified". Unlike the loop, this run may edit `docs/research/`.
Precedent informs how, never what (`/tend` section 9).

## 4. Shape the options

Two to five shapes, a table: the change, the causes it answers (by number), its vision risk, its rough
cost (files, native code). One of them is always **leave it**, with what leaving it costs. Then **one recommendation**, which may combine shapes, sized as `/tend`
section 9 sizes: **S** (about three criteria), **M** (one slice, ten criteria or fewer, no architectural
decision), **L** (never queued whole: its first S or M slice, and what the rest would be). The size names
its source files and its native paths beside its criteria: ten criteria over three files is not ten over twelve.

Run `/vision` on the recommended shape as a called skill (it returns its block and asks nothing). An
**out** is not queued: write the brief, say so with the rule, and stop before section 6's filing. A
reshaping becomes the recommendation.

## 5. Put the owner's calls to them, now

The owner typed this skill and is present, so their calls are asked **in this run**, not filed for later
(the owner, Nov 19). With `AskUserQuestion`, at most four questions at once:

- Only what is theirs: what a person sees or does, a reversal of their own call or a shipped criterion,
  anything under `/tend`'s **owner** or **architecture** rows, and anything 0157 keeps for them.
  Engineering choices are yours: make them and say so in the brief.
- Each question stands alone (the owner may see only the dialog): it names the screen, the thing and
  what is true today. Recommended option first, marked "(Recommended)", its precedent cited in the
  option's description, marked unverified when `adjacent-apps.md` marks it so; a reversal names the
  decision it reverses. Every option is a real alternative with a different cost, never a straw man: the
  owner takes the recommended option nearly always (`docs/research/tend-process-review.md`, F6).
- A question of colour or look offers whole candidates side by side, measured as a person sees them
  (the blend included), never one swatch.
- **The mock-up** (decisions 0252, 0259): when the recommendation's look needs one (`mockup.md`, "When one is
  needed"), draw it (and each option the owner
  is asked to choose between) and publish it as `.claude/skills/mockup.md` says, before asking; one question
  asks for its approval, the page linked ("Approve as drawn (Recommended)"). An approval the owner leaves for
  later is an `Open:` line.

Then:

- An answer that amends or reverses a decision is a **decision record** in this run (`Amends: <NNNN>`,
  "Status: accepted, waits on G<n>'s build"), numbered with `npm run book:next-decision`, and a row in
  `docs/decisions/README.md`.
- An answer the owner skips, or "decide later", stays on the entry as an `Open:` line. `/tend` does not
  build an entry that has one (`/tend` section 7).
- An answer that changes the recommendation changes it: rerun `/vision` on the new shape.

## 6. Write the brief and file the entry

**The brief**, `docs/research/<slug>.md`, is the slice's starting point, so `/slice --from` does not
investigate again:

```
# <Subject>: investigation (<date>)

From: the owner's /investigate, <date>: "<their words>". Queued as G<n>. Status: queued | built in <slug> | declined.

## What the owner saw          (section 1's table)
## Why it reads wrong          (section 2, ranked, file:line)
## How adjacent apps do it     (section 3, each line with its source and Verified or not)
## Options                     (section 4's table)
## The owner's calls           (each question, the options offered, the answer; decisions written)
## The recommendation          (the shape, its /vision block, its size)
## Done when                   (the owner's observation restated as a check: the same screen, the same question)
## What the slice will touch   (files, layers, journeys, native paths, checks to run first)
## Open for the owner          (anything they still decide: a look, words, behaviour; each one an Open: line on the entry)
## Engineering unknowns        (the builder's to settle; what has never run on a phone)
```

**The entry**, by its size:

- **S or M** (or the first slice of an **L**): a `G` entry under "Next evolutions", in `/tend` section 9's
  form, with these lines added after the title line:
  `From: /investigate, the owner's ask (<date>). Brief: docs/research/<slug>.md.`,
  `Calls: <the owner's answers, one clause each; decision NNNN>`, `Done when: <the brief's check>`,
  `Mock-up: <link> (docs/mockups/<id>/), approved "<the owner's words>" (<date>)` when it changes a look, and one
  `Open: <question>` for each item under the brief's "Open for the owner". A look question left to "the
  builder picks" is an `Open:`, never an engineering unknown.
  File it with `npm run records -- inbox add --file <entry>`, its id written `G?`. An entry from this skill
  is the owner's ask: it counts toward none of `/tend`'s three open `G` entries, no loop proposal
  replaces it, and the balance reading "outgrowing its base" does not hold it.
- **One commit's worth:** a `T [owner]` entry under "From /tend" in `/tend` section 5's form, with the
  same `From:` and `Brief:` lines.
- **An architectural call the owner deferred:** a `T [arch]` entry naming the brief.

The three record documents change only through `npm run records` (decision 0156; `ship.md`, "The record
documents"): never Edit, Write or sed on them.

## 7. Check, commit, publish

1. `npm test` (about 13 s; tests read the skills and the docs, so a change of words can turn `main` red:
   `records audit 14` did on Nov 19), `npm run check:docs`, `npm run check:vision`, `npm run check:records`,
   and `node scripts/tend.js commits --loop-only origin/main..HEAD`. A check that fails is fixed, never
   skipped.
2. One commit, subject `investigate <slug>: <the subject>, queued as G<n>` (the number `records` gave;
   renumbered by `npm run records -- redo` if `main` moved). Its last paragraph: the `Records-Op:`
   trailers (`npm run records -- trailers`), `Co-Authored-By` and `Claude-Session`.
3. Publish per `--deploy`: `main` by `ship.md`, "Publish to main", steps 1-3 (a docs-only change: the
   Pages run is watched, the live check is not needed); `branch` pushes `investigate/<slug>`; `none` stops.
4. Clean up (`ship.md`, "Clean up").

## Report

Short, in this order: what the owner saw (decoded, one line a mark); the causes, ranked; the
recommendation and its size; the owner's calls as answered; the entry's number and how to build it
(`/tend inbox G<n> yes`); what has never run on a phone. Sources as links. Then `ship.md`'s result block,
with `Result:` the publishing outcome and `Filed:` the entry and any decision.
