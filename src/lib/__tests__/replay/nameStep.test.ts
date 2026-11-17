/// <reference types="node" />
// The first replay's name step and its ways out: a quiet Back to the card with the words kept (tend replay T21,
// decision 0165), read through the same decision as Android's Back and the web's Escape (tend replay 4, 5).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { backFrom, wordsTyped } from '../../replay';
import type { Walk } from '../../types';
import { suggestTitle } from '../../walkTitle';

const SCREEN = readFileSync(join(__dirname, '../../../app/replay/[id].tsx'), 'utf8');
const walk = (over: Partial<Walk> = {}): Walk => ({
  id: 'w', started_at: new Date(2026, 10, 3, 18, 30).getTime(), ended_at: new Date(2026, 10, 3, 19).getTime(),
  title: 'Old title', epilogue: 'Old line', open: false, area: 'Fox Point', snapped_build: null, ...over,
});
/** The JSX of the control with this testID, from its opening tag to its closing one. */
const control = (id: string, tag = 'Pressable') => new RegExp(`<${tag}\\s+testID="${id}"[\\s\\S]*?</${tag}>`).exec(SCREEN)?.[0] ?? '';

test('tend replay T21: the name sheet has a quiet Back that returns to the card with the words kept, as Back and Escape do', () => {
  assert.equal(backFrom('name'), 'card');
  const back = control('name-back');
  // One quiet text control in the card's "Not now" style, no new colour or words (decision 0165).
  assert.match(back, /accessibilityRole="button"/);
  assert.match(back, /onPress=\{stepBack\}/, "the Back control goes where Android's Back and Escape go");
  assert.match(back, /styles\.notNow\b|styles\.nameBack\b/);
  assert.match(back, /<Text style=\{styles\.notNowText\}>Back<\/Text>/);
  // It stands in the name sheet's top row, above its first field.
  const sheet = SCREEN.slice(SCREEN.indexOf('testID="name-back"') - 400, SCREEN.indexOf('testID="title-input"'));
  assert.ok(sheet.includes(') : (') && SCREEN.indexOf('testID="name-back"') < SCREEN.indexOf('nativeID="title-label"'), 'Back is the name sheet\'s top row');
  // One way back, read once: the control, Android's Back and Escape all go through stepBack, and it asks backFrom.
  assert.match(SCREEN, /const stepBack = useCallback\([\s\S]{0,200}?backFrom\(beatNow\.current/);
  assert.equal((SCREEN.match(/\bstepBack\(\)/g) ?? []).length, 2, "Android's Back and Escape call stepBack");
  // The words live in the screen, not in the sheet, so going back to the card keeps them.
  assert.match(SCREEN, /const \[title, setTitle\] = useState/);
});

// The owner's answer, Nov 16, in person ("Ask there too"; decision 0172, O17): leaving the first replay with words typed
// in Name it asks "Discard these edits?", with Keep editing and Discard, as Rename asks since tend chronicle 9.
test('tend replay 15: leaving the first replay with words typed asks first; while it asks, Back and Escape keep editing', () => {
  for (const beat of ['reading', 'fog', 'path', 'card']) {
    assert.equal(backFrom(beat, { typed: true }), 'ask', beat);
    assert.equal(backFrom(beat, { typed: false }), 'leave', beat);
    assert.equal(backFrom(beat), 'leave', beat);
  }
  assert.equal(backFrom('name', { typed: true }), 'card', 'the name step still goes back to its card, the words kept');
  for (const beat of ['name', 'card']) assert.equal(backFrom(beat, { typed: true, asking: true }), 'keep-editing', beat);
});

test('tend replay 15: words typed are words Keep it would store otherwise; unchanged or empty words leave at once', () => {
  const bare = walk({ title: null, epilogue: null });
  const offered = suggestTitle(bare);
  assert.equal(wordsTyped(bare, 'Plums', '', offered), true);
  assert.equal(wordsTyped(bare, offered, 'The bakery was closed', offered), true);
  // The suggestion as it was offered, with or without spaces, or both fields emptied: nothing of the person's.
  assert.equal(wordsTyped(bare, offered, '', offered), false);
  assert.equal(wordsTyped(bare, ` ${offered} `, ' ', offered), false);
  assert.equal(wordsTyped(bare, '', '', offered), false);
  assert.equal(wordsTyped(bare, '  ', '\n', offered), false);
  // The suggestion offered when the field was filled, though the walk's area moved since (a gap kept on the card).
  const moved = { ...bare, area: 'Wayland Square' };
  assert.notEqual(suggestTitle(moved), offered);
  assert.equal(wordsTyped(moved, offered, '', offered), false);
  // A named walk (renamed from the card's More): its own words as they were leave at once, and so do empty fields.
  const named = walk();
  assert.equal(wordsTyped(named, 'Old title', 'Old line', null), false);
  assert.equal(wordsTyped(named, '', '', null), false);
  assert.equal(wordsTyped(named, 'Old title, then plums', 'Old line', null), true);
});

test('tend replay 15: the screen asks with the words as they stand, in Rename\'s words, and Done while it asks is Keep editing', () => {
  // The way back reads the words typed (as Keep it would store them) and whether the ask is up.
  assert.match(SCREEN, /wordsTyped\(data\.walk, title, epilogue, offered\)/);
  assert.match(SCREEN, /backFrom\(beatNow\.current, wordsNow\.current\)/);
  // The ask stands in Keep it's place, with the fields and their words above it, as Rename's does (tend chronicle 9).
  const ask = control('name-ask', 'View');
  assert.match(ask, /Discard these edits\?/);
  assert.match(ask, /label="Keep editing"[^>]*onPress=\{keepEditing\}/);
  assert.match(ask, /label="Discard"[^>]*onPress=\{toChronicle\}/);
  assert.match(SCREEN, /\{asking \? \(\s*\/\/[^\n]*\n\s*<View\s+testID="name-ask"/);
  assert.match(SCREEN, /const keepEditing = \(\) => setAsking\(false\)/);
  // A phone's Done (the web's Enter) in the line while the ask shows is Keep editing, never a hidden save (as tend
  // chronicle audit 5).
  const line = /testID="epilogue-input"[\s\S]*?\/>/.exec(SCREEN)?.[0] ?? '';
  assert.match(line, /onSubmitEditing=\{asking \? keepEditing : save\}/);
  // While it asks, the ask's two answers are the only ways on: no Back beside them.
  assert.match(SCREEN, /\{!asking && \(\s*(\{\/\*[\s\S]*?\*\/\}\s*)?<Pressable\s+testID="name-back"/);
});
