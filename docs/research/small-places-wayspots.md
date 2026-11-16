# Small places: where Pikmin Bloom's postcards come from, and the open data that covers the same ground

A look (Nov 14) for decision 0182. The owner asked how Pikmin Bloom's postcards reach small places, a time capsule
for one, and whether Chronicles could use that data.

## Where Pikmin Bloom's places come from

- **Postcards come from Niantic's Wayspot database**, the places behind Ingress portals and Pokémon GO PokéStops.
  Postcard photos are picked from Wayspot photos, and not every Wayspot appears in Pikmin Bloom
  ([help: postcards](https://niantic.helpshift.com/hc/en/23-pikmin-bloom/faq/2858-postcard),
  [PikminWiki](https://pikminwiki.com/Postcard)).
- **It was seeded from historical markers:** Google licensed the Historical Marker Database (HMdb) about 2011 for
  Ingress ([VOA](https://www.voanews.com/a/pokemon-go-players-stumble-on-hidden-history/3434860.html),
  [Wikipedia](https://en.wikipedia.org/wiki/Historical_Marker_Database)).
- **Players grew it** through nominations reviewed in Wayfarer, under three criteria: a great place to explore,
  exercise or be social; "somewhere or something that tells the unique story about a place". Examples: historic
  plaques, unique art or architecture, community gardens, trail markers, unusual local shops, free little libraries
  ([eligibility](https://niantic.helpshift.com/hc/en/21-wayfarer/faq/2770-eligibility-criteria/)).
- **Decor Pikmin use a second source**, OpenStreetMap and Foursquare place types (`amenity=restaurant` and so on),
  by the fan wiki's account only ([PikminWiki](https://pikminwiki.com/Decorated_Pikmin)).

## Why the Wayspots can't be used

- **Ownership:** Scopely bought Niantic's games business, Wayfarer included; the deal closed May 29, 2025. Niantic
  Spatial kept Ingress and Peridot ([Scopely](https://www.scopely.com/en/news/scopely-to-acquire-niantic-games-business-which-includes-pokemon-go-one-of-the-most-successful-mobile-games-of-all-time),
  [Wikipedia](https://en.wikipedia.org/wiki/Niantic_Spatial)).
- **No access:** no public API; the Geospatial Browser was deprecated with a Feb 28, 2026 shutdown and "no longer
  access to Public POIs for now" ([migration FAQ](https://www.nianticspatial.com/faq/scaniverse-lightship-migration),
  [forum](https://community.nianticspatial.com/t/geospatial-browser-public-api/3939)). The abuse policy names
  unauthorized access "through the use of third-party software"
  ([policy](https://niantic.helpshift.com/hc/faq/4275-wayfarer-abuse-enforcement-ladder-policy)).
- **Our rules:** a community source may only nominate (0108). HMdb reserves commercial rights and offers no bulk
  licence ([copyright](https://hmdb.org/copyright.asp)).

## The same ground in OpenStreetMap (ODbL)

| Wayspot-style place | Tag | Note |
|---|---|---|
| Time capsule | `historic=time_capsule` | Sparse; its 2023 proposal is a draft ([proposal](https://wiki.openstreetmap.org/wiki/Proposal:Time_capsule)) |
| Plaque, historical marker | `historic=memorial` + `memorial=plaque` | Covers North American historical markers ([Key:memorial](https://wiki.openstreetmap.org/wiki/Key:memorial)) |
| Little Free Library | `amenity=public_bookcase`, `brand=Little Free Library` | The LFL map's own licence is unknown; importing it is discouraged ([tag](https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dpublic_bookcase)) |
| Mural, sculpture | `tourism=artwork` + `artwork_type` | |
| Memorial bench, ghost bike, Stolperstein | `memorial=bench`, `ghost_bike`, `stolperstein` | |
| Milestone, boundary stone | `historic=milestone`, `historic=boundary_stone` | |
| Wayside shrine or cross | `historic=wayside_shrine`, `historic=wayside_cross` | |
| Community garden | `leisure=garden` + `garden:type=community` | |

Not measured: taginfo is blocked from cloud sessions, so the counts per tag and per test area are the slice's first
measurement (the noise review of 0109).
