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
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ['then', 'catch', 'finally'].includes(n.expression.name.text) && !nested(n, fn)) {
      for (const arg of n.arguments) {
        if (ts.isIdentifier(arg) && /^set[A-Z]/.test(arg.text)) sets.push({ name: arg.text, at: n.getStart() });
        else walk(arg, (m) => {
          if (ts.isCallExpression(m) && ts.isIdentifier(m.expression) && /^set[A-Z]/.test(m.expression.text)) sets.push({ name: m.expression.text, at: n.getStart() });
        });
      }
    }
  });
  assert.ok(awaits.length > 0, 'the load reads');
  assert.ok(sets.length > 0, 'the load sets its state: a scan of nothing proves nothing (audit 6)');
  const last = Math.max(...awaits);
  return sets.filter((s) => s.at < last).map((s) => s.name);
}

test('fix chronicle-focus-reload: Chronicle\'s load sets its state only after its last read, as one render', () => {
  assert.deepEqual(setBeforeLastAwait(readFileSync(FILE, 'utf8')), [], 'no state is set before the last await: each would be a render of its own');
});

/**
 * Every guard on `live` in the load's own steps between taking the recall (`takeRecallOpen`) and recording what it
 * framed (the last `fittedTo.current =`): a blur there must not stop it. One is allowed, and only where it stands:
 * the `if (!live)` that is the very next statement after the recall's declaration, older than this fix and filed
 * (audit 5, DEFERRED: it can itself lose a recall taken while the screen blurs). Moved anywhere else, it is caught
 * (audit 4), as is any other form: `live &&`, a ternary, a second `if`.
 */
function liveGuardsAfterRecall(src: string): string[] {
  const fn = loadFn(parse(src));
  let recallStmt: ts.Statement | null = null;
  let framedAt = -1;
  walk(fn.body, (n) => {
    if (nested(n, fn)) return;
    if (ts.isCallExpression(n) && n.expression.getText() === 'takeRecallOpen' && !recallStmt) {
      let s: ts.Node = n;
      while (s.parent && !ts.isBlock(s.parent)) s = s.parent;
      recallStmt = s as ts.Statement;
    }
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && n.left.getText() === 'fittedTo.current') framedAt = Math.max(framedAt, n.getStart());
  });
  assert.ok(recallStmt, 'the load takes the recall');
  assert.ok(framedAt >= 0, 'the load records what it framed');
  const stmts = (recallStmt as ts.Statement).parent as ts.Block;
  const next = stmts.statements[stmts.statements.indexOf(recallStmt as ts.Statement) + 1];
  const allowed = next && ts.isIfStatement(next) && /^!\s*live$/.test(next.expression.getText()) ? next : null;
  const from = (recallStmt as ts.Statement).getEnd();
  const out: string[] = [];
  walk(fn.body, (n) => {
    if (nested(n, fn) || !ts.isIdentifier(n) || n.text !== 'live') return;
    if (n.getStart() < from || n.getStart() > framedAt) return;
    if (allowed && n.getStart() >= allowed.getStart() && n.getEnd() <= allowed.expression.getEnd()) return;
    if (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) return; // `x.live` is another thing
    let line: ts.Node = n;
    while (line.parent && !ts.isBlock(line.parent)) line = line.parent;
    out.push(line.getText().split('\n')[0]);
  });
  return out;
}

test('fix chronicle-focus-reload audit 1: a load cut off by a blur still counts its places as framed, so coming back keeps the view', () => {
  // H5, audit 2 of the home map: a quiet load (a walk placed in the background) records what it framed in
  // `fittedTo` even while a replay is open over it; stopped early on `live`, the return from the replay refits.
  assert.deepEqual(liveGuardsAfterRecall(readFileSync(FILE, 'utf8')), [], 'no `live` guard between the recall and `fittedTo`');
});

