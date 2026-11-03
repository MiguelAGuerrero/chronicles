<!-- Mirror of the Claude Docs tab "Places worth the stop (queued)" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

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
