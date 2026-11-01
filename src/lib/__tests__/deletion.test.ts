/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  countsOf, filesOf, isMedia, isNamedStreet, mediaRemoveText, momentDeleteText, recountNewStreets, sizeText, summaryLess, toastText, walkDeleteText,
} from '../deletion/core';
import { createPending, type PendingJob } from '../deletion/pending';
import type { Capture, WalkSummary } from '../types';

// A clock the tests drive by hand.
function fakeTimers() {
  let now = 0;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    setTimer: (fn: () => void, ms: number) => {
      const id = ++seq;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimer: (id: unknown) => {
      timers.delete(id as number);
    },
    advance(ms: number) {
      now += ms;
      for (const [id, t] of [...timers]) {
        if (t.at <= now) {
          timers.delete(id);
          t.fn();
        }
      }
    },
  };
}

const settle = () => new Promise((r) => setImmediate(r));

function job(ids: string[], log: string[], fail = false): PendingJob {
  return {
    kind: 'walk',
    ids,
    run: async () => {
      log.push(`run:${ids.join(',')}`);
      if (fail) throw new Error('disk');
    },
  };
}

test('D5: a delete hides at once and reaches storage only after 5 s; what went stays hidden', async () => {
  const t = fakeTimers();
  const p = createPending(t);
  const log: string[] = [];
  p.schedule(job(['w1', 'c1'], log));
  assert.ok(p.hidden().has('w1') && p.hidden().has('c1'), 'hidden at once');
  assert.equal(p.state().pending?.kind, 'walk', 'the pill shows');
  t.advance(4999);
  assert.deepEqual(log, [], 'nothing stored before 5 s');
  t.advance(1);
  await settle();
  assert.deepEqual(log, ['run:w1,c1']);
  assert.equal(p.state().pending, null, 'the pill goes');
  assert.ok(p.hidden().has('w1'), 'still hidden after it went, so stale lists never show it');
});

test('D5: Undo brings it back as it was, and nothing is stored', async () => {
  const t = fakeTimers();
  const p = createPending(t);
  const log: string[] = [];
  p.schedule(job(['w1'], log));
  p.undo();
  assert.equal(p.hidden().has('w1'), false);
  assert.equal(p.state().pending, null);
  t.advance(10_000);
  await settle();
  assert.deepEqual(log, []);
});

test('D5: a second delete stores the first at once and takes the pill', async () => {
  const t = fakeTimers();
  const p = createPending(t);
  const log: string[] = [];
  p.schedule(job(['a'], log));
  p.schedule({ ...job(['b'], log), kind: 'moment' });
  await settle();
  assert.deepEqual(log, ['run:a']);
  assert.equal(p.state().pending?.kind, 'moment');
  p.undo();
  assert.ok(p.hidden().has('a'), 'Undo reaches only the newest');
  assert.equal(p.hidden().has('b'), false);
});

test('D5: going to the background stores what waits', async () => {
  const t = fakeTimers();
  const p = createPending(t);
  const log: string[] = [];
  p.schedule(job(['a'], log));
  await p.flush();
  assert.deepEqual(log, ['run:a']);
  t.advance(10_000);
  await settle();
  assert.deepEqual(log, ['run:a'], 'never twice');
});

test('D6: a failed delete comes back and says so; Undo after the fact does nothing', async () => {
  const t = fakeTimers();
  const p = createPending(t);
  const log: string[] = [];
  const seen: (string | null)[] = [];
  p.subscribe(() => seen.push(p.state().error));
  p.schedule(job(['a'], log, true));
  t.advance(5000);
  await settle();
  assert.equal(p.hidden().has('a'), false, 'it comes back');
  assert.equal(p.state().error, "Couldn't delete. Try again.");
  p.undo();
  assert.equal(p.hidden().has('a'), false);
  t.advance(4000);
  assert.equal(p.state().error, null, 'the error clears by itself');
  assert.ok(seen.length >= 3, 'subscribers hear each change');
});

