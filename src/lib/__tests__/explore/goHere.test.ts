/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ATLAS_CODE, type AtlasArea, type Listed } from '../../atlas/atlas';

// Explore: Go here on every tile (specs/explore-go-here, GH1-GH15). Test first: each is a todo until its code lands.
// The modules are imported inside each test, so a missing one fails that test alone, not the file.

const area = (name: string, at: AtlasArea['at'] | null = [-71.4, 41.8]): AtlasArea => ({
  key: name, level: 'neighborhood', name, at: at as AtlasArea['at'], reachM: 1000, build: 'b1', code: ATLAS_CODE, listed_at: 1, read_at: null, failed_at: null, profile: null,
});
const listed = (name: string, o: Partial<Listed> = {}, at: AtlasArea['at'] | null = [-71.4, 41.8]): Listed => ({ area: area(name, at), distanceM: 400, here: false, ...o });

test('GH2: two choices, Chronicles first, the maps app named for the phone; no choice is marked better', { todo: 'test first' }, async () => {
  const { goHereChoices } = await import('../../atlas/goHere');
  const { mapsName } = await import('../../nav/handoff');
  assert.equal(mapsName('apple'), 'Apple Maps');
  assert.equal(mapsName('appleApp'), 'Apple Maps');
  assert.equal(mapsName('google'), 'Google Maps');
  assert.equal(mapsName('geo'), 'Maps');
  const c = goHereChoices('Apple Maps');
  assert.deepEqual(c.map((x) => x.id), ['app', 'maps'], 'exactly two, Chronicles first');
  assert.equal(c[0].label, 'Chronicles');
  assert.equal(c[1].label, 'Apple Maps', 'the maps row names the app that gets the destination');
  assert.match(c[0].hint, /Opens Navigate, ready/);
});

test('GH5: Chronicles saves and opens Navigate ready, or, with a walk open, does as the card\'s Walk to does (NV10)', { todo: 'test first' }, async () => {
  const { goHereDo } = await import('../../atlas/goHere');
  assert.equal(goHereDo('app', false), 'later');
  assert.equal(goHereDo('app', true), 'start', 'a walk open: it routes that walk, as Walk to does');
  assert.equal(goHereDo('maps', false), 'maps');
  assert.equal(goHereDo('maps', true), 'maps', 'the maps app never touches the walk');
});

test('GH6: both choices are the same at any distance: nothing in the decision reads one', { todo: 'test first' }, async () => {
  const { goHereDo } = await import('../../atlas/goHere');
  assert.equal(goHereDo.length, 2, 'the decision takes the choice and whether a walk is open, and no distance');
});

test('GH8: every tile with a point has Go here, with or without a fix; not where you are, nor an area with no point', { todo: 'test first' }, async () => {
  const { canGoHere } = await import('../../atlas/goHere');
  assert.equal(canGoHere(listed('Fox Point')), true);
  assert.equal(canGoHere(listed('Cranston', { unplaced: true })), true, 'no fix: still offered (0121\'s planning case)');
  assert.equal(canGoHere(listed('Here', { here: true })), false, 'where you are: no Walk to, no Go here');
  assert.equal(canGoHere(listed('Nowhere', {}, null)), false, 'no point');
});

test('GH10: the sheet\'s own words hold no digit, minutes, "fastest" or count; the name is not the sheet\'s word', { todo: 'test first' }, async () => {
  const { goHereChoices, goHereWords } = await import('../../atlas/goHere');
  const words = [...goHereChoices('Apple Maps'), ...goHereChoices('Maps')].flatMap((c) => [c.label, c.hint]).concat(goHereWords('5th Ward', true));
  const own = words.join(' ').replace('5th Ward', '');
  assert.doesNotMatch(own, /\d|minute|min\b|fastest|quickest|\bof\b \w+ \w+ routes/i);
  assert.match(goHereWords('Fox Point', true).join(' '), /Replaces where you were heading/, 'a replaced destination is said once');
  assert.doesNotMatch(goHereWords('Fox Point', false).join(' '), /Replaces/);
});

test('GH14: a decision record cites 0058 and 0121 and lists the tile as a host', { todo: 'test first' }, () => {
  const dir = new URL('../../../../docs/decisions/', import.meta.url);
  const hit = readdirSync(dir).filter((f) => /go-here/.test(f)).map((f) => readFileSync(new URL(f, dir), 'utf8'));
  assert.ok(hit.length === 1, 'one record for Go here');
  assert.match(hit[0], /0058/);
  assert.match(hit[0], /0121/);
  assert.match(hit[0], /tile/i);
});

test('GH15: a Go here tap decides only between the maps app, saving a destination and starting a walk: nothing visited', { todo: 'test first' }, async () => {
  const { goHereDo } = await import('../../atlas/goHere');
  const seen = new Set<string>();
  for (const choice of ['app', 'maps'] as const) for (const open of [false, true]) seen.add(goHereDo(choice, open));
  assert.deepEqual([...seen].sort(), ['later', 'maps', 'start']);
});
