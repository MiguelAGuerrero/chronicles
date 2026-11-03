/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { byMonth } from '../months';

// Quality of life round 3 (QL28): month headers in the walks list, written from
// the criteria before the code. Times are local dates, so the month edges hold
// in any time zone; labels are compared with the same locale call as the code.

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m, d, h, min).getTime();
const w = (id: string, started_at: number) => ({ id, started_at });
const NOW = at(2026, 10, 3, 9);
const month = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'long' });
const monthYear = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

test('QL28: no walks, no headers', () => {
  assert.deepEqual(byMonth([], NOW), []);
});

test('QL28: walks group by the local month they started, newest month first, newest walk first', () => {
  const walks = [
    w('oct', at(2026, 9, 12)),
    w('nov1', at(2026, 10, 1, 8)),
    w('sep', at(2026, 8, 30)),
    w('nov3', at(2026, 10, 3, 7)),
  ];
  const groups = byMonth(walks, NOW);
  assert.deepEqual(groups.map((g) => g.walks.map((x) => x.id)), [['nov3', 'nov1'], ['oct'], ['sep']]);
  assert.equal(new Set(groups.map((g) => g.key)).size, 3);
});

test('QL28: midnight edges are local', () => {
  const groups = byMonth([w('last', at(2026, 9, 31, 23, 59)), w('first', at(2026, 10, 1, 0, 0))], NOW);
  assert.deepEqual(groups.map((g) => g.walks.map((x) => x.id)), [['first'], ['last']]);
});

test('QL28: the current year says the month alone, another year adds the year', () => {
  const groups = byMonth([w('now', at(2026, 10, 2)), w('jan', at(2026, 0, 5)), w('old', at(2025, 10, 20))], NOW);
  assert.deepEqual(groups.map((g) => g.label), [month(at(2026, 10, 2)), month(at(2026, 0, 5)), monthYear(at(2025, 10, 20))]);
  // The same month a year apart is two headers.
  assert.notEqual(groups[0].label, groups[2].label);
});

test('QL28: a month with no walk has no header', () => {
  const groups = byMonth([w('nov', at(2026, 10, 2)), w('aug', at(2026, 7, 2))], NOW);
  assert.equal(groups.length, 2);
});

test('QL28: the walks keep their own objects', () => {
  const a = { started_at: at(2026, 10, 2), extra: 1 };
  assert.equal(byMonth([a], NOW)[0].walks[0], a);
});
