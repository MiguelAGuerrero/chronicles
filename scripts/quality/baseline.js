// The code-quality baseline (specs/code-quality, CQ9-CQ11): today's violations, by stable id, each with
// its value. Plain functions over violations and a baseline object; reading and writing the file is the
// CLI's (scripts/quality/index.js). The baseline only shrinks: an improvement must be tightened in, and
// tightening never raises a value or adds an entry.

const { LIMITS } = require('./limits');

const metricOf = (id) => id.slice(0, id.indexOf(':'));
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

/** A baseline from today's violations. */
function build(v) {
  return sorted(Object.fromEntries(v.map((x) => [x.id, x.value])));
}

function label(x) {
  return `${x.file}${x.name ? ` ${x.name}` : ''}`;
}

/**
 * New violations (`added`), recorded ones that got worse (`worse`), and entries whose code got better
 * or went away (`stale`, until tightened). Metrics in `unmeasured` keep their entries untouched.
 */
function compare(v, baseline, unmeasured = []) {
  const now = new Map(v.map((x) => [x.id, x]));
  const worse = [];
  const added = [];
  const stale = [];
  for (const x of v) {
    const was = baseline[x.id];
    const fix = `${x.move}: ${(LIMITS[x.metric] || {}).what || x.metric}`;
    if (was === undefined) {
      added.push(x.limit == null
        ? `${label(x)} (line ${x.line}): ${x.what}. Fix: ${fix} (.claude/rules/refactoring.md).`
        : `${label(x)} (line ${x.line}): ${x.what} is ${x.value}, past the limit of ${x.limit}. Fix: ${fix} (.claude/rules/refactoring.md).`);
    } else if (x.value > was) {
      worse.push(`${label(x)} (line ${x.line}): ${x.what} is ${x.value}, above its recorded ${was}${x.metric === 'file-lines' ? ' (a file over the limit is frozen)' : ''}. Fix: ${fix}; move code out before adding.`);
    } else if (x.value < was) {
      stale.push(`${x.id}: ${x.value} now, recorded ${was}. Run npm run quality -- --tighten.`);
    }
  }
  for (const id of Object.keys(baseline)) {
    if (!now.has(id) && !unmeasured.includes(metricOf(id))) stale.push(`${id}: fixed, still recorded. Run npm run quality -- --tighten.`);
  }
  return { worse, added, stale };
}

/** The baseline with every improvement taken in; refused (null) when anything got worse or is new. */
function tighten(v, baseline, unmeasured = []) {
  const { worse, added } = compare(v, baseline, unmeasured);
  const refused = [...worse, ...added].map((m) => `refused: ${m}`);
  if (refused.length) return { baseline: null, refused };
  const now = new Map(v.map((x) => [x.id, x.value]));
  const next = {};
  for (const [id, was] of Object.entries(baseline)) {
    if (unmeasured.includes(metricOf(id))) next[id] = was;
    else if (now.has(id)) next[id] = Math.min(was, now.get(id));
  }
  return { baseline: sorted(next), refused: [] };
}

/** Entries of `ours` that main's baseline lacks, or holds lower: a baseline loosened by hand. */
function looser(ours, main) {
  return Object.keys(ours).filter((id) => main[id] === undefined || ours[id] > main[id]).sort();
}

module.exports = { build, compare, tighten, looser };
