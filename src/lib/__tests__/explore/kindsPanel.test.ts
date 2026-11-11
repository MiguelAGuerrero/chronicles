import assert from 'node:assert/strict';
import test from 'node:test';

// Explore settings, ES4-ES5: the kinds panel and the Layers panel are never open together, and one Back, Escape or tap closes one thing.

const load = (path: string): Promise<any> => import(path);

test('ES5: Back or Escape closes the kinds panel first, then the Layers panel, the long press\'s choices, the page', async () => {
  const { pageBack } = await load('../../atlas/waitingPins');
  assert.equal(pageBack({ layersOpen: false, kindsOpen: true, spot: true }), 'kinds');
  assert.equal(pageBack({ layersOpen: true, kindsOpen: false, spot: true }), 'layers');
  assert.equal(pageBack({ layersOpen: false, kindsOpen: false, spot: true }), 'spot');
  assert.equal(pageBack({ layersOpen: false, kindsOpen: false, spot: false }), 'leave');
});

test('ES5: a tap on the map closes the kinds panel before anything else', async () => {
  const { tapDoes } = await load('../../atlas/waitingPins');
  assert.equal(tapDoes({ panelOpen: false, kindsOpen: true, spot: true, dot: true }), 'close-panel');
  assert.equal(tapDoes({ panelOpen: true, kindsOpen: false, spot: false, dot: false }), 'close-panel');
  assert.equal(tapDoes({ panelOpen: false, kindsOpen: false, spot: true, dot: true }), 'clear-spot');
});

test('ES4: opening one panel closes the other', async () => {
  const { panelsAfter } = await load('../../atlas/waitingPins');
  assert.deepEqual(panelsAfter({ layers: false, kinds: false }, 'kinds'), { layers: false, kinds: true });
  assert.deepEqual(panelsAfter({ layers: true, kinds: false }, 'kinds'), { layers: false, kinds: true });
  assert.deepEqual(panelsAfter({ layers: false, kinds: true }, 'layers'), { layers: true, kinds: false });
  assert.deepEqual(panelsAfter({ layers: false, kinds: true }, 'kinds'), { layers: false, kinds: false }, 'the button again closes it');
});

test('explore-settings audit 1: Back belongs to Explore while the kinds panel is open, on the page near you too', async () => {
  const { claimsBack } = await load('../../atlas/waitingPins');
  assert.equal(claimsBack({ townPage: false, kindsOpen: true }), true, 'near you, a panel open: Back closes it');
  assert.equal(claimsBack({ townPage: false, kindsOpen: false }), false, 'near you, nothing open: Back leaves the tab as before');
  assert.equal(claimsBack({ townPage: true, kindsOpen: false }), true, 'a town\'s page claims it, as before');
});
