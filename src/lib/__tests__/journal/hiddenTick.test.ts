/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

// Performance review (Nov 18): the journal's 30 s clock (audit 11) set state on Memories while it lay hidden under the
// walk screen or another tab, rendering the whole page (every entry on it) twice a minute for no one. It ticks only
// while Memories is in front; the read's own clock is renewed when it comes back (.claude/rules/performance.md).

function walk(node: ts.Node, visit: (n: ts.Node) => void) {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}

/** Each `setInterval` in an effect, with whether that effect waits on focus (`isFocused` in its deps, and a return
 * before the interval when not focused). */
export function intervalsOnFocus(src: string): { focused: boolean }[] {
  const sf = ts.createSourceFile('x.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: { focused: boolean }[] = [];
  walk(sf, (n) => {
    if (!ts.isCallExpression(n) || n.expression.getText() !== 'useEffect') return;
    const [fn, deps] = n.arguments;
    let has = false;
    walk(fn, (m) => {
      if (ts.isCallExpression(m) && m.expression.getText() === 'setInterval') has = true;
    });
    if (!has) return;
    const onDeps = !!deps && /\bisFocused\b/.test(deps.getText());
    const guarded = /if \(!isFocused\) return/.test(fn.getText());
    out.push({ focused: onDeps && guarded });
  });
  return out;
}

test('Memories\' clock ticks only while Memories is in front', () => {
  const found = intervalsOnFocus(readFileSync(join(__dirname, '../../../components/chronicle/MemoriesScreen.tsx'), 'utf8'));
  assert.ok(found.length > 0, 'the page has its clock');
  assert.deepEqual(found, found.map(() => ({ focused: true })), 'every interval on the page waits on isFocused');
});

test('the focus scan is shown to fail on a clock that ticks hidden, and passes one that waits', () => {
  const bare = 'useEffect(() => { const t = setInterval(f, 30000); return () => clearInterval(t); }, []);';
  const kept = 'useEffect(() => { if (!isFocused) return; const t = setInterval(f, 30000); return () => clearInterval(t); }, [isFocused]);';
  assert.deepEqual(intervalsOnFocus(bare), [{ focused: false }]);
  assert.deepEqual(intervalsOnFocus(kept), [{ focused: true }]);
});
