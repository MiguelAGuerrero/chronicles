#!/usr/bin/env node
// The mock-up gate (decision 0252): a spec written after the gate whose Vision verdict has a surface carries a
// "## Mock-up" section naming its drawing and the owner's approval, as .claude/skills/mockup.md says. Read by
// scripts/check-docs.js, so the Stop hook and CI hold it. A spec with no Vision section is check:vision's to fail.
//
//   Drawing: <a link, or a docs/mockups/<id>/ path>
//   Approved: [with G<n>, ]"<the owner's words>" (the owner, YYYY-MM-DD)

const fs = require('fs');
const path = require('path');

const HEADING = 'Mock-up';
const PROCEDURE = '.claude/skills/mockup.md';

/**
 * Specs on other sessions' branches in flight when the gate landed (2026-11-21), not on main yet: grandfathered, so
 * their rebases do not break. Only shrinks: one that gains the section must leave, and one abandoned is taken off.
 */
const IN_FLIGHT_SPECS = [
  'after-dark', 'code-quality', 'errors-handled', 'explore-settings', 'osm-locates', 'picker-media', 'place-form',
  'poi-transitions', 'reference-keywords', 'shop-marks', 'walk-drawer-sections', 'walk-screen-split',
];

/** Specs on main before the gate (2026-11-21). Only shrinks: a listed spec that gains the section must leave. */
const LEGACY_SPECS = [
  'activity-density', 'affected-checks', 'area-states', 'atlas-grading', 'back-up-everything',
  'bridges-and-open-in-maps', 'capture-at-a-place', 'capture-from-chronicle', 'chronicle-journal',
  'clearing-walks-and-moments', 'community-parks', 'compass', 'complexes', 'concept', 'device-acceptance',
  'discrete-navigation', 'drive-in-the-outing', 'drive-then-walk', 'empty-walk', 'explore-atlas', 'explore-carousel',
  'explore-dense-city', 'explore-go-here', 'explore-subtypes', 'expo-image', 'filling-gaps', 'free-look',
  'functional-core', 'gap-drawing', 'go-here-everywhere', 'kind-walk', 'map-layers', 'map-palette', 'media-editing',
  'media-gallery', 'memo-transcripts', 'memories-context', 'memories-on-revisit', 'modes-to-layers',
  'moment-assignment-fallback', 'moment-references', 'moment-stacks', 'moment-table', 'moments-and-days',
  'more-attractions', 'motion', 'native-map-frames', 'navigate-ready', 'navigation-and-tabs',
  'neighborhood-boundaries', 'note-pages', 'note-pictures', 'note-types', 'open-in-maps-here', 'outing-journey',
  'owner-threads', 'place-search', 'places-layer', 'places-out-of-town', 'places-pipeline', 'places-worth-the-stop',
  'pocket-alert-nudge', 'polish-motion', 'presence-and-kinds', 'presence-readers', 'presence', 'quality-of-life',
  'quick-circuit', 'react-compiler', 'reaction-links', 'reactions', 'remarkable-and-public', 'reminder-bell',
  'replay-ceremony', 'replay-pace', 'replay-rhythm', 'response-thread', 'resurfaced-moments', 'rides', 'road-engine',
  'scenic-routes', 'section-bar', 'shells-saved-settings', 'shop-facets', 'sights-and-local-life', 'small-places',
  'smooth-switches', 'stack-with-previous', 'storage-awareness', 'storefronts', 'tap-to-capture-places', 'test-gaps',
  'test-organization', 'town-borders', 'town-fixtures', 'town-identity', 'town-outlines', 'town-presence',
  'ui-conformance', 'unsaved-captures', 'v0.5-places', 'v1-discovery', 'v1.5-landing', 'video-thumbnails',
  'vision-gate', 'voice-trim', 'walk-planner', 'walkability-headsup', 'walkability-urban-form', 'walkability',
  'what-im-into-page', 'where-ive-been', 'whole-towns',
];

