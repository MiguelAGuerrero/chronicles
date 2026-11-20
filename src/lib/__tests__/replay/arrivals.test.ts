/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { arrival, replayArrivals, type ReplayBeat } from '../../replay';

// The owner's yes to T41 (Nov 19, "Yes, as recommended"): a capture of the walk that lands after its replay opened (a memo
// still being saved through the bar's Stop, decision 0227) is taken in by the open replay: placed on its map and played in
// its next Watch again, with no new words, no indicator, and the beats and their order unchanged.
test('tend replay T41: the open replay takes in a capture of its walk that lands after it opened, at the card, never mid-telling', () => {
  // On the card and the name step its walk is read again at once, and the capture pinned there; so is a change to one
  // (its place found, its thumbnail made).
  assert.deepEqual(arrival(false, { heard: 'card' }), { late: false, read: true, apply: false });
  assert.deepEqual(arrival(false, { heard: 'name' }), { late: false, read: true, apply: false });
  // While the walk is read or told, nothing changes under the telling: it waits for the card.
  for (const beat of ['reading', 'fog', 'path'] as const) assert.deepEqual(arrival(false, { heard: beat }), { late: true, read: false, apply: false }, beat);
  assert.deepEqual(arrival(true, { heard: 'path' }), { late: true, read: false, apply: false });
  // The card comes: what waited is read, once; with nothing waiting, nothing is read.
  assert.deepEqual(arrival(true, { to: 'card' }), { late: false, read: true, apply: false });
  assert.deepEqual(arrival(false, { to: 'card' }), { late: false, read: false, apply: false });
  // Watch again (the fog, then the path) keeps it waiting; the name step, as the card, reads it.
  assert.deepEqual(arrival(true, { to: 'fog' }), { late: true, read: false, apply: false });
  assert.deepEqual(arrival(true, { to: 'path' }), { late: true, read: false, apply: false });
  assert.deepEqual(arrival(true, { to: 'name' }), { late: false, read: true, apply: false });
});

/** A replay's ear over reads the test settles by hand, and what it was given to show. */
function ear() {
  const pending: ((d: string) => void)[] = [];
  const shown: string[] = [];
  const a = replayArrivals(() => new Promise<string | null>((r) => pending.push(r)), (d: string) => shown.push(d));
  const settle = async (d: string) => {
    pending.shift()!(d);
    await new Promise((r) => setImmediate(r));
  };
  return { a, pending, shown, settle, to: (...beats: ReplayBeat[]) => beats.forEach((b) => a.moved(b)) };
}

test('tend replay T41: news heard on the card is read and shown; heard while the walk is told, it is read when the card comes', async () => {
  const e = ear();
  e.to('fog', 'card');
  e.a.heard();
  assert.equal(e.pending.length, 1, 'heard on the card, the walk is read at once');
  await e.settle('with the memo');
  assert.deepEqual(e.shown, ['with the memo']);
  e.to('fog', 'path');
  e.a.heard();
  assert.equal(e.pending.length, 0, 'heard while the walk is told, nothing is read');
  e.to('card');
  assert.equal(e.pending.length, 1, 'the card comes: what waited is read');
  await e.settle('with the second');
  assert.deepEqual(e.shown, ['with the memo', 'with the second']);
});

test('tend replay audit 18: a read begun on the card that settles after Watch again waits for the next card', async () => {
  const e = ear();
  e.to('fog', 'path', 'card');
  e.a.heard();
  // Watch again before the read settles: it settles in the fog, and nothing changes under the telling.
  e.to('fog');
  await e.settle('read on the card');
  assert.deepEqual(e.shown, []);
  e.to('path');
  assert.equal(e.pending.length, 0, 'nothing is read while the walk is told');
  // The next card reads it again, and shows it.
  e.to('card');
  assert.equal(e.pending.length, 1);
  await e.settle('read at the next card');
  assert.deepEqual(e.shown, ['read at the next card']);
  // Only the latest read is shown, however they settle.
  e.a.heard();
  e.a.heard();
  const [first] = e.pending.splice(0, 1);
  await e.settle('the latest');
  first('an older one');
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(e.shown, ['read at the next card', 'the latest']);
});

test('tend replay T41: the replay screen hears its walk on the capture bus and tells its ear each beat it moves to', () => {
  const text = readFileSync(join(__dirname, '../../../app/replay/[id].tsx'), 'utf8');
  assert.match(text, /replayArrivals\(\(\) => loadReplay\(id\), setData\)/);
  assert.match(text, /captureBus\.subscribe\(id, self, arrive\.heard, arrive\.heard\)/);
  // Inside `go`, as the beat is set.
  const go = /const go = useCallback\(\(b: Beat\) => \{([\s\S]*?)\n {2}\}, \[/.exec(text)?.[1] ?? '';
  assert.match(go, /arrive\.moved\(b\)/);
});
