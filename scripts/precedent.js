#!/usr/bin/env node
// The precedent gate (decision 0193): a spec in progress (IN_PROGRESS in scripts/features.js), or written after the
// gate, carries a "## How adjacent apps do it" section with at least one entry naming an app and a source, taken
// from docs/research/adjacent-apps.md. Read by scripts/check-docs.js, so the Stop hook and CI hold it.
//
// An entry is a list item, its continued lines indented: `- **<App>** (...): <what it does>. Source: <a URL |
// observed <date> on <device> | from memory, unverified>. **Verified** | **Unverified**.`

const fs = require('fs');
const path = require('path');

const HEADING = 'How adjacent apps do it';
const LIST = 'docs/research/adjacent-apps.md';

/** Specs written before the gate (2026-11-17). Only shrinks: a listed spec that gains the section must leave. */
const LEGACY_SPECS = [
  'activity-density', 'affected-checks', 'atlas-grading', 'bridges-and-open-in-maps', 'capture-from-chronicle',
  'chronicle-journal', 'clearing-walks-and-moments', 'community-parks', 'compass', 'complexes', 'concept',
  'device-acceptance', 'discrete-navigation', 'drive-then-walk', 'empty-walk', 'explore-atlas',
  'explore-carousel', 'explore-dense-city', 'explore-go-here', 'explore-subtypes', 'filling-gaps', 'free-look',
  'functional-core', 'gap-drawing', 'go-here-everywhere', 'kind-walk', 'map-layers', 'map-palette',
  'media-editing', 'media-gallery', 'memo-transcripts', 'memories-context', 'memories-on-revisit',
  'moment-references', 'moment-stacks', 'moment-table', 'moments-and-days', 'motion', 'native-map-frames',
  'navigate-ready', 'navigation-and-tabs', 'neighborhood-boundaries', 'note-pages', 'note-pictures',
  'note-types', 'owner-threads', 'place-search', 'places-out-of-town', 'places-pipeline',
  'places-worth-the-stop', 'pocket-alert-nudge', 'polish-motion', 'presence-and-kinds', 'presence-readers',
  'presence', 'quality-of-life', 'reaction-links', 'reactions', 'remarkable-and-public', 'reminder-bell',
  'replay-rhythm', 'response-thread', 'resurfaced-moments', 'rides', 'scenic-routes', 'section-bar',
  'shells-saved-settings', 'small-places', 'smooth-switches', 'storage-awareness', 'storefronts', 'test-gaps',
  'test-organization', 'town-borders', 'town-outlines', 'town-presence', 'ui-conformance', 'v0.5-places',
  'v1-discovery', 'v1.5-landing', 'video-thumbnails', 'vision-gate', 'voice-trim', 'walk-planner',
  'walkability-headsup', 'walkability-urban-form', 'walkability', 'whole-towns',
];

const ITEM = /^(\s*)(?:[-*]|\d+\.)\s+(.*)$/;
const APP = /\*\*([^*<>]+?)\*\*/;
const SOURCE = /Source:\s*(.*)$/;
const REAL_SOURCE = /https?:\/\/\S+|\bobserved\b|from memory, unverified/i;

/** The section and its entries that name an app and a source (pure), or null when there is no section. Lines are 1-based. */
function sectionOf(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^(#{2,6})\s+(.+?)\s*$/.test(l) && l.replace(/^#+\s+/, '').trim() === HEADING);
  if (start < 0) return null;
  const level = /^#+/.exec(lines[start])[0].length;
  const items = [];
  for (let i = start + 1; i < lines.length; i++) {
    const h = /^(#+)\s/.exec(lines[i]);
    if (h && h[1].length <= level) break;
    const m = ITEM.exec(lines[i]);
    if (m && m[1].length === 0) items.push({ line: i + 1, text: m[2] });
    else if (items.length && /^\s+\S/.test(lines[i])) items[items.length - 1].text += ' ' + lines[i].trim();
    else if (!lines[i].trim()) continue;
    else if (items.length) items.push({ line: i + 1, text: '' }); // a plain line ends the item before it
  }
  const entries = [];
  for (const it of items) {
    const app = APP.exec(it.text);
    const src = SOURCE.exec(it.text);
    if (!app || !src || !REAL_SOURCE.test(src[1])) continue;
    entries.push({ line: it.line, app: app[1].trim(), source: src[1].trim() });
  }
  return { line: start + 1, entries };
}

/** What is wrong (pure): specs [{ slug, text }], the slugs in IN_PROGRESS, the legacy list. */
function specProblems(specs, inProgress, legacy = LEGACY_SPECS) {
  const out = [];
  const old = new Set(legacy);
  const busy = new Set(inProgress);
  for (const { slug, text } of specs) {
    const s = sectionOf(text);
    const why = busy.has(slug) ? 'it is in IN_PROGRESS (scripts/features.js)' : 'it was written after the precedent gate (decision 0193)';
    if (old.has(slug) && s && s.entries.length) {
      out.push({ slug, message: `${slug} has a "## ${HEADING}" section now: take it off scripts/precedent.js's LEGACY_SPECS (the list only shrinks).` });
      continue;
    }
    if (old.has(slug) && !busy.has(slug)) continue;
    if (!s) {
      out.push({ slug, message: `specs/${slug}/spec.md has no "## ${HEADING}" section, and ${why}: add one with 2-3 adjacent apps' handling of its job, each \`- **<App>**: <controls, words, flow>. Source: <URL | observed <date> | from memory, unverified>.\`, from ${LIST} (record new ones there too).` });
    } else if (!s.entries.length) {
      out.push({ slug, message: `specs/${slug}/spec.md:${s.line}: "## ${HEADING}" has no entry naming an app and a source, and ${why}: each entry is \`- **<App>**: … Source: <URL | observed <date> | from memory, unverified>.\` (see ${LIST}).` });
    }
  }
  const slugs = new Set(specs.map((s) => s.slug));
  for (const slug of legacy) {
    if (!slugs.has(slug)) out.push({ slug, message: `scripts/precedent.js's LEGACY_SPECS names ${slug}, which has no spec: take it off (the list only shrinks).` });
  }
  return out;
}

/** The repo's problems. */
function check(root = path.join(__dirname, '..')) {
  const dir = path.join(root, 'specs');
  const specs = fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'spec.md')))
        .map((d) => ({ slug: d.name, text: fs.readFileSync(path.join(dir, d.name, 'spec.md'), 'utf8') }))
    : [];
  const { IN_PROGRESS } = require(path.join(root, 'scripts', 'features.js'));
  return specProblems(specs, Object.keys(IN_PROGRESS || {}));
}

module.exports = { HEADING, LIST, LEGACY_SPECS, sectionOf, specProblems, check };

if (require.main === module) {
  const problems = check();
  for (const p of problems) console.error(`- ${p.message}`);
  if (problems.length) process.exit(1);
  console.log('precedent: ok');
}
