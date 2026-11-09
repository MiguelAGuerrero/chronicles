# Small changes without a full rebuild: how comparable pipelines do it

A look (Nov 9) at how map and place-data pipelines take in a small change (a new source, a few new places, an owner's edit) without re-running everything, for the places archive (decision 0103). The owner asked for it before the archive's build is reshaped. Nothing here is adopted; the recommendation is at the end.

## The archive today

- **One job does everything, every time.** `fetch-wikidata.mjs` asks the Wikidata Query Service about every 2° cell of the region (about 630 for the US: the lower 48, Alaska, Hawaii), one query at a time with a 1.5 s pause, and keeps nothing between runs. `build-places-archive.mjs` then writes the whole region file. The job's limit is 300 minutes; it has never completed a run, so its real length is unknown.
- **Publishing compares the file's bytes** (`publish.mjs`), and routine Wikidata edits change them almost every week (a deferred audit finding).
- **Phones redo everything on a new version.** `archiveStale` compares the archive's version only, so every checklist area is rebuilt and every atlas ring read again (deferred).
- **The owner's edits** (`archiveEdits.json`) are applied by the app when it reads, so they need an app deploy and no build; but an area already built picks them up only when the archive's version changes (audit F8, deferred).

## How others take in small changes

### 1. Each source is its own job, with its output kept

- **AllThePlaces** runs each of its thousands of spiders as a separate unit and publishes each spider's output as its own GeoJSON file; a weekly run gathers them ([weekly run](https://github.meowingcats01.workers.dev/rjw62/alltheplaces/blob/master/docs/WEEKLY_RUN.md), [data format](https://github.meowingcats01.workers.dev/rjw62/alltheplaces/blob/master/DATA_FORMAT.md), [a 2025 run, 4,367 files](https://tech.marksblogg.com/alltheplaces.html)). A broken or slow source doesn't hold up the others, and one source can be re-run alone.
- **Orchestrators** formalise this: Dagster's partitioned assets let a run materialise only some partitions, and its data versions skip work whose upstream hasn't changed ([partitions](https://docs.dagster.io/concepts/partitions-schedules-sensors/partitioning-assets), [1.2 versioning](https://dagster.io/blog/dagster-1-2-formation)). The caveat it documents: asking for nothing in particular re-runs all partitions, and a downstream asset can re-run an upstream one.
- **In GitHub Actions** the same idea is a content-hash key: `hashFiles` over a step's inputs keys a cache, and `cache-hit` skips the step; `on.paths` keeps a workflow from starting at all when its files didn't change ([actions/cache](https://github.com/wonyx/cache), [work avoidance](https://agent-skills.md/skills/adaptive-enforcement-lab/claude-skills/work-avoidance-in-github-actions)). Actions' cache is evicted when unused, so durable intermediates belong in release assets.

### 2. Take the source's own changes, not the whole source again

- **OpenStreetMap publishes replication diffs** (minutely, hourly, daily), and Geofabrik publishes daily diffs for each of its extracts. `pyosmium-up-to-date` brings a kept extract up to date by applying them, reading the file's own replication state; Geofabrik keeps about three months of diffs, after which a fresh download is needed ([pyosmium replication tools](https://docs.osmcode.org/pyosmium/latest/user_manual/10-Replication-Tools/), [Geofabrik technical](https://download.geofabrik.de/technical.html)).
- **OsmAnd Live** builds small hourly difference files from those replication diffs, which phones apply on top of a base map; its developers note it doesn't first have to work out what changed, and that the small diffs make it cheaper than the monthly full builds ([OsmAnd group](https://groups.google.com/g/osmand/c/B3HMYXY507E), [OSM Live](https://builder.osmand.net/blog/osm-live)).
- **Wikidata** offers weekly full dumps (days to load) and a change feed. The qEndpoint project keeps a local copy within 24 hours by asking the Recent Changes API for everything since a time, fetching the changed entities and replacing them ([qEndpoint paper](https://ceur-ws.org/Vol-3262/paper10.pdf), [mailing list](https://mail-archive.com/wikidata@lists.wikimedia.org/msg07540.html)). The public query service is not for large subset queries ([subsetting survey](https://www.semantic-web-journal.net/content/wikidata-subsetting-approaches-tools-and-evaluation-0)).

### 3. Rewrite the output whole; it is the cheap part

- **PMTiles is write-once**: a tile can't be updated in place, and a new version is a new upload, fine at hourly or daily cadence ([Protomaps FAQ](https://protomaps.com/faq), [PMTiles v3](https://protomaps.com/blog/pmtiles-v3-whats-new)). Protomaps publishes whole daily builds rather than diffs ([getting started](https://docs.protomaps.com/guide/getting-started)).
- For the archive this is no problem: the file holds points only and is written in memory in seconds. The cost is the fetch, not the write.

### 4. Tell clients exactly what changed

- **osm2pgsql's expiry** writes the list of tiles an update touched, so only those are re-rendered ([osm2pgsql-expire](https://osm2pgsql.org/doc/man/osm2pgsql-expire-2-3-1.html), [switch2osm](https://switch2osm.org/serving-tiles/updating-as-people-edit-osm2pgsql-replication/)).
- **Overture** publishes a changelog with each release: every feature marked added, removed, data_changed or unchanged, with `columns_changed`, and fields such as sources and confidence never compared, so routine churn doesn't flood it ([GERS changelog](https://docs.overturemaps.org/gers/changelog/)).
- **HERE's SDK** installs only the changed parts of an offline map ([HERE offline updates](https://docs.here.com/here-sdk/docs/offline-maps-update)). Organic Maps downloads whole region files; no source showed it using diffs.

## What this means for the archive

| Step | Today | Recommended |
|---|---|---|
| Fetch | One job asks Wikidata about every cell, every week | One job per source, each on its own schedule or by hand, each keeping its output (a compressed JSON-lines file and its SHA-256) as an asset of a fixed "sources" release |
| Wikidata | Every cell, every run | Kept per cell; each week re-asks a rotating quarter of the cells, or one box by hand. (The Recent Changes route catches edits to items already held but not new items entering a class, so cells are still needed.) |
| OpenStreetMap | Not yet a source | Geofabrik state and province extracts kept between runs and brought up to date with `pyosmium-up-to-date` (decision 0109); a fresh download only past three months |
| Assemble | Inside the fetch job | Its own short job: download the newest source files, merge, apply the owner's edits and the town flag, write the region file. Starts after any fetch, or when the app's `archiveEdits.json`, the class lists or the reach numbers change |
| Publish | When the file's bytes differ | When the places differ (a hash of the sorted rows, not the file), with a list of the tiles that changed |
| Phones | A new version rebuilds every area | Rebuild only areas that read a changed tile (the published list), as osm2pgsql expiry and Overture's changelog do |
| The owner's edits | Read by the app; reach built areas only on a new version | Applied at assemble too: an edit is a few-minute assemble and reaches only its tiles' areas (fixes F8) |

**Adding one or two places** becomes: edit `archiveEdits.json` in the app repo, push; the assemble job runs (minutes, no fetch); the changed tiles are listed; phones re-read only the areas around them. **Adding a source** becomes: its fetch job runs once, then the assemble.

Not recommended: a workflow engine such as Dagster (a server to run for a handful of steps; GitHub Actions with content-hash keys covers it), binary diffs of the PMTiles file (the file is small and write-once), and Wikidata's dumps (days to load for a few tens of thousands of items).

## Open for the owner

- Whether to adopt this as its own small slice before Places out of town (the owner chose a slice first, Nov 9).
- Whether the first full Wikidata fetch runs on today's workflow now (to give PW16 a real archive and measure the fetch), or waits for the staged one.
