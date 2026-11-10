# Remarkable and public: the build's side, for chronicles-data

While this slice was built (Nov 9), the places pipeline moved to chronicles-data (decision 0108). The app's side of the
slice shipped here; the archive's rule did not, because its files left this repo. This note lists what to port, from
this repo's history, into chronicles-data's Wikidata adapter and gate. The owner's calls behind it are decisions
0109-0111.

## What to port

All at commit `5a9a2bc` (after the audit's fixes) on the branch `claude/gallant-maxwell-hp14jb`, merged to main:

- `scripts/places-archive/classify.mjs`: `listing(item, signals)` (RP1-RP4, RP8, audit 1, 10), `classify` with the
  district checked first (RP6, audit 12), `keep(item, signals)` with `closed` (RP5), `OPEN_TAGS`, `CLOSED_ACCESS`,
  `NRHP`.
- `scripts/places-archive/pin-types.mjs` and `public-types.json`: the pinned groups (church, cemetery, theatre, public,
  museum, open, site, home, mundane), each root with its subclasses; only a home is taken out of the public groups
  (audit 1).
- `scripts/build-places-archive.mjs`: `osmSignals` (GeoJSON or Overpass JSON, `wikidata=Q1;Q2`, only `demolished:`,
  `razed:`, `destroyed:` mean gone; audit 2, 4, 11), `reviewOf` and `reviewDir` (`--review`, `--review-out`; RP12,
  audit 18).
- `scripts/places-archive/fetch-wikidata.mjs`: `cellQuery` asking for National Register listings without an end time
  (RP10, audit 13), `parseAnswer` (a cut-off answer splits the cell, audit 13), `listed` on each item.
- `scripts/places-archive/osm.overpassql`: the OSM export the build expects, bounded and well formed (audit 2).
- Tests: `src/lib/__tests__/explore/placesArchiveBuild.test.ts` at that commit: RP1-RP8, RP10, RP12 and
  `remarkable-and-public audit 1, 2, 4, 10, 11, 12, 13, 18`.

## The contract

The rule adds the archive classes `church` (History, Places of worship), `cemetery` (History, Cemeteries), `theatre`
(Culture, Theatres), `museum` (Culture, Museums and galleries) and `historic_site` (History, Monuments and ruins). They
go into chronicles-data's contract as version 2; the app then takes the new copy (`src/lib/__tests__/explore/contract/`),
adds them to `ARCHIVE_CLASSES`, and RP9's test comes back (a listed church in the tiles lifts the name rule).
`heritage_building` already maps to Buildings and structures in the app.

## What the weekly job then needs

`--osm` built from the Overpass query (RP2's and RP5's signals act only then), and the review written to its own
folder, never published.
