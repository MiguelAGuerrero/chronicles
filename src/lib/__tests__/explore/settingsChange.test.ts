/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Kind } from '../../discovery/types';
import type { ExploreSettings } from '../../explore/settings';

// What I'm into, its own page (specs/what-im-into-page WI9): a switch on the page changes the kinds and nothing else, and
// nothing is saved before the settings are read.

type Change = { withKind: (s: ExploreSettings | null, kind: Kind, on: boolean) => ExploreSettings | null };
const change = async () => (await import('../../explore/settingsChange')) as Change;

test('WI9: before the settings are read a switch saves nothing; after, it keeps the range and the pocket alert', async () => {
  const { withKind } = await change();
  assert.equal(withKind(null, 'churches', false), null, 'nothing to save before the settings are loaded');
  const loaded: ExploreSettings = { hidden: new Set<Kind>(['ghost_towns']), rangeM: 180, haptic: true };
  const off = withKind(loaded, 'churches', false)!;
  assert.deepEqual([...off.hidden].sort(), ['churches', 'ghost_towns']);
  assert.equal(off.rangeM, 180);
  assert.equal(off.haptic, true);
  assert.deepEqual([...loaded.hidden], ['ghost_towns'], 'the loaded copy is not changed in place');
  const on = withKind(off, 'ghost_towns', true)!;
  assert.deepEqual([...on.hidden], ['churches']);
  assert.equal(on.rangeM, 180);
  assert.equal(on.haptic, true);
});
