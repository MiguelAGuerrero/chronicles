#!/usr/bin/env node
// Report which acceptance-criterion ids in specs/*/spec.md no test mentions
// (test-organization TG7). A report by default (exit 0); `--strict` exits 1
// when a live id has no test; `--feature <name>` reports one feature's specs.
//
// A spec's ids are the literal ones its criteria open with: "**QL1**",
// "1. **M1 · …**", "- **N1.**", "- D1. …". Any other mention of the same
// prefix in that spec, up to the highest number defined, counts too, so ids
// written inline ("S16. … S17 (owner, …") are found. Ids under a heading that
// says "superseded" are skipped.
//
// Where an id is looked for: every unit test file and every e2e file, as a
// whole word. When two specs share a prefix (M, R, D, G), each spec's ids are
// looked for only in the test folders of the features that list that spec
// (scripts/features.js), so "R1" in explore/recall.test.ts counts for
// v1-discovery and not for rides. Ids the map declares RETIRED are listed
// apart: the app no longer has them, so no test should.
//
// Plain numbered criteria with no id (v0.5's area criteria 1-27, the concept
// tab's lists) are not checked.
//
// Usage: node scripts/check-specs.js [--feature <name>] [--strict]

const fs = require('fs');
const path = require('path');
const features = require('./features');

const root = path.join(__dirname, '..');
const specsDir = path.join(root, 'specs');
const testsDir = path.join(root, 'src', 'lib', '__tests__');
const e2eDir = path.join(root, 'scripts', 'e2e');

const DEFINITION = [
  // **QL1**, **M1 ·, **N1.**, **D1 ·
  /\*\*([A-Z]{1,3})(\d+)(?=[\s.*·])/g,
  // - D1. text   or   1. D1. text
  /^\s*(?:-|\d+\.)\s+([A-Z]{1,3})(\d+)\.\s/gm,
  // inline after a sentence: "… instead. S18. Only these …"
  /(?<=[.!?"]\s)([A-Z]{1,3})(\d+)\.\s(?=[A-Z"])/g,
];
const ANY_ID = /\b([A-Z]{1,3})(\d+)\b/g;

function readSpecs() {
  if (!fs.existsSync(specsDir)) return [];
  return fs
    .readdirSync(specsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(specsDir, d.name, 'spec.md'))
    .filter((f) => fs.existsSync(f))
    .map((file) => ({ slug: path.basename(path.dirname(file)), text: fs.readFileSync(file, 'utf8') }));
}

// Drop sections whose heading says "superseded" (draft criteria kept for history).
function liveText(text) {
  const out = [];
  let skipLevel = 0;
  for (const line of text.split('\n')) {
    const h = /^(#+)\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      if (skipLevel && level <= skipLevel) skipLevel = 0;
      if (!skipLevel && /superseded/i.test(h[2])) {
        skipLevel = level;
        continue;
      }
    }
    if (!skipLevel) out.push(line);
  }
  return out.join('\n');
}

const order = (a, b) => {
  const [, pa, na] = /^([A-Z]+)(\d+)$/.exec(a);
  const [, pb, nb] = /^([A-Z]+)(\d+)$/.exec(b);
  return pa === pb ? Number(na) - Number(nb) : pa.localeCompare(pb);
};

function idsOf(text) {
  const body = liveText(text);
  const max = new Map(); // prefix -> highest defined number
  const ids = new Set();
  for (const re of DEFINITION) {
    for (const m of body.matchAll(re)) {
      const n = Number(m[2]);
      ids.add(m[1] + n);
      max.set(m[1], Math.max(max.get(m[1]) ?? 0, n));
    }
  }
  for (const m of body.matchAll(ANY_ID)) {
    const n = Number(m[2]);
    const top = max.get(m[1]);
    if (top !== undefined && n >= 1 && n <= top) ids.add(m[1] + n);
  }
  return { ids: [...ids].sort(order), prefixes: [...max.keys()].sort() };
}

/** Every file under `dir` that passes `keep` (absolute paths). */
function filesUnder(dir, keep) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (keep(p)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

const unitTests = () => filesUnder(testsDir, (p) => p.endsWith('.test.ts'));
const e2eFiles = () => [path.join(root, 'scripts', 'e2e-web.js'), ...filesUnder(e2eDir, (p) => p.endsWith('.js'))].filter((p) => fs.existsSync(p));

/** The test folder of a unit test file (its feature), or null for an e2e file. */
const folderOf = (file) => {
  const rel = path.relative(testsDir, file);
  return rel.startsWith('..') ? null : rel.split(path.sep)[0];
};

/**
 * The files whose words count for a spec: every test file for a prefix one
 * spec defines; for a prefix two specs share, the unit tests of the features
 * that list this spec (e2e files always count: a journey can name any id).
 */
function testFilesFor(slug, shared, files = [...unitTests(), ...e2eFiles()]) {
  if (!shared) return files;
  const folders = new Set(features.featuresOfSpec(slug).map((f) => f.name));
  return files.filter((f) => {
    const folder = folderOf(f);
    return folder === null || folders.has(folder);
  });
}

/**
 * The ids a test names (TD1): those on a line that declares a test or an e2e check or step
 * (`test(`, `it(`, `check(`, `step(`), so a comment or an assertion message that mentions an
 * id, such as one saying it was retired, does not count.
 */
const NAMING = /\b(?:test|it|check|step|qstep)\(/;
const namedIn = (files) => {
  const words = new Set();
  for (const f of files) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!NAMING.test(line) || /^\s*\/\//.test(line)) continue;
      for (const m of line.matchAll(ANY_ID)) words.add(m[1] + Number(m[2]));
    }
  }
  return words;
};

