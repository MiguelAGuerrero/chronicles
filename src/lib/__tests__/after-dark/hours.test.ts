/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// After dark (DK7), written from specs/after-dark/spec.md before the code.

type Open = 'open' | 'closed' | 'unknown';
interface Api {
  parseHours(text: string): unknown | null;
  /** weekday 0 = Sunday ... 6 = Saturday; minute of the local day. */
  openAt(rules: unknown | null, weekday: number, minute: number): Open;
}
const api = async () => (await import('../../dark/hours' as string)) as Api;

const SU = 0, MO = 1, TU = 2, WE = 3, FR = 5, SA = 6;
const m = (hh: number, mm = 0) => hh * 60 + mm;

test('DK7: the common forms read; past midnight; later rules win; month, week, date, PH, sunset times and comments are unknown', async () => {
  const { parseHours, openAt } = await api();
  const at = (text: string, d: number, min: number) => openAt(parseHours(text), d, min);

  // Days and day ranges, several time ranges.
  assert.equal(at('Mo-Fr 09:00-18:00', MO, m(10)), 'open');
  assert.equal(at('Mo-Fr 09:00-18:00', MO, m(18, 30)), 'closed');
  assert.equal(at('Mo-Fr 09:00-18:00', SA, m(10)), 'closed');
  assert.equal(at('Sa,Su 10:00-14:00', SU, m(11)), 'open');
  assert.equal(at('Mo,We 08:00-12:00', TU, m(9)), 'closed');
  assert.equal(at('Mo-Fr 09:00-12:00,13:00-18:00', WE, m(12, 30)), 'closed');
  assert.equal(at('Mo-Fr 09:00-12:00,13:00-18:00', WE, m(13, 30)), 'open');
  assert.equal(at('Mo-Fr 09:00 - 18:00', MO, m(9, 30)), 'open', 'spaces around the dash');
  // Times with no days: every day.
  assert.equal(at('11:00-23:00', SU, m(22)), 'open');
  // Past midnight: open into the next day.
  assert.equal(at('Fr 18:00-02:00', FR, m(23)), 'open');
  assert.equal(at('Fr 18:00-02:00', SA, m(1)), 'open');
  assert.equal(at('Fr 18:00-02:00', SA, m(3)), 'closed');
  assert.equal(at('Mo-Su 17:00-24:00', MO, m(23, 59)), 'open');
  // 24/7, off and closed.
  assert.equal(at('24/7', WE, m(3)), 'open');
  assert.equal(at('Mo-Sa 09:00-21:00; Su off', SU, m(12)), 'closed');
  assert.equal(at('Mo-Sa 09:00-21:00; Su closed', SU, m(12)), 'closed');
  // Later rules win for their days.
  assert.equal(at('Mo-Su 09:00-17:00; Sa 10:00-22:00', SA, m(20)), 'open');
  assert.equal(at('Mo-Su 09:00-17:00; Sa 10:00-22:00', SA, m(9, 30)), 'closed');
  assert.equal(at('Mo-Su 09:00-17:00; Sa 10:00-22:00', FR, m(20)), 'closed');

  // Anything outside the common forms makes the whole value unknown, never open and never closed.
  for (const text of [
    'Jan-Mar Mo-Fr 09:00-17:00',
    'week 1-26 Mo-Fr 09:00-17:00',
    '2026 Dec 25 off',
    'Mo-Fr 09:00-17:00; PH off',
    'Mo-Su sunset-sunrise',
    'Mo-Fr 09:00-17:00 "by appointment"',
    'Mo-Fr 18:00+',
    'Mo-Fr 09:00-17:00 || "call ahead"',
    'by appointment',
    '',
  ]) {
    assert.equal(at(text, MO, m(10)), 'unknown', text);
    assert.equal(at(text, MO, m(3)), 'unknown', text);
  }
  assert.equal(openAt(null, MO, m(10)), 'unknown', 'no hours at all');
});
