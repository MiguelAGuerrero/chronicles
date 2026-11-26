---
name: walked
description: The owner's walk note (decisions 0238, 0270) - after a walk, the owner says in a line, by dictation or with a screenshot what they reached for that was not there, what got in the way and what to keep; this sorts it into those three kinds, each with an area of the app, strips every place and time, shows the owner the stored words, and commits the note day-dated for /tend to read. "/walked publish" publishes the notes waiting in this session.
when_to_use: The owner types /walked after a walk, with anything they want to say about it, or "/walked publish". Never run by a model or another skill.
argument-hint: "<what you noticed on the walk> | publish"
disable-model-invocation: true
allowed-tools: Bash, Read, Write, AskUserQuestion, EnterWorktree, ExitWorktree
---

# Walked: $ARGUMENTS

The app sends nothing anywhere (decision 0005), so the owner's own walks are the only evidence of use the loop can have
(decision 0238). A note is three kinds of line: what the owner **reached for** that was not there, what **got in the way**,
and what to **keep**. `/tend` reads them: a reach becomes a drafted expectation line, a got-in-the-way puts its area
first in the next sweep, a keep protects what it names (`.claude/skills/tend/walks.md`).

**The repository is public.** A note holds the app's area names and the day only: never a street, a town, a region or a
country, a postcode, coordinates, a link or a time of day, so where and when the owner walks is never published. You
are the first guard, `scripts/walks.js add` the second, the owner's look the third, and `node scripts/tend.js commits`
before the note leaves this session the fourth.

With `publish` as the argument, go to "Publish" and do nothing else.

## 1. The worktree

`git fetch origin main`, then a worktree of its own from `origin/main`: the branch `walked/<day>` (the day only: no time
and no word of the note in a branch name), at `.claude/worktrees/walked-<day>`. If it is already there (a note of the
same day waits in this session), use it and add to it. `<day>` is the day of the walk as `YYYY-MM-DD`: today, unless the
owner said another. Never work in the primary checkout. No `node_modules` is needed: `scripts/walks.js` is plain Node.

## 2. Sort what the owner gave

Read what the owner gave: a sentence, dictation, a screenshot. A screenshot is read for what it shows and is never
saved, copied into the worktree or committed; only its observations, in words, are kept.

Sort it into the three kinds, each with an area: one of the names `node scripts/walks.js areas` prints (the features
of `scripts/features.js`), or `app` when none fits. One sentence may hold several lines; a note with only one kind is a
whole note.

Keep the owner's words **verbatim**, but for each place or time, which you replace with a bracketed span in the app's
terms: "the strip hid [a busy street] while I looked for the way", "[a town's centre]", "[a station]", "[later]". Strip
what the script cannot see: a park, a station, a landmark, a neighbourhood, a shop or a building by its name, a name
written in lowercase ("near quillmarsh"), and any time of day however it is said. When in doubt, strip it.

## 3. Ask once

Ask once, in one round, only about the kinds the line did not say: one AskUserQuestion holding a question for each
missing kind ("Anything you reached for that was not there?", "Anything that got in the way?", "Anything to keep as it
is?"), each with "nothing" as an option and the owner's own words as the other. Ask nothing when the line said all
three. Never a second round: what the owner leaves unsaid stays unsaid.

## 4. Show the stored words

Show the owner each line exactly as it will be stored (`day`, `area`, `kind`, `words`), and say, plainly:

- it is committed in this session, the day as its time, and not published yet;
- it is published to the public repository only by `/walked publish` or by the next `/tend` run's push in this session;
- GitHub shows when that push is made, so publishing just after a walk tells when the walk ended;
- it waits in this session, and is lost if this session ends first.

Then ask with AskUserQuestion: "Store it (Recommended)", "Change it: say what", "Store nothing". Only the owner's
"Store it" stores the note; a change is made and shown again.

## 5. Store and commit

Write the lines to a file in the scratchpad, one JSON object a line, keys in the order `day`, `area`, `kind`, `words`:

```
{"day":"<day>","area":"walk-screen","kind":"got in the way","words":"the strip hid [a busy street] while I looked for the way"}
```

`node scripts/walks.js add --file <that file>` in the worktree. A refusal names each line and the words that tripped
it: say it without what tripped it, show the owner the new line (step 4), and add again. Then commit
the notes file, `tend/walks.jsonl` alone, nothing else, the dates the day only, the subject naming no words:

```
git add .claude/skills/tend/walks.jsonl
GIT_AUTHOR_DATE="<day>T00:00:00+0000" GIT_COMMITTER_DATE="<day>T00:00:00+0000" git commit -m "walked: a note of <day>" (the session's trailers)
node scripts/tend.js commits --loop-only origin/main..HEAD
```

The last line is the gate before the note leaves this session: it refuses a commit that holds anything else, a time
of day in its dates, or a line the check refuses. Keep the worktree and its branch: they hold the note until it is
published. Tell the owner the note waits, and how it will be published.

## Publish

`/walked publish`: for each `walked/*` branch of this session holding commits that `origin/main` lacks, in its worktree:

```
git fetch origin main
git rebase --committer-date-is-author-date origin/main
node scripts/tend.js commits --loop-only origin/main..HEAD
git push origin HEAD:main
```

The rebase keeps each note's dates the day only. Push only `HEAD:main`, a fast-forward, once; refused, fetch, rebase and
push again. Never push a `walked/*` branch, and never this session's own session branch: a session branch named from the
note's words would publish them in its name, so if one exists, tell the owner to delete it. Then remove the worktree and
the branch (`git worktree remove`, `git branch -D`). A `/tend` run in this session carries a waiting note in its own push
instead (`.claude/skills/tend/walks.md`, "Carrying a note").

## A line that leaked

If a published note holds a place or a time after all, the line is removed only at the owner's word (decision 0270), in a
worktree from `origin/main`: delete that one line of the notes file (`tend/walks.jsonl`) and nothing else, commit it with
the subject `walked: a line removed at the owner's word` and a line `The owner: "<their words>"` (their words, without
the place), run the gate, and push only `HEAD:main` once the owner says so. The line stays in git's history; rewriting
history is the owner's alone.

## Report

The lines stored, as stored; that they wait in this session until published, and how; or, after `publish`, the commit on
`main`. Nothing here is shown in the app.
