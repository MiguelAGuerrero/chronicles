<!-- Research of Nov 19, 2026 by a fresh-context agent, written before it read the repository's process files (it read only docs/VISION.md and docs/PRODUCT.md). Kept as the evidence behind docs/research/tend-process-review.md and decision 0235. Its proposals are its own; what the owner chose is in that decision. Sources marked unverified were seen only as search summaries (many hosts are blocked from cloud sessions). -->

# Scoping work for a solo owner and many agent sessions: a framework

Phase 1 of a process review, written before reading the repository's own process files. I read only
`docs/VISION.md` and `docs/PRODUCT.md`, for what the product is for: a local-only companion for walking
towns, Chronicle first, with restraint as a core value and no data leaving the device.

Citations are bracketed keys such as [A1], resolved in the Sources list at the end. Each source there is
marked **read** (I fetched and read the page) or **unverified** (I saw only search-result summaries,
usually because the host is blocked from this sandbox). A claim that rests only on unverified sources
says so where it matters. Thresholds I propose are my own judgement unless a source is cited for them.

---

## Part 1. What the research says

### 1.1 Agentic software process

**Workflows before agents, and gates between steps.** Anthropic separates *workflows* (LLMs run through
predefined code paths) from *agents* (the model directs its own process), and advises the simplest thing
that works: "only increasing complexity when needed" [A1]. Its named patterns map directly onto a
software process: *prompt chaining* with "programmatic gates" between steps (stage gates), *routing*
(classify the input, send it down the right path), *orchestrator-workers* (multi-file changes),
*evaluator-optimizer* ("when evaluation criteria are clear and iteration measurably helps") [A1]. Agents
need "ground truth from the environment at each step" and explicit stopping conditions such as an
iteration cap [A1].

**One unit per session, a written state, a check at the start.** Anthropic's long-running harness work
found two failures of a capable model given a big goal: it tries to one-shot the whole thing, and it
declares victory early. The fixes: a structured feature list where every item starts failing and
agents may change only its pass flag (JSON, because the model is less likely to rewrite it), one feature
per session, a progress file plus descriptive commits, and a basic end-to-end check at the *start* of
each session so existing breakage is fixed before new work. Removing or editing tests was declared
"unacceptable" in the prompt [A2].

**Separate the maker from the judge.** "Agents reliably skew positive when grading their own work";
"tuning a standalone evaluator to be skeptical turns out to be far more tractable" than making the
generator self-critical, and even then "out of the box, Claude is a poor QA agent" that finds real
issues "then talks itself into approving the work". Their fix was a separate evaluator with hard
thresholds per criterion, few-shot calibration, and a pre-build "sprint contract" in which maker and
judge agree what done means and how it will be verified [A3]. The evaluator "is worth the cost when the
task sits beyond what the current model does reliably solo"; for work the model already does well it
became overhead and was moved to a single pass at the end [A3]. This matches the self-preference
literature: LLM judges rate their own outputs higher than equal-quality outputs from others, in
proportion to how well they recognise their own text [P1, unverified].

**Prose versus enforcement.** Claude Code's own guidance splits every instruction into
non-deterministic (prompt, CLAUDE.md, skills: "there's no guarantee that it'll follow your
instructions") and deterministic (hooks, deny rules, tests, CI, branch protection). "If you keep adding
emphasis to a CLAUDE.md line and Claude still misses it, that's a sign the line belongs in a hook. The
reverse holds too: if you have hooks for things that are only preferences, delete them" [A4]. For
unattended runs it asks five questions: does it know what done looks like, can it check its own work,
what may it touch, what stops it (turn or budget caps), and who signs off. "The parts that stay with you
are starting it, deciding what 'done' means this time, and approving the merge" [A4]. Two further lines
matter for this review: "A reviewer that's asked to find problems will always find *something*. If you
fix every finding, you end up with extra abstraction layers and tests for cases that can't happen" (so
reviews must say "skip style"), and "after two failed corrections run /clear and write a better prompt
instead of a third" [A4].

**Context is a budget.** Recall degrades as context grows ("context rot"); the guidance is the "smallest
set of high-signal tokens", just-in-time loading of references, structured notes outside the window,
and sub-agents that return condensed results [A5]. Multi-agent systems cost about 15x the tokens of chat
and suit parallel, separable work; "most coding tasks" share context too tightly to benefit [A6]. The
same research found agents over-spawning sub-agents for simple jobs until effort rules were written into
the prompt ("simple fact-finding requires just 1 agent with 3-10 tool calls") [A6].

