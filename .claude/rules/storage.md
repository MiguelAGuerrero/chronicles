---
paths:
  - "src/lib/__tests__/storage/**"
  - "src/lib/db/**"
  - "src/lib/media/**"
---
# Storage

SQLite (native) and IndexedDB (web) behind the shared `Db` interface, migrations, and media paths. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

- iOS container paths change across updates and restores. Store media paths relative
  to `Paths.document` and resolve them with `resolveMedia()` at read time.
- expo-sqlite: all writes go through the single queue in `db/index.native.ts`, using
  `withExclusiveTransactionAsync`. Plain `withTransactionAsync` collides with
  concurrent writes from the background task. Schema changes go in `MIGRATIONS`,
  tracked with `PRAGMA user_version`. Never edit an existing migration.
- IndexedDB: bump `VERSION` and add an `oldVersion < N` step in `migrate()`. An
  unconditional `createObjectStore` aborts the upgrade.
- **The room left** (storage awareness, SA1-SA10, decision 0104; `lib/space`): `core.ts` decides (levels
  at 500 MB and 100 MB, the words, said once for each level, `isOutOfSpace`), `shell.ts` reads the probe and
  keeps meta `space_said` (the level said; cleared when the room is back) and `space_persist` (`due`,
  `refused`, `asked`); `index.ts` is the instance. Phones read `Paths.availableDiskSpace` (iOS: the plain
  free size, which reads low); the web reads `navigator.storage.estimate()` and asks `persist()`, a listed
  web exception. Never a gauge, a number or a limit on capturing; no Storage screen (0041).
  - The browser's request is never made while a walk records (a Firefox prompt mid-capture): it waits for
    Navigate, ready (`check({ recording: false })`) or a moment kept outside a walk.
  - The e2e (`space`) patches `StorageManager.prototype`'s three methods only; replacing
    `navigator.storage` whole hides what other code needs.
  - The meta key scan (FC8) reads only `getMeta` / `setMeta` calls, so the shell calls those, not `metaStore`.
