# Reactions: the plan

For `specs/reactions/spec.md` (RX1-RX36), decision 0172. The owner reviews this before any code.

## For the owner: four calls the criteria assume

Each has a recommended answer; the spec is written to it.

1. **Where reactions live (data model).** Recommended: a `reaction` table of their own (moment, family, reaction,
   when set; one row per moment and family), read whole into a small in-memory map, the way the reminder bell reads
   the `recall` store (`useReminded`). Screens ask "what are this moment's reactions?" from that map; nothing about a
   moment's row or its load changes. The alternative, reactions folded into every moment as it loads, touches every
   read of a moment (SQLite's joined reads, IndexedDB's moment records) for no gain at this size.
2. **When two notes in one moment disagree** (two notes typed Happy and Sad in one stacked moment, in the data kept
   before). Recommended: the earliest note's type wins its family; the other is dropped. Typed notes that share a
   moment are rare (a stack of two notes); no other choice keeps more.
3. **The picker's shape.** Recommended: all three families at once, three short rows under their words (Feeling:
   three; Taste: two; Thought: three), opened from the face with a plus. A choice keeps the panel open, so Happy and
   Idea are two taps in one visit. One family at a time would add a step for every second reaction.
4. **Where lenses live.** Recommended: the journal's contents (top right), as **Reactions**, between Threads and
   Hidden; Reactions lists one row per reaction that has a moment; a row opens the lens. Search does not exist yet,
   and a "more like this" chip on every moment adds chrome to the moment.

## Defaults that make a control quieter (decision 0167, "Found before quiet")

- The face with a plus is wordless, as today (0168); it is ink at a target's size, and the panel names every reaction.
- The sign on a kept entry shows its **first** reaction's glyph only (not all of them): the reactions themselves are
  spelled out under the dateline (RX14), so the sign stays one target.
- Reactions on an entry, the viewer and a card are ink glyphs with their names in the app's small sans, not chips.
- Lenses sit in the contents, one tap from Memories, not on the page.

## Data

- **Truth, new:** `reaction (moment_id TEXT, family TEXT, reaction TEXT, set_at INTEGER, PRIMARY KEY (moment_id,
  family))`. SQLite: the next `MIGRATIONS` entry creates it and copies every `capture.note_type` onto its moment,
  earliest piece first per family (`INSERT OR IGNORE ... ORDER BY c.t`). `capture.note_type` is left in place, never
  read again (as `capture.walk_id` was). IndexedDB: `VERSION` 22, an `oldVersion < 22` step creating the `reaction`
  store (key `[moment_id, family]`, index `moment_id`) and walking the `moment` store's pieces to copy the types the
  same way. The fake store (`__tests__/fakes/memoryDb.ts`) and the Db contract gain the same.
- **Db contract:** `reactions(): Promise<StoredReaction[]>`; `setReaction(momentId, family, reaction | null, at)`
  (null deletes the row). `deleteMoments`, `deleteWalk` and Clear delete a moment's rows in the same transaction; the
  single native write queue is kept. Split out moves none (RX31).
- **Bundle:** `export/bundle` writes the moment's reactions beside it (RX32).
- **Nothing stored on a moment or a piece.** A new note no longer writes `note_type`; the note save path loses its
  type argument (`notePatch`, `saveNote`, every `onSaveNote(c, body, type)`; NY16 retires).

## Files

New
- `src/lib/reactions/core.ts` (`@layer core`): `REACTIONS`, `FAMILIES`, `reactionOf`, `familyOf`, `pick(set, tapped)`
  (RX5), `ordered(set)`, `signOf(set)` (RX9), `spokenReactions(set)` (RX16, RX21), `migrateTypes(pieces)` (RX29, the
  rule the two stores' steps follow and the unit test pins).
- `src/lib/reactions/lens.ts` (`@layer core`): `lensRows(all, kept)` (RX23) and `lensMoments(all, reaction, kept)`
  (RX24, RX26, RX27): the only code allowed to filter by a reaction (RX30).
- `src/lib/reactions/shell.ts` (`@layer shell`): `createReactions(ports)`: `load()`, `set(momentId, reaction)` (one
  write; the in-memory map updated after it, a failed write leaving it as it was), `hold(reactions)` / `keep(momentId)`
  for a new page's reactions waiting for its moment (RX13), `subscribe`. `index.ts` the app instance;
  `useReactions.ts` (`@layer view`) a moment's set, re-rendered on change.
- `src/components/reactions/ReactionPanel.tsx`: the three families, each reaction a glyph and its name; used above the
  journal's bar, in an entry's More sheet, in the viewer's More, on a note's page.
- `src/components/reactions/ReactionMarks.tsx`: a moment's reactions as glyphs and names (entry, viewer, bubble, card).
- `src/components/reactions/ReactionsScreen.tsx` and `LensScreen.tsx`: the contents' Reactions and a lens (built as
  `ThreadScreen` is, inside `MemoriesScreen`, with its Back); the lens opens the viewer with `position={false}` (RX25).

