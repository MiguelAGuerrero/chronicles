# Plan: where you are, now (YH1-YH7)

From G17 (decision 0273), under `/tend inbox G17 yes`; the brief is `docs/research/current-position.md`. Read by the
steward, not held for the owner (slice `--from`).

## The base it lands on

`node scripts/tend.js base explore navigation tabs`, Nov 27:

- lands on a rough base: explore (a change since its sweep added a screen or a control (db7c6ba, e51f4e9, d14f6fa))
- navigation is settling: nothing above low open (one unrated [loop] item; its latest sweep was not whole)
- lands on a rough base: tabs (a change since its sweep added a screen or a control (0e9a2e0, 1b4d486))

A warning: the slice builds only YH1-YH7 and takes none of those items on.

## Files (source: 6)

| File | Change |
|---|---|
| `src/lib/locate/front.ts` (new, core) | `appReturn(away, next)`: the app came back to the front only after it was in the back (`background`, the web's `visibilitychange` hidden), never on a passing `inactive` (a permission alert, Control Center). `frontRead(permission, askedThisLaunch)`: read (granted), ask once (not granted, the launch's first front), say location off (denied), or nothing. `exploreRead(prev, read, held, now, platform)`: after one read, what Explore knows (`PagePosition`), where it lists from, whether it reframes (the town you stand in changed) and what the notice slot says. `exploreAged`: the same position aged by the timer (`aged`). Built on `pagePosition`, `settle`, `aged` and `positionLine` (`locate/pagePosition.ts`), `locateNotice` (`locate/notice.ts`): no second core. |
| `src/lib/locate/useAppReturn.ts` (new, view) | The hook: React Native's `AppState` (react-native-web serves it from `visibilitychange`; no web exception), calling the screen's read through a ref. |
| `src/app/(tabs)/explore.tsx` | One read on each focus and on the app's return while focused (by `frontRead`; waiting while Plan an outing or the walk planner is open), aborted as the tab leaves the front or a newer read starts; `stale` becomes the held `PagePosition`, aged by a timer (`AGE_TICK_MS`, no read); `walker` only from a fix (muted for a stand-in); with none, the rows are `unplaced` (no walk time or distance) and the town page's subtitle says nothing; the notice slot says location off (with `setRefused`, as Locate's refusal does) or the earlier line, and clears either when a fix comes; a dismissed "location is off" stays dismissed for the launch. |
| `src/components/walk/useReady.tsx` | The focus read moved into one `read` with its own AbortController (ended on blur), and called again by `useAppReturn` while the ready map is in front and the permission reads granted. |
| `src/lib/lastFix.ts` | `launchFix` becomes the launch's one ask; a launch flag for the dismissed notice. |
| `scripts/features.js` | `IN_PROGRESS` entry; the journey `position` under `explore`. |

Docs: this spec and plan; decision 0275; NV16, NV17 and AT1 amended in their mirrors; `.claude/rules/explore-atlas.md`
and `tabs-and-home.md` (the launch-fix lines); `docs/TESTING.md` (the journey's row); `docs/PRODUCT.md`;
`docs/NATIVE_UNVERIFIED.md` (`native item add`); `docs/DEFERRED.md` (S6); `docs/research/current-position.md`'s
`Status:`. Tests: `src/lib/__tests__/moments/currentPosition.test.ts` (new), `src/lib/__tests__/tabs/launchRoute.test.ts`
(NV16's test renamed), `scripts/e2e/journeys/position.js` (new).

## Data

None: no truth, no cache, no migration. The fix stays in memory (`lib/lastFix`), as today.

## Tests per criterion

| Id | Test | Name |
|---|---|---|
| YH1 | unit: a fix 4 km on is `here`, framed; one within 100 m keeps the point, frames nothing; a first fix after none frames | `YH1: …` |
| YH1 | journey `position`: launched at Fox Point, the GPS moved to Cranston with the page in the back, brought to the front: the title "Cranston · You're here", the dot at Cranston, Cranston leading the row; then Navigate and back to Explore at another point: read on the tab's focus | `YH1: …` |
| YH1 | NV16 (amended): the read is no longer once per launch (`launchRoute.test.ts`: `appReturn` and `exploreRead` read again) | `NV16 (amended by 0273): …` |
| YH2 | unit: `appReturn` fires on background then active, not on inactive then active, not twice | `YH2: …` |
| YH2 | journey: on Navigate's ready map, the GPS moved with the page in the back, brought to the front: its `data-walker` follows | `YH2: …` |
| YH3 | journey: an init script counts `watchPosition` against `clearWatch`; after each read on Explore and Navigate settles (a fix, a hung watch's timeout, leaving the tab mid-read) none is open | `YH3: …` |
| YH4 | unit: denied is `LOCATION_OFF.web` / `.native` with `openSettings` on a phone, refused; a timeout says nothing; a fix clears | `YH4: …` |
| YH4 | journey: refused after a reload, Explore's banner reads `LOCATION_OFF.web` and the live region says it; to Chronicle and back, it is said again | `YH4: …` |
| YH5 | unit: refused or no fix, `seen` is `none` and the listing point is kept | `YH5: …` |
| YH5 | journey: refused, no `data-walker` on Explore's map, no "You're here", the row where it last listed | `YH5: …` |
| YH6 | unit: a timeout with a held fix twenty minutes old is `earlier`, its line "From where you were twenty minutes ago."; thirty-one minutes is `none` | `YH6: …` |
| YH6 | journey: the watch hung, the clock twenty minutes on, back to the front: the line, the muted dot, no "You're here" | `YH6: …` |
| YH7 | the journey `position` itself, pictured at 390 and 320 px: `yh-moved`, `yh-earlier`, `yh-refused` | `YH7: …` |

Added at the plan's review: `YH1: permission "prompt", three fronts raise one request` (unit), `YH1: a read 300 m on
within the same town keeps the pick and the frame` (unit and journey), `YH5: refused, no area says a walk time or
distance` (unit and journey: the card's line), `YH6: Explore in front 31 minutes after its read: no "You're here", no
full dot, no read` (unit and journey), `YH4: a dismissed notice stays dismissed until the next launch` (journey: to
Chronicle and back, then a reload), `YH4: outing page open, the app returns refused: one notice said` (journey).

All unit tests are core (no fakes). Todos first, committed alone (`check:test-first`).

## The testing's size

**Flow** (`docs/TESTING.md`, "Size the testing to the change"): a screen's behaviour and a new journey. Journeys: the new
`position` (alone until green), then `launch` (NV16's frame check, the smoke), `atlas` (AT1's reload check), `ready`
(useReady), `outing` and `planner` (their fix-outing-current-position checks: Explore now reads too when the app returns
with those pages open). Removed or renamed: `launchFix` (no journey names it). About 25 minutes.

## Deferred

- Navigate's ready dot from an old held fix (not G17's).
- One read shared between Explore and a planning page opened within seconds.

## Native paths (never run on a device)

- The read on `AppState`'s return on iOS and Android, for Explore and Navigate; that a permission alert's
  `inactive` → `active` reads nothing more.
- Open Settings from Explore's notice when refused (as Locate's today).
- The cost of a high-accuracy fix of up to 10 s at each focus and return.

Each as `native item add` under Explore.

## Cost

Per Explore focus and per app return while Explore or Navigate is in front: one `locateOnce` (a watch of at most 10 s,
cleared at the first fix within 50 m). n is the number of visits: tens a day; no per-frame or per-fix work; no read
while no screen that uses the position is in front. A fix within 100 m keeps `you` the same value, so nothing re-lists
(`useAtlas` keys on `from`). Harness: none (device only; a perf entry in `docs/NATIVE_UNVERIFIED.md`).

## Each action on the screens it changes

No control is added. The actions a person takes:

- **See where I am on Explore after a drive** (every outing after a drive; on foot, phone in hand): no control: the read
  on the return. Adjacent apps: Apple Maps marks the position on a tap (Tracking), Google keeps the blue dot (a watch).
  Matrix: none (no control).
- **Learn that location is off** (rare; at the screen's front): the quiet notice (Banner, `tone: info`), dismissible,
  Open Settings on a phone. Matrix: section 2, "a status that needs no action now: an inline notice". Adjacent: Apple's
  alert with instructions; ours is quieter (Always, "Restraint").
- **Know the position is not current** (when GPS is slow): the line in the same notice slot and the muted dot. Adjacent:
  Google's gray dot.
- **Find me again** (the existing edge Locate, or the empty card's Find me): unchanged.

Where the owner will look first: at the title card and the dot, as they did in Allentown; both are what changes. Defaults
that make something quieter, named for the owner to overrule: the notice is the quiet cream banner, not an alert; the
earlier line shares that slot (one of an error, a notice, "Looking around…", a town's note or the hint at a time); a
timeout says nothing (O21).

## Against precedent

Departs from Apple Maps' dialog: a quiet notice (Always, "Restraint"; 0154). Departs from Google's dot that follows you
on screen: one read per front (0036, the owner's "Fresh fix when needed"). Departs from all four in reading by itself on
the app's return: the owner's call (decision 0273).

## Judgment calls, as the plan's review settled them

The steward's S1-S7 and three Silent questions; the coordinator's rulings and the owner's four answers in person
(decision 0275), recorded in the spec's "The plan's review":

1. A read reframes and selects your own town only when the town you stand in differs from the one listed before; else
   only the dot moves (S4, "Keep the pick (Recommended)").
2. An earlier fix lists and frames as a fix, its dot muted, no "You're here", Walk to asking first.
3. Explore ages its fix while in front, by a timer that reads nothing (S3, "Age it out (Recommended)").
4. The app's return counts only from `background`; Explore and Navigate read by themselves only while granted, and
   Explore asks once per launch (S2).
5. The refusal notice is said at each front until dismissed, then not until the next launch (Silent 2, "Next launch
   (Recommended)"); never under Plan an outing or the walk planner (S5).
6. With no fix, no walk time or distance from you anywhere on Explore (S1, "No walk time (Recommended)").
