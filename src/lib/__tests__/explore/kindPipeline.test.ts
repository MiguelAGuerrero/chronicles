/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { waitingKinds, waitingMarks } from '../../atlas/atlas';
import { mergePlaces } from '../../discovery/archiveMerge';
import { archivePlace } from '../../discovery/archivePois';
import { refine, type Refinement } from '../../discovery/refine';
import { isKindHidden, kindChain, kindRows, kindParent, kindSwitch, refineRead, REFINEMENTS } from '../../discovery/refinements';
import { placesFromTilePois } from '../../discovery/tilePois';
import type { Kind, Place } from '../../discovery/types';
import { KINDS, passedPlaces, routeMarks, visibleMarks, type ChecklistItem } from '../../explore/explore';
import type { LngLat } from '../../types';

// The kind pipeline (PC18-PC23), written from specs/community-parks/spec.md before the code.

const CP = 'community_parks' as Kind;
const O: LngLat = [-75.47, 40.6];
const at = (e: number, n = 0): LngLat => [O[0] + e / (111320 * Math.cos((O[1] * Math.PI) / 180)), O[1] + n / 110540];
const place = (name: string, kind: Kind, p: LngLat = at(0), category: Place['category'] = 'parks'): Place => ({ key: `${name}${p[0]}`, name, category, at: p, generic: false, build: 'b', markable: true, kind });

test('PC18: REFINEMENTS is a list of data objects, community parks one; refine is pure, idempotent and empty-safe', () => {
  const cp = REFINEMENTS.find((r) => r.id === 'community_parks');
  assert.ok(cp && cp.parent === 'parks' && cp.child === CP && typeof cp.judge === 'function');
  const input = Object.freeze([place('Elm Street Playground', 'parks'), place('Cedar Park', 'parks', at(500))].map((p) => Object.freeze(p)));
  const out = refine(input, { outlines: [], archive: [] }, REFINEMENTS);
  assert.notEqual(out, input as unknown);
  assert.deepEqual(input.map((p) => p.kind), ['parks', 'parks'], 'the input is never changed');
  assert.deepEqual(out.map((p) => p.kind), [CP, 'parks']);
  assert.deepEqual(refine(out, { outlines: [], archive: [] }, REFINEMENTS), out, 'run twice over its own output');
  assert.deepEqual(refine(input, { outlines: [], archive: [] }, []), [...input]);
});

test('PC19: a refinement added to a registry splits another kind; they run in order; other kinds are untouched', () => {
  const named = (re: RegExp) => () => (p: Place) => re.test(p.name);
  const registry: Refinement[] = [
    { id: 't1', parent: 'monuments', child: 'structures', judge: named(/Plaque/) },
    { id: 't2', parent: 'structures', child: 'curiosities', judge: named(/Big/) },
  ];
  const out = refine([place('Big Plaque', 'monuments', at(0), 'history'), place('Soldiers Plaque', 'monuments', at(10), 'history'), place('Soldiers Memorial', 'monuments', at(20), 'history'), place('Plaque Park', 'parks', at(30))], { outlines: [], archive: [] }, registry);
  assert.deepEqual(out.map((p) => p.kind), ['curiosities', 'structures', 'monuments', 'parks']);
});

test('PC20: kinds know their parent from the registry, and the switches follow the chain', () => {
  assert.equal(kindParent(CP), 'parks');
  assert.equal(kindParent('parks'), undefined);
  assert.deepEqual(kindChain(CP), [CP, 'parks']);
  assert.deepEqual(kindChain('parks'), ['parks']);
  for (const r of REFINEMENTS) {
    const ids = KINDS.map((k) => k.id);
    assert.ok(ids.includes(r.parent) && ids.includes(r.child), r.id);
    assert.ok(ids.indexOf(r.child) > ids.indexOf(r.parent), `${r.id}: the child after its parent`);
  }
  assert.equal(isKindHidden(new Set<Kind>([CP]), CP), true);
  assert.equal(isKindHidden(new Set<Kind>([CP]), 'parks'), false, 'a child off hides only itself');
  assert.equal(isKindHidden(new Set<Kind>(['parks']), CP), true, 'a parent off hides its children');
  assert.equal(isKindHidden(new Set<Kind>(['parks']), 'parks'), true);
  assert.equal(isKindHidden(new Set<Kind>(['parks']), undefined), false);
  assert.deepEqual(kindSwitch(new Set<Kind>(), CP), { on: true, locked: false });
  assert.deepEqual(kindSwitch(new Set<Kind>([CP]), CP), { on: false, locked: false });
  assert.deepEqual(kindSwitch(new Set<Kind>(['parks']), CP), { on: false, locked: true });
  assert.deepEqual(kindSwitch(new Set<Kind>(['parks']), 'parks'), { on: false, locked: false });
});

