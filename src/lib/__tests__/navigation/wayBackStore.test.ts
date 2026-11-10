import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Waypoint } from '../../nav/types';
import { fakePorts } from '../fakes';

// Drive there, walk back (specs/drive-then-walk): what is saved, as a shell over fakes. Written before
// the shell's new methods, which each test reaches inside its body.
const navShell = (): Promise<any> => import(`../../nav/store/${'shell'}`);

const fox: Waypoint = { at: [-71.4, 41.812], label: 'Fox Point', kind: 'point' };

test('DW3: When I get there saves the destination and starts no walk', { todo: 'test first' }, async () => {
  const { createNavStore } = await navShell();
  const p = fakePorts();
  const nav = createNavStore(p);
  await nav.saveForLater(fox);
  assert.deepEqual(await nav.loadPendingDest(), fox, "Navigate's destination, held for no walk");
  assert.equal(await p.db.getOpenWalk(), null, 'no walk is open');
  assert.equal(p.recorder.isRecording(), false, 'nothing is recorded');
  assert.deepEqual(p.log.effects('recorder.'), [], 'no location is asked for');
  assert.deepEqual(p.log.effects('notifier.'), [], 'nothing is scheduled to say you arrived');
  assert.deepEqual(p.log.effects(), ['db.setMeta'], 'one write, nothing else');
});

test('DW4: arriving starts nothing: the saved destination waits for Start', { todo: 'test first' }, async () => {
  const { createNavStore } = await navShell();
  const p = fakePorts();
  const nav = createNavStore(p);
  await nav.saveForLater(fox);
  // Hours later, at the place: nothing in the app has moved on its own.
  p.clock.advance(3 * 3600_000);
  assert.equal(await p.db.getOpenWalk(), null);
  assert.deepEqual(p.log.effects(), ['db.setMeta'], 'no walk, recorder or notification without a tap');
  assert.deepEqual(await nav.loadPendingDest(), fox, 'still the destination');
});

test('DW7: the spot chosen is this walk\'s; a later one replaces it, another walk never sees it, Stop clears it', { todo: 'test first' }, async () => {
  const { createNavStore } = await navShell();
  const p = fakePorts();
  const nav = createNavStore(p);
  assert.equal(await nav.loadWayBack('w1'), null, 'none chosen');
  await nav.saveWayBack('w1', [-71.41, 41.81]);
  assert.deepEqual(await nav.loadWayBack('w1'), [-71.41, 41.81]);
  await nav.saveWayBack('w1', [-71.42, 41.82]);
  assert.deepEqual(await nav.loadWayBack('w1'), [-71.42, 41.82], 'a later one replaces it');
  assert.equal(await nav.loadWayBack('w2'), null, 'another walk never sees it');
  // A reload reads it again from storage: a new store over the same db.
  assert.deepEqual(await createNavStore(p).loadWayBack('w1'), [-71.42, 41.82], 'a reload keeps it');
  await nav.clearWayBack();
  assert.equal(await nav.loadWayBack('w1'), null, 'Stop clears it');
  await p.db.setMeta('way_back', '{not json');
  assert.equal(await nav.loadWayBack('w1'), null, 'unreadable is none');
  p.db.failNext('getMeta', new Error('disk'));
  assert.equal(await nav.loadWayBack('w1'), null, 'a failed read is none');
});

test('DW10: where the ride ended is never stored', { todo: 'test first' }, async () => {
  const { createNavStore } = await navShell();
  const nav = createNavStore(fakePorts());
  assert.deepEqual(Object.keys(nav).filter((k) => /landing|ride/i.test(k)), [], 'the store keeps no landing: it is read from the trace');
});
