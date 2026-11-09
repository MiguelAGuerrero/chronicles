<!-- Repo first: written from the owner's calls in a session (Nov 9, decisions 0106-0108), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Places out of town

Nov 9, 2026 · @Miguel Guerrero

Explore misses notable places outside any town: a shrine on the Saskatchewan prairie, a roadside oddity, a statue off a highway. The map tiles rarely carry them. The places archive (Places worth the stop, decision 0103) is US only, has no class for a shrine or a grotto, takes only places with a Wikidata entry, and drops any class it doesn't know. Explore reads only around areas, so a place beyond every area's reach shows only if you walk right past it. This slice widens what the archive holds, lets every notable place in whether or not it fits a kind, and shows the places beyond every town on Explore's map, grouped as the Chronicle map groups its stars.

It builds on Places worth the stop, which must be live first (PW16; the owner, Nov 9).

## Decisions (the owner's calls, Nov 9)

- **Kinds filter what you see, never what exists** (0106). Kinds shape Explore, Navigate and the kind walk only. Any notable place enters the archive; a place nothing sorts goes under a new "Other places" switch, so every "?" can be hidden.
- **The type-to-kind mapping lives in the app** (0106): the archive stores each place's type.
- **Sources** (0106): OpenStreetMap places with a name and a pinned tag, with or without a Wikidata entry; more Wikidata classes; GeoNames; Canada's heritage registers once their licences are checked. Canada is a second region. Atlas Obscura, Roadside America and the Historical Marker Database are not open data and stay out.
- **Kinds for the new places** (0107): wayside shrines and crosses under Monuments; a pilgrimage site with a church under Historic churches; grottoes under Curiosities; a historic business under Monuments, in History & landmarks. The Monuments switch is relabelled "Monuments and landmarks".
- **One-of-a-kind businesses** (0106, 0107) enter only by a structural signal (a heritage listing, a historic or heritage tag, the owner's add), never ratings, reviews, popularity or a Wikipedia article, never a chain; they show wherever they are in range, in town and out, as any mark.
- **Showing a place is the value; its kind is a bonus** (0108). Nothing is fetched or joined only to sort a place; no age threshold; no measuring step.
- **On the map** (0106): places beyond every area's reach show as "?" within 50 km of you, merged into same-size stars with no number; a tap on one names it, with Walk here or Open in Maps.
- **Plan choices** (Nov 9, decision 0109): the build flags a place within a town's reach, from city, town and village points with the app's own reach numbers; OpenStreetMap places come from Geofabrik's state and province extracts filtered with osmium; Other places get a presence dot and a kind row on the atlas like any kind; the owner's add file needs no stated reason.
- **Test cases** (0107): a rural Saskatchewan shrine out of town; the Julius Sturgis Pretzel Bakery in Lititz, Pennsylvania, a historic business in town.

## Vision

Idea: Show notable places outside any town (a rural shrine, a roadside oddity) on Explore's map within 50 km of you, from more open sources and a Canada region; every notable place enters whether or not it fits a kind, with an "Other places" switch; "?" grouped into countless stars, named on a tap, with Walk here or Open in Maps (the owner, Nov 9).
Verb: earn (it raises what you notice: places the tiles never carry and the town-based reads never reach; a find there is a memory)
Touches: Who it is for, "not tourists working through a list"; decision 0031, "discoveries in the moment, not a planned list" (and 0101); Never, "Tallies such as '12 of 87'" (no counts on Explore, NV14); Always, "Guidance is structural: … never whether it is good"; Never, "Ratings, reviews, stars, 'best of', rankings of places"; Never, "Popularity, trending"; Never, "Data leaving the device without a tap" (tile reads, the accepted class of 0080, 0083, 0093, 0103); the Shapes table, "Open in Maps hands that job to the phone's maps app"; decisions 0103 (class table, one mark per place), 0044 (a mark is an attraction), 0084 and AG5 (grading, what a mark is).
Verdict: aligned if reshaped (decisions 0106-0108)
Shape: Only places beyond every area's reach, within 50 km, kind switched on; a "?" with no label, merged into a same-size star with no number, a tap on a star zooms in; a tap on one place opens a card with its name, its kind and its distance in words, Walk here only within walking reach, else Open in Maps; never a list, a count or an order; no change to any area's grading. A business enters only by a structural signal, never a chain, and the card never says why a place is good.
Criteria: OP10-OP16, OP18, OP19, OP7, OP5.
Open: none for the gate. A line in VISION.md's Shapes table for places reached by car ("a walk can start where you park") is the owner's to make.

## Criteria

### The archive

1. **OP1 More sources, one place each.** The archive build takes, beside Wikidata: OpenStreetMap places with a name and a tag from a pinned list (among them `historic=wayside_shrine`, `historic=wayside_cross`, a named `tourism=attraction`, `historic=memorial`, `historic=monument`), with or without a Wikidata link; GeoNames features of pinned codes (among them `S.SHRN`, `S.MNMT`, `S.RUIN`); and Canada's federal heritage directory once its licence is recorded. A place two sources hold, with the same name within 50 m, is one place in the archive.
2. **OP2 Canada, a region of its own.** The manifest lists a Canada region beside the US, each with its own boxes, so a read in Saskatchewan asks the Canada file and a read in Lititz the US file; a point in neither region reads nothing (fixes places-worth-the-stop audit F7).
3. **OP3 Every notable place enters.** A place whose type no kind covers is kept, with its type; it is never dropped for lacking a kind. The app shows it under "Other places".
4. **OP4 Kinds for the new types.** A wayside shrine or cross is Monuments; a pilgrimage site with a church is Historic churches; a grotto is Curiosities; a historic business is Monuments, in History & landmarks. A test pins the app's table of types to kinds, so each new type is a deliberate change.
5. **OP5 A business only by a structural signal.** A shop, eatery or other business enters only with a heritage listing, a historic or heritage tag, or the owner's add. A chain (`chains.json`) never enters; an ordinary business with none of these never enters. No source's rating, review count, popularity, page views or Wikipedia article is read. The build's output test fails on any other property (PW7's rule, extended).
6. **OP6 Nothing fetched only to sort a place.** A place's kind comes from what the build already reads for it to enter: its type, its tags, its name. The build makes no request and joins no data set whose only use is to sort a place (decision 0108).

