# The shop contract, pinned

The app's copy of the shop pack's contract (specs/shop-marks, SM8), agreed here first so both halves build to one thing. It
moves to chronicles-data's `contract/` (https://github.com/MiguelAGuerrero/chronicles-data, decision 0108) when its OpenStreetMap
shop adapter is built there, and this folder is then a copy of that one. `contract.test.ts` holds the app's reader and drawn list
to it. To take a new contract: copy chronicles-data's `contract/` over this folder (README aside), run the test, and change the app
where it fails.

- **One record per named `shop=*`:** `type` (the OpenStreetMap `shop` value, as it is), `name`, `at` and, only when set, `chain: true`.
  Nothing else: no rating, popularity, hours, phone, website, description or brand string (`additionalProperties: false`). A shop with
  no name is not a record.
- **`chain`** is set by the build from `brand`, `brand:wikidata` or `operator`, which are then dropped. Absent means "not flagged", never
  "independent".
- **The pack carries every named shop**; the app draws only the types in its own list (`shopMarks/types.ts`), so a new type
  is drawn by an app change and never by a rebuild. `shop-types.json` lists the values the build may write.
- **Files:** `shops-<region>-<yyyymmdd>[.n].pmtiles`, one z12 tile layer named `shops`, with a `manifest.json` of the
  places manifest's shape (schema 1, regions, current and previous files, bounds) beside them.
