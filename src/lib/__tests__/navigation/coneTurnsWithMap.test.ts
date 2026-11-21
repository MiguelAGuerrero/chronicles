/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
// The file this scans, imported as a type only (erased at run time, so nothing of React Native loads): the import is
// how `check:affected` and the Stop hook pick this test when the file changes (fix nav-heading audit 3).
import type { WalkMap } from '../../../components/map/WalkMap.web';

// fix nav-heading (the owner's iPhone, Nov 21): walking toward the route on a map turned by two fingers, the cone
// pointed backwards. The web's cone is a DOM element turned by `rotate(<heading>deg)` inside the walker's puck, a
// maplibre Marker; at maplibre's default rotation alignment the puck stays square to the screen, so the cone read the
// heading as screen degrees and was off by the map's bearing (180° on that map). The puck turns with the map
// (`rotationAlignment: 'map'`), so the cone's turn inside it is from north. The map can't render under `npm test`;
// this reads the source, and the walk journey's "fix nav-heading" step reads the cone as drawn on a map turned to 90°.

const ROOT = join(__dirname, '../../..');
const WEB = 'components/map/WalkMap.web.tsx';
/** What the scan reads: the web map's component, whose puck it checks. */
type Scanned = typeof WalkMap;
const scanned: Scanned['displayName'] = 'WalkMap';

/** The options object of each `new Marker({...})` in the innermost function that keeps the walker's puck (`puck.current = {...}`). */
function puckMarkers(src: ts.SourceFile): ts.ObjectLiteralExpression[] {
  const holders = new Set<ts.Node>();
  const visit = (n: ts.Node) => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && n.left.getText(src) === 'puck.current' && ts.isObjectLiteralExpression(n.right)) {
      let f: ts.Node | undefined = n.parent;
      while (f && !ts.isFunctionLike(f)) f = f.parent;
      if (f) holders.add(f);
    }
    n.forEachChild(visit);
  };
  visit(src);
  const out: ts.ObjectLiteralExpression[] = [];
  for (const f of holders) {
    const find = (m: ts.Node) => {
      if (ts.isNewExpression(m) && m.expression.getText(src) === 'Marker' && m.arguments?.[0] && ts.isObjectLiteralExpression(m.arguments[0])) out.push(m.arguments[0]);
      m.forEachChild(find);
    };
    f.forEachChild(find);
  }
  return out;
}

const prop = (o: ts.ObjectLiteralExpression, name: string) => {
  const p = o.properties.find((q): q is ts.PropertyAssignment => ts.isPropertyAssignment(q) && q.name.getText() === name);
  return p && ts.isStringLiteral(p.initializer) ? p.initializer.text : undefined;
};

/** What the scan says of a file's source: one puck marker, turning with the map and standing flat to the screen. */
function puckTurnsWithMap(code: string): { markers: number; rotation?: string; pitch?: string } {
  const src = ts.createSourceFile(WEB, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const ms = puckMarkers(src);
  return { markers: ms.length, rotation: ms[0] && prop(ms[0], 'rotationAlignment'), pitch: ms[0] && prop(ms[0], 'pitchAlignment') };
}

test('fix nav-heading: the web puck turns with the map, so its cone points the way walked on a turned map', () => {
  const r = puckTurnsWithMap(readFileSync(join(ROOT, WEB), 'utf8'));
  assert.equal(r.markers, 1, `one marker holds the walker puck in ${scanned}`);
  assert.equal(r.rotation, 'map', 'the puck turns with the map, so the cone inside it is turned from north');
  // Kept square to the screen if the map is ever tilted (maplibre's pitch alignment follows the rotation's otherwise).
  assert.equal(r.pitch, 'viewport', 'the puck stays flat to the screen');
});

test('fix nav-heading: the scan fails a puck left square to the screen, and finds no puck where there is none', () => {
  const puck = (opts: string) => `function F() { useEffect(() => { const el = 1; const marker = new Marker({ ${opts} }); puck.current = { marker, el }; }); }`;
  assert.deepEqual(puckTurnsWithMap(puck(`element: el, anchor: 'center'`)), { markers: 1, rotation: undefined, pitch: undefined });
  assert.deepEqual(puckTurnsWithMap(puck(`element: el, rotationAlignment: 'viewport', pitchAlignment: 'viewport'`)), { markers: 1, rotation: 'viewport', pitch: 'viewport' });
  assert.deepEqual(puckTurnsWithMap(puck(`element: el, rotationAlignment: 'map', pitchAlignment: 'viewport'`)), { markers: 1, rotation: 'map', pitch: 'viewport' });
  assert.equal(puckTurnsWithMap('const m = new Marker({ element: el, rotationAlignment: "map" });').markers, 0);
});
