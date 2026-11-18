/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { mapWorkerUrl } from '../../../components/map/types';

// tend map 10: the web map's worker was served at one address for every maplibre-gl, so a browser holding an older
// worker in its cache could run it under a newer bundle. The address now carries the installed version, as
// maplibre's own default does.
test('tend map 10: the worker address carries the installed maplibre-gl version, under the base path', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'node_modules/maplibre-gl/package.json'), 'utf8')) as { version: string };
  assert.equal(mapWorkerUrl('', pkg.version), `/maplibre-gl-worker.mjs?v=${pkg.version}`);
  assert.equal(mapWorkerUrl('/chronicles', pkg.version), `/chronicles/maplibre-gl-worker.mjs?v=${pkg.version}`);
  // Two versions, two addresses.
  assert.notEqual(mapWorkerUrl('', '6.16.0'), mapWorkerUrl('', '6.17.0'));
});

// tend map 18: the test above holds the address but never reached the call that uses it, so the web map going back to
// the old, unversioned address still passed. The web map can't load under `npm test`, so its source is read, as
// mapFrames.test.ts does: one module-level `setWorkerUrl`, given `mapWorkerUrl` of the base path and the running version.
test('tend map 18: the web map sets its worker to mapWorkerUrl of the base path and maplibre\'s own version, once, as it loads', () => {
  const file = join(process.cwd(), 'src/components/map/WalkMap.web.tsx');
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const sets: ts.CallExpression[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && n.expression.getText() === 'setWorkerUrl') sets.push(n);
    n.forEachChild(visit);
  };
  visit(sf);
  assert.equal(sets.length, 1, 'the web map sets its worker in one place');
  const call = sets[0];
  assert.ok(ts.isExpressionStatement(call.parent) && call.parent.parent === sf, 'at module level, before any map is made');
  const arg = call.arguments[0];
  assert.ok(arg && ts.isCallExpression(arg) && arg.expression.getText() === 'mapWorkerUrl', `the address is mapWorkerUrl's (${arg?.getText()})`);
  assert.deepEqual(arg.arguments.map((a) => a.getText()), ["process.env.EXPO_BASE_URL ?? ''", 'getVersion()'], 'under the base path, with the version maplibre-gl reports');
});

// tend map audit 42 (the review's F42): the call above could still be fed a local `mapWorkerUrl` or `getVersion`, or be
// joined by a second call through an alias. The names are held to their imports, bound nowhere else, and
// `setWorkerUrl` is named only by its import and its one call.
test('tend map audit 42: the worker call\'s names are maplibre-gl\'s and types\' own, and setWorkerUrl is referenced once', () => {
  const file = join(process.cwd(), 'src/components/map/WalkMap.web.tsx');
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const from = new Map<string, string>();
  const bound = new Map<string, number>();
  const named: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isImportSpecifier(n) && !n.propertyName && !n.isTypeOnly) {
      const decl = n.parent.parent.parent;
      if (ts.isImportDeclaration(decl) && ts.isStringLiteral(decl.moduleSpecifier)) from.set(n.name.text, decl.moduleSpecifier.text);
    }
    const name = (n as { name?: ts.Node }).name;
    if (name && ts.isIdentifier(name) && (ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isParameter(n) || ts.isImportSpecifier(n) || ts.isBindingElement(n))) {
      bound.set(name.text, (bound.get(name.text) ?? 0) + 1);
    }
    if (ts.isIdentifier(n) && n.text === 'setWorkerUrl') named.push(n.parent.kind === ts.SyntaxKind.ImportSpecifier ? 'import' : n.parent.getText());
    n.forEachChild(visit);
  };
  visit(sf);
  assert.equal(from.get('setWorkerUrl'), 'maplibre-gl');
  assert.equal(from.get('getVersion'), 'maplibre-gl');
  assert.equal(from.get('mapWorkerUrl'), './types');
  for (const name of ['setWorkerUrl', 'getVersion', 'mapWorkerUrl']) assert.equal(bound.get(name), 1, `${name} is bound only by its import`);
  assert.equal(named.length, 2, `setWorkerUrl is named by its import and its one call (${named.join('; ')})`);
});
