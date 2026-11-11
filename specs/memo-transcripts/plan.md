# Plan: memo transcripts

Spec: `specs/memo-transcripts/spec.md` (MX1-MX32). Gate: aligned if reshaped, Nov 11.

Read this, then say go (or what to change). No code has been written.

## Shape

A new feature, `transcripts`, with a folder of pure decisions, three small shells and two adapters. The words go in through the seam that already exists.

```
phone: memo (AAC .m4a) ─► decode module ─► 16 kHz PCM (temp) ─► whisper.rn ─► words
 web:  memo (webm or mp4) ─► decodeAudioData + resample (memory) ─► Worker: transformers.js ─► words
                                                           ▲
 model file (phone: cache dir; web: Cache Storage) ◄── download on a tap ◄── pinned URL + SHA-256
                                                           │ load for a run, release after
 Db.transcript (by piece id, engine, tag, time)  ◄── run shell (queue, one memo at a time)
        │
        └─► ResurfaceOptions.transcript ─► MomentView.words ─► threads, resurfaced card, the viewer's line
```

- **core** `transcribe/core.ts`: what to read next (`nextToRead`: memos with no transcript, or one with another tag, oldest first, minus those tried twice), whether a run may start (`mayRun`: switch, model, foreground, no recording), the model's state and the words said for it, the room check, the tag. No clock, no I/O.
- **shell** `transcribe/model.ts` (`createModelStore`: download, verify, install, remove, state), `transcribe/run.ts` (`createTranscriber`: the queue, load, release, the retry count) and `transcribe/words.ts` (the `transcript(c)` source for the resurface shell: a read-through of the table). Factories over `{ db, clock, files, net, engine, decoder }`; tests use fakes.
- **the contract** `transcribe/engine.ts` (core, types only plus the pure helpers): `Engine { id; model: ModelSpec; offline: true; inputs: AudioKind[]; available(): Promise<boolean>; load(path|cache): Promise<void>; transcribe(audio: Audio, signal): Promise<string>; release(): Promise<void> }`, `ModelSpec { url; sha256; size: Words; tag }`, `Audio = { kind: 'container'; uri } | { kind: 'wav16k'; path } | { kind: 'samples16k'; data: Float32Array }`. The shells depend on this and on `Decoder` and `Files` ports, and on nothing else (MX29).
- **engines (adapters)** `transcribe/engines/whisperRn.native.ts` (`whisper.rn`: `initWhisper({ filePath })`, `transcribe`, `release`; inputs `['wav16k']`), `transcribe/engines/transformersJs.web.ts` (starts the Worker, posts samples, terminates it; inputs `['samples16k']`), `transcribe/engines/worker.web.ts` (the Worker: `import('@huggingface/transformers')`, `pipeline('automatic-speech-recognition', …)`), `transcribe/engines/index.native.ts` and `index.web.ts` (the **registry**: the one line that names the engine in use, MX30). A future optimized native engine is one file here and one line in the registry.
- **ports (adapters)** `transcribe/files.native.ts` (`expo-file-system`: `File.downloadFileAsync` into `Paths.cache`, `exists`, `size`, `delete`, `Paths.availableDiskSpace`), `transcribe/files.web.ts` (`fetch` into Cache Storage, `caches.match`, `caches.delete`; `navigator.storage.estimate()` for the room), `transcribe/decoder.native.ts` (the local module; asked only for `wav16k`), `transcribe/decoder.web.ts` (`AudioContext.decodeAudioData`, then an `OfflineAudioContext` at 16 kHz mono; asked only for `samples16k`).
- **instance** `transcribe/index.ts`: the app's transcriber, started at launch and on a memo kept; views read `useStore`.
- **local module** `modules/chronicles-audio-decode/`: `decodeToPcm(inputUri, outputPath)` writes 16 kHz mono 16-bit PCM WAV: iOS `AVAssetReader` with linear-PCM output settings; Android `MediaExtractor` and `MediaCodec` with a resample. `isAvailable()`. Same layout as `modules/chronicles-video-edit`.

