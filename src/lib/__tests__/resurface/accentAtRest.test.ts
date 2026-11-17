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