test('D5: listeners hear when a delete reached storage, so screens re-read', async () => {
  const t = fakeTimers();
  const p = createPending(t);
  const done: string[] = [];
  p.onCommitted((j) => done.push(j.kind));
  p.schedule(job(['a'], []));
  t.advance(5000);
  await settle();
  assert.deepEqual(done, ['walk']);
});

// D7: walks A, B, C in time order. A first walked x; B walked x and y; C walked y and z.
test('D7: deleting a walk recounts later walks\' new streets without it', () => {
  const walks = [
    { id: 'A', started_at: 1 },
    { id: 'B', started_at: 2 },
    { id: 'C', started_at: 3 },
  ];
  const visited = [
    { walk_id: 'A', street_key: 'name:x' },
    { walk_id: 'B', street_key: 'name:x' },
    { walk_id: 'B', street_key: 'name:y' },
    { walk_id: 'C', street_key: 'name:y' },
    { walk_id: 'C', street_key: 'name:z' },
    { walk_id: 'C', street_key: 'name:z' }, // two pieces of one street count once
  ];
  const stored = new Map([['B', 1], ['C', 1]]);
  // A is gone: its rows are out of the lists.
  const changed = recountNewStreets(walks.slice(1), visited.filter((v) => v.walk_id !== 'A'), stored);
  assert.deepEqual(changed, [{ walk_id: 'B', new_streets: 2 }], 'x is new on B now; C is unchanged');
});

// Audit 1 (Nov 1): unnamed paths clear fog but are never streets (finish.ts counts by name); the
// recount once counted their segment ids and raised other walks' "new streets".
test('audit 1: the recount counts named streets only, as a snap does', () => {
  const walks = [{ id: 'B', started_at: 2 }];
  const visited = [
    { walk_id: 'B', street_key: 'name:Hope St' },
    { walk_id: 'B', street_key: 'footway|1,2|3,4|5,6' },
  ];
  assert.deepEqual(recountNewStreets(walks, visited, new Map([['B', 1]])), [], 'one named street, as stored');
  assert.equal(isNamedStreet('name:Hope St'), true);
  assert.equal(isNamedStreet('footway|1,2|3,4|5,6'), false);
});

test('D7: walks with no summary are left alone', () => {
  const changed = recountNewStreets([{ id: 'B', started_at: 2 }], [{ walk_id: 'B', street_key: 'name:x' }], new Map());
  assert.deepEqual(changed, []);
});

const summary: WalkSummary = {
  walk_id: 'w', build: 'b', distance_m: 1200, duration_ms: 600_000, new_streets: 3, streets_walked: 5,
  photos: 3, videos: 1, voices: 2, notes: 1, streets_read: true,
};
const cap = (id: string, kind: Capture['kind'], extra: Partial<Capture> = {}): Capture => ({
  id, walk_id: 'w', t: 0, lat: null, lon: null, kind, file_path: kind === 'text' ? null : `walks/w/${id}.x`, body: null, segment_id: null, ...extra,
});

test('D9: removing moments takes them off the walk\'s counts, never below zero', () => {
  const s = summaryLess(summary, [cap('a', 'photo'), cap('b', 'voice'), cap('c', 'video'), cap('d', 'video')]);
  assert.deepEqual([s.photos, s.voices, s.videos, s.notes], [2, 1, 0, 1]);
  assert.equal(s.distance_m, 1200, 'the walk itself is untouched');
  const old = summaryLess({ ...summary, videos: undefined }, [cap('c', 'video')]);
  assert.equal(old.videos, 0);
});

// Audit 3: a delete that overlaps a snap must not leave a count off by one, so counts come from the
// rows left, never by subtraction.
test('audit 3: counts come from the capture rows', () => {
  assert.deepEqual(countsOf([cap('a', 'photo'), cap('b', 'photo'), cap('c', 'voice'), cap('d', 'text')]), { photos: 2, videos: 0, voices: 1, notes: 1 });
  assert.deepEqual(countsOf([]), { photos: 0, videos: 0, voices: 0, notes: 0 });
});

