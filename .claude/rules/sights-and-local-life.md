---
paths:
  - "src/lib/atlas/atlas.ts"
  - "src/components/atlas/{AtlasCard,KindStrip,AtlasTile}.tsx"
  - "src/lib/__tests__/explore/sightsLife.test.ts"
---
# Sights and Local life (SG1-SG13, decisions 0197, 0198)

- `KIND_GROUPS` (`atlas.ts`) is the one split, Sights then Local life, end to end `ATLAS_ORDER`; the card's rows sit under their group's heading (`atlas-group-sights`, `atlas-group-life`, aria-level 3 under "What's here"'s 2, sentence case and ink, never the uppercase section title), `SIGHTS_LINE` under Sights only; the tile's strip is `groupsPresent` with `STRIP`'s widths (216 of 222 px at 320 px, selected): no word; the groups' space is the margins of a 1 px line in `theme.edge` (`atlas-strip-line`, SG14, decision 0199), drawn only when both groups are present; `tileLabel` names the groups present; `characterLine` leads with the Sights. **The tally keeps every Sights place under its kind** (`presenceTally`: a small subset's kind, else the place's own), so `stepsFrom` drops a switched-off kind; Local life stays in `counts`. A change to that rule bumps `ATLAS_OWN` (a15). Culture stays a Sight until phase 2.
- **Phase 2 is queued, not started** (0197): Culture and Community into Local life, museums and galleries out of the marks
  (a listed building or a memorial name stays a Sight under History), "What I'm into" under the two headings, the
  out-of-town stars by the same rule; held until chronicles-data covers National Park Service sites.
- **Trap:** a test of the tile's width measures the whole strip (the groups' parent) and the tile, never one group: the
  Local life group starts past the Sights group's right edge.
