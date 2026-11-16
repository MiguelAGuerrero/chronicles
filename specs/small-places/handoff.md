# Small places: the data side (chronicles-data)

What chronicles-data builds for this slice (decision 0183); its own spec numbers these there. The app side (SP1-SP18)
takes the contract this produces (SP17) and cannot pass PP17 before it.

## Contract v3

- New archive classes, one per row; the names are proposals for chronicles-data to settle:

  | Class | OSM tags | App subset |
  |---|---|---|
  | `plaque` | `memorial=plaque`, `memorial=blue_plaque`; `historic=memorial` with `memorial=plaque` | Plaques and markers |
  | `small_memorial` | `memorial=bench`, `memorial=ghost_bike`, `memorial=stolperstein` | Small memorials |
  | `old_stone` | `historic=milestone`, `historic=boundary_stone` | Old stones |
  | `wayside_shrine` | `historic=wayside_shrine`, `historic=wayside_cross` | Wayside shrines and crosses |
  | `time_capsule` | `historic=time_capsule` | Time capsules |
  | `public_bookcase` | `amenity=public_bookcase` | Little libraries |
  | `artwork` | `tourism=artwork` with `artwork_type` in `mural`, `sculpture`, `statue`, `relief`, `mosaic` (no type: left out) | Public art |
  | `community_garden` | `leisure=garden` with `garden:type=community` | Parks and gardens |

- `name` may be empty for these classes only (the app names them by type, SP5); every other class keeps a name.
- The OSM adapter's role becomes `locates` for these classes and stays `confirms` for the rest (0108's roles, per class).

## The build

- `access=private|no` keeps a place out (0109); an element with a `wikidata` tag already in the archive is that place,
  not a second one.
- Points only: an area or way becomes its centroid, as the archive's other places.
- **Noise review before publishing** (0109): per test area (Bethlehem, Allentown, Easton, Jim Thorpe, Pittsburgh,
  Philadelphia's Old City, Zurich) and per class, how many places each class adds; the owner strikes classes or places
  in `edits.json` before the first pack with them is published.
- Attribution stays "© OpenStreetMap contributors"; the pack is ODbL (already so since OSM confirms).
