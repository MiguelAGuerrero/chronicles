# 0156. Agents change the record documents only through declared operations, replayed by a gate

Date: 2026-11-12 · Status: accepted · Area: process · Amends: 0128, 0129, 0130 (how a run writes its record) · From: the owner, after `/tend replay`'s record commit (Nov 12), the owner's answers to the gate's audit (Nov 12, in person), and the owner's decisions on what the audit left open (Nov 13, in person)

## Context
A `/tend replay` record commit (`6af0c01f` on `tend/replay-20261112-1652`) was meant to replace only the "Last tend"
section of `docs/STATUS.md`. It deleted about 100 lines with it: the whole "Open before the loop", the owner's open
items. `check:docs` and `check:tend` both passed it: neither reads what a commit does inside a document. Agents were
free-editing three files the owner reads as the state of the work.

A first gate read each commit's diff and guessed which operations made it, pairing removed and added bullets by the
words they shared. Its audit (`records-script`, F1-F13) found that it caught only the exact shape of `6af0c01f`: the
word-overlap pairing let a section be emptied but for one item, an item be gutted or moved to demote its tag, and
refused a legitimate rewrite put back in place. The owner's answers replace the guessing.

## Decision
**A script and a verify gate.** The documents stay markdown the owner reads and edits by hand. `scripts/records.js`
(`npm run records -- <op>`) offers named operations: the inbox's `T` and `G` entries (add, note, set, remove), "Last
tend" (set), "Open before the loop" (add, note, set, remove), the "In flight" and "Slices" rows, and the items of
`docs/DEFERRED.md` and `docs/NATIVE_UNVERIFIED.md` (add, note, set, remove, tag, retag, split). Each changes one entry,
parses the result and refuses to write unless every other block parses again byte-identical and in the same section.
Scope: `docs/STATUS.md`, `docs/DEFERRED.md` and `docs/NATIVE_UNVERIFIED.md`; the ledger stays JSON (`inbox add` writes
its `lastT` and `lastG` only).

The owner's design (Nov 12):

