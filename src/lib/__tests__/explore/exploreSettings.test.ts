import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fakePorts } from '../fakes';

// Explore settings (specs/explore-settings): what I'm into, from the Explore tab. One store, the walk's, with two doors.

// Loaded at run time: the modules arrive with the code, after these tests.
const load = (path: string): Promise<any> => import(path); // eslint-disable-line @typescript-eslint/no-explicit-any
const SHELL = '../../explore/settings/shell';

test('ES1: a kind switched off from Explore is off in the walk\'s settings, the other way too, after a reload, and range and pocket alert stay', { todo: 'test first' }, async () => {
  const { createExploreSettings } = await load(SHELL);
  const p = fakePorts();
  const walk = createExploreSettings(p);
  await walk.save({ hidden: new Set(['cemeteries']), rangeM: 600, haptic: true });
  const explore = createExploreSettings(p);
  const heard: string[][] = [];
  const off = walk.onSettings((s: { hidden: Set<string> }) => heard.push([...s.hidden].sort()));
  await explore.toggleKind('parks', false);
  assert.deepEqual(heard.at(-1), ['cemeteries', 'parks'], 'the walk door hears the Explore door');
  const reloaded = await createExploreSettings(p).load();
  assert.deepEqual([...reloaded.hidden].sort(), ['cemeteries', 'parks'], 'kept across a reload');
  assert.equal(reloaded.rangeM, 600);
  assert.equal(reloaded.haptic, true);
  const heardOnExplore: string[][] = [];
  explore.onSettings((s: { hidden: Set<string> }) => heardOnExplore.push([...s.hidden].sort()));
  await walk.save({ ...reloaded, hidden: new Set(['parks']) });
  assert.deepEqual(heardOnExplore.at(-1), ['parks'], 'the Explore door hears the walk door');
  off();
});

test('ES2: setKind adds or removes that kind alone', { todo: 'test first' }, async () => {
  const { setKind } = await load('../../explore/explore');
  const hidden = new Set(['museums', 'parks']);
  assert.deepEqual([...setKind(hidden, 'cemeteries', false)].sort(), ['cemeteries', 'museums', 'parks']);
  assert.deepEqual([...setKind(hidden, 'parks', true)], ['museums']);
  assert.deepEqual([...setKind(hidden, 'museums', true)], ['parks']);
  assert.deepEqual([...hidden].sort(), ['museums', 'parks'], 'the set it was given is not changed');
});

test('ES2: a kind added since the choice was saved keeps its state (PK18)', { todo: 'test first' }, async () => {
  const { createExploreSettings } = await load(SHELL);
  const p = fakePorts();
  await p.db.setMeta('explore_hidden', JSON.stringify(['museums']));
  const s = createExploreSettings(p);
  assert.ok((await s.load()).hidden.has('community'), 'Community spaces followed Museums when it joined');
  await s.toggleKind('parks', false);
  assert.deepEqual([...(await createExploreSettings(p).load()).hidden].sort(), ['community', 'museums', 'parks']);
  assert.deepEqual(JSON.parse((await p.db.getMeta('explore_kinds_known')) ?? '[]').includes('community'), true, 'every kind known now');
});

test('ES2: two switches pressed in one tick both end up saved', { todo: 'test first' }, async () => {
  const { createExploreSettings } = await load(SHELL);
  const p = fakePorts();
  const s = createExploreSettings(p);
  await Promise.all([s.toggleKind('parks', false), s.toggleKind('cemeteries', false), s.toggleKind('parks', true)]);
  assert.deepEqual([...(await createExploreSettings(p).load()).hidden], ['cemeteries']);
});

test('ES2: a save that fails leaves the saved state, tells no one, and never throws', { todo: 'test first' }, async () => {
  const { createExploreSettings } = await load(SHELL);
  const p = fakePorts();
  const s = createExploreSettings(p);
  await s.toggleKind('parks', false);
  const heard: unknown[] = [];
  s.onSettings((v: unknown) => heard.push(v));
  p.db.failNext('setMeta', new Error('disk'));
  await s.toggleKind('cemeteries', false);
  assert.equal(heard.length, 0, 'nothing heard of a change that was not kept');
  assert.deepEqual([...(await createExploreSettings(p).load()).hidden], ['parks']);
});

test('ES8: the files that read the filter are named; no moment, capture or Chronicle context does', { todo: 'test first' }, () => {
  const readers: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const f = join(dir, name);
      if (statSync(f).isDirectory()) {
        if (name !== '__tests__') walk(f);
      } else if (/\.(ts|tsx)$/.test(name) && /explore\/settings'|\/settings'/.test(readFileSync(f, 'utf8')) && /explore\/settings'|from '\.\/settings'/.test(readFileSync(f, 'utf8'))) readers.push(f.replace(/^.*\/src\//, 'src/'));
    }
  };
  walk(join(__dirname, '../../..'));
  const allowed = [
    'src/app/walk.tsx', 'src/components/StartSettings.tsx', 'src/components/walk/useReady.tsx', 'src/lib/atlas/useAtlas.ts',
    'src/lib/explore/useExplore.ts', 'src/lib/summary.ts', 'src/lib/explore/useKindSwitches.ts', 'src/components/ExploreKindsControl.tsx',
    'src/lib/explore/settings/index.ts',
  ];
  assert.deepEqual(readers.filter((f) => !allowed.includes(f)), [], 'a reader the list does not name');
  assert.ok(readers.includes('src/lib/explore/useKindSwitches.ts'), 'the panel reads it through its one hook');
});
