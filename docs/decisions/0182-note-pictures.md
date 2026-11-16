# 0182. A photo you mention on a page is drawn as the photo, and a tap on it offers Edit

Date: 2026-11-16 · Status: accepted · Area: notes, captures · Amends: 0151 ("photos inline: out", Nov 12); builds on 0090 (the media editor)

## Context
The owner, Nov 16, drafting a page on a walk: the Camera put "@A photo" into the page, a chip, not the photo. "I
expected the photo to be a part of the view ... as if you were editing a real journal." Nov 12's call, in
`docs/DEFERRED.md`, had put "photos inline" out of the note page; the owner confirmed on Nov 16 that this is not what
that call meant to stop. The vision gate found it aligned if reshaped (`specs/note-pictures`); the steward read the
spec and plan (S1-S7, P1-P8, all triaged).

## Decision
The owner's calls, Nov 16:
- **A mention of a photo or video is drawn as its picture** in the page and in the reader: an own block at the
  page's width, a rounded corner, a video's still under the play mark. The note stores only the mention token
  (`@[id|words]`) and the photo stays its own moment (NP14). No image is stored in, pasted into or typed into the
  document; no drag, no resize, no caption of the page's own.
- **No caption under a picture from the page's own walk.** One from another day or walk gets one muted line beneath
  it, the card's words (the steward's S2; the owner chose "a line only when it differs").
- **A tap on a picture while writing offers a menu with one entry, Edit**, which opens the existing media editor over
  the page with every tool it has (rotate, crop, filter, draw, text, and trim for a video). Remove and Open the moment
  were offered and not chosen; a picture is removed from the page with the keyboard.
- **An edit is the moment's own** (`Capture.edit`, 0090): editing from the page changes the photo everywhere.

## Consequences
- NI1-NI18 in `specs/note-pictures/spec.md`. Nothing new is stored; no migration.
- A picture reaches the editor as a `data:` URL of about 720 px made in memory (the web view reads none of the app's
  files); the page's Content-Security-Policy is unchanged.
- The mention cards in a thread's bubbles, the memory preview, the replay and the Chronicle's index keep their cards.
- A page begun on a capture surface does not know its walk, so it compares a mentioned photo's day alone.
- Native is unverified on a device: the data image in the web view, the caret around a picture, the editor over the
  page's Modal with the keyboard up (`docs/NATIVE_UNVERIFIED.md`).
