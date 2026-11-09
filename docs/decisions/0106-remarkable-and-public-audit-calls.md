# 0106. Remarkable and public, the audit's calls: one place within 200 m for the same name and kind; sites are Monuments

Date: 2026-11-09 · Status: accepted · Area: explore, discovery

## Context
The audit of Remarkable and public (Nov 9, `specs/remarkable-and-public/spec.md`, "Audit") found two things only the owner could settle. A large place's two points sit apart: Wikidata puts a cemetery, museum or theatre at its gate, the map at the middle of its grounds, 100-200 m away; the merge (PW8, 50 m) then shows the walker two places of one name, and finding one leaves the other a "?" (audit 5). And a National Historic Landmark that is no building (an archaeological site, a battlefield, a wreck) showed as "Buildings and structures" (audit 10).

## Decision
The owner's calls, Nov 9:
- **"200 m, same name and kind":** the map's place and the archive's are one within 200 m when they have the same name and category; any other match stays at 50 m (PW8's distance). This amends PW8.
- **"Monuments and ruins":** a listed archaeological site, battlefield, shipwreck or historic site is of the class `historic_site`, kind Monuments and ruins. Buildings and structures keeps buildings and engineering. It changes a site's kind, never whether it enters (a site enters as a Landmark or shown open, as any listed place that is not public by type).

## Consequences
- `SAME_KIND_M` (`discovery/archiveMerge.ts`) is 200; `same` (50 m, any category) still decides the owner's removals.
- Two different places sharing a name and a category within 200 m become one (rare; accepted).
- `ARCHIVE_CLASSES` gains `historic_site`; `pin-types.mjs` pins the `site` group.
