import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNavStore } from '../../nav/store/shell';
import type { Waypoint } from '../../nav/types';
import { NAV_KEY } from '../../startPlan';
import { fakePorts } from '../fakes';

// Where the open walk is heading, kept so a reload resumes it (N13), and the drawer's destination
// before a walk (NV23), as a shell over fakes (specs/shells-saved-settings, SH2).

const dest: Waypoint = { at: [-71.4, 41.812], label: 'Fox Point', kind: 'place' };

test('SH2 a walk\'s destination reads back for that walk only', async () => {
  const nav = createNavStore(fakePorts());
  await nav.saveNav('w1', dest);
  assert.deepEqual(await nav.loadNav('w1'), dest);
  assert.equal(await nav.loadNav('w2'), null, 'another walk has none');
  assert.equal(await nav.loadPendingDest(), null, 'a walk\'s destination is not the drawer\'s');
});

test('SH2 cleared, empty or unreadable reads as none', async () => {
  const p = fakePorts();
  const nav = createNavStore(p);
  await nav.saveNav('w1', dest);
  await nav.clearNav();
  assert.equal(await nav.loadNav('w1'), null, 'cleared');
  await p.db.setMeta(NAV_KEY, '{not json');
  assert.equal(await nav.loadNav('w1'), null, 'unreadable');
  p.db.failNext('getMeta', new Error('disk'));
  assert.equal(await nav.loadNav('w1'), null, 'a failed read');
});

test('SH2 the drawer\'s destination before a walk', async () => {
  const p = fakePorts();
  const nav = createNavStore(p);
  await nav.savePendingDest(dest);
  assert.deepEqual(await nav.loadPendingDest(), dest);
  assert.equal(await nav.loadNav('w1'), null, 'the drawer\'s destination belongs to no walk');
  await nav.savePendingDest(null);
  assert.equal(await nav.loadPendingDest(), null, 'cleared');
  await nav.savePendingDest(dest);
  p.db.failNext('getMeta', new Error('disk'));
  assert.equal(await nav.loadPendingDest(), null, 'a failed read');
});
