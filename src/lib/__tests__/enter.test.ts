/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENTER, markEnter, pinDrops, starEnter } from '../enter';

test('enter M11, M12: a mark turns in when revealed, and pulses when found; never on first sight', () => {
  assert.equal(markEnter(undefined, { revealed: true }), null, 'already revealed when it first shows: no turn');
  assert.equal(markEnter({ revealed: false }, { revealed: true }), 'flip');
  assert.equal(markEnter({ revealed: true }, { revealed: true, found: true }), 'pulse');
  assert.equal(markEnter({ revealed: false }, { revealed: true, found: true }), 'pulse', 'found wins over revealed');
  assert.equal(markEnter({ revealed: true, found: true }, { revealed: true, found: true }), null);
  assert.equal(markEnter({ revealed: false, faint: true }, { revealed: false }), null);
});

test('enter M9: a star settles only when it becomes selected', () => {
  assert.equal(starEnter(undefined, true), null, 'selected when the map opens: still');
  assert.equal(starEnter(false, true), 'bounce');
  assert.equal(starEnter(true, true), null);
  assert.equal(starEnter(true, false), null);
});

test('enter M10: a pin drops in only for a capture new since the screen opened', () => {
  const opened = 1000;
  const seen = new Set(['a']);
  assert.equal(pinDrops([{ id: 'a', t: 2000 }], seen, opened), false, 'already shown');
  assert.equal(pinDrops([{ id: 'b', t: 500 }], seen, opened), false, 'older than the screen: a reload');
  assert.equal(pinDrops([{ id: 'a', t: 900 }, { id: 'c', t: 3000 }], seen, opened), true, 'a group a new capture joined');
});

test('enter: the effects are small and short (the restraint rule)', () => {
  assert.equal(ENTER.drop.fromY, -12);
  assert.equal(ENTER.bounce.fromScale, 0.85);
  assert.equal(ENTER.pulse.ms, 600);
  assert.equal(ENTER.flip.ms, 220);
});
