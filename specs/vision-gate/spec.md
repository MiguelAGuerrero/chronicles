<!-- Vision gate. Written in the repo first (2026-11-05) from the owner's ask in session: "a gate that an agent, as part
     of a skill, would fight against" when a feature goes against the product, and "Build this now". An engineering
     and process slice, not a concept-doc tab. Decision 0094. -->

# Vision gate: keep every feature in the product's spirit (VG)

Nov 5, 2026 · @Miguel Guerrero

The owner wants future work to stay in the product's philosophy without losing its identity: an agent should push
back on ratings or reviews, and should agree to suggested routes only in the shape that fits (the interesting way,
not three ways to the same point). This slice writes the identity down as a page agents argue from, puts a gate in
the procedures before any spec, adds a reviewer that attacks a spec against it, and blocks what a script can catch.

## Vision

```
Idea: a gate that holds future features to the product's identity, and pushes back when one betrays it
Verb: none (process: it changes nothing a walker sees)
Touches: none
Verdict: no surface
Shape: as asked
Criteria: none
Open: the six open questions in docs/VISION.md
```

## Decisions

- 2026-11-05, the owner: build the gate now ("Build this now"), on the recommendation that the gate advises and the
  owner decides, while the mechanical check blocks. Decision 0094.
- 2026-11-05, the owner: Chronicle first; moments as its spine; the map secondary; recall and search as a second
  mind later. Recorded in `docs/VISION.md`, "The Chronicle".

## Criteria

1. **VG1** `docs/VISION.md` holds the identity on one page: who it is for, what it is, the three verbs, Never (each
   with its reason and the nearest thing that fits), Always, Shapes with verdicts, the Chronicle, the owner's open
   questions, and Precedents. Lines not yet the owner's calls are marked **[proposed]**. `npm run check:docs` holds
   it to 160 lines and 12 KB and checks the paths it names.
2. **VG2** The `/vision` skill gates an idea: it reads the page and the precedents, names the verb, quotes the rules
   touched, gives one verdict of aligned, aligned if reshaped, not now, out or no surface, the shape that fits, and
   the criteria the spec must carry; it argues once and records an owner's overrule as a decision. `/vision review`
   looks for drift since the page's "Last reviewed" commit.
3. **VG3** The `steward` subagent reviews a spec, a plan or built screens against the page, report-only (no edit
   tools), with findings graded breach, drift or tone.
4. **VG4** `/slice` runs the gate before the spec and the steward before the owner reviews the plan; `/fix` treats a
   visible change the gate rules out as a hard stop; `/audit` runs the steward beside the auditor, and the auditor's
   UI/UX review reads the page; `/docs-gc` runs the check and says when a review is due.
5. **VG5** `npm run check:vision` flags score or review vocabulary in user-facing copy (string literals and JSX
   text), and not in keys, testIDs, import paths, SQL or comments.
6. **VG6** It flags an "N of M" tally and a percentage in copy, where the interpolations may be numbers; "Lots of
   history and art" and a style width such as `${f * 100}%` pass.
7. **VG7** It flags a URL whose host is not on its allowlist, each allowed host with its reason; URLs in comments
   are not read.
8. **VG8** It flags a dependency whose job is to send data off the device (analytics, crash reports, a backend).
9. **VG9** A spec written after the gate fails without a "## Vision" section holding a `Verdict:` line; the specs
   written before it are listed, and the list only shrinks.
10. **VG10** Exceptions carry reasons: `// vision-ok: <why>` on the line or the line above excuses it, and an empty
    reason does not; `scripts/vision.allow.json` entries are "allowed" or "debt" with a why, and an entry that no
    longer matches fails.
11. **VG11** The repo passes the check, with no debt (the place sheet's found tally, the one debt at first, was removed by decision 0099); CI runs it before the
    export, and the Stop hook runs it when source, a spec, `package.json` or the check changed.
12. **VG12** `AGENTS.md` points to the page, the skill and the check.

## Tests

`src/lib/__tests__/arch/vision.test.ts`, one test per criterion, named by its id.

## Record

Shipped 2026-11-05: VG1-VG12 by unit tests, typecheck, lint and `npm test`. No e2e: no screen changed. Not audited
(decision 0074).
