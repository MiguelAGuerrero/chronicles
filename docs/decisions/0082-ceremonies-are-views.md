# 0082. A ceremony is a view of the story, swapped without changing the code around it

Date: 2026-11-04 · Status: accepted · Area: replay, architecture

## Context
The owner, Nov 4, approving the replay rhythm: the redesign must not be hard-coded, but be one interpretation of the data. If later there are other ceremonies ("one dedicated to a day that's full of greenery"), it should be a matter of swapping the view, not changing the code.

## Decision
- What happened is read once into a story (`lib/ceremony/story.ts`): paths, moves, moments with arrival and leaving, breaks, travel between a day's entries, places passed. No timing, no look.
- A ceremony is `{ id, plan(story), frame(plan, ms) }`, pure, and returns frames: the walker, the camera, the clock and a list of typed overlays. The rhythm is the first; `CEREMONIES` is the registry.
- The screens draw frames through one stage, whose overlay views are looked up by kind. They never look inside a ceremony.
- The screen reader's one-at-a-time path is another view of the same story.

## Consequences
- A new ceremony is a registry entry plus a view for any new overlay kind; the story, the screens and other ceremonies stay as they are. A test holds every overlay kind a ceremony emits to having a view.
- Nothing picks a ceremony per walk or day yet (deferred): the default is the rhythm.
