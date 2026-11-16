# Plan an outing: the stores pack's side, for chronicles-data

The app reads a stores layer through `outing/storesRead.ts` (QC11-QC15). The build lives in chronicles-data (decision 0108), so this note
is the contract it must meet. It follows the places archive's contract (`src/lib/__tests__/explore/contract/`) and its manifest.

## The record (one store)

`id` (opaque, stable, from the crosswalk), `name`, `at` ([lon, lat]), `facets` (a map from a dimension to one or more values of its closed
list, below), `src` (a source's short code). Nothing else: no rating, review count, price level, popularity, foot traffic, photo, or "open now". `hours` is reserved
(absent in v1) so a later contract version can add it without renaming anything.

## Dimensions and their closed lists

A dimension is added by a contract version, never by a record; the app ignores a dimension or value it does not know (QC40).

- **`what`** (v1, what a shop sells): `antiques`, `vintage`, `books`, `records`, `maps`, `art_supplies`, `crafts`. A shop with none is not in the pack.
- **`how`** (reserved, not emitted in v1; the owner's example, "vintage versus thrift"): `vintage`, `thrift`, `new`, from OpenStreetMap's `second_hand` and `charity`/thrift tags. Never "cheap", "quality" or any measure.

The app's vocabulary maps entries to facets (`outing/wants.ts`); an entry may match several values or combine dimensions.

## What may enter, and from where

- **By what it sells**: OpenStreetMap `shop=antiques|second_hand|books|music|…` and `craft`, `second_hand=only` for vintage, and Wikidata
  instances of the same shop types. Open data only; attribution carried as the archive's is.
- **Never**: Google Places, Yelp, Foursquare or any source whose records carry ratings, reviews or popularity; a source's fields of those
  kinds are dropped before the record is built (PP5-PP7's rule: the gate reads no count).
- **Chains** are left out by `chains.json`'s rule (whole leading words) at build time as well as in the app.
- **A nominating source** (a forum, a list) only nominates to the review list, never a pack (0108).

## Checks at the build (the steward's R5)

A schema validator rejects any record with a field outside the list above; a fixture pack is published in the contract directory and the app's
test reads it (as the archive's contract is pinned in `src/lib/__tests__/explore/contract/`). Wikidata sitelink counts and OpenStreetMap
`wikipedia=` are not read. Where a shop is in the pack and the tiles, the pack's record wins by rule.

## Packaging

Tiles inside one region file per region, listed in the manifest as `stores` beside `archive` (absent in older manifests, as `hashes` was);
the same pages site and a versioned name; the manifest's rules for checking (daily, 10 min after a failure) are the archive's.

## What the app does until a pack exists

Reads the tiles' shop subtypes through the same vocabulary; a read that fails leaves it so with nothing said (QC14).
