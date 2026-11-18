# The React Compiler (RC1-RC3)

Last exported: not from the concept doc. The source is the performance investigation of Nov 16 (the compiler was found
off while the docs assumed it on) and the owner's calls: "Separate slice, measured" (Nov 16), "with reasonable defaults
forward" (Nov 18), "/deploy then /slice" (Nov 18). Decision 0206.

## Vision

Idea: The React Compiler is turned on for the whole app, so components skip renders whose inputs did not change; nothing a person sees or does changes.
Verb: none (engineering, no visible change)
Touches: none; the owner's call of Nov 16 ("its own slice, measured before and after, with a decision record")
Verdict: no surface
Shape: as asked
Precedent: Expo's own templates turn it on from SDK 54 (from memory, unverified); the React team's case studies of the compiler in production at Meta (from memory, unverified)
Criteria: none
Open: none

## What it is

`app.json` had no `experiments.reactCompiler`, and babel-preset-expo 58 turns the compiler on only from that flag: only its
lint rules ran, and nothing memoized what the code didn't. On, the compiler caches each component's JSX and derived
values by their inputs, so a parent's render no longer renders children whose props did not change. A function it
cannot compile (a React rule disabled on a line, syntax it does not handle yet) is left exactly as it is today.

Measured before (web build, 3 min walked, Explore at 4x CPU; scripts/perf-walk.js, scripts/perf-explore.js): the walk
screen 0.97 renders/s, the map 0.77; an Explore switch p95 frame 100 ms, 2.1 s of long tasks, 6 renders; a drag p95
66.7 ms, 3.3 s of long tasks. Today 221 of the components and screens compile and 44 functions are skipped.

## Decisions

- **Its own slice, measured before and after** (the owner, Nov 16); built on the go-ahead of Nov 18 without a stop at the
  plan. Decision 0206.
- **The functions the compiler skips today are listed and the list only shrinks**: new code compiles.

## How adjacent apps do it

- **Expo's app templates**: new projects from SDK 54 set `experiments.reactCompiler: true`. Source: from memory,
  unverified. **Unverified**.
- **Meta's apps**: the React team describes the compiler in production at Meta, where it replaced hand-written memo.
  Source: from memory, unverified. **Unverified**.

## Criteria

1. **RC1** The app is built with the React Compiler on every platform: the web bundle carries its memo cache.
2. **RC2** Every component and screen compiles but the functions listed today; one more skipped fails, and the list
   only shrinks.
3. **RC3** Walking renders the walk screen no more than before: in the walk journey's busy window, at most 2.0 renders
   a second (1.78 to 1.91 before).

## Record

Built 2026-11-18 on `claude/bold-hawking-dx3pc8`, test-first by history (3 of 3).

- **RC1** `experiments.reactCompiler` on in `app.json`; the web bundle carries 376 memo-cache sentinels (1 before);
  `launch` checks them.
- **RC2** `arch/compiler.baseline.json` lists the 44 functions the compiler skips today; a new skip fails `npm test`.
  The 44 are filed in `docs/DEFERRED.md` for their areas' sweeps.
- **RC3** the walk screen stays under 2 renders/s (`walk`).

Measured on the web build, one run each, nothing else on the cores: Explore switch p95 frame 100 → 83 ms, long
tasks 2.09 → 1.74 s, script 1.16 → 1.01 s; Explore drag about the same; walk screen and map 0.97 / 0.77 renders/s,
unchanged (they count the screen's own renders); heap 25.3 → 25.9 MB; bundle 5.14 → 5.34 MB.

Journeys, once each on the compiled `/chronicles` build, all green: launch walk qol replay days memories gallery
journal tabs chronicle capturehome dense carousel freelook layers notepage reactions stacks threads edit. No audit
(not asked). Native has never run on a device: the compiled native build is a device item.
