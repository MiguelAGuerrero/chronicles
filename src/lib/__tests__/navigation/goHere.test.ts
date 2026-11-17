/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import ts from 'typescript';
import { boundsOf, distanceM } from '../../geo';
import { aboutTimeLeft, DEFAULT_PACE_MPS, timeAtPaceMs } from '../../nav/eta';
import { announceStep, navStep, passedStops, rejoinPlanned, routeTo, routeVia, startNav, tooFar, viaAhead, type NavState } from '../../nav/navigator';
import type { Route, RouteSource, Waypoint } from '../../nav/types';
import type { useNavigation } from '../../nav/useNavigation';
import type { LngLat } from '../../types';

// Go here's find and its Cancel (navigation.md, "The street read" and "One route is found at a time"). The decisions are
// pure (`nav/findGate.ts`, loaded inside each test); the wiring is the hook's own source, run here with its imports swapped
// for fakes (a few lines of React's hooks, a db whose reads answer when told), as townBordersRetry.test.ts runs
// useOutlineSet: `npm test` cannot load the hook itself (it imports React Native).
const gate = (): Promise<any> => import(`../../nav/${'findGate'}`);

/** Runs a module's own source with its imports replaced by `bindings` (by imported name). */
function loadSource<T>(rel: string, bindings: Record<string, unknown>): T {
  const src = readFileSync(join(__dirname, '..', '..', rel), 'utf8').replace(/^import [^;]+;$/gm, '');
  const code = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  new Function('module', 'exports', ...Object.keys(bindings), code)(mod, mod.exports, ...Object.values(bindings));
  return mod.exports as T;
}

const flush = async (n = 5) => {
  for (let k = 0; k < n; k++) await new Promise<void>((r) => setImmediate(r));
};

type Opts = Parameters<typeof useNavigation>[0];
type Nav = ReturnType<typeof useNavigation>;

/** Just enough of React's hooks to run one hook: state, refs, callbacks and effects with deps, re-rendered on set. */
function hookHost(hook: (o: Opts) => Nav, initial: Opts) {
  type Slot = { v?: unknown; deps?: unknown[]; cleanup?: (() => void) | void; current?: unknown };
  const slots: Slot[] = [];
  let i = 0;
  let queue: (() => void)[] = [];
  let props = initial;
  const same = (a?: unknown[], b?: unknown[]) => !!a && !!b && a.length === b.length && a.every((x, k) => Object.is(x, b[k]));
  const React = {
    useState(init: unknown) {
      const k = i++;
      slots[k] ??= { v: typeof init === 'function' ? (init as () => unknown)() : init };
      const s = slots[k];
      return [s.v, (next: unknown) => {
        s.v = typeof next === 'function' ? (next as (v: unknown) => unknown)(s.v) : next;
        queueMicrotask(render);
      }];
    },
    useRef(init: unknown) {
      const k = i++;
      slots[k] ??= { current: init };
      return slots[k];
    },
    useCallback(fn: unknown, deps: unknown[]) {
      const k = i++;
      if (!slots[k] || !same(slots[k].deps, deps)) slots[k] = { v: fn, deps };
      return slots[k].v;
    },
    useEffect(fn: () => (() => void) | void, deps?: unknown[]) {
      const k = i++;
      const s = (slots[k] ??= {});
      if (deps && same(s.deps, deps)) return;
      s.deps = deps;
      queue.push(() => {
        if (s.cleanup) s.cleanup();
        s.cleanup = fn();
      });
    },
  };
  let result: Nav;
  function render() {
    i = 0;
    queue = [];
    result = hook(props);
    for (const run of queue) run();
  }
  return {
    React,
    render,
    get result() {
      return result;
    },
    set(p: Partial<Opts>) {
      props = { ...props, ...p };
      render();
    },
  };
}

/** A promise answered when told. */
function later<T>() {
  let answer!: (v: T) => void;
  const p = new Promise<T>((r) => (answer = r));
  return { p, answer };
}

const FROM: LngLat = [-71.4, 41.82];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((FROM[1] * Math.PI) / 180));
/** x, y in metres east and north of FROM. */
const at = (x: number, y: number): LngLat => [FROM[0] + x * mLon, FROM[1] + y * mLat];
const straight = (a: LngLat, b: LngLat, source: string): Route => ({ path: [a, b], lengthM: distanceM(a, b), source });

