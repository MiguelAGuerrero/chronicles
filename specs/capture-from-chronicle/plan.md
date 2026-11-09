# Capture from Chronicle: plan

For the owner's review before any code (`/slice` step 3). Spec: `specs/capture-from-chronicle/spec.md` (HC1-HC14); the owner's calls: decision 0106.

## Defaults for your review

These are my calls where the owner's answers left room. Each can flip without touching the rest. **All four were taken by the owner's go-ahead ("Proceed", Nov 9) and recorded in decision 0106.**

1. **Paths: Chronicle becomes the root route (`/`), Explore moves to `/explore`, `/chronicle` redirects to `/`.** This is what 0070 did for Explore, and it is what makes the Home Screen app (`start_url: "./"`) and a native cold start (expo-router always opens `/`) land on Chronicle with no redirect at launch. Rejected: keeping `/` as Explore and replacing it with `/chronicle` at launch. Every launch would pay a hidden redirect (one frame of Explore, or a cover as the open walk's launch uses), and Back's "initial route" would disagree with the URL.
2. **The row is a band at the foot of Memories, three equal buttons, icon and one word each** (Photo, Voice, Note). The walk screen's stack is a column at the right edge, over a map; over a list it would sit on top of the cards' text (HC7), so on Memories it lies flat above the tab bar instead. The glyphs, order (camera, mic, note), ink and surface are the stack's. 56 pt tall, as the stack's buttons. While a memo records: Discard in the camera's place, Stop & save in the mic's, the timer in the note's, so nothing moves (HC11).

   ```
   │  Lately                              │
   │  ┌ moment card ┐                     │
   │  └─────────────┘   (scrolls under)   │
   ├──────────────────────────────────────┤ hairline
   │  [ camera  Photo ][ mic  Voice ][ note  Note ] │ 56 pt, ink on surface
   ├──────────────────────────────────────┤
   │  [recording bar, when a walk is minimized]  │
   │  Chronicle      Explore      Navigate │
   ```
3. **Changed after the steward (S4), your call: the recording bar hides its camera while Memories is in front.** With a walk minimized, the bottom of Memories would otherwise stack the band, the bar with a second camera doing the same thing, and the tab bar. The bar keeps its camera on Explore and on Chronicle's other sections. If you'd rather keep the bar the same on every tab, say so; it is one line either way, and the choice gets recorded in 0106.
4. **Changed after the steward (S3): Memories' empty state loses its orange Navigate button.** It is "Nothing kept yet." and the band (HC13). Navigate is a tab, and an accent button would be the loudest thing on a first launch, pointing away from the band.

## Files

### The launch and the tabs (HC1-HC5, HC14)

- `src/app/(tabs)/index.tsx` becomes Chronicle (today's `(tabs)/chronicle.tsx` moves here). `src/app/(tabs)/explore.tsx` becomes Explore (today's `(tabs)/index.tsx`).
- `src/app/explore.tsx` (the `/explore` → `/` redirect) is deleted. `src/app/chronicle.tsx` takes its place: `/chronicle` → `router.dismissTo('/')` on focus (not `<Redirect>`, which stacks a second tab bar).
- `src/lib/startPlan.ts`: `TABS` in the new order, with `chronicle` at route `index`, path `/`, and `explore` at route `explore`, path `/explore`. Tab ids are unchanged, so `tab-explore`, `tab-chronicle` and every `tabTo` keep working.
- `src/lib/resurface/section.ts`: `keepsSection` reads Chronicle's path as `/`.
- Every `router.navigate('/chronicle')` and `dismissTo('/chronicle')` becomes `/`: `CaptureView`, `ScreenError`, `MemoriesScreen`, `day/[key]`, `replay/[id]`, Chronicle itself and `notify/index.ts`. The replay's and day's stale-link `dismissTo('/')` now lands on Chronicle with no change (HC5). The replay's `leftForChronicle` guard stays.
- `readyNav.BENEATH_TAB` stays `/`, which is now Chronicle (HC4, no code change).
- `lib/lastFix` (`launchFix`): Explore already asks its fix on its first focus. Nothing else reads a fix at launch, so HC14 is a check, not a change. If the e2e shows otherwise, the fix goes there.

### The row (HC6-HC13)

- `src/components/walk/CaptureStack.tsx`: a `layout: 'stack' | 'band'` prop. The band lays the same three `Round`s as a row of labelled buttons, using `bandLayout` for widths and slots. The stack is untouched.
- `src/components/MomentBar.tsx`: `CaptureRow` takes the same `layout`. In a band its pills and toast sit above the band, not left of a column. `MomentBar` takes an optional open walk: with one, `useCaptures(walk.id, live.here, live.lastFixAt, …)`, as the recording bar does (HC10); without, `{ loose: true }`, as now (HC9).
- `src/components/chronicle/MemoriesScreen.tsx`: mounts the band once, outside the body's switch, first in the tree after the options button (screen-reader order, HC8) and drawn at the foot, so it stays across Lately, a thread, a Chronicle thread and Hidden (HC7). Every list and scroll gets `paddingBottom` of the band's height. `onMoment` 'kept' and 'placed' call `resurface.refresh()`, so the moment heads Lately at once and gains its place in place (HC9). Leaving Memories (a section, a tab) passes `focused={false}`, which saves a memo as the ready screen does (HC11).
- `src/lib/captureBand.ts` (new, `@layer core`): `bandLayout(width, insets)` gives the three equal widths inside the 640 column and the band's height; `captureTarget(openWalk)` gives `{ walkId } | { loose: true }`. The two decisions a screen would otherwise make inline.

- Memories' Undo toast (`styles.toast`, `bottom: 16`) and the band's pills and toast sit at `bottom: band height + 12` (HC15). Mid-memo, `open`, the menus, Relive and a replay first await the band's `saveVoice` (HC11).
- `src/components/RecordingBar.tsx`: no camera while Chronicle's Memories is in front (default 3; `usePathname()` is `/` and `chronicleSection` is `memories`).
- `MomentBar`'s toast copy gains "<Kind> saved to your walk" for the walk case (HC10, HC15).

### Data

No new truth, no cache, no migration. A moment from the band is the same row `MomentBar` writes today (`walk_id` null, or the open walk's).

## Tests (each a todo first, in one commit)

| Id | Where | Test |
|---|---|---|
| HC1 | `src/lib/__tests__/tabs/homeCapture.test.ts` | `HC1: Chronicle is the root route` (`tabFor('chronicle')` at route `index`, path `/`) |
| HC1 | journey `capturehome` | `HC1: the app opens on Memories at /, one tab bar, no map` |
| HC2 | journey `reload` | `HC2: a launch with a walk open shows the walk screen, never a frame of Chronicle` (the existing per-frame sampling, retargeted) |
| HC3 | `homeCapture.test.ts` and journey `launch` | `HC3: Chronicle · Explore · Navigate` |
| HC4 | `homeCapture.test.ts` | `HC4: the walk screen with nothing beneath goes to Chronicle` (`exitPlan(false).to === tabFor('chronicle').path`) |
| HC5 | `src/lib/__tests__/resurface/section.test.ts` | `HC5: Chronicle at / keeps its section; /explore is elsewhere` |
| HC5 | journey `launch` | `HC5: stale replay and day links, /chronicle and /explore` |
| HC6-HC8 | journey `capturehome` | one check per id: three buttons in order with their glyphs, labels and boxes ≥ 44 pt; none on Walks, Days or Map; the band's box unchanged after scrolling Lately and opening a thread; the last card's text box clear of the band; a note kept while a thread is open leaves the thread's moments unchanged |
| HC9 | journey `capturehome` | `HC9: a note heads Lately at once, then shows its place`; `HC9: no location is read between moments` (the harness's geolocation counter) |
| HC9 | `homeCapture.test.ts` | `HC9: no walk open, the band keeps loose moments` (`captureTarget(null)`) |
| HC10 | `homeCapture.test.ts` | `HC10: a walk open, the band files into it` (`captureTarget(walk)`) |
| HC10 | journey `capturehome` | `HC10: a note from Memories with a walk minimized shows on the walk screen` |
| HC11 | journey `capturehome` | `HC11: mid-memo the band's buttons keep their boxes; leaving Memories saves the memo` |
| HC12 | journey `capturehome` | `HC12: no accent colour, digit or prompt copy in the band or Memories' empty state` (the replay card's scan, reused) |
| HC13 | journey `capturehome` | `HC13: empty Memories is one line and the band` |
| HC14 | journey `capturehome` | `HC14: a launch on Chronicle reads no location; Explore's first focus reads one` |
| HC15 | journey `capturehome` | `HC15: the Undo toast and the moment's toast sit above the band; the band's boxes unchanged while each shows; the toast copy` |
| HC8 (order) | journey `capturehome` | `HC8: Tab from the options button reaches the camera next` |
| HC6 (states) | journey `capturehome` | `HC6: the band works while Memories failed to read` (the db read made to fail, as `memories-failed` is reached today) |
| layout | `homeCapture.test.ts` | `bandLayout` unit cases (narrow, wide, safe area), under HC7 |

- **New journey** `scripts/e2e/journeys/capturehome.js` (`E2E_ONLY=capturehome`), covering `MemoriesScreen`, `MomentBar`, `CaptureStack` and `captureBand`. A row for it goes in `scripts/features.js` under `tabs`, and the `moments` feature lists it too.
- **The harness** gains `exploreUrl` (`${url}explore`). The journeys that open `url` expecting Explore move to it: atlas, grading, kindwalk, layers, outlines, scenic, snap, walkability, walk, qol, ready (where it starts on Explore). The ones that check `/chronicle` as a path read `/`: chronicle, days, replay, resurface, threads, notifications, tabs. `launch` is rewritten around HC1-HC5 and HC14 (NV1, NV2, NV5, NV11, NV16 retire into them). The rule file's "`url` opens Explore" line changes.
- **Before done**: typecheck, lint, `npm test`, and every journey `check:affected` names. Because the root path changes, that is close to the full set, and each runs alone with `E2E_ONLY`.

## The steward's findings (Nov 9), triaged

| Id | Finding | Triage |
|---|---|---|
| S1 | For a screen reader, the band can sit behind the whole feed | accept, in HC8: first after the options button |
| S2 | A note kept with a walk open never shows in Lately while the walk is open | accept, in HC10 and HC15: the toast says "saved to your walk"; Lately's rule for open walks (0098) is unchanged. Rejected: an extra line in Lately saying so (more chrome than the toast) |
| S3 | An orange Navigate button on the empty first screen | accept, in HC13 and default 4 |
| S4 | Two cameras and three bars of chrome with a walk minimized | accept as a recommendation, default 3; it's your call |
| S5 | Memories' Undo toast lands over the band; the toast copy is unspecified | accept, new HC15 |
| S6 | Mid-memo, the rest of Memories can play over the recording | accept, in HC11 |
| S7 | The band in the loading and failed states | accept, in HC6 |
| S8 | HC12's scan would fail on the recording state's purple and timer | accept, in HC12 |
| Silent 1 | Every launch now opens on a resurfaced moment: is that "the right time" (open question 5)? | for you (below) |
| Silent 2 | Should the toast say where a moment went ("in Lately")? | reject: "kept here" plus the moment heading Lately at once says it |
| Silent 3 | The labels say "Keep a moment" when the capture files into a walk | accept, in HC8 |

**For you, from Silent 1:** 0098 brings back one moment each time Chronicle opens. Now that the app opens there, every launch leads with a resurfaced moment above the band. I'd keep it: it is the front door 0098 chose, Memories' switch already turns it off, and the band is the first thing a screen reader reaches. If you'd rather a launch open on Lately, that is a change to 0098.

## Deferred

- A capture row on Walks, Days and Map (your call: Memories only).
- Quick capture outside the app (widget, lock screen, share sheet) stays deferred (0036).

## Native, never run on a device

- A native cold start opens `(tabs)/index` (Chronicle) with no walk open, and the walk screen with one.
- The band above the native tab bar and the recording bar, with the home indicator's inset.
- A memo saved when Memories loses focus to a section switch (no route change; `focused` comes from the section).
- Each becomes a `docs/NATIVE_UNVERIFIED.md` item with its ids.

## Docs

- Decision 0106 (written with this plan); `docs/VISION.md` Precedents gains its row (a precedent, not a rule).
- `.claude/rules/tabs-and-home.md` (the opening tab, the e2e's `url`), `.claude/rules/moments-and-days.md` (capture from Chronicle), `.claude/rules/memories.md` (the band in Memories).
- `docs/ARCHITECTURE.md` (routes), `docs/PRODUCT.md` (the launch, Chronicle, capture), `docs/STATUS.md`.
- `specs/navigation-and-tabs/spec.md`: NV1, NV2, NV5, NV11, NV16 and the quick-capture line marked amended by HC, with the date.
