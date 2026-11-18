# 0219. Shops by two facets, drawn from a measurement

Date: 2026-11-18 · Status: accepted · Area: outing, stores pack, chronicles-data contract · Builds on [0194](0194-plan-an-outing.md), [0209](0209-outing-journey-the-owners-answers.md)

## Context
With the outing page live, the owner looked at its shop chips (Antiques, Books, Thrifting): "I want to ensure that we're
comprehensive in our shop listing, because thrifting, antiques, and books are very specific. And so we need to ensure that
refinement makes sense there rather than it being ad hoc, because each thing you would like to see is a facet of our data."

What the code holds: the app shows three chips, of which Thrifting also matches antiques; the stores pack defines one
dimension, `what`, with eight hand-picked values, and reserves a second, `how` (vintage, thrift, new), never emitted; the
pipeline keeps eleven `shop=` and eight `craft=` values of OpenStreetMap and drops every other kind of shop. One list mixes what a
shop sells (books) with how it sells it (second-hand, antique), which is why two chips overlap and a used bookshop cannot be asked
for.

## Decision
The owner's answers, Nov 18:
- **Scope: shops worth browsing.** The shops you would wander into on an outing; errands and services (a supermarket, a
  pharmacy, a hairdresser, a phone shop) stay out.
- **Two facets that narrow.** What is sold, and how it is sold. Picks within one facet widen; picks across the two narrow:
  Books with Second-hand is used bookshops.
- **Measure the data first.** The closed lists of both facets are drawn from a count of every `shop` and `craft` value in the
  US, and brought to the owner before the contract changes.

## Widened the same day
The owner: "shops are one type of store, but attractions and galleries and other sorts of stops, museums, things you can enter are
also under consideration." Their answers:
- **One model for every stop.** A single "kind of place" facet covers shops, galleries, museums, gardens, monuments and the rest;
  what a shop sells and how it sells it appear once shops are picked; today's five attraction chips are replaced by it.
- **"Go inside" is its own facet**: gone inside, looked at, or out in the open, assigned to each kind by rule.
- **Widen the count** to every OpenStreetMap value of `tourism`, `historic`, `leisure` and `amenity`.
- The composer's form (the owner: "we might opt to using a step form like a wizard, but that decision depends on how other apps
  handle this") is decided from precedent with mocks, once the lists' sizes are known.

## The owner's rule for what is entered, and two more calls (Nov 18)
- "Perform the merge": chronicles-data's counts went onto its main.
- **Entered or from outside:** "any sort of fenced off or bordered area that must be entered, especially with admission gating or
  some sort of visitation registration, should be entered. But things that can be appreciated from the outside, like a monument
  or a sculpture, would be outside." Two sides, by whether a place is bounded, not by whether it is indoors.
- **"Galleries and museums should join the pack."**
- **"There has to be some consideration on operational hours as well."** Hours are carried where a source states them; what the
  page does with them waits for their measured coverage.

## Consequences
- chronicles-data counts every `shop` and `craft` value, and the second-hand among each, in its OpenStreetMap run (its
  `docs/shop-counts/spec.md`, SK1-SK8, on the branch `claude/determined-wright-yg1fq9` there). OpenStreetMap cannot be read from a
  cloud session, so the count comes from that run's report.
- The stores contract then gets a new version: `what` redrawn, `how` emitted. The app's reader already ignores a dimension or a
  value it does not know.
- The app's core already matches this way (`matches`: within a dimension any value, across dimensions all); what changes is the
  chips (one per value, grouped by facet) and that picks of different facets no longer only widen (OJ14 is amended for shops).
- Attractions keep their five chips; whether they become a facet of the same kind is not decided.
- The spec is `specs/shop-facets/spec.md`; its lists stay open until the count is in.
