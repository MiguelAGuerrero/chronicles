// @tree-wide: the device acceptance suite (docs/NATIVE_UNVERIFIED.md) against its format, the gate's device entries and the e2e's stand-ins
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

// The tests only a phone can run, kept as an acceptance suite for the first mobile run (specs/device-acceptance, DV1-DV7).

const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const tmp = mkdtempSync(join(tmpdir(), 'device-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

type Item = { line: number; done: boolean; ids: string[]; result: { kind: 'passed' | 'failed'; date: string; device: string } | null };
type Area = { heading: string; line: number; items: Item[] };
type Device = {
  parseSuite(text: string): { areas: Area[] };
  suiteProblems(text: string, device: { slug: string; id: string }[]): { line: number | null; message: string }[];
  check(root: string): { line: number | null; message: string }[];
  SUITE_FILE: string;
};
const device = () => load(join(ROOT, 'scripts', 'device.js')) as Device;

const SUITE = [
  '# Native, unverified on a device',
  '',
  '## How to run',
  '',
  'A development build.',
  '',
  '## Sensors',
  '',
  '- [ ] **Do:** walk 50 m with the app open. **Expect:** the dot moves within 2 s of the first step. (MO6, MO10)',
  '- [x] **Do:** stand still a minute. **Expect:** the dot holds. — passed Nov 9, iPhone 13 (iOS 18.1)',
  '- [ ] **Do:** sit on a bus. **Expect:** the ride is drawn dashed. — failed Nov 9, Pixel 7 (Android 15): drawn solid',
  '',
  '## Replay',
  '',
  '- [ ] **Do:** turn VoiceOver on and open a replay. **Expect:** each swipe steps to the next moment. (RR17)',
].join('\n');

test('DV1 the suite is this repo\'s native checklist, grouped by area, every item under a heading', { todo: 'test first' }, () => {
  const d = device();
  assert.equal(d.SUITE_FILE, 'docs/NATIVE_UNVERIFIED.md');
  const { areas } = d.parseSuite(SUITE);
  assert.deepEqual(areas.map((a) => [a.heading, a.items.length]), [['How to run', 0], ['Sensors', 3], ['Replay', 1]]);
  const mine = d.parseSuite(read(d.SUITE_FILE)).areas.filter((a) => a.items.length);
  assert.ok(mine.length >= 15, `areas with items: ${mine.length}`);
  assert.ok(mine.reduce((n, a) => n + a.items.length, 0) >= 160, 'every native path is still an item');
  assert.deepEqual(d.check(ROOT).map((p) => `${p.line}: ${p.message}`), []);
});

test('DV2 each item says what to do and what to expect, or the check names its line', { todo: 'test first' }, () => {
  const bad = SUITE.replace('**Expect:** the ride is drawn dashed.', 'the ride is drawn dashed.').replace('**Do:** stand still', 'stand still');
  const got = device().suiteProblems(bad, []);
  assert.deepEqual(got.map((p) => p.line).sort(), [10, 11]);
  for (const p of got) assert.match(p.message, /\*\*Do:\*\* … \*\*Expect:\*\*/);
  assert.deepEqual(device().suiteProblems(SUITE, []), []);
});

test('DV3 an item names the criteria it accepts; every device-only criterion has an item', { todo: 'test first' }, () => {
  const d = device();
  const items = d.parseSuite(SUITE).areas.flatMap((a) => a.items);
  assert.deepEqual(items.map((i) => i.ids), [['MO6', 'MO10'], [], [], ['RR17']]);
  assert.deepEqual(d.suiteProblems(SUITE, [{ slug: 'replay-rhythm', id: 'RR17' }]), []);
  const missing = d.suiteProblems(SUITE, [{ slug: 'compass', id: 'CP9' }]);
  assert.equal(missing.length, 1);
  assert.match(missing[0].message, /compass:CP9.*UNTESTED.*no item/);
  // This repo: RR17 is device-only, and the docs check runs the suite's check.
  const { UNTESTED } = load(join(ROOT, 'scripts', 'features.js')) as { UNTESTED: Record<string, Record<string, string>> };
  assert.ok(UNTESTED['replay-rhythm'].RR17.startsWith('device:'));
  assert.ok(d.parseSuite(read(d.SUITE_FILE)).areas.some((a) => a.items.some((i) => i.ids.includes('RR17'))), 'RR17 has an item');
  assert.match(read('scripts/check-docs.js'), /require\('\.\/device'\)/);
});

test('DV4 the suite opens with how to run it', { todo: 'test first' }, () => {
  const d = device();
  const text = read(d.SUITE_FILE);
  const first = d.parseSuite(text).areas[0];
  assert.equal(first.heading, 'How to run');
  const how = text.slice(text.indexOf('## How to run'), text.indexOf('\n## ', text.indexOf('## How to run') + 5));
  for (const s of ['development build', 'Expo Go', 'upgrade', 'outdoors', 'bus', 'screen off', '— passed', '— failed']) assert.ok(how.includes(s), `how to run says ${s}`);
});

test('DV5 a ticked item says when and on what it passed; a failure stays open with what happened', { todo: 'test first' }, () => {
  const d = device();
  const items = d.parseSuite(SUITE).areas.flatMap((a) => a.items);
  assert.deepEqual(items[1].result, { kind: 'passed', date: 'Nov 9', device: 'iPhone 13 (iOS 18.1)' });
  assert.equal(items[2].done, false);
  assert.equal(items[2].result?.kind, 'failed');
  const noProof = SUITE.replace(' — passed Nov 9, iPhone 13 (iOS 18.1)', '');
  assert.match(d.suiteProblems(noProof, [])[0].message, /passed <Mon D>, <device>/);
  const tickedFailure = SUITE.replace('- [ ] **Do:** sit on a bus', '- [x] **Do:** sit on a bus');
  assert.match(d.suiteProblems(tickedFailure, [])[0].message, /failed.*stays open/);
});

test('DV6 each place the e2e stands in for a phone has an item naming the journey that fakes it', { todo: 'test first' }, () => {
  const d = device();
  const text = read(d.SUITE_FILE);
  const area = d.parseSuite(text).areas.find((a) => /stand-ins/i.test(a.heading));
  assert.ok(area, 'an area for the web\'s stand-ins');
  const lines = text.split('\n');
  const items = area!.items.map((i) => lines[i.line - 1]);
  for (const what of ['haptic', 'silent', 'motion', 'notification', 'background', 'screen reader', 'awake', 'camera', 'microphone', 'Open in Maps', 'touch']) {
    const item = items.find((l) => l.toLowerCase().includes(what.toLowerCase()));
    assert.ok(item, `an item for ${what}`);
    const journeys = [...item!.matchAll(/the `([a-z-]+)` journey/g)].map((m) => m[1]);
    assert.ok(journeys.length > 0, `${what}: names the journey faking it`);
    for (const j of journeys) assert.ok(existsSync(join(ROOT, 'scripts', 'e2e', 'journeys', `${j}.js`)), `${what}: ${j} is a journey`);
  }
});

test('DV7 check:device lists the open items by area, with their criteria and the counts; the procedures keep the suite', { todo: 'test first' }, () => {
  const f = join(tmp, 'suite.md');
  writeFileSync(f, SUITE);
  const run = (...args: string[]) => execFileSync('node', [join(ROOT, 'scripts', 'device.js'), ...args], { encoding: 'utf8', env: { ...process.env, DEVICE_SUITE: f } });
  const all = run();
  assert.match(all, /Sensors/);
  assert.match(all, /walk 50 m with the app open.*MO6, MO10/);
  assert.match(all, /drawn solid/, 'a failure is listed with what happened');
  assert.doesNotMatch(all, /stand still a minute/, 'a passed item is not listed');
  assert.match(all, /3 open, 1 passed/);
  const one = run('--area', 'replay');
  assert.match(one, /VoiceOver/);
  assert.doesNotMatch(one, /Sensors/);
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts['check:device'], 'node scripts/device.js');
  const slice = read('.claude/skills/slice/SKILL.md');
  for (const s of ['NATIVE_UNVERIFIED', 'device:', '**Do:**']) assert.ok(slice.includes(s), `/slice says ${s}`);
  assert.match(read('.claude/skills/fix/SKILL.md'), /NATIVE_UNVERIFIED/);
  assert.match(read('docs/TESTING.md'), /check:device/);
});
