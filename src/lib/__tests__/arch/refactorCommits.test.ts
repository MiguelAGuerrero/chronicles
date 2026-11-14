// @tree-wide: refactor commits keep behaviour (scripts/refactor-commits.js)
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { cleanup, commit, git, ROOT, tree, write } from './qualityFixture';

// Specs: specs/code-quality/spec.md, CQ14.

after(cleanup);

type Finding = { commit: string; subject: string; file: string; line: number; text: string };
const load = createRequire(__filename);

test('CQ14 a refactor commit may add to a test, never change one', { todo: 'test first' }, () => {
  const { check } = load(join(ROOT, 'scripts', 'refactor-commits.js')) as { check(root: string, range: string): Finding[] };
  const T = 'src/lib/__tests__/x/a.test.ts';
  const root = tree({ [T]: `test('one', () => {\n  assert.equal(f(), 1);\n});\n` });
  const start = git(root, 'rev-parse', 'HEAD').trim();
  write(root, { [T]: `test('one', () => {\n  assert.equal(f(), 1);\n});\ntest('two', () => {\n  assert.equal(g(), 2);\n});\n` });
  commit(root, 'refactor x 1: R7 a test added beside the move');
  write(root, { [T]: `test('one', () => {\n  assert.equal(f(), 3);\n});\ntest('two', () => {\n  assert.equal(g(), 2);\n});\n` });
  commit(root, 'refactor x 2: R1 the assertion bent to fit');
  write(root, { [T]: `test('one', () => {\n  assert.equal(f(), 4);\n});\n` });
  commit(root, 'fix x: a change of behaviour, with its test');
  write(root, { 'src/lib/__tests__/x/b.test.ts': `test('new', () => {});\n` });
  commit(root, 'refactor x 3: R15 a new test file');
  const found = check(root, `${start}..HEAD`);
  assert.deepEqual(
    found.map((f) => [f.subject, f.file, f.line]),
    [['refactor x 2: R1 the assertion bent to fit', T, 2]],
  );
  assert.match(found[0].text, /assert\.equal\(f\(\), 1\)/, 'the line as it was');
});
