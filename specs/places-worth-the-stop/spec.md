<!-- Mirror of the Claude Docs tab "Places worth the stop (queued)" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. Everything from "## Vision" down is repo first (Nov 5, after decision 0101), not yet in the doc; the doc's "Region packs" call (R2, a scheduled job) predates 0101 and needs the owner's edit. -->

# Places worth the stop

Nov 1, 2026 · @Miguel Guerrero

When you arrive in a town, the things that make it worth the stop are already on the map: its landmarks, its history, its one-of-a-kind places, not only its big attractions. Queued: the owner's calls are below; numbered criteria come when the slice starts.

## The owner's calls (Nov 1)

- **Distinctive, not good.** A place is chosen for being historic or one of a kind, never for its ratings. No stars, rankings or best-of lists.
- **Open-data signals plus the owner's edits.** Places come from open data automatically; a small editable file adds or removes places, like `chains.json` and `notable.json` today.
- **US first**, matching the shipped boundary pack and backed by the National Register of Historic Places.
- **Region packs, downloaded on demand.** A build script makes one pack per region, as `build-boundaries.js` does. The phone fetches a region's pack when you're there, like map tiles. Nothing about you is sent. A scheduled GitHub Actions job builds the packs and a \`manifest.json\` onto static storage (Cloudflare R2 suggested; Pages caps files at 100 MB). No API.

## Tiers

| Tier | Example | On the map |
| --- | --- | --- |
| Landmarks and history | heritage-listed buildings, monuments, historic districts | always, when you arrive |
| One-of-a-kind places | a historic pretzel bakery, a novelty shop | always, even though they're food or shops |
| Big attractions | an aquarium, an amusement park | present, never the point |
| Ordinary shops and food | chains, everyday cafés | never a place, only part of a busy street |

## Sources

The map tiles carry only a category and a name, so today a historic bakery reads as a bakery and is dropped as food. The pack draws on richer open data:

| Source | Signal | Licence |
| --- | --- | --- |
| OpenStreetMap full tags | `historic`, `heritage`, `tourism`, links to Wikipedia and Wikidata | ODbL, credit required |
| Wikidata | heritage designations (National Register), coordinates | CC0 |
| Wikivoyage | each town's See and Do listings | CC BY-SA, credit required |
| The owner's file | adds and removals | ours |

A place reaches the app through the existing `PlaceSource` interface, behind an adapter, so no dataset is hard-coded. A shop or eatery becomes a place only with a signal (a heritage listing, a historic tag, a Wikipedia article, a Wikivoyage listing, or the owner's file).

## Open questions

- [ ] How the Explore tab shows a town on arrival: a short list, map marks only, or both?
- [ ] Where credits for OpenStreetMap and Wikivoyage show in the app.
- [ ] How packs fit with the place cache and the checklists: do they replace the tile POIs as the source of marks, or add to them?
- [ ] How much text a place carries (one line on why it's worth the stop, from Wikivoyage or Wikidata), given no reviews.

## Vision

Idea: Enrich Explore's marks with Atlas Obscura-like places from a prebuilt static PMTiles archive (Wikidata including the National Register, plus OSM tags), read lazily by tile from the Pages site, US first and any region after; oddities get a kind of their own (the owner, Nov 5).
Verb: earn (it raises what you notice: places worth the stop that the tiles don't carry; a find then becomes a memory)
Touches: Never, "Ratings, reviews, stars, 'best of', rankings of places" (nearest fit: "open-data signals such as a heritage listing"); Never, "Popularity, trending, foot traffic, other people's activity"; Never, "Tallies such as '12 of 87'" and Always, "Counts are words" (Open question 6); Never, "Data leaving the device without a tap" (tile reads, the accepted class of 0080, 0083, 0093); decision 0084 ("No significance file and no host"), reversed by 0101; AG5 (what a mark is).
Verdict: aligned if reshaped (decision 0101)
Shape: As asked, with these changes. Significance is a build-time include/exclude gate only, and the archive carries no popularity field. Curiosities are a kind of the existing category "Viewpoints & oddities", chosen by a place's type and never its age or listing. One mark per place across sources, the archive winning. No new count anywhere.
Criteria: PW1, PW3 (tile-aligned reads to one allowed host; silent failure); PW5, PW6 (a pinned class table; type decides); PW7 (no popularity field); PW8 (one mark per place); PW9 (a curiosity is a mark); PW10 (steps fixed, `thin` unchanged); PW11 (never a number); PW12 (cache tagged, recomputed, finds keep their kind); PW15 (credit); PW17 (the sheet's total).
Open: Open question 6 (the place sheet's "N of M" tally, carried as debt); where the credit line lives (PW15).

## Decisions (the owner's calls, Nov 5)

- **Reverses 0084's "no significance file and no host"** for a read-only static archive (decision 0101). Everything else in 0084 stands.
- **The archive adds to the tiles' POIs; it does not replace them** (answers the doc's third open question). A place in both is one mark, the archive's category and kind winning.
- **Host:** the Pages site that serves the web build. One PMTiles file per region and a `manifest.json` naming the regions. US first.
- **Curiosities** are a kind of "Viewpoints & oddities", not History and not a new category. The type of a place decides its kind, never its age or its listing.
- **Significance is a gate, never a measure.** No sitelink count, page views, QRank or rank is stored or shown.
- **Marks only.** The Explore tab shows these places as it shows any mark; no arrival list (the doc's first open question stays as the tab works today).
- **Left for later:** Wikivoyage's listings, a line of why a place is worth the stop, the one-of-a-kind shops and cafés tier, and the scenic routes' Sights leaning (it reads tiles only; decision 0101 asks to check what Curiosities do to it).

## Criteria

1. **PW1 Read by tile, nothing about you.** For the z14 tiles an Explore read covers, the app asks the archive's host for those tiles' byte ranges of one region file, and for nothing else: no identifier, cookie or credential, and never the whole file. Requests use `credentials: 'omit'` and `referrerPolicy: 'no-referrer'`, so the journey's request log shows neither a cookie nor a referer. The host is on `ALLOWED_HOSTS` with its reason, added when PW16 confirms it.
2. **PW2 The region, from the manifest.** The app reads `manifest.json` from the same host at most once a day (the time kept; a failed check waits 10 minutes) and picks the region whose box holds the read's centre. Outside every region, or with no manifest, a read goes on as it does today and nothing is shown. The manifest names each region's file by version (`places-<version>.pmtiles`), and a 404 on a name it no longer lists sends the reader back to the manifest. Tiles are stored at z12; the reader asks for the one holding each z14 tile of the read.
3. **PW3 Silent when it can't be read.** An archive that is offline, times out, answers 403 or 404, or whose header never arrives leaves Explore and the atlas as they are without it: no error, no empty state, no count of what is missing. The next read tries again.
4. **PW4 Curiosities, a kind.** "What I'm into" lists Curiosities with the other kinds, on by default, in the category Viewpoints & oddities. A kind switched off hides its places on the tab, the walk and the atlas, as every kind does (E16).
5. **PW5 The classes are a pinned table.** Each class the archive carries maps to one category and kind: follies and novelty buildings, roadside giants, natural oddities, odd engineering, places that mark a fact, art environments, and ruins not framed as historic to Curiosities; markers, memorials and statues to Monuments; murals and sculpture to Public art; overlooks and towers to Viewpoints; heritage-listed buildings to History. A class not in the table is left out, never guessed. A test pins the list, so a new class is a deliberate change (as AG5).
6. **PW6 Type decides, never age.** The build script gives each place one class, in this order, each step a fixed list of Wikidata classes and OSM tags in `classify.js` and never a judgment at run time: it commemorates, so a monument; it was made as art, so public art; you go there to look out, so a viewpoint; it is one of the odd classes, so a curiosity; else history, or left out. A century-old folly is a curiosity; a heritage-listed ordinary house is history; fixtures hold both.
7. **PW7 Significance is a gate, never a measure.** A place enters the archive only with both a class from the pinned table and a signal: a heritage listing, an owner's add, or, for the odd classes, a Wikidata or Wikipedia entry as corroboration. A signal alone never admits a place, and none is ever a count. Each place carries its name, class, source and an id for deduping, and nothing else: no sitelink count, page views, QRank or rank. The script's output test fails on any other property. No view, sort or string reads `source` or the id; marks keep their existing order.
8. **PW8 One mark per place.** A place in the tiles and in the archive with the same name within 50 m, in any category, is one mark; the archive's category and kind win. A find on it is a find whichever source named it.
9. **PW9 A curiosity is a mark.** In an area a read saw whole, an archive place is on its checklist: a "?" until near, named within 60 m, found by a capture within 60 m, and the find is a memory with its context, as any mark. An unnamed archive place is never kept. A quiet walk reads the archive too, so a capture can find one.
10. **PW10 The atlas counts them.** The atlas counts curiosities among Viewpoints & oddities' findable places, in the ring and across a town's outline, and its dots and "?" agree (AG1). The steps stay fixed: `STEPS` takes no input from the archive, and a test pins it. A ring's `thin` is judged from the tiles' places alone, so it reads the same with or without the archive. `ATLAS_CODE` is bumped; the profile records the archive version; a read without the archive never replaces a profile measured with it, and a ring measured without it while one is known is read again after 30 minutes, as Overture's is.
11. **PW11 Never a number.** Nothing shows a count, rank, score or "popular" mark for curiosities or for the archive; the strings this slice adds carry no digit; a kind is present or absent, in words. The kinds list, the card's kind rows and `MARKS_EXPLAINED` carry no digit after the change. `npm run check:vision` stays green.
12. **PW12 A new version recomputes.** A checklist area records the archive version it was built with. One built without the archive while one is known, or with an older version, is rebuilt on the next read; derived rows are recomputed, never patched. An item already found stays found (finds are kept) and keeps the category and kind it was found under, even when a newer archive changes or drops its place; only unfound items take the archive's.
13. **PW13 The owner's edits.** A small file beside `chains.json` removes places (by name and position) and adds them (name, position, class). A removed place never shows, whichever source named it; an added one is a mark of its class.
14. **PW14 The build script.** `scripts/build-places-archive.js` turns a Wikidata result file and an OSM GeoJSON export into one region's `places.pmtiles` and the `manifest.json`, the same bytes each time. The queries it expects are kept beside it. The app never reads Wikidata's or OSM's format.
15. **PW15 Credit.** OSM-derived places are credited where the app credits its sources (where: the owner's call).
16. **PW16 Verified on the real host.** Before the reader is relied on, one fetch against the Pages deploy shows byte-range requests and CORS working for the web build and for a cross-origin client. The result is recorded here. Until then the manifest's address is empty and the reader does nothing (PW2), and the host is added to `ALLOWED_HOSTS` in the commit that records it.
17. **PW17 The place sheet's total** (settled by decision 0099, the owner, Nov 5): a place's sheet names its finds and shows no count or total, so archive places add nothing to count. A test pins that no total including archive places is shown.
18. **PW18 The scenic routes are unchanged.** The Sights leaning reads the same places with and without the archive (it is not wired into the scenic read), and a test pins it.
