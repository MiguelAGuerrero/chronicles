#!/usr/bin/env node
/**
 * The vision check: the mechanical half of the vision gate (docs/VISION.md, decision 0094,
 * specs/vision-gate VG5-VG11). Run by CI before the export and by the Stop hook. Plain Node.
 *
 * It cannot judge intent (that is `/vision` and the steward); it catches vocabulary and plumbing:
 *   words    a score word (rating, review, rank, streak, badge, ...) in user-facing copy;
 *   tally    "N of M" in copy;
 *   percent  a percentage in copy (a style width such as `${f * 100}%` is not copy);
 *   host     a URL whose host is not on ALLOWED_HOSTS (nothing leaves the device without a reason);
 *   dep      a dependency that sends data off the device (analytics, crash reports, a backend);
 *   spec     a spec written after the gate with no "## Vision" section and verdict.
 *
 * Copy is a string literal with a letter outside its interpolations and a space or a capital start
 * (so keys, testIDs, import paths and SQL are not copy), or JSX text. Comments are never read.
 *
 * Exceptions, each with a reason the steward reviews:
 *   - `// vision-ok: <why>` on the line or the line above excuses that line;
 *   - scripts/vision.allow.json lists known cases, `kind` "allowed" (not what the rule means) or
 *     "debt" (a breach waiting on the owner's call). An entry that no longer matches fails, so the
 *     list only shrinks.
 *
 * Exit 1 with each problem and its fix; exit 0 when clean. `--list` also prints what was excused.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

/** Hosts the app may reach, each with its reason. A new one is an owner's call (decision 0005). */
const ALLOWED_HOSTS = {
  'tiles.openfreemap.org': 'the map tiles (OpenStreetMap through OpenFreeMap)',
  'overturemaps-extras-us-west-2.s3.amazonaws.com': "Overture's places, divisions and transportation tiles (0080, 0083, 0093)",
  'miguelaguerrero.github.io': "the places archive and its manifest, by tile and byte range, with no identifier (0103, 0108; PW16 recorded Nov 10), and the transcription models, one pinned file fetched on a tap (memo-transcripts, MX23)",
  'overpass-api.de': 'the walkability fallback when Overture cannot be read (0093)',
  'www.google.com': 'Open in Maps: a link the owner taps, carrying only the destination (bridges-and-open-in-maps)',
  'maps.apple.com': 'Open in Maps on iPhone: a link the owner taps (bridges-and-open-in-maps)',
};

/** Packages whose job is to send data somewhere (decision 0005). */
const BANNED_DEPS = [
  [/^(firebase|@firebase\/.+|@react-native-firebase\/.+)$/, 'Firebase (a backend, analytics)'],
  [/^(@sentry\/.+|sentry-expo)$/, 'Sentry (crash reports)'],
  [/^(amplitude-js|@amplitude\/.+)$/, 'Amplitude (analytics)'],
  [/^(mixpanel.*|mixpanel-react-native)$/, 'Mixpanel (analytics)'],
  [/^@segment\/.+$/, 'Segment (analytics)'],
  [/^(posthog-.+|posthog)$/, 'PostHog (analytics)'],
  [/^(@bugsnag\/.+|bugsnag.*)$/, 'Bugsnag (crash reports)'],
  [/^@datadog\/.+$/, 'Datadog (telemetry)'],
  [/^appcenter.*$/, 'App Center (telemetry)'],
  [/^@supabase\/.+$/, 'Supabase (a backend)'],
  [/^(aws-amplify|@aws-amplify\/.+)$/, 'Amplify (a backend)'],
  [/^expo-insights$/, 'Expo Insights (usage telemetry)'],
  [/^(react-native-onesignal|onesignal.*)$/, 'OneSignal (push through a server)'],
  [/^(react-native-branch|react-native-appsflyer)$/, 'attribution tracking'],
];

const WORDS =
  /\b(ratings?|rate|rated|reviews?|ranks?|ranked|rankings?|streaks?|scores?|scored|leaderboards?|badges?|achievements?|troph(?:y|ies)|xp|level(?:ed)? up|unlock(?:ed|s)?|completion|percent(?:age)?|top (?:\d+|\{\})|best of|most popular|popular|trending)\b/i;
