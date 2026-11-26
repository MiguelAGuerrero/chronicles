# Walk notes: the plan (WN1-WN9)

Built under `/tend inbox G8 yes` (`/slice walk-notes --from=G8`): read by the steward, not held for the owner. No screen,
no stored field of the app, no dependency, no host, no native code. Nothing here is shown in the app (decision 0020).
This build makes `/walked` and never invokes it, and writes no real walk note: every note in a test is invented and
names no real place; a test that needs a real town, region or country picks one from the shipped pack at run time and
commits none.

After the plan review (the steward, Nov 26) and the owner's answers to its six Silent questions (decision 0270); the
spec's "Decisions" holds both.

**The base it lands on** (slice step 1.5): `node scripts/tend.js base --spec walk-notes` names `arch`, which no sweep
reads: no area of the app is touched.

**Today's scripts** (read against the entry, filed Nov 20, before G6 and G7 landed): `next` is now `nextPick` (LB2's
two turns, decision 0269) over the states `areaState` computes (G6, decision 0250); the run log's answers carry `by`,
`pick` and `words` (LB3); a G slice's own review is outside the budget (0269); expectation lines are proposed by
`npm run expectations -- draft` and answered only by the owner's answer commit (`ratify --by owner`, decision 0236);
the orchestrator's insights are `orchestration-insights.md` (its section 9); `records audit 14` is a test in
`src/lib/__tests__/arch/records.test.ts`.

## Files

| File | What changes |
|---|---|
| `.claude/skills/walked/SKILL.md` (new) | WN1-WN3, WN2b, WN3b: the owner's skill, `disable-model-invocation: true`; `/walked publish` |
| `scripts/walks.js` (new, plain Node like `records.js`) | WN4, WN4b, WN4d: `add --file`, `list`, `lens <area>`, `keeps <area>`, `check --file`, `areas`; the pure checks (`placeProblems`, `noteProblems`, `commitProblems`), `openInTheWay`, `lensNotes`, `keepsOf`, `walkReading` |
| `scripts/tend.js` | WN6 a walk turn first in `nextPick` (resting areas too), the walk turn left out of LB2's alternation, fed by `documentsFrom`'s `walks`; WN8 `walks` in `balanceJson`, the gap said once (`walkSilence` in the ledger); WN4c the gate in `commits`; `PROCESS` leaves `walks.jsonl` out (no lease for a note); `FORBIDDEN` lines for `walks.jsonl` and `arch/walks.test.ts` |
| `scripts/features.js` | `walk-notes` in `arch`'s specs; `IN_PROGRESS` while built |
| `.claude/skills/tend/walks.md` (new) | how `/tend` reads the notes: lens 0 (WN5, WN5b), `next` (WN6), the triage (WN7, WN7b), carrying a note (WN3b), the report (WN8) |
| `.claude/skills/tend/SKILL.md` | two lines point to `walks.md` (lens 0; the report); at 498 of 500 lines, no new paragraph |
| `.claude/skills/tend/expectations.md` | step 2: a walk's reach, where it is drafted and when it waits |
| `.claude/skills/tend-orchestrator/SKILL.md` | section 2: a finding against a keep is the owner's alone; section 9: the insights carry the walk's silence, once |
| `.claude/skills/README.md` | `/walked`'s row; `walks.jsonl` in "State lives in files"; a keep in the proxy's list of what is the owner's |
| `.claude/skills/ship.md` | `/walked`'s grant beside the others (one note, day-dated, published only on the owner's word or carried by a `/tend` push) |
| `docs/decisions/0270-…` | the owner's answers to the plan review |
| `src/lib/__tests__/arch/walks.test.ts` (new) | WN1-WN5, WN7, WN9, the implied states and audits 1-11, 13 |
| `src/lib/__tests__/arch/tend.test.ts` | WN6 (`nextPick`, `next` on a scratch repository), WN8 (`balance`), audit 12 |

Three source files under `scripts/`, no `src/` file.

## What each criterion builds

