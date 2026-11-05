/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KEEP_MS, type Stretch } from '../../walk/ahead';
import { createAheadWatch } from '../../walk/aheadWatch';
import { fakePorts } from '../fakes';

// Walkability (WK15, WK16), written from specs/walkability/spec.md before the code.

const s: Stretch = { key: 'Route 22@-75.1900,40.6900', street: 'Route 22', fromM: 300, toM: 600 };

test('WK15: the watch says a stretch once as the walker nears it, and clears it after it is passed', () => {
  const p = fakePorts();
  const w = createAheadWatch(p);
  assert.equal(w.store.get().show, null);
  w.stretches('route-a', [s]);
  w.at(50);
  assert.equal(w.store.get().show, null, 'too far');
  w.at(130);
  assert.equal(w.store.get().show?.street, 'Route 22');
  p.clock.advance(KEEP_MS + 1);
  w.at(650);
  assert.equal(w.store.get().show, null, 'passed and 15 s gone');
  w.at(120);
  assert.equal(w.store.get().show, null, 'once per route');
});

test('WK15: a new route over the same stretch is not said again; no route says nothing', () => {
  const p = fakePorts();
  const w = createAheadWatch(p);
  w.stretches('a', [s]);
  w.at(150);
  p.clock.advance(KEEP_MS + 1);
  w.at(700);
  w.stretches('b', [{ ...s, fromM: 100, toM: 400 }]);
  w.at(0);
  assert.equal(w.store.get().show, null);
  w.stretches(null, []);
  w.at(100);
  assert.equal(w.store.get().show, null);
});