const TALLY = /(\{\}|\b\d+) of (\{\}|\d+\b)/;
const PERCENT = /(\{\}|\b\d+(?:\.\d+)?) ?%/;
const URL = /\b(?:https?|wss?):\/\/([a-z0-9.-]+)/gi;
const VERDICT = /^verdict:\s*\**\s*(aligned if reshaped|aligned|not now|out|no surface)\b/im;

/** Specs written before the gate (2026-11-05). Only shrinks: a listed spec that gains a Vision section must leave. */
const LEGACY_SPECS = [
  'activity-density', 'affected-checks', 'atlas-grading', 'bridges-and-open-in-maps', 'clearing-walks-and-moments',
  'compass', 'concept', 'discrete-navigation', 'explore-atlas', 'filling-gaps', 'functional-core', 'gap-drawing',
  'media-editing', 'memories-on-revisit', 'moments-and-days', 'motion', 'navigate-ready', 'navigation-and-tabs',
  'pocket-alert-nudge', 'polish-motion', 'quality-of-life', 'reminder-bell', 'replay-rhythm',
  'rides', 'shells-saved-settings', 'test-gaps', 'test-organization', 'town-borders', 'town-outlines', 'town-presence',
  'v0.5-places', 'v1-discovery', 'v1.5-landing', 'walkability', 'walkability-headsup',
];

const REGEX_BEFORE = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);

/**
 * Splits source into its string literals and a copy of the code with comments and literal contents
 * blanked (newlines kept, so line numbers hold). Interpolations read as `{}` in a template's text.
 */
function lex(src) {
  const literals = [];
  let code = '';
  let i = 0;
  let line = 1;
  let last = '';
  const put = (s, blank) => {
    for (const ch of s) {
      if (ch === '\n') line++;
      code += blank && ch !== '\n' ? ' ' : ch;
    }
  };
  const lastWord = () => (code.match(/([A-Za-z_$]+)\s*$/) || [])[1];

  function scanCode(stopAtBrace) {
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      const n = src[i + 1];
      if (c === '/' && n === '/') {
        const end = src.indexOf('\n', i);
        const stop = end === -1 ? src.length : end;
        put(src.slice(i, stop), true);
        i = stop;
      } else if (c === '/' && n === '*') {
        const end = src.indexOf('*/', i + 2);
        const stop = end === -1 ? src.length : end + 2;
        put(src.slice(i, stop), true);
        i = stop;
      } else if (c === '/' && (REGEX_BEFORE.has(last) || ['return', 'typeof', 'case'].includes(lastWord()))) {
        let j = i + 1;
        let cls = false;
        while (j < src.length && src[j] !== '\n') {
          if (src[j] === '\\') j++;
          else if (src[j] === '[') cls = true;
          else if (src[j] === ']') cls = false;
          else if (src[j] === '/' && !cls) break;
          j++;
        }
        j++;
        while (/[a-z]/i.test(src[j] || '')) j++;
        put(src.slice(i, j), true);
        i = j;
        last = '/';
      } else if (c === "'" || c === '"') {
        const start = line;
        let j = i + 1;
        let text = '';
        while (j < src.length && src[j] !== c && src[j] !== '\n') {
          if (src[j] === '\\') {
            text += src[j + 1] || '';
            j += 2;
          } else text += src[j++];
        }
        put(c, false);
        put(src.slice(i + 1, j), true);
        put(c, false);
        i = j + 1;
        literals.push({ text, line: start, kind: 'string' });
        last = 'a';
      } else if (c === '`') {
        scanTemplate();
        last = 'a';
      } else if (c === '{') {
        depth++;
        put(c, false);
        i++;
        last = c;
      } else if (c === '}') {
        if (stopAtBrace && depth === 0) {
          put(c, true);
          i++;
          return;
        }
        depth--;
        put(c, false);
        i++;
        last = c;
      } else {
        put(c, false);
        i++;
        if (!/\s/.test(c)) last = /[A-Za-z0-9_$)\]]/.test(c) ? 'a' : c;
      }
    }
  }

  function scanTemplate() {
    const start = line;
    let text = '';
    const slots = [];
    put('`', false);
    i++;
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') {
        text += src[i + 1] || '';
        put(src.slice(i, i + 2), true);
        i += 2;
      } else if (src[i] === '$' && src[i + 1] === '{') {
        text += '{}';
        put('${', true);
        i += 2;
        const from = i;
        scanCode(true);
        slots.push(src.slice(from, i - 1));
      } else {
        text += src[i];
        put(src[i], true);
        i++;
      }
    }
    put('`', false);
    i++;
    literals.push({ text, line: start, kind: 'template', slots });
  }

  scanCode(false);
  return { literals, code };
}