## Files to touch

| File | What |
|---|---|
| `package.json` | `whisper.rn` 0.7.4 and `@huggingface/transformers` 4.3.2, the versions read in this session, through `npx expo install` (never npm add; `EXPO_OFFLINE=1` may resolve neither, as neither is an Expo module). No other dependency. |
| `public/ort/**`, a copy step in `package.json`'s `export:web` | the engine's WebAssembly files, copied from `node_modules` into the export and referenced with `env.backends.onnx.wasm.wasmPaths` prefixed by `EXPO_BASE_URL`, so no request goes to `cdn.jsdelivr.net` and the `/chronicles` sub-path works (MX26) |
| `modules/chronicles-audio-decode/**` | the local module (native, never run on a device) |
| `src/lib/transcribe/**` | the contract, core, three shells, the engines and their registry, the ports' adapters, instance, `useTranscribe` hook |
| `eslint.config.js` | `whisper.rn`, `@huggingface/transformers` and `modules/chronicles-audio-decode` as restricted paths with the fix message, off only in `src/lib/transcribe/engines/**` (MX28) |
| `src/lib/db/migrations.ts` | migration **23**: `transcript (piece_id TEXT PRIMARY KEY, text TEXT NOT NULL, engine TEXT NOT NULL, tag TEXT NOT NULL, made_at INTEGER NOT NULL, tries INTEGER NOT NULL DEFAULT 0)` |
| `src/lib/db/index.web.ts` | `VERSION` 19, an `oldVersion < 19` step creating the `transcript` store (web never writes it, but the stores stay equal) |
| `src/lib/db/types.ts`, `sqliteStore.ts`, `stores.ts`, fake db | `getTranscripts(pieceIds)`, `putTranscript(row)`, `bumpTries(pieceId, tag)`; `deletePieces`, `deleteMoments` and `deleteWalk` take the rows in the same transaction (as threads, OT16-OT17) |
| `src/lib/__tests__/fakes/dbContract.ts` | a contract case for each new method (`FC7` fails otherwise) |
| `src/lib/meta.ts` | `transcribe_on` (the switch), declared in `META` |
| `src/lib/resurface/index.ts` | pass `transcript: transcribe.words` into `createResurface` (the seam; extractors untouched) |
| `src/components/StartSettings.tsx` | the walk settings row (MX10-MX15) |
| `src/components/CaptureView.tsx` | the words under a memo (MX1), in the viewer's existing info area, no new chrome |
| `src/components/chronicle/**` | the resurfaced card and thread rows read `MomentView.words`; a memo's words carry the label of MX1 set apart from a note's text (steward S1), so a small change here, checked in the journey |
| `app.json` | nothing expected (no config plugin; `whisper.rn` autolinks). Verify when the module is first built. |
| `docs/ARCHITECTURE.md` | a web exception, with its reason: no Expo module transcribes on web, `whisper.rn` has no web build, and whisper.cpp's WebAssembly needs cross-origin isolation GitHub Pages can't send (as for SQLite) |
| `scripts/features.js` | the feature row, `IN_PROGRESS`, then the journey |
| `scripts/check-vision.js` | `ALLOWED_HOSTS['miguelaguerrero.github.io']`'s reason extended to name the models; no new host (MX23) |
| `docs/` | decision 0127 (library, host, tag, cache dir); `.claude/rules/transcripts.md`; `DEFERRED.md`, `NATIVE_UNVERIFIED.md`, `PRODUCT.md`, `STATUS.md`, `ARCHITECTURE.md` (the codemap, the web exception list: none, web is off) |

## Data

