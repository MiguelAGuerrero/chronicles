# 0075. Navigate opens the walk screen, ready; captures stack at the right edge; the bar pulls up

Date: 2026-11-03 · Status: accepted · Area: tabs, navigate, walk screen

## Context
The owner, Nov 3, from two iPhone screenshots side by side (Navigate today, and AllTrails' Navigate):
"The navigate page should open up the navigation context. Right now it's awkward with the drawer and
the action buttons." Navigate was a tab with a map, a capture row floating over a drawer, and a drawer
whose Start opened a separate walk screen.

## Decision
The owner's answers, Nov 3:
- **Navigate opens the walk screen in a ready state**: full screen, no tab bar, 0:00 and a zero distance
  in the bottom strip, Start where Stop will be. Start records in place, with no route change. A
  chevron-down at the top-left goes back to the tab you came from. With a walk open, Navigate opens
  that walk.
- **Captures stack at the right edge** (camera, mic, note, with Locate or Recenter above), on the ready
  screen and on the walk alike.
- **The bar is a quick start; you pull it up for the settings** ("You pull up the drawer. The bar
  should be a quick start"). Start stays at its foot at every height.
- **Layout only** from AllTrails: Chronicles keeps its light theme, rust Start and map style.

- **One and the same screen** (the owner, Nov 3, mid-build: "confirm that this is not a separate
  context dialogue from the one that shows currently when you start a walk"): the ready state and the
  walk are one walk screen with one map, kept mounted across Start; only its state changes.

Taken as defaults in the plan, and confirmed by the owner's go-ahead ("Build it, then deploy"): the
walking strip is unchanged; a destination set by a long press shows as one line on the resting bar.
The plan's third default, opening the app on the ready screen, gave way to 0070 (the app opens on
Explore): the owner, Nov 4, "if there's an active walk going on, it should reopen to the navigate
tab; if there's no active walk, it should go to the Explore page".

## Consequences
- Spec `specs/navigate-ready/spec.md` (NR1-NR13). `(tabs)/navigate.tsx` is only an entry route; the
  Navigate tab's press calls `showWalk()`. Explore stays the root (`/`, 0070).
- Supersedes 0046 (the docked drawer), 0047 and 0062 (Navigate's live view of a minimized walk), 0056
  (the settings dialog), and 0008's centered capture row (its reasons for keeping controls low still
  hold: the stack sits low, at the right edge, above the strip).
- Native unverified: the tab press interception, the bar's pull-up over MapLibre RN, the stack against
  the home indicator, and the background task taking over an already mounted screen.
