/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

// tend map 17: the web map's pin, star and "?" taps read their handlers from refs (`latest`, `starLatest`,
// `markLatest`). Those were filled in passive effects, which run after paint, so a tap in the frame after a render
// reached the previous handler and the state it closed over; the map's own handlers moved to a layout effect for that
// reason (audit 8), and native's pins fill theirs the same way (native-map-frames audit 4). The web map can't render
// under `npm test`, so the wiring is read from its source, as mapFrames.test.ts does.

const WEB = join(__dirname, '../../../components/map/WalkMap.web.tsx');

function walk(node: ts.Node, visit: (n: ts.Node) => void) {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}
/** The hook whose callback holds `node`: the nearest enclosing `useLayoutEffect(…)` or `useEffect(…)`. */
function enclosingHook(node: ts.Node): string | null {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isCallExpression(p) && ['useLayoutEffect', 'useEffect'].includes(p.expression.getText())) return p.expression.getText();
  }
  return null;
}

test('tend map 17: the pin, star and "?" tap handlers are filled before paint, as the map\'s own are', () => {
  const sf = ts.createSourceFile(WEB, readFileSync(WEB, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fills = new Map<string, string | null>();
  walk(sf, (n) => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const left = n.left.getText();
      if (['latest.current', 'starLatest.current', 'markLatest.current'].includes(left)) fills.set(left, enclosingHook(n));
    }
  });
  for (const ref of ['latest.current', 'starLatest.current', 'markLatest.current']) {
    assert.ok(fills.has(ref), `the web map still fills ${ref}`);
    assert.equal(fills.get(ref), 'useLayoutEffect', `${ref} is filled in a layout effect: a passive one lets a tap in the next frame reach the previous handler`);
  }
});

// tend map audit 40 (the review's F40): the test above held where the refs are filled, not that a tap reads them. A fill
// in a cleanup or a timer inside the layout effect, a second fill in a passive effect, or a click listener calling the
// handler it closed over all passed it. Every fill is now held to a layout effect's own body, and every marker click to
// reading its ref, with no bare call to a handler.
const REFS = ['latest', 'starLatest', 'markLatest'];
const HANDLERS = new Set(['onPress', 'onStarPress', 'onDiscoveryPress', 'props.onStarPress', 'props.onDiscoveryPress', 'props.onPinPress', 'props.onMemoryPress']);
const isFn = (n: ts.Node): n is ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration =>
  ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n);
function nearestFn(node: ts.Node): ts.Node | null {
  for (let p = node.parent; p; p = p.parent) if (isFn(p)) return p;
  return null;
}

test('tend map audit 40: every fill of a tap ref is in a layout effect\'s own body, and every marker click reads the ref', () => {
  const sf = ts.createSourceFile(WEB, readFileSync(WEB, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fills: ts.BinaryExpression[] = [];
  const clicks: ts.Node[] = [];
  walk(sf, (n) => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      if (REFS.some((r) => new RegExp(`^${r}\\.current\\b`).test(n.left.getText()))) fills.push(n);
    }
    if (ts.isCallExpression(n) && /\.addEventListener$/.test(n.expression.getText()) && ts.isStringLiteral(n.arguments[0]) && n.arguments[0].text === 'click') {
      clicks.push(n.arguments[1]);
    }
  });
  assert.equal(fills.length, 3, `one fill per ref (${fills.map((f) => f.getText().slice(0, 40)).join('; ')})`);
  for (const f of fills) {
    const fn = nearestFn(f);
    const call = fn?.parent;
    assert.ok(fn && call && ts.isCallExpression(call) && call.expression.getText() === 'useLayoutEffect' && call.arguments[0] === fn,
      `${f.left.getText()} is filled directly in a useLayoutEffect's own callback, never in a nested function or a passive effect`);
  }
  assert.equal(clicks.length, 3, 'the pins, the stars and the "?" marks each take one click listener');
  const read = new Set<string>();
  for (const fn of clicks) {
    const text = fn.getText();
    const reads = REFS.filter((r) => new RegExp(`\\b${r}\\.current\\b`).test(text));
    assert.equal(reads.length, 1, `a marker click reads one tap ref (${text.slice(0, 80)})`);
    read.add(reads[0]);
    walk(fn, (n) => {
      if (ts.isCallExpression(n)) {
        const callee = n.expression.getText().replace(/\?\.?$/, '');
        assert.ok(!HANDLERS.has(callee), `a marker click calls no handler it closed over (${n.getText()})`);
      }
    });
  }
  assert.deepEqual([...read].sort(), [...REFS].sort(), 'each ref is read by its own markers\' click');
});
