import assert from 'node:assert/strict';
import test from 'node:test';

// Explore settings, ES4-ES5: the kinds panel and the Layers panel are never open together, and one Back, Escape or tap closes one thing.

const load = (path: string): Promise<any> => import(path); // eslint-disable-line @typescript-eslint/no-explicit-any

test('ES5: Back or Escape closes the kinds panel first, then the Layers panel, the long press\'s choices, the page', { todo: 'test first' }, async () => {
  const { pageBack } = await load('../../atlas/waitingPins');
  assert.equal(pageBack({ layersOpen: false, kindsOpen: true, spot: true }), 'kinds');
  assert.equal(pageBack({ layersOpen: true, kindsOpen: false, spot: true }), 'layers');
  assert.equal(pageBack({ layersOpen: false, kindsOpen: false, spot: true }), 'spot');
  assert.equal(pageBack({ layersOpen: false, kindsOpen: false, spot: false }), 'leave');
});

test('ES5: a tap on the map closes the kinds panel before anything else', { todo: 'test first' }, async () => {
  const { tapDoes } = await load('../../atlas/waitingPins');
  assert.equal(tapDoes({ panelOpen: false, kindsOpen: true, spot: true, dot: true }), 'close-panel');
  assert.equal(tapDoes({ panelOpen: true, kindsOpen: false, spot: false, dot: false }), 'close-panel');
  assert.equal(tapDoes({ panelOpen: false, kindsOpen: false, spot: true, dot: true }), 'clear-spot');
});

test('ES4: opening one panel closes the other', { todo: 'test first' }, async () => {
  const { panelsAfter } = await load('../../atlas/waitingPins');
  assert.deepEqual(panelsAfter({ layers: false, kinds: false }, 'kinds'), { layers: false, kinds: true });
  assert.deepEqual(panelsAfter({ layers: true, kinds: false }, 'kinds'), { layers: false, kinds: true });
  assert.deepEqual(panelsAfter({ layers: false, kinds: true }, 'layers'), { layers: true, kinds: false });
  assert.deepEqual(panelsAfter({ layers: false, kinds: true }, 'kinds'), { layers: false, kinds: false }, 'the button again closes it');
});
