import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOutingPrefs } from '../../outing/prefs';
import { fakePorts } from '../fakes';

test('QC41: Include chains is off by default and read from meta when the page opens', async () => {
  const ports = fakePorts();
  const prefs = createOutingPrefs(ports);
  assert.equal(prefs.store.get().chains, false, 'off before anything is read');
  await prefs.load();
  assert.equal(prefs.store.get().chains, false, 'off with nothing kept');
  await ports.db.setMeta('outing_chains', '1');
  await prefs.load();
  assert.equal(prefs.store.get().chains, true);
});

test('QC41: the switch changes the store at once and is kept in outing_chains, the outing\'s only key', async () => {
  const ports = fakePorts();
  const prefs = createOutingPrefs(ports);
  await prefs.setChains(true);
  assert.equal(prefs.store.get().chains, true);
  assert.equal(await ports.db.getMeta('outing_chains'), '1');
  await prefs.setChains(false);
  assert.equal(await ports.db.getMeta('outing_chains'), '0');
  assert.equal(await ports.db.getMeta('kindwalk_mode'), null, 'none of the planner\'s settings is written');
});

test('QC41: a failed write leaves the switch changed on screen and throws nothing', async () => {
  const ports = fakePorts();
  const prefs = createOutingPrefs(ports);
  ports.db.failNext('setMeta');
  await prefs.setChains(true);
  assert.equal(prefs.store.get().chains, true);
});
