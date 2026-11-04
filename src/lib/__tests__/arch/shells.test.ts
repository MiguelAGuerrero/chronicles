// @tree-wide: the saved-settings shells and their instance files, by source
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

// Shells take their effects as an argument (specs/shells-saved-settings, SH5).

type Layers = { valueImports(rel: string, source: string, opts?: { types?: boolean }): { spec: string }[] };
const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);
const layers = load(join(ROOT, 'scripts', 'layers.js')) as Layers;
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const SHELLS = ['src/lib/unitsStore/shell.ts', 'src/lib/nav/store/shell.ts', 'src/lib/notify/prefs.ts', 'src/lib/explore/momentFind/shell.ts'];

test('SH5 the four shells import no singletons and no ports', () => {
  for (const rel of SHELLS) {
    const src = read(rel);
    assert.match(src, /^\/\/ @layer shell$/m, `${rel} is a shell`);
    const bad = layers.valueImports(rel, src).map((i) => i.spec).filter((s) => /(^|\/)(db|recorder|notify|ports|deletion)(\/index)?$/.test(s) || s === 'react-native' || s.startsWith('expo-'));
    assert.deepEqual(bad, [], `${rel} takes its effects as an argument instead of importing ${bad.join(', ')}`);
    assert.match(src, /export function create[A-Z]\w*\(/, `${rel} exports a factory`);
  }
});

test('SH5 each instance exports the names its module did', () => {
  const names: Record<string, string[]> = {
    'src/lib/unitsStore/index.ts': ['UNITS_KEY', 'loadUnits', 'saveUnits'],
    'src/lib/nav/store/index.ts': ['saveNav', 'loadNav', 'clearNav', 'loadPendingDest', 'savePendingDest'],
    'src/lib/explore/momentFind/index.ts': ['findForMoment'],
    'src/lib/notify/index.ts': ['NOTIFY_OFF_KEY', 'loadNoticePrefs', 'saveNoticePrefs', 'notifier'],
  };
  for (const [rel, want] of Object.entries(names)) {
    const src = read(rel);
    assert.match(src.split('\n')[1] ?? '', /^\/\/ @instance: .+/, `${rel} says what it builds on its second line`);
    for (const n of want) assert.match(src, new RegExp(`\\b${n}\\b`), `${rel} exports ${n}`);
  }
});

test('SH9 a journey still covers each moved module, so a change to one names the journeys to run', () => {
  const { e2eFor } = load(join(ROOT, 'scripts', 'affected.js')) as { e2eFor(changed: string[]): { scenarios: { name: string }[] } };
  const want: Record<string, string> = {
    'src/lib/unitsStore/shell.ts': 'qol',
    'src/lib/explore/momentFind/shell.ts': 'days',
    'src/lib/notify/prefs.ts': 'notifications',
    'src/lib/nav/store/shell.ts': 'walk',
  };
  for (const [file, journey] of Object.entries(want)) {
    assert.ok(e2eFor([file]).scenarios.some((s) => s.name === journey), `${file} is covered by the ${journey} journey`);
  }
});

const ROUND2 = ['src/lib/here/shell.ts', 'src/lib/shareLog/shell.ts', 'src/lib/export/bundle/shell.ts', 'src/lib/tileCollector/shell.ts'];

test('TD7 the four shells of test gaps round 1 import no singletons, no ports and no React Native', () => {
  for (const rel of ROUND2) {
    const src = read(rel);
    assert.match(src, /^\/\/ @layer shell$/m, `${rel} is a shell`);
    const bad = layers.valueImports(rel, src).map((i) => i.spec).filter((s) => /(^|\/)(db|recorder|notify|ports|deletion|tileFetch)(\/index)?$/.test(s) || s === 'react-native' || s.startsWith('expo-'));
    assert.deepEqual(bad, [], `${rel} takes its effects as an argument instead of importing ${bad.join(', ')}`);
  }
  const names: Record<string, string[]> = {
    'src/lib/here/index.ts': ['HERE_RADIUS_M', 'HereResult', 'capturesHere'],
    'src/lib/shareLog/index.ts': ['walkLogText', 'shareLogText'],
    'src/lib/export/bundle/index.ts': ['KeeperError', 'BundleIO', 'extensionOf', 'bundleName', 'writeWalkBundle'],
    'src/lib/tileCollector/index.ts': ['tileCollector'],
  };
  for (const [rel, want] of Object.entries(names)) {
    const src = read(rel);
    assert.match(src.split('\n')[1] ?? '', /^\/\/ @instance: .+/, `${rel} says what it builds`);
    for (const n of want) assert.match(src, new RegExp(`\\b${n}\\b`), `${rel} exports ${n}`);
  }
});

test('TD8 a journey still covers what happened here, so a change to it names the walk journey', () => {
  const { e2eFor } = load(join(ROOT, 'scripts', 'affected.js')) as { e2eFor(changed: string[]): { scenarios: { name: string }[] } };
  assert.ok(e2eFor(['src/lib/here/shell.ts']).scenarios.some((s) => s.name === 'walk'));
});
