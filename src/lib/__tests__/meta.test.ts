import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { META, META_FAMILIES, metaStore } from '../meta';
import { memoryDb } from './fakes';

test('FC8 values round-trip through their codecs, keys and families alike', async () => {
  const m = metaStore(memoryDb());
  await m.set('deadzone_walk', 'w1');
  await m.set('hint_go', true);
  await m.set('explore_range', 800);
  await m.set('explore_haptic', false);
  await m.set('recall_open', ['c1', 'c2']);
  await m.set('nav', { walk_id: null, dest: { at: [-71.4, 41.8], label: 'Start', kind: 'start' } });
  await m.set('explored:w1', 1730000000000);
  assert.equal(await m.get('deadzone_walk'), 'w1');
  assert.equal(await m.get('hint_go'), true);
  assert.equal(await m.get('explore_range'), 800);
  assert.equal(await m.get('explore_haptic'), false);
  assert.deepEqual(await m.get('recall_open'), ['c1', 'c2']);
  assert.equal((await m.get('nav'))?.walk_id, null);
  assert.equal(await m.get('explored:w1'), 1730000000000);
  assert.equal(await m.get('explored:w2'), null);
});

test('FC8 encodings match what the app already stores, so old call sites can move over unchanged', async () => {
  const db = memoryDb();
  const m = metaStore(db);
  await m.set('hint_go', true);
  await m.set('web_note_dismissed', true);
  await m.set('explore_walk', 'w1');
  await m.set('explore_hidden', ['food']);
  await m.set('explore_range', 800);
  await m.set('explore_haptic', true);
  await m.set('recall_open', ['c1']);
  await m.set('units', 'mi');
  await m.set('day_watched:2026-11-03', 5);
  assert.equal(await db.getMeta('hint_go'), '1');
  assert.equal(await db.getMeta('web_note_dismissed'), '1');
  assert.equal(await db.getMeta('explore_walk'), 'w1');
  assert.equal(await db.getMeta('explore_hidden'), '["food"]');
  assert.equal(await db.getMeta('explore_range'), '800');
  assert.equal(await db.getMeta('explore_haptic'), '1');
  assert.equal(await db.getMeta('recall_open'), '["c1"]');
  assert.equal(await db.getMeta('units'), 'mi');
  assert.equal(await db.getMeta('day_watched:2026-11-03'), '5');
});

test('FC8 missing, cleared and unreadable values read as null', async () => {
  const db = memoryDb();
  const m = metaStore(db);
  assert.equal(await m.get('nav'), null);
  await m.set('deadzone_walk', 'w1');
  await m.clear('deadzone_walk');
  assert.equal(await db.getMeta('deadzone_walk'), '');
  assert.equal(await m.get('deadzone_walk'), null);
  await db.setMeta('nav', '{not json');
  assert.equal(await m.get('nav'), null);
  await db.setMeta('explore_range', 'far');
  assert.equal(await m.get('explore_range'), null);
  await db.setMeta('hint_go', 'yes');
  assert.equal(await m.get('hint_go'), null);
});

test('FC8 a key outside the schema is refused, naming the file to add it to', async () => {
  const m = metaStore(memoryDb());
  await assert.rejects(m.get('nope' as never), /not in META or META_FAMILIES \(src\/lib\/meta\.ts\)/);
  await assert.rejects(m.get('nope:1' as never), /not in META/);
});

/** Meta keys the app uses: literals passed to getMeta/setMeta, `*_KEY = '...'` constants, and `` `family:${id}` `` key builders. */
function keysInUse(): { keys: Set<string>; families: Set<string> } {
  const root = join(__dirname, '..', '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) {
        if (f !== '__tests__') walk(p);
      } else if (/\.tsx?$/.test(f) && !p.endsWith(join('lib', 'meta.ts'))) files.push(p);
    }
  };
  walk(root);
  const keys = new Set<string>();
  const families = new Set<string>();
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/[gs]etMeta\('([a-z_]+)'/g)) keys.add(m[1]);
    for (const m of src.matchAll(/_KEY = '([a-z_]+)'/g)) keys.add(m[1]);
    for (const m of src.matchAll(/[kK]ey = \([^)]*\)(?:: string)? => `([a-z_]+):\$\{/g)) families.add(m[1]);
  }
  return { keys, families };
}

test('FC8 every meta key in use is declared, and every declared key is in use', () => {
  const { keys, families } = keysInUse();
  assert.ok(keys.size >= 15, `found only ${keys.size} keys: the scan is broken`);
  assert.deepEqual([...keys].filter((k) => !(k in META)).sort(), [], 'add these keys to META in src/lib/meta.ts');
  assert.deepEqual([...families].filter((k) => !(k in META_FAMILIES)).sort(), [], 'add these key families to META_FAMILIES in src/lib/meta.ts');
  assert.deepEqual(Object.keys(META).filter((k) => !keys.has(k)).sort(), [], 'nothing uses these keys any more: remove them from META');
  assert.deepEqual(Object.keys(META_FAMILIES).filter((k) => !families.has(k)).sort(), [], 'nothing uses these families any more: remove them');
});
