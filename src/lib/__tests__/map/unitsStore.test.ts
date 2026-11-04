import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { getUnits, setUnits } from '../../units';
import { createUnitsStore, UNITS_KEY } from '../../unitsStore/shell';
import { fakePorts } from '../fakes';

// The units setting, saved in meta (QL13, QL16), as a shell over fakes (specs/shells-saved-settings, SH1).

afterEach(() => setUnits('km'));

test('SH1 a saved setting applies at launch', async () => {
  const p = fakePorts();
  await p.db.setMeta(UNITS_KEY, 'mi');
  setUnits('km');
  await createUnitsStore(p, () => 'en-CA').loadUnits();
  assert.equal(getUnits(), 'mi');
});

test('SH1 none saved, or a failed read: the region\'s default', async () => {
  const p = fakePorts();
  setUnits('km');
  await createUnitsStore(p, () => 'en-US').loadUnits();
  assert.equal(getUnits(), 'mi', 'en-US defaults to miles');
  await createUnitsStore(p, () => 'en-CA').loadUnits();
  assert.equal(getUnits(), 'km', 'en-CA to kilometres');
  // A stored value that isn't a unit is ignored too.
  await p.db.setMeta(UNITS_KEY, 'furlongs');
  await createUnitsStore(p, () => 'en-US').loadUnits();
  assert.equal(getUnits(), 'mi');
  // A read that fails falls back the same way, and never throws.
  p.db.failNext('getMeta', new Error('disk'));
  setUnits('km');
  await createUnitsStore(p, () => 'en-US').loadUnits();
  assert.equal(getUnits(), 'mi');
});

test('SH1 a save shows at once, and a failed write still shows', async () => {
  const p = fakePorts();
  const units = createUnitsStore(p, () => 'en-CA');
  setUnits('km');
  const saving = units.saveUnits('mi');
  assert.equal(getUnits(), 'mi', 'the store changed before the write finished');
  await saving;
  assert.equal(await p.db.getMeta(UNITS_KEY), 'mi', 'and the setting is kept');
  p.db.failNext('setMeta', new Error('disk'));
  await assert.rejects(units.saveUnits('km'), /disk/);
  assert.equal(getUnits(), 'km', 'the screen shows what was picked even when the write failed');
});
