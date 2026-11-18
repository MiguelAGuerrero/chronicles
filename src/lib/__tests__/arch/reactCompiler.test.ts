/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

// The React Compiler (RC1-RC2, specs/react-compiler, decision 0206). babel-preset-expo 58 runs it only when app.json asks.
// Every component and screen compiles but the functions listed when it was turned on; the list only shrinks.

const ROOT = join(__dirname, '../../../..');
const BASELINE = join(__dirname, 'compiler.baseline.json');

test('RC1: app.json turns the React Compiler on', () => {
  const app = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')) as { expo: { experiments?: { reactCompiler?: boolean } } };
  assert.equal(app.expo.experiments?.reactCompiler, true);
});

/** Every function the compiler skips under src/app and src/components, as `file:function: reason`. */
export function skipped(root: string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const babel = require('@babel/core') as { transformSync(code: string, opts: Record<string, unknown>): unknown };
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx$/.test(f)) files.push(p);
    }
  };
  walk(join(root, 'src/app'));
  walk(join(root, 'src/components'));
  const out: string[] = [];
  for (const f of files) {
    const events: { kind: string; fnName?: string | null; detail?: { reason?: string; options?: { reason?: string } } }[] = [];
    babel.transformSync(readFileSync(f, 'utf8'), {
      filename: f, babelrc: false, configFile: false, code: false,
      parserOpts: { plugins: ['typescript', 'jsx'] },
      plugins: [['babel-plugin-react-compiler', { target: '19', panicThreshold: 'none', logger: { logEvent: (_f: string, e: (typeof events)[number]) => events.push(e) } }]],
    });
    for (const e of events) {
      if (e.kind === 'CompileSuccess') continue;
      if (e.kind !== 'CompileError' && e.kind !== 'CompileSkip' && e.kind !== 'PipelineError') continue;
      const reason = String(e.detail?.reason ?? e.detail?.options?.reason ?? e.kind).replace(/\s+/g, ' ').slice(0, 60);
      out.push(`${relative(root, f)}:${e.fnName ?? '?'}: ${reason}`);
    }
  }
  return out.sort();
}

test('RC2: every component and screen compiles but those listed when the compiler came on; the list only shrinks', () => {
  assert.ok(existsSync(BASELINE), 'arch/compiler.baseline.json lists the functions skipped when it came on');
  const known = JSON.parse(readFileSync(BASELINE, 'utf8')) as string[];
  const now = skipped(ROOT);
  assert.ok(now.length > 0 || known.length === 0, 'the scan reads the app');
  // Counted, not as a set: a function the compiler cannot name is '?', and a second one in the same file is a new skip.
  const count = (xs: string[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
  const was = count(known);
  const is = count(now);
  const added = [...is].filter(([k, n]) => n > (was.get(k) ?? 0)).map(([k]) => k);
  assert.deepEqual(added, [], 'a new function the compiler cannot compile: fix it (no eslint-disable of a React rule, no try/finally in a component) rather than list it');
  const gone = [...was].filter(([k, n]) => n > (is.get(k) ?? 0)).map(([k]) => k);
  assert.deepEqual(gone, [], 'these compile now: take their lines out of compiler.baseline.json');
});
