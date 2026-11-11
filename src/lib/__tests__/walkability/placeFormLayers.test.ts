/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// Where the word reaches, and where it does not (specs/place-form PF13, PF14, PF20), written from the spec before the code.

const root = new URL('../../../', import.meta.url).pathname; // src/
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
const read = (f: string) => readFileSync(f, 'utf8');
const MODULES = /walk\/(placeForm|placeSignals|placeFormReport|buildings)|useAreaWords/;

test('PF3, PF13: nothing in explore, discovery, atlas or activity reaches the place-form modules', { todo: 'test first' }, () => {
  for (const dir of ['lib/explore', 'lib/discovery', 'lib/atlas', 'lib/activity']) for (const f of walk(join(root, dir)).filter((f) => /\.tsx?$/.test(f))) assert.doesNotMatch(read(f), MODULES, f);
  assert.ok(read(join(root, 'lib/walk/placeSignals.ts')), 'the module exists');
});

test('PF13, PF20: only the card\'s one line component takes the word; the card passes it nothing else', { todo: 'test first' }, () => {
  const users = walk(join(root, 'components')).filter((f) => /\.tsx$/.test(f) && /\bform\b|placeForm|cardLine/.test(read(f)));
  assert.deepEqual(users.map((f) => f.split('/').pop()).sort(), ['AtlasCard.tsx', 'PlaceFormLine.tsx']);
  const card = read(join(root, 'components/atlas/AtlasCard.tsx'));
  assert.equal((card.match(/\.form\b/g) ?? []).length, 1, 'the card reads the word once');
  assert.match(card, /<PlaceFormLine[^>]*form=\{[^}]*\.form\}/, 'and hands it to the one line');
});

test('PF14: the word adds no layer, pin, icon, colour or setting', { todo: 'test first' }, () => {
  for (const f of [...walk(join(root, 'lib/layers')), ...walk(join(root, 'components')).filter((f) => /Layers|MapPin|AreaPoint|WalkBandIcon/.test(f))].filter((f) => /\.tsx?$/.test(f))) assert.doesNotMatch(read(f), /placeForm|cardLine|PlaceFormLine/, f);
  const line = read(join(root, 'components/atlas/PlaceFormLine.tsx'));
  assert.doesNotMatch(line, /Icon|color|backgroundColor|Pressable|onPress/, 'text only: no icon, colour or control');
});

test('PF11: no app code imports the report module that holds the accuracy figures', () => {
  for (const dir of ['app', 'components', 'lib']) for (const f of walk(join(root, dir)).filter((f) => /\.tsx?$/.test(f) && !f.includes('__tests__') && !f.endsWith('placeFormReport.ts'))) assert.doesNotMatch(read(f), /placeFormReport/, f);
});
