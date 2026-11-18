<!-- Shop facets (slug shop-facets, prefix SHF). Written in the repo first (2026-11-18) from the owner's session; not a tab of the
     concept doc yet, and the doc wins once it exists. Nothing here is built. It amends specs/quick-circuit (QC2, QC4, QC14) and
     specs/outing-journey (OJ11-OJ15) when it lands, and needs a new version of chronicles-data's stores contract. -->

# Stop facets: every stop of an outing by the same facets; shops by what they sell and how (SHF)

Nov 18, 2026 · @Miguel Guerrero

The owner: "I want to ensure that we're comprehensive in our shop listing, because thrifting, antiques, and books are very
specific. And so we need to ensure that refinement makes sense there rather than it being ad hoc, because each thing you would like
to see is a facet of our data." Asked three things, they chose: **shops worth browsing**; **two facets that narrow**; and **measure
the data first** (decision 0219).

**Widened the same day.** The owner: "shops are one type of store, but attractions and galleries and other sorts of stops,
museums, things you can enter are also under consideration." Asked three more things, they chose: **one model for every stop**
(a single "kind of place" facet; shop-only refinements appear once shops are picked; today's five attraction chips are replaced);
**"go inside" as its own facet**; and **widen the count** to every kind of stop. The slug stays `shop-facets`; SHF19 on are the
widening.

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
Criteria: SHF1-SHF28 below, with SHF14a
Open: the lists themselves, after the count; the composer's form
```

## How adjacent apps do it

- **Apple Maps**: a search within "Shopping" offers categories as chips (clothing, books, and so on); one is picked at a time and nothing combines. Source: from memory, unverified.
- **Etsy**: results are narrowed by independent facets in a filter panel (item type, vintage or handmade), each a closed list, combining across facets. Source: from memory, unverified. The model for two facets that narrow; its counts beside each facet value are what this product leaves out.
- **Roadtrippers Autopilot**: a start and a destination, then a few questions in steps (who travels, interests, the vehicle), and a plan that can be edited after. Source: support.roadtrippers.com and roadtrippers.com/autopilot, by search summary, Nov 18, 2026 (partly verified). The precedent for steps: a plan of days, made rarely.
- **Komoot**: the sport is asked before the destination because it changes which paths can be routed. Source: third-party guides, by search summary (partly verified). Steps where one answer changes the next question.
- **Baymard's mobile filtering guidance**: independent facets in one sheet with a sticky Apply, the applied ones left visible outside it. Source: baymard.com, by search summary (partly verified).
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
- **SHF14a.** (the owner, Nov 18: "If the composer gets a bit too detailed, we might opt to using a step form like a wizard, but
  that decision depends on how other apps handle this") The form of the composer is decided from precedent, with a mock of each
  candidate, before the chips are built: one page as today, a sheet for refining with what is applied left in view on the page, or
  steps. Whichever is chosen, the journeys stay in view or one tap away while choosing, and no step is added before a first
  proposal: the page still proposes as it opens.

Every stop (the widening):

- **SHF19.** Every stop of an outing, a shop, a gallery, a museum, a garden, a monument, a view, is described by one facet, the
  **kind of place**, a closed list shared by the places pack, the stores pack and the map's own places. One place may hold
  several kinds (a gallery that sells is a gallery and a shop) and is one stop.
- **SHF20.** The kinds are the kinds "What I'm into" already switches (57 today, in five groups), with the kinds missing from them
  added from the count: a gallery is none of them today. One list serves both screens: a kind added here is a switch there.
- **SHF21.** A second facet says **how a place is visited**: gone inside (a museum, a gallery, a shop, a church), looked at (a
  statue, a mural, a marker, a view), or out in the open (a park, a garden, a reserve). Each kind is assigned one by a table in
  the code, recorded kind by kind; a place is never assigned by its name or by anything a crowd says.
- **SHF22.** The page offers that facet as its own choice of three, beside the kinds: with "Inside" picked, every stop proposed
  is a place you go into, whatever else is picked. With none picked it does not narrow.
- **SHF23.** `what` and `how` (SHF1-SHF5) belong to shops alone: their chips appear when Shops is among the kinds picked, or when
  no kind is picked, and are gone otherwise; a pick made in them is kept if Shops is picked again.
- **SHF24.** Today's five attraction chips (Art, Culture, Green, History, Views) become the groups the kinds sit under, not
  values of their own: picking a group picks its kinds, and its kinds can be opened and picked one by one.
- **SHF25.** Across facets picks narrow, within a facet they widen, for every stop (SHF8 and SHF9 are restated: a bookshop and a
  garden in one journey are two kinds, so they widen; "Inside" with Green narrows to nothing and says so, SHF11).
- **SHF26.** The page's first proposal still follows "What I'm into" (OJ12): the kinds switched on there are the kinds picked as
  it opens, and no step stands before it.
- **SHF27.** The journeys' leanings ("Among the shops", "Past old places", "Through green", "A bit of each") are drawn from the
  groups of kinds, by the same table, not from a list of chips kept beside it.
- **SHF28.** Whether a place can be entered now is never said or implied: no source holds opening hours ("Opening hours aren't
  known here." stays).

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

## The composer's form: what precedent says (for SHF14a)

Recorded in `docs/research/adjacent-apps.md`, "Compose a plan from several choices". Steps are used where one answer changes the
next question (Komoot asks the sport first because it changes the routing) or where the plan is large and made rarely (a road
trip of days). Independent filters sit together, on the page or in one sheet, with what is applied left in view.

Read against this product, after the widening: the facets now depend on one another (what a shop sells is asked only once
shops are among the kinds, SHF23), which is the case where the recorded apps use steps or reveal the next choice only when it
applies. Against steps: an outing is planned often and in a minute, and the page's strength is that journeys appear as it opens
(SHF26) and change as a chip is tapped. So three candidates are mocked with the real lists before any is built: the page as it
is with the dependent chips appearing in place; the page with one "Refine" sheet holding the facets, the picks left on the page
as removable chips; and two stages (the kind of place, then what applies to it). No recommendation is made until the lists'
sizes are known; the owner chooses from the mocks.

## Open

1. **The lists** (SHF2, SHF20): after chronicles-data's next OpenStreetMap run reports `osmKindCounts` (every value of `shop`,
   `craft`, `tourism`, `historic`, `leisure` and `amenity` in the US).
2. **Whether clothes, shoes and jewellery sold new are "worth browsing"** or errands: the owner's, kind by kind, with the count.
3. **The table of how each kind is visited** (SHF21): a church, a lighthouse, a fort and a cemetery are each arguable; drafted
   with the lists and shown to the owner.
4. **The composer's form** (SHF14a), now with facets that depend on one another.
5. **Where galleries and other new kinds come from**: the places pack is Wikidata alone today, and OpenStreetMap's own galleries
   and museums are not in it. A contract change in chronicles-data, after the count.

## Record

Nothing is built in the app. Decision 0219, widened the same day. chronicles-data: the counts of every kind of stop are built on
its branch `claude/determined-wright-yg1fq9` (SK1-SK9, 125 tests), not on its main, so no run has reported yet.