const wordsIn = (files) => {
  const words = new Set();
  for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(ANY_ID)) words.add(m[1] + Number(m[2]));
  return words;
};

/**
 * One row per spec: its ids, the live ones no test mentions, the retired ones
 * (mentioned or not), and whether each prefix is shared with another spec.
 */
function report({ feature = null } = {}) {
  const specs = readSpecs();
  const owners = new Map(); // prefix -> slugs defining it
  const parsed = specs.map(({ slug, text }) => ({ slug, ...idsOf(text) }));
  for (const p of parsed) for (const pre of p.prefixes) owners.set(pre, [...(owners.get(pre) ?? []), p.slug]);
  const files = [...unitTests(), ...e2eFiles()];
  const wanted = feature ? new Set(features.byName.get(feature)?.specs ?? []) : null;
  const rows = [];
  for (const p of parsed) {
    if (wanted && !wanted.has(p.slug)) continue;
    const retired = new Set(features.RETIRED[p.slug] ?? []);
    const sharedPrefixes = p.prefixes.filter((pre) => (owners.get(pre) ?? []).length > 1);
    // Words from the scoped files for shared prefixes, from every file otherwise.
    const wordsAll = wordsIn(files);
    const wordsScoped = sharedPrefixes.length ? wordsIn(testFilesFor(p.slug, true, files)) : wordsAll;
    const mentioned = (id) => (sharedPrefixes.includes(id.replace(/\d+$/, '')) ? wordsScoped : wordsAll).has(id);
    const live = p.ids.filter((id) => !retired.has(id));
    const named = namedIn(sharedPrefixes.length ? testFilesFor(p.slug, true, files) : files);
    rows.push({
      slug: p.slug,
      prefixes: p.prefixes,
      shared: sharedPrefixes,
      ids: p.ids,
      missing: live.filter((id) => !mentioned(id)),
      retired: p.ids.filter((id) => retired.has(id)),
      retiredStillTested: p.ids.filter((id) => retired.has(id) && named.has(id)),
      features: features.featuresOfSpec(p.slug).map((f) => f.name),
    });
  }
  const shared = [...owners].filter(([, s]) => s.length > 1).map(([prefix, slugs]) => ({ prefix, slugs }));
  return { rows, shared, fileCount: files.length };
}

function main(argv) {
  const fi = argv.indexOf('--feature');
  const feature = fi >= 0 ? argv[fi + 1] : null;
  const strict = argv.includes('--strict');
  if (feature && !features.byName.has(feature)) {
    console.error(`No feature "${feature}". Features: ${features.FEATURES.map((f) => f.name).join(', ')}`);
    process.exit(64);
  }
  const r = report({ feature });
  let totalIds = 0;
  let totalMissing = 0;
  console.log(`Criterion ids with no mention in ${r.fileCount} test files (src/lib/__tests__/**/*.test.ts, scripts/e2e/**)${feature ? `, the specs of ${feature}` : ''}\n`);
  for (const row of r.rows) {
    if (!row.ids.length) {
      console.log(`${row.slug}: no literal criterion ids`);
      continue;
    }
    totalIds += row.ids.length - row.retired.length;
    totalMissing += row.missing.length;
    const scope = row.shared.length ? ` (${row.shared.join(', ')} scoped to ${row.features.join(', ') || 'no feature: list the spec in scripts/features.js'})` : '';
    const head = `${row.slug} [${row.prefixes.join(', ')}]${scope}: ${row.missing.length} of ${row.ids.length - row.retired.length} live ids unmentioned`;
    console.log(row.missing.length ? `${head}\n  ${row.missing.join(' ')}` : head);
    if (row.retired.length) console.log(`  retired (${row.retired.length}): ${row.retired.join(' ')}${row.retiredStillTested.length ? `; still named by a test: ${row.retiredStillTested.join(' ')}` : ''}`);
  }
  if (r.shared.length && !feature) {
    console.log('\nPrefixes used by more than one spec (each resolved to the features that list the spec):');
    for (const s of r.shared) console.log(`  ${s.prefix}: ${s.slugs.join(', ')}`);
  }
  console.log(`\nTotal: ${totalMissing} of ${totalIds} live ids unmentioned.`);
  if (strict && totalMissing) {
    console.error('\n--strict: a live criterion has no test naming it. Write the test, or declare the id RETIRED in scripts/features.js with who retired it.');
    process.exit(1);
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { readSpecs, idsOf, liveText, testFilesFor, report, unitTests, e2eFiles, folderOf, namedIn };
