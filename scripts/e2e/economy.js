// The e2e's economy: what has already run green, what a change can really affect, and which failures are known flakes.
//
// One journey is minutes of browser. The owner's rule (decision 0074) is that a change runs the journeys
// `npm run check:affected` names, and no more. This module is what holds a session to it, so it is not only advice:
//
//   * a green cache (`.e2e-green.json`, never committed): a journey that passed on exactly these inputs (its own file, the
//     files it covers, the harness, the exported build, the run's flags) is not run again unless E2E_FORCE=1; and one whose
//     covered files have not changed since it last passed is not named as needing a run;
//   * comment-only changes: an edit that leaves a source file's code as it was (comments or types) is no reason to
//     run a journey (`isCommentOnly`);
//   * a registry of known flakes (`flaky.json`) that only labels a failure: a journey that fails still fails (never skipped,
//     never quarantined), but the report says the same check failed on `main` too, with the evidence.
//
// Pure where it can be (the tests in src/lib/__tests__/arch/e2eEconomy.test.ts); the file reads and the git calls are injected.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { globToRegExp } = require('../features');

const GREEN_FILE = '.e2e-green.json';
const FLAKY_FILE = path.join('scripts', 'e2e', 'flaky.json');
const SOURCE = /\.(ts|tsx|js|mjs|cjs)$/;

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---------------------------------------------------------------------------------------------------------------------
// Comment-only changes

/**
 * A source file as what runs: TypeScript's own transpile, which drops comments and types and keeps code, strings
 * and JSX text. A file that does not parse cleanly is its raw text, so a broken edit is never taken for a comment.
 */
function normalized(source, file) {
  const ts = require('typescript');
  const out = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { removeComments: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, allowJs: true },
  });
  if (out.diagnostics && out.diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error)) return source;
  return out.outputText;
}

/** Whether two versions of a source file differ only in comments or types: no change to what the app does. */
function isCommentOnly(oldSource, newSource, file) {
  if (oldSource == null || newSource == null) return false;
  if (!SOURCE.test(file)) return false;
  if (oldSource === newSource) return true;
  return normalized(oldSource, file) === normalized(newSource, file);
}

/**
 * The changed paths that can change behaviour: a source file whose change is only comments or types drops out.
 * `readOld(path)` and `readNew(path)` return the text, or null when the file did not exist before or no longer does.
 */
function meaningfulPaths(paths, readOld, readNew) {
  return paths.filter((p) => {
    if (!SOURCE.test(p)) return true;
    return !isCommentOnly(readOld(p), readNew(p), p);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// The inputs a journey's result depends on

/** The harness's own files: what every journey runs on, besides its own. */
const HARNESS_GLOBS = ['scripts/e2e/*.js', 'scripts/e2e/*.json', 'scripts/e2e-web.js', 'scripts/mvt-encode.mjs', 'scripts/pmtiles-encode.mjs', 'scripts/fixture-*.mjs', 'scripts/fixtures/**'];
/** The run's flags that change what a journey does. */
const FLAGS = ['E2E_MOBILE', 'E2E_MILES', 'E2E_BASE', 'E2E_SOFT'];

function listFiles(root) {
  const out = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').filter(Boolean).sort();
}

/** The exported build's identity: its index page names the content-hashed bundles. Null with no build. */
function buildId(root) {
  try {
    return sha(fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8'));
  } catch {
    return null;
  }
}

const fileHash = (root, rel, read) => {
  const text = read(path.join(root, rel));
  return text == null ? 'missing' : sha(SOURCE.test(rel) ? normalized(text, rel) : text);
};

/**
 * The two keys of a journey (pure over its injected readers). `covers` is the hash of the journey's own file and the files it
 * covers: what `check:affected` means by "this journey is affected". `strict` adds the harness, the build and the run's flags:
 * what must be identical for a run to be the same run.
 */
function keys(root, journey, o = {}) {
  const files = (o.files ?? listFiles)(root);
  const read = o.read ?? ((p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } });
  const build = o.build === undefined ? buildId(root) : o.build;
  const env = o.env ?? process.env;
  const covered = files.filter((f) => journey.covers.map(globToRegExp).some((re) => re.test(f)));
  const own = `scripts/e2e/journeys/${journey.name}.js`;
  const coversKey = sha([own, ...covered].map((f) => `${f}:${fileHash(root, f, read)}`).join('\n'));
  const harness = files.filter((f) => HARNESS_GLOBS.map(globToRegExp).some((re) => re.test(f)));
  const flags = FLAGS.map((k) => `${k}=${env[k] ?? ''}`).join(',');
  const strict = sha([coversKey, ...harness.map((f) => `${f}:${fileHash(root, f, read)}`), `build:${build}`, flags].join('\n'));
  return { covers: coversKey, strict, build };
}

// ---------------------------------------------------------------------------------------------------------------------
// The green cache

function readGreen(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, GREEN_FILE), 'utf8'));
  } catch {
    return {};
  }
}

