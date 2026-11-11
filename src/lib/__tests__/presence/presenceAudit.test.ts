import assert from 'node:assert/strict';
import test from 'node:test';
import { LANDING_RULES } from '../../landing/analyze';
import { isStale, LANDING_CODE, LANDING_VERSION, rulesCurrent, type LandingRow } from '../../landing/view';

// presence audit 1: PR6 put PRESENCE_CODE into LANDING_VERSION, so every area remembered before the slice dropped out of
// the Busy layer and said "Analyzed before an update" though presence p1 changed no density weight (PR4, PR8). A row
// from just before presence stands; one from an older landing code does not.

const before = `${LANDING_CODE}:${JSON.stringify(LANDING_RULES)}`;
const row = (rules: string): LandingRow => ({ key: 'k', centre: [-75.47, 40.6], analysis: { basis: 'density', reason: 'Busiest area', pockets: [], strips: [], graded: [], landing: null } as never, build: 'b1', rules, analyzed_at: 0, overture: null });

test('presence audit 1: a landing row from before presence still lists and is not stale', () => {
  assert.notEqual(before, LANDING_VERSION, 'the version did change (PR6)');
  assert.equal(rulesCurrent(before), true);
  assert.equal(isStale(row(before), 'b1'), false);
  assert.equal(rulesCurrent(LANDING_VERSION), true);
});

test('presence audit 1: an older landing code is still stale', () => {
  const older = `l3:${JSON.stringify(LANDING_RULES)}`;
  assert.equal(rulesCurrent(older), false);
  assert.equal(isStale(row(older), 'b1'), true);
});
