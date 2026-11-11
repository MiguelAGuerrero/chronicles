/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const SRC = join(__dirname, '../../..');

test('tend tabs audit 5: every "?" range line says its distance as the slider beside it does (formatRange), never a bare "m"', () => {
  // The walk screen's options card and the ready bar's settings both say "A “?” shows for places within … of you"
  // above a RangeSlider that reads formatRange: in miles a line in metres sat beside a slider in feet (QL14).
  for (const file of ['app/walk.tsx', 'components/StartSettings.tsx']) {
    const text = readFileSync(join(SRC, file), 'utf8');
    assert.ok(text.includes('within {formatRange(settings.rangeM)} of you'), `${file} says the range through formatRange`);
    assert.ok(!/within \{settings\.rangeM\} m of you/.test(text), `${file} has no range line in bare metres`);
  }
});
