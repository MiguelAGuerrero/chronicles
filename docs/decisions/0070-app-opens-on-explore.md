# 0070. The app opens on Explore

Date: 2026-11-03 · Status: accepted · Area: tabs, navigation

## Context
Navigate was the opening tab, a default taken on Nov 1 since capture and Start live there (Navigation & tabs, NV2). On Nov 3 the owner's Home Screen web app opened on "This walk could not be found." with only a Back to walks button, a replay of a walk this device no longer kept.

## Decision
The owner's call, Nov 3: the app opens on Explore.
- Explore becomes the root route (`/`), and Navigate moves to `/navigate`. Back on Navigate or Chronicle returns to Explore (NV5).
- An open walk still opens the walk screen at launch.
- A launch on a walk's or a day's replay that finds nothing goes straight to Explore. Reached from inside the app, the replay keeps its message and its way back.
- A replay that fails to load shows the screen's error, with Try again, never "could not be found".
- Explore reads one fix as the app opens and frames it, once per launch (NV16), since it can no longer wait for Navigate's. Nothing tracks after; Locate stays the way to read another.

## Consequences
- Amends the atlas's AT1 (0066): with no fix in memory, the atlas still opens where it last listed areas, but only until the launch's one fix comes.
- Supersedes the opening-tab default in the Navigation & tabs spec (NV2, decided item 6) and changes NV5's paths.
- The web URLs change: `/` is Explore and `/navigate` is Navigate; `/explore` redirects to `/` (`src/app/explore.tsx`), for bookmarks and a Home Screen app reopening on its last page.
- Why the Home Screen app reopened on the replay was not established. iOS keeps a Home Screen app's storage apart from Safari's, so a replay link from Safari has no walk there.
