import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWalkLog } from '../../shareLog/shell';
import type { Capture } from '../../types';
import { fakePorts } from '../fakes';
import { at } from '../foxPoint';

// A walk's GPS log from storage (specs/test-gaps, TD4).

test('TD4 the log holds every raw reading and the placed captures, and names the device', async () => {
  const p = fakePorts();
  const started = 1_000_000;
  const fix = (t: number, x: number, accuracy_m: number) => ({ walk_id: 'w1', t, lon: at(x, 0)[0], lat: at(x, 0)[1], accuracy_m, speed: 1.4, course: null });
  // A wild reading too: the log keeps what the gates would drop.
  await p.db.appendPoints([fix(started + 1000, 0, 6), fix(started + 2000, 0.01, 6), fix(started + 3000, 5, 120)]);
  const c: Capture = { id: 'c1', walk_id: 'w1', t: started + 2500, kind: 'text', file_path: null, body: 'hi', segment_id: null, lat: at(0.01, 0)[1], lon: at(0.01, 0)[0] };
  await p.db.addCapture(c);
  const text = await createWalkLog(p, () => 'test-device 1.0').walkLogText('w1', started);
  const rows = text.split('\n');
  assert.match(rows[0], /^# Chronicles GPS log/);
  assert.ok(text.includes('test-device 1.0'), 'the device is named');
  assert.equal(rows.filter((r) => /^\d+\.\d,/.test(r)).length, 3, 'every raw reading, the 120 m one too');
  assert.ok(rows.some((r) => r.startsWith('1.0,')) && rows.some((r) => r.startsWith('3.0,')), 'seconds from the walk\'s start');
  assert.ok(/capture|note|text/i.test(text) && text.includes('2.5'), 'the placed capture, at its time');
});
