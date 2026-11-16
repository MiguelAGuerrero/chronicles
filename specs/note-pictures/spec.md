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
Criteria: NI1-NI12 below.
Open: none.

## Decisions

- **2026-11-16, scope** (the owner): a mention of a photo or a video you took draws as its picture; no stored image, no
  schema change; the photo stays its own moment (NP14). The composer and the reader both.
- **2026-11-16, layout** (the owner): an own block at the page's width with a rounded corner; no caption, the head gives
  the context.
- **2026-11-16, video** (the owner): its still under the play mark; a tap does nothing while writing; in the reader a
  tap opens the moment, as a card does (RF4).
- **Defaults in the plan, the owner may change them:** a note, a voice memo and a gone moment keep their chip and card
  (NI9, NI8); other places that read a note (threads' bubbles, `NoteText`, the replay) are not changed here (NI12).

## Acceptance criteria

1. **NI1 · The photo is on the page.** From a page opened to capture (the pencil, the walk, Memories' open line), a tap
   on Camera takes a photo and the page shows that photo, where the cursor was, in the flow of the words, with the page
   still open and the keyboard back. Found with nothing to find: no new control; Camera is where NP14 put it, and the
   picture appears under the words above it.
2. **NI2 · Its look.** The picture is an own block at the page's width (the 640 px column's, never wider than the
   photo), its aspect kept, a rounded corner, a hairline edge on the page's ground; no caption, date, count, badge or
   button over it. The words go on beneath it.
3. **NI3 · A video.** A video's mention is its still under the play mark (as the gallery and pile draw it); a tap does
   nothing while writing. A video whose still is not made yet shows its glyph on the soft ground and the still when
   it is made, without the page moving under the caret.
4. **NI4 · Writing around it.** The caret goes before and after a picture; typing before it keeps the picture; with
   the caret just after it, Backspace removes the mention (and so the picture) as it removes any one character; the
   removal is undone by the page's undo. A selected picture is not draggable, and the page offers no resize or caption.
5. **NI5 · The reader.** A note read in the viewer (NoteReader) shows the same pictures in the same places; a tap on a
   picture opens its moment, as the card did (RF4), and a tap on the words still asks to edit (NP5).
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
10. **NI10 · Spoken.** Each picture has a spoken name ("Photo: A photo. Nov 16, near the bridge, on your walk"; a video
    "Video: ..."), as the card's, a button role in the reader (it opens the moment) and plain in the composer; no
    picture is exposed as an unnamed image.
11. **NI11 · Cost is bounded.** A page of many pictures stays typeable: each picture's data is made once per photo and
    edit, not per keystroke, and is no larger than a phone's page width needs (about 720 px on the long edge, JPEG);
    nothing is written to disk and nothing is cached across launches (a derived view of the moment, never truth).
12. **NI12 · Every surface, from the code.** The pictures show in the three hosts of the page's editor: the new page
    (`NewNotePage`, which has the camera), a note's page opened from the viewer's Edit (`NotePage`), and the reader
    (`NoteReader`), and in a reply's page. Not in this slice, said so: the mention cards in a thread's bubbles
    (`NoteText`), the memory preview and the replay, which draw a note's words as text; they keep their cards.

## Retired or amended

- NP5 and RF4 (the reader's card) stand for notes, voice memos, text moments and gone moments; a photo's or a video's
  mention is a picture (NI5, NI8, NI9).
- `docs/DEFERRED.md` (note pages): "A mention's card has no picture" is answered by this slice, for the page and the
  reader.
- `docs/DEFERRED.md` "A camera mention's words are 'A photo' or 'A video'" stands: the words are the spoken name only
  (NI10).
