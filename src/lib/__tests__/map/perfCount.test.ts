import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { perfCount } from '../../perfCount';

// Opt-in counters for the long-walk harness (specs/shells-saved-settings, SH8).

const g = globalThis as { __perf?: Record<string, number> };
afterEach(() => { delete g.__perf; });

test('SH8 counts only when the page asked', () => {
  delete g.__perf;
  perfCount('render');
  assert.equal(g.__perf, undefined, 'no counters asked for: nothing is made');
  g.__perf = {};
  perfCount('render');
  perfCount('render');
  perfCount('setData');
  assert.deepEqual(g.__perf, { render: 2, setData: 1 });
});
