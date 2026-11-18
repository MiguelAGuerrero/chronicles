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
