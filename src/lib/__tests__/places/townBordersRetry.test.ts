/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { bordersFor, outlineIdsOf } from '../../areas/borders';
import { outlineTileFrom } from '../../areas/divisionTiles';
import { BORDER_ZOOM, OUTLINE_ZOOM, outlineTileKey, outlineTilesFor, type OutlineSet } from '../../areas/outlines';
import type { overtureOutlines } from '../../areas/overtureOutlines';
import type { useOutlineSet } from '../../areas/useOutlineSet';
import type { LngLat } from '../../types';

// TB12: a slow read of the wide (z10) tile has 45 s, and a failed read is tried again every 30 s while
// the screen is open. The timeout lives in the Overture adapter and the retry in the view hook; both
// import what Node can't load (the db, React), so each file's own source is run here with its imports
// swapped for fakes (a stalled archive; a few lines of React's hooks), under mocked timers.

/** Runs a module's own source with its imports replaced by `bindings` (by imported name). */
function loadSource<T>(rel: string, bindings: Record<string, unknown>): T {
  const src = readFileSync(join(__dirname, '..', '..', rel), 'utf8').replace(/^import [^;]+;$/gm, '');
  const code = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  new Function('module', 'exports', ...Object.keys(bindings), code)(mod, mod.exports, ...Object.values(bindings));
  return mod.exports as T;
}

const flush = () => new Promise<void>((r) => setImmediate(r));

test('TB12: a z10 tile read has 45 s before it gives up, a z12 one 15 s', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const aborted: number[] = [];
  /** An archive whose reads answer only when told, or when aborted. */
  const answers: (() => void)[] = [];
  class StalledArchive {
    getZxy(z: number, _x: number, _y: number, signal: AbortSignal) {
      return new Promise((res, rej) => {
        answers.push(() => res(null));
        signal.addEventListener('abort', () => {
          aborted.push(z);
          rej(new Error('aborted'));
        });
      });
    }
  }
  const { overtureOutlines: source } = loadSource<{ overtureOutlines: typeof overtureOutlines }>('areas/overtureOutlines.ts', {
    VectorTile: null, PbfReader: null, PMTiles: StalledArchive,
    ensureOvertureRelease: async () => '2026-10-21.0', overtureDivisionsUrl: (r: string) => `https://o.example/${r}`, outlineTileFrom,
  });
  const outcome = (p: Promise<unknown>) => {
    const o = { state: 'pending' as 'pending' | 'read' | 'gave up' };
    p.then(() => (o.state = 'read'), () => (o.state = 'gave up'));
    return o;
  };

  // The wide tile, slow: still waited for at 44.9 s, given up (and aborted) at 45 s.
  const wide = outcome(source.tile('r', 300, 380, BORDER_ZOOM));
  t.mock.timers.tick(44_900);
  await flush();
  assert.equal(wide.state, 'pending', 'a z10 read is still waited for at 44.9 s');
  t.mock.timers.tick(100);
  await flush();
  assert.equal(wide.state, 'gave up', 'given up at 45 s');
  assert.deepEqual(aborted, [BORDER_ZOOM], 'the request itself is aborted');

  // A wide tile that answers at 44 s is read, not lost.
  const slow = outcome(source.tile('r', 300, 380, BORDER_ZOOM));
  t.mock.timers.tick(44_000);
  answers.at(-1)!();
  await flush();
  assert.equal(slow.state, 'read', 'a slow wide tile that answers within 45 s is kept');

  // Deciding's z12 tile keeps its 15 s.
  const small = outcome(source.tile('r', 1200, 1520, OUTLINE_ZOOM));
  t.mock.timers.tick(15_000);
  await flush();
  assert.equal(small.state, 'gave up', 'a z12 read gives up at 15 s');
});

