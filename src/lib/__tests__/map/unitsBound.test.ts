/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT, storeFormatters, unboundInText, unboundViews } from './unitsScan';

// tend map 23 (the lenses' auditor 1 and 2, ux 3, steward 1, Nov 20): QL16 asks every screen showing a distance to
// redraw on a switch of the units. A view that calls `useUnits()` and formats with the store's default is redrawn, but
// the React Compiler (decision 0207) keeps each line it memoized keyed on that line's own inputs, never on the store:
// switched to miles on Navigate, Explore's tile still read "4.0 km away" while its spoken label said "2.5 mi away".
// A view passes the units in (`useDistance()` in `lib/useUnits`, or the units it holds), so the compiler sees them.
//
// tend map audit 48 (the diff review's auditor 1, 2 and 7): the scan follows a lib function that formats with the
// store into the views that call it (`walkRowMeta`, `stretchLines`, `recordingLine`, `deadZoneNudge`, and the view
// `useNavigation` in `src/lib`), skips comments, and fails a trailing-comma call, a `getUnits()` argument, an aliased
// import and a formatter passed by name. The views not yet bound are named by DEFERRED's item, and LEFT holds no other.

/** The views not yet bound, each named in docs/DEFERRED.md's item; a file fixed leaves this list, none joins it unnamed. */
const LEFT = [
  'src/app/replay/[id].tsx',
  'src/app/walk.tsx',
  'src/components/GapCard.tsx',
  'src/components/GapDraw.tsx',
  'src/components/HomeSheet.tsx',
  'src/components/RecordingBar.tsx',
  'src/lib/nav/useNavigation.ts',
];

/** DEFERRED's item that names the views still keeping the store's units (tend map 23's rest). */
const deferredItem = () => {
  const text = readFileSync(join(ROOT, 'docs', 'DEFERRED.md'), 'utf8');
  return text.split('\n').find((l) => l.startsWith('- [loop] (medium)') && l.includes('format a distance with the store')) ?? '';
};

test('tend map 23: no view formats a distance without its units, but those filed', () => {
  const unbound = unboundViews();
  const files = [...new Set(unbound.map((u) => u.split(':')[0]))].sort();
  assert.deepEqual(unbound.filter((u) => !LEFT.includes(u.split(':')[0])), [], 'a view outside the filed ones formats with the store');
  assert.deepEqual(files, [...LEFT].sort(), 'a filed view is bound now: take it off LEFT');
});

test('tend map 23: Explore, its tiles and card, and Navigate\'s ready settings take their formatters from useDistance', () => {
  for (const f of ['src/app/(tabs)/explore.tsx', 'src/components/atlas/AtlasTile.tsx', 'src/components/atlas/AtlasCard.tsx', 'src/components/ExploreSettings.tsx', 'src/components/StartSettings.tsx', 'src/components/walk/useReady.tsx']) {
    assert.match(readFileSync(join(ROOT, f), 'utf8'), /= useDistance\(\);/, f);
  }
});

test('tend map audit 48: a view calling a lib that formats a distance without units (walkRowMeta, stretchLines, recordingLine, deadZoneNudge, useNavigation) counts as unbound', () => {
  const lib = [...storeFormatters()].filter(([, v]) => v === 'lib').map(([k]) => k);
  for (const name of ['walkRowMeta', 'stretchLines', 'recordingLine', 'deadZoneNudge', 'useNavigation']) assert.ok(lib.includes(name), name);
  const seen = unboundViews().join('\n');
  for (const [file, name] of [['HomeSheet.tsx', 'walkRowMeta'], ['GapCard.tsx', 'stretchLines'], ['RecordingBar.tsx', 'recordingLine'], ['walk.tsx', 'deadZoneNudge'], ['useNavigation.ts', 'formatDistance']]) {
    assert.match(seen, new RegExp(`${file.replace(/\./g, '\\.')}:\\d+ ${name} `), `${file} ${name}`);
  }
});

test('tend map audit 48: the units scan fails a trailing-comma call, a getUnits() argument, an aliased import and a formatter passed by name, and reads no comment', () => {
  const imp = "import { formatDistance, formatRange } from '../lib/format';\n";
  assert.deepEqual(unboundInText(`${imp}const a = formatDistance(\n  m,\n);`), ['formatDistance (called short of its units (1 of 2))']);
  assert.deepEqual(unboundInText(`${imp}const a = formatDistance(m, getUnits());`), ['formatDistance (given getUnits())']);
  assert.deepEqual(unboundInText("import { formatDistance as fd } from '../lib/format';\nconst a = fd(m);"), ['formatDistance (called short of its units (1 of 2))']);
  assert.deepEqual(unboundInText(`${imp}const a = distanceWords(m, here, formatDistance);\nconst b = ms.map(formatRange);`), ['formatDistance (passed by name)', 'formatRange (passed by name)']);
  assert.deepEqual(unboundInText(`${imp}// formatDistance(m) in a comment\n/* formatRange(m) */\nconst a = formatDistance(m, units);`), []);
  assert.deepEqual(unboundInText("import { walkRowMeta } from '../lib/quietLines';\nconst a = walkRowMeta(date, s);"), ['walkRowMeta (formats with the store inside)']);
});

test('tend map audit 48: LEFT holds only views DEFERRED\'s item names', () => {
  const item = deferredItem();
  assert.ok(item, 'DEFERRED holds the item naming the views not yet bound');
  for (const f of LEFT) assert.ok(item.includes(f.split('/').pop()!), `${f} is named in DEFERRED's item`);
});
