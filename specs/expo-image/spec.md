# Pictures through expo-image (EI1-EI6)

Last exported: not from the concept doc. The source is the performance review of Nov 18 and the owner's go-ahead in
that session: "with reasonable defaults forward; I don't mind dependencies if it's best practice and aligns with how
production-ready apps manage their own assets."

## Vision

Idea: Every picture the app shows is drawn through expo-image with memory and disk caching and recycling in the gallery, with no fade or other new motion; nothing a person sees changes but pictures arriving sooner.
Verb: none (engineering, no visible change)
Touches: Always, "Restraint in motion, colour and copy" (kept: no fade, no placeholder art); decision 0038 (each photo's small copy stays what lists show; expo-image only draws it)
Verdict: no surface
Shape: as asked
Precedent: none found in docs/research/adjacent-apps.md for drawing pictures; Apple Photos and Google Photos show a grid of small copies that stay in memory as you scroll back (from memory, unverified)
Criteria: none
Open: none

## What it is

Every picture on screen (a moment's photo or a video's still on its card, its pin's small copy, a gallery tile and a
month's cover, the replay's cards and pile, a memory preview, a reminder card) was drawn by React
Native's `Image`, which keeps nothing between screens and decodes again on every mount; on the web it is a `div` with a
CSS background. `expo-image` (SDK 58's `~58.0.18`, the module Expo recommends) keeps decoded pictures in memory and on
disk, reuses a list cell's view (`recyclingKey`), and draws a real `<img>` on the web. Pictures read from the device's
own files: nothing is fetched and nothing leaves it.

Not drawn through it: an edited photo (`EditedPicture`, which the baker uses too), drawn through react-native-svg under
its edit's matrix and colour filter; and `Image.getSize` (the baker, the caption, the edited photo), which measures a
photo and draws nothing. React Native's `Image` now draws nothing in the app.

## Decisions

- **The owner's go-ahead, Nov 18**, for the dependency and for building past the plan without a stop ("with reasonable
  defaults forward").
- **No transition** (a fade would be new motion, VISION Always "Restraint in motion"): a picture appears as before.
- **One wrapper** (`components/Picture.tsx`) holds the defaults, so a new host gets them by using it.

## How adjacent apps do it

- **Apple Photos**: the library grid is drawn from small copies the system keeps decoded; scrolling back shows them at
  once with no fade. Source: from memory, unverified. **Unverified**.
- **Google Photos**: thumbnails come from a local cache before any full image; a grid cell is reused as the list
  scrolls. Source: from memory, unverified. **Unverified**.

## Criteria

1. **EI1** Every picture the app draws on screen, but an edited photo's SVG, is drawn through one wrapper over
   expo-image; React Native's `Image` is left only to measure a photo.
2. **EI2** A picture once drawn is kept, decoded in memory and on disk, so seeing it again draws it without reading
   and decoding the file anew.
3. **EI3** A gallery tile scrolled out and back draws its own picture, never a reused cell's last one (each tile's
   picture is keyed by its piece).
4. **EI4** Nothing new moves: no picture fades or animates in.
5. **EI5** Pictures look as before: each keeps the fit it had (cover or contain), and the gallery's tiles still fill
   their cells.
6. **EI6** (device) On a phone, the gallery scrolled through a few hundred photos and back, and the replay's pile, draw
   every picture, with memory settling once the scroll stops.

## Record

Built 2026-11-18 on `claude/bold-hawking-dx3pc8`, on the owner's go-ahead (no stop at the plan).

- **Tests:** `src/lib/__tests__/captures/pictures.test.ts` (EI1-EI5, todo first in `30f970e`, each scan shown to fail on
  a snippet); the `gallery` journey's EI5 check (an `<img>` contained) and MG21 reading either web shape. Test-first by
  history: 5 of 5. EI6 is device-only.
- **Checks:** typecheck, lint, `npm test` (3111), docs, records; `expo-doctor` 18 of 20 (the two failures are the cloud
  session's blocked hosts, `exp.host` and React Native Directory). Journeys on the /chronicles build, once each:
  `gallery`, `memories`, `palette`, `qol`, `replay`, `stacks`, `upgrade`, `videothumbs`, `walk` green; `walkability`
  already green on these inputs; `resurface` stops on `main` too (a More quick actions removed; DEFERRED, filed `[loop]`).
- **UI review:** no finding: cover crops (the replay's colour-bar still), contain shows the aspect grid's photos whole,
  rounding clips round pins and cards. It could not see EI2-EI4 in stills (the gallery fixtures are flat colour).
- **Not drawn through Picture:** an edited photo (`EditedPicture`, an SVG); React Native's `Image` now only measures.
- Not audited. Native has never run on a device (EI6).