test('fix chronicle-focus-reload audit 2: a recall the load has taken is shown even when the screen blurs before its reads end', () => {
  // R4, NV13: takeRecallOpen clears the stored recall as it returns it, so a load that then stops on `live` loses it.
  const src = readFileSync(FILE, 'utf8');
  assert.deepEqual(liveGuardsAfterRecall(src), [], 'nothing between taking the recall and setting it stops the load');
  const fn = loadFn(parse(src));
  const awaits: number[] = [];
  const recalls: number[] = [];
  walk(fn.body, (n) => {
    if (nested(n, fn)) return;
    if (ts.isAwaitExpression(n)) awaits.push(n.getStart());
    if (ts.isCallExpression(n) && n.expression.getText() === 'setRecalled' && n.arguments[0]?.getText() === 'recalled') recalls.push(n.getStart());
  });
  assert.equal(recalls.length, 1, 'the taken recall is set, once');
  assert.ok(recalls[0] > Math.max(...awaits), 'after the last read, so nothing in between can drop it');
});

test('fix chronicle-focus-reload audit 4: the guard scan catches a `live` check moved, added or written another way', () => {
  const wrap = (body: string) => `const load = async () => {\n${body}\n};`;
  const head = 'const recalled = await takeRecallOpen();';
  const tail = 'fittedTo.current = key;\n if (recalled.length) setRecalled(recalled);';
  // As the app has it: the one check right after the recall, nothing after the reads.
  assert.deepEqual(liveGuardsAfterRecall(wrap(`${head}\n if (!live) return null;\n const r = await Promise.all([a(), b()]);\n setX(r);\n ${tail}`)), []);
  // The check moved below the reads: caught, though there is still only one.
  assert.equal(liveGuardsAfterRecall(wrap(`${head}\n const r = await Promise.all([a(), b()]);\n if (!live) return null;\n setX(r);\n ${tail}`)).length, 1);
  // A second check added after the reads: caught.
  assert.equal(liveGuardsAfterRecall(wrap(`${head}\n if (!live) return null;\n const r = await a();\n if (!live) return null;\n ${tail}`)).length, 1);
  // Other forms: `live &&`, a ternary.
  assert.equal(liveGuardsAfterRecall(wrap(`${head}\n const r = await a();\n live && setX(r);\n ${tail}`)).length, 1);
  assert.equal(liveGuardsAfterRecall(wrap(`${head}\n const r = await a();\n const go = live ? 1 : 0;\n ${tail}`)).length, 1);
  // Another object's `live` is not the guard.
  assert.deepEqual(liveGuardsAfterRecall(wrap(`${head}\n if (!live) return null;\n const r = await a();\n setX(r.live);\n ${tail}`)), []);
});

test('fix chronicle-focus-reload audit 3: the scan catches a setter handed to a read before the last await', () => {
  const wrap = (body: string) => `const load = async () => {\n${body}\n};`;
  assert.deepEqual(setBeforeLastAwait(wrap('db.listFinds().then(setFinds);\n const a = await db.listWalks();\n setData(a);')), ['setFinds']);
  assert.deepEqual(setBeforeLastAwait(wrap('db.listFinds().then((f) => setFinds(f));\n const a = await db.listWalks();\n setData(a);')), ['setFinds']);
  assert.deepEqual(setBeforeLastAwait(wrap('setChecklists(await db.listChecklistAreas());\n const a = await db.listWalks();\n setData(a);')), ['setChecklists']);
  assert.deepEqual(setBeforeLastAwait(wrap('const [a, b] = await Promise.all([db.listWalks(), db.listFinds()]);\n setData(a);\n setFinds(b);')), []);
});

test('fix chronicle-focus-reload audit 6: the scan catches a setter in a .catch before the last await, and a load that sets nothing', () => {
  const wrap = (body: string) => `const load = async () => {\n${body}\n};`;
  assert.deepEqual(setBeforeLastAwait(wrap('db.listFinds().catch(() => setFinds([]));\n const a = await db.listWalks();\n setData(a);')), ['setFinds']);
  assert.throws(() => setBeforeLastAwait(wrap('const a = await db.listWalks();\n store.set(a);')), /scan of nothing/);
});
