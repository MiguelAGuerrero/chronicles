# Pictures through expo-image: plan (EI1-EI6)

Built on the owner's go-ahead of Nov 18 ("with reasonable defaults forward"): no stop at this plan.

## Shape

- `expo-image` `~58.0.18` (SDK 58's, `EXPO_OFFLINE=1 npx expo install expo-image`), its config plugin in `app.json`
  (it only sets the iOS AVIF decoder's Podfile property, left at its default).
- `src/components/Picture.tsx`: `Picture`, a thin wrapper over expo-image's `Image` with the app's defaults:
  `cachePolicy="memory-disk"` (EI2), no `transition` (EI4), `accessibilityIgnoresInvertColors` kept where hosts set it;
  takes `uri`, `fit` (`'cover' | 'contain'`, as `resizeMode` was: EI5), `style`, `testID`, `onLoad`, `onError`,
  `recyclingKey`, `pointerEvents`.
- Hosts that move to it (every `<Image` on screen, EI1): `CapturePinView`, `ReminderCard`, `MemoryPreview`,
  `chronicle/MomentPicture`, `gallery/GalleryTile` (with `recyclingKey` of its piece, EI3), `gallery/PeriodBlock`,
  `ceremony/Pile`, `ceremony/Cards` (its unedited photo; an edited one is `EditedPicture`).
- Stay as they are: `Baker.native.tsx` (off-screen bake for view-shot), `edit/EditedPhoto` (`EditedPicture` draws
  through react-native-svg's `SvgImage`, under the edit's matrix and colour filter, which expo-image cannot), and every
  `Image.getSize` (a measure).

## Tests (feature `captures`, `src/lib/__tests__/captures/pictures.test.ts`)

Screens can't render under `npm test`; the hosts are held by a source scan, shown to fail on snippets
(`.claude/rules/performance.md`, "Testing a cost"):

| Id | Test |
|---|---|
| EI1 | no file under `src/components` or `src/app` draws `<Image` imported from react-native but `Baker.native.tsx`; every former host renders `<Picture` |
| EI2 | `Picture` passes `cachePolicy="memory-disk"` to expo-image's `Image` |
| EI3 | `GalleryTile`'s `Picture` carries a `recyclingKey` built from its piece's id |
| EI4 | no `transition` prop on `Picture`'s image, and no host passes one |
| EI5 | each host's fit is the one it had (`cover` or `contain` per host, read from the source), and the gallery journey's fill check reads `object-fit` on the web's `<img>` (`EI5` in `scripts/e2e/journeys/gallery.js`) |
| EI6 | device (UNTESTED), an item in `docs/NATIVE_UNVERIFIED.md` |

Journeys that read a picture by the old web shape follow the new one with the same meaning: `gallery.js` (the
tile's `background-size` becomes the `<img>`'s `object-fit`), `journal.js` (its `background-image` scan also sees
`<img>`), `videothumbs.js` (already accepts an `img`).

## Cost

Every picture on screen; n is the gallery's tiles (thousands over years) and the replay's pile. The cost moved: decodes
on every mount become one per picture while it is kept. Web: an `<img>` per picture instead of a background `div`.
Measured by the gallery and replay journeys staying green, and on a device (EI6).

## Deferred

- A blurhash or thumbhash placeholder: would be new art while a picture loads (restraint); the small copy is fast.
- Prefetching the next gallery period's pictures.

## Native paths that will not run on a device

All of expo-image on iOS and Android: EI6's device item.
