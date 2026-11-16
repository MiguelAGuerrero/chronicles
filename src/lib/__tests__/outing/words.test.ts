import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { WANTS } from '../../outing/wants';
import { cardLine, ENTRY_LABEL, FEW_LINE, HOURS_LINE, NO_LOOP_LINE, NO_PICK_LINE, NO_POSITION_LINE, NO_SWAP_LINE, nextWord, slotLine, SWAP_LABEL } from '../../outing/words';

// Whole words only (QC33). A digit is banned too: counts and distances are words here (QC25, QC28).
const BANNED = /\b(minutes?|mins?|hours?|hrs?|ETA|pace|brisk|quick(er|est)?|fast(er|est)?|shorter|longer|more|most|best|densest|finest|top|popular|rated|rating|stars?|remaining|left|done|first|second|third|last)\b|\d/i;

function everySentence(): string[] {
  const out = [ENTRY_LABEL, SWAP_LABEL, FEW_LINE, NO_POSITION_LINE, NO_PICK_LINE, NO_SWAP_LINE, NO_LOOP_LINE];
  for (const m of [0, 40, 200, 300, 599, 600, 900, 1500, 2400]) {
    out.push(nextWord(m));
    for (const w of WANTS) out.push(slotLine(w.slotWord, m), cardLine(w.slotWord, m));
  }
  return out;
}

test('QC28 and QC33: no sentence says a count, a time, a rank, an ordinal or a superlative, whole words', () => {
  for (const s of everySentence()) assert.doesNotMatch(s, BANNED, s);
  assert.match('Mostly quiet', /\bmost/i, 'the grep is for whole words: "Mostly" is not "most"');
  assert.doesNotMatch('Almost there', /\bmost\b/i);
});

test('QC17: a slot says its kind and how far in words and carries no name', () => {
  assert.match(slotLine('an antiques shop', 200), /^An antiques shop, /);
  assert.equal(nextWord(200), 'a short walk on');
  for (const m of [0, 200, 800, 2400]) assert.ok(nextWord(m).length > 0);
});

test('QC20: the hours line is a statement, not an apology or advice, and the card does not say it', () => {
  assert.equal(HOURS_LINE, "Opening hours aren't known here.");
  assert.doesNotMatch(HOURS_LINE, /\b(check|call|may|might|should|please|sorry|unfortunately|closed)\b/i);
  assert.doesNotMatch(cardLine('an antiques shop', 200), /hour|open|closed|unknown/i);
});

test('QC25: no ordinal, "of N", progress glyph or remaining count in any string of the outing', () => {
  for (const f of ['words', 'arrival', 'dest']) {
    const src = readFileSync(new URL(`../../outing/${f}.ts`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(src, /[✓✔☑●○]|\bstop \d|\d of \d/);
  }
});
