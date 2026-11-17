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

// The review's U7: two dismissals kept the accent, Explore's "Cancel" while it looks around and the place search's close
// word. A dismissal is never a card's single primary action (the owner's O3 sent even a footer link to ink), so both are
// ink. The screen and the sheet import React Native, so they are read as text.
const explore = readFileSync(join(__dirname, '..', '..', '..', 'app', '(tabs)', 'explore.tsx'), 'utf8');
const search = readFileSync(join(__dirname, '..', '..', '..', 'components', 'atlas', 'PlaceSearch.tsx'), 'utf8');

test('tend explore audit 22: "Cancel" while Explore looks and the search\'s close word are ink at rest, never the accent', () => {
  const cancel = /scanCancelText:\s*\{[^}]*\}/.exec(explore)?.[0] ?? '';
  assert.match(cancel, /color:\s*theme\.ink\b/, `Cancel: ${cancel}`);
  const close = /closeText:\s*\{[^}]*\}/.exec(search)?.[0] ?? '';
  assert.match(close, /color:\s*theme\.ink\b/, `the search's close: ${close}`);
});