/**
 * The hook, mounted, with a db and a map whose reads can be held: `hold(name)` makes the next call of that read wait for
 * `release(name)`. The streets route anywhere while `world.streets` is true; the trace (walk me back) likewise.
 */
function mount(t: TestContext, findGate: Record<string, unknown>, o: { scenic?: boolean } = {}) {
  const world = { streets: true, trace: true, open: true };
  const held = new Map<string, ReturnType<typeof later<void>>>();
  const asked: string[] = [];
  const holdable = <T>(name: string, value: () => T) => async (): Promise<T> => {
    asked.push(name);
    const h = held.get(name);
    if (h) {
      held.delete(name);
      await h.p;
    }
    return value();
  };
  const saved: Waypoint[] = [];
  const cleared: number[] = [];
  const errors: string[] = [];
  const stops: boolean[] = [];
  const stopFns: (() => boolean)[] = [];
  const db = {
    getPauses: holdable('getPauses', () => []),
    getStills: holdable('getStills', () => []),
    getPoints: holdable('getPoints', () => [{ lon: FROM[0], lat: FROM[1], t: 0 }]),
    getSegmentsIn: holdable('getSegmentsIn', () => []),
    getWalk: holdable('getWalk', () => ({ id: 'w', open: world.open })),
  };
  const streets = (): RouteSource => ({ id: 'streets', route: (a, b) => (world.streets ? straight(a, b, 'streets') : null) });
  const map = {
    size: () => ({ width: 390, height: 844 }),
    collect: async (_views: LngLat[], shouldStop?: () => boolean) => {
      asked.push('collect');
      stops.push(!!shouldStop?.());
      stopFns.push(() => !!shouldStop?.());
      const h = held.get('collect');
      if (h) {
        held.delete('collect');
        await h.p;
      }
      return { roads: [], names: [], places: [], pois: [], complete: true };
    },
  };
  let host: ReturnType<typeof hookHost> | null = null;
  const mod = loadSource<{ useNavigation: typeof useNavigation }>('nav/useNavigation.ts', {
    useCallback: (fn: unknown, deps: unknown[]) => host!.React.useCallback(fn, deps),
    useEffect: (fn: () => (() => void) | void, deps?: unknown[]) => host!.React.useEffect(fn, deps),
    useRef: (init: unknown) => host!.React.useRef(init),
    useState: (init: unknown) => host!.React.useState(init),
    AccessibilityInfo: { announceForAccessibility: () => {} },
    planViews: (_b: unknown, _w: number, _h: number, ends: LngLat[]) => ends.slice(0, 1),
    db,
    boundsOf,
    distanceM,
    mapReads: { run: <T>(fn: () => Promise<T>) => fn() },
    withTimeout: <T>(p: Promise<T>) => p,
    deriveSegments: () => [],
    formatDistance: (m: number) => `${Math.round(m)} m`,
    routeLeanings: { store: { get: () => (o.scenic ? ['green'] : []) } },
    getUnits: () => 'metric',
    aboutTimeLeft, DEFAULT_PACE_MPS, timeAtPaceMs,
    announceStep, navStep, passedStops, rejoinPlanned, routeTo, routeVia, startNav, tooFar, viaAhead,
    // Scenic routes: a corridor read that answers when told, and two routes offered on it.
    routeOptions: ({ from, to }: { from: LngLat; to: LngLat }) => [
      { leanings: [], route: straight(from, to, 'streets') },
      { leanings: ['green'], route: straight(from, to, 'scenic') },
    ],
    scenicPlan: () => (o.scenic ? { scenic: true, notice: null } : { scenic: false, notice: null }),
    scenicRouteSource: () => streets(),
    scenicRead: { read: holdable('scenicRead', () => ({ segments: [], signals: {} })) },
    clearNav: async () => {
      cleared.push(Date.now());
    },
    loadNav: async () => null,
    saveNav: async (_id: string, dest: Waypoint) => {
      saved.push(dest);
    },
    streetRouteSource: () => streets(),
    traceRouteSource: () => ({ id: 'trace', route: (a: LngLat, b: LngLat) => (world.trace ? straight(a, b, 'trace') : null) }),
    ...findGate,
  });
  const props: Opts = {
    walk: { id: 'w', started_at: 0, open: true } as Opts['walk'],
    here: FROM,
    lastFixAt: 1,
    paused: false,
    heading: null,
    map: () => map as never,
    onArrive: () => {},
    onError: (m) => errors.push(m),
    onNotice: () => {},
  };
  host = hookHost(mod.useNavigation, props);
  host.render();
  void t;
  return {
    world, asked, saved, cleared, errors, stops, stopFns,
    get nav(): Nav {
      return host!.result;
    },
    hold(name: string) {
      const h = later<void>();
      held.set(name, h);
      return () => h.answer();
    },
    /** A fix: here moves, and the hook handles it. */
    async fix(p: LngLat, n: number) {
      host!.set({ here: p, lastFixAt: n });
      await flush();
    },
  };
}

