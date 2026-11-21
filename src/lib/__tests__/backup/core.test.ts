import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import {
  BACK_UP,
  BACKING_UP,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  FAILED,
  FILE_LINE,
  lastLine,
  mediaEntry,
  META_FAMILY_KEYS,
  META_KEYS,
  missingLine,
  NEWER,
  NO_ROOM,
  NOT_A_BACKUP,
  hasRoom,
  pendingOmits,
  readBackup,
  STORES,
  YOUR_DATA,
  YOUR_DATA_NOTE,
  type BackupDoc,
} from '../../backup/core';
import { DERIVED_STORES, KEPT_STORES } from '../../db/stores';
import { MIGRATIONS } from '../../db/migrations';
import { META, META_FAMILIES } from '../../meta';
import { SPACE } from '../../space/core';

// The whole-app backup's format, its reader and its words (specs/back-up-everything, BK1-BK14; decisions 0241, 0248).

const root = join(__dirname, '..', '..', '..', '..');

/** Every table the native store holds after its migrations: created, less those renamed away. */
function sqliteTables(): string[] {
  const all = MIGRATIONS.join('\n');
  const made = [...all.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? (\w+)/g)].map((m) => m[1]);
  const renamed = new Set([...all.matchAll(/ALTER TABLE (\w+) RENAME TO/g)].map((m) => m[1]));
  return [...new Set(made.filter((t) => !renamed.has(t)))].sort();
}

