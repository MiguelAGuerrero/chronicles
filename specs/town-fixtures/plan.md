# Plan: town fixtures, the data set (G13: TF1, TF2, TF4, TF5, TF14, TF19, TF21, TF25-TF27)

From `docs/STATUS.md`, "Next evolutions", G13 (the owner's yes in person, Nov 26; the kind list approved Nov 25). Verdict
of this slice: **no surface** (the spec's screens, TF6-TF13, keep 0225's "aligned if reshaped" and come after with a
mock-up). Nothing a person sees changes: no pin, no layer, no card line, no instance any screen calls.

Two repositories. The data side is chronicles-data's `docs/fixtures/spec.md` (FX1-FX14) and `docs/fixtures/plan.md`,
built and pushed first; then one manual build publishes the first pack. This repo's side is below.

## The base it lands on

`node scripts/tend.js base outing explore` (Nov 26): outing unseen, nothing above low open; explore "lands on a rough
base: a change since its sweep added a screen or a control (db7c6ba, e51f4e9, d14f6fa)". The slice adds no screen or
control and takes none of explore's items on.

## Files

- `src/lib/fixtures/kinds.ts` (`@layer core`): `Fixture` `{ id, kind, at, name?, src }`, `KINDS` (the contract's thirteen,
  in its order, each with its OpenStreetMap tag for the test's pin only), `isFixture` (exactly those fields; any other fails).
- `src/lib/fixtures/read.ts` (`@layer adapter`): the only file that knows the pack's schema. `decodeFixturesTile` (layer
  `fixtures`, z12), `fixturesFromFeatures` (reads `kind`, `id`, `src`, `name` and nothing else; an unknown kind is dropped,
  never an error), `FixturesSource` `{ read(bounds, shouldStop?) }`, `memoryFixtures(list)` for tests, `readFixtures`
  (a failure or no source is none, said nowhere), `FIXTURE_TILES_MAX` (9 z12 tiles: a wider view reads nothing).
- `src/lib/fixtures/pack.ts` (`@layer shell`): `createFixturesPack({ manifest: { fixturesFileAt, fixturesMissing }, io:
  { base, open, decode } })`, through the generic `net/tileReader` (as `outing/storesPack.ts`): the bounds' z12 tiles from
  the region's current fixtures file, each a byte range of the file under the Pages base, with its timeouts and stop.
- `src/lib/discovery/archiveManifest.ts`: `Region.fixtures` (`{ current, previous }`, the file `fixtures-<region>-<v>.pmtiles`),
  parsed as `stores` is; a manifest without it parses as before.
- `src/lib/discovery/archive/shell.ts`: `fixturesFileAt(at)` and `fixturesMissing(file)`, beside `storesFileAt`.
- `scripts/features.js`: a feature `fixtures` (source `src/lib/fixtures/**`, rule `town-fixtures`, no journey, spec
  `town-fixtures` moved from `outing`'s list, where it was claimed while unbuilt).
- `.claude/rules/town-fixtures.md`: the feature's rule file (its own folder and decision, slice step 7).
- No app instance: the screens' slice wires `createFixturesPack` to `placesArchive` and `net` where a screen reads it. Five
  source files.

## Data

No truth, no cache, no migration, no IndexedDB version, no meta key: the app stores nothing of a fixture (TF19). The pack is
read by tile and held only in the tile reader's memo (64 tiles at most).

## Tests (`src/lib/__tests__/fixtures/`, todo first)

The contract pin: `src/lib/__tests__/fixtures/contract/` holds chronicles-data's `fixtures.schema.json`, its
`example/fixtures-example-20261109.pmtiles`, `fixtures-example.json` and the example `manifest.json` (contract v9), with a
README saying how to take a new one.

| Id | Test (`fixtures.test.ts` unless named) |
|---|---|
| TF1 | the app's `KINDS` are the pinned contract's kinds and tags, thirteen, in its order; the contract says a client ignores an unknown kind |
| TF2 | no practical amenity (toilets, parking, drinking water, bench, atm, bus stop) is a kind; a pack feature of kind `toilets` is dropped |
| TF4 | the example pack through `createFixturesPack` over an in-memory archive and `memoryFixtures` give the example's records; a manifest with no `fixtures`, a point outside every region and a failed read give none and throw nothing; no fixture name or position is spelled under `src/` (grep of the example's names) |
| TF5 | `isFixture` refuses each extra field (rating, visits, count, hours); `fixturesFromFeatures` reads only `kind`, `id`, `src`, `name` (a feature poisoned with crowd properties gives the same fixture); an unnamed square keeps no name |
| TF14 | a read asks only the z12 tiles of its bounds, each once; bounds over more than `FIXTURE_TILES_MAX` tiles read nothing; `shouldStop` true before or during a read ends it with nothing and no further tile |
| TF19 | the fixtures modules take no db, meta or storage port and export no count; the contract's record, feature and manifest entry hold no count field |
| TF21 | every request a read makes is a byte range of `fixtures-*.pmtiles` under `PLACES_BASE`'s host, with no query or header of its own; the host table is unchanged |
| TF25 | the pinned example holds one record per fixture (no two of one kind with one name within 250 m) and both sources, OpenStreetMap's and Wikidata's (`src` `osm` and `wd`); the data side's FX6 and FX13 are its tests there |
| TF26 | the contract's `tourist_office` is `information=office`; neither `visitor_centre` nor its tag is a kind |
| TF27 | `published.test.ts`: a recording of the byte ranges the app's web read path (`net/shell.ts`'s `source`) asked of the published pack, for Stowe and Marfa, replayed through `createFixturesPack`: each town's tourist office where OpenStreetMap has one, its town hall and its library are read, and every fixture's kind is one of the thirteen. A range the recording lacks fails the test |

TF27's recording is taken once the manual build has published, by a script kept outside the repo (it uses `createNet` with
Node's `fetch`, `platform: 'web'`), and committed with the pack's file name and version in its header.

## The testing's size

Small: unit tests only (`npm run test:affected`, then `npm test`). No screen changes, no journey covers these files; the
`launch` journey runs once before publishing as the smoke. Minutes: about 4 for the suite, 3 for `launch`.

## Deferred

- The screens (TF6-TF13), with a mock-up first (decision 0252). TF3 (a kind is a fixture or a find, never both: bandstands,
  town halls and libraries can be finds today), TF15-TF18, TF20, TF22-TF24: later slices.
- Overture folded in (decision 0268): it needs a new host and a reader for its format in chronicles-data's build. Filed in
  `docs/DEFERRED.md`. Wikidata's public libraries are folded in now, by a read of their own (chronicles-data FX13).
- For the screens' slice (decision 0268): a town's card names only fixtures with a name; unnamed ones are drawn on the map.
- Which town a fixture belongs to (read against the outline by the screens' slice). Every `railway=station` but a heritage
  railway's is a station (decision 0268); no "main" one is chosen.

## Native

None: the read is the places archive's own path (`net.source`, `TileReader`), already on both platforms; nothing new runs
only on a phone. Nothing of this has run on a phone.

## Cost

A read is at most nine z12 tiles (a view of a town), each a byte range of a few KB, read once per pack version (the memo);
nothing per frame, per fix or on a tab's focus; nothing stored. No harness: no screen calls it yet; the screens' slice
measures with `scripts/perf-explore.js`.

## Screens

None in this slice: no action, no control, no goal-to-control line.
</content>
</invoke>
