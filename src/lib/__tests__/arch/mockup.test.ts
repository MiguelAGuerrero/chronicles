// @tree-wide: the docs check's mock-up gate (scripts/mockup.js) over the specs and the procedures that ask for a mock-up
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

// Decision 0252: a new or changed look waits for a mock-up the owner approved. A spec written after the gate whose
// Vision verdict has a surface carries a "## Mock-up" section naming its drawing and the owner's approval.

const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

type Problem = { slug: string; message: string };
type Mockup = {
  HEADING: string;
  LEGACY_SPECS: string[];
  IN_FLIGHT_SPECS: string[];
  surfaceOf(text: string): boolean | null;
  sectionOf(text: string): { line: number; drawing: string | null; approved: string | null } | null;
  specProblems(specs: { slug: string; text: string }[], legacy?: string[], inFlight?: string[]): Problem[];
  check(root: string): Problem[];
};
const mockup = () => load(join(ROOT, 'scripts', 'mockup.js')) as Mockup;

const VISION = (verdict: string) => `## Vision\n\nIdea: a thing\nVerb: return\nVerdict: ${verdict}\nShape: as asked\n`;
const SECTION = [
  '## Mock-up',
  '',
  'Drawing: https://claude.ai/code/artifact/0b5d (docs/mockups/contents-groups/)',
  'Approved: "Approve as drawn" (the owner, 2026-11-22)',
  '',
].join('\n');
const spec = (...parts: string[]) => ['# A slice', '', '## Criteria', '', '1. **ZZ1** Something.', '', ...parts].join('\n');

test('mockup: the section is "Mock-up", with a Drawing line (a link) and an Approved line (the owner\'s quoted words and a date)', () => {
  const m = mockup();
  assert.equal(m.HEADING, 'Mock-up');
  const s = m.sectionOf(spec(SECTION));
  assert.ok(s, 'the section is found');
  assert.equal(s.line, 7);
  assert.match(s.drawing ?? '', /^https:\/\/claude\.ai\//);
  assert.match(s.approved ?? '', /Approve as drawn/);
  const fromEntry = '## Mock-up\n\nDrawing: docs/mockups/G12/\nApproved: with G12, "Yes" (the owner, 2026-11-23)\n';
  assert.ok(m.sectionOf(fromEntry)?.approved, 'an approval carried from an entry counts');
  const unquoted = '## Mock-up\n\nDrawing: docs/mockups/x/\nApproved: yes\n';
  assert.equal(m.sectionOf(unquoted)?.approved, null, 'an approval without the owner\'s quoted words and a date does not count');
  const noLink = '## Mock-up\n\nDrawing: to come\nApproved: "Yes" (the owner, 2026-11-23)\n';
  assert.equal(m.sectionOf(noLink)?.drawing, null, 'a drawing line without a link or a docs/mockups path does not count');
  const placeholder = '## Mock-up\n\nDrawing: <the page\'s link>\nApproved: "<the owner\'s words>" (the owner, YYYY-MM-DD)\n';
  const p = m.sectionOf(placeholder);
  assert.equal(p?.drawing, null, 'the template\'s placeholders are no drawing');
  assert.equal(p?.approved, null, 'the template\'s placeholders are no approval');
  assert.equal(m.sectionOf(spec()), null);
});

test('mockup: a spec has a surface unless its Vision verdict says no surface; no Vision section is unknown', () => {
  const m = mockup();
  assert.equal(m.surfaceOf(spec(VISION('aligned'))), true);
  assert.equal(m.surfaceOf(spec(VISION('aligned if reshaped'))), true);
  assert.equal(m.surfaceOf(spec(VISION('no surface'))), false);
  assert.equal(m.surfaceOf(spec(VISION('**no surface**'))), false);
  assert.equal(m.surfaceOf(spec()), null);
});

test('mockup: a new spec with a surface fails without an approved drawing; legacy, in-flight and no-surface specs pass', () => {
  const m = mockup();
  const specs = [
    { slug: 'old-one', text: spec(VISION('aligned')) },
    { slug: 'on-a-branch', text: spec(VISION('aligned')) },
    { slug: 'new-bare', text: spec(VISION('aligned')) },
    { slug: 'new-unapproved', text: spec(VISION('aligned'), '## Mock-up\n\nDrawing: docs/mockups/new-unapproved/\n') },
    { slug: 'new-tooling', text: spec(VISION('no surface')) },
    { slug: 'new-good', text: spec(VISION('aligned'), SECTION) },
    { slug: 'new-no-vision', text: spec() },
  ];
  const got = m.specProblems(specs, ['old-one'], ['on-a-branch']);
  assert.deepEqual(got.map((x) => x.slug).sort(), ['new-bare', 'new-unapproved']);
  const bare = got.find((x) => x.slug === 'new-bare')!.message;
  assert.match(bare, /specs\/new-bare\/spec\.md/);
  assert.match(bare, /## Mock-up/);
  assert.match(bare, /\.claude\/skills\/mockup\.md/);
  assert.match(got.find((x) => x.slug === 'new-unapproved')!.message, /Approved:/);
});

test('mockup: the lists only shrink: a listed spec that gains the section, or has no spec, must leave', () => {
  const m = mockup();
  const got = m.specProblems([{ slug: 'old-done', text: spec(VISION('aligned'), SECTION) }], ['old-done', 'old-gone'], ['branch-landed']);
  assert.deepEqual(got.map((x) => x.slug).sort(), ['old-done', 'old-gone']);
  assert.match(got.find((x) => x.slug === 'old-done')!.message, /LEGACY_SPECS/);
});

test('mockup: the repo passes its own gate, and the procedures that build a look name mockup.md', () => {
  const m = mockup();
  assert.deepEqual(m.check(ROOT), []);
  assert.ok(existsSync(join(ROOT, '.claude', 'skills', 'mockup.md')), 'the procedure exists');
  for (const rel of ['slice/SKILL.md', 'fix/SKILL.md', 'tend/SKILL.md', 'investigate/SKILL.md', 'audit/SKILL.md', 'tend-orchestrator/SKILL.md', 'README.md']) {
    assert.match(read(join('.claude', 'skills', rel)), /mockup\.md/, `.claude/skills/${rel} names mockup.md`);
  }
  assert.match(read('scripts/check-docs.js'), /require\('\.\/mockup'\)/, 'check:docs runs the gate');
});
