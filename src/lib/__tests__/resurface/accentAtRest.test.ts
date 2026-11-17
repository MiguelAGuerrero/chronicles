/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// Decision 0172, "The accent at rest": the accent is kept for a card's single primary action, app-wide; everything at
// rest is ink. It answers STATUS.md's "The accent at launch" (the vision review of Nov 10, item 4): "a label is ink;
// only a card's single primary action may keep the accent". The views import React Native, so they are read as text.

const components = join(__dirname, '..', '..', '..', 'components');
const read = (...p: string[]) => readFileSync(join(components, ...p), 'utf8');
const style = (src: string, name: string) => new RegExp(`\\b${name}:\\s*\\{[^}]*\\}`).exec(src)?.[0] ?? '';

test('tend chronicle 11: a thread\'s "Thread" label and its quotes\' rule are ink at rest, never the accent', () => {
  const found = read('chronicle', 'ThreadScreen.tsx');
  const made = read('threads', 'OwnThreadScreen.tsx');
  for (const [name, src] of [['ThreadScreen', found], ['OwnThreadScreen', made]] as const) {
    assert.match(style(src, 'eyebrow'), /color:\s*theme\.ink\b/, `${name}'s label: ${style(src, 'eyebrow')}`);
    assert.doesNotMatch(src, /theme\.accent\b/, `${name} draws nothing in the accent`);
  }
  assert.match(style(found, 'quote'), /borderLeftColor:\s*theme\.ink\b/, style(found, 'quote'));
});

// A memo's play disc on a moment's card is not a control: the card is one button that opens the moment (where the memo
// plays), so the disc only said "a voice memo" and was at rest. Since tend chronicle audit 6 there is no disc at all.
test('tend chronicle 12: a memo\'s mark on a moment card is never the accent', () => {
  const card = read('chronicle', 'MomentCard.tsx');
  assert.doesNotMatch(card, /theme\.accent/, 'MomentCard draws nothing in the accent');
});

// The owner's answer, Nov 17, to the review's U2 ("A mic glyph"): a filled disc with a triangle is the standard play
// button, and the card only opens the moment, so the card draws the memo's kind, not a control: a small ink mic with no
// disc, as a reaction's "Idea" is drawn on the same card, with "Voice memo, 0:42" beside it.
test('tend chronicle audit 6: a memo\'s card draws a small ink mic with no disc, never a play button', () => {
  const card = read('chronicle', 'MomentCard.tsx');
  const mic = /<Icon name="mic"[^>]*\/>/.exec(card)?.[0] ?? '';
  assert.match(mic, /size=\{16\}/, `the mic: ${mic}`);
  assert.match(mic, /color=\{theme\.ink\}/, `the mic: ${mic}`);
  assert.match(mic, /testID="moment-mic"/, `the mic carries a testID the e2e reads: ${mic}`);
  assert.doesNotMatch(card, /name="play"/, 'no play triangle on the card');
  assert.equal(style(card, 'play'), '', 'no disc style');
  assert.doesNotMatch(card, /moment-play/, 'no disc');
});
