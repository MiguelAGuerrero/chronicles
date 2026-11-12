# Note pages: the plan

For the owner to review before any code. Spec: `specs/note-pages/spec.md` (NP1-NP13).

## Questions for the owner (answer before code)

1. **The editor's technology (architecture).** React Native has no rich-text input: a `TextInput` shows one style.
   - **A. A page of native lines (recommended).** Each line of the note is its own `TextInput`, styled by its kind:
     heading, bullet, numbered, checkbox or quote. This is how Notion's own mobile editor is built: blocks. No new
     dependency. It works the same on iPhone, Android and the web (each line is a textarea). Two limits: bold and
     italic show their `**` and `_` while that line is being typed and are drawn when reading or once the cursor
     leaves the line; and you cannot drag one selection across several lines (selection is per line).
   - **B. A web editor inside the page.** Expo's DOM components (`'use dom'`), which on a phone means a WebView,
     with Lexical or TipTap. True inline bold while typing, and selection across lines. The costs are two new
     dependencies, a WebView per open note, mentions bridged across the boundary, and keyboard and focus behaviour
     that has never run on a phone. It also departs from "native first" (AGENTS.md) and would need an entry in the
     web exceptions.
2. **A title.** The vision is silent. Recommended: **no separate title field**. The context line (NP2) heads the
   page. A first line written as a heading is only the first words where they show, at the row's size (NP10).
3. **A draft through a closed app.** Recommended: **deferred**. Today a draft survives only while the app is open, as
   the card's does. A long entry lost to a killed app hurts more than a lost line, so this is the first follow-up
   (`docs/DEFERRED.md`). Keeping a draft in `meta` as it is typed would be a few hours more in this slice.

## Shape of the work

The note's body stays one string (Markdown subset). One core module reads it into lines and writes it back. The
page edits lines. Every other screen keeps reading the body through `plainNote`, which now also drops the marks.

### Files

| File | What | Layer |
|---|---|---|
| `src/lib/notePage/blocks.ts` (new) | `parseNote(body) -> Line[]` and `writeNote(Line[]) -> body` (kinds: text, h1, h2, bullet, numbered, check {done}, quote); inline runs (bold, italic, mention token, plain); the subset and nothing else (NP7) | core |
| `src/lib/notePage/edit.ts` (new) | The page's reducer, `step(state, event)`: typing in a line (shortcuts, NP3), Return (split, continue or end a list), Backspace at a line's start (unformat or join), a bar button (NP4), a tick (NP6), a mention picked, the limit (NP8) | core |
| `src/lib/notePage/room.ts` (new) | Characters as shown (mention = its words) and "room left" in words, never a number (NP8) | core |
| `src/lib/notePage/context.ts` (new) | The head line from a moment's time, place and walk, or a draft's "now" and walk (NP2); built on `refCardLine` and `fromLine` | core |
| `src/lib/refs.ts` | `plainNote` also drops the marks (`stripMarks`, from `blocks.ts`), so every reader in NP10 changes in one place | core |
| `src/lib/noteEdit.ts` | `NOTE_MAX` 500 → 20,000; `noteText` keeps the body's line structure (QL25 amended) | core |
| `src/lib/ceremony/rhythm.ts` | A note's pause counts its words through `plainNote`, not its marks (NP10) | core |
| `src/components/notePage/NotePage.tsx` (new) | The full page: head (NP2), lines, the bar, Done, Back; read and edit modes (NP5, NP9). Drawn inside whichever Modal is open, never as a Modal of its own (iOS: no Modal over a Modal) | view |
| `src/components/notePage/NoteLine.tsx` (new) | One line: its `TextInput` while editing, its drawn form while reading; the checkbox (NP6, NP13) | view |
| `src/components/notePage/FormatBar.tsx` (new) | The bar above the keyboard (NP4); `InputAccessoryView` on iOS, pinned above `useKeyboardHeight` on Android and the web | view |
| `src/components/notePage/NoteRender.tsx` (new) | The read-only drawing, shared by the page and the owner's thread's bubble (NP5, NP11) | view |
| `src/components/NoteEditor.tsx` | Expand (NP1); Edit on an existing note opens the page straight away | view |
| `src/components/MomentBar.tsx`, `src/app/walk.tsx` | The quick card's Expand (NP1); the page in the same Modal; limit from `NOTE_MAX` | view |
| `src/components/CaptureView.tsx`, `threads/ReplyDock.tsx` | A note in the viewer shows `NoteRender` in a scroll (NP5); ticks save through `onSaveNote` (NP6) | view |
| `src/components/threads/NoteBubble.tsx`, `OwnThreadScreen.tsx` | The bubble draws `NoteRender` (NP11) | view |

