/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { followMoves } from '../../compass';

// tend map 15 (CP4 on the live walk): following, the compass brings the map north. maplibre's `jumpTo` starts with
// `stop()`, so a follow frame's jump cut the compass's 600 ms ease after one frame and the map stayed turned. The
// follow waits while the ease runs; the next frame after it catches the camera up. The web map can't render under
// `npm test`, so the wiring is read from its source, as mapFrames.test.ts does; the `qol` journey holds the behaviour.

const idle = { following: true, handOnMap: false, northEasing: false };

test('tend map 15: following, with no hand on the map and no ease to north, the follow moves the camera', () => {
  assert.equal(followMoves(idle), true);
});

test('tend map 15: the follow waits while the compass eases the map north', () => {
  assert.equal(followMoves({ ...idle, northEasing: true }), false);
});

test('tend map 15: no follow move while not following, or while a hand is on the map', () => {
  assert.equal(followMoves({ ...idle, following: false }), false);
  assert.equal(followMoves({ ...idle, handOnMap: true }), false);
  assert.equal(followMoves({ following: false, handOnMap: true, northEasing: true }), false);
});

const WEB = join(__dirname, '../../../components/map/WalkMap.web.tsx');

function walk(node: ts.Node, visit: (n: ts.Node) => void) {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}

/** Every `….jumpTo(…)` call in the web map, with the `if` conditions it sits under. */
function jumpsWithGuards(sf: ts.SourceFile): { text: string; guards: ts.Expression[] }[] {
  const out: { text: string; guards: ts.Expression[] }[] = [];
  walk(sf, (n) => {
    if (!ts.isCallExpression(n) || !/\.jumpTo$/.test(n.expression.getText())) return;
    const guards: ts.Expression[] = [];
    for (let p: ts.Node | undefined = n.parent; p && !ts.isSourceFile(p); p = p.parent) {
      if (ts.isIfStatement(p)) guards.push(p.expression);
      if (ts.isArrowFunction(p) || ts.isFunctionExpression(p) || ts.isFunctionDeclaration(p)) {
        // An early `if (…) return;` before the jump in the same function guards it too.
        const body = p.body && ts.isBlock(p.body) ? p.body : null;
        for (const s of body?.statements ?? []) {
          if (s.pos >= n.pos) break;
          if (ts.isIfStatement(s) && ts.isReturnStatement(s.thenStatement)) guards.push(s.expression);
        }
        break;
      }
    }
    out.push({ text: n.getText(), guards });
  });
  return out;
}

/** Whether the guard asks `followMoves` with the compass's ease to north in hand (directly, or as the early return's `!`). */
const asksFollowWithNorth = (g: ts.Expression) => {
  let found = false;
  walk(g, (n) => {
    if (ts.isCallExpression(n) && n.expression.getText() === 'followMoves' && /northEasing:\s*northAsked\.current/.test(n.arguments[0]?.getText() ?? ''))
      found = true;
  });
  return found;
};

test('tend map 15: both follow jumps of the web map ask followMoves with the ease to north (the glide frame and the recenter on a fix)', () => {
  const sf = ts.createSourceFile(WEB, readFileSync(WEB, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const follows = jumpsWithGuards(sf).filter((j) => /center:\s*(f\.walker|to\b)/.test(j.text));
  assert.equal(follows.length, 2, `the follow's two jumps are found (${follows.map((j) => j.text).join('; ')})`);
  for (const j of follows) {
    assert.ok(j.guards.some(asksFollowWithNorth), `${j.text} waits while the compass eases north (followMoves with northEasing: northAsked.current)`);
  }
});
