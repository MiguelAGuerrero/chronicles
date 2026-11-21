# 0256. Thread at capture's deferred items, by reasonable default

Date: 2026-11-21 · Status: accepted · Area: threads, captures · Amends: 0253 (the grouping line's Thread) · From: the owner, "Proceed with reasonable default from the deferred items"

## Context
The thread-at-capture build (G11, decision 0253) left five items for the owner in `docs/DEFERRED.md`: Thread on the
pill found late (a link icon with no word), rows of one walk reading alike, no Clear in the card's search, no Undo on
"Added to a thread", and a keep-threading mode. The owner asked for reasonable defaults; the looks were drawn on the
canvas (`docs/mockups/threading-at-capture/`, the Default* artboards) and approved: "Approve as drawn (Recommended)".

## Decision
- **Built:** with Group captures on, the line's Thread is a labelled button, the link icon and "Thread", beside New
  moment (T5: never mix labelled and icon-only items in one bar). Each row in Add to a thread says its time of day
  after its date ("Nov 21, 4:12 pm · From Saturday afternoon walk"), so moments of one walk read apart in words. The
  card's search has a Clear (×, 44 pt, "Clear search") at its end while it holds text (HIG text fields).
- **Left as they are:** the pill's Thread stays an icon like camera, mic and note beside it (the link is the threads'
  mark everywhere, 0105); no Undo on "Added to a thread" (adding is not a loss, and Remove from this thread undoes it,
  through the Undo window); no keep-threading mode yet (the owner: after use; it amends 0104 and goes through `/vision`).

## Consequences
CT12-CT14 in `specs/thread-at-capture/spec.md`; the deferred items are removed or answered there.
