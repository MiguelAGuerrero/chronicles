import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, test } from 'node:test';
import { makeSqliteDb } from '../../db/sqliteStore';
import { AppError, browserOf, dayOf, failedLine, messageOf, retryLabel, shownOn, type FailedSave } from '../../diagnostics/core';
import { createDiagnostics } from '../../diagnostics/shell';
import { failedSaves, hideFailed, report, resetSink, retryFailed, saved, walkEnded } from '../../diagnostics/sink';
import { shareOutcome } from '../../shareLog/outcome';
import { stillRetry } from '../../stillRetry';
import { fakePorts } from '../fakes';

// The audit of errors handled by kind (specs/errors-handled/spec.md, "Audit"): one regression test per accepted
// finding, named `errors-handled audit N`; the journey holds 17 and 19.

beforeEach(() => resetSink());

const settle = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const SRC = join(__dirname, '..', '..', '..');
const src = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const list = () => failedSaves.get().list;
const fs_ = (over: Partial<FailedSave>): FailedSave => ({ key: 'k', what: 'your destination', why: null, screen: 'settings', seq: 1, again: false, ...over });

test('errors-handled audit 1: a store whose writes all fail takes one report and does a bounded number of writes', async () => {
  let opens = 0;
  const db = makeSqliteDb(() => {
    opens++;
    return new Promise((_, no) => setImmediate(() => no(new Error('disk I/O error'))));
  });
  const p = fakePorts();
  const d = createDiagnostics({ db, clock: p.clock, newId: p.newId });
  report('unexpected', 'walk · stop', new AppError('boom'));
  await settle(200);
  assert.ok(opens <= 5, `opens: ${opens}`);
  const kept = await d.entries();
  assert.ok(kept.some((k) => k.message === 'boom'), 'the report, kept in memory');
  assert.ok(!kept.some((k) => k.place === 'lib/db/sqliteStore · write'), 'the queue reported nothing of its own');
});

test('errors-handled audit 2: a later successful save of the same thing clears its failed save and Retry does not repeat the old value', async () => {
  createDiagnostics(fakePorts());
  const stored: string[] = [];
  let fail = true;
  const save = (v: string) => async () => {
    if (fail) throw new Error('x');
    stored.push(v);
  };
  assert.equal(await saved('units', 'your Distances choice', save('km'), { screen: 'settings' }), false);
  assert.equal(list().length, 1);
  fail = false;
  assert.equal(await saved('units', 'your Distances choice', save('mi'), { screen: 'settings' }), true);
  assert.deepEqual(list(), [], 'the later save cleared it');
  await retryFailed();
  assert.deepEqual(stored, ['mi'], 'Retry did not write km back');
});

test('errors-handled audit 3: retrying a still\'s start after its end leaves no open spell', () => {
  assert.deepEqual(stillRetry('w', 10, null), { walk_id: 'w', started_at: 10, ended_at: null }, 'still open: saved open');
  assert.deepEqual(stillRetry('w', 10, 30), { walk_id: 'w', started_at: 10, ended_at: 30 }, 'ended: saved closed, never open');
  const motion = src('lib/walkMotion.ts');
  assert.match(motion, /putStill\(stillRetry\(/, 'the walk retries a spell as it stands now');
  assert.ok(!/startStill\(walkId, at\)\)\)/.test(motion), 'no bare retry of the start');
});

test('errors-handled audit 4: two failed reactions on two moments are both retried, and a thing is named once', async () => {
  createDiagnostics(fakePorts());
  const done: string[] = [];
  let fail = true;
  const react = (m: string) => async () => {
    if (fail) throw new Error('x');
    done.push(m);
  };
  await saved('journal · onPick', 'a reaction', react('A'), { screen: 'chronicle', key: 'reaction:A' });
  await saved('journal · onPick', 'a reaction', react('B'), { screen: 'chronicle', key: 'reaction:B' });
  assert.equal(list().length, 2);
  assert.equal(failedLine(list()), 'A reaction wasn’t saved.', 'named once, not "a reaction and a reaction"');
  fail = false;
  await retryFailed();
  assert.deepEqual(done.sort(), ['A', 'B']);
  const three = [fs_({ key: 'a', what: 'a walk setting' }), fs_({ key: 'b', what: 'a walk setting' }), fs_({ key: 'c', what: 'your destination' })];
  assert.equal(failedLine(three), 'A walk setting and your destination weren’t saved.');
});

test('errors-handled audit 5: a double Retry runs each save once, and a failure during a retry survives its success', async () => {
  createDiagnostics(fakePorts());
  let runs = 0;
  let release!: () => void;
  let first = true;
  const save = () => {
    runs++;
    if (first) {
      first = false;
      return Promise.reject(new Error('x'));
    }
    return new Promise<void>((r) => (release = r));
  };
  await saved('nav', 'your destination', save, { screen: 'settings' });
  const a = retryFailed();
  const b = retryFailed();
  await settle();
  assert.equal(runs, 2, 'the second tap waits for the first');
  // A new failure of the same thing while the retry is out.
  await saved('nav', 'your destination', () => Promise.reject(new Error('y')), { screen: 'settings' });
  release();
  await Promise.all([a, b]);
  assert.equal(list().length, 1, 'the newer failure stays');
});

