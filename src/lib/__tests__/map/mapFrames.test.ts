/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import * as mapTypes from '../../../components/map/types';
import { glideShown } from '../../useGlidingWalker';

// Native map frames (NF1-NF6, specs/native-map-frames). The phone's map can't render under `npm test`
// (nothing a test imports may import React Native), so these read the source, as endsPaint.test.ts does:
// they hold the shape that keeps a glide frame or a replay tick from re-rendering, and re-serializing,
// every source and pin. Whether the phone's frame rate follows is NF7, a device check.

const ROOT = join(__dirname, '../../..');
const read = (rel: string) => ts.createSourceFile(rel, readFileSync(join(ROOT, rel), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const NATIVE = 'components/map/WalkMap.native.tsx';

type Jsx = ts.JsxElement | ts.JsxSelfClosingElement;
const opening = (e: Jsx) => (ts.isJsxElement(e) ? e.openingElement : e);
const tagOf = (e: Jsx) => opening(e).tagName.getText();

function walk(node: ts.Node, visit: (n: ts.Node) => void) {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}
function jsx(root: ts.Node, tag?: string): Jsx[] {
  const out: Jsx[] = [];
  walk(root, (n) => {
    if ((ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) && (!tag || tagOf(n) === tag)) out.push(n);
  });
  return out;
}
function calls(root: ts.Node, name: string): ts.CallExpression[] {
  const out: ts.CallExpression[] = [];
  walk(root, (n) => {
    if (ts.isCallExpression(n) && n.expression.getText() === name) out.push(n);
  });
  return out;
}
/** The function passed to the nearest enclosing `name(...)` call (`memo`, `forwardRef`, `useMemo`), if any. */
function enclosingCall(node: ts.Node, names: string[]): string | null {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isCallExpression(p) && names.includes(p.expression.getText())) return p.expression.getText();
  }
  return null;
}
/** The component `WalkMap`'s own body: the function given to `forwardRef`. */
function walkMapBody(sf: ts.SourceFile): ts.Node {
  const fr = calls(sf, 'forwardRef')[0];
  assert.ok(fr, 'WalkMap is a forwardRef');
  return fr.arguments[0];
}
/** Names of the `memo(...)` components the file declares. */
function memoComponents(sf: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  walk(sf, (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isCallExpression(n.initializer) && n.initializer.expression.getText() === 'memo')
      names.add(n.name.getText());
  });
  return names;
}
/** The nearest memo component a JSX element sits in, or null when it is drawn by WalkMap's own render. */
function inMemo(e: ts.Node): boolean {
  for (let p = e.parent; p; p = p.parent) {
    if (ts.isCallExpression(p)) {
      const callee = p.expression.getText();
      if (callee === 'memo') return true;
      if (callee === 'forwardRef') return false;
    }
  }
  return false;
}
/** The expression of an attribute, with conditionals and `??` / `||` split into what they can give. */
function outcomes(e: ts.Expression): ts.Expression[] {
  if (ts.isParenthesizedExpression(e)) return outcomes(e.expression);
  if (ts.isConditionalExpression(e)) return [...outcomes(e.whenTrue), ...outcomes(e.whenFalse)];
  if (ts.isBinaryExpression(e) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(e.operatorToken.kind))
    return [...outcomes(e.left), ...outcomes(e.right)];
  return [e];
}
/** A value made new on each render: a literal object or array, a function, or a call. */
const freshEachRender = (e: ts.Expression) =>
  ts.isObjectLiteralExpression(e) || ts.isArrayLiteralExpression(e) || ts.isArrowFunction(e) || ts.isFunctionExpression(e) || ts.isCallExpression(e);
function attrs(e: Jsx): { name: string; value: ts.Expression | null }[] {
  return opening(e).attributes.properties.flatMap((a) =>
    ts.isJsxAttribute(a) ? [{ name: a.name.getText(), value: a.initializer && ts.isJsxExpression(a.initializer) ? a.initializer.expression ?? null : null }] : [],
  );
}
const idOf = (e: Jsx) => {
  const a = opening(e).attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText() === 'id') as ts.JsxAttribute | undefined;
  return a?.initializer && ts.isStringLiteral(a.initializer) ? a.initializer.text : null;
};

