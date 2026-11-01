/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gpsLog } from '../gpsLog';
import type { Capture, TracePoint } from '../types';

const T0 = Date.UTC(2026, 10, 1, 15, 0, 0);
const p = (s: number, acc: number | null, speed: number | null = null): TracePoint => ({ walk_id: 'w', t: T0 + s * 1000, lat: 41.812, lon: -71.4 + s * 1e-5, accuracy_m: acc, speed, course: null });

test('gps log: every raw reading, in time order, with accuracy and speed', () => {
  const text = gpsLog({ startedAt: T0, points: [p(2, 65), p(1, 12.34, 0.5)] });
  const rows = text.split('\n');
  assert.ok(rows[0].includes('2026-11-01T15:00:00.000Z') && rows[0].includes('2 readings'));
  assert.equal(rows[1], 's,lat,lon,accuracy_m,speed_ms,course');
  assert.equal(rows[2], '1.0,41.812000,-71.399990,12.3,0.50,');
  // A reading the filters would drop (65 m) is still in the log: it's the raw record.
  assert.equal(rows[3], '2.0,41.812000,-71.399980,65.0,,');
});

test('gps log: captures are listed with where they were placed', () => {
  const c = { id: 'c', walk_id: 'w', t: T0 + 5000, lat: 41.8121, lon: -71.4001, kind: 'photo' } as Capture;
  const text = gpsLog({ startedAt: T0, points: [p(1, 10)], captures: [c] });
  assert.ok(text.endsWith('# 5.0,41.812100,-71.400100,photo'));
});
