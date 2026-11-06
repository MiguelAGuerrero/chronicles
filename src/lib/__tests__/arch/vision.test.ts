// @tree-wide: docs/VISION.md, the vision check over src, specs and package.json, the procedure docs, CI and the Stop hook
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

// The vision gate (specs/vision-gate, decision 0094): the page agents argue from, the procedures that run the
// gate, and the check that blocks what a script can catch.

const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

type Finding = { file: string; line: number; rule: string; text: string; why: string; excused?: string | null };
type Vision = {
  lex(src: string): { literals: { text: string; line: number; kind: string }[]; code: string };
  scanSource(file: string, src: string): Finding[];
  checkDeps(pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }): Finding[];
  checkSpecs(specs: { slug: string; text: string }[], legacy?: string[]): Finding[];
  applyAllow(findings: Finding[], allow: { file: string; rule: string; text: string; kind: string; why: string }[]): string[];
  run(): { findings: Finding[]; problems: string[] };
  ALLOWED_HOSTS: Record<string, string>;
  LEGACY_SPECS: string[];
};
const vision = load(join(ROOT, 'scripts', 'check-vision.js')) as Vision;
const rules = (file: string, src: string) => vision.scanSource(file, src).filter((f) => !f.excused).map((f) => `${f.rule}:${f.text}`);

test('VG1 the vision is one page with its sections, proposals marked, held to a budget by the docs check', () => {
  const page = read('docs/VISION.md');
  for (const h of ['## Who it is for', '## What it is', '## The three verbs', '## Never', '## Always', '## Shapes', '## The Chronicle', '## Open questions', '## Precedents']) {
    assert.ok(page.includes(h), `docs/VISION.md has "${h}"`);
  }
  for (const verb of ['**Earn**', '**Honour**', '**Return**']) assert.ok(page.includes(verb), verb);
  assert.match(page, /\*\*\[proposed\]\*\*/, 'recommendations not yet the owner\'s calls are marked');
  assert.match(page, /Last reviewed:\*\* \d{4}-\d{2}-\d{2} at `[0-9a-f]{7,}`/, 'the review stamp /vision review moves');
  const docs = read('scripts/check-docs.js');
  assert.match(docs, /visionLines: 160/);
  assert.match(docs, /'docs\/VISION\.md',/, 'its named paths are checked');
  assert.ok(page.split('\n').length <= 160 && Buffer.byteLength(page) <= 12_000);
});