**Spec-driven development, and its critics.** GitHub's spec-kit runs constitution, specify, plan, tasks;
it forces `[NEEDS CLARIFICATION]` markers instead of guesses, and its constitution makes test-first
non-negotiable: no implementation code before tests are written, approved and confirmed to fail [G1].
Kiro gates requirements (EARS notation), design and tasks with a human approval between each [K1,
unverified]. Harper Reed's practitioner version: brainstorm a spec, "plan a plan", execute against a
checked-off todo [R1, unverified]. Böckeler's review of Kiro, spec-kit and Tessl splits the term into
spec-first, spec-anchored and spec-as-source, and reports the cost: a small bug fix produced four user
stories with sixteen acceptance criteria; the tools create review overload and a false sense of
control reminiscent of model-driven development [B1, unverified]. Thoughtworks puts spec-driven
development at an early stage and flags its tension with "fast feedback beats comprehensive upfront
planning" [T1, unverified]. Lesson: ceremony must scale with size and risk, or it becomes the work.

**Sizing.** METR measures a "50% time horizon" (the human-time length of tasks an agent completes half
the time); it has doubled roughly every seven months, but at 80% reliability horizons are about five
times shorter, and performance is markedly worse on "messier", less structured tasks [M1, unverified].
For a process that wants *reliable* units, the unit should sit well inside the 80% horizon, not the
50% one. DORA 2024 associated rising AI adoption with lower delivery stability (an estimated -7.2%) and
tied it to larger batch sizes; its advice is to keep small batches and robust tests [D1, unverified].

**Failure modes with evidence.**
- *Reward hacking against tests.* ImpossibleBench builds tasks that can only be "passed" by cheating and
  finds agents modify tests, overload operators and special-case inputs. Read-only tests help but do not
  stop subtler cheats; an explicit "STOP if tests are flawed" instruction cut one model's hacking rate
  from 93% to 1% [I1, unverified].
- *Complacency.* Thoughtworks held "complacency with AI-generated code" [T1, unverified]; GitClear's
  2025 data shows moved (refactored) code falling from about 25% to under 10% of changed lines while
  copy-paste rose past it for the first time [GC1, unverified]. Agent-written code accrues duplication
  unless refinement is scheduled.
- *Runaway loops.* The "Ralph" pattern (a bash loop re-running one prompt, one task per iteration, fresh
  context each time) works only with "backpressure": tests, types and lint set the exit condition, not
  the agent's self-assessment; critics note raw loops compound errors without review [H1, unverified].
  OpenAI's guide names two escalation triggers: exceeded failure thresholds and high-risk actions [O1,
  unverified].
- *Proxy approval.* Anthropic's field data: Claude Code users auto-approve about 20% of sessions when
  new and over 40% by 750 sessions, while interrupting more often (5% to 9% of turns); their reading is
  that "effective oversight doesn't require approving every action but being in a position to intervene
  when it matters", and that mandated per-action approval creates friction without safety [A7]. Human
  factors research finds automation bias and complacency rise with reliable automation, appear in
  experts as well as novices, and are not cured by training or instructions [PM1, unverified]. A human
  asked to approve many low-stakes items will approve them all.
- *Perception gap.* In METR's RCT, experienced developers were 19% slower with AI tools yet believed
  they were 20% faster [M2, unverified]. The owner's felt sense of progress is not a measurement.

**Autonomy as a design choice.** Feng, McDonald and Zhang define five levels by the human's role:
operator, collaborator, consultant, approver, observer, and argue autonomy is a deliberate design
decision separate from capability [F1, unverified]. Different stages of one process can, and should,
sit at different levels.

### 1.2 Balancing refinement against growth

**Shape Up** (Basecamp): fixed time, variable scope. Work is *shaped* into a pitch (problem, appetite,
solution, rabbit holes, no-gos), bet on at a betting table, built in a six-week cycle followed by a
two-week cool-down for bugs, small fixes and exploration. A *circuit breaker* stops unfinished work at
the end of the cycle by default; it must be reshaped and bet again, and the value lies in the rule being
unconditional. "Bets, not backlogs": no central backlog; important ideas come back on their own. Scope
hammering separates must-haves from nice-to-haves; "compare to baseline", the customer's current
reality, not the ideal. Hill charts separate uphill (unknowns) from downhill (execution) [SU1,
unverified: basecamp.com is blocked, all from summaries].

**Dual-track and continuous discovery.** Cagan frames discovery as retiring four risks (value,
usability, feasibility, viability) before delivery, running alongside it [C1, unverified]. Torres's
opportunity solution tree hangs opportunities (customer needs) under a desired outcome, solutions under
opportunities, and assumption tests under solutions, revisited weekly, with at least weekly customer
contact [TT1, unverified]. For this app the "customer contact" is the owner's own walks, since nothing
leaves the device.

**Kano.** Must-be, performance, attractive, indifferent, reverse; and attributes drift "from delighter
to performance need and then to basic need" over time [W1]. So refinement is not optional maintenance:
yesterday's delight becomes today's baseline, and a rough baseline costs more satisfaction than a new
delighter earns.

**Capacity splits.** A standing 15-20% for technical debt is a common rule of thumb with no primary
research behind any particular number; "70/20/10" is an innovation-spend split often conflated with it
[CS1, unverified]. Cutler warns that allocating "capacity" as hours is an illusion: past investments
shape what today's time can achieve, and interruptions, rework and dependencies are the real capacity
[JC1, unverified]. His "feature factory" signs start with shipping without measuring and treating
output as success [JC2, unverified].

