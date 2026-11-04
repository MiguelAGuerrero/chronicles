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
