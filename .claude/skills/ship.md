# Ship: the worktree, the stops, the review, the push and the cleanup

The parts every skill that lands work on `main` by itself shares: `/fix` (decision 0081), `/tend` and a
slice built from an approved proposal (decisions 0128, 0130). A skill names a section here by its
heading. `<branch>` is the caller's: `fix/<short-name>`, `tend/<scope>`, `slice/<slug>`.

The grant is always the owner's and always narrow: `/fix` covers one issue, `/tend` its loop findings,
`/tend inbox G<n> yes` that one slice. None covers a force push, rewritten history, a skipped or
loosened test, or a second piece of work found on the way.

## Open the worktree

1. `git worktree prune`, then `git worktree list`. Report any other worktree of the same family
   (`fix/*`, `tend/*`, `slice/*`) you find (a dead run's leftover); do not remove it.
2. If `<branch>` already exists, here or on the remote, it is a dead run's leftover: report it, leave it,
   and add `-2` to this run's name. Create the worktree and `<branch>` from `origin/main` with `EnterWorktree`, or
   `git worktree add .claude/worktrees/<branch with - for /> -b <branch> origin/main`. Never work in
   the primary checkout and never on `main`.
3. Note the worktree path and branch: they are the only things this run may remove at the end.
4. A new worktree has no `node_modules`, and the Stop hook skips the typecheck without one. Give it a
   real directory, never a symlink: Metro bakes a symlinked package's absolute path into the web
   build's asset URLs (`/chronicles/assets/______home/...`), so the icon font and the map's assets
   404 and the e2e fails in ways that look like the app's bugs (the walker never shows, a long press
   reads "1995.8 km away"; fix ios-video, Nov 5). Either:
   - `cp -al <primary>/node_modules node_modules`: a hard-linked copy, about a second, no extra disk.
     Only when the branch's `package-lock.json` matches what the primary checkout installed
     (`git diff --quiet <primary's HEAD> -- package-lock.json`); or
   - `npm ci`: about 20 s, always right, and the only choice when the lock differs.

   It is gitignored; never commit it.
5. A new worktree also lacks the map's worker file (copied into `public/` by `npm ci`'s postinstall
   and gitignored): without it the web map never loads and the e2e dies at
   `window.__project is not a function`. Run `node scripts/copy-maplibre-worker.js` in the worktree.

## Hard stops

Before editing, or as soon as it shows, the work stops when it needs any of:

- a new dependency, a data-model or migration change, a navigation-flow change, a platform-strategy
  change (the AGENTS.md "ask before architectural decisions");
- a change to derivation rules (`SNAP_RULES`, `STREET_CODE`, `LANDING_CODE`);
- anything that sends data off the device, or a new host;
- more than the caller's size: about 8 files for a fix or a loop finding; for a slice built from a
  proposal, anything its approved criteria do not name.

Who hears of it depends on who was typed:

- **`/fix` or `/slice`, typed by the owner:** ask with AskUserQuestion, the recommended option first. The
  worktree stays while the question is open; if the answer is no, the work is scrapped ("Clean up").
- **`/tend`, and anything it runs:** never ask mid-run. A loop finding is reclassified and filed, and
  the run goes on. A slice built from a proposal returns "Stopped on" in its result block; `/tend` files
  the question in the inbox, pushes the branch for review and cleans up.

## The record documents

