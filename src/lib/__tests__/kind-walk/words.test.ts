import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ATLAS_ORDER } from '../../atlas/atlas';
import { fewLine, farLine, introLine, lengthLine, noneLine, noRouteLine, readingLine, skippedLine, startLabel, startLine, walkabilityLine } from '../../kindWalk/words';

const ALL = [
  ...ATLAS_ORDER.flatMap((k) => [introLine(k), noneLine(k)]),
  lengthLine(2000, 'km'), lengthLine(2400, 'mi'), startLine(900, 'km') ?? '', startLine(900, 'mi') ?? '',
  walkabilityLine({ cars: [], unknown: false }), walkabilityLine({ cars: ['Main St', null], unknown: false }), walkabilityLine({ cars: [], unknown: true }),
  fewLine, farLine, noRouteLine, skippedLine, readingLine, startLabel,
];

test('KW7: no sentence says a time, a pace, or a rank', () => {
  const banned = /\b(minutes?|mins?|hours?|hrs?|ETA|pace|fast(est)?|quick(est)?|best|finest|top|most)\b/i;
  for (const s of ALL) assert.ok(!banned.test(s), `"${s}" speaks a time or a rank`);
  // The source holds the same line: a sentence added later is held to it too.
  const src = readFileSync(new URL('../../kindWalk/words.ts', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/\b(minutes?|ETA|pace|fastest)\b/i.test(src.replace(/Math|Number/g, '')), 'words.ts mentions a time');
});

test('KW7: the length is a number in the displayed unit', () => {
  assert.match(lengthLine(2000, 'km'), /^About 2\.0[ \u00a0]km$/);
  assert.match(lengthLine(2400, 'km'), /^About 2\.4[ \u00a0]km$/);
  assert.match(lengthLine(2414, 'mi'), /^About 1\.5[ \u00a0]mi$/);
  assert.ok(!/min/.test(lengthLine(950, 'km')));
});

test('KW9: the start is said only when it is a walk away', () => {
  assert.equal(startLine(150, 'km'), null);
  assert.equal(startLine(640, 'km'), 'Starts 600\u00a0m from here');
  assert.match(startLine(1500, 'mi')!, /mi from here$/);
});

test('KW10: whether it is walkable the whole way is said, with the street, and "unknown" never claims it is fine', () => {
  assert.match(walkabilityLine({ cars: [], unknown: false }), /Easy on foot/);
  assert.equal(walkabilityLine({ cars: ['Main St', 'Main St', null], unknown: false }), 'Part of it is built around cars on Main St.');
  assert.equal(walkabilityLine({ cars: [null], unknown: false }), 'Part of it is built around cars.');
  const u = walkabilityLine({ cars: [], unknown: true });
  assert.match(u, /not known/);
  assert.ok(!/easy/i.test(u));
});

test('KW1b: the sentences hold no digit but the distance', () => {
  for (const s of ALL.filter((x) => !/^(About|Starts)/.test(x))) assert.ok(!/\d/.test(s), `"${s}" has a digit`);
});

test('KW2: a kind with nothing to walk through says so in words', () => {
  assert.equal(noneLine('parks'), 'No green to walk through here.');
});

test('tend explore T49: the kind walk\'s sentences take each kind\'s noun, never its name with an "&"', () => {
  assert.equal(introLine('viewpoints'), 'A way through where views are concentrated here.');
  assert.equal(introLine('shops'), 'A way through where shops are concentrated here.');
  assert.equal(introLine('parks'), 'A way through where green is concentrated here.');
  assert.equal(noneLine('viewpoints'), 'No views to walk through here.');
  for (const k of ATLAS_ORDER) for (const s of [introLine(k), noneLine(k)]) assert.ok(!/&/.test(s), `"${s}" takes the noun`);
});
