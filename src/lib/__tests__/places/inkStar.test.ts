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
  assert.equal(starSpoken(star('Fox Point', 1)), 'Fox Point, one walk. Open');
  assert.equal(starSpoken(star('Fox Point', 2)), 'Fox Point, two walks. Open');
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

// tend places audit 1 (the UX review's U1): turned over, the selected star was the one hollow marker on the map, the
// reverse of the app's "filled is chosen" (the section bar). It stays an ink disc with its white star and white edge,
// and gains an ink ring outside that edge: ink, white, ink.
test('tend places audit 1: a selected star keeps its ink disc and white star, and gains an ink ring outside its white edge', () => {
  assert.doesNotMatch(view, /styles\.selected|selected \? theme\.ink/, 'nothing turns the disc or the glyph over');
  assert.match(view, /<Icon name="star" size=\{18\} color="#ffffff" \/>/, 'the star is white, selected or not');
  assert.match(view, /\{selected && <View testID="star-ring" style=\{styles\.ring\} \/>\}/, 'the ring is drawn only when selected');
  const ring = /\n  ring: \{([^}]*)\}/.exec(view)?.[1] ?? '';
  assert.match(ring, /backgroundColor: theme\.ink/, ring);
  assert.match(ring, /width: STAR_SIZE \+ 2 \* RING/, ring);
  assert.match(view, /const RING = 3;/, 'a 3 pt ring');
});

// tend places audit 4 (the review's F3): the source checks above let an orange from another token, a colour moved to
// another style, or a count drawn as `{String(star.count)}` through. The disc's own style is ink, and the star's only
// text is its name.
test('tend places audit 4: the disc\'s own style is ink, and the only text a star draws is its name', () => {
  const disc = /\n  star: \{([\s\S]*?)\n  \},/.exec(view)?.[1] ?? '';
  assert.match(disc, /backgroundColor: theme\.ink,/, disc);
  assert.equal((view.match(/backgroundColor:/g) ?? []).length, 2, 'two grounds only: the disc and the selected ring, both ink');
  assert.equal((view.match(/backgroundColor: theme\.ink/g) ?? []).length, 2, 'both ink');
  const texts = [...view.matchAll(/<Text\b[^>]*>([\s\S]*?)<\/Text>/g)].map((m) => m[1].trim());
  assert.deepEqual(texts, ['{star.label}'], 'one Text, the name');
});

// tend places audit 5 (the UX review's U3): a lone star said no action, where a pin says ". Open" and a merged star
// ". Zoom in"; a tap on it opens its walks in the sheet.
test('tend places audit 5: a lone star says ". Open" after its walks, as a pin does; a merged one still "Zoom in"', () => {
  assert.equal(starSpoken(star('Fox Point', 1)), 'Fox Point, one walk. Open');
  assert.equal(starSpoken(star('Elsewhere in Providence', 3)), 'Elsewhere in Providence, three walks. Open');
  assert.equal(starSpoken(star('Fox Point', 2, 2)), 'Two places, two walks. Zoom in');
});
