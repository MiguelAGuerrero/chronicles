<!-- Repo first: written from the owner's request in a session (Nov 9, 2026): "a way for the app to alert you about memory consumption, and put limitations and restrictions before the app consumes too much"; "moment memory", phone storage or the browser's storage for the web app; "be framework first and use Expo, proceed with your reasonable defaults". Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Storage awareness: say it before space loses a moment (SA)

Nov 9, 2026 · @Miguel Guerrero

Moments are the corpus, and media is the bulk of it: a photo is a few MB and a 30 s video tens. Today the app never reads how much room is left. A photo or video that fails to save shows the platform's raw error, and the moment is gone; only a voice memo has Retry. On the web the browser keeps the app's data "best effort" and may clear it under storage pressure, because the app never asks to be kept. This slice makes the app aware of the room left, says so in words before it becomes a loss, and makes sure no capture is lost when a save fails anyway.

## Vision

```
Idea: The app should alert you about how much storage moments use, and act before space runs out (the owner, Nov 9: "moment memory", the phone's storage or the browser's storage for the web app).
Verb: honour (a moment kept whole: never lost to a full device, and never refused, shrunk or deleted by the app to save room).
Touches: Always, "Capture is one tap away" (no limit blocks a capture, and no browser prompt lands mid-walk: SA6, SA10). Always, "Moments and the trace are truth" (the app never deletes or shrinks a moment for space: SA6). Always, "Counts are words" and "Restraint" (no meter, percentage or size: SA7). Never, "Nagging" (once for each level on the device, never as a notification: SA4). Never, "Data leaving the device" (everything is read on the device: SA1). Decision 0041, "No Storage screen" (stands: freeing space stays in a walk's or a moment's More menu). Decision 0006, native first (the web reads the browser's storage API, an exception: no Expo module covers it on the web).
Verdict: aligned if reshaped
Shape: No storage screen and no usage figure. The app reads the room left on the device (on the web, the room the browser gives the app). When it is low, one line in words sits beside the capture buttons, once for each level, saying room for new photos and videos is running low. Every capture that fails to save is held for Retry, with why in words. On the web, the app asks the browser once to keep its data, never mid-walk, and says once on Navigate, ready if it was refused. Caps on the caches that can be rebuilt are a separate engineering change.
Criteria: SA1-SA10.
Open: none for this slice (the owner, Nov 9: Expo first, the recommended defaults). Deferred: Apple's "important usage" capacity (a native module), caps on rebuildable caches.
```

## Decisions (the owner's calls, Nov 9; decision 0104)

- **"Memory" is storage:** the phone's storage, or the browser's storage for the web app. Not the app's working memory.
- **Expo first.** A phone reads its free space with expo-file-system's `Paths.availableDiskSpace`. No native module of our own: Apple's "available for important usage" capacity is deferred. On iOS the Expo figure leaves out what the system could purge, so it reads low, never high.
- **The web is an exception** (expo-file-system's web build returns 0): it reads `navigator.storage.estimate()` (the quota left) and asks `navigator.storage.persist()`.
- **Decision 0041 stands:** no Storage screen. Freeing space stays where it is.
- **The defaults:** low under 500 MB, very low under 100 MB; said beside the capture buttons, once for each level, never as a notification; the persistence request once, never while a walk records.
- **The steward's read (Nov 9), accepted whole:** every failed capture held (S1), once per level rather than per walk (S2), the persistence request off the capture flow (S3), copy that names no action the platform lacks (S4), never says "this device" (S5), never asks to free or delete (S6), and the same pill at both levels (S7).

## Criteria

### Knowing the room left

1. **SA1 · Read on the device.** The room left is read on the device: on a phone, the free space of the storage that holds the app's documents; on the web, the browser's quota for the app minus what it uses. When it can't be read (no API, an error, a value that isn't a number), the app says nothing about space. Nothing about space leaves the device.
2. **SA2 · Two levels, in bytes.** Under 500 MB left is **low**; under 100 MB is **very low**; otherwise nothing is said. The levels are constants, the same on every platform.

### Saying it in time

