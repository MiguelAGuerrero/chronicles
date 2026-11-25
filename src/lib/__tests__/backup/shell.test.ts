import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { closeSync, ftruncateSync, mkdtempSync, openSync, readFileSync, rmSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, strToU8, unzipSync, Zip, ZipPassThrough } from 'fflate';
import { BACKUP_FORMAT, BACKUP_VERSION, FAILED, NO_ROOM, readBackup, TOO_LARGE, type BackupRows } from '../../backup/core';
import { createBackupWriter, type BackupIO } from '../../backup/shell';
import { zipEntries, zipEntryChunks, type ReadAt } from '../../backup/zip';
import type { Db } from '../../db/types';
import type { Mark, Offered } from '../../discovery/types';
import type { Capture, Moment, Walk } from '../../types';
import { fakeClock, memoryDb } from '../fakes';

// The whole-app backup's writer over a fake store (specs/back-up-everything, BK2, BK5-BK8, BK11, BK12, BK14; specs/backup-zip64,
// BZ1-BZ3, BZ5).

const NOW = Date.UTC(2026, 10, 20, 15, 0, 0);
const LON = -71.4, LAT = 41.812;
const walk = (id: string, started_at: number): Walk => ({ id, started_at, ended_at: started_at + 3_600_000, title: `Walk ${id}`, epilogue: 'the lows stay in', open: false, area: 'Fox Point', snapped_build: 'b1' });
const piece = (id: string, moment_id: string, t: number, more: Partial<Capture> = {}): Capture => ({ id, moment_id, t, kind: 'text', file_path: null, body: 'a note', ...more });
const moment = (id: string, walk_id: string | null, t: number, pieces: Capture[]): Moment => ({ id, walk_id, t, lat: LAT, lon: LON, segment_id: null, pieces });
const mark = (id: string, walk_id: string | null): Mark => ({ id, walk_id, key: `k-${id}`, name: id, category: 'art', at: [LON, LAT], generic: false, origin: 'scan', state: 'open', created_at: 5, resolved_at: null, capture_id: null });
const offered: Offered = { key: 'k-o', name: 'Old mill', category: 'art', at: [LON, LAT], generic: false, offered_at: 3, origin: 'scan' };

const W1 = Date.UTC(2026, 9, 3, 14);
const EDIT = { v: 1, rotate: 90, crop: null, filter: 'vivid', strokes: [], trim: null };

/** A library holding every truth store (BK5): a walk with its trace, pauses, stills and a gap, an edited photo, a memo and its words, a note, a loose moment, a thread with a reply, a reaction, a reminder, a find, a checklist, the retired scan's marks and offers, and the preferences. */
async function seeded(): Promise<Db> {
  const db = memoryDb({ marks: [mark('mk1', 'w1'), mark('mk0', null)], offered: [offered] });
  await db.createWalk(walk('w1', W1));
  await db.createWalk(walk('w2', W1 + 86_400_000));
  // Out of time order on purpose: the store's order is what comes back.
  await db.appendPoints([30, 10, 20].map((s) => ({ walk_id: 'w1', t: W1 + s * 1000, lat: LAT, lon: LON + s / 1e5, accuracy_m: 5, speed: 1, course: null })));
  await db.appendPoints([{ walk_id: 'w2', t: W1 + 86_400_000 + 1000, lat: LAT, lon: LON, accuracy_m: 5, speed: 1, course: null }]);
  await db.startPause('w1', W1 + 40_000);
  await db.endPause('w1', W1 + 50_000);
  await db.startStill('w1', W1 + 60_000);
  await db.endStill('w1', W1 + 70_000);
  await db.putGapDecision({ walk_id: 'w1', t0: W1 + 80_000, t1: W1 + 90_000, state: 'kept', path: [[LON, LAT], [LON + 0.001, LAT]], length_m: 80, street: null, decided_at: W1 + 95_000 });
  await db.addMoment(moment('photo', 'w1', W1 + 100_000, [piece('photo', 'photo', W1 + 100_000, { kind: 'photo', file_path: 'walks/w1/photo.jpg', body: null, thumb_path: 'walks/w1/photo.thumb.jpg', edit: EDIT as never, caption: 'the door' })]));
  await db.addMoment(moment('memo', 'w1', W1 + 200_000, [piece('memo', 'memo', W1 + 200_000, { kind: 'voice', file_path: 'walks/w1/memo.m4a', body: '12000' })]));
  await db.addMoment(moment('note', 'w1', W1 + 300_000, [piece('note', 'note', W1 + 300_000)]));
  await db.addMoment(moment('w2m', 'w2', W1 + 86_400_000 + 2000, [piece('w2m', 'w2m', W1 + 86_400_000 + 2000, { kind: 'photo', file_path: 'walks/w2/w2m.jpg', body: null })]));
  await db.addMoment(moment('loose', null, W1 + 400_000, [piece('loose', 'loose', W1 + 400_000, { kind: 'photo', file_path: 'walks/moments/loose.jpg', body: null })]));
  await db.applyThreads({ putThreads: [{ id: 't1', name: 'Doors', created_at: 1 }], putMembers: [{ thread_id: 't1', moment_id: 'photo', added_at: 2 }, { thread_id: 't1', moment_id: 'loose', added_at: 3 }], putLinks: [{ from_id: 'note', to_id: 'photo', created_at: 4 }] });
  await db.setReaction({ moment_id: 'photo', family: 'feeling', reaction: 'calm', set_at: 5 });
  await db.setRecall({ capture_id: 'photo', frequency: 'once', until: null, last_fired_at: null, fired_count: 0, last_walk_id: null });
  await db.addFind({ key: 'f1', area_key: null, walk_id: 'w1', capture_id: 'photo', found_at: 6, name: 'Mural', category: 'art', kind: 'public_art', at: [LON, LAT], generic: false } as never);
  await db.saveChecklists({ areas: [{ key: 'a1', level: 'neighborhood', name: 'Fox Point', at: [LON, LAT], build: 'b1', built_at: 1, count: 1, archive: null } as never], items: [{ key: 'i1', area_key: 'a1', name: 'Mural', category: 'art', kind: 'public_art', at: [LON, LAT], generic: false } as never], read: { key: 'r1', centre: [LON, LAT], build: 'b1', read_at: 1, candidates: [] } as never });
  await db.setTranscript({ capture_id: 'memo', text: 'the bells', lang: 'en', from_ms: null, to_ms: null, made_at: 7 });
  await db.setMeta('units', 'mi');
  await db.setMeta('transcript_off', '1');
  await db.setMeta('tile_build', 'b1');
  await db.setMeta('nav', '{"walk_id":null}');
  await db.setMeta('walk_pass:w1', '30');
  await db.setMeta('atlas_near:town', '{}');
  return db;
}

