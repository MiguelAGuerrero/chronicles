# 0100. The app's own outside requests go through one set of rules, and a phone's requests name the app

Date: 2026-11-05 · Status: accepted · Area: network, walkability, landing, places

## Context
The app reaches three outside services: OpenFreeMap (map tiles and their build), Overture's public bucket (places, divisions and transportation, by tile) and the public Overpass API (the walkability fallback). Each call site had its own timeout and back-off, and none said what app was asking. Research on Nov 5 (the report "Wikidata access patterns for apps") found the public services tightening: Overpass and Wikimedia refuse requests with a missing or default User-Agent and ban applications that keep asking while refused. The Overpass fallback was hardened first (fix overpass-hardening). Overture's 2026-09 release renamed `categories` to `taxonomy`, and the app follows the newest release automatically (decision 0080).

## Decision
The owner's calls, Nov 5 ("perform the rest of the tightening"):
- **One module for the app's own outside requests** (`lib/net`): a table of the hosts the app fetches from (`net/policy.ts`), and a `fetch` and a PMTiles `source` every call site in `src/lib` uses (`net/shell.ts`, the app's instance in `net/index.ts`). MapLibre's own requests for the map on screen (its style, tiles and glyphs) are made by MapLibre and don't pass through it; on a phone they carry MapLibre's User-Agent.
- **A phone's requests name the app**: `User-Agent: Chronicles (+github.com/MiguelAGuerrero/chronicles)`, never anything about the person or the device. The web adds nothing: browsers forbid setting User-Agent, and any other custom header would add a preflight to every cross-origin request; the browser's own User-Agent stands. This amends WK18 and the Overpass source's "no custom headers, key or identifier" (`walk/overpassSource.ts`): the source still adds none; the module names the app on a phone.
- **A host that refuses is left alone** (429 or 503): a minute, or its Retry-After, up to an hour; requests meanwhile fail at once, as an offline one does, and every caller already treats that as "no data". Only OpenFreeMap, one operator, is paced this way, and its build check and its tiles pause together. Overpass keeps its own back-off and session cap (WK4); Overture keeps its reader's timeouts and the release check's 10-minute wait, and a pause on its bucket would have sent walkability to Overpass (fix net-rules audit 2).
- **A per-host off switch** in the table (`off`), all on as shipped.
- **A new Overture release is used only if its places still decode**: a tile with at least ten places, none carrying both an `id` and the `taxonomy` the app reads, marks the release missing, and the one before it is used (the path a 403 or 404 already took). Fewer places say nothing, so an uncategorised place in the countryside can't push the app off a good release (audit 1).

## Consequences
- `ALLOWED_HOSTS` in `scripts/check-vision.js` stays the reviewer's list; the policy table must stay inside it (`net 6`).
- The planned places archive (Places worth the stop, branch `claude/places-archive-decision`) will read through `net.source`, which already sends no credentials or referrer. The source keeps what pmtiles' own FetchSource did: no range caching on Chrome for Windows; a changed ETag, or a 416 past the first read, throws pmtiles' EtagMismatch and every later read of that archive skips the browser cache, so pmtiles' one retry reads the new file; an archive shorter than the first read, a server that ignores ranges cut off (audit 3-6).
- Native, unverified: whether React Native's `fetch` sends the custom User-Agent on iOS and Android, and the PMTiles source over it (`docs/NATIVE_UNVERIFIED.md`).
- Deferred: switching a host off remotely (the `chronicles-data` manifest could carry it), and the same decode check for Overture's divisions and transportation (`docs/DEFERRED.md`).
