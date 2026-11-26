<!-- Repo first: from the owner's proposal G8 (docs/STATUS.md, "Next evolutions"; filed by /investigate 2026-11-20),
     answered yes on Nov 22 ("Yes, queue it", over the recommended "Not yet, after G7"). The authority to edit /tend's own
     scripts and skills is the entry the owner said yes to: its Cost line names them ("Cost: M; about eight files (a new
     skill, a new script and its test, `scripts/tend.js`, three skill files, the map)"); beside it, on 2026-11-25 the owner
     set the order G14, G12, G13, G7, G8, G5 and said G7's and G8's slice commits may edit /tend's own scripts and skills.
     G7 (the recommended precondition) is built (decision 0269). Decision 0238; brief docs/research/walk-notes.md. An
     engineering slice of the tending loop, not a tab of the concept doc. -->

# Walk notes: the owner's own walks steer the loop (WN)

Nov 26, 2026 · @Miguel Guerrero

The app sends nothing anywhere (decision 0005), so the owner's own walks are the only evidence of use the loop can have.
Today they reach it only when the owner opens a session with a screenshot; the expectation lens (0236) drafts "what a
person would reasonably expect" from a model; `next` is set by code churn alone (`docs/research/walk-notes.md`). This
slice gives the owner a one-minute note after a walk, `/walked`, kept beside the run log with places stripped, and makes
`/tend` read it: a "reached for" becomes a drafted expectation line, a "got in the way" puts its area first in `next`,
a "keep" protects what it names, and the report says once when no note has come in for 14 days.

**The privacy line is the heart of it.** The repository is public. Decision 0005 in spirit and decision 0238 say no
committed walk note holds a street, a town from the gazetteer, coordinates or a time of day: the owner's whereabouts are
not published. The skill's rewrite is the first guard, `scripts/walks.js add` the second, the owner's look at the stored
words the third, and CI the last (WN4c).

## Vision

```
Idea: after a walk the owner says in a line what they reached for, what got in the way and what to keep; the loop reads it (G8; the owner's /investigate, 2026-11-20; decision 0238)
Verb: none (the loop's own process: nothing a walker sees or does in the app changes; none of it is shown in the app, decision 0020)
Touches: decision 0005 (local-only, in spirit: the owner's whereabouts in a public repository), 0236 (expectation lines), 0229 and 0269 (`next`), 0157 (only the owner ratifies)
Verdict: no surface
Shape: as asked (decision 0238's four calls)
Criteria: none beyond the entry's
Open: none (G8 answered yes, Nov 22; G7 built, decision 0269)
```

## Criteria

