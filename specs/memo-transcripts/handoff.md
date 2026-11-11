# Memo transcripts: what the owner publishes before this is live

The app is built and its web path is tested with a stub engine. Two files must exist on the chronicles-data Pages
site before a download can verify. Until they do, the Download tap reads "Couldn’t get it. Try again." and nothing is
installed (a wrong or missing file is never moved into place). Do not deploy this slice to the live site before this.

## The two files (decision 0127)

| Platform | File on `https://miguelaguerrero.github.io/chronicles-data/models/` | What it is | Size (a placeholder in the app until measured) |
|---|---|---|---|
| Phones | `ggml-base.en-q5_1.bin` | whisper.cpp's quantized `base.en` model (`ggml-base.en-q5_1.bin` from the `ggerganov/whisper.cpp` Hugging Face repository) | "about sixty megabytes" |
| Web | `whisper-tiny.en-onnx-q8.zip` | a zip of the ONNX Whisper `tiny.en` files transformers.js reads, quantized (`q8`): `config.json`, `generation_config.json`, `preprocessor_config.json`, `tokenizer.json`, `tokenizer_config.json`, `onnx/encoder_model_quantized.onnx`, `onnx/decoder_model_merged_quantized.onnx`, taken from the `onnx-community/whisper-tiny.en` repository (check the file names against that repository's `onnx/` folder) | "about fifty megabytes" |

Both are other people's files under their own licences (whisper.cpp's and the ONNX community's MIT-style terms); read
and keep them with the files.

## What to change in the app after publishing

1. Compute each file's SHA-256 (`shasum -a 256 <file>`).
2. Set the `SHA256` constant in `src/lib/transcribe/engines/whisperRn.native.ts` and in
   `src/lib/transcribe/engines/transformersJs.web.ts`. The tag (`…@<first eight hex>`) follows, so a new file reads
   every transcript made with the old one as stale and reads them again (MX5).
3. Set `bytes` (the room check) and `size` (said in words) to the real file's size.
4. Run `npm test` (`bundle.test.ts` checks both constants are 64 hex digits on the Pages host), then the first
   device run in `docs/NATIVE_UNVERIFIED.md` ("Memo transcripts").

A published file is never changed in place: a new model is a new file name and a new hash, and the old file can stay
for older installs. Pages serves files with `access-control-allow-origin: *` (as for the places archive), which the
web download needs.
