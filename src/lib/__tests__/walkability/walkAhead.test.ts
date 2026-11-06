/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { aheadStep, alongRoute, carStretches, warningLine, type AheadState } from '../../walk/ahead';
import type { Band } from '../../walk/types';

// Walkability (WK15, WK16), written from specs/walkability/spec.md before the code.

const O: LngLat = [-75.19, 40.69];
const KX = 111_320 * Math.cos((O[1] * Math.PI) / 180);
const at = (dx: number, dy = 0): LngLat => [O[0] + dx / KX, O[1] + dy / 110_540];
/** A 1 km route east, over three segments: calm to 300 m, a car stretch 300-600 m, then calm. */
const path = [at(0), at(1000)];
const segs = [
  { id: 'a', name: 'Elm Street', geometry: [[at(0), at(300)]] },
  { id: 'b', name: 'Route 22', geometry: [[at(300), at(600)]] },
  { id: 'c', name: 'Elm Street', geometry: [[at(600), at(1000)]] },
];
const bands = (b: Band) => new Map<string, Band>([['a', 'foot'], ['b', b], ['c', 'foot']]);

test('WK15: a car stretch of 100 m or more is found along the route, with its street and where it runs', () => {
  const got = carStretches(path, segs, bands('car'));
  assert.equal(got.length, 1);
  assert.equal(got[0].street, 'Route 22');
  assert.ok(Math.abs(got[0].fromM - 300) < 25 && Math.abs(got[0].toM - 600) < 25, JSON.stringify(got[0]));
  assert.deepEqual(carStretches(path, segs, bands('mixed')), [], 'mixed says nothing');
  assert.deepEqual(carStretches(path, segs, new Map()), [], 'no data says nothing');
  const short = [{ id: 'a', name: 'X', geometry: [[at(0), at(80)]] }];
  assert.deepEqual(carStretches([at(0), at(80)], short, new Map([['a', 'car']])), [], 'under 100 m');
});

test('WK15: said once, 200 m before the stretch, and kept until it is passed and 15 s have gone', () => {
  const [s] = carStretches(path, segs, bands('car'));
  let st: AheadState = { said: [], shown: null };
  let r = aheadStep(st, [s], 50, 0);
  assert.equal(r.show, null, 'too far ahead');
  r = aheadStep(r.state, [s], 120, 1000);
  assert.equal(r.show?.street, 'Route 22', '180 m ahead');
  assert.equal(warningLine(r.show!), 'Next: a stretch built around cars on Route 22');
  st = r.state;
  r = aheadStep(st, [s], 400, 5000);
  assert.ok(r.show, 'still shown while on it');
  r = aheadStep(r.state, [s], 650, 8000);
  assert.ok(r.show, 'passed, but not 15 s yet');
  r = aheadStep(r.state, [s], 700, 17000);
  assert.equal(r.show, null, 'gone 15 s after it was shown and once passed');
  r = aheadStep(r.state, [s], 100, 20000);
  assert.equal(r.show, null, 'never said twice on a route');
  assert.equal(warningLine({ ...s, street: null }), 'Next: a stretch built around cars');
});

test('WK16: the warning only says; it carries nothing that changes the route', () => {
  const [s] = carStretches(path, segs, bands('car'));
  const r = aheadStep({ said: [], shown: null }, [s], 150, 0);
  assert.deepEqual(Object.keys(r).sort(), ['show', 'state']);
  assert.deepEqual(Object.keys(r.show!).sort(), ['fromM', 'key', 'street', 'toM']);
});

test('WK15: how far along the route you are is the nearest point on it', () => {
  assert.ok(Math.abs(alongRoute(path, at(250, 5)) - 250) < 2);
  assert.ok(Math.abs(alongRoute(path, at(-40, 0))) < 2, 'before the start is the start');
  assert.ok(Math.abs(alongRoute(path, at(1200, 0)) - 1000) < 2, 'past the end is the end');
  const bent = [at(0), at(100), at(100, 100)];
  assert.ok(Math.abs(alongRoute(bent, at(100, 60)) - 160) < 3);
});

test('WK15, WH2: a stretch\'s key is its street and its last segment, so a new route over the same stretch is the same stretch, not said twice', () => {
  const [s] = carStretches(path, segs, bands('car'));
  const shorter = [at(100), at(1000)];
  const [again] = carStretches(shorter, segs, bands('car'));
  assert.equal(s.key, again.key, `${s.key} vs ${again.key}`);
  assert.equal(s.key, 'Route 22@b');
});
