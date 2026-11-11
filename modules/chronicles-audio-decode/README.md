# chronicles-audio-decode

A local Expo module (autolinked from `./modules`) that decodes an audio file, a voice memo's AAC in `.m4a`, to a
16 kHz mono 16-bit PCM WAV, which is what an offline transcriber reads (`specs/memo-transcripts`, MX20, MX31).

```ts
import { decodeToPcm, isAvailable } from '../modules/chronicles-audio-decode';
```

`isAvailable()` is false where the native module isn't linked (web, Expo Go); `decodeToPcm` then rejects. On failure
it rejects with a message and deletes any partial output. The source is only read, never changed.

- **iOS** (`ios/ChroniclesAudioDecodeModule.swift`): `AVAssetReader` with linear-PCM output settings (16 kHz, one
  channel, 16 bit), which converts and resamples; the WAV header is written once the size is known.
- **Android** (`android/.../ChroniclesAudioDecodeModule.kt`): `MediaExtractor` and `MediaCodec` decode to PCM, a mono
  mix and a streaming linear resample to 16 kHz, then the WAV header.

Only `src/lib/transcribe/engines/` imports it (lint, MX28). If a later engine reads the memo's own container, this
module can be removed with no change to a shell (MX31).

Never compiled or run on a device: see `docs/NATIVE_UNVERIFIED.md`.
