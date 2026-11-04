<!-- Repo first: written from the owner's request in a session (Nov 4), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Compass: turn the map, and find north again

Nov 4, 2026 · @Miguel Guerrero

The map has always been north-up (decision 0030). Once a person can twist it with two fingers, they need a way back. This slice lets the map be turned by hand and adds a compass that appears only while it is turned; one tap sets north to the top again.

## How other apps do it (researched Nov 4)

- **Apple Maps / MapKit:** a compass shows only when the camera's heading is not zero; at north-up the same slot shows the locate button. Tap sets north up.
- **Google Maps:** a small round compass appears only once the map is rotated or tilted, top right on phones; tap resets north. Third-party guides disagree on the corner, and I found no Google doc to settle it.
- **MapLibre `NavigationControl`:** compass in the top-right control stack by default, always drawn unless `showCompass: false`; the needle rotates with the bearing and a click resets it.
- Common thread: a round ~40-44 pt button on the map's right edge, needle that points to true north as the map turns, hidden (or replaced) at north-up, one tap to reset.

## Decisions (the owner's calls, Nov 4)

- The map stays north-up by default; the person may rotate it with two fingers. Following never turns the map by itself, so 0030's reason (a wrong phone course) still holds. Amends 0030 (new decision record).
- The compass appears only while the map is turned; at north-up it is not drawn.
- It sits in the right-edge column, stacked above Locate (above Recenter on the walk), same 44 pt round look.
- It goes on the walk screen, Navigate and Explore, the maps that have the Locate/Recenter button. Not the replay or atlas tiles.

## Criteria

1. **CP1** On the maps named above, two fingers (web: touch rotate; native: the map's rotate gesture) turn the map. No map turns by itself: following, Locate, Recenter and a fit never change the bearing.
2. **CP2** While the bearing is more than 1° from north, a compass shows: a 44 pt round edge button, `testID` `compass`, in the edge column directly above Locate (Recenter on the walk), inside the 640 column on wide screens. At north-up (within 1°) it is not drawn.
3. **CP3** The needle's north end points to true north: the icon is rotated by minus the bearing, so a map turned 90° clockwise shows north to the left.
4. **CP4** Tapping the compass eases the bearing to 0 over the motion tokens' duration (no hard-coded value; instant under reduced motion), then the compass leaves. The centre and zoom do not change.
5. **CP5** The compass's `accessibilityLabel` is "Point the map north" and its role is button. It appears and leaves without a layout jump to the buttons below it.
6. **CP6** `showsCompass(bearing)` and `compassRotation(bearing)` are pure and unit-tested: 0.9° and 359.5° hide it; 1.5°, 90° and 270° show it; rotation is `-bearing`.
7. **CP7** Turning the map stops following the same way a pan does (the existing `onUserMove`); Recenter / Locate resume following and keep the bearing as it is.
8. **CP8** Re-opening a map starts north-up: the bearing is never stored.

## Routes and data

No new storage, routes or dependencies. The bearing is view state, read from the map, never saved.

## Tests

- Unit: `compass.test.ts` (CP6, CP3's rotation).
- E2E (decision 0074): `E2E_ONLY=qol`, step `qol CP1-CP5`: rotate the web map through its test hook, `compass` appears above `locate`, its icon is rotated, a tap returns the bearing to 0 and hides it; centre and zoom unchanged.

## Deferred

- Tilt (pitch) stays off; the compass shows rotation only.
- Heading-up mode (map follows your heading): not wanted, per 0030.
