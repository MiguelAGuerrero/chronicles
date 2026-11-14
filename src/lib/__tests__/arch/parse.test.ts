import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tryJson, tryUrl } from '../../parse';

// Errors as values in core (errors-handled, EH5, decision 0179): a parse that fails says why, it never throws.

test('EH5 tryJson and tryUrl return the value, or the failure as a value', () => {
  assert.deepEqual(tryJson('{"a":1}'), { ok: true, value: { a: 1 } });
  const bad = tryJson('{');
  assert.equal(bad.ok, false);
  assert.ok(!bad.ok && bad.error.length > 0);
  const u = tryUrl('https://example.org/x');
  assert.ok(u.ok && u.value.host === 'example.org');
  assert.equal(tryUrl('not a url').ok, false);
});
