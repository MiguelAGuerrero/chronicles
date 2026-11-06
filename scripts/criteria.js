// Every live criterion has a status (specs/test-organization, TG20-TG22). Read by scripts/check-docs.js,
// so the Stop hook and CI hold it. A live criterion is one of:
//   named   a test's or step's name, or an e2e check, names its id (not a todo; check-specs.js namedIn)
//   retired RETIRED in scripts/features.js, with who retired it
//   untested on purpose: UNTESTED in scripts/features.js, `device: <why>` or `deferred: <why>`
//   legacy  in scripts/criteria.baseline.json: untested when this gate arrived; only shrinks
// A spec in IN_PROGRESS (a slice building it) is exempt for 7 days.

const fs = require('fs');
const path = require('path');

const BASELINE_FILE = 'scripts/criteria.baseline.json';
const KIND = /^(device|deferred): \S/;
const MAX_DAYS = 7;

const days = (a, b) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000;

/** The problems for a set of specs (pure; TG20-TG22). */
function criteriaProblems({ specs, named, retired, untested, baseline, inProgress, today }) {
  const out = [];
  const base = new Set(baseline);
  for (const { slug, ids } of specs) {
    const progress = inProgress[slug];
    if (progress) {
      if (days(progress.since, today) > MAX_DAYS) {
        out.push({ slug, id: '*', message: `specs/${slug} has been in progress since ${progress.since} (${progress.branch}), more than ${MAX_DAYS} days: finish the slice (every criterion named by a test) or take it out of IN_PROGRESS in scripts/features.js.` });
      }
      continue;
    }
    const names = named(slug);
    const ret = new Set(retired[slug] ?? []);
    const why = untested[slug] ?? {};
    for (const id of ids) {
      if (ret.has(id)) continue;
      const key = `${slug}:${id}`;
      const tested = names.has(id);
      if (id in why) {
        if (!KIND.test(why[id])) out.push({ slug, id, message: `${key} is in UNTESTED without a kind and a reason: write "device: <why>" or "deferred: <why>".` });
        else if (tested) out.push({ slug, id, message: `${key} is in UNTESTED but a test names it now: take it out of UNTESTED in scripts/features.js.` });
        if (base.has(key)) out.push({ slug, id, message: `${key} has a reason in UNTESTED: remove it from ${BASELINE_FILE}.` });
        continue;
      }
      if (base.has(key)) {
        if (tested) out.push({ slug, id, message: `${key} is tested now: remove it from ${BASELINE_FILE} (the baseline only shrinks).` });
        continue;
      }
      if (!tested) {
        out.push({ slug, id, message: `${key} has no test. Write a test named by its id (\`test('${id}: ...')\`, or \`check(ok, '${id}: ...')\` in its journey); or, with the owner's call, retire it (RETIRED) or record why it isn't tested (UNTESTED, "device: ..." or "deferred: ..."), both in scripts/features.js. ${BASELINE_FILE} is for criteria untested before this gate, and only shrinks.` });
      }
    }
  }
  for (const key of base) {
    const [slug, id] = key.split(':');
    const spec = specs.find((s) => s.slug === slug);
    if (!spec || !spec.ids.includes(id) || (retired[slug] ?? []).includes(id)) {
      out.push({ slug, id, message: `${key} is in ${BASELINE_FILE} but is no longer a live criterion: remove it.` });
    }
  }
  return out;
}

/** The repo's problems: its specs, its tests and the lists in scripts/features.js. */
function check(root = path.join(__dirname, '..'), today = new Date().toISOString().slice(0, 10)) {
  const specsLib = require('./check-specs');
  const features = require('./features');
  const files = [...specsLib.unitTests(), ...specsLib.e2eFiles()];
  const parsed = specsLib.readSpecs().map((s) => ({ slug: s.slug, ...specsLib.idsOf(s.text) }));
  const owners = new Map();
  for (const p of parsed) for (const pre of p.prefixes) owners.set(pre, [...(owners.get(pre) ?? []), p.slug]);
  const all = specsLib.namedIn(files);
  const named = (slug) => {
    const p = parsed.find((x) => x.slug === slug);
    const shared = p.prefixes.filter((pre) => (owners.get(pre) ?? []).length > 1);
    if (!shared.length) return all;
    // A prefix two specs share (D, M, R) counts only in the folders of the features that list the spec.
    const scoped = specsLib.namedIn(specsLib.testFilesFor(slug, true, files));
    return new Set([...all].filter((id) => !shared.includes(id.replace(/\d+$/, '')) || scoped.has(id)));
  };
  const file = path.join(root, BASELINE_FILE);
  const baseline = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  return criteriaProblems({
    specs: parsed.map(({ slug, ids }) => ({ slug, ids })),
    named,
    retired: features.RETIRED,
    untested: features.UNTESTED,
    baseline,
    inProgress: features.IN_PROGRESS,
    today,
  });
}

module.exports = { BASELINE_FILE, criteriaProblems, check };