const FILES: Record<string, Uint8Array> = {
  'walks/w1/photo.jpg': new Uint8Array([1, 2, 3, 4, 5, 6, 7]),
  'walks/w1/memo.m4a': new Uint8Array([9, 8, 7]),
  'walks/w2/w2m.jpg': new Uint8Array([4, 4]),
  'walks/moments/loose.jpg': new Uint8Array([5]),
};

type MemIO = BackupIO & { bytes(): Uint8Array; name: string | null; delivered: number; discarded: number; reads: string[] };

/** A backup's target in memory: media in chunks of two bytes, so a file arrives in several. */
function memoryIO(files: Record<string, Uint8Array> = FILES, more: Partial<BackupIO> = {}): MemIO {
  let chunks: Uint8Array[] = [];
  const io: MemIO = {
    app: { version: '0.1.0', platform: 'web' },
    schema: { store: 'indexeddb', version: 23 },
    name: null,
    delivered: 0,
    discarded: 0,
    reads: [],
    async readMedia(ref) {
      io.reads.push(ref);
      const f = files[ref];
      if (!f) return null;
      return (async function* () {
        for (let i = 0; i < f.length; i += 2) yield f.subarray(i, i + 2);
      })();
    },
    open(name) {
      io.name = name;
      chunks = [];
    },
    write: (c) => {
      chunks.push(c.slice());
    },
    async deliver() {
      io.delivered++;
    },
    discard() {
      io.discarded++;
      chunks = [];
    },
    bytes() {
      const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
      let o = 0;
      for (const c of chunks) {
        out.set(c, o);
        o += c.length;
      }
      return out;
    },
    ...more,
  };
  return io;
}

const unzip = (io: MemIO) => unzipSync(io.bytes());
const json = (zip: Record<string, Uint8Array>, name: string) => JSON.parse(strFromU8(zip[name]));
const textEntries = (zip: Record<string, Uint8Array>) => Object.fromEntries(Object.entries(zip).filter(([n]) => !n.startsWith('media/')).map(([n, b]) => [n, strFromU8(b)]));

test('BK2 one zip: the manifest, one JSON per truth store, the trace one file per walk, the preferences and per-walk meta, every file at its ref', async () => {
  const db = await seeded();
  const io = memoryIO();
  await createBackupWriter({ db, clock: fakeClock(NOW) }).writeBackup(io);
  const zip = unzip(io);
  assert.equal(io.name, 'chronicles-backup-2026-11-20.zip');
  const m = json(zip, 'manifest.json');
  assert.equal(m.format, BACKUP_FORMAT);
  assert.equal(m.version, BACKUP_VERSION);
  assert.deepEqual(m.app, { version: '0.1.0', platform: 'web' });
  assert.deepEqual(m.schema, { store: 'indexeddb', version: 23 });
  assert.equal(m.made_at, '2026-11-20T15:00:00.000Z');
  for (const f of ['walks.json', 'moments.json', 'pauses.json', 'stills.json', 'gap_fills.json', 'reactions.json', 'threads.json', 'recalls.json', 'finds.json', 'checklist_areas.json', 'checklist_items.json', 'marks.json', 'offered.json', 'transcripts.json', 'meta.json']) {
    assert.ok(zip[f], `${f} is in the file`);
    assert.ok(m.stores.includes(f), `the manifest names ${f}`);
  }
  assert.deepEqual(Object.keys(zip).filter((n) => n.startsWith('trace/')).sort(), ['trace/w1.json', 'trace/w2.json']);
  assert.deepEqual(Object.keys(zip).filter((n) => n.startsWith('media/')).sort(), ['media/walks/moments/loose.jpg', 'media/walks/w1/memo.m4a', 'media/walks/w1/photo.jpg', 'media/walks/w2/w2m.jpg']);
  const meta = json(zip, 'meta.json');
  assert.deepEqual(meta.keys, { units: 'mi', transcript_off: '1' }, 'the person\'s choices; never the tile build or what is open now');
  assert.deepEqual(meta.walks, { 'walk_pass:w1': '30' });
  assert.deepEqual(json(zip, 'offered.json'), [offered]);
  assert.deepEqual(json(zip, 'marks.json').map((x: Mark) => x.id).sort(), ['mk0', 'mk1']);
});