1. **Replay declared operations; no similarity heuristic.** Every operation is recorded: its name, its arguments and
   its body. A commit that touches the documents names the operations it applied, in order, as `Records-Op:` trailers
   (the arguments, and `sha256:` of the body). The bodies are in a sidecar the commit adds,
   `.claude/records/<UTC time>-<random>.json`, chosen over base64 in the trailer so that a body reads as text in
   `git show` and each trailer stays one line. `npm run records` stages the sidecar as each operation runs; `npm run
   records -- trailers` prints the trailers. The gate takes the parent's three documents and ledger, replays the
   declared operations, and requires the commit's documents byte for byte; the sidecar must render to exactly the
   trailers, and trailers without a sidecar must be exactly as the script prints them. Any other change fails. An
   inbox entry's number is not in the trailer unless given (`--id`): it comes from the parent's ledger and inbox on
   both sides, so after a rebase onto a moved `main`, `npm run records -- redo` numbers it on and the trailers stay
   true; a later operation names the run's own new entry by a handle (`inbox note @1`) that follows it. Each operation
   also records what it acted on (the entry's text hash, its number left out): replay and `redo` refuse when the
   entry its match names is no longer that one.
2. **Operations for in-place edits:** `open set`, `item set` and `item retag`, beside `inbox set`.
3. **Removals are capped.** A commit removes or rewrites (`remove`, `set`, `retag`) at most two entries per section
   that the run did not file, in "From /tend", "Next evolutions", "Open before the loop" and each section of the other
   two documents. "Filed by the run" means added by a filing operation (`inbox add`, `open add`, `item add`) in an
   earlier commit of the same range, or earlier in the same commit, as their trailers declare, never matched by text.
4. **A reason is required** for each such removal or rewrite: `--reason "<text>"`, recorded in the trailer.
5. **The owner's tags are not demoted.** A tag moves only toward `[owner]`, `[arch]` or `[kept]`, never from `[owner]`
   or `[arch]` to `[loop]`: `item retag`, `item set`, `inbox set`, a split's parts, and a remove and an add of the same
   item (its words, tag aside) anywhere in the range. The owner's answer to the audit's second round: a `[loop]` add
   in a range that removed an `[owner]` or `[arch]` item the run did not file needs a `--reason` quoting that item's
   first words, whatever the add says, in either document and either order.

The owner's decisions of Nov 13, on what the two audit rounds left open:

6. **An `inbox set` keeps the entry's answer notes (F9).** A rewrite carries every line an earlier `inbox note` added
   to the entry, unchanged and in the same order; the CLI and the replay both refuse a set that drops or alters one.
   The replay carries each entry's noted lines through its operations, and the CLI and the gate read the notes that
   earlier commits made from the history after the cut-over (each `Records-Op: inbox note` commit read back on its
   parent). A noted line the owner has already taken out by hand binds nothing. To add to an answer is `inbox note`.
7. **Every agent commit is gated, not only the loop's.** An agent commit is one whose message has a line
   `Claude-Session: <url>` or `Co-Authored-By: Claude …` (the key in any case; the name a whole word): slices,
   `/fix`, `/docs-gc`, `/audit`'s record, the loop, everything an agent session commits. CI replays every agent
   commit and every loop commit of the push that descends from the gate's landing; a commit with neither trailer is
   the owner's own hand edit and is not gated. A refusal ends with its fix in one line: the operation for the part
   that changed, `npm run records -- redo` after a rebase or merge conflict, and where `ship.md` says so. An agent
   writes the two trailers on every commit it makes, a revert or a merge included (`git revert --no-edit` and
   `git merge --no-edit` write none). When this was decided, every commit on `main` but four was authored as the
   agent, and all but 51 carried a trailer: 46 merges and 3 reverts in git's own words, one slice commit and one
   clean-up, none of the 5 non-merges touching the documents.
8. **A "From <skill>" section of "Needs the owner" is made and kept by operations.** `npm run records -- section add
   "From /fix" [--intro <file>]` adds the H3 right after "From /tend", above the "From …" sections already there
   (newest first, as the journal's two did), before "Next evolutions"; the title starts "From ". Its bullets are
   `section item add "<section>"` (at its end; `--top`, `--after`), and `section item note|set|remove "<section>"
   <match>`, a section named by its title or text in exactly one "From …" title, the owner's own included; the caps
   and reasons count per section. `section remove` takes a section with no bullet left (and its one intro paragraph
   at most), with its reason when the run did not add it. A rename stays the owner's edit.

Also from the audit: rows pair by their name (a `set` keeps the row's first cell and its table's cells); a new section
goes after the document's last block with one intro paragraph at most; the parser reads markdown's block starts
(headings up to three spaces in, setext underlines, thematic breaks, HTML blocks, and only "1." interrupting a
paragraph) and a body that would start a block or leave a fence open is refused; a CRLF document keeps its line
endings, and a lone carriage return (a line ending to markdown, not to the parser) is refused in a body and in a
document; a link reference definition is refused as a body; an entry number is read only inside the inbox sections;
a split's parts keep the bullet's marker and checkbox and its words in order, none dropped, added or moved; an inbox
number the range removed may be given out again (`inbox add --id`), to undo a removal.

**Which commits.** `scripts/tend.js commits --loop-only` runs the gate in CI on every loop commit of a push (`tend …`,
and the revert of one) and every agent commit (point 7); `npm run check:records -- <range>` replays every commit of
the range, the owner's included, and with one revision also the working tree with its pending operations. CI also
reads the push's other commits that carry trailers, for what they filed, as the CLI does. A merge passes when its
documents are what `git merge-tree --write-tree` makes of its two parents, or, document by document, one parent's
documents with the other side's operations since the merge base run again on them: what `npm run records -- redo`
writes during a conflicted merge (main's side, the branch's operations again; it refuses when an entry an operation
acted on changed on main). Any other resolution fails when the merge is an agent's commit or the push holds loop
commits, and is noted otherwise. A shallow clone's boundary commit is noted and skipped. The script, its tests and
`tend.test.ts` are in the loop's FORBIDDEN list. CI (`pages.yml`) fetches the whole history, fails a push that is not
forced when its base cannot be read, and runs the check from the push base's own scripts once the base holds the
gate, so no commit of a push loosens the scripts that judge it.

**The cut-over.** History carries no trailers. The gate replays every commit that descends from the gate's landing:
its parent holds the gate (`scripts/records.js` with `Records-Op` in it), or an ancestor did. A descendant whose
parent's script lost the marker is replayed all the same, and the lost marker is a problem of its own. A commit that
is an ancestor of `CUTOVER` in the script (`49ceb3e3`, `main` as this was first written) is never replayed. Both
are facts of the commit graph, chosen over an author date, which a rebase keeps and anyone can set. `main` moved
three times while this was built: whatever lands there before the gate does is history however late it lands, since
the gate is not among its ancestors. So is an in-flight branch's work from before the gate, and the merge of `main`
that brings the gate into it (its first parent does not hold the gate); what the branch commits after that merge is
gated.

**Landing:** first on the orchestrator's session branch, for the owner's review; after the owner's decisions of Nov 13
and a third audit round, the orchestrator lands it on `main` itself, by a fast-forward, under the owner's grant for
this landing. The push that lands it is checked by its own scripts (its base does not hold the gate).

## Consequences
- What used to be an edit in place is a `note`, a `set` with its reason, or a `remove` and an `add`: the trailers say
  which, and why.
- A shipped `[loop]` item is removed, not struck through. Answering more than two inbox entries, or clearing more than
  two open items, takes more than one commit.
- Calibrated by replaying `main`'s last 40 commits to the three documents as synthesized operations. First (Nov 12):
  34 came out byte for byte; the run found one flaw, fixed: a removal left a double blank line. Again with the section
  operations (Nov 13, `b1ed5402` to `61928635`): 32 of 40. Of the eight that do not, three differ only in a blank line a
  hand edit added; two are the journal's "From …" sections, whose words the section operations now make but which
  were put above "From /tend", where point 8 does not put them; two rename a `docs/NATIVE_UNVERIFIED.md` section (no
  operation renames a section); one inserts a new `docs/DEFERRED.md` section mid-file (refused on purpose: a new
  section goes at the end). None of the 40 would have hit the cap or the tag rule.
- Three audit rounds (`records-script`, F1-F26; round 3 on the owner's decisions): each finding has its regression
  test, `records audit N`; F9 is point 6.
- What the owner's other sessions meet on their next deploy: their commits from before the gate, and the merge of
  `main` that brings it in, are history; a commit they make after that merge that changes a document by hand fails
  CI, its refusal naming the operation, `redo` and `ship.md`. A merge of `main` they resolve by hand in the
  documents passes only when it is `redo`'s, or carries no trailer.

## Left open for the owner
- **A section rename** (as `46837a69` renumbered a decision in a heading) has no operation; it is the owner's edit.
- **A merge without a trailer** (git's own message) is the owner's by point 7, so an agent that leaves the trailers
  off a merge it resolves by hand is noted, not failed; the skills tell agents to write them.
