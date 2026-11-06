# 0102. A static places archive, and Curiosities in Viewpoints & oddities

Date: 2026-11-05 · Status: accepted · Area: explore, discovery, atlas

## Context
The tiles' `poi` layer has no historical markers, ruins, follies or roadside oddities, which is most of what Atlas Obscura holds. The owner asked what open data could add them, lazily, for the US first and any area after.

Decision 0084 (Nov 4) said "No significance file and no host", and `docs/DEFERRED.md` kept the Wikidata idea for that reason. The vision gate (0094) judged this idea **aligned if reshaped** and said plainly that it reverses 0084. The owner confirmed the reversal on Nov 5.

## Decision
The owner's calls, Nov 5:
- **0084 is reversed in one part:** "No significance file and no host" no longer holds. Everything else in 0084 stands (what a mark is, the thin ring, fixed steps).
- **A static archive of notable places**, built by an owner-run script from Wikidata (including the National Register of Historic Places) and OpenStreetMap tags, deduped and classified once at build time. It is read by tile through byte-range requests like Overture's places (0080). US first; another region is the same script run again.
- **Host (superseded the same day, below):** the Pages site that serves the web build. The host is expected to be `miguelaguerrero.github.io`, confirmed in the slice, and goes in `ALLOWED_HOSTS` (`scripts/check-vision.js`) with its reason.
- **Significance is a gate, never a measure.** The archive holds no sitelink count, page views, QRank or rank. Nothing in the app orders, sizes, labels or counts a place by notability. Popularity stays a Never (VISION.md).
- **Curiosities** are a new kind inside the existing category "Viewpoints & oddities" (`viewpoints`), not History and not a new category. Defined by what a place is, from a pinned class table: follies and novelty buildings, roadside giants, natural oddities, odd engineering, places that mark a fact, art environments, ruins and abandoned places not framed as historic. An unmapped class is left out, never guessed.
- **Type decides, never age or listing.** In order: it commemorates, so Monuments; made as art, so Public art; you go there to look out, so Viewpoints; one of the odd classes, so Curiosities; else History, or left out. A century-old folly is a Curiosity; an old ordinary house is History.
- **One mark per place across sources.** The adapter drops a tile place when the archive holds one with the same name within about 50 m, in any category; the archive wins (`placeKey` and `isOffered` only match within a category).
- **Later the same day:** the archive lives in its own repo, `chronicles-data` (Releases, a Pages workflow, a manifest), not on the app's Pages site. A Wikidata entry with a location is enough if the place still exists (an OpenStreetMap match strengthens it); OpenStreetMap is credited with the map's credits.
- **Nov 6:** the archive is rebuilt weekly by a scheduled job in `chronicles-data` and published only when it changed (PW19), not by an owner-run script; it is read through the generalized Overture reader.
- **Folded into the queued "Places worth the stop" slice.** Its small owner-edited add/remove file stays beside the archive.

## Consequences
- The slice adds the host to `ALLOWED_HOSTS`; `check:vision` fails on it otherwise.
- AG5's definition of a mark is amended and `MARKABLE_CLASSES` re-pinned deliberately; `ATLAS_CODE` is bumped where grading changes.
- **Same-site hosting** (the owner's choice over a separate repo): each archive refresh adds its size to this repo's git history and rides the Pages deploy, and GitHub refuses files over 100 MB. Refresh rarely; if the size grows, build the archive into the Pages artifact in `pages.yml` instead of committing it.
- Range requests and CORS on Pages are verified by a test fetch in the slice before the reader relies on them. The web build reads it same-origin; native reads it cross-origin.
- A read tells the host which tile you are in, the same class of disclosure as 0080, 0083 and 0093, with no identifier. A failed or missing read leaves Explore as it is today.
- `nav/scenicSignals.ts` reads the `viewpoints` category: check what Curiosities do to the scenic routes' Sights row.
- Open question 6 (the "N of M" tally on a place's sheet) is still open and is decided in the slice or before, since a bigger pool makes it louder.
- Attribution: OSM-derived rows need ODbL credit where the app credits its sources; where that line lives is the owner's call (the vision is silent).
- `docs/DEFERRED.md`'s significance-file line is taken up by this record.
- VISION.md needs no edit to its rules; only its Precedents table gains this row.