No new shell: saving goes through the existing `onSaveNote` / `useCaptures.setNote` / `captureBus.patch` paths
(captures-and-media rule, "Edit a note").

### Data

- **Truth:** unchanged. A note is still a `Capture` of kind `text` whose `body` is text; only what the text may
  contain grows (the Markdown subset, up to 20,000 characters).
- **Cache:** none. No SQLite migration, no IndexedDB version bump. No tile code changes (`SNAP_RULES`,
  `STREET_CODE` and `LANDING_CODE` stay).
- The Chronicle's threads read words from `plainNote`. Marks are dropped before words are found, so threads already
  found are unchanged for notes with no marks.

### The subset (NP7)

Line starts: `# `, `## `, `- `, `* `, `1. ` (any number, shown as typed), `- [ ] `, `- [x] `, `> `. Inline:
`**bold**`, `_italic_`, the mention token `@[id|words]`. Anything else is text. Each line keeps the marker it was
typed with, so any body round-trips byte for byte (NP7, steward S3). A shortcut typed on the page writes `- `,
`1. `, `- [ ] `.

## Tests per criterion

New feature **`notes`**: folder `src/lib/__tests__/notes/`, a row in `scripts/features.js` (source
`src/lib/notePage/**`, `src/components/notePage/**`, `src/lib/noteEdit.ts`; rule `captures-and-media`; journey
`notepage`; spec `note-pages`). The QL25 test moves with `noteEdit.ts`, via `npm run move-test`.

| Id | Test | File |
|---|---|---|
| NP1 | journey: the pencil's card Saves in one tap (unchanged); Expand carries text, cursor and a mention; Done keeps it as one moment | `scripts/e2e/journeys/notepage.js` |
| NP2 | unit: the head line for a placed, a placing and a placeless moment, on and off a walk, and a draft; no digit but date and time | `notes/context.test.ts` |
| NP3 | unit: each shortcut, Return continues and ends a list, Backspace unformats; journey: `# ` typed shows a heading | `notes/edit.test.ts`, journey |
| NP4 | unit: each bar event toggles its kind or mark; journey: the bar's eight named buttons, pressed state, no wrap at 320 px | `notes/edit.test.ts`, journey |
| NP5 | journey: a seeded formatted note opens read-only, drawn, scrolls to its last line; Edit and a tap enter editing | journey |
| NP6 | unit: a tick toggles only that line's `[ ]`/`[x]`; journey: a tick in reading is kept after reopening; no digit or "of" near the page; no notification scheduled | `notes/edit.test.ts`, journey |
| NP7 | unit: round trip over a table of canonical notes; a plain old note is unchanged; `~~`, links and tables are kept as typed; mention tokens survive | `notes/blocks.test.ts` |
| NP8 | unit: counted as shown; room words at the thresholds; the limit refuses input and a mention past it (DEFERRED 12) | `notes/room.test.ts`, `notes/edit.test.ts` |
| NP9 | journey: Back on a new page returns to the card with the draft; Back after an edit asks, Discard leaves it unchanged; a failed save keeps the page (save forced to fail in the page's own seam) | journey |
| NP10 | unit: `plainNote` over every mark; threads (resurface extractors) find no `#`/`[x]`/`**` word; the rhythm's word count ignores marks | `notes/plain.test.ts` (plus one case in `resurface/`) |
| NP11 | journey (`threads`): a formatted note in the owner's thread draws a heading and a ticking checkbox | `scripts/e2e/journeys/threads.js` |
| NP12 | journey: no colour other than ink on the page's text, no image or emoji in the head, the placeholder only | journey |
| NP14 | journey: no request leaves the page's origin while a page with a URL is opened, edited and read (the journey's request log) | journey |
| NP13 | journey: each line's role and name (`heading`, `checkbox` with `aria-checked`), the head first in order; inputs ≥ 16 px | journey |

Journeys likely touched by changed testIDs, run at the end only as `check:affected` names them: `notepage` (new),
`threads`, `responses`, `qol` (QL24, QL25 edit a note), `capturehome`, `stacks`, `walk`. Existing testIDs
(`note-input`, `note-save`, `note-editor`, `note-edit-input`, `note-edit-save`) are kept.

