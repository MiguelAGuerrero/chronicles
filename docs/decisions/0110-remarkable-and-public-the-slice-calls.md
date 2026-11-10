# 0110. Remarkable and public, the slice's calls: OSM only corroborates; Buildings and structures; bounded whispers; reachability said, never filtered

Date: 2026-11-09 · Status: accepted · Area: explore, discovery, replay

## Context
Decision 0109 set the rule (a listed place enters when remarkable and public). Building the slice (`specs/remarkable-and-public`, RP1-RP20) raised four more questions, and the steward's review of the plan (Nov 9) found that the recommended kind name, "Landmarks", would put the listing on screen: a kind's label is shown beside every place of that kind ("name · kind" on the walk's card, "Found: … · kind").

## Decision
The owner's calls, Nov 9:
- **OpenStreetMap only corroborates** ("Corroborate only"). Its tags decide whether a listed Wikidata item is open (RP2), closed (`access=private|no`, RP5) or gone (PW7), joined only by the element's `wikidata` tag (RP7). A place only OSM knows is not added: an archive with such places would be a derived ODbL database. This **supersedes 0109's line** "a place found only there enters by the same pinned class table"; PW15 holds.
- **The new kind is "Buildings and structures"** (`structures`, in History, on by default), for listed buildings and structures that are not places of worship, cemeteries, theatres or museums. No kind is named for significance (RP18): not "Landmarks", "notable" or "listed".
- **The replay's whispers follow the card's rule** ("Bound them like the card"): one or two passed places by name, more than two one "Passed a few places without stopping" (RP19). This amends RR15 (one whisper per place).
- **Reachability is said, never filtered** ("Trust the tags, but just develop a way to warn or inspect whether something might or may not be accessible, but don't limit the data because of it"), to **both** the owner and the walker ("Both"): a place to find with no street or path within 60 m of it, among the streets the app already cached, says "No street or path close by" on its card on the walk (RP20); the coverage benchmark flags it "may not be reachable". Nothing is removed for it. With no street cached within 300 m, nothing is said: absence is no evidence.
- **A private house that is a National Historic Landmark is a place to find** ("Yes, if NHL"; the gate recommended never). VISION.md's Precedents row for 0109 says so.

## Consequences
- `ATLAS_CODE` stays a7: the only grading change is the aviary, in rings that hold one; the archive's new classes map to categories the atlas already counts, and a newer archive already re-reads rows (`profile.archive`, PW10).
- The listing gate lifts only individually listed places: a building that contributes to a listed district, with no designation of its own in Wikidata (Central Moravian Church in Bethlehem), stays stopped by the name rule (`docs/DEFERRED.md`).
- RP2's and RP5's OpenStreetMap signals act only once the weekly job feeds the build an OSM export (`docs/DEFERRED.md`, "Needs the owner" in `docs/STATUS.md`); until then a place is shown open only by its Wikidata type, and none is closed by a tag.
- VISION.md's rules are unchanged; its Precedents table gains this row.
