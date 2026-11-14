/// <reference types="node" />
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { LAYERS } from '../../layers/registry';
import { layerNotes } from '../../layers/notes';
import { warningLine, type Stretch } from '../../walk/ahead';
import { createLayers } from '../../layers/shell';
import { fakePorts } from '../fakes';

// After dark (DK1, DK11, DK12's words, DK17), written from specs/after-dark/spec.md before the code.

const dark = () => LAYERS.find((l) => l.id === 'dark');
const unlit = 'unlit' as unknown as Stretch['kind'];

test('DK1: the registry lists After dark with a moon, off by default, beside the other three, as one setting for every map', async () => {
  assert.deepEqual(LAYERS.map((l) => l.id), ['walkability', 'busy', 'borders', 'dark']);
  const d = dark();
  assert.ok(d);
  assert.equal(d.name, 'After dark');
  assert.equal(d.icon, 'moon-outline');
  assert.equal(d.defaultOn, false);
  const l = createLayers(fakePorts());
  await l.load();
  assert.equal(l.store.get().on.dark, false);
  await l.set('dark', true);
  assert.equal(l.store.get().on.dark, true);
});

test('DK12: the legend says Lit streets, Open after dark and On a route after dark, with their tips and the note', () => {
  const d = dark();
  assert.ok(d);
  assert.deepEqual(d.legend.map((r) => [r.text, r.tip]), [
    ['Lit streets', 'Lit streets: streets OpenStreetMap marks as having street lights.'],
    ['Open after dark', 'Open after dark: places whose hours, as mapped, say they are open at the time above.'],
    ['On a route after dark', 'On a route after dark: a line before a street mapped as unlit.'],
  ]);
  assert.equal(d.note, 'From OpenStreetMap. Only what is mapped: a street with no lighting mapped may still be lit.');
});

const BANNED = /\d|%|\b(safe|unsafe|secure|danger|dangerous|crime|risk|avoid|caution|careful|warning|comfortable|well-lit|poorly|mostly|quiet|deserted|isolated|lively|more|less|better|worse|than)\b/i;

test('DK11: no number, comparison, safety or grade word in anything the layer says', async () => {
  const d = dark();
  assert.ok(d);
  const said: string[] = [d.name, d.note ?? '', ...d.legend.flatMap((r) => [r.text, r.tip ?? ''])];
  for (const status of ['reading', 'ready', 'unavailable', 'waiting'] as const) {
    for (const words of ['Open now', 'Open after sunset', 'No dark tonight', 'Hours read only near you', null]) {
      said.push(layerNotes({ walkability: 'off', busyReading: false, busyFailed: false, dark: status, darkWords: words } as Parameters<typeof layerNotes>[0]).dark ?? '');
    }
  }
  const { READING_WORDS } = (await import('../../dark/sun' as string)) as { READING_WORDS: readonly string[] };
  said.push(...READING_WORDS);
  // The heads-up's template with a fixed street name: a street's own name ("Route 22", "5th Street") is exempt.
  said.push(warningLine({ kind: unlit, street: 'Elm Street' }), warningLine({ kind: unlit, street: null }));
  for (const t of said) assert.ok(!BANNED.test(t), JSON.stringify(t));
});

test('DK1, DK5: while on, the panel line says the reading and ends "Only what is mapped"', () => {
  const note = (darkWords: string | null, dark = 'ready') => layerNotes({ walkability: 'off', busyReading: false, busyFailed: false, dark, darkWords } as Parameters<typeof layerNotes>[0]).dark;
  assert.equal(note('Open now'), 'Open now. Only what is mapped.');
  assert.equal(note('Open after sunset'), 'Open after sunset. Only what is mapped.');
  assert.equal(note('Hours read only near you'), 'Hours read only near you. Only what is mapped.');
  assert.equal(note(null, 'reading'), 'Reading…');
  assert.equal(note(null, 'unavailable'), 'Not available now');
  assert.equal(note(null, 'off'), null);
});

/** Every file under src that imports from `lib/dark/`, by its path from src. */
function importersOfDark(): string[] {
  const root = path.join(__dirname, '../../..');
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__tests__' && e.name !== 'node_modules') walk(p);
      } else if (/\.(ts|tsx)$/.test(e.name)) {
        const rel = path.relative(root, p).split(path.sep).join('/');
        if (rel.startsWith('lib/dark/')) continue;
        if (/from '[^']*\/dark\/[^']*'|from '\.\/dark\//.test(fs.readFileSync(p, 'utf8'))) out.push(rel);
      }
    }
  };
  walk(root);
  return out.sort();
}

test('DK17: no route module reads after-dark data; only the layer\'s screens, the map and the heads-up import it', () => {
  const allowed = new Set([
    'app/(tabs)/explore.tsx',
    'app/walk.tsx',
    'components/walk/useReady.tsx',
    'components/map/types.ts',
    'lib/walk/useRouteWarning.ts',
    'lib/layers/notes.ts',
    // Storage keeps the tiles (DK9): it carries them, and routes nothing.
    'lib/db/types.ts',
    'lib/db/index.web.ts',
    'lib/db/sqliteStore.ts',
  ]);
  const got = importersOfDark();
  assert.ok(got.length > 0, 'the layer is wired somewhere');
  for (const f of got) assert.ok(allowed.has(f), `${f} imports lib/dark`);
  for (const f of got) assert.ok(!/walkPlanner|kindWalk|routeLeanings|readyNav|startPlan|\/nav\//.test(f), `${f} is a route module`);
});

test('after-dark ui 1: the After dark switch says under its name what it shows, so both tasks find it (the cold find)', () => {
  const d = dark();
  assert.equal(d?.sub, 'Lit streets, places open');
  assert.ok(!BANNED.test(d?.sub ?? ''));
});