**WN4, the note and the place check** (`scripts/walks.js`). A line of `.claude/skills/tend/walks.jsonl` is
`{"day":"YYYY-MM-DD","area":"<feature or app>","kind":"reached for"|"got in the way"|"keep","words":"…"}`, keys in that
order and no other. `add --file <lines>` reads one JSON object per line, checks every one, and appends them all or none
(`fs.appendFileSync`, never a rewrite). A refusal names each line and the words that tripped it, with the fix ("say it
without the place, '[a busy street]', or rephrase"). `list [--days N] [--area A] [--kind K] [--json]` reads the window
(14 days by default, today included). `areas` prints the names a note may take, with each feature's `about`. `check
--file <text>` runs the place check on any text a run is about to file that cites a note (WN5b, audit 10).

`placeProblems(words, names)`, pure, over the words as written:

- **a town, a region or a country of the gazetteer** (S5): the shipped pack's `names`, `ascii`, `regions` and
  `countries` (not `alts`, which hold "the", "and", "it"), folded as `src/lib/gazetteer/normalize.ts` folds (case,
  diacritics, punctuation; Saint is St). A one-word name trips when the word is capitalised as written; a name of
  several words when any of its words is (J1);
- **a street**: a capitalised name or an ordinal (`5th`) before a street word (Street, St, Road, Rd, Avenue, Ave, Lane,
  Boulevard, Drive, Way, Square, Court, Terrace, Crescent, Close, Alley, Highway, Parkway, Circle, Quay, Wharf, Mews,
  Place, Row, Embankment; any case), a determiner apart ("The Way"); a capitalised street word before a capitalised
  name (Rue, Calle, Via, Avenida, Piazza, Plaza, Praça, Strada, Rua, Carrer, Avinguda, Corso, Paseo, Rambla, Boulevard,
  Avenue, Place; `de`, `del`, `di`, `du`, `des`, `la`, `le`, `da`, `do`, `dos`, `das` between); a capitalised word
  ending in a street word of its own language (strasse, straße, gasse, weg, platz, allee, ufer, gracht, straat, laan,
  plein, gatan, katu, utca), its stem three letters at least;
- **a postcode** (audit 9): a UK or Canadian postcode (`AA9 9AA`, `A9A 9A9`), a Dutch one (`9999 AA`), a US ZIP+4, and
  any bare five-digit number ("75011"; a count of steps is said in words instead);
- **coordinates**: a number with three decimals or more, a pair of numbers with two decimals ("51.51, -0.13"), a degree
  sign after a number, a plus code, a what3words address (`///word.word.word`), `lat`, `lng`, `lon`, `latitude` or
  `longitude` before a number, a `geo:` link;
- **a time of day**: a clock time (`7:30`, `14h30`), am or pm after a number, o'clock, `hours` after four digits, the
  words for a part of the day (morning, afternoon, evening, night, tonight, midnight, noon, midday, dawn, dusk,
  sunrise, sunset, twilight, daybreak, nightfall, lunchtime, dinnertime), and the vague ones (after dark, rush hour,
  golden hour, at lunch, after work, on my commute);
- **a link** (WN4b): `http`, `https` or `www.`, since a map link carries a place.

`noteProblems(note, { areas, today, names })` adds WN4b's area, kind, day and words checks.

**WN4c, the gate** (`commitProblems`, pure, wired in `commits`). For every agent commit of the range (`isAgent`, as the
record gate and the expectation store read them; all of `all`, so `--loop-only` reads it too) that touches
`walks.jsonl`, it is one of two forms, or refused:

- *a note*: touches that file alone; its subject `walked: a note of <day>`; author and committer dates both `<day>
  00:00:00 +0000`; the file before a prefix of the file after (ending in a newline or empty); each added line passes
  `noteProblems` and has that day;
- *a removal* (S2): touches that file alone; removes one line and adds none; its message quotes the owner's words
  (a line `The owner: "<words>"`).

No delete or rename. A refusal names the commit, the line's number and the class ("a town", "a time of day"), never the
words (audit 3), since CI's log is public. The pack is read once per run of `commits`, and only when a commit touches the
file. `FORBIDDEN` names `walks.jsonl` and `arch/walks.test.ts` (audit 13).

**WN6, `next`** (`nextPick`). `openInTheWay(walks, runs, areas)`, pure: the "got in the way" notes whose area is one the
loop sweeps (`verbs`' keys: a feature but `arch`; never `app`; a resting one too, S6) and that no sweep of that area
follows, a sweep following when its run-log date is after the note's day (J5). The oldest note's area first, then by
name. When there is one, `nextPick` answers it before either turn and before a due evolve: `{ area, turn: 'walk', why:
"a walk note of <day> found <area> in the way, and no sweep of it has run since" }`. A sweep that answered such a note
(its area's open note before its date) is left out of `lastWasRotation`'s reading, so the alternation goes on from the
sweep before it (audit 12); `rotationArea` still counts it as the area's latest sweep. `next` reads the notes as
`origin/main` holds them (`documentsFrom(...).walks`).

**WN5, the lens** (`walks.js lens <area>`, `lensNotes`, pure). The area's "reached for" notes that no line of
`docs/expectations/<area>.md` cites yet: a line cites a note when its `Grounds:` holds `seen on a walk <day>`, one line
for each such note of that day (J8). For each it prints the grounds to write, `VISION "Who it is for"; seen on a walk
<day>`, which `expectations.js`'s `GROUNDS` already takes (the store's form does not change), and where it goes: `draft`
(lines in force under five: drafted now, put to the owner first in the feature's question), `first draft` (no line:
first in the feature's three to five, 0236), or `waits` (five in force: said in the report, the owner chooses which to
drop, S4). "Never ratified by the proxy" is already so for every line: `ratify` and `decline` refuse `--by proxy`
(decisions 0157, 0236), and no `/tend inbox` answers a line.

**WN7, keep** (`walks.js keeps <area>`, `keepsOf`, pure). The area's keep notes, each with the later notes of that area
after it in the file (S3): lens 0 reads whether a later one releases or contradicts it, and says so in the report. A
finding whose change would alter what a standing keep names is filed `[owner]` "against the keep of <day> (<area>)",
never shipped, and never answered by the proxy (audit 2).

**WN8, silence** (`walkReading(walks, today, { since, said })`, pure, in `balanceJson` as `walks`). `notes`, each note in
the window as `<day> <area> <kind>`, never its words and never a count (audit 7); `last`, the latest note's day;
`silence`, "no walk note has come in since <day>" when 14 days have passed since the latest note (with none, since
`LANDED`, the day `/walked` lands) and the ledger's `walkSilence` is not that day; else null. `balance --write` keeps
`walkSilence`, the day the silence was said for, so it is said once per gap (audit 6). `/tend`'s report says the
silence in the balance's sentence; the orchestrator's insights say it once. Nothing else reminds.

**WN1-WN3, `/walked`** (`.claude/skills/walked/SKILL.md`). The owner's: `disable-model-invocation: true`, run only when
typed. In a worktree of its own from `origin/main` (`walked/<day>`, no time and no words in the name), it:

1. takes what the owner gave: a sentence, dictation, a screenshot (read for what it shows, never saved or committed);
2. sorts it into the three kinds, each with an area (`node scripts/walks.js areas`; `app` when none fits), keeping the
   owner's words verbatim but for each place or time, replaced by a bracketed span in the app's terms ("[a busy
   street]", audit 11); a park, a station, a landmark and a lowercase name are its to strip, since the script may miss them;
3. asks once, in one round, about the kinds the line did not say, each with "nothing" (WN2); no second round;
4. shows the owner each line exactly as it will be stored and says: it is committed in this session with the day as its
   time, published to the public repository only by `/walked publish` or the next `/tend` run's push, GitHub shows when
   that push is made, and it is lost if this session ends first (S1, audit 1); it stores only on their yes;
5. runs `walks.js add --file`; a refusal is rewritten without what tripped it and shown again;
6. commits `walks.jsonl` alone, subject `walked: a note of <day>` naming no words, both dates `<day>T00:00:00+0000`
   (WN3b), runs `node scripts/tend.js commits --loop-only origin/main..HEAD` (the gate before publication, audit 3),
   and keeps the worktree and its branch;
7. `/walked publish`: rebases on `origin/main` keeping the dates (`--committer-date-is-author-date`), runs the gate
   again, pushes only `HEAD:main` (audit 5), and removes the worktree; it never pushes a session branch, and a session
   branch named from the note's words is never pushed (the owner is told to delete it if it was);
8. a leaked line: at the owner's word only, one removal commit quoting their words (S2).

A `/tend` run in the same session carries an unpublished note (`walks.md`): it cherry-picks the `walked/*` commits onto
its branch first, keeping their dates, and keeps them through its rebases (`--committer-date-is-author-date`).

It names no record document, so `records audit 14` lists it neither as a writer nor a reader; a test holds that.

## The judgement calls (the steward's rulings)

- **J1 · A town trips when written as a name.** Accepted, with the lowercase hole said in the skill and "or rephrase" in
  the refusal. A capitalised first word trips too.
- **J2 · The day only, in the commit too.** Settled by S1: the commit's dates are the day (held by the gate, audit 4), and
  the push's time is the owner's, since nothing is pushed until they say or a `/tend` run carries it.
- **J3 · `/walked` publishes only on the owner's word.** Reshaped by S1: the go-ahead is the owner's yes after seeing the
  stored lines; the grant in `ship.md` and the skills map is one note, day-dated, published only by `/walked publish` or
  carried by a `/tend` push, `HEAD:main` only.
- **J4 · CI judges agent commits only**, as the record gate and the store do (decisions 0156, 0236). Accepted; a refusal
  names no words.
- **J5 · "Since" by date.** Accepted.
- **J6 · A note needs no lease.** Accepted.
- **J7 · The tests and the file that hold the gate are the loop's to leave alone.** Accepted, with `walks.jsonl` named too.
- **J8 · One line per walk's reach, by its day.** Accepted.
- **J9 · `app` notes move nothing.** Accepted; the balance lists an `app` note's day and kind for the report.

## Tests per criterion

| Id | Test (`src/lib/__tests__/arch/`) |
|---|---|
| WN1 | `walks.test.ts` "WN1: /walked is the owner's, sorts into the three kinds, each with an area or app" |
| WN2 | `walks.test.ts` "WN2: /walked asks once, about what is missing, with nothing an option; one kind is a whole note" |
| WN3 | `walks.test.ts` "WN3: /walked shows the stored words first and commits no screenshot" |
| WN4 | `walks.test.ts` "WN4: add appends a clean note and refuses a street, a town, coordinates or a time of day with the words that tripped it; list reads the window" |
| WN5 | `walks.test.ts` "WN5: a reach not yet cited is put to the lens, grounded seen on a walk <day>, which the store takes" |
| WN6 | `tend.test.ts` "WN6: a got-in-the-way note puts its area first in next until a sweep after its day" |
| WN7 | `walks.test.ts` "WN7: a keep is listed with the later notes of its area, and the triage files a change to it [owner]" |
| WN8 | `tend.test.ts` "WN8: the balance says once when no note came in for 14 days, and nothing else reminds" |
| WN9 | `walks.test.ts` "WN9: the skills map names /walked, and records audit 14's lists need no row for it" |
| audits 1-11, 13 | `walks.test.ts` "walk-notes audit N: …" |
| audit 12 | `tend.test.ts` "walk-notes audit 12: the walk turn takes neither of the rotation's turns, and wakes a resting area" |

The implied states go in the same files, named by their ids (WN2b, WN3b, WN4b, WN4c, WN4d, WN5b, WN6b, WN7b, WN8b). The
command-line halves run in a scratch git repository (`next`, `balance`, `commits`), never on this checkout (AS6).

## Testing's size

None for the e2e (no screen); `launch` alone as the smoke (`.claude/skills/ship.md`, "The faster lane"). Unit:
`npm run test:affected` while building, `npm test` once at the end.

## Cost

`add`, `check` and `commits` read the pack (5.6 MB, 70,042 towns, 3,802 regions, 245 countries) once per call, about a
tenth of a second, only when a note is added or a commit touches the file; folding its names into two sets is O(n).
`next` and `balance` read `walks.jsonl`, tens of lines a month, against the run log: O(notes × sweeps), negligible.
Nothing runs in the app.

## Deferred

"Settled after three walks" (the entry's "After it"). A park, a station or a landmark with no town in its name, and a
town written in lowercase, left to the skill's rewrite and the owner's look (WN4d).

## Native

None.
