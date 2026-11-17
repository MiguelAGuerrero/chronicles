/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

// fix chronicle-focus-reload (Nov 17): Chronicle's map (the Map, Walks and Days sections) loaded its reads one after
// another and set React state between awaits. Each await ends React's batch, so every `setX(await …)` was a render of
// its own: opening a section rendered the map 6 times with nothing stored (perfCount 'render:home'), each render
// redrawing its pins. The screen can't render under `npm test`, so this reads its source: in the load, every state
// update comes after the last await, where React takes them as one render.

const FILE = join(__dirname, '../../../app/(tabs)/index.tsx');
const parse = (src: string) => ts.createSourceFile('index.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function walk(node: ts.Node, visit: (n: ts.Node) => void) {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}

/** The `load` function Chronicle's map runs on focus, on its returns from a replay or day, and on its reloads. */
function loadFn(sf: ts.SourceFile): ts.ArrowFunction {
  let found: ts.ArrowFunction | null = null;
  walk(sf, (n) => {
    if (ts.isVariableDeclaration(n) && n.name.getText() === 'load' && n.initializer && ts.isArrowFunction(n.initializer)) found ??= n.initializer;
  });
  assert.ok(found, 'Chronicle has its load');
  return found;
}

/** Whether `n` sits in a function nested inside `fn` (a callback runs later, not as part of this load's steps). */
function nested(n: ts.Node, fn: ts.Node): boolean {
  for (let p = n.parent; p && p !== fn; p = p.parent) if (ts.isFunctionLike(p)) return true;
  return false;
}

/**
 * The state set before the load's last await, each a render of its own: a `setX(…)` call in the load's own steps,
 * and a setter handed to a promise (`.then(setX)`, `.then((v) => setX(v))`), which runs when that read resolves.
 */
function setBeforeLastAwait(src: string): string[] {
  const fn = loadFn(parse(src));
  const awaits: number[] = [];
  const sets: { name: string; at: number }[] = [];
  walk(fn.body, (n) => {
    if (ts.isAwaitExpression(n) && !nested(n, fn)) awaits.push(n.getStart());
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && /^set[A-Z]/.test(n.expression.text)) {
      if (!nested(n, fn)) sets.push({ name: n.expression.text, at: n.getStart() });
    }
    // A promise's callback: a setter passed by name, or called inside the callback, runs as that read resolves.
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ['then', 'finally'].includes(n.expression.name.text) && !nested(n, fn)) {
      for (const arg of n.arguments) {
        if (ts.isIdentifier(arg) && /^set[A-Z]/.test(arg.text)) sets.push({ name: arg.text, at: n.getStart() });
        else walk(arg, (m) => {
          if (ts.isCallExpression(m) && ts.isIdentifier(m.expression) && /^set[A-Z]/.test(m.expression.text)) sets.push({ name: m.expression.text, at: n.getStart() });
        });
      }
    }
  });
  assert.ok(awaits.length > 0, 'the load reads');
  const last = Math.max(...awaits);
  return sets.filter((s) => s.at < last).map((s) => s.name);
}

test('fix chronicle-focus-reload: Chronicle\'s load sets its state only after its last read, as one render', () => {
  assert.deepEqual(setBeforeLastAwait(readFileSync(FILE, 'utf8')), [], 'no state is set before the last await: each would be a render of its own');
});

/**
 * The load's own steps after it has taken the recall (`takeRecallOpen`), up to its end: a blur there must not stop it.
 * Before this fix the load went on to the end once the recall was taken, blurred or not, and the screen relies on it.
 */
function liveReturnsAfterRecall(src: string): string[] {
  const fn = loadFn(parse(src));
  let recallAt = -1;
  walk(fn.body, (n) => {
    if (ts.isCallExpression(n) && n.expression.getText() === 'takeRecallOpen' && !nested(n, fn)) recallAt = Math.max(recallAt, n.getStart());
  });
  assert.ok(recallAt >= 0, 'the load takes the recall');
  // The check right after the recall read itself stays: the recall's own await, before anything was taken.
  const out: string[] = [];
  walk(fn.body, (n) => {
    if (ts.isIfStatement(n) && !nested(n, fn) && /\blive\b/.test(n.expression.getText()) && n.getStart() > recallAt) out.push(n.getText().split('\n')[0]);
  });
  // The one check that follows the recall's own await is allowed (it guards `takeRecallOpen` itself, as before).
  return out.slice(1);
}

test('fix chronicle-focus-reload audit 1: a load cut off by a blur still counts its places as framed, so coming back keeps the view', () => {
  // H5, audit 2 of the home map: a quiet load (a walk placed in the background) records what it framed in
  // `fittedTo` even while a replay is open over it; stopped early on `live`, the return from the replay refits.
  assert.deepEqual(liveReturnsAfterRecall(readFileSync(FILE, 'utf8')), [], 'no `live` return between the reads and `fittedTo`');
});

test('fix chronicle-focus-reload audit 2: a recall the load has taken is shown even when the screen blurs before its reads end', () => {
  // R4, NV13: takeRecallOpen clears the stored recall as it returns it, so a load that then stops on `live` loses it.
  const src = readFileSync(FILE, 'utf8');
  assert.deepEqual(liveReturnsAfterRecall(src), [], 'nothing between taking the recall and setRecalled stops the load');
  assert.match(src, /if \(recalled\.length\) setRecalled\(recalled\);/, 'the taken recall is set');
});

test('fix chronicle-focus-reload audit 3: the scan catches a setter handed to a read before the last await', () => {
  const wrap = (body: string) => `const load = async () => {\n${body}\n};`;
  assert.deepEqual(setBeforeLastAwait(wrap('db.listFinds().then(setFinds);\n const a = await db.listWalks();\n setData(a);')), ['setFinds']);
  assert.deepEqual(setBeforeLastAwait(wrap('db.listFinds().then((f) => setFinds(f));\n const a = await db.listWalks();\n setData(a);')), ['setFinds']);
  assert.deepEqual(setBeforeLastAwait(wrap('setChecklists(await db.listChecklistAreas());\n const a = await db.listWalks();\n setData(a);')), ['setChecklists']);
  assert.deepEqual(setBeforeLastAwait(wrap('const [a, b] = await Promise.all([db.listWalks(), db.listFinds()]);\n setData(a);\n setFinds(b);')), []);
});