test('PC21: the adapter and the merge judge nothing; the refinement after the merge, with the archive, does', () => {
  const f = [{ geometry: { type: 'Point', coordinates: at(0) }, properties: { class: 'park', subclass: 'park', name: 'Elm Street Playground' }, zoom: 14 }];
  const tile = placesFromTilePois(f, 'b', { landcover: [] } as never);
  assert.equal(tile[0].kind, 'parks', 'the adapter: a park is a park');
  const arch = [archivePlace('Elm Street Mill', 'historic_site', at(100), 'v')].filter((p): p is Place => !!p);
  const merged = mergePlaces([{ ...tile[0], kind: CP }], arch);
  assert.equal(merged.find((p) => p.name === 'Elm Street Playground')?.kind, CP, 'the merge keeps a kind as it finds it');
  assert.equal(refineRead(tile, { archive: [] })[0].kind, CP);
  assert.equal(refineRead(tile, { archive: arch })[0].kind, 'parks', 'an archive place within 150 m promotes it');
  for (const file of ['refine', 'refinements', 'parkKind', 'green']) {
    const src = readFileSync(new URL(`../../discovery/${file}.ts`, import.meta.url), 'utf8');
    assert.match(src, /^\/\/ @layer core/);
    assert.doesNotMatch(src, /from '\.\.\/(db|ports|recorder|notifier)|from 'react-native|expo-/, file);
  }
});

const item = (key: string, kind: Kind, p: LngLat): ChecklistItem => ({ key, area_key: null, name: key, category: 'parks', kind, at: p, generic: false });
const off = new Set<Kind>(['parks']);

test('PC22: with Parks off, community parks are off too, in every consumer', () => {
  const items = [item('play', CP, at(10)), item('park', 'parks', at(20)), item('art', 'public_art', at(30))];
  const keys = (l: { item: ChecklistItem }[]) => l.map((m) => m.item.key).sort();
  assert.deepEqual(keys(visibleMarks({ items, here: at(0), rangeM: 300, found: new Set(), hidden: off, revealed: new Set() })), ['art']);
  assert.deepEqual(routeMarks({ items, route: [at(0), at(100)], rangeM: 100, exclude: new Set(), found: new Set(), hidden: off }).map((i) => i.key), ['art']);
  const fixes = [{ at: at(10), t: 5 }, { at: at(20), t: 5 }, { at: at(30), t: 5 }];
  assert.deepEqual(passedPlaces({ items, fixes, since: 0, hidden: off, foundHere: new Set() }).map((i) => i.key), ['art']);
  const marks = items.map((i) => ({ key: i.key, category: i.category, kind: i.kind, at: i.at }));
  assert.deepEqual(waitingKinds(marks.slice(0, 2), new Set(), off), []);
  assert.deepEqual(waitingMarks(marks, new Set(), at(0), off, { all: true }).map((m) => m.key), ['art']);
  assert.deepEqual(waitingMarks(marks, new Set(), at(0), new Set<Kind>([CP]), { all: true }).map((m) => m.key), ['park', 'art']);
});

test('PC23: the settings row reads off and locked while Parks is off', () => {
  assert.deepEqual(kindSwitch(new Set<Kind>(['parks']), CP), { on: false, locked: true });
  assert.deepEqual(kindSwitch(new Set<Kind>(), CP), { on: true, locked: false });
  assert.deepEqual(kindSwitch(new Set<Kind>(['parks']), 'viewpoints'), { on: true, locked: false }, 'no other row changes');
});

test('PC23: a subset is a row, one step in, only while its parent is on', () => {
  const ids = (h: Kind[]) => kindRows(KINDS, new Set<Kind>(h)).map((r) => `${r.depth}:${r.kind.id}`);
  assert.ok(ids([]).includes(`1:${CP}`) && ids([]).includes('0:parks'));
  assert.equal(ids([]).indexOf(`1:${CP}`), ids([]).indexOf('0:parks') + 1, 'right under its parent');
  assert.ok(!ids(['parks']).some((r) => r.endsWith(CP)), 'parent off: the subset is not shown');
  assert.ok(ids([CP]).includes(`1:${CP}`), 'the subset off alone still shows, off');
  assert.equal(ids([]).length, KINDS.length);
});
