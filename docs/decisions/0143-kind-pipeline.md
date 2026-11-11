# 0143. The kind pipeline: a registry of pure refinements; kinds know their parent

Date: 2026-11-11 · Status: accepted · Area: explore, discovery, presence

## Context
Community parks (0142) was built as one function called by name from the poi adapter, with a special case in the archive
merge. The owner: classifications and derived data must be separate from the shell, pure functions in a flexible pipeline
that produces, filters and separates large categories into finer subsets, so finer-grained control can be added later.

## Decision
The owner's calls, Nov 11, each the recommended option:
- **A registry of pure refinement functions.** A refinement is a data object (`id`, `parent`, `child`, `judge`); `refine(places,
  context, refinements)` applies them in order and returns new places. A place keeps one kind (no multi-membership, no
  migration). A new subset is a new entry, plus its words in a JSON file where it has any. Not a rules language, not
  multi-membership.
- **Kinds know their parent**, from the registry (`kindParent`, `kindChain`): a child switched off hides only itself; a parent
  switched off hides its children; a child cannot be switched on under a parent that is off (a locked row, `kindSwitch`).
  One reader of the switches, `isKindHidden`.
- **The stages are apart.** adapter (poi classes) -> presence classes -> curation (marks) -> merge of sources -> refinement
  (with the tiles' park outlines and the archive's places in its context) -> the reader's switches. The adapter and the merge
  judge nothing about parks; the archive keeps a park a park in the refinement's context, never in the merge.

## Consequences
- `discovery/refine.ts` (engine), `refinements.ts` (the registry and what reads it), `green.ts` (the outline reader, moved out of
  scenic routes' signals, which re-export it); `parkKind.ts` holds the one refinement.
- With Parks off, community parks are off too (they were left on by the first build); the Community parks row is dimmed and locked.
- The registry is where finer subsets of any category go; the kinds table (`explore/explore.ts`) still lists each child after its parent.
- Amends 0142's mechanism, not its calls. Specs: `specs/community-parks/spec.md` (PC18-PC23).
