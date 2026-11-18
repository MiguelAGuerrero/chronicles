/// <reference types="node" />
// A delete's confirm keeps its two actions whole on a 320 px phone: side by side where they fit, stacked below
// about 340 px as both platforms' alerts stack them (tend deletion 1; .claude/rules/ui-patterns.md, "Nothing wraps
// on a 320 px phone at the default text size"; HIG Alerts, "Cancel buttons are typically on the leading side of a
// row or at the bottom of a stack"; Material, "Confirming actions appear above dismissive actions").
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONFIRM_STACK_BELOW, confirmActions } from '../../deletion/core';

test('tend deletion 1: below about 340 px the confirm stacks its actions, the confirm on top and Cancel beneath', () => {
  assert.equal(CONFIRM_STACK_BELOW, 340);
  assert.deepEqual(confirmActions(320), { stacked: true, order: ['confirm', 'cancel'] });
  assert.deepEqual(confirmActions(339), { stacked: true, order: ['confirm', 'cancel'] });
  // Where a row holds "Delete walk" on one line, the row stays: Cancel leading, the confirm trailing.
  assert.deepEqual(confirmActions(340), { stacked: false, order: ['cancel', 'confirm'] });
  assert.deepEqual(confirmActions(390), { stacked: false, order: ['cancel', 'confirm'] });
});