test('BK3 no cache in the file: no summary, area, walk line, landing, tile or small copy', async () => {
  const db = await seeded();
  const io = memoryIO();
  await createBackupWriter({ db, clock: fakeClock(NOW) }).writeBackup(io);
  const zip = unzip(io);
  assert.deepEqual(Object.keys(zip).filter((n) => /summar|visited|area\.json|walk_line|landing|tile|segment|place\.json|thumb/.test(n)), []);
  assert.doesNotMatch(strFromU8(zip['moments.json']), /thumb/);
});

test('BK5 round trip: the seeded library, backed up and read by the core, gives back the same rows, ids and trace order', async () => {
  const db = await seeded();
  const io = memoryIO();
  await createBackupWriter({ db, clock: fakeClock(NOW) }).writeBackup(io);
  const r = readBackup(textEntries(unzip(io)));
  assert.equal(r.ok, true);
  const rows = (r as { rows: BackupRows }).rows;
  const noThumb = (ms: Moment[]) => ms.map((x) => ({ ...x, pieces: x.pieces.map(({ thumb_path: _t, ...p }) => p) }));
  assert.deepEqual(rows.walks, await db.listWalks());
  assert.deepEqual(rows.traces.w1, await db.getPoints('w1'));
  assert.deepEqual(rows.traces.w1.map((p) => p.t), (await db.getPoints('w1')).map((p) => p.t), 'the trace in the store\'s order');
  const all = [...(await db.getMoments('w1')), ...(await db.getMoments('w2')), ...(await db.looseMoments())];
  assert.deepEqual([...rows.moments].sort((a, b) => a.id.localeCompare(b.id)), noThumb(all).sort((a, b) => a.id.localeCompare(b.id)));
  assert.deepEqual(rows.moments.find((x) => x.id === 'photo')!.pieces[0].edit, EDIT, 'the edited photo keeps its edit');
  assert.deepEqual(rows.pauses, await db.getPauses('w1'));
  assert.deepEqual(rows.stills, await db.getStills('w1'));
  assert.deepEqual(rows.gap_fills, await db.getGapDecisions('w1'));
  assert.deepEqual(rows.threads, await db.listThreads());
  assert.deepEqual(rows.reactions, await db.listReactions());
  assert.deepEqual(rows.recalls, await db.listRecalls());
  assert.deepEqual(rows.finds, await db.listFinds());
  assert.deepEqual(rows.checklist_areas, await db.listChecklistAreas());
  assert.deepEqual(rows.checklist_items.map((i) => i.key), ['i1']);
  assert.deepEqual(rows.transcripts, await db.listTranscripts());
  assert.deepEqual(rows.offered, [offered]);
  assert.deepEqual(rows.meta, { keys: { units: 'mi', transcript_off: '1' }, walks: { 'walk_pass:w1': '30' } });
});

test('BK6 media go through in chunks, whole and in order; a file that is gone is left out, marked in its piece and said in words', async () => {
  const db = await seeded();
  const { ['walks/w1/memo.m4a']: _memo, ['walks/w2/w2m.jpg']: _w2, ...some } = FILES;
  const io = memoryIO(some);
  const w = createBackupWriter({ db, clock: fakeClock(NOW) });
  const r = await w.writeBackup(io);
  const zip = unzip(io);
  assert.deepEqual([...zip['media/walks/w1/photo.jpg']], [1, 2, 3, 4, 5, 6, 7], 'a file of four chunks, joined in order');
  assert.equal(zip['media/walks/w1/memo.m4a'], undefined);
  const pieces = json(zip, 'moments.json').flatMap((m: Moment) => m.pieces);
  const byId = Object.fromEntries(pieces.map((p: { id: string }) => [p.id, p]));
  assert.equal(byId.memo.media_missing, true);
  assert.equal(byId.memo.media, null);
  assert.equal(byId.photo.media, 'media/walks/w1/photo.jpg');
  assert.deepEqual(json(zip, 'manifest.json').media_missing.sort(), ['memo', 'w2m']);
  assert.deepEqual([...r.missing].sort(), ['photo', 'voice']);
  await w.backUp(memoryIO(some));
  assert.equal(w.store.get().after, 'A photo and a memo could not be found and were left out.');
});

