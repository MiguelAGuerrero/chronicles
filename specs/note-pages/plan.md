# Note pages: the plan

For the owner to review before any code. Spec: `specs/note-pages/spec.md` (NP1-NP13). Decision 0149.

## Shape of the work

The editor is an established library, TipTap v3, running in an Expo DOM component. Markdown comes in and goes out
through `@tiptap/markdown`, the mention picker through `@tiptap/extension-mention`, and the typing shortcuts are
TipTap's own input rules. Our code is the glue: the page's frame (head, toolbar, autosave) in React Native, and a
plain-text reader in core that parses with `marked`, the same lexer `@tiptap/markdown` uses.

### Dependencies (installed with `EXPO_OFFLINE=1 npx expo install`, exact versions pinned)

| Package | Why |
|---|---|
| `react-native-webview` (the version Expo 58 pins), plus whatever `node_modules/expo/build/dom/*.d.ts` names | Expo DOM components on phones. Read from the installed `expo` before writing any code (AGENTS.md: Expo has changed) |
| `@tiptap/react`, `@tiptap/pm`, `@tiptap/core`, `@tiptap/starter-kit` | The editor: headings (levels 1 and 2), lists, blockquote, bold, italic, history (code, strike, link, underline, rule and code block turned off) |
| `@tiptap/extension-list` | Task lists (checklists) |
| `@tiptap/extension-mention`, `@tiptap/suggestion`, `@floating-ui/dom` (its peer) | `@` mentions; its suggestion opens the app's own `MomentPicker`, not a popup of its own |
| `@tiptap/markdown` | Markdown in and out of the body |
| `@tiptap/extensions` | Placeholder |
| `marked` (the major `@tiptap/markdown` uses) | Core's plain-text reader; added to `PURE_PACKAGES` in `scripts/layers.js` |

### Files

| File | What | Layer |
|---|---|---|
| `src/components/notePage/JournalEditor.tsx` (new, `'use dom'`) | TipTap with the extensions above; props: `markdown`, `editable`, `onChange(markdown)`, `onMentionQuery`, `onState(active formats)`; commands from the toolbar through Expo DOM's imperative handle. Styles in `theme` tokens only (NP11) | view |
| `src/components/notePage/mentionNode.ts` (new) | Mention's Markdown: `renderMarkdown` writes `@[id|words]`, a tokenizer reads it back (0125). The only parsing glue we write | view |
| `src/components/notePage/NotePage.tsx` (new) | The page: top bar (Back, the short head once scrolled, "Not saved yet", Done), the head (NP2), the editor, the room line (NP8). Read-only or writing. Drawn inside whichever Modal is open, never a Modal of its own (iOS: no Modal over a Modal) | view |
| `src/components/notePage/FormatBar.tsx`, `FormatPanel.tsx` (new) | Aa and @ above the keyboard (`useKeyboardHeight`, `KeyboardAvoidingView`); the panel (NP4) | view |
| `src/components/notePage/useNoteAutosave.ts` (new) | Runs `autosave.ts`'s effects through the screen's create, update and delete callbacks; flushes on blur and on AppState `background` (NP9) | view |
| `src/lib/notePage/autosave.ts` (new) | The reducer (`step(state, event, now)`): new and empty, created, dirty, saving, failed; a pause, leave, background, empty-on-leave → effects `create`, `save`, `deleteWithUndo`, `nothing` (NP9). A reducer because its timers, retries and phases tangle (functional-core rule) | core |
| `src/lib/notePage/context.ts` (new) | The head: the day, and the context line from Lately's words (`contextFor`); the short form (NP2) | core |
| `src/lib/notePage/room.ts` (new) | Characters as shown (a mention counts as its words), and "room left" in words (NP8) | core |
| `src/lib/notePage/plain.ts` (new) | `stripMarks(markdown)` with `marked`'s lexer: text tokens out, lines kept (NP10); `escapeLiteral(body)` for an older note opened on the page (NP7) | core |
| `src/lib/refs.ts` | `plainNote(body, format)` = `stripMarks(plainRefs(body))` when `format === 'md'`, else `plainRefs(body)` as today; every reader passes the capture's `body_format` (NP7, NP10) | core |
| `src/lib/types.ts`, `src/lib/db/{migrations,sqliteStore,index.web}.ts`, `src/lib/__tests__/fakes` | `body_format` (migration 25) | core, adapter |
| `src/components/notePage/` camera button | Calls the screen's own `takePhoto` (a new moment, `into` null) and inserts the mention when it is kept (NP14) | view |
| `src/lib/noteEdit.ts` | `NOTE_MAX` 20,000; `noteText` no longer trims inner structure | core |
| `src/lib/ceremony/rhythm.ts`, `components/ceremony/StepThrough.tsx` | The note's pause counts words via `plainNote`; the steps read 300 characters (NP10) | core, view |
| `src/components/MomentBar.tsx`, `src/app/walk.tsx` | The pencil opens `NotePage` in place of the card's Modal content (NP1) | view |
| `src/components/NoteEditor.tsx`, `threads/ReplyDock.tsx`, `CaptureView.tsx` | Respond → Note and Edit open `NotePage`; the viewer's note shows `NotePage` read-only (NP5). `NoteEditor` goes once nothing imports it | view |

