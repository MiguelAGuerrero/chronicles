import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RESPOND_GAP, respondLift } from '../../threads/respondLift';

const phone = { window: 568, topClear: 136, bar: 48 };

test('fix respond-bottom: Respond stands just above the moment it answers', () => {
  assert.equal(respondLift({ ...phone, foot: 114, keyboard: 0 }), 114 + RESPOND_GAP);
});

test('fix respond-bottom audit 1: a long note never lifts Respond over the top buttons or off the screen', () => {
  const lift = respondLift({ ...phone, foot: 600, keyboard: 0 });
  assert.equal(lift, phone.window - phone.topClear - phone.bar);
  assert.ok(phone.window - lift - phone.bar >= phone.topClear);
});

test('fix respond-bottom audit 2: with the keyboard up, the lift is the higher of the moment and the keyboard, not their sum', () => {
  assert.equal(respondLift({ ...phone, foot: 114, keyboard: 260 }), 260 + RESPOND_GAP);
  assert.equal(respondLift({ ...phone, foot: 300, keyboard: 260 }), 300 + RESPOND_GAP);
});

test('fix respond-bottom audit 2: the note being written stays above the keyboard even where that passes the top buttons', () => {
  const bar = 160;
  assert.equal(respondLift({ ...phone, bar, foot: 500, keyboard: 300 }), 300 + RESPOND_GAP);
});