test('NF1: a glide frame re-renders only the walker, its cone and the camera: WalkMap holds no glide state', () => {
  const sf = read(NATIVE);
  const body = walkMapBody(sf);
  assert.equal(calls(body, 'useGlidingWalker').length, 0, 'WalkMap itself must not turn each glide frame into its own state');
  // The frames run outside React and reach only the small parts that draw them.
  for (const id of ['cone', 'points']) {
    const src = jsx(sf, 'GeoJSONSource').find((e) => idOf(e) === id);
    assert.ok(src, `the ${id} source is drawn`);
    assert.ok(inMemo(src), `the ${id} source is drawn by a memo component of its own, not by WalkMap's render`);
  }
  // The follow camera moves with the glide from outside WalkMap's render too.
  const jumps = calls(body, 'cameraRef.current?.jumpTo').filter((c) => /glide/.test(c.getText()));
  assert.equal(jumps.length, 0, 'the follow camera is not moved from WalkMap by glide frames');
});

test('NF1: what the dot and cone show, read from the frame store, is what the map showed from its own state', () => {
  const a: [number, number] = [-71.4, 41.81];
  const b: [number, number] = [-71.401, 41.811];
  // The replay moves the dot itself: the props, never a frame.
  assert.deepEqual(glideShown({ walker: a, heading: 10 }, b, 90, false, false), { walker: b, heading: 90 });
  // Gliding: the latest frame; before the first one, the new fix rather than nothing.
  assert.deepEqual(glideShown({ walker: a, heading: 10 }, b, 90, true, false), { walker: a, heading: 10 });
  assert.deepEqual(glideShown({ walker: null, heading: null }, b, 90, true, false), { walker: b, heading: 90 });
  // No walker: no dot, whatever the last frame was.
  assert.deepEqual(glideShown({ walker: a, heading: 10 }, null, null, true, false), { walker: null, heading: null });
  // With the live dot running, the cone is the frames' alone (coneHeading), never the trace's standing in for it.
  assert.deepEqual(glideShown({ walker: a, heading: null }, b, 90, true, true), { walker: a, heading: null });
});

test('NF2: the replays hand the map nothing new on a tick but the walker and the camera', () => {
  // These reach only the scale bar, the fit and the first camera, cheap and read once; the rest reaches sources and pins.
  const EXEMPT = new Set(['ref', 'style', 'scaleInset', 'fitPadding', 'initialCenter', 'initialZoom']);
  for (const file of ['app/replay/[id].tsx', 'app/day/[key].tsx']) {
    const sf = read(file);
    const map = jsx(sf, 'WalkMap')[0];
    assert.ok(map, `${file} draws a WalkMap`);
    for (const { name, value } of attrs(map)) {
      if (EXEMPT.has(name) || !value) continue;
      for (const v of outcomes(value)) {
        assert.ok(!freshEachRender(v), `${file}: ${name}={${v.getText()}} is made again on every tick; keep it in a useMemo or a constant`);
      }
    }
  }
});

test('NF3: a map source is drawn by a memo component and handed nothing new on each render', () => {
  const sf = read(NATIVE);
  const sources = jsx(sf, 'GeoJSONSource');
  assert.ok(sources.length >= 20, 'the native map draws its overlays as GeoJSON sources');
  const bare = sources.filter((s) => !inMemo(s)).map((s) => idOf(s) ?? s.getText().slice(0, 40));
  assert.deepEqual(bare, [], 'every GeoJSONSource sits in a memo component, so its data is serialized again only when it changes');
  const memos = memoComponents(sf);
  for (const el of jsx(walkMapBody(sf)).filter((e) => memos.has(tagOf(e)))) {
    for (const { name, value } of attrs(el)) {
      if (name === 'key' || !value) continue;
      for (const v of outcomes(value)) assert.ok(!freshEachRender(v), `<${tagOf(el)} ${name}={${v.getText()}}> is new on each render, so its memo never holds`);
    }
  }
});

