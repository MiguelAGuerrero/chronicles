# The stores pack's contract, pinned

A copy of chronicles-data's `contract/stores.schema.json` and the stores entries of its `contract/example/` (branch
`claude/lucid-gates-810ryf`, taken 2026-11-17, contract version 3; the pack's own side is `specs/quick-circuit/handoff.md`).
`storesPack.test.ts` holds the app's reader (`outing/storesRead.ts`, `outing/storesPack.ts`) and its dimension table to it.
To take a new contract: copy those files over this folder, run the test, and change the app where it fails.
