# OpenStreetMap locates places (OL1-OL12)

Draft for the owner's review, Nov 11. Decision 0142. The owner's Claude Docs doc wins over this mirror once it exists;
no test or code is written until the owner has read this. The build side is in chronicles-data (its `docs/spec.md`
carries the same criteria under the same ids); the app side is the pinned contract and the read of an unnamed place.

## Vision
Idea: OpenStreetMap locates monuments and memorials beside Wikidata, so the archive is the superset, with corroboration deferred.
Verb: earn (the walker notices a significant monument the app missed)
Touches: 0110 "OpenStreetMap only corroborates" (superseded by 0142); 0108 "a nomination never changes a pack" (not touched: OpenStreetMap locates); 0109 "an unmapped tag is left out, never guessed", "Never where it can't be reached", "Noise is reviewed before publishing"; 0103 "significance is a gate, never a measure"; VISION Never: popularity (not touched: tags are structural, and no count of sources is kept).
Verdict: aligned if reshaped
Shape: named or unnamed monuments and memorials by a pinned table; plaques, benches and the like stay out; the build reports what it added for the owner to strike.
Criteria: OL1-OL12 below.
Open: none. The owner's calls, Nov 11: an unnamed place is called "A monument", in the words of "A viewpoint" (a name that says "unnamed" does not match standing in front of one, which often has a plaque); a memorial with no `memorial=*` value or no name enters; the refinements below apply to unnamed places as to named ones.

## Criteria
- **OL1** A `historic=monument` element with no `wikidata` tag is in the pack as class `monument`, named or not.
- **OL2** A `historic=memorial` element with a `memorial=*` or `monument=*` value the table names is in the pack as that value's class (obelisk: monument; statue: statue; war memorial, stone, cross: memorial). A test pins the table: a new value is a deliberate change.
- **OL3** A value the table excludes (plaque, bench, stolperstein, ghost bike, grave marker) is not in the pack, named or not. A `historic=memorial` with no value enters as class `memorial`, named or not.
- **OL4** The refinements are one filter for named and unnamed places alike: the table (OL2, OL3), access and lifecycle tags (OL5) and merging (OL6). An unnamed place of the table's types enters with no name (the contract allows it for this source, version 3), and a named one is never replaced by an unnamed one.
- **OL5** `access=private|no`, and the `demolished:`, `razed:` and `destroyed:` tags, keep a place out, whichever source located it (RD9, RD10).
- **OL6** The same place in OpenStreetMap and Wikidata is one place: the same class within 50 m, or the same name within 50 m (0111); an unnamed OpenStreetMap place within 50 m of a named Wikidata one of the same class is that place.
- **OL7** The gate reads no source name and no count. A pack's feature keeps name (when it has one), class, src and id (PW7, PP9); no number says how many sources name a place, and nothing is ordered by it.
- **OL8** The build's report lists what OpenStreetMap added, by area and class, before a pack is published; the owner strikes a type or a place with `edits.json`.
- **OL9** A place only OpenStreetMap knows enters the pack with no second source confirming it (corroboration deferred); the confirming adapter is unchanged and still removes a place it finds closed or gone. A locating source of another license family makes the region's one pack that family's (RD11): the US pack is ODbL, as 0142 accepts.
- **OL10** The contract is version 3 (a place may have no name); the app pins the copy and `placesContract.test.ts` (PP17) holds its class table and reader to it.
- **OL11** In the app an unnamed archive place is a mark of its class's kind; its card calls it "A monument" (the words of "A viewpoint", never "unnamed", never a count), and the replay and the home use that name where a name would go ("Passed a monument without stopping"). Only a monument, memorial or statue may be unnamed; another class still needs a name.
- **OL12** The Harrisburg case, end to end in the app's tests: an OpenStreetMap-only obelisk (`historic=memorial`, `memorial=obelisk`, no `wikidata`) in an archive tile is a mark within 60 m of a capture, and finds it.

## Plan (for the owner to read)
1. chronicles-data: the OpenStreetMap locating adapter over the shared extract pass; class table; contract v3; the build report; tests per criterion first.
2. App: take contract v3; read an unnamed place; one findable-mark test (OL12).
3. Owner reviews the report of what was added in the test areas (Harrisburg, Bethlehem, Allentown, Easton, Pittsburgh) before the first publish.