`docs/STATUS.md`, `docs/DEFERRED.md` and `docs/NATIVE_UNVERIFIED.md` change only through
`npm run records -- <op>` (decision 0156; `scripts/records.js`'s header lists the operations: the
inbox, "Last tend", "Open before the loop", the "From <skill>" sections of "Needs the owner", the "In
flight" and "Slices" rows, and the items of the other two). Each changes one entry and refuses to write
if any other byte would move. Write the text to a file in the scratchpad and pass `--file`, so nothing
needs quoting; never edit these files with Edit, Write or sed.

- **Every agent commit is gated, slices and fixes too.** An agent commit is one whose message has a
  `Claude-Session:` or a `Co-Authored-By: Claude` trailer; write both on every commit you make, a revert
  or a merge included (`git revert --no-edit` and `git merge --no-edit` write none: give the message
  yourself). CI replays every agent commit and every loop commit (`tend …`, and the revert of one) of the
  push; only the owner's own hand edits, which carry neither, are left alone. A refusal ends with its fix
  in one line: the operation, `redo`, and this section.
- **Each operation is recorded.** It is added to a pending sidecar under `.claude/records/`, staged as
  it is written. Commit the sidecar with the documents, and put the lines
  `npm run records -- trailers` prints (one `Records-Op:` per operation, in order) in the message's
  last paragraph, beside `Co-Authored-By` and `Claude-Session`. The gate replays them on the parent's
  documents and fails the commit unless it gets the commit's documents byte for byte: a hand edit, a
  dropped trailer or a sidecar edited afterwards all fail.
- **What the run did not file is the owner's.** Removing or rewriting an entry this run did not add
  (`inbox remove`/`set`, `open remove`/`set`, `section item remove`/`set`, `item remove`/`set`/`retag`)
  needs `--reason "<why>"`, which goes into the trailer, and a commit does it to at most two entries per
  section. A tag moves only toward `[owner]`, `[arch]` or `[kept]`. A shipped item is removed (`item
  remove`), never struck through; a line that amends an entry is appended (`note`); a reworded one is
  `set`, with its reason. An `inbox set` keeps every line an earlier `inbox note` added to the entry, word
  for word and in order (the owner's answers): an answer is added to with `inbox note`, never rewritten.
- **What waits on the owner from a slice, a fix or an audit** goes in a "From <skill>" section of
  "Needs the owner": `npm run records -- section add "From /fix" [--intro <file>]` makes it right after
  "From /tend" (newest first), `section item add "From /fix" --file <bullet>` adds each bullet, and
  `section item note|set|remove "<section>" <match>` change them; `section remove "<section>"` takes one
  with no bullet left. A section is never renamed by an agent.
- **Before the commit:** `npm run check:records -- origin/main` (the commits since `main` and the
  working tree with its pending operations). It names each change no operation makes. A commit that
  fails and is not pushed yet is made again: `git reset --soft HEAD~1` (the last commit), `git checkout
  HEAD -- <the documents>`, the operations, the commit. A commit already on `main` stays (`main` is never
  rewritten); the next push carries the record through operations.
- **On a rebase conflict** in them, in the commit being replayed (its sidecar is pending again), take
  `main`'s side of the three documents and the ledger and run `npm run records -- redo`: it runs the
  commit's operations again on `HEAD`'s documents, an inbox entry numbering on from `main`'s ledger
  (an operation that named the run's own new entry follows it by its handle, `@1`), and the trailers
  stay as they are. It refuses when an entry an operation acted on is no longer the same: look again.
  A rebase that renumbers without a conflict cannot be redone, since the record is committed: stop
  and report (`/tend` section 10). Never amend a record commit: an amend after a further operation
  carries two sidecars, and the gate fails it.
- **On a merge conflict** in them (`git merge origin/main` into a slice or fix branch), run `npm run
  records -- redo` during the merge: it writes `main`'s side of the three documents, exactly, whatever
  the conflict left, stages them, and lists this branch's record commits since the merge base. Commit
  the merge with your trailers, then file the branch's entries again with `npm run records` in a commit
  of its own. The gate accepts a merge's documents only as git's clean merge or as `main`'s side (the
  second parent's); any other resolution fails, with or without trailers when the push holds an agent
  commit. This holds for a branch made before the gate too: its merge of the gated `main` is judged the
  same. A loop run never merges `main` into its branch; it rebases.
- **A commit from before the gate, rebased onto it**, is gated like any other: if it edited the
  documents by hand, CI refuses it by name. Drop the edit from that commit (`git checkout <sha>^ --
  <document>` and amend it when it is the last commit, or split it out) and make it again with `npm
  run records` in a commit of its own; `npm run records -- redo` with nothing pending names such
  commits. A branch made before the gate is better merged with `main` than rebased.

## Review

A review reads the diff in a context that did not write it: spawn the `auditor` subagent with the
issue or criteria, the root cause or plan, the diff and the covering rule files, and ask it to break
the change: inputs that still fail, neighbours it could regress, the web and native split. Ask for a
failing input or a file and line with each finding; a finding with neither is opinion.

**A screen changed** (the diff touches `src/app/` or `src/components/`, or a module a screen draws from): the review
also looks at the screens (decision 0145). Run the journeys that cover the changed files with
`E2E_SHOTS=<scratchpad>/shots` (390 x 844) so every changed state is a picture, after making sure the journey seeds
the longest text the screen can meet (a title, a place line, a label that wraps); a journey with only short text gets a
long case first, and a changed state with no `shot()` gets one. Give the auditor the pictures too, and run the
`ux-reviewer` subagent beside it with the pictures, the issue or criteria and the changed files: text cut, clipped or
overlapping, rows that wrap, targets under 44 pt, controls over content, against `.claude/rules/ui-patterns.md` and
the goal-to-control matrix. Its findings are triaged with the auditor's. This runs whatever the test level: a `lean`
fix still gets its screens looked at.

Triage each finding accept, defer or reject with a reason (as `/audit` does). An accepted one gets a
regression test before its fix, named for the caller (`fix <name> audit N`, `tend <scope> audit N`,
`<slug> audit N`). An architectural finding is a hard stop.

Each round is: review, fix what was accepted, run the caller's checks again. Stop at the caller's
round limit or at the first round with no new accepted finding. With accepted findings still open at
the limit, nothing goes to `main`: push `<branch>` so the owner can look, and list them.

## Publish to main

Only under a grant, and only what the grant covers. `/deploy`'s preconditions hold (its section 1),
with the checks the calling skill names.

1. The worktree holds only this run's commits.
2. `git fetch origin main`; if `main` moved, rebase `<branch>`, run the caller's checks again, and only
   then continue. On a conflict, stop and keep the branch. The checks include `node scripts/tend.js
   commits --loop-only origin/main..HEAD`, what CI runs: a commit of the branch made before the record
   gate landed and hand-editing the documents is refused there by name, with how to mend it ("The
   record documents").
3. `main` is checked out elsewhere, so publish with `git push origin <branch>:main` (a fast-forward; no
   force, no history rewrite, no empty commits), once.
4. Watch the Pages run with the GitHub MCP tools until it completes (`/deploy` section 3).
5. Green: load https://miguelaguerrero.github.io/chronicles/ (Playwright is installed) and check the
   visible effect. If the page cannot be reached from the session, say the live check was not done.

### A red run

One fix-forward attempt following `/deploy` section 4, only when the log names a cause this run plainly
owns. Otherwise, or if that run is also red, or the live site is broken, revert in the worktree, push
the revert the same way (it is covered by the grant) and confirm its Pages run is green. Never leave
`main` red, and never revert a commit that is not this run's.

What to revert:

- **A fix:** its commit.
- **A sweep:** the commit the log names as the cause, alone. If the log does not name one, every code
  commit of the run. The same push carries a corrected record (documents and the ledger only, through `npm run records`): the
  finding filed as `[owner]` with the log's cause, "Last tend" saying what was reverted, the area `rough`.
- **A slice:** all of it as one unit, its record included (`git revert --no-commit <base>..<tip>`), so
  the spec, the feature map and the proposal's entry go back together and the docs check stays green.

A revert commit's message keeps git's `This reverts commit <sha>.` line, one for each commit it
reverts, and your trailers: the record gate accepts it when its documents are exactly those commits'
undone and their sidecars deleted, nothing else. A fix-forward that takes a slice's row back out uses
`npm run records -- slice row remove <match>`, which undoes only a row the same range added.

After a revert, diagnose: reproduce the failure locally with the job's own command, name the cause,
and put a corrected change on `<branch>-retry` with the failing check passing. Push that branch, not
`main`; the grant is spent. Report the cause, the branch, and what you would change.

## Clean up

Every run ends here, whatever happened. Remove only the worktree and branches this run created.

1. Look first: `git -C <worktree> status --short` and `git -C <worktree> log --oneline origin/main..HEAD`.
2. Anything unpushed or uncommitted that is worth keeping: save it as a patch
   (`git -C <worktree> diff HEAD > <scratchpad>/<name>.patch`, plus `git format-patch` for commits)
   before removing, and name the patch in the report. Never remove a worktree holding work that is
   neither pushed nor saved.
3. Leave the worktree directory first (`ExitWorktree`, or `cd` to the primary checkout), then
   `git worktree remove <path>`. Use `--force` only after step 2 saved what mattered (removing a
   hard-linked or `npm ci` copy of `node_modules` does not touch the primary's).
4. By outcome:

| Outcome | Local branch | Remote branch |
|---|---|---|
| Pushed for review (no grant to publish, or parked by an open finding) | delete (`git fetch origin <branch>` brings it back) | keep: it is what the owner reviews |
| Published, Pages green, live check done | delete | delete (`git push origin --delete <branch>`): it is merged and carries nothing |
| Reverted, diagnosis pushed | delete | keep `<branch>-retry`; delete `<branch>` |
| Scrapped (cannot reproduce, hard stop declined, three failures, conflict) | delete | delete if you had pushed it, after saving any patch |
| Nothing pushed by choice | delete after the patch is saved | none |

5. `git worktree prune`, then `git worktree list` and `git branch --list '<family>/*'` to confirm
   nothing of this run remains. If a removal failed, say what is left and its path.

## The result block

Every skill's report ends with this block, so a caller (the owner, or `/tend`) reads the outcome
without reading the report:

```
Result: shipped | reverted | pushed for review | committed locally | stopped | scrapped
Commits: <hashes on main, or the branch>
Changed: <areas (scripts/features.js names) whose screens or modules changed>
Filed: <inbox entries, docs/DEFERRED.md items, docs/NATIVE_UNVERIFIED.md items, or none>
Stopped on: <the question and the recommended answer, or none>
Not run: <checks the level left out; "nothing here has run on a phone" when native was touched>
```
