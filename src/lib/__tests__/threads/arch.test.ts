import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { answeringLine } from '../../threads/lines';
import { createThreads } from '../../threads/shell';
import { fakePorts } from '../fakes';

const LIB = join(__dirname, '..', '..');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
const imports = (file: string) => [...readFileSync(file, 'utf8').matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);

test('OT19: the owner\'s threads and the Chronicle\'s derived threads never import each other', () => {
  for (const f of files(join(LIB, 'threads'))) {
    for (const i of imports(f)) assert.doesNotMatch(i, /resurface/, `${f} reads the Chronicle's threads`);
  }
  for (const f of files(join(LIB, 'resurface'))) {
    for (const i of imports(f)) assert.doesNotMatch(i, /^\.\.\/threads(\/|$)/, `${f} reads the owner's threads`);
  }
});

test('OT23: the resurfaced card reads no owner thread, so a moment in one is eligible like any and carries no thread name', () => {
  for (const f of ['pick.ts', 'feed.ts', 'lines.ts', 'views.ts', 'shell.ts']) {
    assert.doesNotMatch(readFileSync(join(LIB, 'resurface', f), 'utf8'), /owner thread|threads\/(rules|shell|lines|types|timeline)/);
  }
});

test('OT20: nothing about a thread can leave the device: no network, share, export or notification in its modules', () => {
  for (const f of files(join(LIB, 'threads'))) {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|lib\/net|expo-sharing|Share\.|notifier|expo-notifications|export\//, f);
    for (const i of imports(f)) assert.doesNotMatch(i, /(^|\/)(net|export|notify|share)(\/|$)/, `${f} imports ${i}`);
  }
});

test('OT21: the stores are added by a new migration (SQLite, IndexedDB 17) and the earlier ones are left alone', () => {
  const native = readFileSync(join(LIB, 'db', 'index.native.ts'), 'utf8');
  const block = native.slice(native.indexOf('const MIGRATIONS = ['), native.indexOf('\n];', native.indexOf('const MIGRATIONS = [')));
  const entries = block.split(/^  `\n/m).slice(1);
  const mine = entries.findIndex((e) => /CREATE TABLE thread\b/.test(e));
  assert.ok(mine >= 20, 'the threads migration is added after the 20 that existed, never among them');
  assert.match(entries[mine], /CREATE TABLE thread\b[\s\S]*CREATE TABLE thread_member[\s\S]*CREATE TABLE moment_link/);
  for (const [i, e] of entries.entries()) if (i !== mine) assert.doesNotMatch(e, /thread_member|moment_link/, `migration ${i + 1} was edited`);
  const web = readFileSync(join(LIB, 'db', 'index.web.ts'), 'utf8');
  assert.match(web, /const VERSION = (1[7-9]|[2-9]\d);/);
  assert.match(web, /oldVersion < 17\)[\s\S]*createObjectStore\('thread'[\s\S]*createObjectStore\('thread_member'[\s\S]*createObjectStore\('moment_link'/);
});

test('OT24: a reply is placed by its own capture, never from the moment it answers; its row names the answered place', async () => {
  const ports = fakePorts();
  const threads = createThreads(ports, { schedule: () => {} });
  await ports.db.addCapture({ id: 'orig', walk_id: null, t: 1, lat: 41.8, lon: -71.4, kind: 'text', file_path: null, body: 'a', segment_id: null });
  await ports.db.addCapture({ id: 'home', walk_id: null, t: 9, lat: 40.0, lon: -73.0, kind: 'text', file_path: null, body: 'b', segment_id: null });
  assert.equal(await threads.reply('home', 'orig'), true);
  const [reply] = await ports.db.getCapturesByIds(['home']);
  assert.deepEqual([reply.lat, reply.lon], [40.0, -73.0], 'the reply keeps where it was written');
  assert.match(answeringLine({ place: 'Providence', t: new Date(2026, 9, 20).getTime(), walkLine: null }, Date.now()), /Providence/);
});
