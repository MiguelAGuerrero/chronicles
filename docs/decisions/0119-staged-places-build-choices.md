# 0119. A staged places build: changes first, kept outputs, a daily assemble

Date: 2026-11-09 · Status: accepted · Area: explore, discovery, data

## Context
The places archive was built by one weekly job that asked Wikidata about every cell of the region and kept nothing, and phones rebuilt every area on each new version. The owner asked how comparable pipelines take in small changes (`docs/research/incremental-places-builds.md`) and chose a staged build as its own slice, before Places out of town (`specs/staged-places-build/`, SB1-SB12). The plan left four choices to the owner. For the third, the owner asked to query for changes before re-running anything; one-off test queries on Nov 9 showed it works when filtered by country (1-7 s a class) and not by box (46 s to over the 60 s limit).

## Decision
The owner's calls, Nov 9:
- **The daily assemble checks the app's `main`** for a change to `archiveEdits.json` or the class lists and runs when one changed: at most a day's delay, no token stored anywhere.
- **Kept outputs live on a `sources` prerelease** in `chronicles-data`, their assets replaced on each run; the Pages workflow already ignores prereleases.
- **Wikidata changes first.** The scheduled fetch asks, class by class and by the region's country, for items modified since the last run, and drops kept items that changed away; it never re-sweeps the cells on a schedule it doesn't need. A newly pinned class is asked once for itself.
- **The first archive comes from the new pipeline's first run**, which sweeps every cell because nothing is kept; today's workflow is not run.

## Consequences
- A weekly run is about 35 country-filtered queries and a check of the kept items: minutes. A full cell sweep (about 630 cells, roughly 1-2 hours) happens on the first run, by hand for a box, and on a safety cadence still open for the owner (places with no country in Wikidata, about 2% in a measured cell, are missed by the changes query).
- Region filtering by country means a region names its countries (`us`: Q30); Canada (Q16) arrives with Places out of town.
- PW16 waits for the new pipeline's first run.
