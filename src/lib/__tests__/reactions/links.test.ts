import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fakePorts } from '../fakes';

// Reaction links (specs/reaction-links, RL1-RL12, decision 0177). Modules reached by name: test first.
const core = () => import('../../reactions/core' as string) as Promise<Record<string, any>>;
const shell = () => import('../../reactions/shell' as string) as Promise<Record<string, any>>;
const pins = () => import('../../pins' as string) as Promise<Record<string, any>>;
const SRC = join(__dirname, '..', '..', '..');
const src = (f: string) => readFileSync(join(SRC, f), 'utf8');
type Row = { moment_id: string; family: string; reaction: string };
const rows = async (p: ReturnType<typeof fakePorts>) => ((await (p.db as unknown as { listReactions: () => Promise<Row[]> }).listReactions()) ?? []).map((r) => [r.moment_id, r.family, r.reaction]).sort();

test('RL6, RL7: the sign and the page\'s tool say everything chosen, in the families\' order, or none', async () => {
  const { signLabel } = await core();
  assert.equal(signLabel({}), 'Reaction, none');
  assert.equal(signLabel({ thought: 'idea', feeling: 'happy' }), 'Reaction, Happy, Idea');
});

test('RL6: the sign is drawn as the face with a plus at one size, whatever is chosen', () => {
  const s = src('components/reactions/ReactionSign.tsx');
  assert.doesNotMatch(s, /signOf\(/, 'the sign never takes a reaction\'s glyph');
  assert.match(s, /name="happy-outline"/);
  assert.doesNotMatch(s, /first \? null :/, 'the plus is always drawn');
});

test('RL7: the page\'s Reaction tool is the face with a plus, whatever is chosen', () => {
  const s = src('components/notePage/NotePage.tsx');
  const i = s.indexOf('testID="note-reaction-tool"');
  assert.ok(i > 0);
  const tool = s.slice(i, s.indexOf('</Tool>', i));
  assert.doesNotMatch(tool, /signOf/);
  assert.match(tool, /happy-outline/);
});

test('RL9: a choice that cannot be kept leaves the set as it was and marks it not kept, until the next choice or the panel closes', async () => {
  const { createReactions } = await shell();
  const p = fakePorts();
  const r = createReactions(p);
  await r.load();
  (p.db as unknown as { failNext: (m: string) => void }).failNext('setReactions');
  await assert.rejects(r.choose('m1', 'idea'));
  assert.deepEqual(r.get('m1'), {});
  assert.equal(r.store.get().notKept, 'm1');
  await r.choose('m1', 'happy');
  assert.equal(r.store.get().notKept, null, 'the next choice clears it');
  (p.db as unknown as { failNext: (m: string) => void }).failNext('setReactions');
  await assert.rejects(r.choose('m2', 'idea'));
  r.closed('m2');
  assert.equal(r.store.get().notKept, null, 'closing the panel clears it');
});

test('RL10: a moment\'s reactions written together are kept together or not at all', async () => {
  const { createReactions } = await shell();
  const p = fakePorts();
  const r = createReactions(p);
  await r.load();
  r.hold('page', 'idea');
  r.hold('page', 'sad');
  (p.db as unknown as { failNext: (m: string) => void }).failNext('setReactions');
  await assert.rejects(r.keep('page', 'm1'));
  assert.deepEqual(await rows(p), [], 'none of them');
});

test('RL11: reactions held by a new page survive the page closing while its first save is on its way', async () => {
  const { createReactions } = await shell();
  const p = fakePorts();
  const r = createReactions(p);
  await r.load();
  r.hold('page', 'idea');
  r.saving('page');
  r.drop('page');
  await r.keep('page', 'm1');
  assert.deepEqual(await rows(p), [['m1', 'thought', 'idea']]);
  r.hold('empty', 'like');
  r.drop('empty');
  await r.keep('empty', 'm2');
  assert.deepEqual((await rows(p)).filter((x) => x[0] === 'm2'), [], 'a page left without words still keeps nothing');
});

test('RL12: a video\'s pin wears its reactions in an L, each on the head and clear of the play mark', async () => {
  const { reactionSpots } = await pins();
  const SIZE = 15;
  const HEAD = [0, 0, 36, 36];
  const PLAY = [20, 20, 39, 39];
  const meets = (a: number[], b: number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  for (const n of [1, 2, 3]) {
    const spots = reactionSpots(n, true) as { left: number; top: number }[];
    assert.equal(spots.length, n);
    for (const s of spots) {
      const box = [s.left, s.top, s.left + SIZE, s.top + SIZE];
      assert.ok(meets(box, HEAD), `on the head: ${JSON.stringify(s)}`);
      assert.ok(!meets(box, PLAY), `clear of the play mark: ${JSON.stringify(s)}`);
    }
  }
  const three = reactionSpots(3, true) as { left: number; top: number }[];
  assert.ok(three[2].top < three[0].top, 'the third sits above the row');
  assert.deepEqual(reactionSpots(3, false).map((s: { top: number }) => s.top), [22, 22, 22], 'any other pin keeps its row');
});
