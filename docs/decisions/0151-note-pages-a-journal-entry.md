# 0151. Note pages: a note is a journal entry, written in TipTap through Expo's DOM components

Date: 2026-11-12 · Status: accepted · Area: captures, chronicle · Amends: QL24, QL25 (the note card, its 500 characters) · From: `/slice note-pages`

## Context
A note was a few lines typed into a small card, capped at 500 characters. The owner asked for a Notion-style page per
note that "will feel like a journal or an actual document entry". Then, after the first plan proposed a hand-built
editor of one native text field per line: "Ensure we used established libraries rather than hand rolling our own
implementation. The UX feel is exactly like a journal app." React Native has no rich-text input, so formatting
while typing needs either a native module (iOS and Android only) or a web editor.

## Decision
- **The reference is Apple Journal.** The pencil, Respond → Note and Add to this moment's note open the note's page
  full screen with the keyboard up. The small card goes. The page opens on the date and the moment's context;
  formatting is under an Aa Format button in a toolbar above the keyboard. Its streaks, insights, word counts and
  writing prompts stay out (`docs/VISION.md`, Never).
- **A page saves as you write.** There is no Save and no Discard question. Done and Back both leave, and what was
  written is kept. A new page left empty keeps nothing. An existing note left empty is deleted with the usual Undo.
- **The editor is TipTap** (v3, on ProseMirror): its StarterKit, task lists from `@tiptap/extension-list`, @ mentions
  from `@tiptap/extension-mention` (the picker stays the app's `MomentPicker`), and Markdown in and out from
  `@tiptap/markdown`. The editor runs in an **Expo DOM component** (`'use dom'`): a WebView on phones, plain DOM on the
  web, one code path for all three. TenTap was set aside because it has no web build; Lexical because its mentions are
  only in its playground.
- **The body stays text**: Markdown as `@tiptap/markdown` writes it, plus the mention token `@[id|words]` (0125).
  Plain-text readers (Lately, the replay, threads, search) parse with `marked`, the lexer
  `@tiptap/markdown` uses, which joins core's pure packages (`scripts/layers.js`).
- **Notes written before stay literal** (the steward's S10, the owner's call): a note is read as Markdown only when the
  page wrote it, which a new field says (`body_format`, SQLite migration 25; IndexedDB stores the record whole).
- **A camera on the page** (the steward's S12, the owner's call): beside Aa and @, it keeps a photo as its own moment
  and mentions it in the note, so capture stays one tap away while writing.

## Consequences
- A WebView per open page on phones; never run on a device (`docs/NATIVE_UNVERIFIED.md`). The web bundle grows by
  the editor (one bundle; route splitting stays off).
- The page's code is bundled with the app, and nothing loads from a network; the WebView navigates nowhere but its own bundle (NP13).
- The steward's call against canonical rewriting (S3) yields to the library: the first save in the page may
  rewrite a note's markers (`*` to `-`, list numbers), never what is shown.