/** Just enough of React's hooks to run one hook: state, refs, memos and effects with deps, re-rendered on set. */
function hookHost<A extends unknown[], R>(hook: (...a: A) => R, args: A) {
  type Slot = { v?: unknown; deps?: unknown[]; cleanup?: (() => void) | void; current?: unknown };
  const slots: Slot[] = [];
  let i = 0;
  let queue: (() => void)[] = [];
  let mounted = true;
  /** State set after unmount: a timer the hook left running. */
  let late = 0;
  const same = (a?: unknown[], b?: unknown[]) => !!a && !!b && a.length === b.length && a.every((x, k) => Object.is(x, b[k]));
  const React = {
    useState(init: unknown) {
      const k = i++;
      slots[k] ??= { v: typeof init === 'function' ? (init as () => unknown)() : init };
      const s = slots[k];
      return [s.v, (next: unknown) => {
        s.v = typeof next === 'function' ? (next as (v: unknown) => unknown)(s.v) : next;
        if (mounted) queueMicrotask(render);
        else late++;
      }];
    },
    useRef(init: unknown) {
      const k = i++;
      slots[k] ??= { current: init };
      return slots[k];
    },
    useMemo(fn: () => unknown, deps: unknown[]) {
      const k = i++;
      if (!slots[k] || !same(slots[k].deps, deps)) slots[k] = { v: fn(), deps };
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
  let result: R;
  function render() {
    if (!mounted) return;
    i = 0;
    queue = [];
    result = hook(...args);
    for (const run of queue) run();
  }
  return {
    React,
    start: render,
    get result() {
      return result;
    },
    get lateSets() {
      return late;
    },
    unmount() {
      mounted = false;
      for (const s of slots) if (s?.cleanup) s.cleanup();
    },
  };
}

function outlineHook(reads: ('fail' | 'throw' | 'ok')[]) {
  const asked: string[] = [];
  const done: OutlineSet = { tiles: new Set(['10/300/380']), towns: [] };
  const answer = async () => {
    const r = reads[asked.length - 1] ?? 'ok';
    if (r === 'throw') throw new Error('offline');
    return { complete: r === 'ok', tooMany: false, set: r === 'ok' ? done : { tiles: new Set<string>(), towns: [] } };
  };
  const outlines = {
    known: async () => ({ tiles: new Set<string>(), towns: [] }),
    async borders() {
      asked.push('borders');
      return answer();
    },
    async read() {
      asked.push('read');
      return answer();
    },
  };
  // The hooks the module imports call into the host mounted last.
  let host: ReturnType<typeof hookHost<[LngLat[], number, boolean], OutlineSet | null>> | null = null;
  const mod = loadSource<{ useOutlineSet: typeof useOutlineSet }>('areas/useOutlineSet.ts', {
    useEffect: (fn: () => (() => void) | void, deps?: unknown[]) => host!.React.useEffect(fn, deps),
    useMemo: (fn: () => unknown, deps: unknown[]) => host!.React.useMemo(fn, deps),
    useRef: (init: unknown) => host!.React.useRef(init),
    useState: (init: unknown) => host!.React.useState(init),
    bordersFor, outlineIdsOf, outlines, BORDER_ZOOM, OUTLINE_ZOOM, outlineTileKey, outlineTilesFor,
  });
  const at: LngLat = [-71.4, 41.82];
  return {
    asked, done,
    mount(active = true) {
      host = hookHost(mod.useOutlineSet as (p: LngLat[], z: number, a: boolean) => OutlineSet | null, [[at], BORDER_ZOOM, active]);
      host.start();
      return host;
    },
  };
}

test('TB12: a failed read of the borders is tried again every 30 s while the screen is open, and stops once read', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = outlineHook(['fail', 'throw', 'ok']);
  const screen = h.mount();
  await flush();
  assert.equal(h.asked.length, 1, 'read once on opening');
  t.mock.timers.tick(29_999);
  await flush();
  assert.equal(h.asked.length, 1, 'not again before 30 s');
  t.mock.timers.tick(1);
  await flush();
  assert.equal(h.asked.length, 2, 'a read that came back incomplete is tried again at 30 s');
  t.mock.timers.tick(30_000);
  await flush();
  assert.equal(h.asked.length, 3, 'a read that failed outright is tried again at 30 s too');
  assert.equal(screen.result, h.done, 'the borders read are what the screen gets');
  t.mock.timers.tick(120_000);
  await flush();
  assert.equal(h.asked.length, 3, 'once read, nothing is asked again');
  screen.unmount();
});

test('TB12: closing the screen stops the retries; a screen not open reads nothing', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = outlineHook(['fail', 'fail', 'fail']);
  const screen = h.mount();
  await flush();
  assert.equal(h.asked.length, 1);
  screen.unmount();
  t.mock.timers.tick(90_000);
  await flush();
  assert.equal(h.asked.length, 1, 'no retry after the screen closed');
  assert.equal(screen.lateSets, 0, 'its timer was cleared, not left to fire');

  const idle = outlineHook(['fail']);
  const hidden = idle.mount(false);
  t.mock.timers.tick(60_000);
  await flush();
  assert.equal(idle.asked.length, 0, 'not active: nothing read');
  assert.equal(hidden.result, null);
  hidden.unmount();
});
