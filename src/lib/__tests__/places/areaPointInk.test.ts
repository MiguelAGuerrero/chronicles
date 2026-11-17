/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// Decision 0172, "The accent at rest": the accent is kept for a card's single primary action, app-wide; everything at
// rest is ink. The selected area's dot and name on Explore's map mark a selection, not an action (a tap on the map never
// opens the area), so both are ink, as the selected card's border is (tend explore 9) and as every selection's line is
// (`areas/groundDraw.ts`). The view imports React Native, so it is read as text.

const view = readFileSync(join(__dirname, '..', '..', '..', 'components', 'AreaPoint.tsx'), 'utf8');
const style = (name: string) => new RegExp(`${name}:\\s*\\{[^}]*\\}`).exec(view)?.[0] ?? '';

test('tend explore 20: the selected area\'s name and dot on the map are ink at rest, never the accent', () => {
  assert.doesNotMatch(view, /theme\.accent/, 'AreaPoint draws nothing in the accent');
  assert.match(style('labelOn'), /color:\s*theme\.ink\b/, style('labelOn'));
  assert.match(style('dotOn'), /borderColor:\s*theme\.ink\b/, style('dotOn'));
});
