import assert from 'node:assert/strict';
import test from 'node:test';
import { pageBack } from '../../atlas/waitingPins';

// tend explore audit 1: on a town's page, the page stopped claiming Back while the Layers panel was open, trusting the panel
// to close itself; it does so only on the web (LayersControl listens for Escape there), so on Android Back left Explore.
// The page's Back and Escape now decide in one place: the panel first, then the long press's choices, then the page.

test('tend explore audit 1: Back with the Layers panel open closes the panel, whatever else is open', () => {
  assert.equal(pageBack({ layersOpen: true, spot: false }), 'layers');
  assert.equal(pageBack({ layersOpen: true, spot: true }), 'layers');
});

test('tend explore audit 1: then the long press\'s choices, and only then the page (tend explore 6)', () => {
  assert.equal(pageBack({ layersOpen: false, spot: true }), 'spot');
  assert.equal(pageBack({ layersOpen: false, spot: false }), 'leave');
});