test('VG2 the /vision skill gives one of five verdicts, its shape and criteria, argues once, and reviews drift', () => {
  const skill = read('.claude/skills/vision/SKILL.md');
  assert.match(skill, /^name: vision$/m);
  for (const v of ['aligned', 'aligned if reshaped', 'not now', 'out', 'no surface']) assert.ok(skill.includes(`**${v}**`), v);
  for (const line of ['Verb:', 'Touches:', 'Verdict:', 'Shape:', 'Criteria:']) assert.ok(skill.includes(line), line);
  assert.match(skill, /Argue once/);
  assert.match(skill, /docs\/decisions\//, 'an owner\'s overrule becomes a decision record');
  assert.match(skill, /Never invent a rule/);
  assert.match(skill, /## 2\. Review \(`\/vision review`\)/);
  assert.match(skill, /Last reviewed/);
});

test('VG3 the steward is report-only, reads the vision, and grades breach, drift or tone', () => {
  const agent = read('.claude/agents/steward.md');
  assert.match(agent, /^name: steward$/m);
  const tools = agent.match(/^tools: (.+)$/m)?.[1] ?? '';
  assert.deepEqual(tools.split(/,\s*/).sort(), ['Bash', 'Glob', 'Grep', 'Read']);
  assert.match(agent, /docs\/VISION\.md/);
  for (const s of ['**breach**', '**drift**', '**tone**']) assert.ok(agent.includes(s), s);
});

test('VG4 the procedures run the gate: slice before the spec and the steward before the plan, fix, audit, docs-gc', () => {
  const slice = read('.claude/skills/slice/SKILL.md');
  const gate = slice.indexOf('## 1b. Gate');
  assert.ok(gate > 0 && gate < slice.indexOf('## 2. Spec'), '/slice gates before the spec');
  assert.ok(slice.indexOf('`steward` subagent') < slice.indexOf('Stop and show the owner the plan'), 'the steward runs before the owner\'s plan review');
  assert.match(read('.claude/skills/fix/SKILL.md'), /`\/vision`\s+on it says \*\*out\*\*/);
  assert.match(read('.claude/skills/audit/SKILL.md'), /`steward` subagent/);
  assert.match(read('.claude/agents/auditor.md'), /`docs\/VISION\.md`/);
  assert.match(read('.claude/skills/docs-gc/SKILL.md'), /npm run check:vision/);
});

test('VG5 score and review words in copy are caught; keys, testIDs, imports, SQL and comments are not', () => {
  assert.deepEqual(rules('a.tsx', `const y = 'Write a review';\nconst x = <Text>Rate this place</Text>;`), ['words:Write a review', 'words:Rate this place']);
  assert.deepEqual(rules('a.ts', `const t = 'Top 10 streets';`), ['words:Top 10 streets']);
  assert.deepEqual(rules('a.tsx', `const x = <Text>Your streak</Text>;`), ['words:Your streak']);
  assert.deepEqual(rules('a.ts', 'const s = `${n} points scored`;'), ['words:{} points scored']);
  assert.deepEqual(rules('a.ts', `const r = "Ranked by walkers";`), ['words:Ranked by walkers']);
  assert.deepEqual(
    rules(
      'a.tsx',
      [
        `import x from './points';`,
        `const id = 'memory-badge';`,
        `const k = \`walk-badge-\${b}\`;`,
        `db.run('INSERT INTO outline_tile (points) VALUES (?)');`,
        `// a review of the score: Write a review`,
        `/* Your streak */ const a = 1;`,
        `const p = 'Preview';`,
      ].join('\n'),
    ),
    [],
  );
});

test('VG6 "N of M" and percentages in copy are caught; words in the slots and style widths pass', () => {
  assert.deepEqual(rules('a.ts', 'const s = `${c.found} of ${c.total} · list from ${d}`;'), ['tally:{} of {} · list from {}']);
  assert.deepEqual(rules('a.ts', 'const s = `${x.length} of ${y.length}`;'), ['tally:{} of {}']);
  assert.deepEqual(rules('a.ts', `const s = 'Walked 12 of 87 streets';`), ['tally:Walked 12 of 87 streets']);
  assert.deepEqual(rules('a.ts', 'const s = `${pct}% explored`;'), ['percent:{}% explored']);
  assert.deepEqual(rules('a.ts', "const s = `${top === 3 ? 'Lots' : 'Plenty'} of ${named.join(' and ')}`;"), []);
  assert.deepEqual(rules('a.tsx', 'const v = <View style={{ width: `${f * 100}%` }} />;'), []);
});

test('VG7 a URL to a host off the allowlist is caught, each allowed host has a reason, comments are not read', () => {
  assert.deepEqual(rules('a.ts', `fetch('https://api.example-analytics.io/v1/events');`), ['host:api.example-analytics.io']);
  assert.deepEqual(rules('a.ts', 'const u = `wss://live.example.net/${id}`;'), ['host:live.example.net']);
  assert.deepEqual(rules('a.ts', `const u = 'https://tiles.openfreemap.org/planet';\n// see https://claude.ai/artifact/x`), []);
  for (const [host, why] of Object.entries(vision.ALLOWED_HOSTS)) assert.ok(why.length > 10, `${host} has a reason`);
});

test('VG8 a dependency that sends data off the device is caught', () => {
  const found = vision.checkDeps({ dependencies: { expo: '1', '@sentry/react-native': '1', 'posthog-react-native': '1' }, devDependencies: { firebase: '1' } });
  assert.deepEqual(found.map((f) => f.text).sort(), ['@sentry/react-native', 'firebase', 'posthog-react-native']);
  assert.deepEqual(vision.checkDeps(JSON.parse(read('package.json'))), []);
});

test('VG9 a new spec needs a Vision section with a verdict; the legacy list only shrinks', () => {
  const ok = '# X\n\n## Vision\n\n```\nVerdict: aligned if reshaped\n```\n\n## Criteria\n';
  const empty = '# X\n\n## Vision\n\nTo do.\n\n## Criteria\nVerdict: aligned\n';
  assert.deepEqual(vision.checkSpecs([{ slug: 'new', text: ok }], []), []);
  assert.equal(vision.checkSpecs([{ slug: 'new', text: '# X\n' }], [])[0].rule, 'spec');
  assert.equal(vision.checkSpecs([{ slug: 'new', text: empty }], []).length, 1, 'the verdict must sit in the Vision section');
  assert.deepEqual(vision.checkSpecs([{ slug: 'old', text: '# X\n' }], ['old']), []);
  assert.match(vision.checkSpecs([{ slug: 'old', text: ok }], ['old'])[0].why, /take it off LEGACY_SPECS/);
  assert.match(vision.checkSpecs([], ['gone'])[0].why, /has no spec/);
  assert.ok(!vision.LEGACY_SPECS.includes('vision-gate'));
  assert.match(read('specs/vision-gate/spec.md'), /## Vision[\s\S]*Verdict: no surface/);
});

test('VG10 exceptions carry reasons: vision-ok with a why excuses a line, allow entries need a kind and a why, stale entries fail', () => {
  assert.deepEqual(rules('a.ts', `// vision-ok: a pager's position among open moments\nconst p = \`\${i + 1} of \${n}\`;`), []);
  assert.deepEqual(rules('a.ts', `const p = \`\${i + 1} of \${n}\`; // vision-ok: the pager's position`), []);
  assert.deepEqual(rules('a.ts', `// vision-ok:\nconst p = \`\${i + 1} of \${n}\`;`), ['tally:{} of {}']);
  const findings = (): Finding[] => [{ file: 'a.ts', line: 3, rule: 'tally', text: '{} of {}', why: '' }];
  const f1 = findings();
  assert.deepEqual(vision.applyAllow(f1, [{ file: 'a.ts', rule: 'tally', text: '{} of {}', kind: 'debt', why: 'waiting on the owner' }]), []);
  assert.equal(f1[0].excused, 'debt');
  assert.match(vision.applyAllow(findings(), [{ file: 'a.ts', rule: 'tally', text: '{} of {}', kind: 'ok', why: '' }])[0], /needs a kind/);
  assert.match(vision.applyAllow(findings(), [{ file: 'b.ts', rule: 'tally', text: 'x', kind: 'allowed', why: 'a reason long enough' }])[0], /matches nothing now/);
});

test('VG11 the repo passes with no debt (the found tally went with decision 0099); CI and the Stop hook run the check', () => {
  const { findings, problems } = vision.run();
  assert.deepEqual(problems, []);
  assert.deepEqual(findings.filter((f) => !f.excused).map((f) => `${f.file}:${f.line} ${f.rule} ${f.text}`), []);
  assert.deepEqual(findings.filter((f) => f.excused === 'debt').map((f) => f.file), [], 'no debt left');
  const ci = read('.github/workflows/pages.yml');
  assert.ok(ci.indexOf('npm run check:vision') > 0 && ci.indexOf('npm run check:vision') < ci.indexOf('expo export'), 'CI checks before the export');
  const hook = read('.claude/hooks/check-done.sh');
  assert.match(hook, /node scripts\/check-vision\.js/);
  assert.match(hook, /\^\(src\|specs\|public\)\//);
  assert.match(read('package.json'), /"check:vision": "node scripts\/check-vision\.js"/);
});

test('VG12 AGENTS.md points to the vision, the gate and the check', () => {
  const agents = read('AGENTS.md');
  assert.match(agents, /`docs\/VISION\.md`/);
  assert.match(agents, /`\/vision`/);
  assert.match(agents, /npm run check:vision/);
});
