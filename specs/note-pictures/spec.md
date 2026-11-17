<!-- Note pictures. Written in the repo first (2026-11-16) from the owner's /slice request, as the owner's own report
     from using the app on a walk. Not a concept-doc tab. -->

# Note pictures (NI)

The owner, Nov 16, drafting a page from a walk: "when I put a piece of media into the page, it doesn't actually render
out the photo, much like how it would in a document ... this is effectively a composer that creates a stack of moments
together in one context, as if you were editing a real journal ... I expected the photo to be a part of the view ...
a little bit of friction in terms of me trying to be immersed in the experience when I didn't see the photo in line as
I was typing it out."

Today the page's camera (NP14) keeps the photo as its own moment and writes `@[id|A photo]` into the body; while
writing it is a chip reading "@A photo", and in the reader a text card with no picture (`docs/DEFERRED.md`, note pages:
"A mention's card has no picture"). This slice draws that mention as the photo itself, in the flow of the words.

## Vision

Idea: When I add a photo to a page, the page shows the photo in line, as it would in a journal document, while I write
(the owner, Nov 16).
Verb: **honour**: the moment arrives whole; the photo you took is the thing you are writing about, and it is on the
page with the words about it. Serves **return** too: the page reads back with its pictures.
Touches:
- Always: "A moment carries its context ... It never appears as a bare thumbnail." The picture sits under the page's
  head (day, time, "On your walk"), as decision 0139 put a gallery's tiles under a day header; the moment itself is
  still whole (its own time, fix and walk) and a tap in the reader opens it.
- Always: "Capture is one tap away." Unchanged: the camera tool is where it was (NP14).
- NP14: the photo is its own moment, "never a piece of the note": the body keeps only the mention token.
- NP13 / Never: "Data leaving the device without a tap." A picture is read from the device and handed to the editor as
  data; the editor's Content-Security-Policy is unchanged.
- Never: "Celebration", "Tallies": the picture carries no caption, count or badge.
- Owner's call, Nov 12 (`docs/DEFERRED.md`, note pages): "photos inline: out". The owner, Nov 16, confirmed that this
  reshaping fits under it: a mention draws as its picture; no image is ever stored in, pasted into or typed into the
  document.
Verdict: aligned if reshaped
Shape: a mention of a photo or a video draws as its picture, on its own line at the page's width, a rounded corner, no
caption; a video as its still under the play mark. Presentation only: the stored note, the schema, the moment and the
pasted-image rule (NP13) are unchanged. In the composer and in the reader.
Criteria: NI1-NI19 below.
Open: none.

## Decisions

- **2026-11-16, scope** (the owner): a mention of a photo or a video you took draws as its picture; no stored image, no
  schema change; the photo stays its own moment (NP14). The composer and the reader both.
- **2026-11-16, layout** (the owner): an own block at the page's width with a rounded corner; no caption, the head gives
  the context.
- **2026-11-16, video** (the owner): its still under the play mark; in the reader a tap opens the moment, as a card
  does (RF4). Stills only: no motion in a page.
- **2026-11-16, editing** (the owner, later the same day): tapping a picture while writing offers a quick action menu,
  and "full support to edit it using the available tools that we currently have". Built as the existing `MediaEditor`
  as an overlay inside the page (iOS: no Modal over a Modal), so every tool it has works: rotate, crop, filter, draw,
  text, and trim for a video. The menu first held one entry, **Edit**, the owner's pick (Remove and Open the moment
  were offered and not chosen); the UI review's U1 found no visible way to take a picture out of a page, and the
  owner, the same day, asked for **Remove from page** to be added (NI19). This replaces the earlier "a tap does
  nothing while writing".
