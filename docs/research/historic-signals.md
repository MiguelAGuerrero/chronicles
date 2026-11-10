# Signals that a place is historic when the data doesn't say so

A first look (Nov 9) for decision 0110: open data sets and plain rules that could infer a historic place, a business especially, beyond an explicit type, listing or tag. The owner's constraint: explicit first, inference only from the data's own values, as little processing as possible. Nothing here is adopted; each is a candidate for its own call.

## What the archive already has, or could read cheaply

| Signal | Source and licence | What it says | Cost | Note |
|---|---|---|---|---|
| Heritage designation (P1435) | Wikidata, CC0 | Listed by a register | Already read | 0103 keeps only National Historic Landmarks for buildings; 0109 lets a listed business in |
| Inception (P571) | Wikidata, CC0 | When it was founded or built | One more property in the same query | Age is allowed by 0110 where the type is silent; threshold measured first |
| `start_date`, `building:start_date` | OpenStreetMap, ODbL | Completion date, or when the feature became active | Read with the tags already planned | A rough estimate by the wiki's own account; `start_date` on a shop may be the shop's opening, `building:start_date` the building's ([OSM tagging list](https://lists.openstreetmap.org/pipermail/tagging/2019-February/042913.html), [Key:start_date](https://wiki.openstreetmap.org/wiki/Pl:Key:start_date)) |
| `heritage=*`, `historic=*` | OpenStreetMap, ODbL | Registered with a heritage body; historically significant | Already planned (0109) | More reliable than `start_date` alone ([Key:heritage](https://wiki.openstreetmap.org/Key:heritage)) |
| Name words | `notable.json` | "historic", "old", "ancient" and the like | Already in the app | 0110 reuses it for every place |

## Registers to join by position

A business inside a documented historic structure is a strong, explicit signal that needs only a position match (say 30 m) and no inference.

| Source | Licence | Coverage | Note |
|---|---|---|---|
| HABS/HAER/HALS (Historic American Buildings Survey and its siblings) | Public domain ([NPS](https://www.nps.gov/subjects/heritagedocumentation/collection.htm)) | Over 46,000 surveys; about 12,000 with known coordinates, most through the loc.gov API, the rest via Wikidata ([LoC](https://blogs.loc.gov/thesignal/2025/07/junior-fellow-sabrina-templeton-geocoding/), [tutorial](https://libraryofcongress.github.io/data-exploration/loc.gov%20JSON%20API/Extracting%20location%20data%20for%20geovisualization.html)) | Older records give UTM coordinates; an NPS GIS layer of all surveys is in progress with no date |
| National Register of Historic Places, NPS GIS | Public domain | Every listing, with districts as polygons | 0103 left plain listings and districts out as places; "inside a historic district" as a signal for a business is a separate question for the owner |
| Directory of Federal Heritage Designations (Canada) | Its notice allows reproduction without charge or permission, images excepted ([Parks Canada](https://www.parks.canada.ca/culture/dfhd)); listed as unrestricted on Open Canada ([catalogue mirror](https://donnees.iriu.ca/en/dataset/49d5ba7d-d860-40d9-9183-892979e4acbe)) | National historic sites, persons and events; federal heritage buildings | The licence on open.canada.ca and a bulk file still need confirming |
| Canadian Register of Historic Places | To check | Federal, provincial and municipal listings, incl. rural shrines | Named in 0109 |

## Building age, where a place has no date of its own

| Source | Licence | Coverage | Why not yet |
|---|---|---|---|
| HISDAC-US (Uhl and Leyk) | Outputs CC BY 4.0 | Conterminous US, 1810-2015, gridded | Its year built comes from Zillow's ZTRAX, whose terms need checking; a grid, not a building ([ESSD](https://essd.copernicus.org/articles/13/119/2021/essd-13-119-2021.html)) |
| MTBF-33 | CC BY | 6.2 million footprints with year built, 33 counties only ([Mendeley Data](https://data.mendeley.com/datasets/w33vbvjtdy)) | Not national |
| Integrated 1810-2020 buildings (Scientific Data, 2024) | Unconfirmed; mixes Open City Model, Parcel Atlas and Zillow data ([paper](https://www.nature.com/articles/s41597-024-03081-x.pdf)) | National | Licence unclear |
| County assessor parcels ("year built") | Varies by county | Patchy | No single open source |

A building's age is the building's, not the business's: a 1990 café in an 1850 building would read as historic. That is an extrapolation of the kind 0110 asks to avoid, so building age is the weakest signal here.

## Algorithms considered

- **A rule cascade** (recommended): explicit type, listing or tag; then a register join by position (HABS); then name words; then a recorded date past the threshold. Each step a fixed rule with a test, each inferred place marked with its rule in the build. Cheap, auditable, and it stops at the first answer.
- **Text classification** of Wikidata descriptions or Wikipedia text (a model or an LLM at build time): more recall, but it is the extrapolation 0110 limits, it is hard to pin with a test, and 0103 reads nothing from Wikipedia. Not recommended.
- **Co-occurrence of OSM tags** (an old `start_date` with `building=church`, `historic:civilization` and so on): a variant of the cascade, worth trying only if the measure shows the cascade misses much.

## Next

Parked by decision 0111 (Nov 9): showing a place is the value and its kind a bonus, so nothing here is joined or fetched only to sort a place, and no age threshold is measured. A kind comes from what the archive already reads; the rest goes under "Other places". A register that adds places of its own (HABS, Canada's directory) is a source question for 0109, not a sorting one.