Saving reuses the paths there are today: `useCaptures.saveNote` creates, and `onSaveNote` / `useCaptures.setNote` /
`captureBus.patch` update ("Edit a note", captures-and-media rule). Deleting goes through the one Undo window
(`deletion/`).

### Data

- **Truth:** a note is still a `Capture` of kind `text` whose `body` is text, up to 20,000 characters. One new field,
  `body_format: 'md' | null` (NP7, steward S10): set when the page writes the body; absent or null means literal.
  **SQLite migration 25** (`ALTER TABLE capture ADD COLUMN body_format TEXT`, appended to `MIGRATIONS`). **IndexedDB**
  stores the record whole, so no `VERSION` bump, as `thumb_path` did (migration 12). `updatePiece` takes it; a
  `dbContract.ts` case first (FC7). The backup bundle carries it. No tile code changes.
- **An older note opened on the page** is given to TipTap as escaped Markdown (`marked`'s escaping of `\`, `*`, `_`,
  `#`, `>`, `-`, digits followed by `.`), so it shows literally; its first save writes that Markdown and sets the mark.
  Opening without writing writes nothing.
- **Cache:** none. Threads found from words (0098) read `plainNote`, so notes without marks find the same threads.
- Saving as you write calls `updatePiece` about once a second while typing. The replay's story rebuilds on a note's
  change (replay rule, audit 22), but the page is never open over a playing replay (the viewer pauses it).

## Tests per criterion

New feature **`notes`**: folder `src/lib/__tests__/notes/`, a row in `scripts/features.js` (source
`src/lib/notePage/**`, `src/components/notePage/**`, `src/lib/noteEdit.ts`; rule `captures-and-media`; journey
`notepage`; spec `note-pages`). `chronicle/noteEdit.test.ts` moves there with `npm run move-test`.

