---
paths:
  - "src/lib/notePage/**"
  - "src/components/notePage/**"
  - "src/lib/{noteEdit,refs}.ts"
  - "src/lib/__tests__/notes/**"
  - "src/lib/__tests__/captures/noteSave.test.ts"
---
# Captures: a note is a page

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
- **A note save names its piece** (note-types audit 1, 12, 13; a moment's reactions are their own records, decision 0176): screens, the bus and `applyPatch` take `c.piece_id` (as voice trim's edits do); `patchFaced` (`lib/moment`) applies it: on the row's copy of that piece in `pieces` always (what a reopened stack and a split read), and on the face's own fields only when the piece is the face. Never patch a row's face fields from a note shown at another piece. `notePatch(body)` is a note's one write: its body and `body_format: 'md'`, nothing else.
- **A mention of a photo or video is drawn as its picture** (note pictures NI1-NI18, decision 0182; it narrowed Nov 12's "photos inline: out"): presentation only, in the page and the reader. The body keeps `@[id|words]`, the photo stays its own moment, and the schema has no image. `useMentionCards(body, pool, { pictures })` gives each card a `picture` (`{ src, video, spoken, context }`); the page reads the pool by `mentionKey(body)`, the ids it mentions, never by the words, so a keystroke reads nothing and sends nothing across the bridge. `lib/notePage/pictures.ts` (core) decides which mentions are pictures, their spoken name, when a line says where one is from (`showsContext`: another day or walk; a page whose walk is not known compares the day) and `pictureKey` (piece and edit); `pictureStore.ts` (shell) makes each once per key; `media/pictureData.ts` (adapter) makes the `data:` URL at 720 px (a photo's crop and rotation by the manipulator; with a filter or lines the page's own baker, `useBaker`, bakes it as the viewer shows it, no caption; a video's stored still). The web view reads none of the app's files and a URL would be a request, so it is data (NI7); the CSP is `lib/notePage/csp.ts`, unchanged.
  - **In the editor** the mention node view (`MentionView`) is drawn in the composer and the reader: a chip where no picture is made, `.mention.picture` where it is (an inline atom styled `display:block`; the Markdown and `toBody` never change). The reader's tap on `.mention` opens its moment; while writing a tap on a picture calls `onPictureTap(id)` and a tap elsewhere calls it with null. `data-testid`: `note-picture`, `note-picture-context`; the app's: `picture-menu`, `picture-edit`.
  - **The menu** (Edit, then Remove from page) sits over the keyboard bar; **Remove from page** (NI19) takes out the mention and the space the camera wrote after it (`removeMention`, in a history step of its own: `closeHistory` first, or a photo taken and removed within half a second shares one step and Undo takes both), acts at once and shows "Taken out of the page" with Undo (`picture-removed`, `picture-undo`) until it is used, another picture is tapped or something is typed.
  - **Edit** is the menu's first row, then the existing `MediaEditor` as an `overlay` inside the page (iOS: no Modal over a Modal), `editor.blur()` before and `focus()` after; `requestClose` closes the editor, then the menu, then the picker, then the page. `onEditMedia` is each host's `setEdit` (`NewNotePage` through `cap`, the viewer's page through `onSaveEdit`); after a save the pool is read again so the picture is made again.
  - **Never** hide, collapse or choose among pictures (NI17: no "+N more", no cover); a size fallback would lower every picture beyond a count, never drop one. A photo whose file is gone or cannot be drawn keeps its card.
