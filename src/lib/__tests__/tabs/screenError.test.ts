/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

const APP = join(__dirname, '../../../app');

function routes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return routes(p);
    return /\.[jt]sx?$/.test(e.name) ? [p] : [];
  });
}

/** An export at the start of a line (never a commented-out one) of a component named ErrorBoundary. */
const exportsBoundary = (file: string) =>
  /^export\s*\{[^}]*\bErrorBoundary\b[^}]*\}|^export\s+(function|const)\s+ErrorBoundary\b/m.test(readFileSync(file, 'utf8'));

test('fix ios-video 2, audit 1: every screen and layout shows ScreenError when it throws, never a blank page; a tab keeps the tab bar and the recording bar', () => {
  // A throw with no boundary unmounts the whole app: the white page after Keep it (Nov 4). A layout's boundary
  // stands in for its whole navigator, tab bar and recording bar too, with no way out but Try again (audit 1),
  // so each screen has its own. The root layout's would stand outside the navigator, so it has none.
  const rootLayout = join(APP, '_layout.tsx');
  const bare = routes(APP)
    .filter((f) => f !== rootLayout && !exportsBoundary(f))
    .map((f) => relative(APP, f));
  assert.deepEqual(bare, [], `routes with no ErrorBoundary of their own: ${bare.join(', ')}`);
});