| Id | Test | File |
|---|---|---|
| NP1 | journey: each pencil (ready, walk, band), Respond → Note and Add to this moment open the page in one tap with focus in it; the text written is one moment, placed, in the right walk or thread | `scripts/e2e/journeys/notepage.js` |
| NP2 | unit: the head for a placed, a placing and a placeless moment, on and off a walk, just after a photo, and a page being written; journey: the short head appears in the top bar after a scroll | `notes/context.test.ts`, journey |
| NP3 | journey: each shortcut typed becomes its element (`h1`, `h2`, `ul`, `ol`, `ul[data-type=taskList]`, `blockquote`, `strong`, `em`), Return and Backspace as said | journey |
| NP4 | journey: Aa and @ named, the panel's nine buttons named with `aria-pressed`, ≥ 44 px, no wrap at 320 px; each applies its format | journey |
| NP5 | journey: a seeded formatted note opens read-only, drawn, scrolls to its last line; a tap on a checkbox there changes nothing in the stored body; Edit opens it writable | journey |
| NP6 | journey: a tick on the page is kept after reopening; no digit, "of" or progressbar role on the page; no notification scheduled; unit: the resurface pick ignores boxes | journey, `notes/plain.test.ts` |
| NP7 | unit: `mentionNode`'s tokenizer and renderer round-trip `@[id|words]`; journey: a table of bodies (formatted, mention, plain old note, `~~`, a link, a table) opened and left unchanged keep their bytes; opened, written in and reopened, they show the same | `notes/mention.test.ts`, journey |
| NP8 | unit: counting as shown, the two lines at their thresholds, a mention refused past the limit | `notes/room.test.ts` |
| NP9 | unit: the reducer over every phase (pause, leave, background, empty new, emptied existing paused and left, a failure then a retry); journey: written text is in the store a second later with no tap; Back keeps it; an empty new page keeps nothing; an emptied note shows Undo | `notes/autosave.test.ts`, journey |
| NP10 | unit: `plainNote` over every mark, lines kept; resurface's extractors find no mark as a word; the rhythm's pause ignores marks; the steps' 300 characters and the line after them | `notes/plain.test.ts` |
| NP11 | journey: the page's computed colours are `theme.ink` and `theme.muted` only; no image, emoji, digit-with-"words" or prompt text; the placeholder is the one line | journey |
| NP12 | journey: the head first in reading order; roles and names (`heading`, `listitem`, `checkbox` with `aria-checked`); the editor's font size ≥ 16 px | journey |
| NP14 | journey: the page's camera (the e2e's file chooser, as `edit` does) keeps a separate moment with its own time; the note holds `@[that id|…]` at the cursor; a failed save (the journey's storage fault) adds no mention and shows Retry | journey |
| NP7 (data) | contract: `updatePiece` stores and reads `body_format` in every store; migration 25 over a database at 24 keeps every note's body and leaves the mark null | `src/lib/__tests__/storage/dbContract.ts` |
| NP13 | journey: the request log holds nothing beyond the app's own origin while a page with a URL is opened, written in and read; the URL is not an `a`; pasted HTML with an `img`, `iframe` and link leaves none in the page or the body | journey |

Journeys touched by the changed screens, run at the end as `check:affected` names them: `notepage` (new), `qol`
(Edit note), `capturehome`, `stacks`, `walk`, `threads`, `responses`, `replay`. Their note steps change from the card
(`note-input` + `note-save`) to the page (`note-page` with the same `note-input` on its editor, and Done).

## The screen: goal, frequency, control, matrix row

| Action | Goal and situation | Control | Matrix row, precedent |
|---|---|---|---|
| Start a note | Capture a thought; very frequent, walking | The pencil (unchanged) opens the page | 22, 5 ; Journal's + opens an entry (`ui-teardown.md` §2) |
| Write | Every page | The editor, focused, keyboard up | 18 (long text: full screen) |
| Format | While writing; occasional | Aa in a toolbar above the keyboard, opening a panel | Journal's "Format button" (§2, verified by name) ; T5 (icons with spoken names, one style in the bar) |
| Mention | While writing; occasional | @ in the toolbar, or typed: the existing picker | 16 |
| Take a photo mid-entry | Walking, something catches the eye; occasional | A camera in the toolbar beside Aa and @ | 22 (capture one tap); Journal's "Take Photo or Video button" in its toolbar (§2, verified by name) |
| Tick a box | Writing; occasional | The checkbox, 44 pt | 14 (effective at once) |
| Leave | Every page | Done (trailing, the one primary) and Back (leading); both keep | 18 ("Cancel and Done"), 23 |
| Remove what was written | Rare | Empty the page and leave, with Undo; or More → Delete in the viewer (unchanged) | 7 |
| Read | Opening a note | The viewer shows the page read-only; Edit in its toolbar (unchanged) | 1 |
| Know it saved | Passive | Nothing while it saves; "Not saved yet" in the top bar only on a failure | 19, 20 (no routine success), 21 |

The matrix's "Avoid" for row 18 is a popover on a phone; nothing here is one. Row 9 (ask before losing work) does not
apply, since nothing is ever lost.

## Deferred, and why

- **"Added to on Nov 30"**: words added weeks later carry the note's first time (steward, silent 1). Saying so needs a
  stored edit time, a data change of its own.
- **Selection across a whole page, drag to reorder, a "/" menu, links, tables, photos inline:** out by the owner's
  calls.
- **Undo of a whole session's writing:** TipTap's history covers the open page only.

## Native paths that will not run on a device

- The DOM component's WebView: focus and the keyboard on open (NP1), the toolbar above the keyboard on iOS and
  Android (NP4), scrolling to the cursor, a tick inside the viewer's Modal (NP5, NP6).
- Saving on AppState `background` (NP9).
- The page's camera handing back to the WebView with the keyboard and cursor where they were (NP14).
- The WebView's navigation lock (`onShouldStartLoadWithRequest`) and paste cleaning (NP13).
- Migration 25 on an existing SQLite database.
- Each goes into `docs/NATIVE_UNVERIFIED.md` as a `**Do:** … **Expect:** …` item.

## The steward's findings and their triage (first plan, Nov 12)

| # | Finding | Triage |
|---|---|---|
| S1 | Ticks on the moment's face (0114) | **Accepted**: ticks only on the page; in the viewer and the thread a tap on a box changes nothing (NP5, NP6, NP10) |
| S2 | Old notes reinterpreted as formatted | **Accepted** at the second pass (S10, the owner's call) |
| S3 | Canonical rewriting of `*` and numbers | **Yields to the library** (0149): `@tiptap/markdown` writes canonical Markdown on the first save in the page. What is shown never changes, and a note never written in keeps its bytes (NP7) |
| S4 | The head lacks time into the walk and what came before, and scrolls away | **Accepted** (NP2) |
| S5 | Nothing leaves the device | **Accepted** (NP13), more pressing with a web editor |
| S6 | A heading outside the page reads as a journal title | **Accepted** (NP10); no title field |
| S7 | Untestable wording | **Accepted**: NP8's thresholds and words, NP10's 300 characters, NP11's tokens; NP1 is now a journey of each entry point |
| silent 1 | Later words carry the first time | **Deferred** (above) |
| silent 2 | A long draft lost to a killed app | **Answered** by saving as you write (NP9) |
| silent 3 | Resurfacing could pick unticked lists | **Accepted** (NP6) |

## The steward's second pass (Nov 12, after decision 0149)

| # | Finding | Triage |
|---|---|---|
| S8 | A pause could store an emptied body | **Accepted** (NP9): a pause never writes an empty body; only leaving empty deletes, with Undo. The reducer test covers it |
| S9 | The stamp would move to the first save | **Accepted** (NP1): the page takes `stampNow` at the pencil's tap and hands it to `saveNote` |
| S10 | Older notes are re-read as Markdown in every reader at once | **Accepted by the owner** (NP7): a stored mark, migration 25 |
| S11 | NP13 tested only on the web | **Accepted** (NP13): the WebView's `onShouldStartLoadWithRequest` allows only its bundle; TipTap's paste rules keep only the page's schema (no `img`, `iframe`, link). The phone side goes into `docs/NATIVE_UNVERIFIED.md` |
| S12 | The camera is a tap further while writing | **Accepted by the owner** (NP14): a camera beside Aa and @ |
| S13 | The placeholder is a prompt | **Accepted** (NP11): "Start writing" |
| silent | iOS Writing Tools in WKWebView | **Deferred**: the system offers it on a selection the owner makes, which is a tap, not the app writing for them. Turning it off needs `writingToolsBehavior`, which react-native-webview may not expose; checked when the module is installed |
