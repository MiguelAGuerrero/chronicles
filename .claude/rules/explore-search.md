---
paths:
  - "src/lib/gazetteer/**"
  - "src/components/atlas/PlaceSearch.tsx"
  - "src/lib/__tests__/explore/gazetteer*.test.ts"
  - "src/lib/__tests__/arch/gazetteerLayers.test.ts"
  - "scripts/build-gazetteer.js"
  - "scripts/e2e/journeys/placesearch.js"
  - "assets/gazetteer/**"
  - "specs/place-search/**"
---
# Explore: place search

GZ1-GZ19, decision 0184. The pack (`assets/gazetteer/places.json`) is built by `scripts/build-gazetteer.js` from GeoNames files (`download.geonames.org` is blocked from cloud sessions unless the environment allows it); rebuild it with a new date and update `GAZETTEER_CREDIT` in `components/map/types.ts` (a test holds it equal to the pack's credit). **Never add a population, rank or class to the pack** (`validatePack`, GZ13): nothing may order or show a size. Matching: `fold` (case, diacritics, punctuation, Saint is St); a query's later words may start the region, its short code ("pa") or the country; alternates are every ASCII name that looks like a name, kept by no size test. `search(index, query, origin)` takes the order's origin as an argument (a fresh fix, else the live map's middle, never a saved camera) and keeps the nearest `LIMIT`, with `more` when it cut; its "Keep typing to narrow it." never carries a number. The index builds once per source (`indexOf`, about 0.7 s in Node, unmeasured on a phone) after one yield so "Getting ready…" draws. A pick is `lookAt(at, named)` in `explore.tsx`: `looked.named` makes every look word name the place (`lookWords(named)`, `lookRowLabel`, `emptyLook`), it cancels an in-flight Look here, frames the point itself (a place may have no mapped areas), and leaves Move map as found. The sheet is inside the screen, not a `Modal`; its field has no outline on web (the global `:focus-visible` rule is switched off for it in `webStyles.web.ts`; the focused row's underline is the focus); the magnifier is absent while the walk planner is open; the search stores nothing (`arch/gazetteerLayers.test.ts`).

- **The web fetches the pack** (the owner's answer of Nov 16, "Fetch on first search"; a web exception, `docs/ARCHITECTURE.md`): `source.web.ts` fetches `<base>/gazetteer/places.json` (`packUrl`) on first search, copied into `public/` by `scripts/copy-maplibre-worker.js`; native keeps `require` in `source.ts`. Never `require` or `import` the pack from any other module (it would inline it in the web's one entry script again; `gazetteerWeb.test.ts`, and the `launch` journey checks the entry script holds no `geonames-cities5000`). A fixed name survives deploys, so a format change must stay readable by the page before it.
