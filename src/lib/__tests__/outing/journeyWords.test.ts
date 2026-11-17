import assert from 'node:assert/strict';
import { test } from 'node:test';

// What the journey page says (OJ9, OJ21, OJ22, OJ25, OJ27).

const BANNED = /\b(minutes?|mins?|hours?|hrs?|ETA|pace|brisk|quick(er|est)?|fast(er|est)?|shorter|longer|more|most|best|top|popular|rated|few|many|several|lots|remaining|left|done|first|second|third|last)\b/i;

test('OJ9: a destination\'s distance is said as "away", in the units setting, with no time', async () => {
  const { awayLine } = await import('../../outing/journeyWords');
  assert.equal(awayLine(27_000, 'km'), '27 km away');
  assert.equal(awayLine(27_000, 'mi'), '17 mi away');
  assert.equal(awayLine(800, 'km'), '800 m away');
  assert.doesNotMatch(awayLine(27_000, 'km'), BANNED);
});

test('OJ21: a card says where, what it includes by the chips\' own words, and the distance on foot; no quantity word', async () => {
  const { cardSummary } = await import('../../outing/journeyWords');
  const s = cardSummary({ place: 'Kutztown', labels: ['Antiques', 'Books'], footM: 2100, loop: true }, 'km');
  assert.match(s, /Kutztown/);
  assert.match(s, /Antiques and Books/);
  assert.match(s, /2\.1 km on foot/);
  assert.doesNotMatch(s.replace(/2\.1 km/, ''), /\d/);
  assert.doesNotMatch(s, BANNED);
  assert.match(cardSummary({ place: null, labels: ['Green'], footM: 900, loop: false }, 'km'), /^Around here\./);
});

test('OJ22: nothing to propose is said in one plain line that names the place', async () => {
  const { nothingLine } = await import('../../outing/journeyWords');
  assert.equal(nothingLine('Kutztown'), 'Little of that in Kutztown.');
  assert.equal(nothingLine(null), 'Little of that close by.');
});

test('OJ25: an attraction not yet found is not named on its card', async () => {
  const { UNFOUND_LINE } = await import('../../outing/journeyWords');
  assert.match(UNFOUND_LINE, /when you reach it/);
});

test('OJ1, OJ2, OJ7, OJ27: the page\'s fixed words', async () => {
  const w = await import('../../outing/journeyWords');
  assert.equal(w.WHERE_LABEL, 'Where to?');
  assert.equal(w.CHIPS_LINE, "What you'd like on the way");
  assert.equal(w.NOWHERE_LABEL, 'Nowhere in particular');
  for (const s of [w.WHERE_LABEL, w.CHIPS_LINE, w.NOWHERE_LABEL, w.SEE_LABEL, w.BACK_LABEL, w.READS_LINE, w.LATER_LABEL, w.UNFOUND_LINE]) assert.doesNotMatch(s, BANNED, s);
});
