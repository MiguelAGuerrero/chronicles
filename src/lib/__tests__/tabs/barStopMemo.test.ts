/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createMemoGate } from '../../memoGate';

// T35 (the owner's yes, Nov 18): the bar's Stop tells a memo recording from one still being saved, and a save still
// running after a second hold's wait no longer blocks it; while a save is under way the walk is never dropped as empty.

/** A save that settles only when told. */
function pending() {
  let settle!: (ok: boolean) => void;
  const p = new Promise<void>((res, rej) => (settle = (ok) => (ok ? res() : rej(new Error('disk full')))));
  return { p, settle };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test('tend tabs T35: memoGate tells a memo recording from one still being saved', () => {
  const gate = createMemoGate();
  const memo = {};
  assert.deepEqual(gate.stopUnder([]), { go: true, under: [] }, 'nothing: the stop goes');
  gate.recording(memo, true);
  assert.deepEqual(gate.stopUnder([]), { go: false, recording: true }, 'a memo recording: refused as recording');
  const save = pending();
  gate.track(save.p);
  const under = gate.stopUnder([]);
  assert.equal(under.go, false);
  assert.ok(!under.go && 'saving' in under && under.saving.length === 1, 'a memo being saved: refused as saving, not recording');
});

test('tend tabs T35: a second hold goes through a save it was told of; a save it was not told of is said first', async () => {
  const gate = createMemoGate();
  const first = pending();
  gate.track(first.p);
  const one = gate.stopUnder([]);
  assert.ok(!one.go && 'saving' in one);
  const warned = !one.go && 'saving' in one ? one.saving : [];
  // The second hold, its wait over, the save still running: the stop goes, through that save.
  assert.deepEqual(gate.stopUnder(warned), { go: true, under: warned });
  // Another save begun since the first hold is said before any stop goes through it.
  const second = pending();
  gate.track(second.p);
  const two = gate.stopUnder(warned);
  assert.ok(!two.go && 'saving' in two && two.saving.length === 2, 'a new save is said first');
  first.settle(true);
  second.settle(false);
  await tick();
  await tick();
  assert.deepEqual(gate.stopUnder(warned), { go: true, under: [] }, 'once both have ended, nothing holds the stop');
});

test('tend tabs T35: a save that never settles holds a first hold only', () => {
  const gate = createMemoGate();
  gate.track(new Promise(() => {}));
  const one = gate.stopUnder([]);
  assert.ok(!one.go);
  const warned = !one.go && 'saving' in one ? one.saving : [];
  assert.equal(gate.stopUnder(warned).go, true);
});

test('tend tabs T35: anything under way (a memo recording or saving, a photo being kept, a stop pinned) keeps a walk', async () => {
  const gate = createMemoGate();
  assert.equal(gate.underWay(), false);
  const memo = {};
  gate.recording(memo, true);
  assert.equal(gate.underWay(), true, 'a memo recording');
  gate.recording(memo, false);
  assert.equal(gate.underWay(), false);
  const save = pending();
  gate.track(save.p);
  assert.equal(gate.underWay(), true, 'a memo being saved');
  save.settle(true);
  await tick();
  await tick();
  assert.equal(gate.underWay(), false);
  const keep = pending();
  gate.keep(keep.p);
  assert.equal(gate.underWay(), true, 'a photo being kept');
  keep.settle(false);
  await tick();
  await tick();
  assert.equal(gate.underWay(), false);
  const release = gate.pin();
  assert.equal(gate.underWay(), true, 'a stop that went through a save holds the walk until its drop is decided');
  release();
  release();
  assert.equal(gate.underWay(), false);
});

const source = (f: string) => readFileSync(join(__dirname, '..', '..', '..', '..', f), 'utf8');

test('tend tabs T35: the app drops an empty walk only with nothing under way, and the bar says the owner\'s words', () => {
  assert.match(source('src/lib/emptyWalk/index.ts'), /underWay:\s*\(\)\s*=>\s*memoGate\.underWay\(\)\s*\|\|\s*unsaved\.retrying\(\)/, 'the drop asks memoGate and the holder\'s Retry');
  const bar = source('src/components/RecordingBar.tsx');
  assert.match(bar, /memoGate\.stopUnder\(/, 'the bar\'s Stop asks memoGate what it meets');
  assert.ok(bar.includes("'The voice memo is still being saved. Hold Stop again in a moment.'"), 'the entry\'s words');
  assert.ok(bar.includes("'A voice memo is recording. Save it first.'"), 'the recording words are kept');
  assert.match(bar, /memoGate\.pin\(\)/, 'a stop through a save pins the walk');
  assert.match(bar, /unsaved\.ended\(walk\.id, held\.map\(/, 'the bar lets go only what it warned of');
});

test('tend tabs audit 41: every memo save is tracked: each keepMemo call sits inside trackMemo', () => {
  const src = source('src/lib/useCaptures.ts');
  const lines = src.split('\n');
  const calls = lines.map((l, i) => ({ l, i })).filter(({ l }) => /\bkeepMemo\(/.test(l) && !/function keepMemo\(/.test(l));
  assert.ok(calls.length >= 2, 'the memo is kept by its Save and by Undo of its discard');
  for (const { i } of calls) {
    let d = i;
    while (d >= 0 && !/^ {2}const \w+ = /.test(lines[d])) d--;
    assert.ok(d >= 0, `keepMemo at line ${i + 1} sits in a declared action`);
    const head = lines.slice(d, d + 3).join('\n');
    assert.match(head, /=>\s*\n?\s*trackMemo\(/, `the action at line ${d + 1} (${lines[d].trim()}) is tracked, so a Stop waits for its save`);
  }
});
