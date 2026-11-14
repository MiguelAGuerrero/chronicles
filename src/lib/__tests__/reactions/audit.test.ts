import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fakePorts } from '../fakes';

// The reactions audit (specs/reactions, Audit, Nov 14): regression tests, each written before its fix.
const shell = () => import('../../reactions/shell' as string) as Promise<Record<string, any>>;
const SRC = join(__dirname, '..', '..', '..');
const src = (f: string) => readFileSync(join(SRC, f), 'utf8');
type Row = { moment_id: string; family: string; reaction: string };
const rows = async (p: ReturnType<typeof fakePorts>) => ((await (p.db as unknown as { listReactions: () => Promise<Row[]> }).listReactions()) ?? []).map((r) => [r.moment_id, r.family, r.reaction]).sort();

test('reactions audit 1: two chooses in flight agree with the store, and a double tap clears', async () => {
  const { createReactions } = await shell();
  const p = fakePorts();
  const r = createReactions(p);
  await r.load();
  await Promise.all([r.choose('m1', 'happy'), r.choose('m1', 'idea')]);
  assert.deepEqual(r.get('m1'), { feeling: 'happy', thought: 'idea' });
  assert.deepEqual(await rows(p), [['m1', 'feeling', 'happy'], ['m1', 'thought', 'idea']]);
  await Promise.all([r.choose('m1', 'idea'), r.choose('m1', 'idea')]);
  assert.deepEqual(r.get('m1'), { feeling: 'happy', thought: 'idea' }, 'two taps on the chosen one: cleared, then chosen again');
  await Promise.all([r.choose('m1', 'sad'), r.choose('m1', 'like'), r.choose('m1', 'idea')]);
  assert.deepEqual(r.get('m1'), { feeling: 'sad', taste: 'like' });
  assert.deepEqual(await rows(p), [['m1', 'feeling', 'sad'], ['m1', 'taste', 'like']]);
});

test('reactions audit 5: a lens and the list leave out the moments waiting in the Undo window', async () => {
  const { createReactions } = await shell();
  const p = fakePorts();
  const one = (id: string, t: number) => ({ id, walk_id: null, t, lat: null, lon: null, segment_id: null, pieces: [{ id, moment_id: id, t, kind: 'text' as const, file_path: null, body: id }] });
  await p.db.addMoment(one('a', 1));
  await p.db.addMoment(one('b', 2));
  const r = createReactions(p);
  await r.load();
  await r.choose('a', 'idea');
  await r.choose('b', 'idea');
  await r.choose('b', 'sad');
  const gone = new Set(['b']);
  assert.deepEqual((await r.lens('idea', gone)).map((m: { id: string }) => m.id), ['a']);
  const groups = await r.groups(gone);
  assert.equal(groups.flatMap((g: { rows: { id: string }[] }) => g.rows).some((x: { id: string }) => x.id === 'sad'), false);
});

test('reactions audit 6: a failed read counts as answered: nothing shown, the sheet never waits, and the next load tries again', async () => {
  const { createReactions } = await shell();
  const p = fakePorts();
  await (p.db as unknown as { setReaction: (r: unknown) => Promise<void> }).setReaction({ moment_id: 'm1', family: 'thought', reaction: 'idea', set_at: 1 });
  const r = createReactions(p);
  (p.db as unknown as { failNext: (m: string) => void }).failNext('listReactions');
  await r.load().catch(() => {});
  assert.equal(r.store.get().loaded, true, 'answered, so Memories opens');
  assert.deepEqual(r.get('m1'), {});
  await r.load();
  assert.deepEqual(r.get('m1'), { thought: 'idea' }, 'read again');
});

test('reactions audit 18: the replay\'s step-through draws and speaks no reaction', () => {
  assert.match(src('components/ceremony/StepThrough.tsx'), /<CaptureContent[\s\S]{0,400}reactions=\{false\}/);
  assert.match(src('components/CaptureView.tsx'), /reactions\?: boolean/);
});

test('reactions audit 20: a map with no capture pins never reads the reactions (Explore, the planner)', () => {
  for (const f of ['components/map/WalkMap.web.tsx', 'components/map/WalkMap.native.tsx']) assert.match(src(f), /useReactionSets\([^)]+\)/, f);
  assert.match(src('lib/reactions/useReactions.ts'), /export function useReactionSets\(enabled/);
});

test('reactions audit 10: a lens card links only to finished walks', () => {
  assert.match(src('components/chronicle/MemoriesScreen.tsx'), /<LensScreen[\s\S]{0,300}walks=\{closedWalks\(state\.walks\)\}/);
});

test('reactions audit 9: the lens\'s viewer offers Edit and reads again on close, as the journal\'s', () => {
  const m = src('components/chronicle/MemoriesScreen.tsx');
  const i = m.indexOf('key={`lens:');
  assert.ok(i > 0);
  const viewer = m.slice(i, m.indexOf('/>', i));
  assert.match(viewer, /onSaveEdit=/);
  assert.match(viewer, /resurface\.refresh\(\)/);
});

test('reactions audit 16: the planner\'s note page carries the Reaction tool, as the walk\'s does', () => {
  assert.match(src('components/planner/PlannerCapture.tsx'), /<NewNotePage[^>]*reactable/);
});

test('reactions audit 17: the slip\'s More offers no Reaction: the slip stays quiet', () => {
  assert.match(src('components/chronicle/MemoriesScreen.tsx'), /reaction=\{menuMoment && !menuFromSlip \?/);
});

test('reactions audit 2: a page that joins a moment shows and changes that moment\'s reactions, not an empty set', () => {
  const s = src('components/notePage/NewNotePage.tsx');
  assert.match(s, /useReactions\(stamp\.into\)/);
  assert.match(s, /stamp\.into \? reactions\.choose\(stamp\.into, id\)/);
});

test('reactions audit 4: Reactions and a lens are sub-screens: Contents leaves, and Threads or Hidden from the contents leave Reactions', () => {
  const s = src('components/chronicle/MemoriesScreen.tsx');
  assert.match(s, /const subScreen = ready && \([^)]*reactionsOpen/);
  assert.match(s, /onThreads=\{\(\) => \{\s*setMenuOpen\(false\);\s*setReactionsOpen\(false\);/);
  assert.match(s, /onHidden=\{\(\) => \{\s*setMenuOpen\(false\);\s*setReactionsOpen\(false\);/);
});

test('reactions audit 8: Close and Back put the viewer\'s reaction panel away first', () => {
  const s = src('components/CaptureView.tsx');
  assert.match(s, /onRequestClose=\{reactingTo \? \(\) => setReactingTo\(null\)/);
  const close = s.slice(s.indexOf('const close = () => {'), s.indexOf('};', s.indexOf('const close = () => {')));
  assert.match(close, /setReactingTo\(null\)/);
});
