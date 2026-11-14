// The code-quality baseline (specs/code-quality, CQ9-CQ11): today's violations, by stable id, each with
// its value. Plain functions over violations and a baseline object; reading and writing the file is the
// CLI's (scripts/quality/index.js). The baseline only shrinks: an improvement must be tightened in, and
// tightening never raises a value or adds an entry, except an entry that moved with its code.
//
// Code moves (code-quality audit 3). A function or component recorded in one file and found in another
// under the same name keeps its ceiling. A per-file count (swallowed errors, colours, a file's length, a
// dead module) may appear in a new file as long as the same metric dropped by as much in the files that
// had it: the total is what may not grow. A recorded file growing is still worse, whatever moved.

const { LIMITS } = require('./limits');

const metricOf = (id) => (id.includes(':') ? id.slice(0, id.indexOf(':')) : '');
const restOf = (id) => (id.includes(':') ? id.slice(id.indexOf(':') + 1) : id);
const fileOf = (id) => restOf(id).split('#')[0];
const nameOf = (id) => (restOf(id).includes('#') ? restOf(id).slice(restOf(id).indexOf('#') + 1) : null);
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

/** A baseline from today's violations. */
function build(v) {
  return sorted(Object.fromEntries(v.map((x) => [x.id, x.value])));
}

function label(x) {
  return `${x.file}${x.name ? ` ${x.name}` : ''}`;
}

/** Every violation sorted into kept, worse, better, carried (moved) and new, against a baseline. */
function classify(v, baseline, unmeasured = []) {
  const now = new Map(v.map((x) => [x.id, x]));
  const out = { worse: [], better: [], added: [], carried: [], gone: [] };
  const fresh = [];
  for (const x of v) {
    const was = baseline[x.id];
    if (was === undefined) fresh.push(x);
    else if (x.value > was) out.worse.push({ x, was });
    else if (x.value < was) out.better.push({ x, was });
  }
  const gone = Object.keys(baseline).filter((id) => !now.has(id) && !unmeasured.includes(metricOf(id)));
  const used = new Set();
  // A named entry carried by name from another file.
  const unnamed = [];
  for (const x of fresh) {
    const name = x.name ?? nameOf(x.id);
    if (name == null) {
      unnamed.push(x);
      continue;
    }
    const from = gone.find((g) => !used.has(g) && metricOf(g) === x.metric && nameOf(g) === name && fileOf(g) !== x.file && baseline[g] >= x.value);
    if (from) {
      used.add(from);
      out.carried.push({ x, from });
    } else out.added.push(x);
  }
  // A per-file entry carried by the drop of the same metric elsewhere.
  const budget = new Map();
  for (const [id, was] of Object.entries(baseline)) {
    if (used.has(id) || nameOf(id) != null || unmeasured.includes(metricOf(id))) continue;
    const drop = was - (now.get(id)?.value ?? 0);
    if (drop > 0) budget.set(metricOf(id), (budget.get(metricOf(id)) || 0) + drop);
  }
  for (const x of unnamed.sort((a, b) => a.value - b.value || a.id.localeCompare(b.id))) {
    const left = budget.get(x.metric) || 0;
    if (x.value <= left) {
      budget.set(x.metric, left - x.value);
      out.carried.push({ x, from: null });
    } else out.added.push(x);
  }
  out.gone = gone.filter((g) => !used.has(g));
  return out;
}

/**
 * New violations (`added`), recorded ones that got worse (`worse`), and entries whose code got better,
 * went away or moved (`stale`, until tightened). Metrics in `unmeasured` keep their entries untouched.
 */
function compare(v, baseline, unmeasured = []) {
  const c = classify(v, baseline, unmeasured);
  const fix = (x) => `${x.move}: ${(LIMITS[x.metric] || {}).what || x.metric}`;
  return {
    worse: c.worse.map(({ x, was }) => `${label(x)} (line ${x.line}): ${x.what} is ${x.value}, above its recorded ${was}${x.metric === 'file-lines' ? ' (a file over the limit is frozen)' : ''}. Fix: ${fix(x)}; move code out before adding.`),
    added: c.added.map((x) => (x.limit == null
      ? `${label(x)} (line ${x.line}): ${x.what}. Fix: ${fix(x)} (.claude/rules/refactoring.md).`
      : `${label(x)} (line ${x.line}): ${x.what} is ${x.value}, past the limit of ${x.limit}. Fix: ${fix(x)} (.claude/rules/refactoring.md).`)),
    stale: [
      ...c.better.map(({ x, was }) => `${x.id}: ${x.value} now, recorded ${was}. Run npm run quality -- --tighten.`),
      ...c.gone.map((g) => `${g}: fixed, still recorded. Run npm run quality -- --tighten.`),
      ...c.carried.map(({ x, from }) => `${x.id}: moved${from ? ` from ${from}` : ' with its code (the total held)'}. Run npm run quality -- --tighten.`),
    ],
  };
}

/** The baseline with every improvement and move taken in; refused (null) when anything got worse or is new. */
function tighten(v, baseline, unmeasured = []) {
  const c = classify(v, baseline, unmeasured);
  const { worse, added } = compare(v, baseline, unmeasured);
  const refused = [...worse, ...added].map((m) => `refused: ${m}`);
  if (refused.length) return { baseline: null, refused };
  const now = new Map(v.map((x) => [x.id, x.value]));
  const next = {};
  for (const [id, was] of Object.entries(baseline)) {
    if (unmeasured.includes(metricOf(id))) next[id] = was;
    else if (now.has(id)) next[id] = Math.min(was, now.get(id));
  }
  for (const { x } of c.carried) next[x.id] = x.value;
  return { baseline: sorted(next), refused: [] };
}

/** Entries of `ours` that are worse than `main`'s or new to it, moves aside: a baseline loosened by hand. */
function looser(ours, main) {
  const v = Object.entries(ours).map(([id, value]) => ({ id, metric: metricOf(id), value, file: fileOf(id), name: nameOf(id), line: 1 }));
  const c = classify(v, main);
  return [...c.worse.map(({ x }) => x.id), ...c.added.map((x) => x.id)].sort();
}

module.exports = { build, compare, tighten, looser, classify };
