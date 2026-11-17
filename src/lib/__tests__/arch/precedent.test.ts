// @tree-wide: the docs check's precedent gate (scripts/precedent.js) over the specs, IN_PROGRESS and the procedures that ask for precedent
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

// Decision 0193: a spec in progress, or written after the gate, says how adjacent apps do its job, from
// docs/research/adjacent-apps.md; the skills and agents ground their suggestions in that precedent.

const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

type Entry = { line: number; app: string; source: string };
type Problem = { slug: string; message: string };
type Precedent = {
  HEADING: string;
  LEGACY_SPECS: string[];
  IN_FLIGHT_SPECS: string[];
  sectionOf(text: string): { line: number; entries: Entry[] } | null;
  specProblems(specs: { slug: string; text: string }[], inProgress: string[], legacy?: string[], inFlight?: string[]): Problem[];
  check(root: string): Problem[];
};
const precedent = () => load(join(ROOT, 'scripts', 'precedent.js')) as Precedent;

const SPEC = [
  '# Unsaved captures',
  '',
  '## Criteria',
  '',
  '1. **UN1** A capture that failed to save is held for Retry.',
  '',
  '## How adjacent apps do it',
  '',
  '- **Apple Voice Memos** (iOS 27): one Record button; the recording is named after the place. Source:',
  '  https://support.apple.com/guide/iphone/make-a-recording-iph4d2a39a3b/27/ios/27 . **Verified**.',
  '- **Day One**: a long press opens the other kinds. Source: from memory, unverified. **Unverified**.',
  '- A line with no app named. Source: https://example.org/page .',
  '- **Polarsteps**: photos join a step when it is edited. No source given.',
  '',
  '## Vision',
  '',
  '- **Not an entry** Source: https://example.org (another section)',
].join('\n');

