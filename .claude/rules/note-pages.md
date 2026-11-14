---
paths:
  - "src/lib/notePage/**"
  - "src/components/notePage/**"
  - "src/lib/{noteEdit,noteType,noteTypeChoice,refs}.ts"
  - "src/components/NoteMark.tsx"
  - "src/lib/__tests__/notes/**"
  - "src/lib/__tests__/captures/{noteSave,noteType,noteTypeReaders,noteTypeScan}.test.ts"
---
# Captures: a note is a page, and its type

- **A note is a page** (note pages NP1-NP14, decision 0151; it replaced the note card and `NoteEditor`). The pencil (Navigate's
  `MomentBar`, the walk's `walk.tsx`, Memories' open line through Open as a page, `journal/OpenLine`), Respond → Note (`ReplyDock`) and Add to this moment open
  `NewNotePage` in a non-transparent `Modal`; the viewer's Edit opens `NotePage` inside its own Modal (iOS: never a Modal
  over a Modal), and the viewer reads a note as `NoteReader` (`CaptureContent`'s `note` prop). The editor is TipTap in an
  Expo DOM component (`notePage/JournalEditor.tsx`, `'use dom'`: plain DOM on the web, `@expo/dom-webview` on phones),
  whose default export must be a plain function taking `ref` as a prop (lint `expo/use-dom-exports`); everything it
  takes or gives back is JSON, and its handle (`format`, `insertMention`, `focus`) takes JSON arguments.
  - **The document** is `lib/notePage/schema.ts` (adapter): StarterKit without code, link, strike, underline or rule;
    task lists; the mention as `@[id|words]` (0125) through its own Markdown tokenizer; a paragraph's leading `#`, `1.`,
    `-`, `>` kept as text. `toDoc(body, format)` reads a body the page wrote (`body_format` 'md') as Markdown and any
    other note literally (a paragraph per line); `toBody` always writes Markdown. Unit tests run it in Node.
  - **Words elsewhere** come from `plainNote(body, body_format)` (`lib/refs.ts`), which drops the marks of a page with
    `marked`, the lexer `@tiptap/markdown` uses (a pure package in core). Every reader of a note passes `body_format`;
    one that doesn't reads a page's marks as words.
  - **Saving as it is written** is `lib/notePage/autosave.ts`'s reducer, run by `NotePage`'s `useAutosave`: a pause of
    `NOTE_SAVE_PAUSE`, leaving, the background; an emptied page never writes an empty body, and only leaving it empty
    deletes (`deleteNoteNow`, with Undo). A new note is stamped at the tap (`useCaptures.beginNote`) and kept by
    `keepNote`; every host's `onSaveNote` stores `notePatch(body)` (the body and `body_format: 'md'`).
  - **Ticks only on the page**: TaskItem's `onReadOnlyChecked` refuses while reading (the steward's S1, 0114).
  - **On a phone, nothing loads** (NP13): the DOM document adds a Content-Security-Policy meta when `IS_DOM`; the
    schema has no image, frame or link, so a paste keeps none. `@expo/dom-webview` can't refuse a navigation.
  - **Leaving** (the audit): Done is the one way out; Escape and system Back go through `requestClose` and keep too. The page
    closes only once what is written is kept (`closable`): a failed save keeps it open, "Not saved yet" in its top bar.
  - **Mentions** read as cards in the reader (RF4): `useMentionCards` gives JSON to the DOM, drawn by TipTap's
    `ReactNodeViewRenderer` under a React context; while writing, a chip. A gone moment's token is relabelled by `withGone`.
  - **E2E:** `E2E_ONLY=notepage`. The editor is a contenteditable: `fill()` works, `inputValue()` doesn't (read
    `innerText()`); the page is `note-page`, Done `note-done`, the body `note-input` being written and `note-text` read
    (a reply's page sits over a read note). The web's viewer takes no Escape: leave a page in the viewer by Done.
- **Note types** (NY1-NY17, decision 0161): `Capture.note_type` (SQLite migration 27, IndexedDB 20; raw as stored, read through `noteTypeOf`, so an unknown value is no type) is the owner's mark on a note: one of eight ink glyphs in `lib/noteType` (fixed order, spoken names). The note's page offers a Type tool in its bar only for an edit (`NotePage` given `type` and `onType`; never a new note's page or Respond's), opening `NoteTypeMenu`; a choice is kept at once through `onSaveNote(c, body, type, typeOnly)`. `notePatch(body, type, typeOnly)` (`lib/noteEdit`) is the one write: text and type together, or, `typeOnly`, the type alone (the body and its `body_format` stay as kept). Every `onSaveNote` call passes it on (`noteTypeScan.test` fails a call site that takes two arguments). `NoteMark` draws the glyph and name above the viewer's note and in the owner-thread bubble; `captureIcon` and `pinMark` put it on a pin of exactly one note (a pin of several keeps its count). Never count, sort, filter, search or infer a type, and never read one for a place (NY12, NY13): `noteTypeReaders.test` lists the files that may mention a type; a new reader goes through `/vision` and then onto that list.
  - Since `tend map T14` a pin of several shows its kinds fanned and says them in words, never its count (`map.md`, "A pin of several moments").
  - **A note save names its piece** (note-types audit 1, 12, 13): screens, the bus and `applyPatch` take `c.piece_id` (as voice trim's edits do); `patchFaced` (`lib/moment`) applies it: on the row's copy of that piece in `pieces` always (what a reopened stack and a split read), and on the face's own fields only when the piece is the face. Never patch a row's face fields from a note shown at another piece. A spoken label says the type only where its mark is drawn (`momentSpoken(..., typed)`).
