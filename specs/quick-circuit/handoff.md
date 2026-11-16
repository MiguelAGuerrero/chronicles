# Plan an outing: the stores pack's side, for chronicles-data

The app reads a stores layer through `outing/storesRead.ts` (QC11-QC15). The build lives in chronicles-data (decision 0108), so this note
is the contract it must meet. It follows the places archive's contract (`src/lib/__tests__/explore/contract/`) and its manifest.

## The record (one store)

`id` (opaque, stable, from the crosswalk), `name`, `at` ([lon, lat]), `what` (one or more of the closed list below), `src` (a source's
short code). Nothing else: no rating, review count, price level, popularity, foot traffic, photo, or "open now". `hours` is reserved
(absent in v1) so a later contract version can add it without renaming anything.

## The closed list of specialisms (v1)

`antiques`, `vintage`, `books`, `records`, `maps`, `art_supplies`, `crafts`. A shop with none of them is not in the pack. The app's
vocabulary maps entries to these (`outing/wants.ts`); an entry may match several.

## What may enter, and from where

- **By what it sells**: OpenStreetMap `shop=antiques|second_hand|books|music|…` and `craft`, `second_hand=only` for vintage, and Wikidata
  instances of the same shop types. Open data only; attribution carried as the archive's is.
- **Never**: Google Places, Yelp, Foursquare or any source whose records carry ratings, reviews or popularity; a source's fields of those
  kinds are dropped before the record is built (PP5-PP7's rule: the gate reads no count).
- **Chains** are left out by `chains.json`'s rule (whole leading words) at build time as well as in the app.
- **A nominating source** (a forum, a list) only nominates to the review list, never a pack (0108).

## Packaging

Tiles inside one region file per region, listed in the manifest as `stores` beside `archive` (absent in older manifests, as `hashes` was);
the same pages site and a versioned name; the manifest's rules for checking (daily, 10 min after a failure) are the archive's.

## What the app does until a pack exists

Reads the tiles' shop subtypes through the same vocabulary; a read that fails leaves it so with nothing said (QC14).
