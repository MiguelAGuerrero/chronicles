/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOpeners } from '../openers';

// Audit (Nov 1): one listener slot meant the walk screen took the home's slot and, unmounting, left
// none, so a reminder tapped on the home after a walk never opened; and a refusing home swallowed it.
test('openers: the newest screen is asked first; one that declines passes it on', () => {
  const o = createOpeners<string>();
  const got: string[] = [];
  o.add((x) => (got.push(`home:${x}`), true));
  const offWalk = o.add(() => false);
  assert.equal(o.offer('a'), true, 'the walk declines; the home beneath takes it');
  assert.deepEqual(got, ['home:a']);
  offWalk();
  assert.equal(o.offer('b'), true, 'with the walk gone, the home still listens');
  assert.deepEqual(got, ['home:a', 'home:b']);
});

test('openers: with no screen willing, the offer is refused, so it is kept for the next screen', () => {
  const o = createOpeners<string>();
  assert.equal(o.offer('a'), false);
  const off = o.add(() => false);
  assert.equal(o.offer('a'), false);
  off();
  assert.equal(o.size(), 0);
});

test('openers: removing one never removes another registered with the same function', () => {
  const o = createOpeners<string>();
  const fn = () => true;
  const off1 = o.add(fn);
  o.add(fn);
  off1();
  assert.equal(o.size(), 1);
});
