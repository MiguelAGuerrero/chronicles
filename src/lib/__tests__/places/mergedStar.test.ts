/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { starGlyphs, type Star } from '../../places';

// tend map 14 (decision 0172, O14): since tend places T15 a merged star drew no numeral, so it looked like a lone star
// left unnamed, and a tap that zooms in looked like one that opens a place. The owner's answer: two stars fanned in the
// one disc, as a pin of several shows two discs (tend map T14); no numeral, one size (decision 0154 kept).

const star = (count: number): Pick<Star, 'count'> => ({ count });

test('tend map 14: a merged star draws two stars in its disc, a lone place one, never more', () => {
  assert.equal(starGlyphs(star(1)), 1);
  for (const n of [2, 3, 12, 61]) assert.equal(starGlyphs(star(n)), 2, `${n} places`);
});

// The view imports React Native, so it is read as text, as `inkStar.test.ts` reads it.
const view = readFileSync(join(__dirname, '..', '..', '..', 'components', 'StarView.tsx'), 'utf8');

test('tend map 14: the star\'s disc draws its glyphs by starGlyphs, fanned, one size and no numeral', () => {
  assert.match(view, /starGlyphs\(star\) === 2 \?/, 'the disc asks how many stars to draw');
  const fanned = [...view.matchAll(/<View testID="star-glyph" style=\{\[styles\.glyph, styles\.(glyphBack|glyphFront)\]\}>\s*<Icon name="star" size=\{GLYPH\} color="#ffffff" \/>/g)].map((m) => m[1]);
  assert.deepEqual(fanned, ['glyphBack', 'glyphFront'], 'two white stars, back and front');
  // Inside the one disc, which keeps its size: the glyphs are its children, and nothing else changes size.
  const disc = /<View testID="star-disc" style=\{styles\.star\}>([\s\S]*?)\n {6}<\/View>/.exec(view)?.[1] ?? '';
  assert.match(disc, /star-glyph/, 'the fanned stars are in the disc');
  assert.doesNotMatch(view, /star\.count/, 'the count is read only through starGlyphs, never drawn');
});
