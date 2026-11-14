---
paths:
  - "src/lib/reactions/**"
  - "src/components/reactions/**"
  - "src/lib/__tests__/reactions/**"
  - "src/components/journal/{OpenLine,Entry}.tsx"
  - "src/components/chronicle/MemoriesScreen.tsx"
  - "src/components/CapturePinView.tsx"
---
# Reactions

Why a moment mattered, chosen by the owner, on any moment (decision 0176, which replaced note types, 0161). The spec is
`specs/reactions/spec.md` (RX1-RX36); the codemap is in `docs/ARCHITECTURE.md`.

## The model, the store, where they are set and drawn (RX1-RX36)

- **Truth of their own** (`reaction` table, SQLite migration 29, IndexedDB 22: `moment_id`, `family`, `reaction`, `set_at`, one row per moment and family), never a field of the moment or a piece. Note types (0161) became reactions: both upgrades moved each kept `note_type` onto its moment, the earliest note winning its family; `capture.note_type` stays in the table, never read or written again. `deleteMoments` and `deleteWalk` take a moment's rows; Split out takes none; the bundle writes each moment's set.
- **Eight in three families, one per family** (`lib/reactions/core`: `REACTIONS`, `FAMILIES`, `pick`, `ordered`, `signLabel`, `setsOf`, `migrateTypes`): Feeling (Happy, Neutral, Sad), Taste (Like, Dislike), Thought (Question, Emphasis, Idea). A tap replaces its family's, the same one clears it.
- **Read whole, as the bell reads reminders** (`lib/reactions/shell`, its instance `reactions`, `useReactions(momentId)` and `useReactionSets()` for a map): `choose` writes first and changes the map after, so a failed write shows nothing and sets `notKept`, which every `ReactionPanel` given its `moment` says as "Not kept yet", in ink at its top (`reaction-links ui 2`), until the next choice or the panel closes (RL9); a new note's page `hold`s its choices under its key and `keep`s them on the moment it was kept as (`drop` when it kept nothing, a no-op once `saving(key)` said its first save is on its way, RL11). **A moment's changed rows go in one `db.setReactions` call**, one transaction on every store (RL10): never a loop of `setReaction`.
- **Where they are set**: the face with a plus (`ReactionSign`) on the entry being written (above the bar, `OpenLine.react`) and on today's entries (More, the reactions alone); More's Reaction on every entry; the viewer's More (`viewer-reaction`, a panel inside the viewer, never a Modal on its Modal); the Reaction tool on a note's page (`NotePage`'s `reaction`; never Respond's page). Every one is `ReactionPanel`: three rows, a choice leaves it open.
- **Where they are drawn**: `ReactionMarks` (glyph and name, ink; white on the viewer's dark strip) under an entry's dateline, under the viewer's info line, after a card's or a bubble's words; a pin of one moment wears ink bubbles from its head's bottom-left (`pinReactions`, `CapturePinView`), faint on a memory pin, said after its kind. The head is always the kind (`captureIcon` by kind only). Never on the slip, a gallery tile, a response entry, the replay's cards or a memory's preview.
- **A reaction is a link to its lens only in Memories** (decision 0177, RL1-RL5): `ReactionMarks` with `onOpen` draws each mark as a 44 px `Pressable`, role link, named by its lens, its word underlined in ink (the cold find, `reaction-links ui 1`: without it the word read as a label); a plain mark has no underline. `Entry` passes `onLens`; Memories' journal and lens viewers pass `CaptureViewer.onLens`, which closes the viewer first. Never from the slip's viewer, the replay's step-through or a viewer outside Memories (the walk screen, a day, Chronicle's Map, Navigate, Media): there they are words. A lens opened from an entry or a viewer goes Back to the journal; from the Reactions list, to the list.
- **A video's pin** wears its bubbles in an L (`reactionSpots`, RL12): two along the bottom-left, the third above the first, clear of the play mark.
- **An entry right under a date starts below the date's edge** (`JournalPage`'s `underDate`, RL8), and so does the peek's first entry under the held date: the edge has no pointer events, so the e2e measures it rather than hit-testing.
- **Only the lens gathers by reaction** (`lib/reactions/lens`: `lensRows`, `lensMoments`, oldest first, no count): the journal's contents → Reactions → a lens; its viewer has no position. `reactions/readers.test.ts` lists every file that may mention reactions and keeps them out of places, routes, areas, discovery, landing, walkability, resurfacing, the replay and recall: a new reader goes through `/vision` and then onto that list.

## Reactions in the journal (RX6-RX10, RX14; decision 0176)

- **Opt-in, never a step.** Nothing about reactions shows on the entry being written before its first character (RX6). Then `reaction-slot` (`ReactionSign`) sits at the end of its dateline; a tap asks `OpenLine` (`react({ moment })`) to open `ReactionPanel` above the bar's row: three rows under Feeling, Taste and Thought, each a glyph over its name. A choice is kept at once (`reactions.choose`) and leaves the panel open for another family (RX7); the next character, the sign again or Done closes it. **Never put them in the bar's own row:** the bar keeps the camera, the mic and Done in their places (note-types audit 56). They belong to the entry on the screen in front (`asking`, keyed by the pen's moment), so a closed entry or a menu takes them away.
- **The sign is the face with a plus, in ink, always** (decisions 0168, 0177; RL6, RL7): what is chosen shows only under the time; it says everything chosen, "Reaction, Happy, Idea" or "Reaction, none". The page's Reaction tool is the same face. The page the line opens into carries the Reaction tool on the same moment.
- **An entry kept today offers the same sign on its row, any kind** (RX9, the owner's "only today"): it opens More on the reactions alone (`onlyType`). An earlier day's entry offers none; its reactions change from More's Reaction. Every other way into More resets `onlyType`.
- **Reactions are the moment's, not a note's**: `MemoriesScreen` passes More `reaction` for every entry; nothing goes through `resurface.saveNote`.
