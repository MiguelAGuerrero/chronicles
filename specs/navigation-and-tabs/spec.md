<!-- Mirror of the Claude Docs tab "Navigation & tabs (spec draft)" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# Navigation & tabs

Nov 1, 2026 · @Miguel Guerrero

The one crowded home becomes three tabs, AllTrails-style: Explore finds new places, Navigate is where you capture and walk, Chronicle is where you review moments and walks. A walk takes the whole screen and can be minimized to a bar.

## The owner's calls (Nov 1)

- **Three tabs: Explore · Navigate · Chronicle.** Explore finds new places (what's good here, busy areas, places to find). Navigate is a map around you with quick capture and a pre-start drawer. Chronicle is for review: stars, walks, days, replays.
- **Expo tooling first, for parity** (the owner's rule, Nov 1). The app ships on iPhone and is tuned for it; the web is the dev loop, so it must preview the phone layout. Hence Expo Router's JS `Tabs` now (bundled with expo-router, no new dependency), with native tabs for the iOS build later, behind the one tab layout file.
- **Start just starts; the drawer holds the extras** (the owner's call, Nov 1, after AllTrails: its Navigate page is a Start button that starts where you are). Start sits at the drawer's peek and starts at once, with the saved choices and the destination if one is set. Pulling the drawer up shows the additional settings: quiet or Explore (opening on the last mode picked), what I'm into and the range, the destination, reminders and alerts.
- **Walk here is a one-tap start** (the owner's call, Nov 1, confirmed again after the drawer-filling draft). It starts a walk to that spot at once with the saved choices, and never opens or fills the drawer.
- **Quick capture belongs to navigating and walking:** Navigate and the walk screen have it, Chronicle doesn't. *(Amended Nov 9, decision 0106: Chronicle's Memories has it too, and the app opens there; `specs/capture-from-chronicle/spec.md`.)* It is always one tap away there (the owner's baseline, Nov 1): the capture row never hides behind the drawer, a sheet or a card.
- **The walk takes over the screen, and can be minimized** to a recording bar above the tabs. Stop stays on the walk screen.
- **Spec first.** This tab is reviewed before any code; each criterion becomes a failing test first.

## Changed by Navigate, ready (2026-11-03)

`specs/navigate-ready/spec.md` (NR1-NR13, decision 0076) makes Navigate the walk screen in a
ready state. It **retires** NV10 (Return to walk on Navigate's peek), NV19-NV21 (the drawer's peek,
half and full; the settings are the ready bar pulled up) and U1, U2 (the docked drawer, Navigate's
live view of a minimized walk). It **changes** NV2 (the app opens on the ready screen over Explore)
and NV5 (Navigate has no tab of its own; Back on Chronicle returns to Explore). The rest stand.

## At a glance

&#91;embedded content: three tabs, the pre-start drawer, and the walk over them\]

Navigate's Start starts a walk where you are; Walk here on Explore or Chronicle starts one to that spot in one tap. A walk minimizes to a bar, and its replay ends on Chronicle.

## Criteria

The tab bar

1. **NV1** Expo Router's `Tabs` draws a bottom bar with Chronicle, Explore and Navigate, in that order (amended Nov 9 by HC3, decision 0106; was Explore, Navigate, Chronicle), each with an icon and a label, the same on web and phone. All tab options live in `(tabs)/_layout.tsx`, so moving the iOS build to native tabs later touches only that file.
2. **NV2** The app opens on Chronicle's Memories (amended Nov 9 by HC1, decision 0106; it opened on Explore from Nov 3, over the Nov 1 default of Navigate). An open walk still opens the walk screen at launch, as today. A launch on a walk's or a day's replay that is no longer kept (a Home Screen app reopening on a stale link) goes straight to Chronicle (HC5); reached from inside the app, the replay keeps its message and its way back. A replay that fails to load says so, with Try again, and is never taken for a missing one.
3. **NV3** Each tab keeps its drawer height and map view when you leave it and come back.
4. **NV4** One live map at a time: a tab's map is taken down while another tab, the walk or a replay is in front, and comes back where it was. The e2e counts one canvas on every tab, during a walk, and with a walk minimized.
5. **NV5** Back (Android) or the browser's back on Navigate or Explore goes to Chronicle; on Chronicle it leaves the app. On web each tab has its own path (`/` Chronicle, `/explore`, `/navigate`), so a reload keeps the tab. (Amended Nov 9 by HC1, HC4, decision 0106; was `/` Explore and `/chronicle`.)
6. **NV6** The tab bar hides while the walk screen or a replay is up.

Minimizing a walk

7. **NV7** The walk screen has a Minimize button (chevron down) at its top-left edge, with the navigation bar beside it on the same top row when one shows (the owner, Nov 6), away from the capture row and Stop.
8. **NV8** Minimized, the walk keeps recording, paused or not, and Remind me here keeps firing (on web the check moves out of the walk screen). Explore names places and memory pins again when the walk screen returns.
9. **NV9** While a walk is open and minimized, a recording bar sits just above the tab bar on every tab: elapsed time, distance, and Paused when paused. A tap returns to the walk. It replaces the home's "Return to your walk" banner. It has no Stop. It has a camera button (the owner's call, Nov 1, so capture stays one tap away on every tab): a photo or video taken from it belongs to the open walk, is placed as a walk capture is, and doesn't open the walk screen. It works while paused, as captures do.
10. **NV10** With a walk open, Navigate's peek shows Return to walk in place of Start, and Walk here routes the open walk there (as the walk's own Go here) and returns to it.

Chronicle: review

11. **NV11** Chronicle holds the stars, the sheet (Walks, Days, a place's walks) and the walk and day replays. Start walk, the Explore button and What's good here leave it. The quick-capture row leaves the map, and comes back on Memories (amended Nov 9 by HC6, decision 0106).
12. **NV12** A star's sheet and a long press at z12 or closer keep **Walk here**: one tap starts a walk with that destination and the saved choices, as today ("Walk started · recording"). It never opens or fills Navigate's drawer.
13. **NV13** Notification taps open captures on Chronicle as the home does today (`onRecallOpen`), and go on to the walk when one is open.

Explore

14. **NV14** Explore shows the remembered busy areas (magenta) and each area's places to find and its finds, with no counts (nothing is a score).
15. **NV15** A long press from z10 runs **What's good here?**, as the home does today; at z12 or closer the sheet offers Walk here too, a one-tap start (NV12).
16. **NV16** Explore's drawer peeks with the area in view and opens to its busy streets and places to find. Explore never tracks you: it reads one fix the first time it comes to the front in a launch and frames it, once per launch (the owner's call, Nov 3; amended Nov 9 by HC14, decision 0106: the app opens on Chronicle, which reads none), then uses your last fix or the area in view.

Navigate: capture and the pre-start drawer

17. **NV17** Navigate shows a map around where you are, from one fix (`lib/locate`, ≤ 50 m or 10 s), re-read each time the tab comes to the front. Nothing tracks while you stay on the tab (the owner's rule: no tracking outside a walk).
18. **NV18** Navigate has the quick-capture row (camera, mic, pencil), as the home's `MomentBar` today: a moment is kept at once and placed by its one fix, and shows on Chronicle.
19. **NV19** The drawer peeks with **Start walk**, the mode (Quiet or Explore) and the destination, if any. Start and the capture row are reachable without opening the drawer.
20. **NV20** At half: the mode (a two-way switch, Quiet | Explore) and the destination (its name and straight-line distance, Clear, and a hint: long-press the map to pick a spot).
21. **NV21** At full: what I'm into (the 8 kinds) and the range (60–300 m) with its ring on this map, shown only when Explore is chosen; then Reminders and alerts: the pocket alert (phone only), the pause reminder, and Remind me here notifications.
22. **NV22** Every choice saves as it changes, to the meta keys the walk already reads, so the walk starts with them and its options card shows the same values. The mode opens on the last one picked (`start_mode`), Quiet the first time.
23. **NV23** A long press on Navigate's map sets the destination there, with the ring. It is the only way the drawer's destination is filled.
24. **NV24** Turning a notification switch on asks permission from that tap, never at launch (as the NT rules today).

Starting and the walk

25. **NV25** Start opens the walk screen over the tabs, recording, with the chosen mode (`explore_walk` and `explored:<walk>` set when Explore) and the destination saved in meta `nav` before the screen opens. A walk with a destination says "Walk started · recording".
26. **NV26** The walk screen is unchanged apart from Minimize and where it is reached from. Its options card keeps the Explore switch and Settings for changes on the way.
27. **NV27** Stop opens the replay; closing the replay returns to Chronicle, showing the new walk.
28. **NV28** Start is disabled while a quick-capture memo records on Navigate. Start never waits for Navigate's fix; the walk's recorder takes over.

## Routes and data

No new stores or migrations. The choices already live in meta; one key is new.

| Path | Holds | Change |
| --- | --- | --- |
| `src/app/(tabs)/_layout.tsx` | the tab bar (Expo Router `Tabs`) and the recording bar | new |
| `src/app/(tabs)/navigate.tsx` | Navigate (`/navigate`; `index.tsx` until Nov 3): quick capture and the drawer | new, takes Start and `MomentBar` from the home |
| `src/app/(tabs)/index.tsx` | Explore (`/`; `explore.tsx` until Nov 3) | new, from the home's landing and checklist code |
| `src/app/(tabs)/chronicle.tsx` | Chronicle | today's `index.tsx`, minus Start, Explore, What's good here, quick capture |
| `src/app/walk.tsx`, `replay/[id].tsx`, `day/[key].tsx` | full screen, over the tabs | stay on the root stack; the walk gains Minimize |

- Reused meta: `explore_hidden`, `explore_range`, `explore_haptic`, `notify_off`, `nav` (the destination).
- New meta `start_mode` (`quiet` | `explore`): the mode the drawer opens on, the last one picked.
- The drawers reuse `HomeSheet` (peek, half, full) so every tab drags the same way.
- Minimized, the walk screen is unmounted; the recorder and the reminder check must not live in it.

## Decided (Nov 1)

1. **The tab bar:** Expo Router's JS `Tabs` now, for web and phone parity; native tabs (Apple's tab bar, with its bottom accessory for the recording bar) for the iOS build later. Native tabs were ruled out for now because on web they draw a pill at the top with no accessory and can't hide.
2. **Walk here:** a one-tap start; it never fills the drawer (the owner, Nov 1, overriding the drawer-filling draft).
3. **The mode:** the drawer opens on the last one picked.
4. **Minimize:** in this slice (NV7–NV10).
5. **Quick capture:** on Navigate and the walk; Chronicle is for review only.
6. **Opening tab:** Explore (NV2), the owner's call, Nov 3, after the Home Screen app opened on "This walk could not be found". Navigate had been taken as the default (Nov 1), since capture and Start live there.

Open (Nov 1):

- [ ] **Walk here vs. the drawer.** Decided (Nov 1, the owner): Walk here is a one-tap start (NV12). The drawer holds additional settings only; Start never waits on it.

## Deferred

- **Suggested routes** (catalogued for later, the owner's call, Nov 1): before a walk, offer routes to a destination as Google and Apple Maps do, with detours shaped by the walker's preferences (streets with life, things worth seeing, a modest extra distance). It would take Explore's route preview and "Walk this way" (the draft NV29–NV31) and the scenic routes with it, and offload choices from the drawer. Its own slice, spec first.
- Saved and You tabs (AllTrails' Saved and Profile). Native tabs for the iOS build. Backup stays out of the UI.
- Choosing a starred place or a busy area as the destination from inside the drawer (a search or list).
- Native (unverified on a device): the tab bar, the one-fix map on Navigate, the drawers.

## Tests

- Unit (`npm test`): the start plan, a pure function from the drawer's choices to the walk's meta (NV22, NV25); the last mode picked (NV22).
- e2e (`scripts/e2e-web.js`): the tab bar and its paths (NV1, NV5); one canvas per tab, during a walk and minimized (NV4); Minimize, the recording bar and its return, with the trace still growing, and a photo from the bar's camera landing in the open walk without opening the walk screen (NV7–NV9); Walk here starting at once from Chronicle and Explore (NV12, NV15); quick capture on Navigate showing on Chronicle (NV18); the drawer's three heights and their choices (NV19–NV23); Start with Explore and a destination (NV25); Stop back to Chronicle (NV27); Start at the peek starting at once, with no drawer opened (NV19).
- The whole existing suite moves its Start, Explore, quick-capture and What's good here taps to their new tabs.
