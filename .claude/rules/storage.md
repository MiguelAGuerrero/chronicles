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
- **A moment holds its media** (decision 0106): `Moment` (walk, time, place) with `Capture` pieces. Place
  writes are the moment's (`updateMoment`), media writes the piece's (`updatePiece`, by `Faced.piece_id`).
  The web store keeps a moment's pieces inside its record (`piece_ids` multiEntry index for a piece's
  update); SQLite joins `moment` to `capture` in one statement per read (`foldRows`, MT7).
- `MIGRATIONS` live in `db/migrations.ts` (plain strings, run in Node by `momentMigration.test.ts`; old
  entries are held to their hashes). The native store is a factory, `db/sqliteStore.ts`, run under the Db
  contract over `node:sqlite` (`__tests__/fakes/nodeSqlite.ts`, MT11); keep its expo-sqlite calls to those
  the adapter covers, or add them there.
- expo-sqlite: all writes go through the single queue in `db/sqliteStore.ts`, using
  `withExclusiveTransactionAsync`. Plain `withTransactionAsync` collides with
  concurrent writes from the background task. Schema changes go in `MIGRATIONS`,
  tracked with `PRAGMA user_version`. Never edit an existing migration.
- IndexedDB: bump `VERSION` and add an `oldVersion < N` step in `migrate()`. An
  unconditional `createObjectStore` aborts the upgrade.
