# 0172. Annotations: note types become descriptors on any moment, gathered in Chronicle's lenses

Date: 2026-11-14 · Status: accepted · Area: captures, chronicle, vision · Amends: decision 0161 (note types: notes only, one per note, on the piece, never filtered or searched), NY5 and NY12 of `specs/note-types`

## Context
Note types (0161, 0168) put one of eight ink marks on a note: Question, Emphasis, Idea, Happy, Neutral, Sad, Like,
Dislike. The owner, Nov 14: reimagine the type as a general model of annotated descriptors on every moment, "whether
that be an emotion, a reaction, an idea", seeded from the note types, so that annotations later drive the UI (an
Emphasis might offer reminders) and gather moments ("all the dislikes I have in my memories, all the likes in a given
location, all my ideas").

The gate (`/vision`) found it **aligned if reshaped**. It serves Return (recall and search, the "second mind") and
Honour (a photo or a memo keeps why it was made). It reverses 0161's "never counted, summed, filtered, ranked,
searched" for filtering, and comes closest to the page's Never "Ratings, reviews … of places" where likes and dislikes
are gathered by location; the gate argued that once: gather them as moments, never as anything said about a place.

## Decision
The owner's calls, Nov 14:
- **Several descriptors per moment, at most one per family.** The families are fixed: a feeling (Happy, Neutral,
  Sad), a reaction (Like, Dislike) and an intent (Question, Emphasis, Idea). A moment may be, say, Happy and an Idea.
- **A fixed set, grouped.** Today's eight seed it; nothing is free text. Adding a descriptor or a family is a spec
  change and goes through the gate.
- **On the whole moment**, in separate records, as 0104 keeps moments whole: annotating or clearing never edits the
  moment's row. Existing note types move onto their moment by migration; a photo, video or memo moment can now be
  annotated too.
- **The first behaviour is collections, as Chronicle lenses**: all my ideas, all my dislikes, and so on. A lens is
  opened on purpose and shows moments in their context (place, time, walk), never a grid of glyphs.
- **Not in the first slice:** a lens narrowed by location, Emphasis offering a reminder, a Question asking again when
  you are back. Each returns through the gate as its own slice.

What still holds from 0161 and the page:
- Nothing counts, sums or ranks annotations: no "fourteen dislikes", no share of happy moments, no mood over time.
- No annotation is read by Explore, a place's sheet, a route, an area or a recommendation; no place is ever said to
  be liked or disliked.
- Only the owner annotates; nothing is inferred from text, a picture, a time or a place.
- Annotating is never a step before capture (NY18-NY26 stand, for the moment rather than the note).

## Consequences
- A new slice (`/slice annotations`) carries these as criteria, its storage as new `MIGRATIONS` entries and an
  IndexedDB `VERSION` bump, and the move of `note_type` from the piece to the moment. NY5 (one note of a stack typed,
  its neighbour not) is amended by it; how two pieces typed differently in one family migrate is the slice's question.
- `captures/noteTypeReaders.test.ts` keeps its ban on place, route, area, discovery, landing and walkability code;
  its ban on filtering yields to the lens code only.
- **Proposed edits to `docs/VISION.md`** (the owner makes them): a Shapes row "Annotations on moments | aligned if
  reshaped | descriptors in fixed families, chosen by the owner; gathered in Chronicle's lenses as moments in context;
  never counted, never said of a place (0172)"; and, as 0161 proposed, under Never "A feed, followers, likes …" the
  nearest fit "a mark on your own moment, shown to no one".

## Addendum, Nov 14 (pins)
The owner: moments with annotations are "reflected on their pins as little bubbles on the corner", as a pin already
carries its reminder bell. The owner's calls, the same day:
- **Bubbles in a row from the pin's bottom-left corner**, in the families' fixed order (feeling, reaction, intent),
  clear of the bell and the clock at the top and the video mark at the bottom right.
- **Drawn as the bell is** (RB1): a small solid ink disc with a white glyph and a white edge, the clock's size. One
  badge language; the descriptors are told apart by shape and spoken name, never colour (NY11 stands).
- **A pin of one moment only.** A pin that groups several moments wears no bubbles; its name does not list them.
- **The head always shows the kind** (note, photo, memo, video); an annotation is only ever a bubble. This amends
  NY10, whose single note's pin wore its type's glyph as its head.
- The pin's spoken name says each annotation after the kind, in the families' order ("Photo, happy, idea, twelve
  minutes in. Open"); the exact wording is the slice's.
- Every map that draws capture pins draws the bubbles (as RB6); Explore draws none, as 0161's addendum holds.
