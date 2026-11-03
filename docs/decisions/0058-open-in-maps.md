# 0058. Open in Maps hands the destination to the phone's maps app

Date: 2026-11-03 · Status: accepted · Area: navigation

## Context
NH1-NH8, the owner's calls, Nov 3: a fallback when the open data is wrong (the same tab as 0057).

## Decision
The destination goes to the phone's maps app for walking directions. Apple Maps on iOS and iPhone or iPad browsers, Android's `geo:` chooser with Google's link after it, Google Maps in any other browser. It is called straight from the tap; navigation and the walk go on. Only the destination leaves the device, on a tap. Android is not a priority (the owner, Nov 3): its `geo:` chooser opens a pin, not walking directions, and stays as it is.

## Consequences
- `nav/handoff.ts` (pure) picks the app and links; `nav/openInMaps.ts` opens them with `Linking.openURL`, never `canOpenURL` first (Android 11+ says no for schemes not in `<queries>`).
- On web, `nav/openInMaps.ts` reads `navigator.userAgent` and `maxTouchPoints`: a listed native-first exception, "Which maps app" (0006).
- Offered in the blue bar (`nav-handoff`), a failed route's banner (`onError(message, dest)`), the long-press card (`spot-handoff`) and the viewer's More menu (`viewer-handoff`). `HANDOFF_HINT` says recording pauses on the web.
- A narrow exception to local-only (0005): the user sends a destination, on a tap.
- Deferred: the Explore mark card, the dead-zone nudge, the home's Walk here. Native unverified: Apple Maps from the app, the Android chooser, a Home Screen app's `window.open`.
