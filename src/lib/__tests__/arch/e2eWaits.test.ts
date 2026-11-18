// @tree-wide: the e2e journeys' waitForFunction calls (scripts/e2e/journeys)
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// tend captures audit 6: Playwright's waitForFunction accepts its predicate's first truthy result, and a pending
// promise is truthy, so an async predicate is read once and never polled: the wait resolves with that one read's
// value. HC10's placed-at-stop check and JN13's `begun` waited that way and could not wait (tend captures 2, audit 4).
// A stored row is polled from the test side instead (the videothumbs journey).

const JOURNEYS = join(__dirname, '..', '..', '..', '..', 'scripts', 'e2e', 'journeys');

/** The text of a call's first argument: from after `waitForFunction(` to the first comma or `)` at depth 0. */
function firstArgument(src: string, from: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = from; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '(' || ch === '{' || ch === '[') depth++;
    else if (ch === ')' || ch === '}' || ch === ']') {
      if (depth === 0) return src.slice(from, i);
      depth--;
    } else if (ch === ',' && depth === 0) return src.slice(from, i);
  }
  return src.slice(from);
}

/** Each `waitForFunction` whose predicate is async or returns a promise, as `<file>:<line>`. */
function asyncWaits(file: string, src: string): string[] {
  const found: string[] = [];
  const call = /\bwaitForFunction\(/g;
  for (let m = call.exec(src); m; m = call.exec(src)) {
    const arg = firstArgument(src, m.index + m[0].length);
    if (/^\s*async\b/.test(arg) || /\bnew Promise\b|\bawait\b|\.then\(/.test(arg)) {
      found.push(`${file}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
  return found;
}

test('tend captures audit 6: no journey waits with an async predicate (it is read once, never polled)', () => {
  const found = readdirSync(JOURNEYS)
    .filter((f) => f.endsWith('.js'))
    .flatMap((f) => asyncWaits(`scripts/e2e/journeys/${f}`, readFileSync(join(JOURNEYS, f), 'utf8')));
  assert.deepEqual(found, [], `poll a stored row from the test side instead (the videothumbs journey): ${found.join(', ')}`);
});

test('tend captures audit 6: the scan finds the old HC10 wait and passes a plain predicate', () => {
  const old = [
    'async function run(h) {',
    '  const placedNote = await pg.waitForFunction(() => new Promise((resolve) => {',
    "    const req = indexedDB.open('chronicles');",
    '    req.onsuccess = () => resolve(null);',
    '  }), null, { timeout: 15000, polling: 500 }).then((v) => v.jsonValue(), () => null);',
    '}',
  ].join('\n');
  assert.deepEqual(asyncWaits('capturehome.js', old), ['capturehome.js:2']);
  assert.deepEqual(asyncWaits('x.js', 'await pg.waitForFunction(async () => (await fetch("/x")).ok);'), ['x.js:1']);
  assert.deepEqual(asyncWaits('x.js', 'await pg.waitForFunction(() => fetch("/x").then((r) => r.ok));'), ['x.js:1']);
  const plain = "await pg.waitForFunction((sel) => [...document.querySelectorAll(sel)].some((e) => e.innerText.includes('a, b')), entries, { timeout: 10000 }).then(() => true, () => false);";
  assert.deepEqual(asyncWaits('x.js', plain), []);
});
