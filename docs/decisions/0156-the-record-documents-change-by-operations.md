# 0156. Agents change the record documents only through declared operations, replayed by a gate

Date: 2026-11-12 · Status: accepted · Area: process · Amends: 0128, 0129, 0130 (how a run writes its record) · From: the owner, after `/tend replay`'s record commit (Nov 12), and the owner's answers to the gate's audit (Nov 12, in person)

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

Also from the audit: rows pair by their name (a `set` keeps the row's first cell and its table's cells); a new section
goes after the document's last block with one intro paragraph at most; the parser reads markdown's block starts
(headings up to three spaces in, setext underlines, thematic breaks, HTML blocks, and only "1." interrupting a
paragraph) and a body that would start a block or leave a fence open is refused; a CRLF document keeps its line
endings, and a lone carriage return (a line ending to markdown, not to the parser) is refused in a body and in a
document; a link reference definition is refused as a body; an entry number is read only inside the inbox sections;
a split's parts keep the bullet's marker and checkbox and its words in order, none dropped, added or moved; an inbox
number the range removed may be given out again (`inbox add --id`), to undo a removal.

**Which commits.** `scripts/tend.js commits` runs the gate, so CI replays every loop commit of a push (`tend …`, and
the revert of one); `npm run check:records -- <range>` replays every commit of the range, and with one revision also
the working tree with its pending operations. CI also reads the push's non-loop commits that carry trailers, for what
they filed, as the CLI does. A merge passes when its documents are what `git merge-tree --write-tree` makes of its two
parents; in a push that holds loop commits, a merge resolved by hand in the documents, or of more than two parents,
fails; elsewhere it is noted. A shallow clone's boundary commit is noted and skipped. The owner's own hand edits are
not gated by CI. The script, its tests and `tend.test.ts` are in the loop's FORBIDDEN list. CI (`pages.yml`) fetches
the whole history, fails a push that is not forced when its base cannot be read, and runs the check from the push
base's own scripts once the base holds the gate, so no commit of a push loosens the scripts that judge it.

**The cut-over.** History carries no trailers. The gate replays every commit that descends from the gate's landing:
its parent holds the gate (`scripts/records.js` with `Records-Op` in it), or an ancestor did. A descendant whose
parent's script lost the marker is replayed all the same, and the lost marker is a problem of its own. A commit that
is an ancestor of `CUTOVER` in the script (`49ceb3e3`, `main` as this was first written) is never replayed. Both
are facts of the commit graph, chosen over an author date, which a rebase keeps and anyone can set. `main` moved
three times while this was built: whatever lands there before the gate does is history however late it lands, since
the gate is not among its ancestors.

**Landing:** on the orchestrator's session branch, for the owner to review and merge; never pushed to `main` by the
session.

## Consequences
- What used to be an edit in place is a `note`, a `set` with its reason, or a `remove` and an `add`: the trailers say
  which, and why.
- A shipped `[loop]` item is removed, not struck through. Answering more than two inbox entries, or clearing more than
  two open items, takes more than one commit.
- Calibrated by replaying `main`'s last 40 commits to the three documents as synthesized operations: 34 come out byte
  for byte. Of the six that do not, three differ only in blank lines a hand edit added (a blank line before an added
  item, a trailing blank line, two blank lines before a new section); one renames a section's heading (no operation
  renames a section); one inserts a new `docs/DEFERRED.md` section mid-file (refused on purpose: a new section goes at
  the end); one adds a "From /fix" section to "Needs the owner" (the owner's part). None of the 40 would have hit the
  cap or the tag rule. The run found one flaw, fixed: a removal left a double blank line.
- Two audit rounds (`records-script`, F1-F26): every finding accepted but F9, which is left to the owner below; each
  has its regression test, `records audit N`.

## Left open for the owner
- **F9: `inbox set` has no limit beyond its reason.** It can drop the owner's answer recorded by an earlier `inbox
  note`, or cut an entry to its title. Keeping the noted lines through a set was not chosen; the reason and the cap
  are the guard for now.
- **Gating G-slice commits.** A slice built from an approved `G` entry (decision 0130) publishes through `/tend`, but
  its commits are named for the slice, not `tend …`, so CI does not replay them. Whether CI should gate them too (by
  the run's range rather than the subject) is the owner's call; not built.
- **A section rename** (as `46837a69` renumbered a decision in a heading) has no operation; it is the owner's edit.