const EAST = at(300, 0);
const dest = (kind: Waypoint['kind'] = 'point'): Waypoint => ({ at: EAST, label: 'Your spot', kind });

/** Runs Go here to `d`, presses Cancel while the read named `when` is held, then lets that read answer. */
async function cancelDuring(h: ReturnType<typeof mount>, when: string, d: Waypoint) {
  const release = h.hold(when);
  const before = h.asked.filter((x) => x === when).length;
  const going = h.nav.goTo(d);
  for (let k = 0; k < 20 && h.asked.filter((x) => x === when).length === before; k++) await flush(1);
  assert.ok(h.asked.filter((x) => x === when).length > before, `the find reached ${when}`);
  h.nav.cancel();
  release();
  await going;
  await flush();
}

test('tend navigation 2: Cancel while a scenic Go here reads the streets or the walk shows no preview and sets nothing', async (t) => {
  const findGate = await gate();
  for (const when of ['getSegmentsIn', 'getWalk']) {
    const h = mount(t, findGate, { scenic: true });
    await cancelDuring(h, when, dest());
    assert.equal(h.nav.preview, null, `Cancel pressed during ${when}, after the corridor was read: no preview comes up`);
    assert.equal(h.nav.nav, null, `Cancel pressed during ${when}: nothing is navigated`);
    assert.equal(h.saved.length, 0, `Cancel pressed during ${when}: no destination is saved`);
    assert.equal(h.nav.finding, false, 'the spinner is gone');
  }
});

test('tend navigation 2: Cancel while a direct Go here or Walk me back reads its streets or the walk starts no route', async (t) => {
  const findGate = await gate();
  // The direct way: the streets are read (the map, then the cache), then the walk.
  for (const when of ['collect', 'getWalk']) {
    const h = mount(t, findGate);
    await cancelDuring(h, when, dest());
    assert.equal(h.nav.nav, null, `a direct Go here cancelled during ${when}: no route starts`);
    assert.equal(h.saved.length, 0, `a direct Go here cancelled during ${when}: no destination is saved`);
    assert.deepEqual(h.errors, [], 'nor is a failure said after Cancel');
  }
  // Walk me back: the trace and the cached streets around you, then the walk; no map read at all.
  for (const when of ['getSegmentsIn', 'getWalk']) {
    const h = mount(t, findGate);
    await cancelDuring(h, when, dest('start'));
    assert.equal(h.nav.nav, null, `Walk me back cancelled during ${when}: no route starts`);
    assert.equal(h.saved.length, 0, `Walk me back cancelled during ${when}: no destination is saved`);
  }
});

test('tend navigation 2: a Cancel ends with its find, so a later re-read of the streets is not stopped before it starts', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  const findGate = await gate();
  const h = mount(t, findGate);
  // Navigating to the spot east; then a second Go here, cancelled, leaves that route on.
  await h.nav.goTo(dest());
  assert.ok(h.nav.nav, 'navigating');
  await cancelDuring(h, 'getWalk', { ...dest(), at: at(0, -300) });
  assert.equal(h.nav.nav?.dest.at, EAST, 'the route east is still followed');
  // A minute on, off that route where no source reaches: the streets around are read again, and the read goes on.
  t.mock.timers.tick(61_000);
  h.world.streets = false;
  const reads = h.stops.length;
  await h.fix(at(150, 200), 2);
  await h.fix(at(150, 210), 3);
  assert.equal(h.stops.length, reads + 1, 'the streets around you are read again');
  assert.equal(h.stops.at(-1), false, 'and the read is not told to stop at once by the Cancel of a find that ended');
});

