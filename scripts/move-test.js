#!/usr/bin/env node
// Move a unit test into its feature's folder, keeping every relative path pointing where it
// did (specs/test-organization, TG16). For a branch from before the feature folders: its new
// tests land at the root of src/lib/__tests__/, and arch/features.test.ts (TG2) names each one.
//
//   npm run move-test <file> <feature>
//
// Each path is resolved against the file's old folder and written again from the new one, so
// a depth is never guessed: `from '...'`, `import('...')`, `` import(`...`) ``, `require('...')`,
// `createRequire(...)('...')` and `join(__dirname, '<literal>', ...)`. Anything else, a path
// inside an ordinary string included, is left alone. The move is a `git mv`, so history follows.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const features = require('./features');

const ROOT = process.env.MOVE_TEST_ROOT ? path.resolve(process.env.MOVE_TEST_ROOT) : path.join(__dirname, '..');
const TESTS = path.join(ROOT, 'src', 'lib', '__tests__');

/**
 * `spec` (relative to `fromDir`) as seen from `toDir`, always starting with ./ or ../ . A path that
 * names nothing from the old folder but something from the new one (a fixture already moved into
 * the feature folder, as a merge leaves it) is kept as it is.
 */
function rebase(spec, fromDir, toDir) {
  const exists = (p) => [p, `${p}.ts`, `${p}.tsx`, `${p}.js`, `${p}.json`, path.join(p, 'index.ts')].some((x) => fs.existsSync(x));
  if (!exists(path.resolve(fromDir, spec)) && exists(path.resolve(toDir, spec))) return spec;
  const rel = path.relative(toDir, path.resolve(fromDir, spec)).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

/** The file's text with each relative path rewritten from `fromDir` to `toDir`; and what changed. */
function rewrite(src, fromDir, toDir) {
  const changed = [];
  // An import, a dynamic import, a require, or the call createRequire returns: a quote, then a path.
  let out = src.replace(/(\bfrom\s+|\bimport\(\s*|\brequire\(\s*|\)\(\s*)(['"`])(\.\.?\/[^'"`?$]*)(\$\{)?/g, (m, lead, q, spec, built) => {
    // A path built from a name (`./${name}.json`) can't be resolved here: left as it is, and said.
    if (built) {
      changed.push(`${spec}\${...} left as it is: a built-up path; check that what it names is beside the test`);
      return m;
    }
    const next = rebase(spec, fromDir, toDir);
    if (next !== spec) changed.push(`${spec} -> ${next}`);
    return `${lead}${q}${next}`;
  });
  // join(__dirname, 'a', 'b'): the literal segments after __dirname.
  out = out.replace(/\bjoin\(\s*__dirname((?:\s*,\s*'[^']*')*)/g, (m, segs) => {
    const parts = [...segs.matchAll(/'([^']*)'/g)].map((x) => x[1]);
    const target = path.join(fromDir, ...parts);
    const rel = path.relative(toDir, target).split(path.sep).filter(Boolean);
    const next = rel.length ? `join(__dirname, ${rel.map((p) => `'${p}'`).join(', ')}` : 'join(__dirname';
    if (next !== m) changed.push(`${m.trim()} -> ${next}`);
    return next;
  });
  return { text: out, changed };
}

function main(argv) {
  const [file, feature] = argv;
  if (!file || !feature) {
    console.error('usage: npm run move-test <file> <feature>');
    process.exit(64);
  }
  if (!features.byName.has(feature)) {
    console.error(`No feature named "${feature}". Features: ${features.FEATURES.map((f) => f.name).join(', ')}.`);
    process.exit(64);
  }
  const from = path.resolve(ROOT, file);
  if (!fs.existsSync(from)) {
    console.error(`${file} does not exist.`);
    process.exit(66);
  }
  const toDir = path.join(TESTS, feature);
  const to = path.join(toDir, path.basename(from));
  if (fs.existsSync(to)) {
    console.error(`${path.relative(ROOT, to)} already exists: merge the two by hand.`);
    process.exit(73);
  }
  const { text, changed } = rewrite(fs.readFileSync(from, 'utf8'), path.dirname(from), toDir);
  fs.mkdirSync(toDir, { recursive: true });
  if (process.env.MOVE_TEST_NO_GIT) fs.renameSync(from, to);
  else execFileSync('git', ['mv', from, to], { cwd: ROOT });
  fs.writeFileSync(to, text);
  console.log(`Moved ${path.relative(ROOT, from)} to ${path.relative(ROOT, to)}${changed.length ? `, rewrote:\n  ${changed.join('\n  ')}` : ', no paths to rewrite.'}`);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { rebase, rewrite };
