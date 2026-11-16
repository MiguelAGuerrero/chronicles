import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppError, failedLine, kept, KEEP, logText, messageOf, scrub, whyOf, withFailed, type Diagnostic } from '../../diagnostics/core';

// Errors handled by kind: the log's decisions (specs/errors-handled/spec.md, EH3, EH3a, EH6, EH7, EH10).

const DAY = 24 * 3600 * 1000;
const entry = (t: number, over: Partial<Diagnostic> = {}): Diagnostic => ({ id: `d${t}`, t, kind: 'cache', place: 'tiles · read', message: 'failed', ...over });

test('EH3a a message with a position, a tile, a URL, a path, an id and a place name is shared with none of them', () => {
  const raw =
    'Could not read https://tiles.example.org/v1/14/8580/5735.pbf?key=abc for 40.6084, -75.3902 at /var/mobile/Containers/Data/Application/0F2C/Documents/media/IMG_0042.jpg: ' +
    'No moment 3f1c2a9e-77b0-4b2e-9a10-0c5d2f1e8a44 near "Hamilton Street, Allentown" (piece p_8f3a2c19d0e4)';
  const s = scrub(raw);
  for (const bad of ['40.6084', '-75.3902', '8580', '5735', 'key=abc', '/v1/', '/var/mobile', 'IMG_0042', '3f1c2a9e', 'Hamilton', 'Allentown', 'p_8f3a2c19d0e4']) {
    assert.ok(!s.includes(bad), `"${bad}" is gone from: ${s}`);
  }
  assert.match(s, /tiles\.example\.org/, 'the host stays: it says which service failed');
  assert.match(s, /^Could not read/, 'the words around stay');
  assert.equal(messageOf(new AppError(raw)), s, 'the app\'s own error is its scrubbed message');
  assert.equal(messageOf(new Error(raw)), 'Error', 'one from outside the app is its type (errors-handled audit 6)');
  assert.ok(!messageOf(new AppError('one\ntwo')).includes('\n'), 'one line');
});

test('EH3 the shared text: header, newest first, one line each, the kinds in words; empty says so', () => {
  const header = { app: 'Chronicles', version: '1.0.0', platform: 'ios 18.1', day: 'Nov 14, 2026', since: null };
  const when = (t: number) => `T${t}`;
  const text = logText([entry(1, { kind: 'save', place: 'nav · saveNav', message: 'disk full' }), entry(3, { kind: 'refused', place: 'audioMode · set' }), entry(2, { kind: 'fallback', place: 'summary · loadReplay', message: '[] in place of the walk’s still spells: x' })], header, when);
  const lines = text.split('\n');
  assert.match(lines[0], /Chronicles 1\.0\.0/);
  assert.match(text, /ios 18\.1/);
  assert.match(text, /Nov 14, 2026/);
  const body = lines.filter((l) => /^T\d/.test(l));
  assert.deepEqual(body.map((l) => l.slice(0, 2)), ['T3', 'T2', 'T1'], 'newest first');
  assert.match(body[0], /Refused/);
  assert.match(body[1], /Read in place of|in place of/);
  assert.match(body[2], /A save failed.*nav · saveNav.*disk full/);
  const empty = logText([], { ...header, since: 'Nov 1, 2026' }, when);
  assert.match(empty, /Nothing has gone wrong since Nov 1, 2026/);
});

test('EH6 the newest 500, none older than 30 days', () => {
  const now = 100 * DAY;
  assert.equal(KEEP.entries, 500);
  assert.equal(KEEP.days, 30);
  const many = Array.from({ length: 520 }, (_, i) => entry(now - i * 1000));
  const k = kept(many, now);
  assert.equal(k.length, 500);
  assert.equal(k[0].t, now, 'newest first');
  const old = kept([entry(now - 31 * DAY), entry(now - 29 * DAY)], now);
  assert.deepEqual(old.map((e) => e.t), [now - 29 * DAY]);
});

test('EH7 why in words when known, one line in a clause for several, never a number; the same thing replaces', () => {
  const full = Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });
  assert.equal(whyOf(full), 'there’s no room left');
  assert.equal(whyOf(new Error('database or disk is full')), 'there’s no room left');
  assert.equal(whyOf(new Error('SQLITE_IOERR: something odd')), null, 'unknown: no reason rather than the platform\'s words');
  assert.equal(failedLine([]), null);
  const f = (key: string, what: string, why: string | null) => ({ key, what, why, screen: 'settings' as const, seq: 1, again: false });
  let list = withFailed([], f('nav', 'your destination', 'there’s no room left'));
  assert.equal(failedLine(list), 'Your destination wasn’t saved: there’s no room left. Free some room, then Retry.', 'errors-handled ui 3: what to do, where it is known');
  list = withFailed(list, f('units', 'a setting', null));
  list = withFailed(list, f('nav', 'your destination', null));
  assert.equal(list.length, 2, 'the same thing replaces');
  assert.equal(failedLine(list), 'Your destination and a setting weren’t saved.');
  const three = withFailed(list, f('still', 'part of this walk', null));
  assert.equal(failedLine(three), 'Your destination, a setting and part of this walk weren’t saved.');
  assert.ok(!/[0-9]/.test(failedLine(three)!), 'no digit');
});

test('EH10 a fallback says what it stood in for, never the value', () => {
  const s = scrub('[] in place of the walk’s still spells: [{"t":1731600000000,"lat":40.6}]');
  assert.ok(!s.includes('40.6') && !s.includes('1731600000000'), s);
});
