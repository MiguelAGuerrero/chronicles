<!-- Repo first: written from the owner's request in a session (Nov 12), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Note types: a mark for why a note was made

Nov 12, 2026 · @Miguel Guerrero

A note shows one generic glyph wherever it is drawn. The owner wants each note to carry a type they choose, a question
mark, an exclamation point, a happy face, so the mark says why the note was made.

## Vision

Idea: Each note can carry a type the owner assigns (a question, something important, an idea, joy, a low), so its mark says why it was made instead of showing the generic note icon.
Verb: honour (the moment keeps why it was made, as part of its context); return (a pin, a row or a card reads at a glance).
Touches: Never "A feed, followers, likes" (a type is the owner's own mark on their own note; nobody reacts to anyone); Never "Writing the owner's words for them" and the concept doc's "nothing is ever calculated for you" (the type is only ever chosen, never inferred from the text); Never "Celebration" and Always "Restraint" (plain ink glyphs, no colour, motion or emoji); Never "Editing out the lows" and Always "The lows stay in" (the set holds a low mark, not only bright ones); Never "A capture behind a menu, a drawer or an extra tap" (capture is unchanged; the type is set afterwards, in the note editor); Never "Scores" and Always "Counts are words" (no count of a type anywhere); precedent 0105 (an ink-coloured icon with a spoken name is how this app tells two kinds apart); `response-thread` RT10 bans reactions on responses, a different thing from a mark the owner puts on their own note.
Verdict: aligned if reshaped
Shape: A fixed set of five ink glyphs (a question, something important, an idea, joy, a low), one per note, chosen in the note editor and changeable there. The glyph takes the place of the generic note glyph on the map pin, the Chronicle's moment picture and the viewer's note card, with a spoken name. A note with no type looks as it does today. Nothing counts types, filters by them or guesses them.
Criteria: NY1-NY16 below.
Open: (1) Is "Important" the right name for the second type, given "every moment is worth remembering"? (2) Should the thread screen's note bubbles carry the mark too? (3) Joy as a happy face and the others as plain marks: keep? Answers go in Decisions.

## Decisions (the owner's calls, Nov 12)

- **A small fixed set of ink glyphs**, not emoji and not any emoji: restraint, a spoken name for each, and a set that reads the same on every phone.
- **One type per note**, so a pin has one mark and nothing needs a rule for which shows.
- **Notes only**, set in the note editor (writing a note in the viewer's Respond or editing one); capture stays one tap. Photos, videos and memos keep their own glyphs.
- **A nullable `note_type` on the capture record** (truth, kept by piece): SQLite migration 25 (the 25th entry of `MIGRATIONS`) and IndexedDB VERSION 20; a note made before reads as no type.

## Acceptance criteria

The set (`NOTE_TYPES`, in `src/lib/noteType.ts`), in this fixed order, which the menu keeps after "No type": `question` "Question", `important` "Important", `idea` "Idea", `joy` "Joyful", `low` "Low". Glyphs: help-circle, alert-circle, bulb, happy, and for the low a plain downward arrow (`arrow-down-circle-outline`), not a mirror of joy's face (steward finding 1).

1. **NY1** The set is five types, each with a glyph and a spoken name, and one of them is a low, and the low is not last by accident: the order is fixed as above and the low's glyph is not the mirror of joy's; no type is named or ordered as better than another.
2. **NY2** A stored value outside the set (a newer build's, a bad row) reads as no type, never an error or a blank glyph.
3. **NY3** A note's mark is its type's glyph when it has one, and the generic note glyph when it has none; a photo, video or memo never takes a type's glyph.
4. **NY4** A note keeps its type through the database on both stores: set, changed, cleared, and a note kept before this slice reads as no type.
5. **NY5** The type is stored on the note's own piece, so one note in a stacked moment can be a question while its neighbour has none.
6. **NY6** The note editor offers the types in one labelled "Type" control (a menu of the five and "No type", its current choice shown as glyph and name); choosing one changes nothing else about the note.
7. **NY7** Saving an edited note stores its text and its type together; a failed save puts both back in the viewer, as the text is put back today (QL25).
8. **NY8** A note saved with a type left as it was, or with none chosen, is unchanged by the editor: capture takes no extra tap, and the composers that exist today (the capture band, the stack's note, the walk's note) make a note with no type.
9. **NY9** The viewer's note card shows the type's glyph and its spoken name above the note's text; a note with no type shows neither.
10. **NY10** A note's map pin and the Chronicle's moment picture wear the type's glyph in place of the generic note glyph; a pin of several captures still shows its count.
11. **NY11** A screen reader hears the type by its spoken name wherever its glyph is drawn, and the glyph is never the only way to tell the types apart: all five are drawn in the one ink colour (a test asserts a single colour), so shape and name carry it, never colour.
12. **NY12** No count of a type appears: no "3 questions", no tile, no tally, and nothing sorts, filters or searches notes by type.
13. **NY13** Nothing sets a type from a note's text, its time or its place: a type exists only because the owner chose it.
14. **NY14** The backup bundle and the web store's export keep the type with the note.
15. **NY15** A response note made in Respond has no type until Edit sets it (steward).
16. **NY16** Every place that offers Edit on a note passes the type through its save (`onSaveNote(c, body, type)`), so saving never drops or clears a type unasked (steward).

## Steward triage (Nov 12)

- **Finding 1** accepted in part: the low is a downward arrow, not a sad face. Rejected in part: "no glyph is a face". The owner asked for a happy emoji, so joy stays a face; for the owner to overrule (Open).
- **Finding 2** accepted: fixed order, single ink colour asserted (NY1, NY11).
- **Finding 3** "Important" as a name: for the owner (Open).
- **Callers undercounted** accepted: twelve call sites, listed in the plan; NY16.
- **Pin data** accepted: only a pin of exactly one capture that is a note wears a type; a pin of several keeps its kind glyph and count (NY10).
- **NY12's grep test** accepted: the test asserts the public API, no function taking types and returning a count or filter, with a scan only as a backstop that lists no files.
- **Response note** accepted as NY15.
- **Thread bubbles, search results**: put to the owner (Open).

## Record

(Filled in as the slice is built.)
