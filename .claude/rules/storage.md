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
- **A moment holds its media** (decision 0123): `Moment` (walk, time, place) with `Capture` pieces. Place
  writes are the moment's (`updateMoment`), media writes the piece's (`updatePiece`, by `Faced.piece_id`).
  The web store keeps a moment's pieces inside its record (`piece_ids` multiEntry index for a piece's
  update); SQLite joins `moment` to `capture` in one statement per read (`foldRows`, MT7).
- `MIGRATIONS` live in `db/migrations.ts` (plain strings, run in Node by `momentMigration.test.ts`; old
  entries are held to their hashes). The native store is a factory, `db/sqliteStore.ts`, run under the Db
  contract over `node:sqlite` (`__tests__/fakes/nodeSqlite.ts`, MT11); keep its expo-sqlite calls to those
  the adapter covers, or add them there.
- expo-sqlite: all writes go through the single queue in `db/sqliteStore.ts`, one at a time, on **one writer
  connection held for the app's life** (`openWriter`, `useNewConnection`; performance review, Nov 18): `BEGIN
  IMMEDIATE` … `COMMIT` (or `ROLLBACK`) on it, with its own `busy_timeout`, so another context's writer is waited
  for. The main connection reads, and under WAL sees only what was committed. Before, each write was an
  `withExclusiveTransactionAsync`, which opens, inits and closes a connection of its own (`Transaction.createAsync`)
  with none of the main one's PRAGMAs: about once a second while walking. Never write on the main connection (a
  read mid-write would see half of it), and never use `withTransactionAsync`: it collided with the background
  task's writes. Both connections run `synchronous = NORMAL` under WAL (the owner's default, Nov 18): a commit no
  longer waits on an fsync; a power cut can lose the last commits, never corrupt the file. The contract runs every
  case over two connections to one file (`nodeSqlite(file)`).
  Schema changes go in `MIGRATIONS`,
  tracked with `PRAGMA user_version`. Never edit an existing migration.
- IndexedDB: bump `VERSION` and add an `oldVersion < N` step in `migrate()`. An
  unconditional `createObjectStore` aborts the upgrade.
- **The room left** (storage awareness, SA1-SA10, decision 0107; `lib/space`): `core.ts` decides (levels
  at 500 MB and 100 MB, the words, said once for each level, `isOutOfSpace`), `shell.ts` reads the probe and
  keeps meta `space_said` (the level said; cleared when the room is back) and `space_persist` (`due`,
  `refused`, `asked`); `index.ts` is the instance. Phones read `Paths.availableDiskSpace` (iOS: the plain
  free size, which reads low); the web reads `navigator.storage.estimate()` and asks `persist()`, a listed
  web exception. Never a gauge, a number or a limit on capturing; no Storage screen (0041).
  - The browser's request is never made while a walk records (a Firefox prompt mid-capture): it waits for
    Navigate, ready (`check({ recording: false })`) or a moment kept outside a walk.
  - The storage notice waits while any dark pill stands in Memories' column (tend tabs T37; the owner's answers of
    Nov 18, decision 0208): the open line's pills, Memories' toast and its Undo pill count themselves in
    `space/sight`'s `columnPills` while Memories is in front (the bar's Edit pill counted too, until decision 0240 removed it)
    (`tabsHidden.barOfferUp`: mounted, folded or not; not whether it is drawn). A line already up steps aside meanwhile.
  - A line is said and marked (`space_said`, `space_persist`) only where it can be seen: a `SpaceLine` mounted (each
    counts itself in `spaceLines`), no Modal up (`modalsUp`), no dark pill beside it (tend tabs audit 32). Otherwise
    the look is owed and runs again when any of those changes. A refusal is never owed: it stays `refused` for the next
    look off the walk, where SA10 says it (audit 31).
  - The e2e (`space`) patches `StorageManager.prototype`'s three methods only; replacing
    `navigator.storage` whole hides what other code needs.
  - The meta key scan (FC8) reads only `getMeta` / `setMeta` calls, so the shell calls those, not `metaStore`.
- **Query shape** (`.claude/rules/performance.md`): a read names the rows it needs. Not a whole table
  for one row, a count or an emptiness test (`listSummaries().find`, `listWalks().find` on the web's
  `getOpenWalk`); not `momentsBetween(0, Number.MAX_SAFE_INTEGER)` in new code (the existing callers
  are recorded in `docs/DEFERRED.md`). Indexes match each new WHERE and ORDER BY; a bbox read on four
  ranges prunes on its first column only. Loops of writes use one prepared statement: `eachRow` in
  `db/sqliteStore.ts`; `preparedWrites.test.ts` fails a new loop that runs a statement per row unless its n is
  a handful (a short list that only shrinks).
  A change to many rows is one `Db` method and one statement (`clearSnappedBuilds`), never a loop of
  `updateX` calls: each queued write is its own exclusive transaction and connection on SQLite, and the
  rule-change loop ran one per walk at launch (performance review, Nov 18). Read one row by its key
  (`getSummary`), never a whole table and a `find`.
