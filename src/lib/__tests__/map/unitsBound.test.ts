/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// tend map 23 (the lenses' auditor 1 and 2, ux 3, steward 1, Nov 20): QL16 asks every screen showing a distance to
// redraw on a switch of the units. A view that calls `useUnits()` and formats with the store's default is redrawn, but
// the React Compiler (decision 0207) keeps each line it memoized keyed on that line's own inputs, never on the store:
// switched to miles on Navigate, Explore's tile still read "4.0 km away" while its spoken label said "2.5 mi away".
// A view passes the units in (`useDistance()` in `lib/useUnits`, or the units it holds), so the compiler sees them.

const ROOT = join(__dirname, '..', '..', '..', '..');
/** Each formatter and how many arguments it takes with the units given. */
const NEEDS: Record<string, number> = { formatDistance: 2, formatDistanceNear: 2, formatRange: 2, passNote: 2, destLine: 3 };
/**
 * The views not yet bound, filed in docs/DEFERRED.md ("Map, walk screen and motion polish", tend map 23's rest): the
 * walk screen, the replay, the home sheet and the gap's drawing. A file fixed leaves this list; none joins it.
 */
const LEFT = ['src/app/replay/[id].tsx', 'src/app/walk.tsx', 'src/components/GapDraw.tsx', 'src/components/HomeSheet.tsx'];

const filesUnder = (dir: string, out: string[] = []): string[] => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) filesUnder(p, out);
    else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
};

/** How many arguments the call whose `(` ends at `from` has, read by depth; null if it never closes. */
function argCount(src: string, from: number): number | null {
  let depth = 0;
  let commas = 0;
  let any = false;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return any ? commas + 1 : 0;
      depth--;
    } else if (c === ',' && depth === 0) commas++;
    else if (!/\s/.test(c)) any = true;
  }
  return null;
}

/** Every call in a view's source that formats a distance with the store's units, as `file:line name`. */
function unboundCalls(): string[] {
  const out: string[] = [];
  for (const file of [...filesUnder(join(ROOT, 'src', 'app')), ...filesUnder(join(ROOT, 'src', 'components'))]) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/(?<![\w.$])(formatDistanceNear|formatDistance|formatRange|passNote|destLine)\(/g)) {
      const n = argCount(src, m.index! + m[0].length);
      if (n !== null && n < NEEDS[m[1]]) out.push(`${file.slice(ROOT.length + 1)}:${src.slice(0, m.index).split('\n').length} ${m[1]}`);
    }
  }
  return out;
}

test('tend map 23: no view formats a distance without its units, but the four filed', () => {
  const unbound = unboundCalls();
  const files = [...new Set(unbound.map((u) => u.split(':')[0]))].sort();
  assert.deepEqual(unbound.filter((u) => !LEFT.includes(u.split(':')[0])), [], 'a view outside the filed four formats with the store');
  assert.deepEqual(files, [...LEFT].sort(), 'a filed view is bound now: take it off LEFT');
});

test('tend map 23: Explore, its tiles and card, and Navigate\'s ready settings take their formatters from useDistance', () => {
  for (const f of ['src/app/(tabs)/explore.tsx', 'src/components/atlas/AtlasTile.tsx', 'src/components/atlas/AtlasCard.tsx', 'src/components/ExploreSettings.tsx', 'src/components/StartSettings.tsx', 'src/components/walk/useReady.tsx']) {
    assert.match(readFileSync(join(ROOT, f), 'utf8'), /= useDistance\(\);/, f);
  }
});