test('D2: only photos, videos and memos are media', () => {
  assert.deepEqual(['photo', 'video', 'voice', 'text'].map((k) => isMedia({ kind: k as Capture['kind'] })), [true, true, true, false]);
});

test('D3: a moment\'s files are its media and its thumbnail; markers and inline data are not files', () => {
  assert.deepEqual(
    filesOf([
      cap('a', 'photo', { thumb_path: 'walks/w/a.thumb.jpg' }),
      cap('b', 'photo', { thumb_path: 'none' }),
      cap('c', 'photo', { file_path: 'data:image/jpeg;base64,xx' }),
      cap('d', 'text'),
    ]),
    ['walks/w/a.x', 'walks/w/a.thumb.jpg', 'walks/w/b.x'],
  );
});

test('D11: the size shows from 0.1 MB, rounded as people say it', () => {
  assert.equal(sizeText(0), '');
  assert.equal(sizeText(99_999), '');
  assert.equal(sizeText(100_000), 'Frees about 0.1 MB.');
  assert.equal(sizeText(2_440_000), 'Frees about 2.4 MB.');
  assert.equal(sizeText(34_400_000), 'Frees about 34 MB.');
  assert.equal(sizeText(2_400_000_000), 'Frees about 2.4 GB.');
});

test('D4: the confirm says what goes', () => {
  assert.deepEqual(walkDeleteText({ moments: 12, streets: 9, bytes: 34_000_000 }), {
    title: 'Delete this walk?',
    body: 'Its trace, 12 moments and 9 streets walked go. Frees about 34 MB.',
    confirm: 'Delete walk',
  });
  assert.equal(walkDeleteText({ moments: 0, streets: 0, bytes: 0 }).body, 'Its trace goes.');
  assert.equal(walkDeleteText({ moments: 1, streets: 1, bytes: 0 }).body, 'Its trace, 1 moment and 1 street walked go.');
  assert.deepEqual(mediaRemoveText({ photos: 3, videos: 0, voices: 1, bytes: 5_000_000 }), {
    title: 'Remove photos, videos and memos?',
    body: '3 photos and 1 voice memo go. The walk, its notes and its streets stay. Frees about 5 MB.',
    confirm: 'Remove',
  });
  assert.deepEqual(momentDeleteText('voice', 0), { title: 'Delete this voice memo?', body: 'You can undo it for 5 seconds.', confirm: 'Delete' });
  assert.equal(momentDeleteText('photo', 2_000_000).body, 'You can undo it for 5 seconds. Frees about 2 MB.');
});

test('D5: the pill names what went', () => {
  assert.equal(toastText('walk'), 'Walk deleted');
  assert.equal(toastText('media'), 'Photos, videos and memos removed');
  assert.equal(toastText('moment'), 'Moment deleted');
  // UI review: the pill names the kind the confirm named.
  assert.equal(toastText('moment', 'photo'), 'Photo deleted');
  assert.equal(toastText('moment', 'voice'), 'Voice memo deleted');
});

// Audit 10: delete A fails while delete B waits; A's items come back, and the failure must still be
// told, beside B's Undo.
test('audit 10: a failure of an earlier delete is kept beside the newer one\'s Undo', async () => {
  const t = fakeTimers();
  const p = createPending(t);
  const log: string[] = [];
  p.schedule(job(['a'], log, true));
  p.schedule({ ...job(['b'], log), kind: 'moment', what: 'photo' });
  await settle();
  assert.equal(p.hidden().has('a'), false, 'A came back');
  assert.deepEqual(p.state().pending, { kind: 'moment', what: 'photo' }, 'B still waits, naming its kind');
  assert.equal(p.state().error, "Couldn't delete. Try again.", 'and A\'s failure is still there to show');
});
