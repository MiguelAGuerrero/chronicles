import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { META, metaStore } from '../meta';
import { memoryDb } from './fakes';

test('values round-trip through their codecs', async () => {
  const m = metaStore(memoryDb());
  await m.set('quiet_walk', 'w1');
  await m.set('hint_go', true);
  await m.set('recall_last', 1730000000000);
  await m.set('recall_open', ['c1', 'c2']);
  await m.set('nav', { walk_id: 'w1', dest: { at: [-71.4, 41.8], label: 'Start', kind: 'start' } });
  assert.equal(await m.get('quiet_walk'), 'w1');
  assert.equal(await m.get('hint_go'), true);
  assert.equal(await m.get('recall_last'), 1730000000000);
  assert.deepEqual(await m.get('recall_open'), ['c1', 'c2']);
  assert.equal((await m.get('nav'))?.walk_id, 'w1');
});

test('encodings match what the app already stores, so old call sites can move over unchanged', async () => {
  const db = memoryDb();
  const m = metaStore(db);
  await m.set('hint_go', true);
  await m.set('auto_scanned', 'w1');
  await m.set('recall_last', 5);
  await m.set('recall_open', ['c1']);
  await m.set('ambient_fired', { walkId: 'w1', count: 2, lastAt: 9 });
  assert.equal(await db.getMeta('hint_go'), '1');
  assert.equal(await db.getMeta('auto_scanned'), 'w1');
  assert.equal(await db.getMeta('recall_last'), '5');
  assert.equal(await db.getMeta('recall_open'), '["c1"]');
  assert.equal(await db.getMeta('ambient_fired'), '{"walkId":"w1","count":2,"lastAt":9}');
});

test('missing, cleared and unreadable values read as null', async () => {
  const db = memoryDb();
  const m = metaStore(db);
  assert.equal(await m.get('nav'), null);
  await m.set('quiet_walk', 'w1');
  await m.clear('quiet_walk');
  assert.equal(await db.getMeta('quiet_walk'), '');
  assert.equal(await m.get('quiet_walk'), null);
  await db.setMeta('nav', '{not json');
  assert.equal(await m.get('nav'), null);
  await db.setMeta('recall_last', 'soon');
  assert.equal(await m.get('recall_last'), null);
  await db.setMeta('hint_go', 'yes');
  assert.equal(await m.get('hint_go'), null);
});

test('every meta key the app uses is in the schema', () => {
  // String keys passed to getMeta/setMeta, and *_KEY constants holding one.
  const root = join(__dirname, '..', '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) {
        if (f !== '__tests__') walk(p);
      } else if (/\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk(root);
  const used = new Set<string>();
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/[gs]etMeta\('([a-z_]+)'/g)) used.add(m[1]);
    for (const m of src.matchAll(/_KEY = '([a-z_]+)'/g)) used.add(m[1]);
  }
  assert.ok(used.size >= 10, `found only ${used.size} keys: the scan is broken`);
  const missing = [...used].filter((k) => !(k in META));
  assert.deepEqual(missing, [], 'add these keys to META in src/lib/meta.ts');
});
