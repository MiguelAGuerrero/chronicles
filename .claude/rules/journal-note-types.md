---
paths:
  - "src/components/journal/{OpenLine,Entry}.tsx"
  - "src/components/chronicle/MemoriesScreen.tsx"
  - "src/components/NoteMark.tsx"
  - "src/components/notePage/NoteTypeMenu.tsx"
  - "src/lib/__tests__/captures/typePick.test.ts"
---
# The journal: a note's type

## A note's type in the journal (note types NY18-NY25, Nov 13)

- **Opt-in, never a step.** Nothing about a type shows before the first character. The entry being written has a `type-slot` at the end of its dateline; a tap asks `OpenLine` (its handle, `pickType`) to open the eight above the bar's row (`type-row`: two rows of four, each a glyph over its name); the next character, a pick, the slot again or Done closes them. **Never put them in the bar's own row:** the first build did, as glyphs alone, and it had no names, no way out, 38 px targets at 320 and type buttons where Done, the mic and the camera came back under the same finger. They belong to the note being written on the screen in front (`asking`), so a closed entry or a menu takes them away. The word is "Type", never "stamp" or "reaction".
- **The slot is a sign, in ink** (NY26, decision 0168): a face with a small plus while unmarked, the type's glyph once marked, and no word. The first build's bare grey tag was not found on the owner's phone (0167). **Every page a note opens into carries the Type tool**: the page the line opens into too (`lineType` in `OpenLine` holds what was last asked or picked), not only a new one.
- **A note kept today offers the same sign on its row** (NY27, the owner's "only today"): `entry-react`, which opens More on the eight alone (`onlyType`). An earlier day's entry offers none; its type changes from More. Every other way into More resets `typeOnly`.
- **`MemoriesScreen` saves it** with `resurface.saveNote(..., typeOnly)`, which patches the page's moments at once; `OpenLine` only shows the row and reports the pick.
- **A typed note draws `NoteMark` above its words** (glyph and name), while it is written and once kept, so Done moves nothing; a bare glyph beside More read as a button. More has Type, with `NoteTypeMenu` alone in the same sheet under a heading. A response's page has no Type tool (NY15): `NewNotePage` takes `typed` from capture surfaces only.