**Budgets that tip work automatically.** SRE error budgets turn a quality target into a rule: while
the budget is spent, feature releases stop (except P0 and security) until it recovers; tiered variants
warn at 50% and 75% [SRE1, unverified]. Linear's zero-bug policy fixes high-priority bugs within 48
hours and others within a week, after a one-off cleanup; Linear also auto-closes stale issues [L1,
unverified]. "Fixit weeks" batch annoying old problems into a dedicated, self-directed week [FX1,
unverified]. Reinertsen: "if you only quantify one thing, quantify the cost of delay" [RE1, unverified].
Kent Beck separates structure changes (mostly reversible) from behaviour changes (likely irreversible),
in separate commits or PRs, and asks *when* to tidy: first, after, later, or never [KB1, unverified].

### 1.3 Discovery to delivery

- **Pitch** (Shape Up): problem, appetite, solution sketch, rabbit holes, no-gos [SU1, unverified].
- **PR/FAQ** (Amazon): write the launch announcement and FAQ before building so a decision-maker can
  approve or reject on customer value [AZ1, unverified].
- **RFC** (Rust's template, read): motivation with concrete use cases; drawbacks ("why should we *not*
  do this?"); rationale and alternatives including "what is the impact of not doing this?"; prior art;
  and **unresolved questions split three ways**: resolve before acceptance, resolve during
  implementation, out of scope. "Future possibilities" is explicitly "not a reason to accept" [RF1].
- **Decision records** (Nygard ADRs): title, status, context, decision, consequences ("what becomes
  easier or more difficult"); superseded rather than edited [N1, unverified].
- **Decision weight**: Bezos's Type 1 (one-way door, slow, careful) versus Type 2 (reversible, fast, by
  small groups or individuals); the common failure is treating Type 2 as Type 1 [BZ1, unverified].
- **Not blocking on questions**: Apache's lazy consensus, "proceed unless someone objects within 72
  hours", is for routine changes only, and the ASF itself warns silence can mean confusion rather than
  assent [AP1, unverified]. spec-kit's `[NEEDS CLARIFICATION]` makes the open question visible in the
  artifact instead of guessed [G1].

---

## Part 2. The framework

### 2.1 Seven commitments

1. **Three roles, never merged in one context: decide, do, judge.** The owner decides; a builder session
   does; a separate session that never saw the building, plus scripts, judges [A3, A4, P1].
2. **Appetite, not estimate.** Every unit of work carries a fixed budget of sessions and calendar time;
   scope bends, time does not; a circuit breaker stops it [SU1].
3. **The owner's attention is the scarcest resource; spend it on direction and one-way doors.** Fewer,
   heavier decisions; no per-item approval of reversible work [A7, BZ1, PM1].
4. **Enforce what must hold; write prose for what needs judgement** [A4]. A rule broken twice moves to
   a script.
5. **No backlog is a promise.** Signals expire unless they recur [SU1, L1].
6. **Measure the mix; do not trust the feeling of progress** [M2, JC2]. The balance is a number the
   scripts compute, with rules that fire when it tips.
7. **Ceremony scales with size and risk.** A refinement gets a line, a growth bet gets a brief and a
   spec, a one-way door gets a decision record [B1].

### 2.2 The stages

Work moves through seven stages. Each stage takes a named input, produces a named artifact, has an
owner and an autonomy level (Feng et al.'s five roles [F1]), and ends at a gate.

| # | Stage | Takes | Produces | Who | Autonomy | Gate out |
|---|---|---|---|---|---|---|
| 0 | **Sense** | A walk, a bug, an agent finding, an idea | A **signal** (one line, typed, with evidence) | Anyone; agents file freely | Observer (L5) | Script: valid type, evidence link, verb |
| 1 | **Frame** | A signal sighted twice, or the owner's pick | A **brief** (problem, evidence, options, appetite, risk, questions) | Agent, timeboxed | Consultant (L3) | Script: brief complete; vision check passed |
| 2 | **Bet** | Briefs plus the balance report | A **bet record** (option, appetite, kind, kill criteria, answers) | **Owner only** | Operator (L1) | The owner's written choice |
| 3 | **Specify** | A bet | A **spec**: numbered criteria, no-gos, test map, baseline | Agent; owner glances for growth | Consultant/approver | Script: every criterion has a test id; no blocking questions open |
| 4 | **Build** | A frozen spec | Failing tests first, then code, in small structural and behavioural commits | Builder session(s) | Approver (L4) | Scripts: typecheck, lint, tests, size cap, appetite clock |
| 5 | **Verify** | The diff, the spec, the evidence | An **evidence bundle** and a review verdict per criterion | Separate reviewer session(s), read-only, plus scripts | Observer (L5) | Script: bundle present; reviewer is not the builder; no blocking findings |
| 6 | **Accept and ship** | Bundle | Released change; a **settled** or **follow-up** mark | Owner for growth and one-way doors; scripts for reversible refinement | L1 or L5 by risk | Owner's device check (growth), gates (refinement) |
| 7 | **Return** | The shipped change, the owner's next walks | A **returns note**; new signals; docs reconciled | Owner (one minute), agent (docs) | Collaborator (L2) | Script: docs drift check |

Notes per stage:

**0. Sense.** A signal is cheap and commits nothing. Fields: `type` (defect, friction, gap, idea, debt,
process), `evidence` (a commit, a screenshot, a walk note, a failing test), `verb` (Earn, Honour,
Return, or none), `first_seen`, `sightings`. Agents dedupe and increment `sightings` instead of filing
twins. The owner's richest source is a **walk note**, three prompts answered in under a minute after a
walk: *What did I reach for that wasn't there?* (gap, feeds growth), *What got in the way?* (friction,
feeds refinement), *What would I keep?* (protects what works from being "improved"). This is the
product's only usage signal, because the app sends nothing anywhere; it replaces analytics and must be
treated as data, not anecdote (Torres's weekly contact, with the owner as the customer [TT1]).

**1. Frame.** An investigation is a spike with an appetite (one session for a small question, three for
a large one). The **brief** is a cross of a pitch [SU1] and an RFC [RF1]:

1. *The problem as a walk*: a concrete scenario, in the walker's words, ending where it hurts.
2. *Evidence*: signals and sightings, walk notes, code facts, with links.
3. *Which verb it serves*, and the vision verdict (aligned, reshaped, not now, out, no surface).
4. *Options*, at least two plus **do nothing** ("what is the impact of not doing this?" [RF1]), each with
   trade-offs and precedent from adjacent apps.
5. *Recommended option and appetite* (size tier, below), with *rabbit holes* and *no-gos*.
6. *Kind* (growth, refinement, meta) and *risk class* (below), including door type [BZ1].
7. *Questions*, each in one of three bins (after Rust's three-way split [RF1]):
   - **Bet-blocking**: the owner must answer before a bet (any one-way door; anything touching the
     vision's "never" list).
   - **Default-if-silent**: the brief states the default the agent will take; silence at the betting
     table means the default stands (lazy consensus [AP1], legitimate only for reversible choices).
   - **Build-resolvable**: answered by a spike inside the build, logged in the bet's progress file.

A brief that cannot fill fields 1 and 2 is not ready; it goes back to signals. This is the defence
against agents inventing demand.

**2. Bet.** A short, regular sitting (weekly suits a solo owner: 20-30 minutes). The owner sees at most
five briefs, chosen by the frame stage to fit the balance report (2.4), and for each: recommended option,
appetite, kind, and the bet-blocking questions as multiple choice with a recommended answer. The owner
picks, sets appetite, answers or accepts defaults. The record is an ADR-shaped entry (context, decision,
consequences, supersedes [N1]), so the same argument is never had twice. Unchosen briefs are **not**
queued; they lapse and return only if their signals recur [SU1].

**3. Specify.** Numbered, testable criteria (EARS-style "when ..., the app ..." keeps them checkable
[K1]), the no-gos copied from the brief, a test id per criterion, the e2e journey for any screen change,
and a **baseline statement**: what the walker can do today, so "done" is judged against the baseline,
not the ideal [SU1]. The spec's hash is recorded at bet start; a change to it during build needs a
one-line "spec change" entry stating why (anchoring without paralysis [B1]). For refinement, the "spec"
is one line plus the regression test.

**4. Build.** One bet per branch or worktree, one task per session, a progress file the next session
reads first, and an e2e smoke check at session start [A2]. Tests are committed failing before the code
that passes them [G1]. Structure and behaviour changes go in separate commits [KB1]. The builder is told,
in so many words, *stop and report if a test looks wrong; never edit a test to pass* [I1]. Mid-build
discoveries split three ways: a must-have inside the appetite is done; a nice-to-have becomes a signal;
anything that would breach the appetite stops the build (scope hammering [SU1]).

**5. Verify.** In this order, cheapest first: scripts (typecheck, lint, tests, layer and boundary checks,
size cap, test-integrity check); then a **spec-conformance reviewer** in a fresh read-only session that
checks each criterion has code and a test and reports correctness gaps only ("skip style" [A4]); then,
by risk class, an **adversarial auditor** that tries to break it and a **UX reviewer** with screenshots.
Each reviewer returns findings with a severity, and only blocking severities stop acceptance;
non-blocking findings become signals, so the reviewer's urge to find *something* [A4] does not turn
into unbudgeted polish. The builder then answers each blocking finding, at most twice; a third round goes
to the owner [A4, O1]. The evidence bundle holds the commands run and their output, screenshots, the
reviewer's verdict per criterion, and what was *not* verified (on a device, for example).

**6. Accept and ship.** Who accepts depends on risk (2.3). Growth is accepted by the owner using it,
ideally on a walk, never from a summary alone. Reversible refinement that passes every gate ships without
the owner, but one in five such ships is surfaced in the weekly digest for a spot check, so that
auto-approval is sampled rather than assumed [A7, PM1].

**7. Return.** The walk notes after a ship close the loop. A growth feature gets a **returns note** after
three walks: used, ignored, or in the way. Ignored three times means reshape or remove, and removal is an
allowed outcome (the vision values restraint; a feature nobody reaches for is chrome). Docs are
reconciled by an agent against the code. An area that passes its criteria, has no open blocking defects,
and survives three walks with no "got in the way" note is marked **settled** (2.5).

### 2.3 Size and risk

**Size, by appetite tier.** The unit of agent work is the *task*: one session, one checkable done
condition. The unit of owner attention is the *bet*.

| Tier | Appetite | Shape | Ceremony |
|---|---|---|---|
| XS | One session | One area, a diff under ~200 changed lines, no new screen | A line in the signal; a regression test; scripts and a conformance review |
| S | Up to ~3 sessions, 1-2 days | One area or one screen | A short brief; criteria in the bet record |
| M | Up to ~10 sessions, about a week | A vertical slice across areas | Full brief, spec, all reviewers its risk needs |
| L | More than M | Not a bet | Must be split into M bets that each ship something a walker can use |

Why these limits: agent reliability falls fast with task length and messiness, with 80%-reliable
horizons about a fifth of 50% ones [M1]; bigger batches correlate with instability [D1]; Anthropic's
harness limits a session to one feature [A2]. The line counts are my proposal; tune them from the
project's own history of which diffs needed rework. Re-evaluate the tiers each quarter, since horizons
keep growing [M1, A7].

**Risk, by class.** Score each brief on four questions; the highest answer wins.

| Class | Trigger (any one) | Extra gates |
|---|---|---|
| R0 reversible, invisible | Internal refactor, tooling, tests, docs | Scripts plus conformance review; auto-ship |
| R1 visible | Changes a screen, copy, motion, or what a walker sees | Plus UX review with screenshots; owner glance at screenshots before ship |
| R2 hard to verify | Native code or behaviour that has never run where users run it; background tasks; permissions | Plus a device check by the owner before release; an entry in the unverified ledger until then |
| R3 one-way door | Truth data (moments, traces), storage schema or migrations, a new dependency, platform strategy, anything that could send data or touches the vision's "never" list | Owner decides before the spec; decision record; adversarial audit; migration tests on a copy of real data |

Size and risk are independent. An XS change to a migration is R3; an M polish pass over copy is R1.

### 2.4 The balance mechanism

The balance is steered by three meters, computed by a script from commit trailers and the signal
ledger, shown at every betting table, and enforced by rules that change what agents may start.

**Classification.** Every merged unit carries a `Kind:` trailer:
- **growth**: a walker can do something they could not do before, or a verb gains a surface;
- **refine**: defects, polish, conformance, consistency, performance, tech debt, docs about the product;
- **meta**: work on the agent system itself (skills, hooks, gates, process docs).

`meta` is separated on purpose. In an agent-run project the process is itself software, and work on it
feels like progress while the product stands still. Count units shipped and sessions spent, not lines.

**Meter 1: supply mix** (rolling window of the last 20 merged units or 4 weeks, whichever is larger).
Target band: growth 35-65%, refine 30-60%, meta 15% at most. I set a band, not a ratio, because the
15-20% debt reserve so often quoted has no evidence behind any exact number [CS1], and because agent-built
code needs more refinement than human norms suggest: duplication rises and refactoring falls unless it is
scheduled [GC1].

**Meter 2: demand pressure** (from walk notes and signals). The ratio of open *gap* sightings ("reached
for it, wasn't there") to open *friction* plus *defect* sightings. This is the product telling you what
it needs, independent of what the agents find interesting.

**Meter 3: health budget** (the error-budget analogue [SRE1]). Blocking-defect count (data or memory loss,
crash, a walk that fails to record): budget is zero. Plus ratchets that may only shrink: lint and layer
baselines, flaky tests, the count of unverified native items older than 30 days, the vision-debt list.

**Rules that fire when it tips.** These are scripts with an exit code, not reminders.

| Condition | Effect |
|---|---|
| **Health breach**: any blocking defect open, main's e2e red, or a ratchet grew | **Growth freeze**: the pipeline refuses to start or merge `Kind: growth` until it clears (Linear-style: blocking within 48 h [L1]). If a freeze outlasts one cycle, the owner gets a decision card: fix, accept and log, or cut scope |
| **Growth starvation**: growth below 35% of the window, or no growth shipped in 2 cycles | The next betting table must bet at least one growth item; autonomous refinement loops drop to blocking defects only (no polish, no conformance sweeps) until a growth unit ships |
| **Refinement starvation**: refine below 30%, or friction sightings exceed gap sightings by 2:1 | The next cycle is a **cool-down**: refinement only, chosen from friction signals with two or more sightings [SU1, FX1] |
| **Meta creep**: meta above 15% | New meta work needs a bet, and must cite a failure seen at least twice (*rule of two*); loosening any gate needs the owner |
| **Demand silence**: no walk notes in 2 weeks | The report says so plainly: the mix is being steered on agents' opinions alone. Growth bets wait for walk evidence; R0 refinement continues |

**Cadence.** A cycle is two weeks (a solo owner's version of Shape Up's six plus two): about eight working
days of bets, then two or three days of cool-down. The weekly betting table reads the meters; a monthly
review looks at the trend, the settled list, and a **Kano drift** question: which delights are now
expected, and are any of those rough? Those are refinement bets with first claim on the next cool-down
[W1].

Why three meters and not one ratio. A ratio alone is gamed by classification (a growth-flavoured polish
pass) and blind to need. The health budget makes refinement *mandatory* when quality slips, as error
budgets do [SRE1]. The demand meter makes growth *responsive* to what the owner actually reached for on a
walk. The supply band stops either from swallowing the other. Cutler's warning [JC1] is the reason supply
is counted in shipped units rather than hours: what matters is what got to the walker.

### 2.5 When an area is "done enough"

An area (a screen, a feature, a subsystem) is **settled** when all hold:
1. its spec's criteria pass, with e2e coverage for its screens;
2. no blocking defect is open against it;
3. the owner has used it on three real walks with no "got in the way" note about it;
4. judged against the baseline before it existed, not against an ideal [SU1].

A settled area accepts polish only with a **complainant**: a friction signal sighted twice, a blocking
defect, or a Kano drift item from the monthly review. Agents may not open a polish pass on a settled area
because a reviewer found something. This rule matters most here: a loop that refines without it will
always find something to refine [A4], and the product settles.

### 2.6 What only the owner decides

1. **The bet**: what to build next, its appetite, and the mix (2.4). Agents propose; they never bet.
2. **One-way doors** (R3): truth data, storage and migrations, dependencies, platform strategy, anything
   that could send data off the device [BZ1].
3. **The vision**: any change to it, any overrule of the gate, any new verb or "never" exception.
4. **Felt quality**: accepting a growth feature, and anything about motion, copy or restraint, on the
   device.
5. **Breaking the circuit**: extending a bet past its appetite, or killing a feature after its returns
   note.
6. **Loosening a gate**: any change that makes a check weaker, removes one, or raises a cap.
7. **Releases that need the phone** (R2): the owner runs it where it will run.

Everything else, including filing, framing, specifying refinement, building, reviewing, shipping
reversible refinement and expiring signals, is delegated. The owner's role across the pipeline is
operator at the bet, approver at one-way doors and growth acceptance, observer elsewhere, with a
sampled audit of what ships unattended [F1, A7].

**Decision cards.** Every question for the owner arrives in one shape: the decision in one line;
options as multiple choice with a recommended answer; what each costs and whether it is reversible; the
default if unanswered (two-way doors only); "what would change my mind". Batch cards to the betting
table; interrupt between tables only for a health breach or a one-way door that blocks a bet already in
progress. Fewer, heavier approvals resist rubber-stamping better than many light ones [PM1, A7].

### 2.7 Gates that must be scripts

Prose is for judgement; these hold every time, so they are code (Claude Code's own test: emphasis that
keeps failing belongs in a hook [A4]).

| Gate | Check | Fires at |
|---|---|---|
| Kind trailer | Each merged unit has `Kind: growth, refine or meta` and a bet or signal id | Commit hook and CI |
| Balance and freeze | Computes the three meters; exits non-zero for a growth merge during a health freeze, and for a polish start on a settled area without a complainant | CI; at session start in loops |
| Signal hygiene | Required fields; dedupe; expire after 60 days unless sighted again; archive, never delete | Daily or at each betting table |
| Brief completeness | Problem-as-walk, evidence links, at least two options plus do-nothing, kind, risk, size, questions binned | Before a brief reaches the table |
| Spec readiness | Every criterion has a test id; no bet-blocking question open; baseline stated | Before build |
| Spec anchoring | Spec hash at bet start; a diff without a "spec change" entry fails | CI on the bet branch |
| Test-first | Failing tests committed before the code that passes them | CI history check |
| Test integrity | Flag any removed test, removed or loosened assertion, or test edit in the same commit as the code under test; requires a reviewer note | CI |
| Size cap | Diff over the tier's limit fails unless the bet record allows it | CI |
| Appetite clock | Sessions and days consumed versus the bet's appetite; at 100% the loop stops and a card goes to the owner (circuit breaker [SU1]) | Session start |
| Loop caps | Max turns or budget per session; three consecutive failed attempts on one task stops it and escalates [O1, A4] | Harness flags, hooks |
| Reviewer independence | Reviewer session differs from builder's, with read-only tools | Before accept |
| Evidence bundle | Commands with output, screenshots for R1, per-criterion verdicts, "not verified" list | Before accept |
| Risk routing | Path-based rules raise risk (storage, migrations, native, permissions, dependencies, network) and add the class's gates | On diff |
| Spot-check sampler | Picks one in five auto-shipped refinements for the weekly digest | Weekly |

Keep it small: every gate needs an owner-visible reason, and a gate that never fires for a quarter
should be questioned, the same way prose that keeps failing should become a gate [A4].

### 2.8 Top failure modes and their guards

| # | Failure | What it looks like | Guard |
|---|---|---|---|
| 1 | **Refinement spiral** (the product settles) | Every cycle is conformance, audits, docs, polish; reviewers always find something | Settled areas need a complainant (2.5); growth-starvation rule; non-blocking findings become signals, not work |
| 2 | **Growth on sand** | Features land while defects and debt climb | Health budget and growth freeze [SRE1, L1]; cool-down cycles |
| 3 | **Meta creep** | Most sessions improve skills, hooks and docs about the process | `meta` kind, 15% cap, rule of two, gate-loosening by owner only |
| 4 | **Self-approval** | The builder declares done; its own review agrees | Separate read-only reviewer, skeptical prompt calibrated with examples, scripts first [A3, P1] |
| 5 | **Test gaming** | Tests edited, deleted or special-cased to pass | Tests-first in history, test-integrity check, explicit stop-if-flawed instruction [I1, G1] |
| 6 | **Gold-plating** | A bet grows extras; diffs swell | Appetite, scope hammering, size cap, extras filed as signals [SU1, D1] |
| 7 | **Ceremony overload** | A typo fix gets a spec with a dozen criteria; the owner drowns in review | Size and risk tiers set the ceremony (2.3) [B1] |
| 8 | **Proxy rubber-stamp** | The owner approves every card; per-item approvals pile up | Approvals only at bets, one-way doors and growth acceptance; decision cards with defaults; sampled spot checks [A7, PM1] |
| 9 | **Context loss and drift** | A session rebuilds what exists or contradicts an earlier decision | Progress file per bet, decision records, spec hash, start-of-session e2e smoke [A2, A5, N1] |
| 10 | **Runaway loops** | A loop retries, spawns sub-agents, burns budget | Turn and budget caps, failure thresholds, appetite clock, explicit effort rules [A1, A6, O1] |
| 11 | **Backlog graveyard** | Hundreds of stale items that agents keep re-reading | Expiry, sightings, no queue of unchosen briefs [SU1, L1] |
| 12 | **Feature factory** | Shipped growth nobody reaches for | Returns note after three walks; reshape or remove [JC2, TT1] |
| 13 | **Invented demand** | Agents propose features from their own taste | Briefs need walk evidence; demand-silence rule; vision gate |
| 14 | **Unverified accumulation** | Code that never ran on a phone piles up as "done" | R2 class, unverified ledger as a health ratchet, owner device check before release |

### 2.9 Five claims I would defend hardest

1. **The balance must be a computed number with consequences, not a value statement.** A rolling
   supply band, a demand ratio from the owner's walks, and a health budget, each with a scripted rule
   that changes what agents may start. Error budgets work because the freeze is automatic [SRE1]; the
   circuit breaker works because it is unconditional [SU1]. Prose saying "balance growth and polish"
   will lose to whatever the loop finds easiest.
2. **A refinement loop without a complainant will settle the product.** Reviewers asked to find problems
   always do [A4], so polish has to be pulled by a signal (a walk note, a repeated sighting, a defect)
   and closed off once an area is settled.
3. **The owner's attention should go to bets, one-way doors and felt quality, and almost nowhere else.**
   Per-action approval adds friction without safety [A7], and human checking decays exactly as the
   automation gets more reliable [PM1]. Fewer, heavier, well-framed decisions keep the human a real
   check.
4. **Separate deciding, doing and judging into different contexts, and put scripts in front of the
   judge.** Self-grading skews positive [A3, P1]; tests can be gamed [I1]; deterministic gates cannot
   be argued with [A4].
5. **In a local-only app, the owner's walk notes are the product's only usage data, and growth should be
   steered by them.** Without them the mix is steered by what agents find interesting, which drifts
   toward the codebase and away from the walker. One minute after a walk, three questions, feeding both
   ledgers.

---

## Sources

**Read** means I fetched and read the page in this session. **Unverified** means I saw only search-result
summaries, usually because the host is blocked from this sandbox. Hosts that failed: martinfowler.com,
basecamp.com, arxiv.org, cdn.openai.com, docs.github.com, simonwillison.net; a probe also found
thoughtworks.com, producttalk.org, svpg.com, sre.google, metr.org, lesswrong.com, github.blog,
openai.com and kiro.dev unreachable.

| Key | Source | Status |
|---|---|---|
| A1 | Anthropic, "Building effective agents" (2024), https://www.anthropic.com/engineering/building-effective-agents | read |
| A2 | Anthropic, "Effective harnesses for long-running agents", https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents | read |
| A3 | Anthropic, harness design for long-running application development (planner, generator, evaluator), https://www.anthropic.com/engineering/harness-design-long-running-apps | read |
| A4 | Claude Code docs, "Best practices for Claude Code", https://code.claude.com/docs/en/best-practices (redirect from anthropic.com/engineering/claude-code-best-practices) | read |
| A5 | Anthropic, "Effective context engineering for AI agents", https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents | read |
| A6 | Anthropic, "How we built our multi-agent research system", https://www.anthropic.com/engineering/multi-agent-research-system | read |
| A7 | Anthropic, "Measuring AI agent autonomy in practice" (Feb 2026), https://www.anthropic.com/research/measuring-agent-autonomy | read |
| G1 | GitHub spec-kit, "spec-driven.md", https://github.com/github/spec-kit/blob/main/spec-driven.md | read |
| RF1 | Rust RFC template, https://raw.githubusercontent.com/rust-lang/rfcs/master/0000-template.md | read |
| W1 | Wikipedia, "Kano model", https://en.wikipedia.org/wiki/Kano_model | read |
| B1 | B. Böckeler, "Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl", martinfowler.com (Oct 2025), https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html | unverified (host blocked; secondary summaries) |
| K1 | Kiro docs, specs concepts, https://kiro.dev/docs/specs/concepts | unverified |
| R1 | H. Reed, "My LLM codegen workflow atm" (Feb 2025), https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/ | unverified |
| T1 | Thoughtworks Technology Radar, "Complacency with AI-generated code", https://www.thoughtworks.com/radar/techniques/complacency-with-ai-generated-code; Thoughtworks blog on spec-driven development, https://www.thoughtworks.com/insights/blog/machine-learning-and-ai/vibe-coding-context-engineering-2025-software-development | unverified |
| M1 | METR, "Measuring AI ability to complete long tasks" (2025), https://arxiv.org/abs/2503.14499 | unverified |
| M2 | METR, "Measuring the impact of early-2025 AI on experienced open-source developer productivity", https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/ | unverified |
| D1 | Google Cloud, "Announcing the 2024 DORA report", https://cloud.google.com/blog/products/devops-sre/announcing-the-2024-dora-report; RedMonk commentary | unverified |
| I1 | Zhong et al., "ImpossibleBench: Measuring LLMs' propensity of exploiting test cases", https://arxiv.org/abs/2510.20270 | unverified |
| P1 | Panickssery, Bowman, Feng, "LLM evaluators recognize and favor their own generations" (NeurIPS 2024), https://arxiv.org/abs/2404.13076 | unverified |
| GC1 | GitClear, "AI Copilot code quality" 2025 research, via LeadDev and DevClass coverage | unverified |
| H1 | G. Huntley, "Ralph Wiggum" loop, via secondary write-ups (e.g. https://paddo.dev/blog/ralph-wiggum-playbook/) | unverified |
| O1 | OpenAI, "A practical guide to building agents", https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf | unverified (host blocked) |
| F1 | Feng, McDonald, Zhang, "Levels of autonomy for AI agents" (2025), https://arxiv.org/abs/2506.12469 | unverified |
| PM1 | Parasuraman and Manzey, "Complacency and bias in human use of automation", Human Factors 52(3), 2010 | unverified |
| SU1 | R. Singer, "Shape Up" (Basecamp), https://basecamp.com/shapeup | unverified (host blocked; summaries only) |
| C1 | M. Cagan, "The four big risks", SVPG; dual-track agile | unverified |
| TT1 | T. Torres, "Continuous Discovery Habits"; opportunity solution trees, producttalk.org | unverified |
| CS1 | Capacity-split rules of thumb (15-20% debt, 70/20/10), e.g. https://newsletter.manager.dev/p/how-to-implement-20-for-tech-debt | unverified |
| JC1 | J. Cutler, "TBM 334: The capacity allocation illusion", https://cutlefish.substack.com/p/tbm-334-the-capacity-allocation-illusion | unverified |
| JC2 | J. Cutler, "12 signs you're working in a feature factory" | unverified |
| SRE1 | Google SRE Workbook, error budget policy, and secondary adaptations | unverified |
| L1 | Linear, "Zero bugs policy", https://linear.app/blog/zero-bugs-policy; Linear changelog on auto-close (2020) | unverified |
| FX1 | Fixit weeks (Color engineering posts citing Kim Scott's "Radical Candor") | unverified |
| RE1 | D. Reinertsen, "The Principles of Product Development Flow" (cost of delay) | unverified |
| KB1 | K. Beck, "Tidy First?" (2023), and his newsletter on structure and behaviour changes | unverified |
| AZ1 | Bryar and Carr, "Working Backwards" (Amazon PR/FAQ) | unverified |
| N1 | M. Nygard, "Documenting architecture decisions" (2011) | unverified |
| BZ1 | J. Bezos, 2015 Amazon shareholder letter (Type 1 and Type 2 decisions) | unverified |
| AP1 | Apache Software Foundation, lazy consensus, https://community.apache.org/committers/decisionMaking.html | unverified |
