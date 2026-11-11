/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fakePorts } from '../fakes';
import { mod, memo, row, SPEC } from './fixtures';

// Memo transcripts: where the words go (`transcribe/words`) and where they do not. Written before the module.
const ROOT = join(__dirname, '../../../..');

test('MX7: the words store is read by piece id and feeds the resurface seam; no row, no words', { todo: 'test first' }, async () => {
  const { createWords } = await mod('words');
  const ports = fakePorts();
  await ports.db.addMoment(memo('m1', 10));
  await (ports.db as any).putTranscript(row('m1', '  the bakery smelled of cardamom ', SPEC.tag));
  await (ports.db as any).putTranscript(row('m2', '', SPEC.tag));
  const words = createWords(ports);
  await words.load();
  const [m] = await ports.db.getMomentsByIds(['m1']);
  const faced = { ...m, ...m.pieces[0], piece_id: 'm1' };
  assert.equal(words.transcript(faced), 'the bakery smelled of cardamom');
  assert.equal(words.transcript({ ...faced, piece_id: 'm2' }), null, 'silence shows nothing');
  assert.equal(words.transcript({ ...faced, piece_id: 'zz' }), null);
});

test('MX7: a memo\'s words become signals through the existing extractor (weight 0.8); notes and captions are unchanged', { todo: 'test first' }, async () => {
  const { signalsOf, DEFAULT_EXTRACTORS } = await import('../../resurface/extractors');
  const view = (kind: string, words: string | null) => ({ id: 'x', kind, words, t: 1, walkId: null });
  const memoSignals = signalsOf(view('voice', 'the old bakery on the corner') as any, DEFAULT_EXTRACTORS);
  assert.ok(memoSignals.length > 0 && memoSignals.every((s: any) => s.source === 'transcript' && s.weight === 0.8));
  assert.deepEqual(signalsOf(view('voice', null) as any, DEFAULT_EXTRACTORS), []);
  const note = signalsOf(view('text', 'the old bakery on the corner') as any, DEFAULT_EXTRACTORS);
  assert.ok(note.every((s: any) => s.source === 'note' && s.weight === 1));
  const { wordsOf } = await import('../../resurface/views');
  assert.equal(wordsOf({ kind: 'voice', body: '4000' } as any, () => 'heard words'), 'heard words');
  assert.equal(wordsOf({ kind: 'voice', body: '4000' } as any), null, 'the seam is unchanged without a source');
});

test('MX6: deleting a transcript row leaves everything else deriving from notes and captions', { todo: 'test first' }, async () => {
  const { createWords } = await mod('words');
  const ports = fakePorts();
  await (ports.db as any).putTranscript(row('m1', 'some words', SPEC.tag));
  const words = createWords(ports);
  await words.load();
  assert.equal(words.transcript({ piece_id: 'm1' } as any), 'some words');
  await ports.db.deleteMoments(['m1']);
  await words.load();
  assert.equal(words.transcript({ piece_id: 'm1' } as any), null);
});

test('MX3: the words store has no way to edit, rename or write a transcript', { todo: 'test first' }, async () => {
  const { createWords } = await mod('words');
  const api = Object.keys(createWords(fakePorts())).sort();
  assert.deepEqual(api.filter((k) => /^(set|edit|update|write|rename|put|save)/i.test(k)), [], api.join(','));
});

/** Every source file under a folder, as repo-relative posix paths. */
function files(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${n}`;
    if (statSync(join(ROOT, rel)).isDirectory()) files(rel, out);
    else if (/\.(ts|tsx)$/.test(n)) out.push(rel);
  }
  return out;
}

test('MX24: a transcript\'s words are read only by the viewer, the resurface seam and the thread and card components', { todo: 'test first' }, async () => {
  const allowed = [/^src\/lib\/transcribe\//, /^src\/lib\/resurface\/index\.ts$/, /^src\/components\/CaptureView\.tsx$/, /^src\/components\/chronicle\//, /^src\/lib\/__tests__\//];
  const readers = [...files('src/lib'), ...files('src/components'), ...files('src/app')].filter((f) => /transcribe\/(words|index)['"]|from '[^']*transcribe'/.test(readFileSync(join(ROOT, f), 'utf8')));
  const stray = readers.filter((f) => !allowed.some((a) => a.test(f)));
  assert.deepEqual(stray, [], 'a notification, share, reel, title, day line or quiet line must never read a transcript');
  assert.ok(readers.length > 0, 'the viewer and the seam read them');
});
