/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Star } from '../../places';
import { starSpoken } from '../../quietLines';

// tend places T15 (the owner's reshape, decision 0154: "Ink star, no numeral"): a walked place keeps its star (0019),
// drawn in ink rather than the accent, one size; a merged star draws no numeral, and its spoken name says its places
// and walks in words (VISION.md, Always, "Counts are words"; Never, "accent-coloured wins").

const star = (label: string, walks: number, count = 1): Star => ({
  id: label, label, at: [0, 0], walkIds: Array.from({ length: walks }, (_, i) => `w${i}`), count, keys: [label], points: [[0, 0]],
});

test('tend places T15: a star says its walks in words, a merged one its places too, and no digit', () => {
  assert.equal(starSpoken(star('Fox Point', 1)), 'Fox Point, one walk');
  assert.equal(starSpoken(star('Fox Point', 2)), 'Fox Point, two walks');
  assert.equal(starSpoken(star('Fox Point', 2, 2)), 'Two places, two walks. Zoom in');
  assert.equal(starSpoken(star('Fox Point', 1, 3)), 'Three places, one walk. Zoom in');
  assert.equal(starSpoken(star('Fox Point', 75, 61)), 'Many places, many walks. Zoom in');
  for (const s of [star('Fox Point', 12), star('Wickenden', 23, 4), star('Elsewhere in Providence', 1)]) {
    assert.doesNotMatch(starSpoken(s), /\d/, starSpoken(s));
  }
});

// The view imports React Native, so it is read as text, as `pinNamesWrap.test.ts` reads it.
const view = readFileSync(join(__dirname, '..', '..', '..', 'components', 'StarView.tsx'), 'utf8');

test('tend places T15: the star is drawn in ink, never the accent, and a merged star draws no numeral', () => {
  assert.doesNotMatch(view, /theme\.accent|COLORS\.walked|#c2410c/i, 'no accent in the star');
  assert.match(view, /backgroundColor: theme\.ink/, 'the star is ink');
  assert.doesNotMatch(view, /\{\s*star\.count\s*\}|star\.count\s*>/, 'no numeral, and no other drawing for a merged star');
  // Both maps name the star through the one spoken name.
  assert.match(view, /starSpoken/, 'the maps\' starLabel is starSpoken');
});

test('tend places T15: a selected star stays told apart on its ink: inverted, white with an ink ring and an ink star', () => {
  const selected = /selected:\s*\{([^}]*)\}/.exec(view)?.[1] ?? '';
  assert.match(selected, /backgroundColor: '#ffffff'/, selected);
  assert.match(selected, /borderColor: theme\.ink/, selected);
  assert.match(view, /color=\{selected \? theme\.ink : '#ffffff'\}/, 'the glyph turns ink on the white');
});