- **Truth vs cache:** the table is a **cache**: derived from a memo's audio and the model's tag, and recomputed, never patched (the AGENTS.md rule). The tag is `<model name>@<checksum prefix>`, so a new model file reads as stale (MX5). `tries` bounds a failing memo to two reads per tag (MX18).
- **Migration:** SQLite 23, IndexedDB 19. Never edits an old migration.
- **Deletes:** rows go with their moment in the one transaction, so an Undo that has not been stored has not touched them (MX21).
- **Files:** on a phone the model in `Paths.cache/models/<name>`, the temporary PCM in `Paths.cache/transcribe/`, deleted at the end of each memo. On the web the model in the Cache Storage entry `chronicles-models`, no temporary file.
- **Two engines, two tags.** `whisper-base.en-q5_1@<sha>` on a phone, `onnx-whisper-tiny.en-q8@<sha>` on the web (the web size to be measured in a real browser before it settles, the owner, Nov 11). A transcript never moves between platforms (nothing syncs), so the tags never meet. Both files are pinned on the one host.

## Tests (each criterion's own, written first, as todos)

Folder `src/lib/__tests__/transcripts/` (a new feature in `scripts/features.js`).

| Criterion | Test file, name |
|---|---|
| MX1, MX2, MX8, MX9, MX23 | journey `transcripts` (a check each): the viewer under a memo with and without words, a resurfaced memo's card, no digit in the slice's copy. The journey drives the whole web path with a stub engine injected by the harness (a test harness, as with mocked GPS), so a run, its words and the Worker's end are all seen; the real engine is timed by hand (below). |
| MX3, MX6 | `core.test.ts`: `MX3: a transcript yields only words and no write to any other field`; `MX6: the same audio and tag give the same stored words` (over a fake engine) |
| MX4, MX5 | `run.test.ts` (shell over fakes): stored with engine, tag, time; a tag change reads stale, shown until replaced |
| MX7 | `words.test.ts`: `ResurfaceOptions.transcript` feeds `MomentView.words`; the note and caption extractors' output unchanged; a thread's term from a transcript is a suggestion and Rename and Not this one work as for notes; deleting the row leaves threads deriving from notes (MX6) |
| MX10, MX15 | journey `transcripts` (web: row absent) and `settings.test.ts` for the state words |
| MX11, MX12, MX14 | `model.test.ts` (shell over a fake net and files): no fetch before the tap, and a fake net that fails on any call proves a launch, a run, a retry and a removed model fetch nothing; checksum match installs atomically; mismatch and partial are deleted and said; not enough room fetches nothing |
| MX13, MX15 | `model.test.ts`: a missing file reads as not installed, and the path is resolved at use and never stored; remove deletes the file and keeps transcripts; `settings.test.ts`: the state words show only with the switch on |
| MX10, MX3 | journey `transcripts`: the switch row has a screen reader label and is shown on web; the viewer has no edit control for a transcript |
| MX28 | `engineBoundary.test.ts`: no file outside `transcribe/engines/` imports the libraries or the module (read from the syntax tree, like `meta.test.ts`), no engine or library name in user-facing copy, meta keys or the table's columns; `npm run lint` carries the same rule, checked by a deliberate violation in the test |
| MX29, MX30 | `engineContract.ts` run over the fake engine and the testable half of each adapter (`whisperRn` argument building, the Worker's message protocol): `MX29: every Engine member has a contract case`; `run.test.ts` and `model.test.ts` parameterised over two fake engines (`MX30`) |
| MX31 | `run.test.ts`: the run asks the decoder only for the engine's first accepted kind the platform has; a `container` engine never calls the decoder |
| MX32 | `model.test.ts`: a new engine's tag reads stale and transcripts stay shown; the old model file is deleted on the new install; nothing is fetched until the Download tap |
| MX25, MX26, MX27 | `engine.web.test.ts` over a fake `Worker`: the Worker is started for a run and terminated at its end; the page's calls return while it runs. Journey `transcripts`: the stub run on the sub-path build served with no COOP or COEP header; a browser with no `AudioContext` says so in words and fetches nothing. |
| MX24 | `words.test.ts`: the words reach the viewer, the card and thread rows and no notification, share, reel, title or day line (`transcript` is read only by those three) |
| MX16, MX17 | `run.test.ts`: the engine is loaded for a run and released on empty, background and memory warning; no run while recording, in the background, with the switch off or no model; one memo at a time, oldest first; a memo saved during a run is saved at once, never awaits the run, and nothing is said |
| MX18, MX19 | `run.test.ts`: a failing memo does not stop the queue and is tried at most twice per tag; silence stores an empty transcript |
| MX20 | `decoder.test.ts` over a fake decoder: the temp PCM is deleted; the memo file is untouched; `isAvailable()` is false off-device. Real decoding is native, on the device list. |
| MX21 | `deleteTranscripts.test.ts` (db contract + `deletion` shell): rows go with the moment, piece and walk in one transaction; a pending delete hides them |
| MX22 | `bundle.test.ts`: no model-extension file over 1 MB in `assets/`, `app.json`, or the web export; the web export's entry chunk does not contain the engine (it is a separate async chunk), and the engine's `.wasm` files are in the export, not a CDN reference |
| MX23 | `vision.test.ts` entry: no new host (the Pages host's reason names the models), and the dependency list adds only `whisper.rn` and `@huggingface/transformers` (their own request defaults switched off). Journey `transcripts`: the harness's request log shows no host but the app's and the model's during a web run. |

Native-only criteria with no phone check here (MX16's real load and release, MX20's real decoding, MX12's real download) get an item in `docs/NATIVE_UNVERIFIED.md` naming the id, and `device:` reasons in `UNTESTED` only for what no fake can reach.

## Screens, one line per action (goal, how often, control, matrix row)

| Goal | How often | Control | Matrix row |
|---|---|---|---|
| Turn transcription on or off | Once, rarely | A **switch** in the walk settings list, **Transcribe memos on this phone**; no separate Save | 14 (toggle a setting) |
| Agree to the one-off download | Once | A basic dialog / action sheet: the model's size in words, **Download** and **Not now** (Cancel as Not now) | 6 (clarify an action the person started) |
| Remove the model to free room | Rare | A dialog from the switch turned off: **Remove the model** and **Keep it**, never destructive-red (it is re-downloadable) | 6, 8 |
| Read what a memo said | Each memo viewed | A quiet line of words under the memo in the viewer, inline, no control; nothing over the memo | 19 (status that needs no action) |
| Hear why a model is not ready | Rare | Inline, under the row, in words ("Not installed", "Not enough room") | 19, 21 |

Precedent: the settings drawers (`docs/PRODUCT.md`, "Settings and notifications": "There is no Settings screen"). Nothing here avoids a matrix row.

## Deferred, and why

- **Search over memo words** (the moment picker finds only notes and captions, 0098): the words are stored, the picker's search is its own slice (DEFERRED.md).
- **Other languages**: English only (the owner, Nov 11).
- **Multithreaded web WebAssembly** (a coi service worker adding COOP and COEP): out; it risks the map tiles and a second service worker beside `public/sw.js`.
- **Background transcription** (while charging, `expo-task-manager`): iOS gives too little time; out of the first cut.
- **Editing a transcript**: out. A transcript is the phone's reading, never the owner's note (MX3). If the owner wants a correction, it is a note on the moment.
- **A resumable model download**: `File.downloadFileAsync` has no resume that I verified; a failed download starts again.
- **Cellular warning** before the download: no network-type module is installed; the dialog says the size in words.

## Web

Web is built and checked in this slice, not deferred: `transformers.js` has no native code, so the e2e (headless Chromium) runs the whole path with a stub engine, and the real engine is timed by hand once in a real browser (Chromium and Safari, the sub-path build, no COOP/COEP) before the web model's size is settled. What stays unrun here: Safari's and Firefox's own decoding of the browser's recordings, WebGPU, and the run's real speed on a phone's browser. Each becomes a line in `docs/NATIVE_UNVERIFIED.md`'s web section (named with its MX id), because they need a real device or browser.

## The engine is replaceable

The owner asked (Nov 11) that no library be coded to explicitly. Three seams carry it: the `Engine` contract (what an engine is), the `Decoder` and `Files` ports (what an engine's inputs and model files need) and one registry line per platform (which engine is in use). Nothing else names a library, and lint, a syntax-tree test and a contract suite hold that. Candidates a later swap could use, named so the contract is shaped to fit them and not to build them now: `react-native-executorch`, `react-native-sherpa-onnx`, or an OS recognizer forced on-device (which would take the memo's own container, so its `inputs` is `['container']` and the decode module is skipped).

Two risks to settle in the first build, not assumed: Metro's web export must split the engine into an async chunk (MX22), checked by building the export; and `transformers.js` must run with `allowRemoteModels` off and its model fetched from our own cache (`customCache`), checked by the request log (MX23).

## Native paths that will not run on a device

`whisper.rn` (load, transcribe, release), the decode module on both platforms, the download to `Paths.cache`, the app's added binary size, the memory behaviour and the time a memo takes on a phone. Each becomes one `- [ ] **Do:** … **Expect:** … (MXn)` item in `docs/NATIVE_UNVERIFIED.md`. Web verifies only the decisions and what is shown.

## Order of work (after your go)

1. `/vision` is done; this plan, then the steward's findings triaged (below).
2. Tests first, committed alone as todos (`Memo transcripts: tests first (MX1-MX23, failing)`).
3. Core and the db (migration 23, IndexedDB 19, contract cases, deletes).
4. The model shell and the run shell over fakes.
5. The local module and the `whisper.rn` adapter (native, unrun).
6. The views: the settings row, the viewer line, the resurface wiring; the journey.
7. Docs, decision 0127, `/docs-gc`.

## The owner's answers (Nov 11)

1. **Host:** the chronicles-data Pages site, `miguelaguerrero.github.io`, already allowed: no new host.
2. **The row:** the walk settings.
3. **The copy:** the label is "Heard by this phone"; the row, its sub-line and the dialog are as drafted, with the size in words ("about sixty megabytes", a placeholder until the file is measured). The label is one string on both platforms, so the web says "phone" too.
4. **Go:** approved, tests first and then the build.

## Steward findings (Nov 11: no breaches, six should-fix, three notes)

All accepted; none rejected.

- **S1** the label covers only the viewer: accepted. MX1 and MX8 say the same label sits on the card, thread row and viewer, set apart from a note's text; `chronicle/**` is in "Files to touch"; a journey check on the card.
- **S2** a thread's term from misheard words: accepted into MX7 (a suggestion as for notes, Rename and Not this one as before) with a test.
- **S3** "Not installed" shows to everyone: accepted into MX13 (state words only while the switch is on or the row is open) with a `settings.test.ts` case.
- **S4** a digit in the dialog: accepted into MX11 (the size in words) and the draft copy.
- **S5** nothing says a launch never fetches: accepted into MX11 and MX13 (the tap is the only way), a fake net that fails on any call, and MX23 (the host's reason worded as it is: the phone's address, on a tap; `whisper.rn` makes no requests).
- **S6** "capture never waits" untested: accepted into MX17 and `run.test.ts`; MX10 says no control joins the capture stack or the viewer's toolbar.
- **S7** turning the switch on reads every old memo: accepted as MX23's "a run never shows or says its progress" and a NATIVE_UNVERIFIED item for heat and battery on a long backlog.
- **S8** the words must not spill: accepted as new MX24 with a test.
- **S9** missing tests: added to the table (path never stored, nothing said on failure, `isAvailable()`, the host entry, the screen reader label, deleting the row leaves threads, no edit control, MX9 on both card and viewer).
- **Silent:** "Remove the model" is only on the owner's own tap, never prompted (MX15). VISION.md's open question 2 stays open until you reaffirm; decision 0127 will carry the proposed edit and the Precedents row, and I do not edit the page myself. The label's register is your call (copy question 3).
