#!/usr/bin/env node
// Report which acceptance-criterion ids in specs/*/spec.md no test mentions.
// A report, not a gate: it always exits 0.
//
// A spec's ids are the literal ones its criteria open with: "**QL1**",
// "1. **M1 · …**", "- **N1.**", "- D1. …". Any other mention of the same
// prefix in that spec, up to the highest number defined, counts too, so ids
// written inline ("S16. … S17 (owner, …") are found. Ids under a heading that
// says "superseded" are skipped. Each id is searched for as a whole word in
// src/lib/__tests__/*.test.ts and scripts/e2e-web.js.
//
// Plain numbered criteria with no id (v0.5's area criteria 1-27, the concept
// tab's lists) are not checked. Some prefixes are used by more than one spec
// (M, R, D): a mention there may belong to either, so those are listed.
//
// Usage: node scripts/check-specs.js

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const specsDir = path.join(root, 'specs');

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
  const order = (a, b) => {
    const [, pa, na] = /^([A-Z]+)(\d+)$/.exec(a);
    const [, pb, nb] = /^([A-Z]+)(\d+)$/.exec(b);
    return pa === pb ? Number(na) - Number(nb) : pa.localeCompare(pb);
  };
  return { ids: [...ids].sort(order), prefixes: [...max.keys()].sort() };
}

function testWords() {
  const files = [];
  const testDir = path.join(root, 'src', 'lib', '__tests__');
  if (fs.existsSync(testDir)) {
    const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.test.ts')) files.push(p); } };
    walk(testDir);
  }
  const e2e = path.join(root, 'scripts', 'e2e-web.js');
  if (fs.existsSync(e2e)) files.push(e2e);
  const words = new Set();
  for (const f of files) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(ANY_ID)) words.add(m[1] + Number(m[2]));
  }
  return { words, count: files.length };
}

function main() {
  const specs = readSpecs();
  const { words, count } = testWords();
  const owners = new Map(); // prefix -> slugs defining it
  const rows = [];
  let totalIds = 0;
  let totalMissing = 0;

  for (const { slug, text } of specs) {
    const { ids, prefixes } = idsOf(text);
    for (const p of prefixes) owners.set(p, [...(owners.get(p) ?? []), slug]);
    const missing = ids.filter((id) => !words.has(id));
    totalIds += ids.length;
    totalMissing += missing.length;
    rows.push({ slug, ids, prefixes, missing });
  }

  console.log(`Criterion ids with no mention in ${count} test files (src/lib/__tests__/*.test.ts, scripts/e2e-web.js)\n`);
  for (const r of rows) {
    if (!r.ids.length) {
      console.log(`${r.slug}: no literal criterion ids`);
      continue;
    }
    const head = `${r.slug} [${r.prefixes.join(', ')}]: ${r.missing.length} of ${r.ids.length} unmentioned`;
    console.log(r.missing.length ? `${head}\n  ${r.missing.join(' ')}` : head);
  }
  const shared = [...owners].filter(([, s]) => s.length > 1);
  if (shared.length) {
    console.log('\nPrefixes used by more than one spec (a mention may belong to either):');
    for (const [p, s] of shared) console.log(`  ${p}: ${s.join(', ')}`);
  }
  console.log(`\nTotal: ${totalMissing} of ${totalIds} ids unmentioned.`);
}

main();
process.exit(0);
