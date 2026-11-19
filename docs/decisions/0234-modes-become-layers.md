# 0234. Modes become layers: no Explore mode; each piece is a layer or a setting; a walk's default view is quiet

Date: 2026-11-19 · Status: accepted (direction; the slice's spec makes it concrete) · Area: explore, walk, layers · Supersedes in part: 0031 (a walk starts quiet; Explore is a mode) · Amends: 0230 (Places on Explore only), ML7 (one setting for every map)

## Context
The Places layer shipped on Explore's map only (0230). The owner expected a map layer on every map ("my understanding was that it was a map layer", Nov 19). The `/vision` gate pointed out that on the live walk "?" marks come only from Explore mode, an explicit switch that is off by default (0031: "a walk starts quiet … no '?' marks"), so Places on by default there would break 0031. The owner's answer:

> "I want to collapse quiet and explore mode and move to just tolerable views and layers that the user can choose to open and close instead of having dedicated modes."

## Decision
The owner's calls, Nov 19:
- **No dedicated modes.** Quiet and Explore mode collapse into views and layers the person opens and closes. Each piece of Explore mode becomes a layer or a setting: the "?" marks are the Places layer; the storefront-strip chip is the Storefronts layer's; the pocket alert and the dead-zone nudge become settings in the walk's options; finding a place (Capture here) and the replay's "passed without stopping" lines work on every walk, since no walk is an exploring walk.
- **A walk's default view is quiet, as it is today.** Every layer is off on the live walk at the start; the person opens what they want. Places stays on by default on Explore's map and the ready map (places to look around), off on the live walk.
- **The saved setting is per kind of map**, no longer one setting for every map (amends ML7): Explore and the ready map keep Places on by default, the live walk keeps every layer off.

## Consequences
- This is a slice of its own (not a fix): the spec says how Explore mode's pieces map onto layers and settings, what happens to `explore_walk` and `explored:<walk>` (older walks keep their truth; the replay reads them as before), the home's Explore button beside Start walk, and the replay's counting rule. A change to a derivation rule bumps its code (`AGENTS.md`).
- Proposed for VISION.md (the owner decides): Always, a walk starts with every layer off, and the person opens what they want; no screen has a mode that changes what the walk records.
- The Places layer's scope on the ready map and the live walk is that slice's, not a fix to 0230.
