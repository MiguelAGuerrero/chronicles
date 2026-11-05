import assert from 'node:assert/strict';
import { test } from 'node:test';
import { budgetSteps, DEFAULT_BUDGET_M, DEFAULT_PREF, isPref, nearestStep, stepBudget } from '../../kindWalk/settings';

test('KW8: the default is about 2 km, in both units a step', () => {
  assert.equal(DEFAULT_BUDGET_M, 2000);
  assert.deepEqual(budgetSteps('km'), [1000, 1500, 2000, 3000, 5000]);
  assert.deepEqual(budgetSteps('mi').map((m) => Math.round((m / 1609.344) * 10) / 10), [0.5, 1, 1.5, 2, 3]);
  assert.equal(nearestStep(2000, 'mi'), budgetSteps('mi')[1], 'a 2 km budget read in miles is the nearest step, 1 mi');
});

test('KW8: shorter and longer move one step and stop at the ends', () => {
  assert.equal(stepBudget(2000, 1, 'km'), 3000);
  assert.equal(stepBudget(2000, -1, 'km'), 1500);
  assert.equal(stepBudget(1000, -1, 'km'), 1000);
  assert.equal(stepBudget(5000, 1, 'km'), 5000);
  assert.equal(stepBudget(2000, 1, 'mi'), budgetSteps('mi')[2], 'a km budget read in miles lands on the nearest step first');
});

test('KW11: the walkability setting defaults to warn', () => {
  assert.equal(DEFAULT_PREF, 'warn');
  assert.ok(isPref('skip') && isPref('warn') && !isPref('hide') && !isPref(null));
});
