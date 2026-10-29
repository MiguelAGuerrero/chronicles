# Chronicles

A pocket-first walking chronicle for iOS: it records where you walk at street level, keeps the photos and notes you take along the way, and replays the walk as a souvenir.

This first version is the recording foundation: start and stop a walk, record the trace in the background with the screen off, resume it if the app is closed mid-walk, and send a test notification.

## How it is built

- **Expo (React Native), TypeScript.** The app lives at the repo root.
- **`modules/walk-recorder`**: a local Expo module in Swift. It records with `CLLocationUpdate.liveUpdates(.fitness)` plus a `CLBackgroundActivitySession`, the iOS 17 API that lets iOS relaunch a terminated app to continue a session. The stock `expo-location` cannot do that.
- **Traces are append-only JSON Lines** in the app's Documents folder (`walks/<walkId>.jsonl`): every raw fix plus start, resume and stop markers. Nothing is filtered at write time. When a walk stops, the app copies the trace into SQLite (`src/db.ts`).
- **iOS 17 or later.**

## Getting the app onto your iPhone without a Mac

1. Push to any branch or run the **iOS unsigned IPA** workflow by hand from the Actions tab. It takes roughly 15 to 25 minutes.
2. Download the `Chronicles-unsigned-ipa` artifact from the run and unzip it to get the `.ipa`.
3. On Windows, open [Sideloadly](https://sideloadly.io), plug in the iPhone, sign in with your Apple ID, drop the `.ipa` in and press Start.
4. On the iPhone, turn on Developer Mode (Settings → Privacy & Security), then trust your Apple ID under Settings → General → VPN & Device Management.

A free Apple ID signs the app for 7 days; Sideloadly can refresh it over Wi-Fi. The bundle identifier is `com.miguelaguerrero.chronicles`, so keep it fixed: free accounts can only create about 10 app IDs a week.

This build is a Release build with the JavaScript bundled inside, so it works on a walk with no laptop nearby. Any change, JavaScript included, needs a new workflow run.

## The signing test

The first thing to prove is that a free Apple ID allows everything recording depends on.

1. **Permission:** tap Start walk and allow location, then choose **Change to Always Allow** when iOS offers it. The status line should read `always`.
2. **Screen off:** start a walk, lock the phone, put it in a pocket and walk for ten minutes. Unlock and check that the fix count and distance kept rising and the last fix is recent.
3. **Resume:** start a walk, swipe the app away in the app switcher, walk a few minutes, reopen the app. The walk should still be in progress, and the trace should contain a `resume` marker.
4. **Notifications:** tap the test notification button, lock the phone, and wait 15 seconds.

## Development

```bash
npm install
npm run typecheck
npm run prebuild:ios   # generates ios/ (ignored by git); the build itself needs macOS
```
