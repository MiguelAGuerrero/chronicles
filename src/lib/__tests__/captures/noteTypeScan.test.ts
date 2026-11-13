import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import * as mod from '../../noteType';

// What nothing may do with a note's type (specs/note-types, NY12), and where a note's save must pass it on (NY16).

const SRC = join(__dirname, '..', '..', '..');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : files(p);
    return /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
const all = files(SRC).map((f) => ({ f, text: readFileSync(f, 'utf8') }));

test('NY12: no exported function counts, sorts or filters types: none takes a list and none returns a number', () => {
  assert.ok(Object.keys(mod).includes('NOTE_TYPES'), 'the set exists');
  for (const [name, fn] of Object.entries(mod)) {
    if (typeof fn !== 'function') continue;
    assert.ok(!/count|tally|sort|filter|rank|score|group/i.test(name), `${name} is not a tally`);
    assert.notEqual(typeof (fn as (x: unknown) => unknown)([{ kind: 'text', note_type: 'idea' }]), 'number', `${name} given a list returns no number`);
  }
  assert.ok(NOTE_COUNT_OK());
  function NOTE_COUNT_OK() { return mod.NOTE_TYPES.length === 8; }
});

test('NY12: no line sorts, filters, counts or groups by a note\'s type, in lib or components', () => {
  assert.ok(all.some((x) => /note_type/.test(x.text)), 'the type is read somewhere');
  const bad = all.flatMap(({ f, text }) =>
    text.split('\n').flatMap((line, i) => (/(filter|sort|reduce|groupBy)\([^)]*(note_type|markOf|noteTypeOf|NOTE_TYPES)|(note_type|markOf|noteTypeOf)[^;]*\.(filter\((?!Boolean)|sort\(|reduce\()|groupBy|Object\.(entries|groupBy)\(\w*(types|notes)/i.test(line) && !/^\s*(\/\/|\*)/.test(line) ? [`${f}:${i + 1}: ${line.trim()}`] : [])),
  );
  assert.deepEqual(bad, []);
});

test('NY16: every note save passes the type on: no onSaveNote handler or type takes only (note, body)', () => {
  const sites = all.flatMap(({ f, text }) => text.split('\n').flatMap((line, i) => (/onSaveNote/.test(line) ? [{ f, i: i + 1, line }] : [])));
  assert.ok(sites.length >= 10, `the call sites are found (${sites.length})`);
  const two = sites.filter((s) => /\(\s*\w+(: \w+)?,\s*\w+(: \w+)?\)\s*=>/.test(s.line) && !/note_type|type/i.test(s.line.replace(/onSaveNote/g, '')));
  assert.deepEqual(two.map((s) => `${s.f}:${s.i}`), []);
});
