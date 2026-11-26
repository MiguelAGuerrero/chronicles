---
paths:
  - "src/lib/fixtures/**"
  - "src/lib/__tests__/fixtures/**"
---
# A town's fixtures

The staples of a settlement (a tourist office, a town hall, a library, a post office, a square, a market, a station, and
six more: the owner's thirteen, Nov 25), from chronicles-data's third pack (its `docs/fixtures/spec.md`, FX1-FX14). The
spec is `specs/town-fixtures/spec.md` (TF1-TF27), decisions 0225, 0255 and 0268. G13 built the data set only: no screen
reads it yet; the card's line and the map's layer (TF6-TF13) come with a mock-up first.

- **A fixture is a stop, never a find** (0225): nothing here counts, marks, finds or lists one to work through, and nothing
  of a fixture is stored on the device (TF19). Words only, when a screen comes: a card names only fixtures that have a
  name; an unnamed square, market or common is for the map (0268, "Map only").
- **The pack's schema is known by `read.ts` alone** (as `discovery/archivePois.ts` for the places): flat properties `kind`,
  `id`, `src`, `name` (absent when it has none), layer `fixtures`, z12. An unknown kind is dropped, never an error; any
  other property is never read (TF5).
- **The read is the places archive's** (TF14, TF21): the manifest's `fixtures` entry (`discovery/archiveManifest.ts`,
  `discovery/archive/shell.ts`'s `fixturesFileAt`), the generic `net/tileReader`, byte ranges of the file under the Pages
  base. A view wider than `FIXTURE_TILES_MAX` z12 tiles reads nothing; a read takes `shouldStop`.
- **The pinned contract** is `src/lib/__tests__/fixtures/contract/` (v9). The places and stores pins keep their own versions.
- **Kinds that are also finds** (TF3, not built): `leisure=bandstand` is also a small place in the places pack, and town
  halls, libraries and courthouses can enter it by a listing; heritage railways' stations are finds and never fixtures.
