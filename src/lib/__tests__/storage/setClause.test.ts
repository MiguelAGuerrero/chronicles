import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setClause } from '../../db/setClause';

// UPDATE … SET from a patch, out of sqliteStore.ts (refactor storage 1, R1; paying back errors-handled's import line).

test('refactor storage 1: only known columns reach the SQL, in the patch\'s order, booleans as 1 and 0', () => {
  assert.deepEqual(setClause({ name: 'a', bad: 'x', done: true, n: 2, off: false }, ['name', 'done', 'n', 'off']), { sql: 'name = ?, done = ?, n = ?, off = ?', values: ['a', 1, 2, 0] });
  assert.deepEqual(setClause({}, ['name']), { sql: '', values: [] });
});
