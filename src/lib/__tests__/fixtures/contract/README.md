# The fixtures pack's contract, pinned

A copy of chronicles-data's `contract/fixtures.schema.json` and the fixtures entries of its `contract/example/` (its main
at `89767cd`, taken 2026-11-26, contract version 9; the pack's own side is chronicles-data's `docs/fixtures/spec.md`,
FX1-FX14). `fixtures.test.ts` holds the app's reader (`fixtures/kinds.ts`, `fixtures/read.ts`, `fixtures/pack.ts`) and
its kind list to it. The places and stores contracts keep their own pinned copies (`explore/contract/`,
`outing/contract/`), each at the version it was taken.
To take a new contract: copy those files over this folder, run the test, and change the app where it fails.
