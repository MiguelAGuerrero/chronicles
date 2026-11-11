/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { cardLine, FORM_WORDS, placeForm } from '../../walk/placeForm';

// The words (specs/place-form PF1, PF2, PF3, PF11, PF18, PF19), written from the spec before the code.

const BANNED = /walkable|good|bad|best|poor|nice|\d|\b(more|less|than|most)\b/i;
const ADVICE = /\b(avoid|try|should|expect|watch|beware|careful|drive|park|bring|skip|don't|do not|recommend|worth)\b/i;
const src = (f: string) => readFileSync(new URL(`../../walk/${f}`, import.meta.url), 'utf8');

test('PF1: the words name a layout, with no judgement, digit or comparison', { todo: 'test first' }, () => {
  assert.equal(FORM_WORDS.length, 4, 'the first set is four words');
  for (const w of FORM_WORDS) {
    assert.ok(w.clause.length >= 8 && w.clause.length <= 40, w.clause);
    assert.doesNotMatch(w.clause, BANNED, w.clause);
    assert.ok(w.inputs.length > 0, `${w.id} lists the measures it reads`);
  }
});

test('PF2: the table is sorted by id, carries no rank or default, and nothing fitting is no word', { todo: 'test first' }, () => {
  const ids = FORM_WORDS.map((w) => w.id);
  assert.deepEqual(ids, [...ids].sort());
  for (const w of FORM_WORDS) assert.deepEqual(Object.keys(w).sort(), ['clause', 'id', 'inputs']);
  assert.equal(placeForm(null), null);
});

test('PF3: the rule and the measures are core: no clock, request, db or React Native, and only core imports', { todo: 'test first' }, () => {
  for (const f of ['placeForm.ts', 'placeSignals.ts', 'placeFormReport.ts']) {
    const s = src(f);
    assert.match(s.split('\n')[0], /^\/\/ @layer core$/, f);
    assert.doesNotMatch(s, /Date\.now|Math\.random|fetch\(|react-native|from '\.\.\/(db|net|ports)/, f);
    for (const m of s.matchAll(/from '(\.\/[^']+)'/g)) assert.match(src(`${m[1].slice(2)}.ts`).split('\n')[0], /^\/\/ @layer core$/, `${f} imports ${m[1]}`);
  }
});

test('PF11: no number, share or comparison reaches a string, and no accuracy figure is in the app', { todo: 'test first' }, () => {
  for (const w of FORM_WORDS) assert.doesNotMatch(cardLine(w.id), /\d|%|\b(more|less|than|most)\b/i, w.id);
  for (const f of ['placeForm.ts', 'placeSignals.ts']) assert.doesNotMatch(src(f), /accuracy|recall/i, f);
});

test('PF18: the line is worded as the ring\'s, never the whole area\'s', { todo: 'test first' }, () => {
  for (const w of FORM_WORDS) {
    const line = cardLine(w.id);
    assert.match(line, /^Around its middle: [a-z]/, line);
    assert.ok(line.toLowerCase().endsWith(w.clause.slice(1).toLowerCase()), `${line} says ${w.clause}`);
  }
});

test('PF19: no copy on the card\'s line says how to go about an area, or what to do, avoid or expect', { todo: 'test first' }, () => {
  for (const w of FORM_WORDS) {
    assert.doesNotMatch(w.clause, ADVICE, w.clause);
    assert.doesNotMatch(cardLine(w.id), ADVICE, w.id);
  }
});
