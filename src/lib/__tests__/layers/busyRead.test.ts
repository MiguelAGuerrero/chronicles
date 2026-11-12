/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { busyReadDue } from '../../layers/state';

// Explore in a dense city (DC9), written from specs/explore-dense-city/spec.md before the code.

test('DC9: no read while the map moves; the read waits for the settle', () => {
  const due = { on: true, needs: true, tried: false, moving: false };
  assert.equal(busyReadDue(due), true);
  assert.equal(busyReadDue({ ...due, moving: true }), false, 'never during an ease or a drag');
  assert.equal(busyReadDue({ ...due, on: false }), false);
  assert.equal(busyReadDue({ ...due, needs: false }), false, 'a remembered area covers it (ML9)');
  assert.equal(busyReadDue({ ...due, tried: true }), false, 'tried once per place');
});
