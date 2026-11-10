# 0110. Shrines, grottoes and historic businesses: their kinds, and inference only from the data's own values

Date: 2026-11-09 · Status: accepted · Area: explore, discovery

## Context
Decision 0109 left three questions open: the kind a shrine, grotto or pilgrimage site gets; whether one-of-a-kind businesses show in town as well as out of town; and how a place is judged historic when the data does not say so. 0103 had said "type decides, never age". The owner's example of a one-of-a-kind business is the Julius Sturgis Pretzel Bakery in Lititz, Pennsylvania.

## Decision
The owner's calls, Nov 9:
- **Kinds:**
  - wayside shrines and crosses go under Monuments;
  - a pilgrimage site with a church goes under Historic churches;
  - grottoes go under Curiosities;
  - a one-of-a-kind business that is historic goes in the History & landmarks category, under the Monuments switch.
- **The Monuments switch is relabelled "Monuments and landmarks"** (from "Monuments and ruins"), so one switch honestly covers statues, memorials, shrines, ruins and historic buildings and businesses. No new kind.
- **One-of-a-kind businesses show wherever they are in range**, in town and out, as any mark does: they are attractions. This answers 0109's open question and amends 0044 in town too. They still enter only by a signal the data carries (0109).
- **Explicit first, inference only where it is cheap and plain.** A place's kind and its entry come from what the data says outright: a type, a listing, a tag. Where the data is silent, a reasonable inference from its own values may be made, with no processing beyond a fixed rule:
  - words in the name, from `notable.json` (whole words, as today; chains still excluded);
  - age, from a recorded date (Wikidata's inception, OpenStreetMap's `start_date` or `building:start_date`). This amends 0103's "never age" for places the type and tags say nothing about; where a type exists, it still decides.
- **The age threshold is measured before it is fixed**: the slice counts what each threshold lets in on its test areas, and the owner picks.
- **More sophisticated signals are investigated, not adopted**: other datasets and rules that could infer a historic place (`docs/research/historic-signals.md`). Each one adopted later is its own call.
- **Test cases:** a rural Saskatchewan shrine (out of town) and the Sturgis Pretzel Bakery in Lititz (a historic business in town).

## Consequences
- The relabel is a one-line change to `KINDS` (`explore/explore.ts`) and lands with the slice, since it changes what "What I'm into" says; the kind's id (`monuments`) and users' saved switches are unchanged.
- The name-word list is one list for every place; a business-only list would be a later call.
- An inferred place is marked in the build as inferred and by which rule, so the measure and any later audit can tell it from an explicit one; the app never shows that marker.
- 0109 stands; this record fills its open questions. 0103's "type decides" stands wherever a type is known.