test('BK7, back-up-everything audit 5: too little room for the media: it says so and writes nothing', async () => {
  const db = await seeded();
  let asked: string[] = [];
  const io = memoryIO(FILES, { room: async (refs) => ((asked = refs), { free: 50, need: 1000 }) });
  const w = createBackupWriter({ db, clock: fakeClock(NOW) });
  await w.backUp(io);
  assert.equal(io.name, null, 'no file opened');
  assert.equal(io.delivered, 0);
  assert.equal(w.store.get().failed, NO_ROOM);
  assert.equal(await db.getMeta('backup_last'), null);
  assert.deepEqual(asked.sort(), Object.keys(FILES).sort(), 'the room is asked for every file the backup would hold');
});

test('BK8, back-up-everything audit 1: the date is kept only once the file is handed over, and read back for the line', async () => {
  const db = await seeded();
  let atDeliver: string | null = 'unset';
  const io = memoryIO(FILES, { deliver: async () => { atDeliver = await db.getMeta('backup_last'); } });
  const w = createBackupWriter({ db, clock: fakeClock(NOW) });
  await w.load();
  assert.equal(w.store.get().last, null);
  await w.backUp(io);
  assert.equal(atDeliver, null, 'not yet set while the sheet is up');
  assert.equal(await db.getMeta('backup_last'), String(NOW));
  assert.equal(w.store.get().last, NOW);
  const again = createBackupWriter({ db, clock: fakeClock(NOW + 1) });
  await again.load();
  assert.equal(again.store.get().last, NOW);
});

test('BK11, back-up-everything audit 6: a backup that fails part way says so, keeps no file and leaves the date as it was', async () => {
  const db = await seeded();
  await db.setMeta('backup_last', '1000');
  const io = memoryIO(FILES, { readMedia: async () => { throw new Error('disk gone'); } });
  const w = createBackupWriter({ db, clock: fakeClock(NOW) });
  await w.load();
  // A media read that throws is a missing file, not a failure (as the walk bundle does): fail the write instead.
  const failing = memoryIO(FILES, { write: () => { throw new Error('disk full'); } });
  await w.backUp(failing);
  assert.equal(failing.discarded, 1, 'the half-made file is dropped');
  assert.equal(failing.delivered, 0);
  assert.equal(w.store.get().failed, FAILED);
  assert.equal(w.store.get().making, false);
  assert.equal(await db.getMeta('backup_last'), '1000');
  assert.equal(w.store.get().last, 1000);
  await w.backUp(io);
  assert.equal(w.store.get().failed, null, 'the next try clears the line');
});

test('BK12 while a backup is made a second tap makes no second file', async () => {
  const db = await seeded();
  let release: () => void = () => {};
  let handed = 0;
  const io = memoryIO(FILES, { deliver: () => new Promise<void>((r) => { handed++; release = r; }) });
  const w = createBackupWriter({ db, clock: fakeClock(NOW) });
  const first = w.backUp(io);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(w.store.get().making, true);
  const opened = io.name;
  await w.backUp(io);
  assert.equal(io.name, opened);
  release();
  await first;
  assert.equal(handed, 1, 'one file handed over');
  assert.equal(w.store.get().making, false);
});

test('BK14, back-up-everything audit 2: a delete waiting for Undo is not in the file, nor what hangs on it', async () => {
  const db = await seeded();
  await db.setMeta('pending_delete', JSON.stringify([
    { kind: 'walk', ids: ['w2'], spec: { type: 'walk', walkId: 'w2' } },
    { kind: 'moment', ids: ['photo'], spec: { type: 'moment', captureId: 'photo' } },
  ]));
  const io = memoryIO();
  await createBackupWriter({ db, clock: fakeClock(NOW) }).writeBackup(io);
  const zip = unzip(io);
  assert.deepEqual(json(zip, 'walks.json').map((x: Walk) => x.id), ['w1']);
  assert.equal(zip['trace/w2.json'], undefined);
  assert.deepEqual(json(zip, 'moments.json').map((x: Moment) => x.id).sort(), ['loose', 'memo', 'note']);
  assert.equal(zip['media/walks/w1/photo.jpg'], undefined);
  assert.equal(zip['media/walks/w2/w2m.jpg'], undefined);
  assert.deepEqual(json(zip, 'reactions.json'), []);
  assert.deepEqual(json(zip, 'recalls.json'), []);
  assert.deepEqual(json(zip, 'finds.json'), []);
  const th = json(zip, 'threads.json');
  assert.deepEqual(th, { threads: [], members: [], links: [] }, 'a thread left with one moment is dissolved, as the delete would (OT15)');
  assert.ok(!io.reads.includes('walks/w1/photo.jpg'), 'its file is never read');
});

// The diff review (Nov 21): the auditor's A1-A3 (back-up-everything audit 12-16).

// G14's build (specs/backup-zip64, decisions 0256, 0266): audit 12 and 13's tests, which held the refusal, now hold the
// backup written and read back whole past each limit. The media of a big backup are one shared zero buffer pushed
// again and again, and the test's io keeps such a chunk as a run, never a copy: nothing holds 4 GiB, and the file is
// written to disk sparse (only its real bytes), read by a system archive tool, then removed.

const MiB = 2 ** 20;
const GiB = 2 ** 30;
const ZERO = new Uint8Array(64 * MiB);

/** `n` bytes as the shared zero buffer, chunk after chunk. */
function zeros(n: number): AsyncIterable<Uint8Array> {
  return (async function* () {
    for (let at = 0; at < n; at += ZERO.length) yield ZERO.subarray(0, Math.min(ZERO.length, n - at));
  })();
}