test('errors-handled audit 6: a message from outside the app is its error type; the app\'s own keep their words', () => {
  for (const raw of ['tile 9/268/179 not found', 'GET tiles.example.org/planet/14/1/2.pbf', 'File /var/mobile/My App/Documents/a.jpg', 'No street named Bahnhofstrasse', 'moment k3x9 not found']) {
    const m = messageOf(new Error(raw));
    assert.equal(m, 'Error', `${raw} → ${m}`);
  }
  const quota = Object.assign(new Error('The quota has been exceeded at Bahnhofstrasse.'), { name: 'QuotaExceededError' });
  assert.equal(messageOf(quota), 'QuotaExceededError (there’s no room left)');
  assert.equal(messageOf(Object.assign(new Error('near Zurich'), { code: 'ERR_SQLITE_FULL' })), 'Error ERR_SQLITE_FULL');
  assert.equal(messageOf('Hauptbahnhof'), 'a thrown string');
  assert.equal(messageOf(new AppError('No walk to snap')), 'No walk to snap');
});

test('errors-handled audit 7: each screen shows its own failures, the walk and ready screens the settings too', () => {
  const all = [fs_({ key: 's', screen: 'settings' }), fs_({ key: 'w', screen: 'walk', what: 'part of this walk' }), fs_({ key: 'c', screen: 'chronicle', what: 'a reaction' }), fs_({ key: 'e', screen: 'explore', what: 'a walk setting' }), fs_({ key: 'g', screen: 'gallery', what: 'how the gallery is shown' })];
  const keys = (host: Parameters<typeof shownOn>[1]) => shownOn(all, host, 0).map((f) => f.key);
  assert.deepEqual(keys('walk'), ['s', 'w']);
  assert.deepEqual(keys('ready'), ['s']);
  assert.deepEqual(keys('chronicle'), ['c']);
  assert.deepEqual(keys('explore'), ['e']);
  assert.deepEqual(keys('gallery'), ['g']);
  assert.match(src('app/(tabs)/explore.tsx'), /<SaveFailedLine host="explore"/);
  assert.match(src('components/gallery/MediaScreen.tsx'), /<SaveFailedLine host="gallery"/);
});

