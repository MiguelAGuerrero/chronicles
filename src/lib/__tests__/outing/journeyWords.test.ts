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

test('OJ21: a card says the places in order, what it includes by the chips\' own words, and the distance on foot; no quantity word', async () => {
  const { cardSummary } = await import('../../outing/journeyWords');
  const s = cardSummary({ places: ['Emmaus', 'Kutztown'], labels: ['Antiques', 'Books'], footM: 2100 }, 'km');
  assert.match(s, /^Emmaus and Kutztown\. Antiques and Books\. 2\.1 km on foot\.$/);
  assert.doesNotMatch(s, BANNED);
  assert.match(cardSummary({ places: [null], labels: ['Green'], footM: 900 }, 'km'), /^Around here\./);
  assert.match(cardSummary({ places: ['Emmaus'], labels: ['History'], footM: 0 }, 'km'), /^Emmaus\. History\.$/, 'a journey of single stops says no distance on foot');
});

test('OJ23, OJ24, OJ41: a town\'s line, a chapter\'s line and the reach, in words', async () => {
  const w = await import('../../outing/journeyWords');
  assert.equal(w.townLine(['Antiques', 'History']), 'Antiques and history here.');
  assert.equal(w.chapterLine({ stops: 1, lengthM: 0, loop: false }, 'km'), 'One stop.');
  assert.match(w.chapterLine({ stops: 3, lengthM: 1400, loop: true }, 'km'), /^A walk of 1\.4 km, back where it starts\.$/);
  assert.match(w.chapterLine({ stops: 2, lengthM: 900, loop: false }, 'km'), /one way: the way back is yours\.$/);
  assert.equal(w.reachLabel(0, 'km'), 'Close by');
  assert.equal(w.reachLabel(15000, 'km'), '15 km');
  for (const s of [w.townLine(['Antiques']), w.ANOTHER_LABEL, w.NO_OTHER_LINE, w.FURTHER_LABEL, w.nextMoveLine(true), w.REACH_LINE]) assert.doesNotMatch(s, BANNED, s);
});

test('OJ22: nothing to propose is said in one plain line that names the place', async () => {
  const { nothingLine } = await import('../../outing/journeyWords');
  assert.equal(nothingLine('Kutztown'), 'Little of that toward Kutztown.');
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

test('outing-journey ui 1, ui 3: what a wider reach looked at is said by name, and a change can be taken back in a word', async () => {
  const w = await import('../../outing/journeyWords');
  assert.equal(w.lookedLine(['Cranston', 'Warwick']), 'Looked in Cranston and Warwick.');
  assert.equal(w.lookedLine([]), 'No town within that reach: this is around here.');
  assert.equal(w.UNDO_LABEL, 'Undo');
  for (const s of [w.lookedLine(['Cranston']), w.lookedLine([]), w.ANOTHER_LINE]) assert.doesNotMatch(s, BANNED, s);
});