Changed
- Journal: `Entry.tsx` (the sign on any entry today, RX9; marks under the dateline, RX14), `OpenLine.tsx` (the panel
  above the bar, RX6-RX8), `MemoryMenu.tsx` (Reaction, RX10), `MemoriesScreen.tsx` (wiring; the lens and its viewer).
- `MemoriesMenu.tsx` (Reactions row, RX22).
- `CaptureView.tsx` (marks under the info line, More's Reaction, no mark above a note's page; RX11, RX15).
- `notePage/NotePage.tsx`, `NewNotePage.tsx`, `NoteTypeMenu.tsx` (becomes the panel; RX12, RX13).
- `threads/NoteBubble.tsx`, `chronicle/MomentCard.tsx` (RX16).
- `lib/pins.ts` (`pinReactions(pin, sets)`: a single moment's set, none for several, RX17, RX19; `pinMark` and
  `pinNoteLabel` go), `components/icons.tsx` (`captureIcon` by kind only, RX18), `map/WalkMap.web.tsx`,
  `WalkMap.native.tsx` (`CapturePinView`'s bubble row, its key and spoken name, RX17-RX21).
- `lib/noteEdit.ts`, `lib/captureBus.ts` (no `note_type` patch), `lib/moment.ts` (no `note_type` read),
  `db/sqliteStore.ts`, `db/index.web.ts`, `db/migrations.ts`, `db/types.ts`, `types.ts`.
- Gone: `lib/noteType.ts`, `lib/noteTypeChoice.ts`, `components/NoteMark.tsx` (their tests move to `reactions/`).
- `scripts/features.js`: a `reactions` feature (folder `src/lib/__tests__/reactions/`, its files, journeys `reactions`,
  `journal`, `notepage`, `threads`, `qol`; spec `reactions`); `note-types` criteria NY1-NY27 retired, "superseded by
  reactions (decision 0172)"; `IN_PROGRESS` while built.
- Docs: `docs/PRODUCT.md` (Memories, the viewer, the map), `docs/ARCHITECTURE.md` (data model, the files),
  `.claude/rules/captures-and-media.md`, `map.md`, `memories.md`, `storage.md`; `docs/STATUS.md` by `npm run records`.

## Tests per criterion

| Ids | Where | Name |
|---|---|---|
| RX4, RX5, RX33 | `reactions/core.test.ts` | the set and its order; one per family, replace, clear; no function takes a moment's words, place or time |
| RX9, RX16, RX21 (words) | `reactions/core.test.ts` | the sign; spoken lists in the families' order |
| RX23, RX24, RX26, RX27 | `reactions/lens.test.ts` | rows only for reactions with a kept moment, no number in any row; oldest first; deleted and cleared leave; only reactions select |
| RX8, RX13 | `reactions/shell.test.ts` (`fakePorts()`) | a choice written at once; a new page's choices wait and are written when kept; a page with no words writes none; a failed write leaves the map |
| RX28, RX31, RX32 | `dbContract.ts` (fake, IndexedDB, SQLite over `node:sqlite`), `captures/bundle.test.ts` | set, replace, clear, read; no moment row changes; cascades after Undo; split out takes none; the bundle keeps them |
| RX29 | `reactions/migrate.test.ts` (both stores, from a store opened at the old version) | every type moves; the earliest note wins its family; a moment with one typed note loses nothing |
| RX30, RX35 | `reactions/readers.test.ts` | the allowlist of files that may import reactions; no place, route, area, discovery, landing, walkability, resurface, replay, summary or day file; only `lens.ts` filters |
| RX36 | `reactions/core.test.ts` and the `reactions` journey | one ink colour in every glyph and bubble's computed style; the chosen row has no background tint |
| RX17, RX18, RX19 (logic) | `map/pinReactions.test.ts` | a single moment's set in order; none for several; the head's icon by kind |
| RX1, RX6, RX7, RX9, RX10, RX14, RX34 | `reactions` journey (new) and `journal` | react to a photo's entry by the sign; the panel's rows and names; writing goes on; More's Reaction; marks under the dateline; 320 px and 200% |
| RX2, RX22-RX26 | `reactions` journey | contents → Reactions → Ideas; no digits; open, step, Back; clear and it leaves |
| RX3, RX17-RX21 (screen) | `reactions` journey (walk screen and Chronicle's Map) | bubbles' boxes clear of bell, clock and video mark; same element after a change; spoken name |
| RX11, RX15 | `reactions` journey | viewer More → Reaction on a photo; marks under its info line |
| RX12, RX13 | `notepage` journey | the Reaction tool on an edit and on a new page; Respond's page has none |
| RX16 | `threads` journey | a bubble and a card show their reactions |

The journeys `qol`, `journal`, `notepage`, `threads` and `responses` carry NY checks today; each is changed to the RX
check that replaces it, or the check is dropped with its NY id retired.

## UI: goals and controls (matrix: `docs/research/ui-references.md`, section 2)

| Action | Goal, how often | Control | Matrix row; precedent | Where the owner looks first, and sees |
|---|---|---|---|---|
| React while writing | Mark why, at the moment; often, optional | The face with a plus at the end of the entry's dateline, opening a panel above the bar | 15 (pick from a short list: a menu); teardown (f), Day One's tags from the editor's More, toggled off by a tap | The entry being written: the face with a plus beside its time |
| React to a kept entry today | Same, after Done | The same sign on the entry | 4 (a shortcut on an item in a list), with More as the route that is not a shortcut | The entry: the sign, or the glyph of its first reaction |
| React to any entry | Occasional, older moments | More → Reaction | 3 (a rare secondary action in More) | The entry's ⋯ |
| React in the viewer | Occasional | More → Reaction | 3 | The viewer's ⋯ |
| React on a note's page | While writing a long note | The Reaction tool in the page's bar | 1 (act on the item being viewed: a symbol button in the toolbar, labelled) | The bar above the keyboard, where Type was |
| Gather a reaction's moments | Occasional, on purpose | Contents → Reactions → a row | 11 (navigate to a related item: a row with a disclosure, pushed with Back); teardown (f), "Counts on collections: leave them out" | The contents' button, top right of Memories |
| Read a pin's reactions | At a glance | Bubbles at the pin's bottom-left | 19 (a status that needs no action, near what it describes); RB1's bell | The pin itself |

Matrix departures: none. The panel above the bar is the one NY19 already built, and its audit settled it.

## Deferred

- A lens narrowed by location, Emphasis offering a reminder, a Question asking again: each a later slice, gated (0172).
- Reactions in search: there is no search yet.
- Reactions on the slip, gallery tiles, response entries and the @ picker (the spec's surfaces table says why).

## Native (never run on a device)

- SQLite migration (the table and the copy of note types) on a phone with notes kept by an older build.
- The pin's bubble row on `WalkMap.native.tsx` (a Marker's child view; re-keyed on change as the bell is).
- The panel above the keyboard on iOS and Android.

Each becomes a `- [ ] **Do:** … **Expect:** …` item in `docs/NATIVE_UNVERIFIED.md`.

## Steward

Nine findings (one breach, seven drifts, one tone), triaged in the spec: seven accepted into RX16, RX20, RX21, RX24,
RX25, RX30, RX35 and RX36; two (steward 6, 9) and one silence (the replay's map) put to the owner below the four calls.

## Size

Large: one model, one migration, eight surfaces, a new journey. Built in this order, each green before the next: the
model and storage (RX4, RX5, RX28-RX33), the setting surfaces (RX6-RX13), the showing surfaces (RX14-RX16), the pins
(RX17-RX21), the lenses (RX22-RX27), then RX1-RX3 and RX34 with the cold find.
