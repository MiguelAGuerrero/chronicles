# 0161. Note types: eight ink marks the owner chooses, thumbs included

Date: 2026-11-12 · Status: accepted · Area: captures, chronicle, vision

## Context
The owner asked that a note carry a type saying why it was made, in place of the generic note glyph (`specs/note-types`). The vision gate found it aligned if reshaped. The steward warned that a happy face beside a sad face, and a thumb up beside a thumb down, read as a rating or a like (Never "ratings", "scores", "likes").

## Decision
The owner's calls, Nov 12 (the gate argued once and the owner reaffirmed):
- **Eight marks, fixed order:** Question, Emphasis (an exclamation: an insight, a eureka), Idea, Happy, Neutral, Sad, Like, Dislike. One per note, notes only, chosen in the note editor, with "No type" to clear.
- **Thumbs and faces stay**, overriding the steward's finding that they read as a rating. They are a mark on the owner's own note about the owner's own moment: never counted, summed, filtered, ranked, searched, shown to anyone or applied to a place. A like or dislike is never carried to Explore, a place, a route or a recommendation.
- **The thread screen's note bubbles carry the mark** too, with its spoken name.
- **Nothing sets a type but the owner**, never inferred from the text.

## Consequences
- `specs/note-types` carries these as NY1-NY17.
- The VISION.md edit this implies is the owner's to make: under Never "A feed, followers, likes, public profiles", the nearest-fit column could add "a mark on your own note, shown to no one (0161)". Not made by an agent.
- A thumb on a note must never become a signal about a place; any feature that reads types (search, lenses, recall) goes through the gate again.

## Addendum, Nov 12 (the audit)
The steward asked whether a Sad or Dislike mark on a single note's map pin amounts to a verdict at a place. The owner's call: **keep**, every type marks its pin (NY10). The pin is the owner's own moment on their own map, shown to no one and read by nothing about a place; Explore draws none of these pins. "Never applied to a place" means no feature reads a type to say something about a place, a route or a recommendation.

