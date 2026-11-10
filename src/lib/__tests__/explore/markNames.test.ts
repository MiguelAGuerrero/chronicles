import assert from 'node:assert/strict';
import { test } from 'node:test';
import { declutterMarks } from '../../markNames';

const mark = (id: string, at: [number, number], name: string) => ({ id, at, name, revealed: true });

test('fix mark-names: two names that would stack show one; apart, both', () => {
  const a = mark('a', [-75.4, 40.6], 'Da Vinci Science Center');
  const b = mark('b', [-75.39995, 40.60003], 'Cetronia PPL Pavilion');
  const far = mark('c', [-75.39, 40.6], 'Far Place');
  const out = declutterMarks([a, b, far], 18);
  assert.deepEqual(out.map((m) => !!m.nameHidden), [false, true, false]);
 
});