type Run = { at: number; bytes?: Uint8Array; zeros?: number };
type RunIO = BackupIO & { name: string | null; delivered: number; discarded: number; size(): number; read: ReadAt; save(path: string): void };

/** A backup's target that keeps runs of the zero buffer as runs: `read` serves any span, `save` writes it sparse. */
function runIO(platform: string, media: (ref: string) => AsyncIterable<Uint8Array> | null, more: Partial<BackupIO> = {}): RunIO {
  let runs: Run[] = [];
  let size = 0;
  const io: RunIO = {
    app: { version: '0.1.0', platform },
    schema: { store: platform === 'web' ? 'indexeddb' : 'sqlite', version: 31 },
    name: null,
    delivered: 0,
    discarded: 0,
    async readMedia(ref) {
      return media(ref);
    },
    open(name) {
      io.name = name;
      runs = [];
      size = 0;
    },
    write(c) {
      runs.push(c.buffer === ZERO.buffer ? { at: size, zeros: c.length } : { at: size, bytes: c.slice() });
      size += c.length;
    },
    async deliver() {
      io.delivered++;
    },
    discard() {
      io.discarded++;
      runs = [];
      size = 0;
    },
    size: () => size,
    read(o, l) {
      const out = new Uint8Array(l);
      let lo = 0;
      let hi = runs.length - 1;
      while (lo < hi) {
        const m = (lo + hi + 1) >> 1;
        if (runs[m].at <= o) lo = m;
        else hi = m - 1;
      }
      for (let i = lo, w = 0; w < l && i < runs.length; i++) {
        const r = runs[i];
        const len = r.bytes ? r.bytes.length : r.zeros!;
        const from = o + w - r.at;
        const n = Math.min(len - from, l - w);
        if (n <= 0) continue;
        if (r.bytes) out.set(r.bytes.subarray(from, from + n), w);
        w += n;
      }
      return out;
    },
    save(path) {
      const fd = openSync(path, 'w');
      try {
        for (const r of runs) if (r.bytes) writeSync(fd, r.bytes, 0, r.bytes.length, r.at);
        ftruncateSync(fd, size);
      } finally {
        closeSync(fd);
      }
    },
    ...more,
  };
  return io;
}

/**
 * The store with `n` more loose moments after everything seeded, each with a photo of its own bytes, as the store reads
 * them back. Served beside the fake rather than added to it: the fake's `addMoment` checks each piece against every
 * moment, so 70,000 adds would take most of an hour.
 */
const MANY = (i: number) => `walks/many/${i}.jpg`;
function withPhotos(db: Db, n: number): Db {
  const many = Array.from({ length: n }, (_, i) => moment(`many-${i}`, null, W1 + 1_000_000 + i, [piece(`many-${i}`, `many-${i}`, W1 + 1_000_000 + i, { kind: 'photo', file_path: MANY(i), body: null })]));
  return { ...db, momentsBetween: async (from, to) => [...(await db.momentsBetween(from, to)), ...many.filter((m) => m.t >= from && m.t < to)] };
}
const photoOf = (ref: string) => {
  const m = /^walks\/many\/(\d+)\.jpg$/.exec(ref);
  return m ? strToU8(`photo ${m[1]}`) : FILES[ref] ?? null;
};
async function* once(b: Uint8Array) {
  yield b;
}

/** Every entry by our reader, whole (its CRC checked); the JSON as text, the media's bytes kept unless they are big. */
async function readBack(read: ReadAt, size: number) {
  const entries = await zipEntries(read, size);
  const text: Record<string, string> = {};
  const media: Record<string, Uint8Array> = {};
  const sizes: Record<string, number> = {};
  for (const e of entries) {
    const parts: Uint8Array[] = [];
    let n = 0;
    for await (const c of zipEntryChunks(read, e, 64 * MiB)) {
      n += c.length;
      if (e.size < 64 * MiB) parts.push(c.slice());
    }
    sizes[e.name] = n;
    const b = Buffer.concat(parts);
    if (e.name.startsWith('media/')) media[e.name] = b;
    else text[e.name] = strFromU8(b);
  }
  return { entries, text, media, sizes };
}

