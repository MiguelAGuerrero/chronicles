// Throwaway trees with git history for the code-quality tests (specs/code-quality): files are written,
// committed on `main`, and the facts read back through scripts/quality as `npm run quality` reads them.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);

export type Fn = {
  file: string;
  name: string;
  line: number;
  lines: number;
  params: number;
  complexity: number;
  maxNesting: number;
  hooks: Record<string, number>;
  hookCount: number;
  component: boolean;
  pure?: boolean;
  impurity?: string[];
};
export type Found = { file: string; line: number; [k: string]: unknown };
export type FileFacts = {
  layer: string;
  lines: number;
  code: number;
  pureOutsideCore: number;
  silentCatches: number;
  floatingPromises?: number;
  hexColors: number;
  hookDepSuppressions: number;
  duplicatedLines?: number;
  [k: string]: unknown;
};
export type Facts = {
  files: Record<string, FileFacts>;
  functions: Fn[];
  clones: { a: { file: string }; b: { file: string }; exact: boolean }[];
  identicalFunctions: { file: string; name: string }[][];
  cycles: string[][];
  unusedExports: { file: string; name: string }[];
  orphans: { file: string }[];
  coupling: { pairs: { a: string; b: string; commits: number }[] };
  patterns: Record<string, Found[]>;
  shellDecisions: { file: string; name: string; complexity: number }[];
  shellsOnSingletons: { file: string }[];
  libImportsViews: { file: string; spec: string }[];
  testsWithoutAssertions: { file: string; name: string }[];
};
export type Violation = { id: string; metric: string; value: number; limit: number | null; move: string; message: string };
export type Quality = {
  collect(root: string, o?: { types?: boolean }): Facts;
  violations(facts: Facts): Violation[];
  scopeFiles(root: string, facts: Facts, o?: { feature?: string }): string[];
  queue(facts: Facts, files: string[]): { move: string; file: string; line: number; evidence: string }[];
};
export type Baseline = {
  build(v: Violation[]): Record<string, number>;
  compare(v: Violation[], baseline: Record<string, number>): { worse: string[]; added: string[]; stale: string[] };
  tighten(v: Violation[], baseline: Record<string, number>): { baseline: Record<string, number> | null; refused: string[] };
  looser(baseline: Record<string, number>, main: Record<string, number>): string[];
};

export const quality = () => load(join(ROOT, 'scripts', 'quality', 'index.js')) as Quality;
export const baseline = () => load(join(ROOT, 'scripts', 'quality', 'baseline.js')) as Baseline;

const TSCONFIG = JSON.stringify({
  compilerOptions: { strict: true, target: 'es2022', lib: ['es2022', 'dom'], jsx: 'react-jsx', module: 'esnext', moduleResolution: 'bundler', noEmit: true, skipLibCheck: true, types: [] },
  include: ['src'],
});

const tmp = mkdtempSync(join(tmpdir(), 'quality-'));
let trees = 0;
export function cleanup() {
  rmSync(tmp, { recursive: true, force: true });
}

export function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

export function write(root: string, files: Record<string, string>) {
  for (const [rel, src] of Object.entries(files)) {
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, src);
  }
}

export function commit(root: string, message: string) {
  git(root, 'add', '-A');
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', message);
}

/** A tree of `files` (repo-relative), committed on `main`, with a tsconfig and an empty scripts folder. */
export function tree(files: Record<string, string>): string {
  const root = join(tmp, `t${++trees}`);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  git(tmp, 'init', '-q', '-b', 'main', root);
  write(root, { 'tsconfig.json': TSCONFIG, ...files });
  commit(root, 'start');
  return root;
}

/** Lines of filler code: a function body that is `n` statements long. */
export function body(n: number, v = 'x'): string {
  return Array.from({ length: n }, (_, i) => `  ${v} += ${i};`).join('\n');
}
