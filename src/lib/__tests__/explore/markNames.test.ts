import assert from 'node:assert/strict';
import { test } from 'node:test';
import { declutterMarks } from '../../markNames';

const mark = (id: string, at: [number, number], name: string) => ({ id, at, name, revealed: true });

// 60 px apart at z18: the heads stand clear of each other (fix mark-overlap), the names below would stack.
const BESIDE = -75.4 + 60 / ((512 * 2 ** 18) / 360);

test('fix mark-names: two names that would stack show one; apart, both', () => {
  const a = mark('a', [-75.4, 40.6], 'Da Vinci Science Center');
  const b = mark('b', [BESIDE, 40.6], 'Cetronia PPL Pavilion');
  const far = mark('c', [-75.39, 40.6], 'Far Place');
  const out = declutterMarks([a, b, far], 18);
  assert.deepEqual(out.map((m) => !!m.nameHidden), [false, true, false]);
 
});

test('fix mark-names audit 1: the order the marks arrive in never changes which name hides', () => {
  const a = mark('a', [-75.4, 40.6], 'Da Vinci Science Center');
  const b = mark('b', [BESIDE, 40.6], 'Cetronia PPL Pavilion');
  const hid = (l: ReturnType<typeof mark>[]) => declutterMarks(l, 18).filter((m) => m.nameHidden).map((m) => m.id);
  assert.deepEqual(hid([a, b]), ['b']);
  assert.deepEqual(hid([b, a]), ['b']);
});

// A found mark was small and nameless, so it never hid a name; since capture-at-a-place ui 5 (the owner, Nov 20: "Drawn
// with its name") it writes its name, and two names that would stack show one, as any two do. A faint mark still has none.
test('fix mark-names audit 4: a faint mark never gets nameHidden', () => {
  const a = mark('a', [-75.4, 40.6], 'Da Vinci Science Center');
  const w = { ...mark('b', [-75.4, 40.6], 'On the way'), faint: true };
  assert.ok(declutterMarks([a, w], 18).every((m) => !m.nameHidden));
});

test('capture-at-a-place ui 5: a found mark writes its name, and two that would stack show one', () => {
  const a = mark('a', [-75.4, 40.6], 'Da Vinci Science Center');
  const f = { ...mark('b', [BESIDE, 40.6], 'Cetronia PPL Pavilion'), found: true };
  const out = declutterMarks([a, f], 18);
  assert.deepEqual(out.map((m) => !!m.nameHidden), [false, true]);
  assert.ok(declutterMarks([{ ...f, at: [-75.39, 40.6] as [number, number] }], 18).every((m) => !m.nameHidden), 'alone, its name shows');
});