test('errors-handled audit 8: a thread\'s rename, a split and a find on the web are saves of the walker\'s', () => {
  assert.match(src('components/chronicle/MemoriesScreen.tsx'), /saved\([^)]*threads\.rename|saved\('[^']*', 'a thread’s name'/);
  assert.match(src('components/CaptureView.tsx'), /saved\('[^']*', '[^']*', \(\) => split\.split/);
  const web = src('lib/db/index.web.ts');
  const addFind = web.slice(web.indexOf('async addFind('), web.indexOf('async listFinds('));
  assert.ok(!/\.catch\(/.test(addFind), 'the web store hands a failed find to the caller');
});

test('errors-handled audit 9: a thousand repeats of one failure keep the first cause', async () => {
  const p = fakePorts({ now: 1_000 });
  const d = createDiagnostics(p);
  report('unexpected', 'boot', new AppError('first cause'));
  for (let i = 0; i < 1000; i++) report('cache', 'map · idle', new Error('again'));
  await settle(10);
  const e = await d.entries();
  assert.ok(e.some((x) => x.message === 'first cause'));
  assert.equal(e.filter((x) => x.place === 'map · idle').length, 1, 'a repeat within a minute is written once');
});

test('errors-handled audit 10: a failure after the settings open reaches the shared text', async () => {
  const p = fakePorts();
  const d = createDiagnostics(p);
  const before = d.changes.get();
  report('save', 'units', new AppError('late'));
  await settle(5);
  assert.ok(d.changes.get() > before, 'the open row is told to read the text again');
  assert.match(src('components/ShareDiagnostics.tsx'), /useStore\(diagnostics\.changes/);
});

test('errors-handled audit 11: no "phone" in a browser; the browser and its version; since no earlier than the log', async () => {
  assert.equal(failedLine([fs_({ why: 'there’s no room left' })]), 'Your destination wasn’t saved: there’s no room left. Free some room, then Retry.');
  assert.equal(browserOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'), 'Safari 18');
  assert.equal(browserOf('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'), 'Chrome 131');
  assert.equal(browserOf('Mozilla/5.0 (Windows NT 10.0; rv:133.0) Gecko/20100101 Firefox/133.0'), 'Firefox 133');
  assert.equal(browserOf('Mozilla/5.0 (X11) Edg/130.0.1 Chrome/130.0.0.0'), 'Edge 130');
  assert.equal(browserOf('curl'), 'a browser');
  const DAY = 24 * 3600 * 1000;
  const p = fakePorts({ now: 100 * DAY });
  const d = createDiagnostics(p);
  await settle(5);
  p.clock.set(102 * DAY);
  const text = await d.text({ app: 'Chronicles', version: '1', platform: 'web' }, (t) => dayOf(t, 0));
  assert.match(text, /Nothing has gone wrong since 1970-04-11\./, 'since the log began, not 30 days before');
});

test('errors-handled audit 12: a failed snap is recorded, and the Baker\'s failure is not a refusal', () => {
  const replay = src('app/replay/[id].tsx');
  assert.ok(!/snapWalk\([^;]*\.catch\(\(\) =>/.test(replay), 'the snap\'s own error is taken');
  assert.ok(!/caught\('refused', 'components\/Baker/.test(src('components/Baker.native.tsx')));
});

test('errors-handled audit 13: a cancelled share copies nothing, and a dismissed sheet is not "Shared"', () => {
  assert.equal(shareOutcome({ action: 'sharedAction' }, true), 'shared');
  assert.equal(shareOutcome({ action: undefined }, true), 'shared', 'a browser resolves with nothing when it shared');
  assert.equal(shareOutcome({ action: 'dismissedAction' }, true), 'cancelled');
  assert.equal(shareOutcome({ error: { name: 'AbortError' } }, true), 'cancelled');
  assert.equal(shareOutcome({ error: { name: 'TypeError' } }, true), 'copy');
  assert.equal(shareOutcome({ error: { name: 'TypeError' } }, false), 'failed');
});

test('errors-handled audit 14: a shared line carries its day, never its time', async () => {
  assert.equal(dayOf(Date.UTC(2026, 10, 12, 14, 32), 0), '2026-11-12');
  assert.equal(dayOf(Date.UTC(2026, 10, 12, 2, 0), 300), '2026-11-11', 'the local day, five hours behind');
  const p = fakePorts({ now: Date.UTC(2026, 10, 12, 14, 32) });
  const d = createDiagnostics(p);
  report('save', 'lib/walkMotion · begin', new AppError('x'));
  await settle(5);
  const text = await d.text({ app: 'Chronicles', version: '1', platform: 'web' }, (t) => dayOf(t, 0));
  assert.ok(!/\d{1,2}:\d{2}/.test(text), text);
  assert.ok(!/localWhen|timeStyle/.test(src('components/ShareDiagnostics.tsx') + src('lib/diagnostics/index.ts')));
});

test('errors-handled audit 15: the walk\'s line hides until something new fails, and shows again when the walk ends', async () => {
  createDiagnostics(fakePorts());
  await saved('still', 'part of this walk', () => Promise.reject(new Error('x')), { screen: 'walk', key: 's1' });
  const shown = () => shownOn(list(), 'walk', failedSaves.get().hiddenAt);
  assert.equal(shown().length, 1);
  hideFailed();
  assert.equal(shown().length, 0, 'hidden');
  assert.equal(shownOn(list(), 'ready', failedSaves.get().hiddenAt).length, 0, 'not the ready screen\'s');
  await saved('still', 'part of this walk', () => Promise.reject(new Error('x')), { screen: 'walk', key: 's2' });
  assert.equal(shown().length, 2, 'a new failure shows them all');
  hideFailed();
  walkEnded();
  assert.equal(shown().length, 2, 'the walk\'s end says it again');
});

test('errors-handled audit 16: "then Retry", and a retry that fails again says still', async () => {
  createDiagnostics(fakePorts());
  const full = () => Promise.reject(Object.assign(new Error('q'), { name: 'QuotaExceededError' }));
  await saved('units', 'your Distances choice', full, { screen: 'settings' });
  assert.equal(failedLine(list()), 'Your Distances choice wasn’t saved: there’s no room left. Free some room, then Retry.');
  await retryFailed();
  assert.equal(failedLine(list()), 'Your Distances choice still wasn’t saved: there’s no room left. Free some room, then Retry.');
});

test('errors-handled audit 18: Help and Distances are headed as the sheet\'s other sections', () => {
  const settings = src('components/StartSettings.tsx');
  assert.match(settings, /style=\{styles\.section\} accessibilityRole="header">Distances/);
  assert.match(src('components/ShareDiagnostics.tsx'), /fontSize: 15, fontWeight: '700'/);
});

test('errors-handled audit 19: "Copied" says what to do next', () => {
  assert.match(src('components/ShareDiagnostics.tsx'), /copied: 'Copied: paste it into a message or an email\.'/);
});

test('errors-handled audit 20: Retry is named with what it saves', () => {
  assert.equal(retryLabel([fs_({ what: 'your Distances choice' })]), 'Retry saving your Distances choice');
  assert.equal(retryLabel([fs_({ key: 'a', what: 'a reaction' }), fs_({ key: 'b', what: 'part of this walk' })]), 'Retry saving a reaction and part of this walk');
  assert.match(src('components/SpaceLine.tsx'), /accessibilityLabel=\{retryLabel\(/);
});
