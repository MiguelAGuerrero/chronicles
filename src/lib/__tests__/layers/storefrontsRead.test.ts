/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { storefrontsReadDue } from '../../layers/state';

// Explore in a dense city (DC9), written from specs/explore-dense-city/spec.md before the code.

test('DC9: no read while the map moves; the read waits for the settle', () => {
  const due = { on: true, needs: true, tried: false, moving: false };
  assert.equal(storefrontsReadDue(due), true);
  assert.equal(storefrontsReadDue({ ...due, moving: true }), false, 'never during an ease or a drag');
  assert.equal(storefrontsReadDue({ ...due, on: false }), false);
  assert.equal(storefrontsReadDue({ ...due, needs: false }), false, 'a remembered area covers it (ML9)');
  assert.equal(storefrontsReadDue({ ...due, tried: true }), false, 'tried once per place');
});