/** Every object store the web store makes in its upgrades, less those it deletes again but makes anew. */
function webStores(): string[] {
  const src = readFileSync(join(root, 'src/lib/db/index.web.ts'), 'utf8');
  return [...new Set([...src.matchAll(/createObjectStore\('(\w+)'/g)].map((m) => m[1]))].sort();
}

test('BK3 every store, native and web, is classified as backed up or cache, and the known caches are cache', () => {
  const known = Object.keys(STORES).sort();
  const unknown = [...new Set([...sqliteTables(), ...webStores()])].filter((s) => !known.includes(s));
  assert.deepEqual(unknown, [], `classify these stores in src/lib/backup/core.ts (STORES): ${unknown.join(', ')}`);
  for (const s of DERIVED_STORES) assert.equal(STORES[s].kept, 'cache', `${s} is derived (db/stores.ts), never backed up`);
  for (const s of KEPT_STORES) assert.equal(STORES[s].kept, 'backup', `${s} is kept truth (db/stores.ts)`);
  for (const s of ['walk', 'trace_point', 'moment', 'capture', 'pause', 'still', 'reaction', 'thread', 'thread_member', 'moment_link', 'meta', 'media']) {
    assert.equal(STORES[s]?.kept, 'backup', `${s} is truth`);
  }
  for (const s of ['area', 'walk_area', 'walk_summary', 'visited_segment', 'walk_line', 'landing']) assert.equal(STORES[s]?.kept, 'cache', `${s} is recomputed`);
  for (const [name, c] of Object.entries(STORES)) assert.ok(c.why.length > 10, `${name} says why`);
});

test('BK3, back-up-everything audit 3: memo transcripts are the one cache carried in the file, and say why', () => {
  const carried = Object.entries(STORES).filter(([, c]) => c.kept === 'carried').map(([n]) => n);
  assert.deepEqual(carried, ['transcript']);
  assert.match(STORES.transcript.why, /recogni[sz]/);
});

test('BK3 every meta key and family is classified; the person\'s choices travel, this device\'s state stays', () => {
  assert.deepEqual(Object.keys(META).filter((k) => !(k in META_KEYS)), [], 'classify these META keys in backup/core.ts');
  assert.deepEqual(Object.keys(META_FAMILIES).filter((k) => !(k in META_FAMILY_KEYS)), [], 'classify these families');
  for (const k of ['units', 'notify_off', 'resurface_prefs', 'explore_hidden', 'map_layers', 'gallery_view', 'group_captures']) assert.equal(META_KEYS[k as keyof typeof META_KEYS], 'backup', k);
  for (const k of ['tile_build', 'nav', 'pending_delete', 'space_said', 'backup_last', 'outing_journey']) assert.equal(META_KEYS[k as keyof typeof META_KEYS], 'cache', k);
  for (const f of ['explored', 'places_spans', 'walk_pass', 'gaps_asked']) assert.equal(META_FAMILY_KEYS[f as keyof typeof META_FAMILY_KEYS], 'backup', f);
  assert.equal(META_FAMILY_KEYS.atlas_near, 'cache');
});

test('BK2, back-up-everything audit 9: a refusal of speech recognition travels as the refusal of notifications does', () => {
  assert.equal(META_KEYS.transcript_off, 'backup');
  assert.equal(META_KEYS.notify_off, 'backup');
});

test('BK2 a piece\'s file sits at media/<its ref>; a data: ref has none; an odd or absolute ref goes under media/legacy by piece', () => {
  assert.equal(mediaEntry('walks/w1/p1.jpg', 'p1'), 'media/walks/w1/p1.jpg');
  assert.equal(mediaEntry('data:image/jpeg;base64,AAAA', 'p1'), null);
  assert.equal(mediaEntry('file:///var/mobile/Documents/walks/w1/p1.JPG', 'p1'), 'media/legacy/p1.jpg');
  assert.equal(mediaEntry('../escape.jpg', 'p2'), 'media/legacy/p2.jpg');
  assert.equal(mediaEntry('/abs/x.m4a', 'p3'), 'media/legacy/p3.m4a');
});

const manifest = (version: number, more: object = {}) => ({
  format: BACKUP_FORMAT, version, app: { version: '0.1.0', platform: 'web' }, schema: { store: 'indexeddb', version: 23 },
  made_at: '2026-11-20T12:00:00.000Z', stores: ['walks.json'], media_missing: [], ...more,
});

test('BK4 a backup made by a newer Chronicles is refused in words, never half read', () => {
  const r = readBackup({ 'manifest.json': JSON.stringify(manifest(BACKUP_VERSION + 1)) });
  assert.deepEqual(r, { ok: false, words: NEWER });
  assert.equal(NEWER, 'This backup was made by a newer Chronicles. Update the app to restore it.');
});

test('BK4 a file that is not a Chronicles backup is refused in words', () => {
  assert.deepEqual(readBackup({}), { ok: false, words: NOT_A_BACKUP });
  assert.deepEqual(readBackup({ 'manifest.json': '{oops' }), { ok: false, words: NOT_A_BACKUP });
  assert.deepEqual(readBackup({ 'manifest.json': JSON.stringify({ ...manifest(1), format: 'chronicles-walk' }) }), { ok: false, words: NOT_A_BACKUP });
  assert.deepEqual(readBackup({ 'manifest.json': JSON.stringify(manifest(0.5)) }), { ok: false, words: NOT_A_BACKUP });
});

test('BK4 an older format is read through the chain of upgrade steps, one per version, in order, into today\'s rows', () => {
  const seen: number[] = [];
  const step = (from: number) => (doc: BackupDoc): BackupDoc => {
    seen.push(from);
    const walks = (doc.files['walks.json'] as { id: string; title?: string | null }[]).map((w) => ({ ...w, title: `${w.title ?? ''}${from}` }));
    return { manifest: { ...doc.manifest, version: from + 1 }, files: { ...doc.files, 'walks.json': walks } };
  };
  const w = { id: 'w1', started_at: 1, ended_at: 2, title: '', epilogue: null, open: false, area: null, snapped_build: null };
  const r = readBackup({ 'manifest.json': JSON.stringify(manifest(1)), 'walks.json': JSON.stringify([w]) }, { current: 3, steps: { 1: step(1), 2: step(2) } });
  assert.equal(r.ok, true);
  assert.deepEqual(seen, [1, 2]);
  assert.equal(r.ok && r.rows.walks[0].title, '12');
  assert.equal(r.ok && r.manifest.version, 3);
});

test('BK4 the frozen sample of each released format version reads into today\'s rows', () => {
  const file = join(__dirname, 'fixtures', 'backup-v1.zip');
  const bytes = readFileSync(file);
  // Frozen: never made again. A format change adds a version, an upgrade step and a sample; it never touches this one.
  assert.equal(createHash('sha256').update(bytes).digest('hex'), readFileSync(join(__dirname, 'fixtures', 'backup-v1.sha256'), 'utf8').trim());
  const zip = unzipSync(new Uint8Array(bytes));
  const entries = Object.fromEntries(Object.entries(zip).filter(([n]) => !n.startsWith('media/')).map(([n, b]) => [n, strFromU8(b)]));
  const r = readBackup(entries);
  assert.equal(r.ok, true, r.ok ? '' : r.words);
  if (!r.ok) return;
  assert.equal(r.manifest.version, 1);
  assert.deepEqual(r.rows.walks.map((w) => w.id), ['w1']);
  assert.ok(r.rows.traces.w1.length >= 3, 'the walk\'s trace');
  assert.ok(r.rows.moments.some((m) => m.walk_id === null), 'a loose moment');
  const photo = r.rows.moments.flatMap((m) => m.pieces).find((p) => p.kind === 'photo');
  assert.ok(photo?.edit, 'an edited photo keeps its edit');
  assert.ok(photo && !('thumb_path' in photo) && !('media' in photo), 'today\'s rows: no small copy, no zip entry name');
  assert.ok(zip[`media/${photo!.file_path}`], 'and its file is in the zip at its ref');
  assert.ok(r.rows.threads.threads.length && r.rows.reactions.length, 'a thread and a reaction');
});

test('BK7, back-up-everything audit 5: too little room for the media, or as much again, refuses; an unknown room goes on', () => {
  const need = 300 * 1024 * 1024;
  assert.equal(hasRoom(null, need), true);
  assert.equal(hasRoom(need, need), false);
  assert.equal(hasRoom(need + SPACE.veryLowBytes + 1, need), true);
  assert.equal(NO_ROOM, 'There isn\'t room on this phone to make the backup: it needs as much room again as your photos, videos and memos. Try again when the phone has more room.');
  assert.doesNotMatch(NO_ROOM, /\bfree\b|\bdelete\b/i, 'no nudge to free or delete (decision 0107)');
});

test('BK8, back-up-everything audit 1: the line claims only that a file was made, with its date', () => {
  assert.equal(lastLine(null, 2026), 'Not backed up yet');
  assert.equal(lastLine({ year: 2026, month: 10, day: 3 }, 2026), 'Last backup made October 3');
  assert.equal(lastLine({ year: 2025, month: 12, day: 31 }, 2026), 'Last backup made December 31, 2025');
  assert.doesNotMatch(lastLine({ year: 2026, month: 1, day: 9 }, 2026), /backed up/);
});

test('BK9, back-up-everything audit 8: the page says what the file is and who can see it, with no numeral but a date\'s', () => {
  assert.equal(FILE_LINE, 'One zip of every walk and moment you kept. Anyone with the file can see your walks, where they went, and your photos, videos and memos.');
  assert.equal(YOUR_DATA, 'Your data');
  assert.equal(YOUR_DATA_NOTE, 'Back up every walk and moment');
  assert.equal(BACK_UP, 'Back up everything');
  assert.equal(BACKING_UP, 'Backing up…');
  for (const w of [FILE_LINE, YOUR_DATA, YOUR_DATA_NOTE, BACK_UP, BACKING_UP, FAILED, NO_ROOM, lastLine(null, 2026), missingLine(['photo', 'voice', 'voice', 'video']) ?? '']) {
    assert.doesNotMatch(w, /\d/, `no numeral: ${w}`);
  }
  assert.match(lastLine({ year: 2025, month: 3, day: 4 }, 2026), /^Last backup made March 4, 2025$/, 'a date\'s day and year are the only numerals');
  assert.doesNotMatch(FILE_LINE, /%|MB|GB|size|done|great|success/i, 'no size, gauge or celebration');
});

test('BK6, back-up-everything audit 7: files that are gone are named by kind, in words', () => {
  assert.equal(missingLine([]), null);
  assert.equal(missingLine(['photo']), 'A photo could not be found and was left out.');
  assert.equal(missingLine(['photo', 'photo']), 'Two photos could not be found and were left out.');
  assert.equal(missingLine(['voice', 'photo', 'voice']), 'A photo and two memos could not be found and were left out.');
  assert.equal(missingLine(['video', 'voice', 'photo']), 'A photo, a video and a memo could not be found and were left out.');
  assert.doesNotMatch(missingLine(['photo', 'video', 'voice', 'voice'])!, /\bfiles?\b/);
});

test('BK11, back-up-everything audit 6: a failure says so and that no file was kept', () => {
  assert.equal(FAILED, 'The backup could not be made, and no file was kept. Try again.');
});

test('BK14, back-up-everything audit 2: a delete waiting for Undo names what the file leaves out', () => {
  const o = pendingOmits([
    { kind: 'walk', ids: ['w2'], spec: { type: 'walk', walkId: 'w2' } },
    { kind: 'moment', ids: ['m1'], spec: { type: 'moment', captureId: 'm1' } },
    { kind: 'media', ids: ['m2', 'm3'], spec: { type: 'media', walkId: 'w1', captureIds: ['m2', 'm3'] } },
    { kind: 'piece', ids: ['p9'], spec: { type: 'piece', momentId: 'm4', pieceId: 'p9' } },
    { kind: 'thread', ids: ['t1'], spec: { type: 'thread', threadId: 't1' } },
    { kind: 'thread', ids: ['t2/m5'], spec: { type: 'remove', threadId: 't2', momentId: 'm5' } },
    { kind: 'moment', ids: ['s1'], spec: { type: 'join', fromId: 's1', intoId: 's0' } },
  ] as never);
  assert.deepEqual([...o.walks], ['w2']);
  assert.deepEqual([...o.moments].sort(), ['m1', 'm2', 'm3']);
  assert.deepEqual([...o.pieces], ['p9']);
  assert.deepEqual([...o.threads], ['t1']);
  assert.deepEqual([...o.members], ['t2/m5']);
  assert.deepEqual([...o.keepFinds].sort(), ['m2', 'm3'], 'a media delete keeps its finds, as the delete does');
});

// The diff review (Nov 21): the steward's S12, S15 (back-up-everything audit 20, 22).

test('BK11, back-up-everything audit 20: the failure lines, the share sheet missing and a file too large among them, are words with no numeral', async () => {
  const { NO_SHARING, TOO_LARGE } = await import('../../backup/core');
  assert.equal(NO_SHARING, 'This phone has no way to share the file, so the backup was not made.');
  assert.equal(TOO_LARGE, 'This backup would be too large for one file, so it was not made.');
  for (const w of [FAILED, NO_ROOM, NO_SHARING, TOO_LARGE]) {
    assert.doesNotMatch(w, /\d/, `no numeral: ${w}`);
    assert.doesNotMatch(w, /\bfree\b|\bdelete\b/i, `no nudge to free or delete: ${w}`);
  }
});

test('BK8, back-up-everything audit 22: nothing outside the page reads when the last backup was made, and nothing notifies about backing up', () => {
  const src = join(root, 'src');
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) {
        if (f !== '__tests__') walk(p);
      } else if (/\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk(src);
  const readers = files.filter((f) => readFileSync(f, 'utf8').includes('backup_last')).map((f) => f.slice(src.length + 1)).sort();
  assert.deepEqual(readers, ['lib/backup/core.ts', 'lib/backup/shell.ts', 'lib/meta.ts']);
  const notify = files.filter((f) => /lib\/notify\/|notif/i.test(f));
  assert.ok(notify.length > 3, 'the notifier\'s sources are found');
  for (const f of notify) assert.doesNotMatch(readFileSync(f, 'utf8'), /back ?up|backed/i, `${f} names backing up`);
});

test('back-up-everything audit 18: Back names the screen beneath, spoken on Android by the page\'s own Back, a title on iOS and the web', async () => {
  const { yourDataBack } = await import('../../backup/core');
  const { intoHeader } = await import('../../explore/intoPage');
  assert.deepEqual(yourDataBack('ready'), { title: 'Navigate', spoken: 'Navigate, back' });
  assert.deepEqual(yourDataBack('chronicle'), { title: 'Chronicle', spoken: 'Chronicle, back' });
  assert.equal(yourDataBack(undefined), null);
  assert.deepEqual(intoHeader(yourDataBack('ready'), true, 'android'), { backSpoken: 'Navigate, back' });
  assert.deepEqual(intoHeader(yourDataBack('chronicle'), true, 'ios'), { headerBackTitle: 'Chronicle', headerBackButtonDisplayMode: 'default' });
  assert.deepEqual(intoHeader(yourDataBack('ready'), false, 'web'), { headerBackTitle: 'Navigate', headerBackButtonDisplayMode: 'minimal' });
  for (const h of [intoHeader(yourDataBack('ready'), true, 'ios'), intoHeader(yourDataBack('chronicle'), true, 'web')]) assert.notEqual(h.headerBackTitle, 'Back', 'never the word Back alone (HIG)');
});