- **2026-11-16, context** (the owner, on the steward's S2): a picture shows no caption when its photo is from the
  page's own walk; when it is from another day or walk, one muted line beneath it says its date, place and walk, in
  the card's words.
- **Defaults in the plan, the owner may change them:** a note, a voice memo and a gone moment keep their chip and card
  (NI9, NI8); other places that read a note (threads' bubbles, `NoteText`, the replay) are not changed here (NI12); the
  menu has Edit and Remove from page (NI13, NI19); Backspace still takes a picture out (NI4).
- **An edit is the moment's own** (`Capture.edit`, decision 0090): editing a picture from the page changes that photo
  everywhere it is shown, in the Chronicle, the gallery and the replay, as the viewer's Edit does. The page is one more
  place to reach the same editor, never a copy of the photo.

## Acceptance criteria

1. **NI1 · The photo is on the page.** From a page opened to capture (the pencil, the walk, Memories' open line), a tap
   on Camera takes a photo and the page shows that photo, where the cursor was, in the flow of the words, with the page
   still open and the keyboard back. Found with nothing to find: no new control; Camera is where NP14 put it, and the
   picture appears under the words above it.
2. **NI2 · Its look.** The picture is an own block at the page's width (the 640 px column's, never wider than the
   photo), its aspect kept, a rounded corner, a hairline edge on the page's ground; no caption, date, count, badge or
   button over it. The words go on beneath it.
3. **NI3 · A video.** A video's mention is its still under the play mark (as the gallery and pile draw it); it never
   plays on the page. A video whose still is not made yet shows its glyph on the soft ground and the still when it is
   made, without the page moving under the caret.
4. **NI4 · Writing around it.** The caret goes before and after a picture; typing before it keeps the picture. The
   camera writes a space after the mention (NP14), so Backspace from after that space takes the space, and the next
   Backspace takes the mention and so the picture, as it takes any one character; the page's undo brings it back. A
   picture is not draggable, and the page offers no resize.
5. **NI5 · The reader.** A note read in the viewer (NoteReader) shows the same pictures in the same places; a tap on the
   picture itself opens its moment, as the card did (RF4); a tap on the words, or on the page beside a picture narrower
   than the column, still asks to edit (NP5).
6. **NI6 · The stored note is unchanged.** The body is the same `@[id|words]` token, `body_format` 'md'; the photo is
   its own moment with its own time, fix and walk; no new column, no new table, no migration; an older note that
   mentions a photo shows its picture too, with no rewrite of the note.
7. **NI7 · Nothing leaves the device.** Drawing a picture makes no network request. The picture reaches the editor as
   data read from the device; the editor's Content-Security-Policy still allows no network (`connect-src 'none'`) and
   no image from a URL; a pasted image still keeps nothing (NP13).
8. **NI8 · A moment gone.** A mention whose moment is gone, or waiting in Undo, draws as "A moment no longer kept", in
   the page and the reader, with no broken picture; the picture returns if the delete is undone. While the moments
   are being read, no mention is called gone and no picture flashes in.
9. **NI9 · Only pictures become pictures.** A mention of a note, a voice memo or a text moment keeps its chip while
   writing and its card in the reader; a photo whose file is lost or undecodable keeps its card, not a broken picture.
10. **NI10 · Spoken.** Each picture has a spoken name, the card's ("Photo. Nov 16, near the bridge, on your walk"; a
    video "Video. ..."); the camera's default words ("A photo", "A video") are not said again after the kind. In the
    reader it is a button that opens the moment; in the composer a button that opens the menu (NI13); no picture is
    exposed as an unnamed image.
11. **NI11 · Cost is bounded.** A page of many pictures stays typeable: each picture's data is made once per photo and
    edit, not per keystroke, and is no larger than a phone's page width needs (about 720 px on the long edge, JPEG);
    nothing is written to disk and nothing is cached across launches (a derived view of the moment, never truth).
12. **NI12 · Every surface, from the code.** The pictures show in every host of the page's editor: the new page
    (`NewNotePage`, which has the camera), a note's page opened from the viewer's Edit (`NotePage`), a reply's page
    (no camera there, so only moments picked with @), and the reader (`NoteReader`). The menu and its editor are in
    each page host; the reader has neither (it opens the moment, NI5). Not in this slice, said so: the mention cards in
    a thread's bubbles (`NoteText`), the memory preview and the replay, which draw a note's words as text; they keep
    their cards.
13. **NI13 · A quick menu on a picture.** While writing, a tap on a picture opens a small menu with **Edit** first and
    **Remove from page** last (NI19); it never covers the page's keyboard bar and closes on a tap outside, Back or Escape, changing nothing. It is a
    menu or sheet inside the page, never a second Modal (iOS). Found by a tap on the picture the person is looking at.
14. **NI14 · Full editing.** Edit opens the existing media editor over the page, with every tool a photo has (rotate,
    crop, filter, draw, text) and a video's trim, as the viewer's Edit does; the editor is the same one (`MediaEditor`),
    not a copy. Done keeps the edit on the moment (`setEdit`), closes the editor and returns to the page with the
    caret where it was, the words unchanged, and the picture redrawn as edited; Close with no change writes nothing
    and Close with changes asks (ME); Escape and Back go through the editor's own Close before the page's (media-editing
    audit 5). The note body is not touched by an edit.
15. **NI15 · The picture is the moment as the viewer shows it.** A photo with a crop, rotation, filter or drawn lines is
    drawn on the page with them, caption left out as the small copy leaves it (ME20); a video's still follows its
    trim (VS6). A moment whose edit cannot be drawn falls back to the picture without it, never a broken one.
16. **NI16 · Context when it differs.** A picture whose moment is from another day or another walk than the page's head
    shows one muted line beneath it, that moment's date, place and walk in the card's words (`refCardLine`); a picture
    from the page's own walk shows none. The line is not a button and carries no count.
17. **NI17 · Nothing is chosen, hidden or counted.** Every mentioned photo or video draws, in the order written: none is
    skipped, collapsed to "+N more", chosen as a cover or ranked (the lows stay in). A page with only pictures is kept
    as it is today (a mention is content); no draft is dropped.
18. **NI18 · The decision is on record.** A decision record cites the owner's Nov 16 call, and `docs/DEFERRED.md`'s
    "photos inline: out" line says what stays out (no stored, pasted or typed image, no resize, drag or caption of a
    picture) and that a mention drawn as its picture is allowed.

19. **NI19 · Remove from page.** The menu's last row, **Remove from page**, in the destructive colour and with a bin, takes
    the picture's mention out of the note and nothing else: the photo stays its own moment, in the Chronicle with its
    own time, fix and walk, and the words around it stay as they were (the space the camera wrote after it goes with
    it). It acts at once, with no question, and a line in place of the menu says "Taken out of the page" with **Undo**,
    which puts the picture back where it was; the line stays until Undo, a tap on another picture, or the next thing
    typed (Undo stays until used or dismissed, ui-patterns F3). The page's own undo brings it back too.

## Retired or amended

- NP5 and RF4 (the reader's card) stand for notes, voice memos, text moments and gone moments; a photo's or a video's
  mention is a picture (NI5, NI8, NI9).
- `docs/DEFERRED.md` (note pages): "A mention's card has no picture" is answered by this slice, for the page and the
  reader.
- `docs/DEFERRED.md` "A camera mention's words are 'A photo' or 'A video'" stands: the words are the spoken name only
  (NI10).

## Record (2026-11-16)

Built test-first (18 of 18 by history). Unit tests (`notes/pictures.test.ts`), typecheck, lint, docs and vision checks, and the `notepage` journey pass on the web build, with the nine other journeys the changed files reach (`edit`, `journal`, `qol`, `responses`, `stacks`, `threads`, `videothumbs`, `voicetrim`, `walk`). Native has never run: four items in `docs/NATIVE_UNVERIFIED.md`.

**The cold find** (pictures only, no hints): the photo in the page was found at once; editing it from the page was found late (no cue that a picture is tappable; the menu row did not look like a control); taking it out was not found. Accepted and fixed: `note-pictures ui 1` (the picture whose menu is open is outlined), `note-pictures ui 2` (the row says "Edit photo" or "Edit video", with a pencil, at 48 pt). Those two were written with their checks in the same commit, not failing first.

**The UI review** (U1-U5): U1 to the owner, who asked for the row the same day (NI19: "Remove from page", last, with Undo; the check found Undo taking the photo just before it too, until the removal got its own history step); U2, U3, U4 rejected (the dismissal, spoken name and rotation are already as the review asked); U5 rejected as before this slice (the existing editor). No audit has been run (decision 0074: when the owner asks).
