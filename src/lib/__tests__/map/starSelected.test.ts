/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

// tend map 20: the selected star was drawn but not told to a screen reader: the web's star is a raw button with an
// `aria-label` only, and native's `pinHit` View had no `accessibilityState` (WCAG 2.2, 4.1.2 Name, Role, Value). The
// owner's answer (Nov 18): "Allow it": on the web the selected star carries `aria-current="true"` (spoken "current"),
// on native `accessibilityState={{ selected }}`. Neither map renders under `npm test`, so their sources are read, as
// mapFrames.test.ts does.

const DIR = join(__dirname, '../../../components/map');
const read = (f: string) => ts.createSourceFile(f, readFileSync(join(DIR, f), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function walk(node: ts.Node, visit: (n: ts.Node) => void) {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}

test('tend map 20: on the web, the selected star\'s button carries aria-current="true", and only the selected one', () => {
  const sf = read('WalkMap.web.tsx');
  // The star's button: the element whose aria-label is starLabel(star).
  const labels: ts.CallExpression[] = [];
  const current: ts.CallExpression[] = [];
  walk(sf, (n) => {
    if (ts.isCallExpression(n) && n.expression.getText() === 'el.setAttribute' && ts.isStringLiteral(n.arguments[0])) {
      if (n.arguments[0].text === 'aria-label' && n.arguments[1]?.getText() === 'starLabel(star)') labels.push(n);
      if (n.arguments[0].text === 'aria-current') current.push(n);
    }
  });
  assert.equal(labels.length, 1, 'the web map names one star button');
  assert.equal(current.length, 1, 'one aria-current, on the star');
  const set = current[0];
  assert.equal(set.arguments[1]?.getText(), "'true'");
  // Set only when the star is the selected one, in the same loop body that names the button.
  const guard = set.parent?.parent;
  assert.ok(guard && ts.isIfStatement(guard) && guard.expression.getText() === 'selected', `under if (selected) (${guard?.getText().slice(0, 60)})`);
  const body = labels[0].parent.parent;
  assert.ok(ts.isBlock(body) && body.statements.includes(guard as ts.Statement), 'beside the star\'s own label, in the loop that builds its button');
  const decl = body.statements.flatMap((s) => (ts.isVariableStatement(s) ? [...s.declarationList.declarations] : [])).find((d) => d.name.getText() === 'selected');
  assert.equal(decl?.initializer?.getText(), 'star.id === props.selectedStar', 'selected is this star being the selected one');
  // A change of selection rebuilds the button, so the state never lingers on the star left.
  const key = body.statements.flatMap((s) => (ts.isVariableStatement(s) ? [...s.declarationList.declarations] : [])).find((d) => d.name.getText() === 'key');
  assert.match(key?.initializer?.getText() ?? '', /\$\{selected\}/, 'the marker key holds selected');
});

test('tend map 20: on native, the star\'s button says selected through accessibilityState, as its view draws it', () => {
  const sf = read('WalkMap.native.tsx');
  const buttons: (ts.JsxSelfClosingElement | ts.JsxOpeningElement)[] = [];
  walk(sf, (n) => {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.attributes.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText() === 'accessibilityLabel' && a.initializer?.getText() === '{starLabel(star)}')) buttons.push(n);
  });
  assert.equal(buttons.length, 1, 'the native map names one star button');
  const state = buttons[0].attributes.properties.find((a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && a.name.getText() === 'accessibilityState');
  const expr = state?.initializer && ts.isJsxExpression(state.initializer) ? state.initializer.expression : undefined;
  assert.ok(expr && ts.isObjectLiteralExpression(expr), `accessibilityState is an object (${state?.getText()})`);
  const selected = expr.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText() === 'selected');
  assert.equal(selected?.initializer.getText(), 'star.id === selected', 'selected as the StarView inside it is drawn selected');
});
