# Where the places archive lives: a cost audit (Nov 5)

Asked by the owner: what does keeping the archive in this repo cost, and is there a way to fetch it live and lazily instead? If the cost is a big performance hit or doesn't scale, the owner makes a separate repo. Decision 0096 chose the app's own Pages site; this audit tests that choice.

## Verdict

- **Reading is not the problem.** A static archive on Pages is faster, far lighter and steadier than live queries, and Pages' bandwidth is no limit at this scale.
- **Repo growth is the cost.** A single archive commit is several times the size of the whole repo today, and a monthly refresh puts it near 35 times in a year.
- **Recommendation: a separate data repo with its own Pages site.** It is served from the same hostname, so `ALLOWED_HOSTS` needs no new host. If the owner would rather not run a second repo, the fallback is an orphan data branch (below). Live fetching is a stopgap at best.
- **Nothing in the slice waits on this.** PW2 already leaves the manifest address empty until the host is confirmed (PW16), so the choice is one constant and a doc line.

## What I measured

From a cloud session on a shared datacenter IP, a few samples each, on one day. Treat these as orders of magnitude.

| What | Result |
|---|---|
| This repo today | `.git` 5.1 MB (pack 4.5 MiB), 199 commits; the largest tracked file is 580 KB (`assets/boundaries/us.json`) |
| Byte range from the Pages site | 206 with a correct `content-range`; 0.36 s for 1 KB; `accept-ranges: bytes`, `access-control-allow-origin: *`, CDN cache hit, `cache-control: max-age=600`; no `access-control-expose-headers` |
| National Register items in Wikidata | 89,533 with an NRHP ID (one query, 0.36 s) |
| Places with coordinates and an English Wikipedia article, per 1° × 1° cell (about 9,000 km²) | 22 (rural Montana) to 8,638 (New York City), over 12 contrasting cells; the spread is about 400 times |
| Bytes per place, packed with this repo's own encoder, from 74 real places (mean name 20.5 characters) | about 36 B at z12, 64 B at z14 (dense area), 122 B for a place alone in its tile |
| A live Wikidata query for one tile-sized box | 2.47 s and 2.06 s, then a 502 on the third identical query; 20 KB for 32 rows |
| A live query for a 3 km read, and a 10 km area | 0.65 s (26.6 KB, 43 rows) and 0.47 s (117 KB, 195 rows), after the service was warm |
| Wikidata's limits, seen | a 429 after back-to-back queries; a US-wide count timed out with a 504 at 65 s |
| Overpass | the connection was reset from this IP (not measured) |
| Wikipedia's geosearch API | a 429 on the first request from this IP |

## What the archive weighs

- The class filter hasn't been pinned, so the number of places is unknown. Articles with coordinates in the US run in the hundreds of thousands (my estimate from the 12 cells, which are biased toward cities: roughly 300,000 to 900,000), and the pinned classes keep only a fraction of them.
- Packed at **z12**, an archive is about 30 B per place plus about 110 B for each occupied tile. The conterminous US holds at most about 145,000 z12 tiles, so the overhead is at most about 16 MB. For 50,000 to 300,000 places that gives **roughly 5 to 25 MB for the US**; I'd plan on about 15 MB (an estimate, not measured at scale).
- Packed at z14 the worst case is 122 B per place, up to about 40 MB, and three times the reads' worth of tiles. **Store at z12.**

## What it costs in this repo

| Cost | Committed to this repo | Orphan `data` branch | Separate repo |
|---|---|---|---|
| History growth | about 15 MB per refresh, assuming git can't delta the binary: yearly about 15 MB, quarterly about 60 MB, monthly about 180 MB a year (60 to 300 MB across the size range), against 5 MB today | none: the branch is force-pushed as one commit, so only the current version stays | none here |
| Every clone | carries the archive and its recent versions | carries the current version if the clone takes all branches (the cloud session's clone settings aren't known to me) | none |
| Every Pages deploy | uploads the archive again (seconds at 15 MB) | the same, once the workflow checks the branch out | none: its own deploy |
| Refresh | a commit that reruns this repo's tests, lint and deploy | a workflow or a push to the branch | a push to the data repo |
| `ALLOWED_HOSTS` | the Pages host | the same | the same hostname (`miguelaguerrero.github.io`), another path |
| Limits (from memory, not checked) | a file over 50 MB warns and over 100 MB is refused; the recommended repo size is under 1 GB | the same per file | the same per file, in a repo of its own |

Bandwidth is not a limit: a cold read is about 16 KB for the header and root directory plus one to four tile ranges of 1 to 5 KB, so about 20 to 40 KB. At Pages' soft limit of 100 GB a month (from memory) that is millions of cold sessions.

## The live alternative

Querying Wikidata and Overpass at the moment of a read keeps nothing in any repo. It would need a different decision from 0096, which covers a static host, and a new host in `ALLOWED_HOSTS` (`query.wikidata.org`; Overpass is already there).

| | Static archive on Pages | Live query |
|---|---|---|
| Time for a read | 0.36 s a range, from a CDN, a few ranges | 0.5 s warm, 2 to 2.5 s cold, and a 502 in 1 of 5 |
| Bytes for a read | about 1 to 5 KB a tile | about 20 to 27 KB, mostly repeated URIs |
| Failure | a missing file, handled by PW3 | throttling (429), gateway errors (502), timeouts (504), an IP block (Overpass) |
| Classification | once, in the build script, from a pinned table | in the query: a class list with a subclass closure, which I did not test and expect to be the slow part on the public service |
| What the host learns | which tile ranges, plus an IP | the query text, a bounding box of several km, plus an IP; snapping it to the z14 grid would make it comparable |
| Fit for an app | no one else's service to depend on | the public query service is not built for app traffic, and I couldn't check its policy from here |

The two don't exclude each other: the reader's seam in the plan is the same, so a live source could stand in for the first version and the archive replace it. I don't recommend starting there, since the classification is the hard part, and it would be written twice.

## Corrections to the plan this audit found

1. **The e2e's PMTiles encoder can't build the real archive.** `scripts/pmtiles-encode.mjs` says it is a test harness: uncompressed, one root directory. A real archive of this size needs leaf directories. The build script uses `tippecanoe` (GeoJSON to `.pmtiles`) or a small writer with leaf directories; the harness encoders stay for fixtures.
2. **Store the archive at z12.** The reader asks for the z12 tile that holds each z14 tile, and decodes the archive's own zoom (it is not fixed at 14 as Overture's reader assumes).
3. **File names carry the version** (`places-<version>.pmtiles`, named in the manifest). Pages sends `cache-control: max-age=600` and no `access-control-expose-headers`, so a browser can't read the `ETag`, and `pmtiles`' `FetchSource` can't notice the file changed under it: a header from one version and tiles from another would decode as nonsense. A 404 on a name the manifest no longer lists sends the reader back to the manifest.
4. **PW1's `credentials: 'omit'` needs the custom `Source` the plan names.** `FetchSource` takes only `same-origin` or `include`, and sets no referrer policy.

## Limits of this audit

- A cloud IP is not a phone: the live numbers show the shape of the trade, not what a phone would see. Overpass and Wikipedia's API refused this IP, so they are unmeasured.
- Five live queries and twelve cells; the national total is an extrapolation, and the count of places after the class filter doesn't exist until the table is pinned.
- Pages' limits, Wikimedia's policy and delta compression are from memory; I couldn't reach those documents from here.
- Nothing in this file was measured on the real archive, which doesn't exist yet.