G8's nine, in its words, numbered with the slice's prefix. "Done when" (after the owner's next walk, `/walked` with one
sentence stores a note naming an area and a kind, the committed line holds no street, town or time of day, and the next
`/tend` run's report cites it) is read after the owner's walk, not by this slice's tests: this build never invokes
`/walked` and writes no real note.

1. **WN1 · `/walked`, the owner's.** `/walked <anything>` is an owner-only skill (`disable-model-invocation`): it takes a
   sentence, dictation or a screenshot and sorts what it says into reached for, got in the way and keep, each with an
   area from `scripts/features.js` (or `app` when none fits).
2. **WN2 · Asked once.** It asks once, in one round, only about what the line did not say, "nothing" always an option; a
   note with only one kind is a whole note.
3. **WN3 · Seen before it is kept.** Before committing, it shows the owner the words it will store; a screenshot is never
   committed, only its observations in words.
4. **WN4 · Kept with places stripped.** `scripts/walks.js add` appends to `.claude/skills/tend/walks.jsonl` (day, area,
   kind, words) and refuses a line holding a street, a town from the gazetteer, coordinates or a time of day, with the
   words that tripped it; `list` reads the window.
5. **WN5 · A reach is a drafted line.** A "reached for" note becomes a drafted expectation line for its area marked "seen
   on a walk <day>", put to the owner ahead of model-drafted lines and never ratified by the proxy.
6. **WN6 · In the way is swept first.** A "got in the way" note puts its area first in `next` until a sweep of that area
   has run since the note.
7. **WN7 · A keep protects.** A "keep" note protects what it names: a refinement that would change it is filed
   `[owner]`, not shipped.
8. **WN8 · Silence, said once.** `/tend`'s report and the orchestrator's insights say once when no note has come in for
   14 days; nothing else reminds.
9. **WN9 · Tested, and said the same.** Tests for `walks.js` (the place refusals, append-only), `next`'s order and the
   lens's tagging; the skills map and `records audit 14`'s list say the same.

States the criteria imply (slice step 2):

- **WN4b · What else a line is refused for.** An area that is neither a feature of `scripts/features.js` nor `app`; a
  kind other than the three; a day that is not a calendar day (`YYYY-MM-DD`) or is after tomorrow; words empty, on more
  than one line, or past 280 characters; a link (it can carry a place). A file of lines is all or nothing: one refused,
  none written.
- **WN4c · Append-only, held by CI.** `add` only appends. `node scripts/tend.js commits` (CI's `--loop-only` included)
  refuses an agent commit that changes or removes a line `walks.jsonl` held, deletes or renames it, or adds a line the
  check refuses; a loop commit never touches it (FORBIDDEN already holds every `.claude/skills/` file but the run log and
  the ledger).
- **WN3b · No time of day in the commit either.** The note's commit carries the day as its dates (`<day>T00:00:00Z`) and
  only `walks.jsonl`; its message names no words.
- **WN6b · Which area, and until when.** Only an area the loop sweeps (a feature of `scripts/features.js` but `arch`) is
  put first, never `app`; among several, the oldest note first, then by name. A sweep counts as since the note when its
  run-log date is after the note's day: a sweep the same day does not.
- **WN8b · No note yet.** With no note at all, the line says there is none yet, once.

## Decisions

- **The G8 entry** (the owner's yes, Nov 22, "Yes, queue it", over the recommended "Not yet, after G7"; the order,
  2026-11-25): its nine criteria, above as WN1-WN9, and decision 0238's four calls (kept in the repository, places
  stripped; a free line, then prompts; it steers the lens, the sweeps and silence; a report line, no reminder).
- **The place check reads names as written** (the build's, for the steward; the brief's "how strict the place check
  is"): a town of the gazetteer trips when it is written capitalised, as a name is written; a lowercase word never trips
  the town check on its own, since GeoNames' towns include "of", "to", "as", "page", "time", "line" and "green" (48 of the
  first 50 town names met in `docs/VISION.md`, `docs/PRODUCT.md` and the brief were such words). A street trips by its
  suffix or prefix beside a capitalised name (invented: "Quillmarsh Street", "Rue de Quillmarsh", "Quillmarshstrasse"). Coordinates trip by
  a decimal of three places, a degree sign, a plus code or a `lat`/`lng` word; a time of day by a clock time, am or pm,
  o'clock, or a word for a part of the day ("morning", "dusk", "noon").

## How adjacent apps do it

The loop's own process; the precedent is how people collect a note just after an event. From
`docs/research/adjacent-apps.md`, "Ask how it went, just after (Honour, Return)", and `docs/research/walk-notes.md`.

- **Strava**: after an activity, the save or edit screen asks "How did that activity feel?", optional, a 1-10 scale.
  Source: https://support.strava.com/hc/en-us/articles/360032535512-Perceived-Exertion (search summary, page not read).
  **Unverified**. A counter-example in part: the answer is a number.
- **Apple Journal**: suggestions built on the device from workouts and places, and open reflection prompts beside an
  empty entry. Source: https://www.apple.com/newsroom/2023/12/apple-launches-journal-app-a-new-app-for-reflecting-on-everyday-moments/
  (search summary, page not read). **Unverified**.
- **Diary studies** (UX research): an entry made just after the event, prompts anchored to the situation, reflection
  saved for a wrap-up. Source: https://www.nngroup.com/articles/better-diary-studies/ (search summary). **Unverified**.

Where this departs: words, never a number (Strava); the prompts ask only what the line left out, once (the diary
study's anchored prompt, not Journal's open one); and, unlike all three, what is kept is stripped of where and when,
since it is published.

## Tests

Unit (`src/lib/__tests__/arch/walks.test.ts` for WN1-WN5, WN7, WN9 and the implied states; `src/lib/__tests__/arch/tend.test.ts`
for WN6 and WN8, through `nextPick` and `balance`), on invented notes that name no real place (made-up words such as
"Quillmarsh"; a town is taken from a pack the test builds, never the shipped one, except one test that reads the shipped
pack for the town check's wiring with a town it does not name in the repository: it picks one from the pack at run
time). The wiring on a scratch git repository (`add`, `commits` refusing a rewrite, `next` on a made-up run log), never
on the checkout CI clones 50 commits deep (AS6). No journey: no screen changes.
