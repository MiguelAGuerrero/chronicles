// @tree-wide: the style sheets of the floating UI (banners, toasts, pills, cards) and the walk layout
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// fix banner-spacing: floating UI sits a 4-point-grid gutter off the screen's edge, and its padding,
// margins and gaps are multiples of 4. The rest of the app is listed in docs/DEFERRED.md.

const SRC = join(__dirname, '..', '..');
const FLOATING = [
  'app/walk.tsx',
  'components/walk/useReady.tsx',
  'components/ui.tsx',
  'components/UndoToast.tsx',
  'components/ReminderCard.tsx',
  'components/ConfirmCard.tsx',
];
const read = (f: string) => readFileSync(join(SRC, f), 'utf8');

test('banner-spacing 1: padding, margin and gap in the floating UI are multiples of 4', () => {
  const off: string[] = [];
  for (const f of FLOATING) {
    read(f).split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/\b((?:padding|margin|gap|rowGap|columnGap)[A-Za-z]*):\s*(-?\d+(?:\.\d+)?)/g)) {
        if (Number(m[2]) % 4 !== 0) off.push(`${f}:${i + 1} ${m[1]}: ${m[2]}`);
      }
    });
  }
  assert.deepEqual(off, [], `off the 4-point grid:\n${off.join('\n')}`);
});

test('banner-spacing 2: the screen-edge gutter is one 16 pt constant, used by the walk screen and its layout', () => {
  const layout = read('components/walk/layout.ts');
  assert.match(layout, /export const GUTTER = 16;/);
  assert.doesNotMatch(layout, /Math\.max\(12,/, 'the stack and banners must not fall back to a 12 pt edge');
  for (const f of ['app/walk.tsx', 'components/walk/useReady.tsx']) {
    const src = read(f);
    assert.match(src, /styles\.top\b[^\n]*insets\.top \+ GUTTER, left: (?:at\.)?sideInset/, `${f} places its top overlay from the gutter`);
    assert.doesNotMatch(src, /(?:left|right): 12,|insets\.top \+ 12/, `${f} has a 12 pt edge`);
  }
});