test('tend navigation 2: the decisions, pure: a find goes on only while it is the one under way and not cancelled', async () => {
  const { NO_FINDS, startFind, cancelFind, findGoesOn, endFind } = await gate();
  const a = startFind(NO_FINDS);
  assert.ok(a && a.busy, 'Go here starts a find');
  assert.equal(startFind(a), null, 'one route is found at a time: a second Go here while one is found waits for it');
  assert.equal(findGoesOn(a, a.gen), true, 'the find goes on');
  const c = cancelFind(a);
  assert.equal(findGoesOn(c, a.gen), false, 'Cancel stops it after the read at hand');
  const ended = endFind(c, a.gen);
  assert.deepEqual([ended.busy, ended.cancelled], [false, false], 'the find ends, and its Cancel with it');
  assert.deepEqual(cancelFind(NO_FINDS), NO_FINDS, 'Cancel with no find under way changes nothing');
  const b = startFind(ended)!;
  assert.ok(b.gen > a.gen && findGoesOn(b, b.gen) && !findGoesOn(b, a.gen), 'a later find is its own: an earlier one no longer goes on');
  assert.deepEqual(endFind(b, a.gen), b, 'an earlier find ending leaves the one under way alone');
});

test('tend navigation 3: a Go here tapped while a re-route reads the streets again is found at once, with its spinner', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  const findGate = await gate();
  const h = mount(t, findGate);
  await h.nav.goTo(dest());
  assert.ok(h.nav.nav, 'navigating east');
  // A minute on, off the route where no source reaches: the streets around are read again (up to 90 s), held here.
  t.mock.timers.tick(61_000);
  h.world.streets = false;
  const release = h.hold('collect');
  const reads = h.stops.length;
  await h.fix(at(150, 200), 2);
  await h.fix(at(150, 210), 3);
  assert.equal(h.stops.length, reads + 1, 'the re-read is under way');
  const reread = h.stopFns.at(-1)!;
  assert.equal(reread(), false, 'and goes on');
  // Go here meanwhile, somewhere new: it is not dropped. Its spinner shows, and the re-read stops after the view at hand.
  h.world.streets = true;
  const south: Waypoint = { ...dest(), at: at(0, -300), label: 'South' };
  const walkRead = h.hold('getWalk');
  const walkReads = h.asked.filter((x) => x === 'getWalk').length;
  const going = h.nav.goTo(south);
  for (let k = 0; k < 20 && h.asked.filter((x) => x === 'getWalk').length === walkReads; k++) await flush(1);
  assert.equal(h.nav.finding, true, 'the Go here is being found: "Finding a route" shows');
  assert.equal(reread(), true, 'the re-read for the route being replaced stops between views');
  release();
  walkRead();
  await going;
  await flush();
  assert.deepEqual(h.nav.nav?.dest.at, south.at, 'and the new route is followed');
  assert.equal(h.nav.finding, false, 'the spinner is gone');
});

test('tend navigation 3: the decisions, pure: a re-read has its own flag and never holds back a Go here', async () => {
  const { NO_FINDS, startFind, endFind, startReread, rereadStops, endReread } = await gate();
  const r = startReread(NO_FINDS, 61_000, 0, 60_000);
  assert.ok(r && r.reread !== null && !r.busy, 'a failed re-route reads the streets again, with no spinner');
  assert.equal(startReread(NO_FINDS, 59_000, 0, 60_000), null, 'at most once a minute');
  assert.equal(startReread(r, 200_000, 0, 60_000), null, 'one re-read at a time');
  assert.equal(rereadStops(r), false, 'it goes on');
  const f = startFind(r);
  assert.ok(f && f.busy, 'a Go here during a re-read starts its find at once');
  assert.equal(rereadStops(f), true, 'and the re-read, for the route being replaced, stops between views');
  assert.deepEqual(endReread(f), { finds: { ...f, reread: null }, keep: false }, 'its streets are not added to the new route');
  assert.equal(startReread(f, 200_000, 0, 60_000), null, 'no re-read while a Go here is found: it reads its own streets');
  const done = endReread(r);
  assert.deepEqual(done, { finds: { ...r, reread: null }, keep: true }, 'a re-read no Go here interrupted adds its streets');
  assert.equal(endFind(f, f.gen).reread, r.reread, 'a find ending leaves a re-read alone');
});

void (null as unknown as NavState);