### What I'm into

7. **OP7 "Other places".** "What I'm into" lists Other places after the nine kinds, on by default. Switched off, a place of no kind shows no "?" on the walk, the atlas or the out-of-town map, as every kind does (E16).
8. **OP8 "Monuments and landmarks".** The Monuments switch reads "Monuments and landmarks". A user who switched it off before keeps it off.
9. **OP9 Businesses wherever in range.** A one-of-a-kind business from the archive is a mark like any other: a "?" on an exploring walk within the range, a find by a capture within 60 m, in town and out.

### The out-of-town map

10. **OP10 Only beyond every area, only near you.** On Explore's map, a place from the archive shows as a "?" when it lies beyond the reach of every neighborhood and town (the reach Explore's membership uses), within 50 km of where you are, and its kind (or Other places) is on. A place inside any area's reach never shows on this layer.
11. **OP11 Stars without numbers.** "?" marks closer than the grouping distance on screen merge into one star, drawn the same size as a single "?", with no number. A tap on a star frames the places it stands for. Every star and every "?" has the same accessible name ("A place to find. Zoom in" for a star, "A place to find" for one), with no number or count word; the Chronicle map's `starLabel` is not reused (steward S1).
12. **OP12 Named on a tap, and only there.** No "?" on this layer carries a label. A tap on one opens a card with its name, its kind's label and its distance in words ("about 12 km"), and nothing else: no description, source, id, rank or notability. The kind line is one of the `KINDS` labels word for word, or "A place" for Other places; it never shows the place's type, source, town flag or a listing (steward S3).
13. **OP13 Walk here near, Open in Maps far.** The card offers Walk here only when the place is within walking reach (the navigator's own limit, `NAV.maxM`); beyond it, only Open in Maps. The app never computes a driving route.
14. **OP14 Never a list, a count or an order.** Nothing on Explore (map, card, title, toast, live region, accessible names, titles) lists these places, counts them in digits or in words, or orders them. A digit appears only in the card's distance line (steward S5).
15. **OP15 Far places leave areas alone.** A place flagged out of town changes no area's dots, kind rows, `thin` or "?" marks: an area's profile is the same with and without it.
16. **OP16 Silent, and to one host.** The layer reads only the archive's host, already allowed; when the archive or its overview can't be read, Explore shows nothing extra and no error (as PW3). It reads only while Explore's map is on screen, never during a walk or in the background, and again only after you move 10 km or a new archive version is known (steward silent 2, following the atlas's loop).

18. **OP18 A find changes nothing on this layer.** A far place you have found looks and is labelled exactly like one you haven't, and is named only on its card: no colour, tick or "Found" on the far layer (steward S2).
19. **OP19 No paging through places.** A far mark is never the target of a swipe or arrow-key step between areas, and the card has no next or previous place (steward S4).

20. **OP20 Other places on the atlas.** Inside an area, Other places count as presence like any kind: a dot on the area's tile when present and a row on its card, read against fixed steps (AG). `thin` is still judged from the map's places alone (PW10).

### Credit

17. **OP17 Credit.** GeoNames, and Canada's directory if used, are credited with the map's credits beside OpenStreetMap (PW15).

## Record

Spec and plan written Nov 9; waiting on the owner's review and on Places worth the stop going live (PW16).
