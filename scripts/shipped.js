#!/usr/bin/env node
// docs-gc step 3 (procedures audit 6): the shipped slices in docs/STATUS.md's "Slices" table that
// docs/PRODUCT.md never mentions. A slice is its row's first cell up to " ("; it is shipped when its
// status cell says so. Engineering slices (no app behaviour change) are not product and are skipped.
//
//   node scripts/shipped.js        # prints each missing slice; exit 1 when there is one

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** The shipped rows of the "## Slices" table: { name, status } (pure). */
function shippedRows(status) {
  const start = status.indexOf('\n## Slices');
  if (start < 0) return [];
  const end = status.indexOf('\n## ', start + 5);
  const rows = status.slice(start, end < 0 ? undefined : end).split('\n').filter((l) => l.startsWith('| ') && !/^\|\s*-/.test(l));
  return rows.slice(1).map((l) => l.split('|').map((c) => c.trim())).map((c) => ({ name: c[1].split(' (')[0].trim(), status: c[2] ?? '' }))
    .filter((r) => /\bshipped\b/i.test(r.status));
}

/** The shipped slices' names (pure). */
const shippedSlices = (status) => shippedRows(status).map((r) => r.name);

/** Shipped product slices PRODUCT.md doesn't name (pure). */
function missingFromProduct(status, product) {
  const p = product.toLowerCase();
  return shippedRows(status).filter((r) => !/engineering|no (app )?behaviou?r change/i.test(r.status)).map((r) => r.name).filter((n) => !p.includes(n.toLowerCase()));
}

module.exports = { shippedRows, shippedSlices, missingFromProduct };

if (require.main === module) {
  const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const rows = shippedRows(read('docs/STATUS.md'));
  const missing = missingFromProduct(read('docs/STATUS.md'), read('docs/PRODUCT.md'));
  for (const m of missing) console.log(`shipped but not in PRODUCT.md: ${m}`);
  console.log(`${rows.length} shipped slices read from docs/STATUS.md; ${missing.length} not in docs/PRODUCT.md.`);
  if (!rows.length) {
    console.error('No shipped row found: has the "## Slices" table moved?');
    process.exit(2);
  }
  if (missing.length) process.exit(1);
}
