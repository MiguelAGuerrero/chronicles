import { type Faced, facedAll, momentOf } from '../../moment';
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import ts from 'typescript';
import type { db as nativeDb } from '../../db/index.native';
import type { db as webDb } from '../../db/index.web';
import type { Db } from '../../db/types';
import type { makeThumb } from '../../media/thumb';

/** The files these tests read by source (type-only, so nothing native loads): a change to one selects them. */
export type ReadBySource = [typeof nativeDb, typeof webDb, typeof makeThumb];

// TH5 (memories on revisit, thumbnails): one thumbnail model on phones and the web. The copy is made by
// one module over expo-image-manipulator (which has both builds); on the phone it takes SQLite migration
// 12, a nullable column; IndexedDB stores the whole record, so the web needs no new version for it.
// SQLite can't run in Node: its half is read from the migration list itself.

const LIB = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(LIB, rel), 'utf8');

/** The SQL of each entry of `MIGRATIONS` in the native store, in order (entry N is migration N). */
function nativeMigrations(): string[] {
  // The native store's migrations moved to their own module with the moment table (decision 0123).
  const file = join(LIB, 'db', 'migrations.ts');
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  let out: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'MIGRATIONS' && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      out = node.initializer.elements.map((e) => (ts.isNoSubstitutionTemplateLiteral(e) || ts.isStringLiteral(e) ? e.text : e.getText()));
    }
    node.forEachChild(visit);
  };
  visit(src);
  return out;
}

const photo = (o: Partial<Faced> = {}): Faced =>
  ({ id: 'p1', walk_id: 'w1', t: 1000, lat: 41.82, lon: -71.4, kind: 'photo', file_path: 'walks/w1/p1.jpg', body: null, segment_id: null, ...o }) as Faced;

test('TH5: SQLite migration 12, read from its source (SQLite never runs in Node), adds the small copy as one nullable column on capture', () => {
  const m = nativeMigrations();
  assert.ok(m.length >= 12, `${m.length} migrations`);
  const twelve = m[11].trim();
  assert.match(twelve, /^ALTER TABLE capture ADD COLUMN thumb_path TEXT\s*;$/, `migration 12 is the thumbnail's column, and only it (${twelve})`);
  assert.doesNotMatch(twelve, /NOT NULL|DEFAULT/i, 'null until made');
  assert.ok(m.slice(0, 11).every((sql) => !/thumb_path/.test(sql)), 'no earlier migration knew it');
});

test('TH5: the web store keeps the small copy on the whole capture record, with no version of its own', async () => {
  // No upgrade step names it: the record is stored whole.
  assert.doesNotMatch(read('db/index.web.ts'), /thumb_path/, 'IndexedDB needs no new version for it');
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  const { db } = (await import(`../../db/index.web.ts?th5=1` as string)) as { db: Db };
  // A photo kept before its copy is made: no copy yet, then the path patched on, as the thumb job does.
  await db.addMoment(momentOf(photo()));
  assert.equal((await db.getMoments('w1').then(facedAll))[0].thumb_path ?? null, null, 'null until made');
  await db.updatePiece('p1', { thumb_path: 'walks/w1/p1.thumb.jpg' });
  const [row] = await db.getMoments('w1').then(facedAll);
  assert.equal(row.thumb_path, 'walks/w1/p1.thumb.jpg');
  assert.equal(row.file_path, 'walks/w1/p1.jpg', 'the photo itself untouched');
});

test('TH5: one module makes the copy on both platforms, over expo-image-manipulator', () => {
  // The decisions are core (thumbJob, thumbPlan, tested in thumb.test.ts); the platform part is one file.
  for (const split of ['media/thumb.native.ts', 'media/thumb.web.ts', 'media/thumb.native.tsx', 'media/thumb.web.tsx']) {
    assert.equal(existsSync(join(LIB, split)), false, `no ${split}: the same code on phones and the web`);
  }
  const src = read('media/thumb.ts');
  assert.match(src, /from 'expo-image-manipulator'/, 'made with expo-image-manipulator, which has a web build');
  assert.match(src, /from '\.\.\/thumbJob'/, 'through the shared thumb job');
});

// Video thumbnails (specs/video-thumbnails).
test("VT1: a video wants a copy, from its kept part's start, at 720 px", async () => {
  const { wantsThumb, thumbEdge, frameAt, THUMB } = await import('../../thumbPlan');
  const v = { id: 'v', walk_id: null, kind: 'video', file_path: 'walks/moments/v.mp4', thumb_path: null };
  assert.equal(wantsThumb(v), true);
  assert.equal(wantsThumb({ ...v, thumb_path: 'walks/moments/v.thumb.jpg' }), false, 'once made, never again (VT2)');
  assert.equal(wantsThumb({ ...v, thumb_path: THUMB.none }), false, 'one that will not decode is not tried again');
  assert.equal(wantsThumb({ ...v, kind: 'voice' }), false);
  assert.equal(thumbEdge('video'), 720);
  assert.equal(thumbEdge('photo'), 240, "a photo's copy is unchanged");
  assert.equal(frameAt(null), 0);
  assert.equal(frameAt({ v: 1, rotate: 0, crop: null, filter: 'original', strokes: [], trim: null }), 0);
});

test('VT5: a preview never shows the video file', async () => {
  const { thumbShown, THUMB } = await import('../../thumbPlan');
  const v = { id: 'v', walk_id: null, kind: 'video', file_path: 'walks/moments/v.mp4', thumb_path: null as string | null };
  assert.equal(thumbShown(v, false), null, 'while the still is being made: the glyph');
  assert.equal(thumbShown({ ...v, thumb_path: THUMB.none }, false), null, 'a video that will not decode: the glyph, never the file');
  assert.equal(thumbShown({ ...v, thumb_path: 'walks/moments/v.thumb.jpg' }, true), null, "a still whose file is gone: the glyph, never the video's file");
  assert.equal(thumbShown({ ...v, thumb_path: 'walks/moments/v.thumb.jpg' }, false), 'walks/moments/v.thumb.jpg');
  // A photo is as before: its copy, else the photo when the copy is gone.
  assert.equal(thumbShown({ ...v, kind: 'photo', file_path: 'p.jpg', thumb_path: THUMB.none }, false), 'p.jpg');
});

test('VT6: an edit makes a new copy', async () => {
  const { editedThumbName, frameAt } = await import('../../thumbPlan');
  const trim = { v: 1 as const, rotate: 0 as const, crop: null, filter: 'original' as const, strokes: [], trim: { start_ms: 2500, end_ms: 6000 } };
  assert.equal(frameAt(trim), 2.5, "the still is taken at the trim's start");
  const a = editedThumbName({ id: 'v' }, trim);
  const b = editedThumbName({ id: 'v' }, { ...trim, trim: { start_ms: 1000, end_ms: 6000 } });
  assert.notEqual(a, b, 'a new edit is a new name, so a preview keyed by it loads the new still');
  assert.notEqual(editedThumbName({ id: 'v' }, null), a, 'undoing the edit to none is a new name too');
});
