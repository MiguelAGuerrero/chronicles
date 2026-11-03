<!-- Mirror of the Claude Docs tab "Bridges and Open in Maps (shipped on web)" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# Bridges and Open in Maps

Nov 3, 2026 · @Miguel Guerrero

On Nov 3 a route told the owner to turn off a bridge onto the path under it. The street builder treats every crossing as a junction and ignores the tiles' bridge and tunnel tags (`brunnel`, `layer`, both present at z14). This slice stops that, and adds a way to hand the destination to the phone's maps app when Chronicles' route is wrong.

## The owner's calls (Nov 3)

- Both: fix bridges and tunnels, and add the hand-off as a fallback.
- Open in Maps sits in the navigation bar, on "Off your route" and the route-failure banners, and beside Go here (the long-press card, a pin's viewer).
- The system's maps app: Apple Maps on iPhone, the Android chooser on an Android phone, Google Maps in other browsers. Walking directions.
- Navigation keeps running after the hand-off, and the walk keeps recording. On the web, tracing pauses while the page is hidden, as today.

## Criteria

Bridges and tunnels

1. **NB1** Each road line has a level. Only a bridge or a tunnel leaves the ground: a bridge at its `layer`, else 1; a tunnel at its `layer`, else 0 (mostly building passages). A `layer` on anything else is ignored: embankments carry one.
2. **NB2** Lines on different levels that cross mid-line are not a junction: neither is cut there, and a route can't turn from one to the other.
3. **NB3** Lines on different levels meet only where one lands on the other: an end of it touches the other line, and that end meets nothing else on its own level. A bridge joins its approach, a footbridge lands on a street, stairs land on a footbridge mid-span. A path passing under (even split into two ways there) or a ground junction under a bridge stays on the ground.
4. **NB4** Crosswalk removal and tile-edge stitching compare levels too: a short footway under a bridge is not its crosswalk, and copies stitch only on one level. Across levels, a footway merges into a street as its sidewalk only where it runs the street's way (within 35°), and a footway that lands on another level is never merged.
5. **NB5** Lines on one level keep today's rules: every crossing is a junction.
6. **NB6** `STREET_CODE` 3: pieces on bridges and the ways under them change ids, so the street cache is dropped once and every walk re-snaps when its replay next opens.
7. **NB7** A route starts on the street you are walking along: among streets within 12 m of the nearest, one within 35° of your heading (`headingOf`) wins; with no heading, the nearest. Walking across a bridge over a path, the route starts on the bridge.

Open in Maps

8. **NH1** `mapsUrl` (pure, `lib/nav/handoff.ts`): Apple `https://maps.apple.com/?daddr=<lat>,<lon>&dirflg=w`; Google `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lon>&travelmode=walking`; Android `geo:<lat>,<lon>?q=<lat>,<lon>(<label>)`. Six decimals. Only the destination leaves the app, only on a tap.
9. **NH2** `mapsTarget`: the iOS app and iPhone or iPad browsers (an iPad reporting a Mac with touch too) → Apple; the Android app → the chooser, falling back to the Google link when no app takes it; any other browser → Google.
10. **NH3** The navigation bar: a 44 pt `open-outline` button left of End, label "Open in Maps", hint "Opens your maps app with walking directions. Chronicles keeps recording.", testID `nav-handoff`.
11. **NH4** Retired (the owner's call, Nov 3): the first re-route clears the chip at once, so its button was rarely there; the bar's button covers it. Removed from the app on Nov 3. Was: the chip carries an "Open in Maps" button (`offroute-handoff`).
12. **NH5** A route that can't be found ("No walking route found nearby", "Too far to walk from here") shows its error banner with an "Open in Maps" action to the destination asked for.
13. **NH6** The long-press card has "Open in Maps" beside Go here (`spot-handoff`), wrapping within 320 px. A pin's viewer on the walk has "Open in Maps" in its More menu (`viewer-handoff`) when the capture has a place.
14. **NH7** Opening never ends navigation or the walk; coming back, the bar and route are as they were. The link opens straight from the tap (a browser blocks a late one).
15. **NH8** When nothing can open it, a banner says "Couldn't open a maps app."

## Tests

- Unit: `streets` fixtures for NB1–NB5 (a bridge over a path, a footbridge landing mid-street, a path ending under a bridge, a tunnel, a same-level crossing); `nav` for NB2 and NB7 (a route from the bridge doesn't turn down; the heading join); `handoff` for NH1 and NH2.
- e2e: the bar's button opens the Google link to the destination (`window.open` recorded) and navigation stays up; the long-press card's button; a failed route's banner action.

## After the audit (Nov 3)

11 findings: 7 fixed, each with a regression test (`bridges audit N` in `bridges.test.ts`), 2 deferred, 2 for the owner.

| # | Finding | Decision |
| --- | --- | --- |
| 1 | A `layer` without a bridge lifted a 1 km embankment road off the ground, and its side streets lost it (routes 245 → 1,767 m) | Fixed: `layer` counts only on a bridge or tunnel |
| 2 | Stairs and underpass ramps landing mid-line were cut off, and a 5 m connector footbridge was merged away as a sidewalk | Fixed: the landing rule (NB3), and a landing footway is never merged |
| 3 | The route graph merged a ground junction into a bridge vertex 2 m away | Fixed: piece ends merge only with ends. A 200 m chunk end on a bridge within 3 m of a junction below still can (deferred) |
| 4 | The hint promised recording on the web, where a hidden page takes no fixes | Fixed: on the web it says recording pauses |
| 5 | The off-route chip's button rarely shows: the first re-route clears the chip (the owner, Nov 3: removed, NH4 retired) | For the owner |
| 6 | A failed route's Open in Maps went after 6 s, on a 28 px button | Fixed: it stays until dismissed or a new Go here, at 44 pt |
| 7 | Tunnels with no layer (mostly building passages) left the ground | Fixed with 1 |
| 8 | A bridge's sidewalk mapped without bridge tags could still lead down to the path | Fixed: merged into the bridge where it runs the bridge's way |
| 9 | The 12 m heading window can pick a parallel street at an alley mouth | Deferred: it affects only the first leg |
| 10 | Android's chooser opens a pin, not walking directions (the owner, Nov 3: Android is not a priority; left as it is) | For the owner |
| 11 | The NB4 test passed on the old code; NH4 and the viewer were untested | Fixed: NB4 checks the paths stay joined; the e2e checks the viewer's menu, 320 px and the sticky banner. NH4 is still untested |

On real tiles (Zurich, 9 z14 tiles): about 180 fewer pieces of 22,300, the main connected network unchanged (538 km), and identical ids with the bridge and tunnel tags removed (NB5).

## Deferred

- Open in Maps on the Explore mark card, the dead-zone nudge and the home's Walk here.
- The heading join at the destination's end.
- Indoor `level` is not read.

## Native (unverified on a device)

Linking to Apple Maps and the Android `geo:` chooser, with no `<queries>` entry (`openURL` without `canOpenURL`).
