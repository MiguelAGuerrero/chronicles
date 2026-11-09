# 0106. Places out of town: kinds filter what you see, never what exists

Date: 2026-11-09 · Status: accepted · Area: explore, discovery, vision

## Context
Explore misses notable places outside any town: a rural shrine in Saskatchewan, a roadside oddity, a statue off a highway. Three things hide them. The tiles' `poi` layer rarely carries them. The places archive (0103) is US only, has no class for a shrine or grotto, and takes only places with a Wikidata entry. Explore reads only around areas (the atlas's ring or a town's outline, a walk's 60-300 m), and a place beyond every area's reach is an orphan (`area_key` null). The owner asked what open data could add these places and for a way to show them on Explore's map, Atlas Obscura in spirit, with pins grouped as the Chronicle map groups its stars.

The vision gate (0094, Nov 9) found it **aligned if reshaped**. It serves Earn. The lines it touches are "not tourists working through a list" (Who it is for), "discoveries in the moment, not a planned list" (0031, 0101), no counts on Explore (NV14), "never whether it is good" (Always) and "Ratings, reviews, stars, 'best of'" (Never). The vision is silent on places reached by car.

## Decision
The owner's calls, Nov 9:
- **Kinds filter what you see, never what exists.** The "What I'm into" kinds shape only Explore, Navigate and the kind walk. The archive takes any notable place, sorted into one of the kinds where its type allows. This reverses 0103's "a class not in the table is left out, never guessed"; everything else in 0103 stands (significance is a gate, never a measure; one mark per place; type decides).
- **An "Other places" switch** joins "What I'm into" for places that fit no kind, so every "?" can be hidden.
- **The type-to-kind mapping lives in the app.** The archive stores each place's detailed type; the app maps it to a kind, so a re-sorting needs an app update, never an archive rebuild, and an unsorted place keeps its type.
- **One-of-a-kind businesses may enter** (amends 0044, "a mark is for an attraction"): a historic bakery or a novelty shop, but only through a structural signal, the same kind of signal as the rest of the archive: a heritage listing, a historic or heritage tag in OpenStreetMap, or the owner's edit file. Never ratings, reviews, popularity, page views or a Wikipedia article (0103 found nearly every listing has one). Chains stay out (`chains.json`). Ordinary food, shops, lodging and services stay out.
- **Sources** for the weekly `chronicles-data` build, beside Wikidata: OpenStreetMap places with a name and a pinned tag that have no Wikidata entry (wayside shrines and crosses, named attractions, memorials), more Wikidata classes (shrines, grottoes, pilgrimage sites), GeoNames (CC BY), and Canada's heritage registers once their licences are checked. Canada is a second region. Atlas Obscura, Roadside America and the Historical Marker Database are not open data and stay out.
- **On the map:** places beyond every area's reach show as "?" within 50 km of you, merged into one same-size star when close on screen, with no number; a tap on a star zooms in. A tap on one place names it: its name, kind and distance in words, with Walk here only within walking reach and Open in Maps beyond it. A kind switched off hides its "?" here as everywhere.
- **Sequencing:** the places archive goes live first (PW16, its address); this follows as its own slice.

## Consequences
- The gate's shape and criteria go into the slice's spec as its Vision section (the criteria below), renumbered by `/slice`.
  - A place inside any area's reach never shows on the out-of-town layer; one beyond every area's reach, within 50 km, whose kind is on, does.
  - A star is the same size as one place and shows no number.
  - No map label names a place; its name shows only on the card a tap on that one place opens.
  - The card holds name, kind and distance in words, and no description, source, id, rank or notability field.
  - Nothing on Explore lists, counts (in digits or words) or orders these places.
  - They change no area's dots, kind rows, `thin` or "?" marks.
  - A one-of-a-kind business enters only with a heritage listing, a historic or heritage tag, or the owner's add; never a chain.
  - A place whose kind (or "Other places") is switched off shows no "?" anywhere on Explore.
  - A failed read shows nothing extra and no error (as PW3); the app asks no host beyond the archive's.
- The slice starts by measuring, on test areas in rural Saskatchewan and a rural US county, the share of places each kind catches and the share left for "Other places".
- `KINDS` gains "Other places"; `ARCHIVE_CLASSES` and AG5's definition of a mark are re-pinned deliberately; `ATLAS_CODE` is bumped only if grading changes (it should not: out-of-town places belong to no area).
- The archive's tiles are z12 only: a map 50 km wide needs a zoomed-out layer in the build holding each place's position and type.
- GeoNames and the Canadian registers are credited with the map's credits, as OpenStreetMap is (PW15).
- Still open for the owner: the kind a shrine, grotto or wayside cross gets (the gate suggested Monuments and ruins for wayside shrines and crosses, Curiosities for grottoes, Historic churches for a pilgrimage site with a church); whether one-of-a-kind businesses also show as marks in town, or only out of town; and a line in VISION.md's Shapes table for places reached by car ("a walk can start where you park"), which the owner makes.
- Supersedes in part: 0103 (unmapped classes), 0044 (one-of-a-kind businesses).
