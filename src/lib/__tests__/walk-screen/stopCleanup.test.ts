/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

// walk-screen compiler (the owner's one-off run, 2026-11-19): the React Compiler skipped the whole WalkScreen for its
// three `try/finally` (Stop, Pause/Resume, a gap's Keep or Not this way), so each is written as a try/catch that holds
// a throw, the cleanup, then the throw again. The journeys never make storage throw mid-Stop, nor the catch itself, so
// these run the handlers' own source, lifted from walk.tsx's syntax tree, with what they call swapped for fakes that
// log each call (as goHere.test.ts runs a hook's source): every way out runs the cleanup once, last, and a throw goes on.

const WALK = join(__dirname, '../../../app/walk.tsx');

/** The source of a handler declared in WalkScreen: `function name` or `const name = async (...) => ...`. */
function handlerSource(file: string, name: string): string {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found: string | null = null;
  const visit = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === name) found = n.getText(sf);
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer) found = n.initializer.getText(sf);
    else ts.forEachChild(n, visit);
  };
  visit(sf);
  assert.ok(found, `WalkScreen declares ${name}`);
  return found;
}

/** The handler, run with its free names bound to `fakes`; a name not given throws as it is reached. */
function load(name: string, fakes: Record<string, unknown>, file = WALK): (...a: unknown[]) => Promise<void> {
  const code = ts.transpileModule(`(${handlerSource(file, name)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const expr = code.replace(/^"use strict";\s*/, '').trim().replace(/;$/, '');
  return new Function(...Object.keys(fakes), `"use strict"; return ${expr};`)(...Object.values(fakes));
}

const boom = new Error('boom');
const failing = () => Promise.reject(boom);

/** Stop's world: the walk, the voice memo's end, the holder's settle, the end both Stops share, the way out. */
function stopWorld(over: Partial<{ finishVoice: () => Promise<unknown>; stopEnd: () => Promise<unknown>; setNotice: (n: unknown) => void; stopping: boolean; walk: unknown }> = {}) {
  const log: string[] = [];
  const say = (what: string) => () => void log.push(what);
  const fakes = {
    walk: 'walk' in over ? over.walk : { id: 'w1' },
    stopping: over.stopping ?? false,
    setStopping: (v: boolean) => log.push(`stopping ${v}`),
    setNotice: over.setNotice ?? ((n: { message: string }) => log.push(`notice ${n.message}`)),
    setEnded: say('ended'),
    // tend walk-screen audit 33: Stop lets a memo set aside go as it begins, through the captures' Close.
    cap: { finishVoice: over.finishVoice ?? (async () => 'none'), closeDiscard: async () => 'none' },
    lostAtStop: (s: string) => `lost: ${s}`,
    saveFailLine: () => 'memo',
    settleWithin: async () => void log.push('settled'),
    memoGate: { kept: async () => {} },
    unsaved: { settled: async () => {} },
    STOP_WAIT_MS: 5000,
    stopEnd: over.stopEnd ?? (async () => ({ dropped: false })),
    warnedHeld: { current: [] as string[] },
    // fix edit-after-capture audit 3: no editor opens after a capture while Stop runs; it is set with `stopping`.
    stoppingNow: { current: false },
    // tend walk-screen audit 20: a photo's editor waiting on the memo is let go as Stop begins (counted, not logged).
    editAfter: { closed: 0, close() { this.closed += 1; } },
    stopWarning: () => 'held',
    feedback: (k: string) => log.push(`feedback ${k}`),
    exitPlan: () => ({ kind: 'back' }),
    router: { canGoBack: () => true, back: say('back'), replace: (to: string) => log.push(`replace ${to}`) },
  };
  return { log, fakes };
}

const cleanupOnceLast = (log: string[], flag: string) => {
  assert.equal(log.filter((x) => x === `${flag} false`).length, 1, `${flag} is cleared once: ${log.join(' | ')}`);
  assert.equal(log.at(-1), `${flag} false`, `and last: ${log.join(' | ')}`);
};

test('walk-screen compiler 1: Stop clears stopping once, last, on every way out, and a throw from its catch goes on after it', async () => {
  // The walk ends and the replay replaces it.
  let w = stopWorld();
  await load('stop', w.fakes)();
  assert.deepEqual(w.log, ['stopping true', 'settled', 'feedback success', 'replace /replay/w1', 'stopping false']);
  // An empty walk is dropped: back to where the walker was.
  w = stopWorld({ stopEnd: async () => ({ dropped: true }) });
  await load('stop', w.fakes)();
  assert.deepEqual(w.log, ['stopping true', 'settled', 'feedback success', 'back', 'stopping false']);
  // A memo lost at Stop is said, and the walk goes on (the early way out, before the settle).
  w = stopWorld({ finishVoice: async () => 'lost' });
  await load('stop', w.fakes)();
  assert.deepEqual(w.log, ['stopping true', 'notice lost: memo', 'stopping false']);
  // Held captures are warned of (the other early way out).
  w = stopWorld({ stopEnd: async () => ({ warn: [{ id: 'c1', kind: 'photo' }] }) });
  await load('stop', w.fakes)();
  assert.deepEqual(w.log, ['stopping true', 'settled', 'notice held', 'stopping false']);
  assert.deepEqual(w.fakes.warnedHeld.current, ['c1']);
  // A failure is said on the walk, and Stop resolves.
  w = stopWorld({ stopEnd: failing });
  await load('stop', w.fakes)();
  assert.deepEqual(w.log, ['stopping true', 'settled', 'notice The walk could not be stopped: boom', 'stopping false']);
  // The catch itself throws: stopping is still cleared, then the throw goes on, as a finally let it.
  const said = new Error('said');
  w = stopWorld({ finishVoice: failing, setNotice: () => { throw said; } });
  await assert.rejects(load('stop', w.fakes)(), (e) => e === said);
  cleanupOnceLast(w.log, 'stopping');
  // fix edit-after-capture audit 3: the flag the camera reads is down again on every way out, a throw included.
  for (const o of [{}, { stopEnd: async () => ({ dropped: true }) }, { finishVoice: async () => 'lost' }, { stopEnd: failing }]) {
    w = stopWorld(o);
    await load('stop', w.fakes)();
    assert.equal(w.fakes.stoppingNow.current, false);
  }
  w = stopWorld({ finishVoice: failing, setNotice: () => { throw said; } });
  await assert.rejects(load('stop', w.fakes)());
  assert.equal(w.fakes.stoppingNow.current, false);
  // No walk, or a Stop already under way: nothing at all.
  for (const o of [{ walk: null }, { stopping: true }]) {
    w = stopWorld(o);
    await load('stop', w.fakes)();
    assert.deepEqual(w.log, []);
  }
});

/** Pause and Resume's world: the session's calls, the refusal's notice, and the walk re-read after either. */
function pauseWorld(paused: boolean, over: Partial<{ resumeWalk: () => Promise<void>; pauseWalk: () => Promise<void>; notifyWalkChanged: () => Promise<void>; startErrorFrom: (e: unknown) => unknown }> = {}) {
  const log: string[] = [];
  const fakes = {
    walk: { id: 'w1' },
    pausing: false,
    paused,
    setPausing: (v: boolean) => log.push(`pausing ${v}`),
    askMotion: async () => void log.push('motion'),
    resumeWalk: over.resumeWalk ?? (async () => void log.push('resumed')),
    pauseWalk: over.pauseWalk ?? (async () => void log.push('paused')),
    cap: { finishVoice: async () => void log.push('memo') },
    setNotice: (n: { message: string } | ((x: null) => unknown)) => log.push(typeof n === 'function' ? 'notice cleared' : `notice ${n.message}`),
    noticeShown: () => null,
    AccessibilityInfo: { announceForAccessibility: (s: string) => log.push(`said ${s}`) },
    feedback: (k: string) => log.push(`feedback ${k}`),
    startErrorFrom: over.startErrorFrom ?? ((e: unknown) => ({ message: (e as Error).message, tone: (e as { tone?: string }).tone ?? 'error', openSettings: false })),
    raisedError: { current: null as string | null },
    shownError: { current: null as string | null },
    saidCount: { current: 0 },
    notifyWalkChanged: over.notifyWalkChanged ?? (async () => void log.push('reread')),
  };
  return { log, fakes };
}

test('walk-screen compiler 2: Pause and Resume re-read the walk, then clear pausing, on every way out; a throw goes on after', async () => {
  let w = pauseWorld(false);
  await load('togglePause', w.fakes)();
  assert.deepEqual(w.log, ['pausing true', 'memo', 'paused', 'said Walk paused. Nothing is recorded until you resume.', 'feedback tap', 'reread', 'pausing false']);
  w = pauseWorld(true);
  await load('togglePause', w.fakes)();
  assert.deepEqual(w.log, ['pausing true', 'motion', 'resumed', 'notice cleared', 'said Walk resumed', 'feedback tap', 'reread', 'pausing false']);
  // A failed pause is said; the walk is re-read all the same.
  w = pauseWorld(false, { pauseWalk: failing });
  await load('togglePause', w.fakes)();
  assert.deepEqual(w.log, ['pausing true', 'memo', 'notice Could not pause: boom', 'reread', 'pausing false']);
  // Resume refused (location, quiet): the refusal's notice, said once.
  w = pauseWorld(true, { resumeWalk: () => Promise.reject(Object.assign(new Error('Location is off'), { tone: 'info' })) });
  await load('togglePause', w.fakes)();
  assert.deepEqual(w.log, ['pausing true', 'motion', 'notice Location is off', 'said Location is off', 'reread', 'pausing false']);
  assert.equal(w.fakes.saidCount.current, 1);
  // The catch itself throws: the walk is re-read and pausing cleared, then the throw goes on.
  const odd = new Error('odd');
  w = pauseWorld(false, { pauseWalk: failing, startErrorFrom: () => { throw odd; } });
  await assert.rejects(load('togglePause', w.fakes)(), (e) => e === odd);
  assert.deepEqual(w.log, ['pausing true', 'memo', 'reread', 'pausing false']);
  // The re-read itself fails: its throw goes on in place of any other, and pausing stays set, as a finally's did.
  const lost = new Error('lost');
  for (const pauseWalk of [undefined, failing]) {
    w = pauseWorld(false, { notifyWalkChanged: () => Promise.reject(lost), ...(pauseWalk ? { pauseWalk, startErrorFrom: () => { throw odd; } } : {}) });
    await assert.rejects(load('togglePause', w.fakes)(), (e) => e === lost);
    assert.equal(w.log.includes('pausing false'), false);
  }
});

test('walk-screen compiler 3: a gap\'s Keep or Not this way clears busy once, last, and a throw from its catch goes on after', async () => {
  const run = async (decide: () => Promise<void>, setNotice: (n: { message: string }) => void = () => {}) => {
    const log: string[] = [];
    const go = load('decideGap', {
      openGap: { t0: 1 },
      setGapBusy: (v: boolean) => log.push(`busy ${v}`),
      gapView: { decide: async () => { log.push('decide'); await decide(); } },
      setGapOpen: () => log.push('closed'),
      setNotice: (n: { message: string }) => { log.push(`notice ${n.message}`); setNotice(n); },
    });
    return { log, done: go('kept') };
  };
  let r = await run(async () => {});
  await r.done;
  assert.deepEqual(r.log, ['busy true', 'decide', 'closed', 'busy false']);
  r = await run(failing);
  await r.done;
  assert.deepEqual(r.log, ['busy true', 'decide', 'notice Couldn’t save that. Try again.', 'busy false']);
  const said = new Error('said');
  r = await run(failing, () => { throw said; });
  await assert.rejects(r.done, (e) => e === said);
  cleanupOnceLast(r.log, 'busy');
});

test('tend walk-screen audit 20: Stop lets go a photo\'s editor that waited on the memo, before the memo is saved', async () => {
  const w = stopWorld({ finishVoice: async () => { w.log.push(`editor closed ${(w.fakes.editAfter as { closed: number }).closed}`); return 'saved'; } });
  await load('stop', w.fakes)();
  assert.equal(w.log[1], 'editor closed 1');
});
