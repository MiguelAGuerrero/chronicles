/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// Decision 0172, "The accent at rest": the accent is kept for a card's single primary action, app-wide; everything at
// rest is ink. The area card's "How the marks work" is a toggle that shows a panel of explanation, not the card's
// primary action (its kind rows' Suggest a walk are the card's actions), so it and its icon are ink.
// The card imports React Native, so it is read as text, as `places/mergedStar.test.ts` reads StarView.

const card = readFileSync(join(__dirname, '..', '..', '..', 'components', 'atlas', 'AtlasCard.tsx'), 'utf8');

test('tend explore 19: "How the marks work" and its icon are ink at rest, never the accent', () => {
  const how = /howText:\s*\{[^}]*\}/.exec(card)?.[0] ?? '';
  assert.match(how, /color:\s*theme\.ink\b/, `the label's style: ${how}`);
  const icon = /<Icon name="information-circle-outline"[^>]*\/>/.exec(card)?.[0] ?? '';
  assert.match(icon, /color=\{theme\.ink\}/, `the icon: ${icon}`);
});