/** JSX text: what sits between a tag's `>` and the next `<`, in code with literals and comments blanked. */
function jsxText(code) {
  const out = [];
  const re = />([^<>{}]*[A-Za-z][^<>{}]*)</g;
  let m;
  while ((m = re.exec(code))) {
    const text = m[1].trim();
    if (/[;=]|&&|\|\||=>|\b(return|const|let|if)\b/.test(text)) continue;
    const line = code.slice(0, m.index).split('\n').length + (m[1].match(/^\s*/)[0].split('\n').length - 1);
    out.push({ text: text.replace(/\s+/g, ' '), line, kind: 'jsx' });
  }
  return out;
}

const SQL = /^\s*(SELECT|INSERT|CREATE|UPDATE|DELETE|PRAGMA|ALTER|DROP|WITH|REPLACE)\b/i;

/** Copy a person reads, as opposed to a key, a testID, an import path or SQL. */
function isCopy(lit) {
  if (lit.kind === 'jsx') return true;
  // Letters must be the literal's own; an interpolation stands for a word, so "{} of {}" is copy.
  if (!/[A-Za-z]/.test(lit.text.replace(/\{\}/g, '')) || SQL.test(lit.text)) return false;
  const t = lit.text.replace(/\{\}/g, '0').trim();
  return /\s/.test(t) || /^[A-Z]/.test(t);
}

