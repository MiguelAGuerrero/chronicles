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

function walk(node: ts.Node, visit: (n: ts.Node) => void) {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}

/** The `load` function Chronicle's map runs on focus and on its reloads. */
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

test('fix chronicle-focus-reload: Chronicle\'s load sets its state only after its last read, as one render', () => {
  const sf = ts.createSourceFile('index.tsx', readFileSync(FILE, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = loadFn(sf);
  const awaits: number[] = [];
  const sets: { name: string; at: number }[] = [];
  walk(fn.body, (n) => {
    if (nested(n, fn)) return;
    if (ts.isAwaitExpression(n)) awaits.push(n.getStart());
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && /^set[A-Z]/.test(n.expression.text)) sets.push({ name: n.expression.text, at: n.getStart() });
  });
  assert.ok(awaits.length > 0 && sets.length > 0, 'the load reads, then sets');
  const last = Math.max(...awaits);
  const early = sets.filter((s) => s.at < last).map((s) => s.name);
  assert.deepEqual(early, [], 'no state is set before the last await: each would be a render of its own');
});
