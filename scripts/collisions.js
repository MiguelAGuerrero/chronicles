// Ids and numbers that must belong to one owner (specs/test-organization, TG14, TG15). Read by
// scripts/check-docs.js, so the Stop hook and CI both hold them: two sessions working at once
// once both named their criteria TO1-TO12 and both took decision 0083.

/** Prefixes two specs shared before this check; a mention there is resolved per feature by check:specs. */
const ALLOWED_SHARED = ['D', 'M', 'R'];

/** Criterion prefixes used by more than one spec, other than the allowed three; slugs sorted. */
function sharedPrefixes(specs, allowed = ALLOWED_SHARED) {
  const by = new Map();
  for (const s of specs) for (const p of s.prefixes) by.set(p, [...(by.get(p) ?? []), s.slug]);
  return [...by]
    .filter(([p, slugs]) => slugs.length > 1 && !allowed.includes(p))
    .map(([prefix, slugs]) => ({ prefix, slugs: [...slugs].sort() }))
    .sort((a, b) => a.prefix.localeCompare(b.prefix));
}

/** Decision record numbers (the 4 digits a file name starts with) held by more than one file. */
function duplicateDecisions(names) {
  const by = new Map();
  for (const n of names) {
    const m = /^(\d{4})-/.exec(n);
    if (m) by.set(m[1], [...(by.get(m[1]) ?? []), n]);
  }
  return [...by].filter(([, files]) => files.length > 1).map(([number, files]) => ({ number, files: [...files].sort() }));
}

module.exports = { ALLOWED_SHARED, sharedPrefixes, duplicateDecisions };