## The screen: goal, frequency, control, matrix row

| Action | Goal and situation | Control | Matrix row, precedent |
|---|---|---|---|
| Expand the card | Mid-capture, a line is turning into more; occasional | A labelled "Expand" button in the card's action row, beside Close and Save | 18 (long text: a full-screen dialog) ; Apple Journal's entry is full-screen |
| Done | Keep the page; every page | The top bar's trailing "Done" (one primary action) | 18 ("Cancel and Done", iOS) ; 1 |
| Back / Close | Leave; every page | Top bar's leading Back (a chevron with a spoken name), system Back, Escape | 23 ; 9 (asks only with changes) |
| Discard or keep editing | Leaving with changes; rare | A dialog of two actions, "Discard changes" and "Keep editing" | 9, 6 (two choices: basic dialog) |
| Format a line or words | While writing; frequent on long entries | The bar above the keyboard: eight icon buttons, each named (X4), scrolling sideways | Apple Journal's "Format button" in its toolbar (`ui-teardown.md` §2, partly verified); rule T5 (icons only, consistent within the bar) |
| Tick a checkbox | Reading or writing; occasional | The checkbox itself, 44 pt target | 14 (state on tap, no separate Save) |
| Mention a moment | While writing; occasional | `@` typed, or the bar's Mention: the existing picker | 16 (a long list with search) |
| Edit from reading | Reading a note; occasional | The viewer's toolbar Edit (exists), or a tap on the words | 1 |

Nothing here is a control the matrix says to avoid. On Android, Material asks "Save" rather than "Done" for a
full-screen dialog's confirm (row 18). The app is one design on both platforms, so **Done** is kept. The steward or
the owner may ask for "Save".

## Deferred, and why

- **A draft that outlives a killed app** (question 3, if the owner agrees).
- **Selection across lines, drag to reorder, a "/" menu, toggles, dividers, tables, links:** out by the owner's call
  (structure), or past the subset.
- **Undo and Redo across lines:** each line keeps its own platform undo. One history for the page is a follow-up.
- **Inline bold and italic drawn while their line is being typed** (only with option A).
- **Searching inside a long note's formatting:** the picker searches its words (marks dropped), not its structure.

## Native paths that will not run on a device

- `InputAccessoryView` for the bar on iOS; the bar above the keyboard on Android (`adjustResize`).
- A page of many `TextInput`s: focus moving from line to line on Return and Backspace, and scrolling to the focused
  line while the keyboard is up.
- Ticking a checkbox inside the viewer's Modal on iOS.
- Each goes into `docs/NATIVE_UNVERIFIED.md` as a `**Do:** … **Expect:** …` item (NP1, NP3, NP4, NP6).

## The steward's findings and their triage

Seven findings (six drifts, one tone; no breaches), Nov 12.

| # | Finding | Triage |
|---|---|---|
| S1 | Ticks and tap-to-edit on the moment's face (0114) | **Accepted in part.** The owner's thread's bubble never ticks (NP11). Ticking in the viewer while reading goes **to the owner** (spec, "Waiting on the owner"). A tap on the words only enters editing and changes nothing, by the owner's call (Nov 12); it is recorded as a decision beside 0114 when the build starts |
| S2 | Old notes reinterpreted as formatted | **To the owner**: keeping them literal needs a mark on the notes the page saved (a data model call) |
| S3 | Canonical rewriting of `* ` and numbers | **Accepted**: byte-for-byte round trip, markers and numbers as typed (NP7) |
| S4 | The head lacks time into the walk and what came before, and scrolls away | **Accepted** (NP2): Lately's words; a short head stays in the top bar |
| S5 | No criterion for nothing leaving the device | **Accepted** (NP14) |
| S6 | A heading outside the page reads as a journal title | **Accepted** (NP10): the row's own size, after place and time. Question 2 no longer calls a heading the page's "name" |
| S7 | Untestable wording | **Accepted**: NP1 names its green tests, NP8 its thresholds and words, NP10 the replay's 300 characters, NP12 its tokens |
| silent 1 | Words added weeks later carry the original time | **Deferred** to `docs/DEFERRED.md`: saying "added to on Nov 30" needs a stored edit time, a data model change of its own |
| silent 2 | A long draft lost to a killed app | Question 3 |
| silent 3 | Resurfacing could pick unticked lists | **Accepted** (NP6) |
