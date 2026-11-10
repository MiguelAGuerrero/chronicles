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

test('fix mark-names audit 1: the order the marks arrive in never changes which name hides', () => {
  const a = mark('a', [-75.4, 40.6], 'Da Vinci Science Center');
  const b = mark('b', [-75.39995, 40.60003], 'Cetronia PPL Pavilion');
  const hid = (l: ReturnType<typeof mark>[]) => declutterMarks(l, 18).filter((m) => m.nameHidden).map((m) => m.id);
  assert.deepEqual(hid([a, b]), ['b']);
  assert.deepEqual(hid([b, a]), ['b']);
});

test('fix mark-names audit 4: a found or faint mark never gets nameHidden', () => {
  const a = mark('a', [-75.4, 40.6], 'Da Vinci Science Center');
  const f = { ...mark('b', [-75.4, 40.6], 'Found'), found: true };
  assert.ok(declutterMarks([a, f], 18).every((m) => !m.nameHidden));
});
