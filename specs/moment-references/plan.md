# Plan: moment references (RF1-RF8)

## 0. Prerequisite: merge main into `claude/ui-conformance`

Main is 117 commits ahead, with moment stacks (0123: a `moment` table, pieces under it). It overlaps this
branch in `CaptureView`, `deletion/*`, `threads/shell`, `useCaptures`, `MemoriesScreen` and `_layout`.
Decision 0114 collides (main's "the app opens on Chronicle"): this branch's 0114 becomes 0114. Unit tests,
typecheck, lint, then the journeys chosen as in `docs/TESTING.md`. This is the riskiest step of the plan.

## 1. Core (test first)

`src/lib/threads/refs.ts` (core):
- `parseRefs(body) -> (string | { ref: id })[]`, `refIds(body)`, `insertRef(body, at, id)`;
- `plainRefs(body, label)`: the words RF6 shows;
- `mentioning(notes, id)`: what mentions a moment (RF7), read on demand, O(n) over notes;
- the editor's mapping between the stored token and the `@Pier, Sep 11` the field shows (RF3).

## 2. Views

- **`NoteEditor`:** @ opens the picker (`filterPicker`, as `AddToThread`); one delete removes a reference whole.
- **`CaptureView`:** a note piece with references draws a `RefCard` per reference (RF4, RF5); the info line
  and More gain RF7.
- **Plain-text readers** call `plainRefs` (RF6): the row, Lately, a day, the resurfaced card, the notifier's
  body and the replay. `check:affected` names them.

## 3. Goal to control (ui-patterns)

| Action | Intent | Control | Matrix |
|---|---|---|---|
| Mention a moment | Insert a reference while writing | @ opens a picker at the cursor | 15, a pick from a list |
| Open a mentioned moment | Follow a reference | The card, a tap | Content as a link |
| See what mentions it | Find the response | Info line plus a More item | 3, rare actions in More |

## 4. Tests

- **Unit:** `src/lib/__tests__/threads/refs.test.ts` (RF2, RF3, RF5, RF6, RF7, RF8).
- **Journey:** the `threads` journey writes a note with an @, sees the card, opens it, and checks
  "Mentioned in a note" (RF1, RF4, RF7), with shots of the editor's picker and the note's cards.
- **Other journeys:** none, unless a plain-text reader's journey holds a check on it.

## Not in this slice

References in captions; backlinks on the Chronicle's cards; search by reference.