test('precedent: the section is "How adjacent apps do it"; an entry names an app in bold and a source (a URL, an observation, or "from memory, unverified")', () => {
  const p = precedent();
  assert.equal(p.HEADING, 'How adjacent apps do it');
  const s = p.sectionOf(SPEC);
  assert.ok(s, 'the section is found');
  assert.equal(s.line, 7);
  assert.deepEqual(s.entries.map((e) => [e.line, e.app]), [[9, 'Apple Voice Memos'], [11, 'Day One']]);
  assert.match(s.entries[0].source, /^https:\/\/support\.apple\.com\//, 'a source read across the entry\'s continued line');
  assert.match(s.entries[1].source, /from memory, unverified/);
  const observed = '## How adjacent apps do it\n\n- **Swarm**: a check-in with a note. Source: observed Nov 17, 2026 on an iPhone 15. **Verified**.';
  assert.deepEqual(p.sectionOf(observed)?.entries.map((e) => e.app), ['Swarm']);
  assert.equal(p.sectionOf('# A spec\n\n## Criteria\n'), null);
  const placeholder = '## How adjacent apps do it\n\n- **<App>**: <what it does>. Source: <a URL>.';
  assert.deepEqual(p.sectionOf(placeholder)?.entries, [], 'the template\'s placeholders are not an entry');
});

test('precedent: a spec in IN_PROGRESS, or not on the legacy list, fails without the section or without an entry', () => {
  const p = precedent();
  const bare = '# A spec\n\n## Criteria\n\n1. **ZZ1** Something.\n';
  const empty = '# A spec\n\n## How adjacent apps do it\n\nnone found\n';
  const legacy = ['old-one', 'old-busy'];
  const specs = [
    { slug: 'old-one', text: bare },
    { slug: 'old-busy', text: bare },
    { slug: 'new-bare', text: bare },
    { slug: 'new-empty', text: empty },
    { slug: 'new-good', text: SPEC },
  ];
  const got = p.specProblems(specs, ['old-busy'], legacy);
  assert.deepEqual(got.map((x) => x.slug).sort(), ['new-bare', 'new-empty', 'old-busy']);
  const bareMsg = got.find((x) => x.slug === 'new-bare')!.message;
  assert.match(bareMsg, /specs\/new-bare\/spec\.md/);
  assert.match(bareMsg, /## How adjacent apps do it/);
  assert.match(bareMsg, /docs\/research\/adjacent-apps\.md/);
  assert.match(got.find((x) => x.slug === 'new-empty')!.message, /no entry naming an app and a source/);
  assert.match(got.find((x) => x.slug === 'old-busy')!.message, /IN_PROGRESS/);
  assert.deepEqual(p.specProblems(specs.filter((s) => s.slug === 'old-one' || s.slug === 'new-good'), [], ['old-one']), []);
});

test('precedent: the legacy list only shrinks: a listed spec that gains the section, or that no longer exists, must leave it', () => {
  const p = precedent();
  const got = p.specProblems([{ slug: 'old-one', text: SPEC }], [], ['old-one', 'gone']);
  assert.deepEqual(got.map((x) => x.slug).sort(), ['gone', 'old-one']);
  for (const x of got) assert.match(x.message, /scripts\/precedent\.js.*LEGACY_SPECS/);
});

test('precedent: this repo is clean, every spec before the gate is listed, and check:docs runs the gate', () => {
  const p = precedent();
  assert.deepEqual(p.check(ROOT).map((x) => x.message), []);
  const slugs = readdirSync(join(ROOT, 'specs')).filter((d) => existsSync(join(ROOT, 'specs', d, 'spec.md')));
  for (const slug of p.LEGACY_SPECS) assert.ok(slugs.includes(slug) || p.IN_FLIGHT_SPECS.includes(slug), `${slug} is a spec`);
  assert.ok(p.LEGACY_SPECS.length >= 85, 'the specs on main at the gate are grandfathered');
  assert.match(read('scripts/check-docs.js'), /require\('\.\/precedent'\)/);
});

test('precedent: the list of adjacent apps and their implementations, and the procedures that ground a suggestion in it', () => {
  const list = read('docs/research/adjacent-apps.md');
  for (const kind of ['walking and outdoor', 'maps and navigation', 'journaling and memories', 'photo and media', 'location check-ins']) {
    assert.match(list, new RegExp(kind), `the list covers ${kind}`);
  }
  assert.match(list, /from memory, unverified/);
  assert.ok(precedent().sectionOf(list.replace('## Implementations, by job', '## How adjacent apps do it'))!.entries.length >= 20, 'implementations are recorded as entries');
  assert.match(read('.claude/skills/vision/SKILL.md'), /^Precedent: /m);
  assert.match(read('.claude/skills/slice/SKILL.md'), /How adjacent apps do it/);
  assert.match(read('.claude/skills/tend/SKILL.md'), /Precedent: /);
  for (const f of ['.claude/skills/audit/SKILL.md', '.claude/agents/steward.md', '.claude/agents/ux-reviewer.md', '.claude/skills/tend-orchestrator/SKILL.md', '.claude/skills/tend-orchestrator/briefs.md']) {
    assert.match(read(f), /adjacent-apps\.md|precedent/i, `${f} asks for precedent`);
  }
  assert.ok(existsSync(join(ROOT, 'docs', 'decisions')) && readdirSync(join(ROOT, 'docs', 'decisions')).some((f) => /^\d{4}-adjacent-apps/.test(f)), 'the owner\'s call is recorded');
});

test('precedent: a spec written before the gate on a branch in flight is grandfathered, missing from main or in IN_PROGRESS on its branch; unsaved-captures is not', () => {
  const p = precedent();
  const bare = '# A spec\n\n## Criteria\n\n1. **ZZ1** Something.\n';
  assert.deepEqual([...p.IN_FLIGHT_SPECS].sort(), ['open-in-maps-here', 'places-pipeline', 'shop-marks']);
  for (const slug of p.IN_FLIGHT_SPECS) assert.ok(p.LEGACY_SPECS.includes(slug), `${slug} is on LEGACY_SPECS`);
  assert.ok(!p.LEGACY_SPECS.includes('unsaved-captures'), 'our own slice adds the section');
  // On main: the listed slug has no spec yet, and that is allowed.
  assert.deepEqual(p.specProblems([], [], ['branch-only'], ['branch-only']), []);
  // A listed slug that is not in flight and has no spec still has to leave the list.
  assert.equal(p.specProblems([], [], ['gone'], ['branch-only']).length, 1);
  // After the branch rebases: its spec, in its IN_PROGRESS, without the section, passes.
  assert.deepEqual(p.specProblems([{ slug: 'branch-only', text: bare }], ['branch-only'], ['branch-only'], ['branch-only']), []);
  // The repo's own lists, as the branches will see them.
  const theirs = p.IN_FLIGHT_SPECS.map((slug) => ({ slug, text: bare }));
  assert.deepEqual(p.specProblems(theirs, p.IN_FLIGHT_SPECS).filter((x) => p.IN_FLIGHT_SPECS.includes(x.slug)).map((x) => x.message), []);
  assert.equal(p.specProblems([{ slug: 'unsaved-captures', text: bare }], ['unsaved-captures']).filter((x) => x.slug === 'unsaved-captures').length, 1);
});