/** The file on disk, sparse, in a temporary folder removed after `f`. */
function onDisk<T>(io: RunIO, f: (path: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'chronicles-zip64-'));
  try {
    const path = join(dir, 'chronicles-backup.zip');
    io.save(path);
    return f(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Python's zipfile: every entry's CRC read through (`testzip`), the names and sizes. */
function python(path: string): { names: string[]; bad: string | null; sizes: Record<string, number> } {
  const script = 'import json,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1])\nprint(json.dumps({"bad":z.testzip(),"names":z.namelist(),"sizes":{i.filename:i.file_size for i in z.infolist() if i.file_size>2**30}}))';
  return JSON.parse(execFileSync('python3', ['-I', '-c', script, path], { encoding: 'utf8', maxBuffer: 256 * MiB }));
}

test('BZ1, back-up-everything audit 12, backup-zip64 audit 2: a library of more than 65,535 files is one zip, read back whole by our reader, unzip -t and fflate\'s reader', async () => {
  const db = withPhotos(await seeded(), 70_000);
  // The web's own io (decision 0266): many small files are no larger in memory than few.
  const io = runIO('web', (ref) => {
    const b = photoOf(ref);
    return b ? once(b) : null;
  });
  const w = createBackupWriter({ db, clock: fakeClock(NOW) });
  await w.backUp(io);
  assert.equal(w.store.get().failed, null, 'made, not refused');
  assert.equal(io.delivered, 1);
  assert.equal(await db.getMeta('backup_last'), String(NOW), 'and its date kept');
  const back = await readBack(io.read, io.size());
  // 70,000 photos, the seeded library's 4 files and 2 traces, 15 JSON stores and the manifest.
  assert.equal(back.entries.length, 70_000 + 4 + 2 + 16, 'every entry by our reader');
  for (let i = 0; i < 70_000; i++) assert.equal(strFromU8(back.media[`media/${MANY(i)}`]), `photo ${i}`);
  for (const [ref, b] of Object.entries(FILES)) assert.deepEqual([...back.media[`media/${ref}`]], [...b]);
  const r = readBackup(back.text);
  assert.equal(r.ok && r.rows.moments.length, 70_005, 'the rows read back whole');
  onDisk(io, (path) => {
    assert.match(execFileSync('unzip', ['-tq', path], { encoding: 'utf8' }), /No errors detected/, 'UnZip 6.00 tests every entry');
    const names = execFileSync('unzip', ['-Z1', path], { encoding: 'utf8', maxBuffer: 64 * MiB }).trim().split('\n');
    assert.deepEqual(names, back.entries.map((e) => e.name), 'UnZip lists every entry');
    assert.equal(Object.keys(unzipSync(new Uint8Array(readFileSync(path)))).length, back.entries.length, 'fflate\'s reader, which stopped at 4,464, reads every entry');
  });
});

test('BZ2, back-up-everything audit 13, backup-zip64 audit 6: a backup holding one file past 4 GiB, past both limits, and one past 4 GiB in total, is one zip read back whole', async () => {
  const big = 4 * GiB + MiB;
  // One file past 4 GiB, then 70,000 photos past it: past both limits at once, on a phone's io.
  const base = await seeded();
  await base.addMoment(moment('long', 'w1', W1 + 50_000, [piece('long', 'long', W1 + 50_000, { kind: 'video', file_path: 'walks/w1/long.mov', body: null })]));
  const db = withPhotos(base, 70_000);
  const io = runIO('ios', (ref) => (ref === 'walks/w1/long.mov' ? zeros(big) : (b => (b ? once(b) : null))(photoOf(ref))));
  const w = createBackupWriter({ db, clock: fakeClock(NOW) });
  await w.backUp(io);
  assert.equal(w.store.get().failed, null);
  assert.equal(io.delivered, 1);
  assert.ok(io.size() > 4 * GiB);
  const back = await readBack(io.read, io.size());
  assert.equal(back.entries.length, 1 + 70_000 + 4 + 2 + 16);
  assert.equal(back.sizes['media/walks/w1/long.mov'], big, 'the long video whole, its CRC checked');
  // Its data descriptor takes eight-byte sizes (APPNOTE 4.3.9.2), and the next entry begins right after it.
  const i = back.entries.findIndex((e) => e.name === 'media/walks/w1/long.mov');
  const end = back.entries[i].offset + 30 + 'media/walks/w1/long.mov'.length + big;
  const d = Buffer.from(await io.read(end, 24));
  assert.equal(d.readUInt32LE(0), 0x08074b50, 'a data descriptor follows the video');
  assert.deepEqual([d.readBigUInt64LE(8), d.readBigUInt64LE(16)], [BigInt(big), BigInt(big)], 'with its sizes in eight bytes each');
  assert.equal(back.entries[i + 1].offset, end + 24, 'and nothing else between it and the next entry');
  const after = back.entries.find((e) => e.name === `media/${MANY(69_999)}`)!;
  assert.ok(after.offset > 2 ** 32, 'what follows it sits past 4 GiB');
  assert.equal(strFromU8(back.media[`media/${MANY(69_999)}`]), 'photo 69999');
  const r = readBackup(back.text);
  assert.equal(r.ok && r.rows.moments.length, 70_006);
  onDisk(io, (path) => {
    const py = python(path);
    assert.equal(py.bad, null, 'Python\'s zipfile reads every entry whole');
    assert.deepEqual(py.names, back.entries.map((e) => e.name));
    assert.deepEqual(py.sizes, { 'media/walks/w1/long.mov': big });
  });
  // Past 4 GiB in total, no file past it: two videos of 2 GiB and a MiB.
  const db2 = await seeded();
  const half = 2 * GiB + MiB;
  for (const id of ['one', 'two']) await db2.addMoment(moment(id, 'w1', W1 + (id === 'one' ? 50_000 : 60_000), [piece(id, id, W1 + (id === 'one' ? 50_000 : 60_000), { kind: 'video', file_path: `walks/w1/${id}.mov`, body: null })]));
  const io2 = runIO('android', (ref) => (/\/(one|two)\.mov$/.test(ref) ? zeros(half) : (b => (b ? once(b) : null))(photoOf(ref))));
  const w2 = createBackupWriter({ db: db2, clock: fakeClock(NOW) });
  await w2.backUp(io2);
  assert.equal(w2.store.get().failed, null);
  assert.ok(io2.size() > 4 * GiB);
  const back2 = await readBack(io2.read, io2.size());
  assert.equal(back2.sizes['media/walks/w1/one.mov'], half);
  assert.equal(back2.sizes['media/walks/w1/two.mov'], half);
  assert.equal(readBackup(back2.text).ok, true);
  onDisk(io2, (path) => {
    const py = python(path);
    assert.equal(py.bad, null);
    assert.deepEqual(py.names, back2.entries.map((e) => e.name));
  });
});

test('BZ5, backup-zip64 audit 1: past 4 GiB the web refuses in words and keeps no file; a phone whose write fails says so and keeps none', async () => {
  const db = await seeded();
  await db.setMeta('backup_last', '1000');
  await db.addMoment(moment('long', 'w1', W1 + 50_000, [piece('long', 'long', W1 + 50_000, { kind: 'video', file_path: 'walks/w1/long.mov', body: null })]));
  const media = (ref: string) => (ref === 'walks/w1/long.mov' ? zeros(4 * GiB + MiB) : (b => (b ? once(b) : null))(photoOf(ref)));
  const web = runIO('web', media);
  const w = createBackupWriter({ db, clock: fakeClock(NOW) });
  await w.load();
  await w.backUp(web);
  assert.equal(w.store.get().failed, TOO_LARGE, 'the web, which holds the file in memory, says it in words (decision 0266)');
  assert.equal(TOO_LARGE, 'This backup would be too large for one file, so it was not made.');
  assert.equal(web.delivered, 0, 'never handed over');
  assert.equal(web.discarded, 1, 'the file begun is dropped');
  assert.equal(await db.getMeta('backup_last'), '1000', '"Last backup made" as it was');
  assert.equal(w.store.get().last, 1000);
  // A phone: no refusal; a write that fails part way is the failure line, no file kept.
  let n = 0;
  const phone = runIO('ios', media, {
    write() {
      if ((n += 1) > 3) throw new Error('disk full');
    },
  });
  await w.backUp(phone);
  assert.equal(w.store.get().failed, FAILED);
  assert.equal(phone.delivered, 0);
  assert.equal(phone.discarded, 1);
  assert.equal(await db.getMeta('backup_last'), '1000');
});

test('BZ3 the seeded library\'s backup is fflate\'s Zip\'s bytes, entry by entry, for the same clock', async () => {
  const db = await seeded();
  const io = memoryIO();
  await createBackupWriter({ db, clock: fakeClock(NOW) }).writeBackup(io);
  const ours = io.bytes();
  const entries = await zipEntries((o, l) => ours.subarray(o, o + l), ours.length);
  const now = Date.now;
  Date.now = () => NOW;
  const theirs: Uint8Array[] = [];
  try {
    const z = new Zip((e, c) => {
      if (e) throw e;
      theirs.push(c.slice());
    });
    for (const e of entries) {
      const f = new ZipPassThrough(e.name);
      z.add(f);
      const parts: Uint8Array[] = [];
      for await (const c of zipEntryChunks((o, l) => ours.subarray(o, o + l), e)) parts.push(c.slice());
      f.push(Buffer.concat(parts), true);
    }
    z.end();
  } finally {
    Date.now = now;
  }
  assert.equal(entries.length, 22);
  assert.equal(Buffer.compare(Buffer.from(ours), Buffer.concat(theirs)), 0, 'the same bytes as today\'s writer');
});

/** Puts a reminder and a find on a moment, as the app keeps them: by the moment's id. */
async function remindAndFind(db: Db, momentId: string, walkId: string | null) {
  await db.setRecall({ capture_id: momentId, frequency: 'once', until: null, last_fired_at: null, fired_count: 0, last_walk_id: null });
  await db.addFind({ key: `f-${momentId}`, area_key: null, walk_id: walkId, capture_id: momentId, found_at: 6, name: 'Mural', category: 'art', kind: 'public_art', at: [LON, LAT], generic: false } as never);
}

test('back-up-everything audit 14: a waiting delete of a stacked moment\'s first piece keeps the moment\'s reminder and find', async () => {
  const db = await seeded();
  await db.addMoment(moment('stack', 'w1', W1 + 500_000, [piece('stack', 'stack', W1 + 500_000, { body: 'first' }), piece('stack-2', 'stack', W1 + 500_001, { body: 'second' })]));
  await remindAndFind(db, 'stack', 'w1');
  await db.setMeta('pending_delete', JSON.stringify([{ kind: 'moment', ids: ['stack'], spec: { type: 'piece', momentId: 'stack', pieceId: 'stack' } }]));
  const io = memoryIO();
  await createBackupWriter({ db, clock: fakeClock(NOW) }).writeBackup(io);
  const zip = unzip(io);
  const stack = json(zip, 'moments.json').find((m: Moment) => m.id === 'stack');
  assert.deepEqual(stack.pieces.map((p: { id: string }) => p.id), ['stack-2'], 'the moment stays with its other piece');
  assert.ok(json(zip, 'recalls.json').some((r: { capture_id: string }) => r.capture_id === 'stack'), 'its reminder stays');
  assert.ok(json(zip, 'finds.json').some((f: { capture_id: string }) => f.capture_id === 'stack'), 'its find stays');
});

test('back-up-everything audit 15: a waiting delete of a moment split out of a stack leaves its reminder and find out', async () => {
  const db = await seeded();
  await db.addMoment(moment('two', 'w1', W1 + 600_000, [piece('two', 'two', W1 + 600_000), piece('two-b', 'two', W1 + 600_001)]));
  await db.splitPiece('two-b', { id: 'split', walk_id: 'w1', t: W1 + 600_001, lat: LAT, lon: LON, segment_id: null });
  await remindAndFind(db, 'split', 'w1');
  await db.setMeta('pending_delete', JSON.stringify([{ kind: 'moment', ids: ['split'], spec: { type: 'moment', captureId: 'split' } }]));
  const io = memoryIO();
  await createBackupWriter({ db, clock: fakeClock(NOW) }).writeBackup(io);
  const zip = unzip(io);
  assert.ok(!json(zip, 'moments.json').some((m: Moment) => m.id === 'split'));
  assert.ok(!json(zip, 'recalls.json').some((r: { capture_id: string }) => r.capture_id === 'split'), 'its reminder goes with it');
  assert.ok(!json(zip, 'finds.json').some((f: { capture_id: string }) => f.capture_id === 'split'), 'its find goes with it');
});

test('BK14, back-up-everything audit 2: the file\'s rows for a waiting piece, media, thread and removal delete', async () => {
  const db = await seeded();
  await db.addMoment(moment('pair', 'w1', W1 + 700_000, [piece('pair', 'pair', W1 + 700_000), piece('pair-b', 'pair', W1 + 700_001, { kind: 'photo', file_path: 'walks/w1/photo.jpg', body: null })]));
  await db.addMoment(moment('gone2', 'w1', W1 + 710_000, [piece('gone2', 'gone2', W1 + 710_000)]));
  await remindAndFind(db, 'gone2', 'w1');
  await db.applyThreads({ putThreads: [{ id: 't2', name: 'Bells', created_at: 1 }, { id: 't3', name: 'Doors', created_at: 1 }], putMembers: [
    { thread_id: 't2', moment_id: 'note', added_at: 2 }, { thread_id: 't2', moment_id: 'memo', added_at: 2 }, { thread_id: 't2', moment_id: 'loose', added_at: 2 },
    { thread_id: 't3', moment_id: 'note', added_at: 2 }, { thread_id: 't3', moment_id: 'memo', added_at: 2 },
  ] });
  await db.setMeta('pending_delete', JSON.stringify([
    { kind: 'moment', ids: ['pair-b'], spec: { type: 'piece', momentId: 'pair', pieceId: 'pair-b' } },
    { kind: 'media', ids: ['gone2'], spec: { type: 'media', walkId: 'w1', captureIds: ['gone2'] } },
    { kind: 'thread', ids: ['t3'], spec: { type: 'thread', threadId: 't3' } },
    { kind: 'thread', ids: ['t2/loose'], spec: { type: 'remove', threadId: 't2', momentId: 'loose' } },
  ]));
  const io = memoryIO();
  await createBackupWriter({ db, clock: fakeClock(NOW) }).writeBackup(io);
  const zip = unzip(io);
  const ms = json(zip, 'moments.json');
  assert.deepEqual(ms.find((m: Moment) => m.id === 'pair').pieces.map((p: { id: string }) => p.id), ['pair']);
  assert.ok(!ms.some((m: Moment) => m.id === 'gone2'), 'a media delete takes the moment');
  assert.ok(!json(zip, 'recalls.json').some((r: { capture_id: string }) => r.capture_id === 'gone2'), 'and its reminder');
  assert.ok(json(zip, 'finds.json').some((f: { capture_id: string }) => f.capture_id === 'gone2'), 'but keeps its find, as the delete does');
  const th = json(zip, 'threads.json');
  assert.ok(!th.threads.some((t: { id: string }) => t.id === 't3'), 'a waiting thread delete');
  assert.deepEqual(th.members.filter((m: { thread_id: string }) => m.thread_id === 't2').map((m: { moment_id: string }) => m.moment_id).sort(), ['memo', 'note'], 'a waiting removal');
});

test('back-up-everything audit 16: a moment whose walk row is gone is still in the file, written as a loose moment', async () => {
  const db = await seeded();
  await db.addMoment(moment('orphan', 'w-gone', W1 + 800_000, [piece('orphan', 'orphan', W1 + 800_000, { body: 'saved after its walk went' })]));
  const io = memoryIO();
  await createBackupWriter({ db, clock: fakeClock(NOW) }).writeBackup(io);
  const ms = json(unzip(io), 'moments.json');
  const o = ms.find((m: Moment) => m.id === 'orphan');
  assert.ok(o, 'the moment is kept');
  assert.equal(o.walk_id, null, 'written as loose, so no walk it names is missing');
  assert.equal(new Set(ms.map((m: Moment) => m.id)).size, ms.length, 'every moment once');
});
