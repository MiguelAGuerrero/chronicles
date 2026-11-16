# Reaction links: the plan

For `specs/reaction-links/spec.md` (RL1-RL11), decision 0177. The owner reviews this before any code.

## For the owner

1. **A viewer opened outside Memories** (the walk screen, the replay, a day, Chronicle's Map, Navigate, Media).
   Recommended: its reactions stay plain words (RL4). A link there would close the viewer and leave the screen for
   Chronicle, which mid-walk or mid-replay is a jump the walker did not ask for. The alternative: they are links too, and
   a tap takes you to Chronicle's Memories on that lens.
2. **A video's pin with reactions** (the reactions audit 15, deferred): the play mark takes the head's bottom right, so
   three bubbles cannot both sit on the head and clear it. Recommended: on a video's pin, two bubbles along the
   bottom-left and the third above them at the head's left edge (an L). Alternatives: a video's pin says its reactions in
   its spoken name only and wears no bubbles; or leave it as built.
3. **Back from a lens opened from an entry.** The default taken: Back returns to the journal (as Threads does), not to
   the Reactions list, which the walker never saw on the way in.

## Defaults that make a control quieter (decision 0167)

- A reaction as a link is drawn as it is now (ink glyph and name) with no underline or chip: the target grows to 44 px,
  and its spoken role says "link". The cold find tests whether that is found.
- "Not kept yet" is in the app's small sans, muted ink, under the panel's rows, the journal's own words (steward 3).
- If the cold find cannot place the link, the only fallback is an ink underline (steward 5).

## Data

- No new store. One new `Db` method, `setReactions(rows)`: a moment's rows in one transaction (RL10), with a contract
  case over the fake, IndexedDB and SQLite. `keep` and a multi-family change use it.
- The shell's state gains `notKept` (the moment whose last choice failed), cleared by the next choice (RL9).

## Files

- `components/reactions/ReactionMarks.tsx`: `onOpen?(id)`; with it each mark is a `Pressable`, role link, 44 px tall,
  named by its lens ("Ideas") (RL2, RL3, RL5).
- `components/journal/Entry.tsx`, `chronicle/MemoriesScreen.tsx`: `onLens`; a lens opened from an entry remembers it
  came from the journal and Back returns there (RL2); the viewers Memories opens pass `onLens` (RL3).
- `components/CaptureView.tsx`: `onLens?` to `CaptureContent`'s marks; a tap closes the viewer, then opens the lens. `StepThrough` never passes it; the slip's and a reminder's viewers in `MemoriesScreen` pass none (steward 2).
- `components/reactions/ReactionSign.tsx`, `notePage/NotePage.tsx`: the face with a plus always (RL6, RL7).
- `components/journal/JournalPage.tsx`: an entry right under a date starts below the date's edge (RL8).
- `components/reactions/ReactionPanel.tsx` and its four hosts: `notKept` (RL9).
- `lib/reactions/shell.ts`: `notKept`; `keep` through `setReactions`; a keep under way is not dropped (RL11).
- `lib/db/{types,index.web,sqliteStore}.ts`, `__tests__/fakes/memoryDb.ts`, `__tests__/dbContract.ts`: `setReactions`.
- `CapturePinView.tsx`: the video pin's bubbles, once the owner has chosen (question 2).
- Docs: `.claude/rules/reactions.md`, `docs/PRODUCT.md`; `docs/DEFERRED.md` (the held-date item and the three audit
  items leave it), by `npm run records`.

## Tests per criterion

| Ids | Where |
|---|---|
| RL6, RL7 (the words) | `reactions/core.test.ts`: the sign's and the tool's spoken names say what is chosen |
| RL9 | `reactions/shell.test.ts`: a failed choice leaves the set as it was and sets `notKept`; the next choice clears it |
| RL10 | `dbContract.ts`: `setReactions` writes all or none, on all three stores; `reactions/shell.test.ts`: `keep` uses it |
| RL11 | `reactions/shell.test.ts`: a drop while a keep is under way keeps the held reactions |
| RL1-RL3, RL5, RL6, RL8, RL9 (screens) | the `reactions` journey: the link under an entry, Back, the viewer's links from the journal, the face with a plus after choosing, the first entry clear of the edge at 390 and 320, a broken write saying "Not kept. Try again." |
| RL4 | the `reactions` journey: the viewer opened from Chronicle's Map, and from the slip, has plain marks |
| RL7 (screen) | the `notepage` journey: the tool stays the face after a choice |

## UI: goals and controls (matrix: `docs/research/ui-references.md`, section 2)

| Action | Goal, how often | Control | Matrix row; precedent | Where the owner looks first |
|---|---|---|---|---|
| Gather a reaction's moments from a moment | Occasional, from what is in front of you | The reaction under the entry or the viewer's info line, a link | 11 (navigate to a related item: a link in content, pushed with Back); teardown (f), Day One's tags filter the timeline from an entry's tag | The "Idea" under the entry |
| Add a reaction | Often, optional | The face with a plus, always | 15 (a short list from a menu), 0168 | The sign by the entry's time |
| Learn a choice failed | Rare | A line in words in the panel | 21 (a failure the person should know about: inline, why) | The panel they chose in |

## Deferred

- The cards' and bubbles' marks (`MomentCard`, `NoteBubble`) stay plain: the card is one button that opens the moment.
- Reactions as links outside Memories, unless the owner answers question 1 the other way.

## Steward

Five findings, all accepted into RL2-RL5 and RL9 (the spec's "Steward"): no rejection for you to weigh.

## Native (never run on a device)

- A mark as a `Pressable` inside the entry's own button on a phone (the screen reader's reach, as the memo's play
  control, `docs/DEFERRED.md`); the viewer closing then the lens opening inside the native Modal's dismissal.
- `setReactions` in one SQLite transaction through the write queue.
