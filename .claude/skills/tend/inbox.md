# The owner's answers, case by case (`/tend inbox`, section 7)

What every answer shares is `SKILL.md` section 7's; this file is the path each kind of answer takes: read it before
acting on any answer. The record operations are `ship.md`'s, "The record documents".

- **Yes to a slice-sized `[owner]` `T` entry** (filed so while the balance read
  outgrowing, section 5): one slice, the `slice` skill with the entry's criteria
  as its start; not `--from`, which only a `G` entry takes (decision 0130).
- **Yes to an entry whose look needs a mock-up and has no `Mock-up:` line** (decisions 0252, 0259): not built; draw it, note its line on
  the entry with the yes (`inbox note`), and ask at the close. **Yes to an `[owner]` `T` entry** (one commit's worth, by
  section 5): build its recommended shape, as its mock-up draws it, as section 4 does, one commit, subject
  `tend <area> T<n>: …`, its test named the same, `Source:` naming the entry
  and what it rests on. The entry leaves the inbox (`npm run records -- inbox
  remove T<n> --reason "the owner's yes, built in tend <area> T<n>"`); a yes
  that waits for the next run is noted on it instead (`inbox note T<n> --file
  <line>`). An entry the run did not file leaves only with a `--reason`, and a
  commit removes or rewrites at most two per section: with more answers, the
  record takes a commit per pair.
- **Yes to an `[arch]` entry** is the owner's architectural call, not a
  build: write its decision record, and shape the work as a `G` entry with
  criteria (`evolve.md`'s form) for a yes of its own.
- **A `[phone]` entry** is answered with what the owner saw on the device:
  as expected, and it leaves; otherwise it becomes a `/fix` the owner types.
- **Yes to a `G` entry that still has an `Open:` line** (filed by
  `/investigate`, decision 0231): not built. Note the yes on it
  (`inbox note G<n>`) and put the open call to the owner in the report,
  recommended answer first; the next `/tend inbox` with the answer builds it.
- **Yes to a `G` entry**, of any size: one slice (decision 0130). Run the
  `slice` skill with `<slug> --from=G<n>` **in this run's worktree**: the
  entry's criteria and verdict are its start, its plan is written and read by
  the steward but not held for the owner, and it returns its result block
  without publishing or asking. Remove the entry from "Next evolutions"
  (`npm run records -- inbox remove G<n> --reason "<why>"`), then
  section 10 (its checks are the slice's own step 9; the review's fixes are
  named `<slug> audit N`; `check:tend` is not run, since a slice's commits
  are not loop commits). A slice that edits process files takes `ship.md`'s lease first ("Open the worktree"). One
  that spans `chronicles-data`, or waits on a data pack, reads `traps.md`, "Data and second repositories", first.
- **A slice that returns "Stopped on":** push its branch as
  `slice/<slug>-parked` and leave `main` without it. Then, on a new branch
  from `origin/main` in the same worktree, file the question as a `T` entry
  (`[arch]` or `[owner]`, naming the parked branch, the question and the
  recommended answer), keep the `G` entry, and publish that record alone.
  **A yes or no to such an entry** resumes it: check out the parked branch,
  rebase it on `origin/main`, apply the answer, and finish the slice as above;
  if the answer ends it, delete the parked branch and decline the `G` entry.
- **Reshape** ("yes, but…"): rewrite the entry as told (`npm run records --
  inbox set <id> --reason "the owner's reshape" --file <entry>`, its number
  kept) and run `/vision` on
  the new shape; a reshaped look is redrawn and never built in the same run. A reshaped `T` entry is built only if
  it is still aligned and still one commit's worth. A reshaped `G` entry is never built in the
  same run: its rewritten criteria are filed for the owner's plain yes.
- **No:** remove the entry (`inbox remove <id> --reason "the owner's no"`) and add `{ title, area, date, reason }` to the
  ledger's `declined`, so no sweep proposes it again. A no that states a rule
  ("never a count there") is a new decision record too. A no to every
  evolution of a polished area makes it `resting`.
- An answer that changes `docs/VISION.md` is the owner's edit; propose the
  wording and leave the page.
