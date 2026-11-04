# specs/

A greppable Markdown mirror of the owner's product spec, the Claude Docs document
"Explorer App Concept" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). Each tab of
the doc is one `specs/<slug>/spec.md`, copied verbatim under a one-line header comment.

- **The doc wins.** The owner writes in the doc, not here. When a file here and the
  doc differ, the doc is right and the file needs a re-export. Don't edit a
  `spec.md` by hand to change a criterion; change the doc and re-export.
- **Re-export at the start and at the end of a slice**, so the criteria you build
  against and the criteria you ship against are the doc's.
- **Status lives in `docs/STATUS.md`.** The status words in the tab names below
  ("queued", "in progress", "spec draft") are the doc's own and often stale.

## How to re-export a tab

1. Load the export tool (`ToolSearch` with `select:mcp__Claude_Docs__export`) and call it with
   `container = {"kind":"project","id":"6P9aUdZJAdReBi6yFVtwa7"}`, `file = "<tab id>"`,
   `format = "markdown"`, one tab per call.
2. Decode the returned base64 (`base64 -d`, never retyped) and write it to
   `specs/<slug>/spec.md` under the header comment, with the date updated.

## Tabs

| Spec | Tab name | Status word in the name | Criterion ids |
| --- | --- | --- | --- |
| [concept](concept/spec.md) | Explorer App Concept | | none (plain numbered lists) |
| [v0.5-places](v0.5-places/spec.md) | v0.5: memory and places | | H (home map), N (navigate); area criteria are plain 1–27 |
| [v1-discovery](v1-discovery/spec.md) | v1: discovery | | D, S, A, R, E, NT |
| [v1.5-landing](v1.5-landing/spec.md) | v1.5: landing | | L |
| [polish-motion](polish-motion/spec.md) | Polish: motion | | M |
| [memories-on-revisit](memories-on-revisit/spec.md) | Memories on revisit (queued) | queued | MR, TH (draft R1–R7 superseded) |
| [rides](rides/spec.md) | Rides (in progress) | in progress | R |
| [moments-and-days](moments-and-days/spec.md) | Moments and days (queued) | queued | M |
| [navigation-and-tabs](navigation-and-tabs/spec.md) | Navigation & tabs (spec draft) | spec draft | NV |
| [clearing-walks-and-moments](clearing-walks-and-moments/spec.md) | Clearing walks and moments (in progress) | in progress | D |
| [places-worth-the-stop](places-worth-the-stop/spec.md) | Places worth the stop (queued) | queued | none yet (owner's calls only) |
| [motion](motion/spec.md) | Motion (spec draft) | spec draft | MO |
| [quality-of-life](quality-of-life/spec.md) | Quality of life (spec draft) | spec draft | QL |
| [filling-gaps](filling-gaps/spec.md) | Filling gaps (spec draft) | spec draft | G |
| [activity-density](activity-density/spec.md) | (repo first; not yet a tab) | | AD |
| [bridges-and-open-in-maps](bridges-and-open-in-maps/spec.md) | Bridges and Open in Maps (shipped on web) | shipped on web | NB, NH |

Tab ids, for re-exports: concept `29164ed0-1f2e`, v0.5-places `be8253bf-d74a`,
v1-discovery `d1f8754f-780f`, v1.5-landing `fd7ff3f4-8ef3`, polish-motion `636e7c52-c4f3`,
memories-on-revisit `39b459a8-8b5a`, rides `00e06212-2c7a`, moments-and-days `54d122c0-ebf9`,
navigation-and-tabs `d5ecf24b-ba77`, clearing-walks-and-moments `16d906bc-242e`,
places-worth-the-stop `a8ecdec6-0ced`, motion `f8508265-2cf8`, quality-of-life `0bd45162-c65a`,
filling-gaps `48043770-c82b`, bridges-and-open-in-maps `dbc372d8-4f0f`.

## How criteria are written

- **Most tabs give each criterion a literal id** in its text: `1. **QL1** …`,
  `- **N1.** …`, `1. **M1 · …**`, or `- D1. …`. Tests and commits cite the same id
  ("QL5", "tabs audit U13", "rides audit 3"), so `grep -rn '\bQL5\b'` finds both.
- **Plain numbered lists** with no id: the concept tab, and v0.5's area criteria 1–27
  (cited as "criterion 25"). Places worth the stop has no numbered criteria yet.
- **Prefixes repeat across tabs:** M (polish-motion, moments-and-days), R (rides,
  v1-discovery) and D (clearing, v1-discovery). Say which tab you mean when citing one.
- **U1–U15** (the Navigation & tabs audit's findings) appear in tests and `AGENTS.md`
  but in no tab; they are audit finding ids, not criteria.

`node scripts/check-specs.js` lists, per spec, the ids no unit test
(`src/lib/__tests__/*.test.ts`) or e2e step (`scripts/e2e-web.js`) mentions. It is a
report and always exits 0. Retired criteria (v1-discovery's scan and ambient ids, for
example) show up there by design.