/** An interpolation that holds a string, a join or a name is a word; anything else may be a number. */
const WORDY = /['"`]|\.join\(|name|label|title/i;

/** The literal with each interpolation as `{}` when it may be a number and `w` when it is a word. */
function numberShape(lit) {
  let k = 0;
  return lit.text.replace(/\{\}/g, () => (WORDY.test((lit.slots || [])[k++] || '') ? 'w' : '{}'));
}

/** Every finding in one file's source. */
function scanSource(file, src) {
  const { literals, code } = lex(src);
  const all = file.endsWith('.tsx') ? literals.concat(jsxText(code)) : literals;
  const found = [];
  for (const lit of all) {
    if (isCopy(lit)) {
      const w = lit.text.match(WORDS);
      if (w) found.push({ file, line: lit.line, rule: 'words', text: lit.text, why: `"${w[0]}" is score or review vocabulary` });
      const shape = numberShape(lit);
      if (TALLY.test(shape)) found.push({ file, line: lit.line, rule: 'tally', text: lit.text, why: 'an "N of M" tally' });
      if (PERCENT.test(shape)) found.push({ file, line: lit.line, rule: 'percent', text: lit.text, why: 'a percentage' });
    }
    if (lit.kind !== 'jsx') {
      for (const m of lit.text.matchAll(URL)) {
        const host = m[1].toLowerCase();
        if (!ALLOWED_HOSTS[host]) found.push({ file, line: lit.line, rule: 'host', text: host, why: `the app reaches ${host}, which is not on ALLOWED_HOSTS` });
      }
    }
  }
  const lines = src.split('\n');
  const okReason = (n) => {
    const m = (lines[n - 1] || '').match(/vision-ok:\s*(.*)$/);
    return m && m[1].replace(/\*\/\s*$/, '').trim().length >= 10;
  };
  return found.map((f) => ({ ...f, excused: okReason(f.line) || okReason(f.line - 1) ? 'vision-ok' : null }));
}

function checkDeps(pkg) {
  const names = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
  const found = [];
  for (const name of names) {
    for (const [re, what] of BANNED_DEPS) {
      if (re.test(name)) found.push({ file: 'package.json', line: 0, rule: 'dep', text: name, why: `${name} is ${what}: it sends data off the device` });
    }
  }
  return found;
}

/** specs: [{ slug, text }]. */
function checkSpecs(specs, legacy = LEGACY_SPECS) {
  const found = [];
  for (const { slug, text } of specs) {
    const section = text.split(/^## Vision\b.*$/m)[1];
    const has = section !== undefined && VERDICT.test(section.split(/^## /m)[0]);
    if (!has && !legacy.includes(slug)) {
      found.push({ file: `specs/${slug}/spec.md`, line: 0, rule: 'spec', text: slug, why: 'no "## Vision" section with a "Verdict:" line (run /vision on the slice)' });
    }
    if (has && legacy.includes(slug)) {
      found.push({ file: 'scripts/check-vision.js', line: 0, rule: 'spec', text: slug, why: `${slug} has a Vision section now: take it off LEGACY_SPECS` });
    }
  }
  for (const slug of legacy) {
    if (!specs.some((s) => s.slug === slug)) {
      found.push({ file: 'scripts/check-vision.js', line: 0, rule: 'spec', text: slug, why: `LEGACY_SPECS names ${slug}, which has no spec: take it off` });
    }
  }
  return found;
}

/** Applies the allow list: marks what it excuses and returns entries that match nothing or lack a reason. */
function applyAllow(findings, allow) {
  const problems = [];
  for (const entry of allow) {
    if (!entry.why || entry.why.trim().length < 10 || !['allowed', 'debt'].includes(entry.kind)) {
      problems.push(`scripts/vision.allow.json: the entry for ${entry.file} (${entry.rule}) needs a kind ("allowed" or "debt") and a why.`);
      continue;
    }
    const hits = findings.filter((f) => !f.excused && f.file === entry.file && f.rule === entry.rule && f.text.includes(entry.text));
    if (!hits.length) problems.push(`scripts/vision.allow.json: the entry for ${entry.file} (${entry.rule}, "${entry.text}") matches nothing now; remove it.`);
    for (const f of hits) f.excused = entry.kind;
  }
  return problems;
}

function repoFiles() {
  const out = execSync('git ls-files --cached --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' });
  return [...new Set(out.split('\n').filter(Boolean))].filter((f) => fs.existsSync(path.join(ROOT, f)));
}

function sourceFiles(files) {
  return files.filter(
    (f) =>
      (/^src\/.+\.(ts|tsx|js)$/.test(f) && !f.includes('__tests__/') && !f.endsWith('.d.ts')) ||
      /^public\/[^/]+\.js$/.test(f) ||
      ['index.js', 'app.config.js'].includes(f),
  );
}

function readSpecs(files) {
  return files
    .filter((f) => /^specs\/[^/]+\/spec\.md$/.test(f))
    .map((f) => ({ slug: f.split('/')[1], text: fs.readFileSync(path.join(ROOT, f), 'utf8') }));
}

function run() {
  const files = repoFiles();
  let findings = [];
  for (const f of sourceFiles(files)) findings = findings.concat(scanSource(f, fs.readFileSync(path.join(ROOT, f), 'utf8')));
  findings = findings.concat(checkDeps(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))));
  findings = findings.concat(checkSpecs(readSpecs(files)));
  const allowFile = path.join(ROOT, 'scripts', 'vision.allow.json');
  const allow = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, 'utf8')) : [];
  const problems = applyAllow(findings, allow);
  return { findings, problems };
}

function main() {
  const { findings, problems } = run();
  const open = findings.filter((f) => !f.excused);
  if (process.argv.includes('--list')) {
    for (const f of findings.filter((x) => x.excused)) console.log(`excused (${f.excused}) ${f.file}:${f.line} [${f.rule}] ${f.text}`);
  }
  const debt = findings.filter((f) => f.excused === 'debt').length;
  if (!open.length && !problems.length) {
    console.log(`check:vision: clean${debt ? `; ${debt === 1 ? 'one breach' : `${debt} breaches`} carried as debt in scripts/vision.allow.json` : ''}.`);
    return;
  }
  console.error('check:vision found what docs/VISION.md rules out:\n');
  for (const f of open) console.error(`- ${f.file}${f.line ? `:${f.line}` : ''} [${f.rule}] ${f.why}: ${JSON.stringify(f.text)}`);
  for (const p of problems) console.error(`- ${p}`);
  console.error(
    '\nFix: reshape it (docs/VISION.md, Never and Shapes; run /vision on the idea). If the rule does not mean this case ' +
      '(a pager\'s "2 of 5", an attribution URL), add `// vision-ok: <why>` on the line above, or an entry in ' +
      'scripts/vision.allow.json; the steward reviews every exception. A new host or dependency is the owner\'s call (0005).',
  );
  process.exit(1);
}

module.exports = { lex, jsxText, isCopy, scanSource, checkDeps, checkSpecs, applyAllow, run, ALLOWED_HOSTS, LEGACY_SPECS };

if (require.main === module) main();
