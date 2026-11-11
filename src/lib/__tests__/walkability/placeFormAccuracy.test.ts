/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FORM_WORDS, placeForm } from '../../walk/placeForm';
import { measureRing } from '../../walk/placeSignals';
import type { WayFacts } from '../../walk/types';
import { acceptable, loadSet, moved, plainlyWrong, readOf, type FixturePlace, type Word } from './placeFormFixtures';

// The rule against real places (specs/place-form PF5-PF10, PF15, PF17, PF21, PF22). Overture's own tiles (release 2026-10-21.0), cut by
// scripts/fixture-place-form.mjs, each with the word the owner confirmed (2026-11-11). The calibration set is what the thresholds are tuned
// on; the held-out set is cut and read only after they are pinned, and never tuned on (PF6).

const calibration = loadSet('Calibration');
const heldOut = loadSet('HeldOut');
const wordOf = (p: FixturePlace, o?: Parameters<typeof readOf>[1]): Word => placeForm(measureRing(readOf(p, o)));
const correct = (p: FixturePlace, got: Word) => acceptable(p).includes(got);
const MALLS_AND_SUBURBS = ['lvMall', 'parkCity', 'upperMacungie', 'lowerPaxton'];
const SIDEWALK = (w: WayFacts) => w.cls === 'footway';

test('PF15: every fixture has the owner\'s confirmed word, its date and its release', { todo: 'test first' }, () => {
  assert.ok(calibration, 'the calibration fixture is cut');
  assert.equal(calibration!.release, '2026-10-21.0');
  assert.match(calibration!.confirmed, /^\d{4}-\d{2}-\d{2}$/);
  const allowed = new Set<Word>([null, ...FORM_WORDS.map((w) => w.id)]);
  assert.ok(calibration!.places.length >= 15, 'a real spread of places');
  for (const p of calibration!.places) {
    assert.ok('word' in p && allowed.has(p.word), `${p.id} has a confirmed word or silence`);
    assert.ok(p.tiles.length > 0 && p.ways.length >= 0, `${p.id} carries its tiles`);
  }
  for (const w of FORM_WORDS) assert.ok(calibration!.places.some((p) => p.word === w.id), `the calibration set has a ${w.id}`);
});

for (const p of calibration?.places ?? []) {
  test(`PF5: ${p.id} is ${p.word ?? 'no word'}`, { todo: 'test first' }, () => {
    const m = measureRing(readOf(p));
    assert.ok(correct(p, placeForm(m)), `${p.name}: confirmed ${p.word}, the rule says ${placeForm(m)}; measures ${JSON.stringify(m)}`);
  });
}

test('PF6: the held-out places are right at the floor, with recall, and a "?" counts only for its two words', { todo: 'test first' }, () => {
  assert.ok(heldOut, 'the held-out fixture is cut, after the thresholds are pinned');
  const rows = heldOut!.places.map((p) => ({ p, got: wordOf(p) }));
  const right = rows.filter((r) => correct(r.p, r.got));
  const accuracy = right.length / rows.length;
  const calibrated = calibration!.places.filter((p) => correct(p, wordOf(p))).length / calibration!.places.length;
  const asked = rows.filter((r) => r.p.word !== null);
  const recall = asked.filter((r) => r.got !== null).length / asked.length;
  const misses = rows.filter((r) => !correct(r.p, r.got)).map((r) => `${r.p.id}: confirmed ${r.p.word}${r.p.accept !== undefined ? `|${r.p.accept}` : ''}, got ${r.got}`);
  assert.ok(accuracy >= 0.8, `held-out accuracy ${accuracy.toFixed(2)} is under 0.80: ${misses.join('; ')}`);
  assert.ok(accuracy >= calibrated - 0.1, `held-out ${accuracy.toFixed(2)} is more than 10 points under the calibration set's ${calibrated.toFixed(2)}`);
  assert.ok(recall >= 0.8, `only ${recall.toFixed(2)} of the places with a word get any word (silence cannot pass)`);
});