const VERDICT = /^\s*[-*]?\s*\**Verdict:?\**\s*(.*)$/im;
const LINK = /https?:\/\/\S+|\bdocs\/mockups\/[A-Za-z0-9._-]+\/?/;
const APPROVED = /^(?:with [TG]\d+,\s*)?"[^"<>]{2,}"\s*\(the owner, \d{4}-\d{2}-\d{2}\)/;

/** The text of a "## <heading>" section (pure), with its 1-based line, or null. */
function section(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${heading}\\b`).test(l));
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && /^#{1,2}\s/.test(l));
  return { line: start + 1, body: lines.slice(start + 1, end < 0 ? undefined : end) };
}

/** Whether the spec's Vision verdict has a surface (pure): true, false for "no surface", null with no verdict. */
function surfaceOf(text) {
  const s = section(text, 'Vision');
  const m = s && VERDICT.exec(s.body.join('\n'));
  if (!m) return null;
  return !/no surface/i.test(m[1]);
}

/** The "## Mock-up" section (pure): its line, the drawing's link and the approval, each null when not given. */
function sectionOf(text) {
  const s = section(text, HEADING);
  if (!s) return null;
  const value = (key) => {
    const l = s.body.find((x) => new RegExp(`^\\s*[-*]?\\s*${key}:`).test(x));
    return l ? l.replace(new RegExp(`^\\s*[-*]?\\s*${key}:\\s*`), '').trim() : null;
  };
  const drawing = value('Drawing');
  const approved = value('Approved');
  const link = drawing && !/[<>]/.test(drawing) ? LINK.exec(drawing) : null;
  return { line: s.line, drawing: link ? link[0] : null, approved: approved && APPROVED.test(approved) ? approved : null };
}

/** What is wrong (pure): specs [{ slug, text }], the legacy and in-flight lists. */
function specProblems(specs, legacy = LEGACY_SPECS, inFlight = IN_FLIGHT_SPECS) {
  const out = [];
  const old = new Set(legacy);
  const branch = new Set(inFlight);
  for (const { slug, text } of specs) {
    const s = sectionOf(text);
    const done = s && s.drawing && s.approved;
    if ((old.has(slug) || branch.has(slug)) && done) {
      out.push({ slug, message: `${slug} has an approved "## ${HEADING}" section now: take it off scripts/mockup.js's ${old.has(slug) ? 'LEGACY_SPECS' : 'IN_FLIGHT_SPECS'} (the lists only shrink).` });
      continue;
    }
    if (old.has(slug) || branch.has(slug) || surfaceOf(text) !== true) continue;
    const where = `specs/${slug}/spec.md`;
    if (!s) {
      out.push({ slug, message: `${where} changes what a screen shows (its Vision verdict has a surface) and has no "## ${HEADING}" section (decision 0252): draw the mock-up, have the owner approve it, and add the section with its "Drawing:" and "Approved:" lines (${PROCEDURE}).` });
    } else if (!s.drawing) {
      out.push({ slug, message: `${where}:${s.line}: "## ${HEADING}" has no "Drawing:" line with the page's link or its docs/mockups/<id>/ path (${PROCEDURE}).` });
    } else if (!s.approved) {
      out.push({ slug, message: `${where}:${s.line}: "## ${HEADING}" has no "Approved:" line with the owner's words, quoted, and the date, \`Approved: "<the owner's words>" (the owner, YYYY-MM-DD)\`: no code before the owner approves the look (${PROCEDURE}).` });
    }
  }
  const slugs = new Set(specs.map((s) => s.slug));
  for (const slug of legacy) {
    if (!slugs.has(slug)) out.push({ slug, message: `scripts/mockup.js's LEGACY_SPECS names ${slug}, which has no spec: take it off (the list only shrinks).` });
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
  return specProblems(specs);
}

module.exports = { HEADING, PROCEDURE, LEGACY_SPECS, IN_FLIGHT_SPECS, surfaceOf, sectionOf, specProblems, check };

if (require.main === module) {
  const problems = check();
  for (const p of problems) console.error(`- ${p.message}`);
  if (problems.length) process.exit(1);
  console.log('mockup: ok');
}
