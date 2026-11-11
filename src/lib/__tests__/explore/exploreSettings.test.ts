import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fakePorts } from '../fakes';

// Explore settings (specs/explore-settings): what I'm into, from the Explore tab. One store, the walk's, with two doors.

// Loaded at run time: the modules arrive with the code, after these tests.
const load = (path: string): Promise<any> => import(path);
const SHELL = '../../explore/settings/shell';

test('ES1: a kind switched off from Explore is off in the walk\'s settings, the other way too, after a reload, and range and pocket alert stay', async () => {
  const { createExploreSettings } = await load(SHELL);
  const p = fakePorts();
  // The app has one instance: the walk's drawer and Explore's panel are two doors to it.
  const walk = createExploreSettings(p);
  await walk.save({ hidden: new Set(['cemeteries']), rangeM: 240, haptic: true });
  const explore = walk;
  const heard: string[][] = [];
  const off = walk.onSettings((s: { hidden: Set<string> }) => heard.push([...s.hidden].sort()));
  await explore.toggleKind('parks', false);
  assert.deepEqual(heard.at(-1), ['cemeteries', 'parks'], 'the walk door hears the Explore door');
  const reloaded = await createExploreSettings(p).load();
  assert.deepEqual([...reloaded.hidden].sort(), ['cemeteries', 'parks'], 'kept across a reload');
  assert.equal(reloaded.rangeM, 240);
  assert.equal(reloaded.haptic, true);
  const heardOnExplore: string[][] = [];
  explore.onSettings((s: { hidden: Set<string> }) => heardOnExplore.push([...s.hidden].sort()));
  await walk.save({ ...reloaded, hidden: new Set(['parks']) });
  assert.deepEqual(heardOnExplore.at(-1), ['parks'], 'the Explore door hears the walk door');
  off();
});

test('ES2: setKind adds or removes that kind alone', async () => {
  const { setKind } = await load('../../explore/explore');
  const hidden = new Set(['museums', 'parks']);
  assert.deepEqual([...setKind(hidden, 'cemeteries', false)].sort(), ['cemeteries', 'museums', 'parks']);
  assert.deepEqual([...setKind(hidden, 'parks', true)], ['museums']);
  assert.deepEqual([...setKind(hidden, 'museums', true)], ['parks']);
  assert.deepEqual([...hidden].sort(), ['museums', 'parks'], 'the set it was given is not changed');
});

test('ES2: a kind added since the choice was saved keeps its state (PK18)', async () => {
  const { createExploreSettings } = await load(SHELL);
  const p = fakePorts();
  await p.db.setMeta('explore_hidden', JSON.stringify(['museums']));
  const s = createExploreSettings(p);
  assert.ok((await s.load()).hidden.has('community'), 'Community spaces followed Museums when it joined');
  await s.toggleKind('parks', false);
  assert.deepEqual([...(await createExploreSettings(p).load()).hidden].sort(), ['community', 'museums', 'parks']);
  assert.deepEqual(JSON.parse((await p.db.getMeta('explore_kinds_known')) ?? '[]').includes('community'), true, 'every kind known now');
});

test('ES2: two switches pressed in one tick both end up saved', async () => {
  const { createExploreSettings } = await load(SHELL);
  const p = fakePorts();
  const s = createExploreSettings(p);
  await Promise.all([s.toggleKind('parks', false), s.toggleKind('cemeteries', false), s.toggleKind('parks', true)]);
  assert.deepEqual([...(await createExploreSettings(p).load()).hidden], ['cemeteries']);
});

test('ES2: a save that fails leaves the saved state, tells no one, and never throws', async () => {
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

test('ES8: the files that read the filter are named; no moment, capture or Chronicle context does', () => {
  const readers: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const f = join(dir, name);
      if (statSync(f).isDirectory()) {
        if (name !== '__tests__') walk(f);
      } else if (/\.(ts|tsx)$/.test(name)) {
        const text = readFileSync(f, 'utf8');
        const rel = f.replace(/^.*\/src\//, 'src/');
        // An import of Explore's settings: by its path, or `./settings` from a file in lib/explore itself.
        if (/from '[^']*explore\/settings'/.test(text) || (rel.startsWith('src/lib/explore/') && /from '\.\/settings'/.test(text))) readers.push(rel);
      }
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

// The audit's regression tests (explore-settings audit 4, 5, 6).

test('explore-settings audit 4: a toggle whose read is held while a whole save lands ends with what was heard equal to what is stored', async () => {
  const { createExploreSettings } = await load(SHELL);
  const p = fakePorts();
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r));
  let held = false;
  // The toggle has read the kinds and then waits, as a slow disk would, while the walk's drawer saves.
  const slow = { ...p, db: { ...p.db, setMeta: p.db.setMeta.bind(p.db), getMeta: async (k: string) => { const v = await p.db.getMeta(k); if (k === 'explore_hidden' && !held) { held = true; await gate; } return v; } } };
  const s = createExploreSettings(slow as typeof p);
  const heard: { hidden: Set<string>; rangeM: number; haptic: boolean }[] = [];
  s.onSettings((v: { hidden: Set<string>; rangeM: number; haptic: boolean }) => heard.push(v));
  const toggled = s.toggleKind('parks', false);
  await new Promise((r) => setTimeout(r, 5));
  const saved = s.save({ hidden: new Set(['cemeteries', 'theatres']), rangeM: 220, haptic: true });
  setTimeout(release, 25);
  await Promise.all([toggled, saved]);
  const stored = await createExploreSettings(p).load();
  const last = heard.at(-1)!;
  assert.equal(last.rangeM, stored.rangeM, 'the range heard is the range stored');
  assert.equal(last.haptic, stored.haptic);
  assert.deepEqual([...last.hidden].sort(), [...stored.hidden].sort(), 'the kinds heard are the kinds stored');
});

test('explore-settings audit 5: a failed first load falls back to every kind on, so the switches are not left disabled', async () => {
  const { createExploreSettings } = await load(SHELL);
  const p = fakePorts();
  const s = createExploreSettings(p);
  p.db.failNext('getMeta', new Error('busy'));
  const got = await s.loadOrDefault();
  assert.equal(got.hidden.size, 0);
  assert.equal(got.rangeM, 100);
});

test('explore-settings audit 6: a failure on the second meta write leaves what was heard equal to what is stored', async () => {
  const { createExploreSettings } = await load(SHELL);
  const p = fakePorts();
  const failing = { ...p, db: { ...p.db, getMeta: p.db.getMeta.bind(p.db), setMeta: (k: string, v: string) => (k === 'explore_kinds_known' ? Promise.reject(new Error('disk')) : p.db.setMeta(k, v)) } };
  const s = createExploreSettings(failing as typeof p);
  const heard: string[][] = [];
  s.onSettings((v: { hidden: Set<string> }) => heard.push([...v.hidden]));
  await s.toggleKind('parks', false);
  const stored = [...(await createExploreSettings(p).load()).hidden];
  assert.deepEqual(heard.at(-1) ?? [], stored, 'the switch shows what a reload would');
});
