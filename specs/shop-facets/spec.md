<!-- Shop facets (slug shop-facets, prefix SHF). Written in the repo first (2026-11-18) from the owner's session; not a tab of the
     concept doc yet, and the doc wins once it exists. Nothing here is built. It amends specs/quick-circuit (QC2, QC4, QC14) and
     specs/outing-journey (OJ11-OJ15) when it lands, and needs a new version of chronicles-data's stores contract. -->

# Shop facets: the shops worth browsing, by what they sell and how they sell it (SHF)

Nov 18, 2026 · @Miguel Guerrero

The owner: "I want to ensure that we're comprehensive in our shop listing, because thrifting, antiques, and books are very
specific. And so we need to ensure that refinement makes sense there rather than it being ad hoc, because each thing you would like
to see is a facet of our data." Asked three things, they chose: **shops worth browsing**; **two facets that narrow**; and **measure
the data first** (decision 0219).

## Vision

```
Idea: The outing's shop chips become two facets of the stores data, what is sold and how it is sold, each a closed list drawn from
  what OpenStreetMap holds; picks within a facet widen and picks across the two narrow
Verb: earn (the shops worth a wander, asked for in the terms the data really has)
Touches: Never "Ratings, reviews, popularity", "Tallies", "A feed of recommendations"; Always "A gate of kinds, never a measure",
  "Restraint"; 0103 (a structured type decides, never a count), 0194 and 0196 (the vocabulary), 0209 (chips in one pool), the
  stores contract (dimensions by version; a client ignores what it does not know)
Verdict: aligned if reshaped
Shape: a count decides which kinds are worth a value and never orders, weights or ranks anything a person sees; no chip says how
  many shops it holds; errands and services are out by kind, not by popularity; a chain stays behind "Include chains"
Precedent: see "How adjacent apps do it"
Criteria: SHF1-SHF18 below
Open: the two lists themselves, after the count
```

## How adjacent apps do it

- **Apple Maps**: a search within "Shopping" offers categories as chips (clothing, books, and so on); one is picked at a time and nothing combines. Source: from memory, unverified.
- **Etsy**: results are narrowed by independent facets in a filter panel (item type, vintage or handmade), each a closed list, combining across facets. Source: from memory, unverified. The model for two facets that narrow; its counts beside each facet value are what this product leaves out.
- **Google Maps**: category chips with "Open now" and a rating filter beside them. Source: from memory, unverified. The counter-example: a rating as a filter.

## Criteria

The facets:

- **SHF1.** A shop has two facets: **what** it sells and **how** it sells it. Each is a closed list in the stores contract; a shop
  may hold several values of each.
- **SHF2.** The lists are drawn from the count of every `shop` and `craft` value in the US (chronicles-data's shop counts), shown to
  the owner with the kinds proposed for each value and the kinds left out, before the contract changes.
- **SHF3.** A kind is in scope when it is a shop worth browsing on an outing; errands and services are out. Which side a kind falls
  on is decided kind by kind and recorded, never by how many there are.
- **SHF4.** `how` holds at least: new, second-hand (thrift and charity), vintage (curated), antique, handmade (sold by its maker).
  Where the source does not say, a shop has no `how`, and is never guessed to be new.
- **SHF5.** Every value of today's `what` keeps a home: antiques and second-hand move to `how`; books, records, maps, art supplies
  and crafts stay in `what`. A pack of the old contract still reads.
- **SHF6.** No value of either facet is a measure: nothing in a list, a label or a rule says how many shops there are, how good,
  how popular or how often visited.

On the page:

- **SHF7.** The shop chips are the values of the two facets, each facet's chips together and in alphabetical order, the facets told
  apart in words; the attraction chips are unchanged.
- **SHF8.** Picks within a facet widen (Books or Music); picks across the two narrow (Books and Second-hand: used bookshops). With
  picks in one facet only, the other does not narrow.
- **SHF9.** A shop pick and an attraction pick widen, as today (OJ14): a journey may hold a bookshop and a garden.
- **SHF10.** A chip is shown only for a value the pack in use can hold; a value the pack does not know is not offered, and no chip
  says how many it would find.
- **SHF11.** A combination that finds nothing says so in one line and says which pick to drop first, never offering a "popular"
  alternative.
- **SHF12.** "Thrifting" is no longer a chip of its own: it is Second-hand in `how`. Typing it in the search still finds it.
- **SHF13.** A stop's own line names it by both facets where both are known ("A used bookshop"), and by the one known otherwise.
- **SHF14.** The chips fit a phone: two rows at most before the sheet scrolls, at 320 px, with nothing clipped.

The data:

- **SHF15.** The shops of the map's own tiles serve both facets where their classes say (the fallback, QC14), by one table shared
  with the pack's values.
- **SHF16.** The app pins the new contract; its reader ignores a dimension or value it does not know, and a pack of a later version
  never breaks it (QC40).
- **SHF17.** Nothing leaves the device beyond the pack's byte-range reads, as today.
- **SHF18.** Chains stay behind "Include chains", off by default (QC13, QC41).

## Surfaces (from the code)

- `src/lib/outing/wants.ts`, `chips.ts`, `leanings.ts`: the vocabulary and what a journey leans toward.
- `src/lib/outing/candidates.ts`: `matches` already means "within a dimension any value, across dimensions all"; `matchesAny` is
  what widens across picks (SHF8, SHF9).
- `src/lib/outing/stores.ts`, `storesMerge.ts`, `storesRead.ts`, the pinned contract under `__tests__/outing/contract/`.
- `src/components/outing/OutingPage.tsx`: the chips (SHF7, SHF14).
- chronicles-data: `src/stores/dimensions.ts`, `osmShops.ts`, `contract/stores.schema.json`.

## What is known before the count

One city's map tiles (Zurich, the test set) hold about 11,400 shops in well over forty kinds. The largest are errands and services
(convenience, beauty, kiosk, optician, travel agency), which SHF3 leaves out; among shops worth browsing it holds florists,
jewellery, shoes, furniture, interior decoration, second-hand (269), books (256), gifts, art (150), stationery, toys, and antiques
(64). That is a European city and a map's own selection, so it shows the shape of the list, not its numbers.

## Open

1. **The two lists** (SHF2): after chronicles-data's next OpenStreetMap run reports `osmShopCounts`.
2. **Whether clothes, shoes and jewellery sold new are "worth browsing"** or errands: the owner's, kind by kind, with the count.
3. **Whether attractions become a facet of the same kind** ("what kind of place") so that the whole page is facets.

## Record

Nothing is built in the app. Decision 0219. chronicles-data: shop counts built on its branch `claude/determined-wright-yg1fq9`
(SK1-SK8, 124 tests), not on its main, so no run has reported yet.
