# Walk notes: how `/tend` reads the owner's walks (decisions 0238, 0270)

The owner's `/walked` keeps a note after a walk in `.claude/skills/tend/walks.jsonl`: lines of `day`, `area`, `kind`
(reached for, got in the way, keep) and `words`, places and times stripped (`scripts/walks.js`'s header). It is the only
evidence of use a local-only app has. A run reads it four ways, and writes it never: the loop never edits the file
(`FORBIDDEN`), and only the owner's `/walked` adds to it.

**Whatever a run writes that cites a note** (an expectation line, an inbox entry, a DEFERRED item, the report, the run
log) names it by its day, area and kind, never its words, and is checked before it is filed: `node scripts/walks.js
check --file <the text>`. The repository is public.

## Lens 0: a reach is a drafted line, ahead of the model's

`node scripts/walks.js lens <the run's area>` lists the area's "reached for" notes that no line of
`docs/expectations/<area>.md` cites yet, each with its grounds, `VISION "Who it is for"; seen on a walk <day>`, and where
it goes:

- `draft`: draft its line now (`expectations.md`, step 2), even where the area has lines; one line for each note, its
  Grounds as printed. It is put to the owner first, ahead of every model-drafted line, in the feature's one question.
- `first draft`: the area has no line, so its first draft of three to five (decision 0236) holds this line first.
- `waits`: five lines are in force, so it is said in the report and waits for the owner to choose which line to drop;
  nothing is displaced (decision 0270).

A walk's line is identity like any other: the owner ratifies it, never the proxy (decisions 0157, 0236).

## `next`: what got in the way is swept first

`node scripts/tend.js next` answers an area a "got in the way" note names before either of its turns and before a due
evolve, a resting area too, until a sweep of that area has run after the note's day, or the sweep it sent (decisions
0238, 0270). That sweep logs `"walk":"<the note's day>"` on its run-log line, so it takes neither turn of the rotation;
no other sweep leaves the alternation. Its report says it was sent by the walk note of `<day>`.

## The triage: a keep protects

`node scripts/walks.js keeps <the run's area>` lists the area's keeps, each with the later notes of that area. A keep
holds until a later note about that area releases or contradicts it (decision 0270): lens 0 reads which still stand and
says so in the report. A finding whose change would alter what a standing keep names is **filed `[owner]`, never
shipped**, its entry saying "against the keep of <day> (<area>)". The answer log reads that entry as a class of its own,
`T [keep]`, and refuses the proxy's answer to it: it is the owner's alone, never the proxy's (decision 0157's list, in
`.claude/skills/tend-orchestrator/SKILL.md`, section 2).

## Carrying a note

A note `/walked` committed in this session waits on a local `walked/<day>` branch until it is published (decision
0270). A `/tend` run in the same session carries it: right after opening its worktree, before any commit of its own, it
cherry-picks each such commit that `origin/main` lacks onto its branch, keeping its dates (`GIT_COMMITTER_DATE` set to
the commit's author date), and every rebase of the run keeps them (`git rebase --committer-date-is-author-date
origin/main`, `ship.md`, "Publish to main", step 2), since `commits` refuses a note's commit with a time of day in its
dates. `tend:log` writes the days it carries on the run's line (`carried`), and `commits` refuses a push of a run whose
notes are not its first commits, or are named on no line it adds: a run carries a note, it never writes one, and never
a removal. The run publishes it with its own push, says so in its report, and removes the `walked/*` worktree and branch
after its publish. `next` reads `main`, so a note carried this way steers the run after.

## The report: silence, once

`npm run tend:balance` prints `walks`: each note in the window by day, area and kind, never its words and never a count,
and `silence` when no note has come in for 14 days (counted from the day `/walked` landed while there is none).
`--write` keeps the gap it was said for in the ledger (`walkSilence`), so the report says it once a gap, in the balance's
sentence. Nothing else reminds (decision 0238).
