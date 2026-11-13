import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import ts from 'typescript';
import type { Db } from '../../db/types';
import { dbContract, type Legacy } from '../dbContract';
import { memoryDb } from '../fakes';
import { nodeSqlite } from '../fakes/nodeSqlite';
import { makeSqliteDb } from '../../db/sqliteStore';

// The fake shells are tested against...
dbContract('memoryDb (fake)', async (legacy) => memoryDb(legacy));

// ...and the real web store, so the two can't drift apart. Each case gets a
// fresh IndexedDB and a fresh module instance (the store caches its
// connection at module level); cases in a file run one after another.
let n = 0;
dbContract('IndexedDB (db/index.web.ts)', async (legacy?: Legacy) => {
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  const mod = (await import(`../../db/index.web.ts?case=${++n}` as string)) as { db: Db };
  if (legacy?.marks?.length) {
    // The store has no write for the retired scan's marks: open it (which migrates), then put them as an older app did.
    await mod.db.listMarks(null);
    const conn = await new Promise<IDBDatabase>((ok, fail) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => ok(req.result);
      req.onerror = () => fail(req.error);
    });
    const tx = conn.transaction('mark', 'readwrite');
    for (const m of legacy.marks) tx.objectStore('mark').put(m);
    await new Promise<void>((ok, fail) => { tx.oncomplete = () => ok(); tx.onerror = () => fail(tx.error); });
    conn.close();
  }
  return mod.db;
});

const parse = (rel: string) => {
  const file = join(__dirname, rel);
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
};

/** The method (and property) names of `interface Db`, read by the TypeScript parser. */
function dbMethods(): string[] {
  const names: string[] = [];
  const src = parse('../../db/types.ts');
  src.forEachChild((node) => {
    if (!ts.isInterfaceDeclaration(node) || node.name.text !== 'Db') return;
    for (const m of node.members) {
      if ((ts.isMethodSignature(m) || ts.isPropertySignature(m)) && m.name && (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name))) {
        names.push(m.name.text);
      }
    }
  });
  return names;
}

/** The titles of every `test('...')` in the contract suite. */
function contractTitles(): string[] {
  const titles: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'test') {
      const first = node.arguments[0];
      if (first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))) titles.push(first.text);
    }
    node.forEachChild(visit);
  };
  visit(parse('../dbContract.ts'));
  return titles;
}

test('FC7 every Db method has a contract case', () => {
  const methods = dbMethods();
  assert.ok(methods.length > 0, 'no methods read from interface Db in src/lib/db/types.ts');
  const titles = contractTitles();
  const missing = methods.filter((m) => !titles.some((t) => new RegExp(`\\b${m}\\b`).test(t)));
  assert.deepEqual(missing, [], `add a contract case for these Db methods in src/lib/__tests__/dbContract.ts: ${missing.join(', ')}`);
});

// MT11 (decision 0123, the owner's call Nov 10): the native store under the same contract, over Node's built-in
// SQLite (fakes/nodeSqlite), one in-memory database per case. The retired scan's marks are put as an older app did.
dbContract('SQLite (db/sqliteStore.ts over node:sqlite)', async (legacy?: Legacy) => {
  const sql = nodeSqlite();
  const db = makeSqliteDb(sql.open);
  if (legacy?.marks?.length) {
    await db.listWalks(); // migrates
    const put = sql.raw.prepare('INSERT INTO mark (id, walk_id, key, name, category, lon, lat, generic, origin, state, created_at, resolved_at, capture_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    for (const m of legacy.marks) put.run(m.id, m.walk_id, m.key, m.name, m.category, m.at[0], m.at[1], m.generic ? 1 : 0, m.origin, m.state, m.created_at, m.resolved_at, m.capture_id);
  }
  return db;
}, 'sqlite');

test('MT11: the native store opens over node:sqlite, from an empty database and from one at user_version 22', async () => {
  const empty = nodeSqlite();
  assert.deepEqual(await makeSqliteDb(empty.open).listWalks(), []);
  assert.equal(empty.userVersion(), 27); // 27: capture.note_type (note types NY4); 26: outline_tile.hoods (neighborhood boundaries HB12); 25: body_format (note pages NP7)
  const old = nodeSqlite();
  await old.at22();
  assert.deepEqual(await makeSqliteDb(old.open).listWalks(), []);
  assert.equal(old.userVersion(), 27);
});