test('NF4: pins, marks, stars and labels re-render only with their own content', () => {
  const sf = read(NATIVE);
  const markers = jsx(sf, 'Marker');
  assert.ok(markers.length >= 6, 'the native map draws its pins as Markers');
  assert.deepEqual(markers.filter((m) => !inMemo(m)).map((m) => m.getText().slice(0, 50)), [], 'every Marker list is a memo component');
  // A screen's new closure on each render must not reach them: the lists read the handlers through a ref.
  const memos = memoComponents(sf);
  for (const el of jsx(walkMapBody(sf)).filter((e) => memos.has(tagOf(e)))) {
    for (const { name, value } of attrs(el)) {
      if (!value) continue;
      for (const v of outcomes(value)) assert.ok(!/^props\.on[A-Z]/.test(v.getText()), `<${tagOf(el)} ${name}={${v.getText()}}>: a press handler reaches a memo list through the handlers' ref`);
    }
  }
  for (const fn of ['declutterMarks', 'pinReactions']) {
    const loose = calls(sf, fn).filter((c) => enclosingCall(c, ['useMemo']) == null);
    assert.equal(loose.length, 0, `${fn} runs only when what it reads changes (inside a useMemo), never on every render`);
  }
});

test('NF5: the phone simplifies the line sources the web does, from one definition', () => {
  const t = mapTypes as unknown as { LINE_SOURCE?: unknown; LINE_SOURCE_IDS?: readonly string[] };
  assert.deepEqual(t.LINE_SOURCE, { tolerance: 1, buffer: 64 });
  const ids = t.LINE_SOURCE_IDS ?? [];
  assert.deepEqual([...ids].sort(), ['alternates', 'drawing', 'faint', 'fog', 'gap-links', 'rides', 'route', 'route-grades', 'trace', 'trace-history', 'trace-link', 'walked']);
  const sf = read(NATIVE);
  const spreads = (e: Jsx) => opening(e).attributes.properties.some((p) => ts.isJsxSpreadAttribute(p) && p.expression.getText() === 'LINE_SOURCE');
  // A component drawing a line source (TraceSource and its kin) spreads LINE_SOURCE into its own GeoJSONSource.
  const spreadingComponents = new Set<string>();
  walk(sf, (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer && jsx(n.initializer, 'GeoJSONSource').some(spreads)) spreadingComponents.add(n.name.getText());
  });
  for (const id of ids) {
    const el = jsx(sf).find((e) => idOf(e) === id && (tagOf(e) === 'GeoJSONSource' || /Source$/.test(tagOf(e))));
    assert.ok(el, `the native map draws the ${id} source`);
    assert.ok(spreads(el) || spreadingComponents.has(tagOf(el)), `the native ${id} source takes LINE_SOURCE`);
  }
  const web = readFileSync(join(ROOT, 'components/map/WalkMap.web.tsx'), 'utf8');
  assert.match(web, /\.\.\.LINE_SOURCE\b/, 'the web map spreads the same definition');
  assert.match(web, /of LINE_SOURCE_IDS\)/, 'the web map adds the same list of line sources');
});

test('NF6: every tap the native map took still reaches its handler', () => {
  // A regression guard for the split: each kind of pin still answers its own handler, and a found "?" none.
  const src = readFileSync(join(ROOT, NATIVE), 'utf8');
  for (const handler of ['onMemoryPress', 'onPinPress', 'onDiscoveryPress', 'onStarPress', 'onPress', 'onLongPress']) {
    assert.match(src, new RegExp(`\\b${handler}\\b`), `${handler} is still wired`);
  }
  assert.match(src, /!pin\.found/, 'a found mark still takes no tap');
  const sf = read(NATIVE);
  const pressed = jsx(sf, 'Marker').filter((m) => attrs(m).some((a) => a.name === 'onPress'));
  assert.ok(pressed.length >= 4, 'memory pins, pins, marks and stars keep their own onPress (iOS swallows a Pressable inside a Marker)');
});
