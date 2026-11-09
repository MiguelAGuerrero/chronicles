import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hideTabs, tabsHidden } from '../../tabsHidden';

test('walk-planner audit 12: the tabs come back only when the last card lets go, in either order', () => {
  const card = hideTabs();
  const planner = hideTabs();
  assert.equal(tabsHidden.get(), true);
  planner();
  assert.equal(tabsHidden.get(), true, 'the card is still open under the planner');
  card();
  assert.equal(tabsHidden.get(), false);
  const a = hideTabs();
  const b = hideTabs();
  a();
  b();
  b();
  assert.equal(tabsHidden.get(), false, 'letting go twice changes nothing');
  const c = hideTabs();
  assert.equal(tabsHidden.get(), true);
  c();
});
