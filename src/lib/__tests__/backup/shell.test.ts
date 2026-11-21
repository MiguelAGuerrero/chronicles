import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import { BACKUP_FORMAT, BACKUP_VERSION, FAILED, NO_ROOM, readBackup, type BackupRows } from '../../backup/core';
import { createBackupWriter, type BackupIO } from '../../backup/shell';
import type { Db } from '../../db/types';
import type { Mark, Offered } from '../../discovery/types';
import type { Capture, Moment, Walk } from '../../types';
import { fakeClock, memoryDb } from '../fakes';

// The whole-app backup's writer over a fake store (specs/back-up-everything, BK2, BK5-BK8, BK11, BK12, BK14).

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
  assert.equal(w.store.get().busy, false);
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
  assert.equal(w.store.get().busy, true);
  const opened = io.name;
  await w.backUp(io);
  assert.equal(io.name, opened);
  release();
  await first;
  assert.equal(handed, 1, 'one file handed over');
  assert.equal(w.store.get().busy, false);
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