test('PF7: no plainly wrong word in either set, and a mall or a suburb has no word at all', { todo: 'test first' }, () => {
  for (const set of [calibration, heldOut]) {
    assert.ok(set, 'both sets are cut');
    for (const p of set!.places) {
      const got = wordOf(p);
      assert.ok(!plainlyWrong(p.word, got) && !(p.accept !== undefined && plainlyWrong(p.accept, got)), `${p.name}: confirmed ${p.word}, got ${got}`);
    }
  }
  for (const id of MALLS_AND_SUBURBS) assert.equal(wordOf(calibration!.places.find((p) => p.id === id)!), null, id);
});

test('PF8: farmland, water and woods have no word, and a ring with no tile read is no word', { todo: 'test first' }, () => {
  for (const id of ['blueMarsh', 'farmA', 'farmC']) assert.equal(wordOf(calibration!.places.find((p) => p.id === id)!), null, id);
  const town = calibration!.places.find((p) => p.id === 'hamburg')!;
  assert.equal(placeForm(measureRing({ ...readOf(town), tilesRead: town.tiles.slice(0, 1) })), null);
});

test('PF9: removing every sidewalk, crossing and footway changes no word, and adding them changes none', { todo: 'test first' }, () => {
  for (const p of calibration!.places) {
    const bare = wordOf(p, { ways: p.ways.filter((w) => !SIDEWALK(w)) });
    const plain = wordOf(p);
    const sidewalks: WayFacts[] = p.ways.filter((w) => w.cls === 'residential').map((w, i) => ({ id: `sw${i}`, cls: 'footway', sub: 'sidewalk', level: 0, line: w.line }));
    assert.equal(bare, plain, `${p.id}: without its footways`);
    assert.equal(wordOf(p, { ways: [...p.ways, ...sidewalks] }), plain, `${p.id}: with a sidewalk along every street`);
  }
});

test('PF10: the same word whichever other tiles are read, and in whatever order', { todo: 'test first' }, () => {
  for (const p of calibration!.places) {
    const r = readOf(p);
    const word = placeForm(measureRing(r));
    const reversed = { ...r, ways: [...r.ways].reverse(), junctions: [...r.junctions].reverse(), places: [...r.places!].reverse(), buildings: [...r.buildings!].reverse(), tilesRead: [...r.tilesRead].reverse() };
    assert.equal(placeForm(measureRing(reversed)), word, `${p.id}: reversed`);
    const far = { ...r, junctions: [...r.junctions, moved(p.at, 6000, 0)], tilesRead: [...r.tilesRead, '1/1', '2/2'] };
    assert.equal(placeForm(measureRing(far)), word, `${p.id}: with a far tile in`);
  }
});

test('PF17: no places read, or no buildings read, is no word for every place; emptying the places only ever makes no word', { todo: 'test first' }, () => {
  for (const p of calibration!.places) {
    assert.equal(wordOf(p, { places: false }), null, `${p.id}: places not read`);
    assert.equal(wordOf(p, { buildings: false }), null, `${p.id}: buildings not read`);
    const emptied = placeForm(measureRing({ ...readOf(p), places: [] }));
    assert.ok(emptied === null || emptied === wordOf(p), `${p.id}: no places read as none became ${emptied}`);
    assert.ok(!(emptied === 'village'), `${p.id}: sparse is not a layout`);
  }
});

test('PF21: the village word separates the villages from the main-street towns on the calibration set', { todo: 'test first' }, () => {
  const got = (id: string) => wordOf(calibration!.places.find((p) => p.id === id)!);
  assert.ok(FORM_WORDS.some((w) => w.id === 'village'), 'the word is in the table, or leaves the set with its reason in the Record');
  for (const id of ['friedensburg', 'fredericksburg']) assert.equal(got(id), 'village', id);
  for (const id of ['hamburg', 'jonestown', 'kutztown']) assert.notEqual(got(id), 'village', id);
});

test('PF22: moving the centre 300 m never makes a plainly wrong word', { todo: 'test first' }, () => {
  for (const p of calibration!.places) {
    if (p.word === null) continue;
    for (const [dx, dy] of [[300, 0], [-300, 0], [0, 300], [0, -300]] as const) {
      const got = wordOf(p, { at: moved(p.at, dx, dy) });
      assert.ok(!plainlyWrong(p.word, got), `${p.id} moved ${dx},${dy}: confirmed ${p.word}, got ${got}`);
    }
  }
});