3. **SA3 · Said beside the captures.** When the walk screen opens a walk (started, or reopened), or Navigate, ready shows, and the room left is low or very low, one line in words shows in the pills beside the capture buttons. Low: "Room for new photos and videos is running low." Very low: "There is almost no room left for new photos, videos and memos." No line says "this device" (on the web it is the browser's room, and a phone's figure leaves out what the system could clear).
4. **SA4 · Once for each level.** The line is said once for a level, across Navigate, ready and every walk, a reload included. It is said again only when it gets worse (low to very low), or when the room rose above low and then ran low again. It is never a notification.
5. **SA5 · Read again after each capture.** After each kept photo, video or memo the room left is read again, so space running out mid-walk is said then, within SA4.
6. **SA6 · Never blocks.** The line has a dismiss button. At every level the capture buttons stay enabled; the app never refuses, shrinks or deletes a capture to save room.
7. **SA7 · No gauge, no alarm.** No line holds a digit, a percentage or a size, and no screen shows how much room the app uses or has left (0041: no Storage screen). The low and very low lines differ only in their words: the same pill as the others, no icon, colour, haptic or motion of their own. No line asks the walker to free, delete or clear anything.

### When a save fails anyway

8. **SA8 · Every failed capture is held.** A photo or video that fails to save is held, every one of them, not only the last: a pill says "Photo not saved" or "Video not saved" (several: "Photos not saved", "Videos not saved", "Photos and videos not saved") with Retry, on the walk screen and on Navigate, ready. Retry saves each with the time and place it was taken; one that fails again stays held. Holding Stop with a capture still held says so first, as an unsaved memo does. A memo keeps its Retry, as before.
9. **SA9 · Why, in words.** A save that failed for lack of room says so: "Not saved: there is no room left. It is held here for Retry." Any other failure says "Couldn’t save this photo." ("video", "voice memo"). The platform's raw error text is never the message.

### The web's storage

10. **SA10 · Asked once to be kept, at a calm moment.** On the web, once a capture has been kept, the app asks the browser once to keep its data, never while a walk is recording: after a moment kept outside a walk, or when Navigate, ready next shows. If the browser refuses, Navigate, ready says once, in its pills: "This browser may clear Chronicles’ moments when it needs room.", followed on an iPhone or iPad browser by "The Home Screen app is less likely to." It never asks or says it again. A phone never asks or says it.

## Routes and data

- No new route, truth or cache, no migration and no new dependency (expo-file-system is installed).
- Meta: `space_said` (the level last said: `low` or `very-low`; cleared when the room is above low) and `space_persist` (`due`, `asked`).
- New: `lib/space/` (`core.ts` levels, lines, the once rule, failure words; `shell.ts` the factory; `index.ts` the instance; `probe.native.ts` / `probe.web.ts` / `probe.ts` the adapters), `components/SpaceLine.tsx`.

## Tests

- Unit (`src/lib/__tests__/storage/`): `space.test.ts` (core: SA2, SA3's words, SA4's rule, SA7, SA8's labels, SA9), `spaceShell.test.ts` (shell over `fakePorts()` and a fake probe: SA1, SA3, SA4, SA5, SA10).
- E2E journey `space`: SA3, SA6, SA7 on Navigate, ready and the walk screen, with the browser's estimate made low; SA8 and SA9 with the media store's write refused as out of quota; SA10 with `persist()` refusing.

## Deferred

- Apple's "available for important usage" capacity, which counts what iOS can purge for a user's save: needs a native module (the owner chose Expo first).
- Caps on the caches that can be rebuilt (`walk_tile`, old builds' rows, remembered ward ids; `docs/DEFERRED.md`).
- A Retry for the recording bar's camera on other tabs (NV9): it shows the SA9 words; its Retry waits.
- A check before a video starts recording: the system camera owns the recording.
- Held captures live in memory: leaving the screen or reloading drops them (Stop warns first, SA8). Keeping them across a reload needs the file kept somewhere that survives, which a full disk may refuse.
- The owner asked for "limitations and restrictions" too: the only ones the vision allows are on what the app can rebuild (above), never on capturing.

## Native (unverified on a device)

`Paths.availableDiskSpace` on iOS and Android, an iOS photo save failing with a full disk, and the SA9 words for it.

## Record

Nov 9, 2026, branch `claude/quirky-ramanujan-5z25ga`:

- SA1-SA10 pass: `storage/space.test.ts` and `storage/spaceShell.test.ts` (unit), the `space` journey (e2e). Each criterion's todo came before its code (`npm run check:test-first storage-awareness`).
- Typecheck, lint, `npm test` and the journeys covering the changed files pass: `space`, `ready`, `walk`, `edit`, `days`, `tabs`, `reload`, `hidden`, `gaps`, `layers`, `marks`, `headsup`, `walkability`.
- The steward's read (one breach, four drifts, two tone) was accepted whole before the code (plan.md).
- Deferred: as above, also in `docs/DEFERRED.md`. Native unverified: four items in `docs/NATIVE_UNVERIFIED.md`.
- Not audited (decision 0074: on the owner's request).

