/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

// Pictures through expo-image (EI1-EI5, specs/expo-image). Screens can't render under `npm test`, so the hosts are held
// by their source, each scan shown to fail on a snippet (.claude/rules/performance.md, "Testing a cost").

const SRC = join(__dirname, '../../..');
const PICTURE = join(SRC, 'components/Picture.tsx');
/** The hosts and the fit each had (React Native's `resizeMode`, `cover` by default). */
const HOSTS: Record<string, 'cover' | 'contain' | 'prop'> = {
  'components/CapturePinView.tsx': 'cover',
  'components/ReminderCard.tsx': 'cover',
  'components/MemoryPreview.tsx': 'cover',
  'components/chronicle/MomentPicture.tsx': 'cover',
  'components/gallery/GalleryTile.tsx': 'prop',
  'components/gallery/PeriodBlock.tsx': 'prop',
  'components/ceremony/Pile.tsx': 'cover',
  'components/ceremony/Cards.tsx': 'cover',
};
/** Draws through React Native on purpose: renders off screen for view-shot to bake an edit. */
const BAKER = 'components/Baker.native.tsx';

const parse = (src: string) => ts.createSourceFile('x.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function walk(node: ts.Node, visit: (n: ts.Node) => void) {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx$/.test(f) ? [p] : [];
  });
/** Whether a file draws `<Image …>` with `Image` imported from react-native. */
export function drawsRnImage(src: string): boolean {
  const sf = parse(src);
  let fromRn = false;
  walk(sf, (n) => {
    if (ts.isImportDeclaration(n) && (n.moduleSpecifier as ts.StringLiteral).text === 'react-native') {
      const names = n.importClause?.namedBindings;
      if (names && ts.isNamedImports(names) && names.elements.some((e) => e.name.text === 'Image')) fromRn = true;
    }
  });
  if (!fromRn) return false;
  let drawn = false;
  walk(sf, (n) => {
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && n.tagName.getText() === 'Image') drawn = true;
  });
  return drawn;
}
/** The `<Picture>` elements of a file, with their attributes as written. */
function pictures(src: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  walk(parse(src), (n) => {
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && n.tagName.getText() === 'Picture') {
      const a: Record<string, string> = {};
      for (const p of n.attributes.properties) if (ts.isJsxAttribute(p)) a[p.name.getText()] = p.initializer ? p.initializer.getText() : 'true';
      out.push(a);
    }
  });
  return out;
}
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

test('EI1: every picture on screen is drawn through Picture; only the off-screen baker draws through React Native', { todo: 'test first' }, () => {
  const rn = [...files(join(SRC, 'components')), ...files(join(SRC, 'app'))].map((f) => relative(SRC, f)).filter((f) => drawsRnImage(readFileSync(join(SRC, f), 'utf8')));
  assert.deepEqual(rn, [BAKER]);
  for (const host of Object.keys(HOSTS)) assert.ok(pictures(read(host)).length > 0, `${host} draws its picture through Picture`);
  // Shown to fail: a host drawing React Native's Image is caught; one drawing Picture is not.
  assert.equal(drawsRnImage("import { Image } from 'react-native';\nconst A = () => <Image source={{ uri }} />;"), true);
  assert.equal(drawsRnImage("import { Picture } from './Picture';\nconst A = () => <Picture uri={uri} fit=\"cover\" />;"), false);
});

test('EI2: a picture once drawn is kept, decoded, in memory and on disk', { todo: 'test first' }, () => {
  assert.ok(existsSync(PICTURE), 'components/Picture.tsx');
  const src = readFileSync(PICTURE, 'utf8');
  assert.match(src, /from 'expo-image'/, 'over expo-image');
  assert.match(src, /cachePolicy="memory-disk"/);
});

test('EI3: a gallery tile\'s picture is keyed by its piece, so a recycled cell never shows another tile\'s', { todo: 'test first' }, () => {
  const [p] = pictures(read('components/gallery/GalleryTile.tsx'));
  assert.ok(p?.recyclingKey, 'the tile passes a recyclingKey');
  assert.match(p.recyclingKey, /\.id\b|piece|ref/, 'built from what the tile shows');
  assert.match(readFileSync(PICTURE, 'utf8'), /recyclingKey/, 'and Picture hands it to expo-image');
});

test('EI4: no picture fades or animates in', { todo: 'test first' }, () => {
  assert.doesNotMatch(readFileSync(PICTURE, 'utf8'), /\btransition=/, 'Picture sets no transition');
  for (const host of Object.keys(HOSTS)) for (const p of pictures(read(host))) assert.equal(p.transition, undefined, `${host} passes none`);
});

test('EI5: each picture keeps the fit it had', { todo: 'test first' }, () => {
  for (const [host, fit] of Object.entries(HOSTS)) {
    const drawn = pictures(read(host));
    assert.ok(drawn.length > 0, `${host} draws a Picture to keep its fit on (a scan of nothing proves nothing)`);
    for (const p of drawn) {
      assert.ok(p.fit, `${host} names its fit`);
      if (fit === 'prop') assert.match(p.fit, /props\.fit|\bfit\b/, `${host} passes its own fit through`);
      else assert.equal(p.fit, `"${fit}"`, `${host} keeps ${fit}`);
    }
  }
});
