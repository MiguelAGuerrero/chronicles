/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

// Performance review (Nov 18): on the phone each `runAsync` is a trip across the JS-native bridge with its SQL parsed
// again, so a write loop over many rows prepares its statement once and executes it per row (`prepareAsync`,
// finalized in `finally`), as appendPoints, putSegments and putPlaces do. The store can't run under `npm test` with
// expo-sqlite, so this reads its source (.claude/rules/performance.md, "Testing a cost").

const FILE = join(__dirname, '../../db/sqliteStore.ts');

/** Loops that may still run a statement per row, named `method: collection`: their n is a handful (a moment's pieces,
 * a delete's walks, a thread's changes, the tables of a delete, an area's checklist, a reaction or two). This list
 * only shrinks. */
const SMALL = new Set([
  'dissolveThin: new Set(ids)',
  'addMoment: m.pieces',
  'deletePieces: new Set(hit.map((h) => h.walk_id))',
  'applyThreads: c.putThreads ?? []',
  'applyThreads: c.putMembers ?? []',
  'applyThreads: c.putLinks ?? []',
  'applyThreads: c.deleteThreads ?? []',
  'applyThreads: c.deleteMembers ?? []',
  'applyThreads: c.deleteLinks ?? []',
  "deleteWalk: ['moment', 'trace_point', 'pause', 'still', 'gap_fill', 'visited_segment', 'walk_area', 'find', 'mark', 'walk_summary']",
  'deleteMoments: new Set(got.map((c) => c.walk_id))',
  'saveSnap: placed.areas',
  'saveSnap: placed.rows',
  'saveChecklists: areas',
  'setReactions: rows',
]);

function walk(node: ts.Node, visit: (n: ts.Node) => void) {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}

/** `method: collection` for a loop: the store method (or function) it sits in, and what it runs over. */
function owner(loop: ts.ForOfStatement): string {
  for (let p: ts.Node | undefined = loop.parent; p; p = p.parent) {
    if ((ts.isMethodDeclaration(p) || ts.isPropertyAssignment(p) || ts.isFunctionDeclaration(p)) && p.name) {
      return `${p.name.getText()}: ${loop.expression.getText().replace(/\s+/g, ' ')}`;
    }
  }
  return `?: ${loop.expression.getText()}`;
}

/** Every loop over rows whose body runs a statement through `runAsync` (not a prepared statement). */
export function perRowWrites(src: string): string[] {
  const sf = ts.createSourceFile('s.ts', src, ts.ScriptTarget.Latest, true);
  const out = new Set<string>();
  walk(sf, (n) => {
    if (!ts.isForOfStatement(n)) return;
    walk(n.statement, (m) => {
      if (ts.isCallExpression(m) && ts.isPropertyAccessExpression(m.expression) && m.expression.name.text === 'runAsync') out.add(owner(n));
    });
  });
  return [...out].sort();
}

test('a write loop over many rows prepares its statement once (sqliteStore)', () => {
  const found = perRowWrites(readFileSync(FILE, 'utf8'));
  assert.ok(found.length > 0, 'the scan finds the small loops it allows: a scan of nothing proves nothing');
  assert.deepEqual(found.filter((f) => !SMALL.has(f)), [], 'prepare once (prepareAsync), execute per row, finalize in finally');
});

test('the prepared-writes scan is shown to fail on a per-row loop, and passes a prepared one', () => {
  const perRow = `const s = { putComplexes(rows) { return write(async (t) => { for (const c of rows) { await t.runAsync('INSERT', c.id); } }); } };`;
  const prepared = `const s = { putComplexes(rows) { return write(async (t) => { const st = await t.prepareAsync('INSERT'); try { for (const c of rows) await st.executeAsync(c.id); } finally { await st.finalizeAsync(); } }); } };`;
  assert.deepEqual(perRowWrites(perRow), ['putComplexes: rows']);
  assert.deepEqual(perRowWrites(prepared), []);
});