/** A journey that passed on exactly these inputs (the same run again). */
const isGreen = (greens, name, k) => !!k.build && greens[name]?.strict === k.strict;

/** A journey that passed, and none of its files have changed since (the plan need not name it). */
const isGreenSince = (greens, name, k) => greens[name]?.covers === k.covers;

/** The cache after a pass. A failure is never recorded, and a run without a build is never a pass of a build. */
function markGreen(greens, name, k, now) {
  if (!k.build) return greens;
  return { ...greens, [name]: { strict: k.strict, covers: k.covers, at: new Date(now).toISOString() } };
}

function writeGreen(root, greens) {
  fs.writeFileSync(path.join(root, GREEN_FILE), `${JSON.stringify(greens, null, 2)}\n`);
}

// ---------------------------------------------------------------------------------------------------------------------
// Known flakes: labelled, never skipped

function readFlaky(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, FLAKY_FILE), 'utf8'));
  } catch {
    return {};
  }
}

/** The check names a run printed as failed: `FAILED: <check>` lines (the harness's `check` throws one). */
function parseFailures(output) {
  return output.split('\n').filter((l) => l.startsWith('FAILED: ')).map((l) => l.slice('FAILED: '.length).trim());
}

/** The registry entry a failure matches, or null. A match is a label for the report; it never changes the exit code. */
function flakeFor(registry, journey, message) {
  const text = (message ?? '').replace(/^FAILED: /, '');
  return (registry[journey] ?? []).find((e) => text.startsWith(e.check)) ?? null;
}

/** The registry with a check on `main` recorded: where it was seen, on which commit, how often it failed. */
function addFlake(registry, journey, entry) {
  const list = (registry[journey] ?? []).filter((e) => e.check !== entry.check);
  return { ...registry, [journey]: [...list, entry].sort((a, b) => a.check.localeCompare(b.check)) };
}

function writeFlaky(root, registry) {
  fs.writeFileSync(path.join(root, FLAKY_FILE), `${JSON.stringify(registry, null, 2)}\n`);
}

/**
 * What a baseline of one journey on `main` found, from each run's output (pure): which checks failed and how often.
 * Nothing recorded when no run failed: a failure on a branch is its own until shown otherwise.
 */
function summarizeBaseline(runs) {
  const counts = new Map();
  for (const out of runs) for (const c of new Set(parseFailures(out))) counts.set(c, (counts.get(c) ?? 0) + 1);
  return { runs: runs.length, failed: [...counts].map(([check, n]) => ({ check, fails: `${n}/${runs.length}` })) };
}

module.exports = {
  GREEN_FILE, FLAKY_FILE, HARNESS_GLOBS, FLAGS, normalized, isCommentOnly, meaningfulPaths, listFiles, buildId, keys,
  readGreen, isGreen, isGreenSince, markGreen, writeGreen, readFlaky, parseFailures, flakeFor, addFlake, writeFlaky, summarizeBaseline,
};
