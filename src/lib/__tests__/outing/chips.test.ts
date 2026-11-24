import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shop } from './fixtures';
import { at } from '../walk-planner/grid';

// The outing's chips (OJ11-OJ15): kinds of attraction and kinds of shop in one list, each switched on widening what a stop may be.

const BANNED = /\b(best|top|most|popular|rated|cheap(er|est)?|hidden|gem|quiet|open|late|new|good|great|famous|fast(er|est)?|minutes?|hours?)\b/i;

test('OJ11: one list of chips, shops and attractions alike, none marked as either', async () => {
  const { CHIPS } = await import('../../outing/chips');
  const ids = CHIPS.map((c) => c.id);
  for (const id of ['antiques', 'books', 'thrifting', 'art', 'history', 'culture', 'parks', 'viewpoints']) assert.ok(ids.includes(id), id);
  for (const c of CHIPS) assert.deepEqual(Object.keys(c).sort(), ['aliases', 'id', 'label', 'match', 'slotWord'], c.id);
});

test('OJ12: the chips on at first are the attractions whose kinds are on in "What I\'m into"; shop chips start off', async () => {
  const { defaultChips } = await import('../../outing/chips');
  const kinds = [{ id: 'public_art', category: 'art' }, { id: 'monuments', category: 'history' }, { id: 'churches', category: 'history' }, { id: 'gardens', category: 'parks' }];
  assert.deepEqual(defaultChips(kinds, new Set()), ['art', 'parks', 'history'], 'in the chips\' own order');
  assert.deepEqual(defaultChips(kinds, new Set(['public_art', 'monuments'])), ['parks', 'history'], 'a kind is off only when every kind of it is hidden');
  assert.deepEqual(defaultChips(kinds, new Set(['monuments', 'churches'])), ['art', 'parks']);
  for (const id of defaultChips(kinds, new Set())) assert.ok(!['antiques', 'books', 'thrifting'].includes(id));
});

test('OJ13: a chip says what a place is: no word of quality, price, popularity, time or opinion', async () => {
  const { CHIPS } = await import('../../outing/chips');
  for (const c of CHIPS) for (const text of [c.label, c.slotWord, ...c.aliases]) assert.doesNotMatch(text, BANNED, text);
});

test('OJ14: each chip switched on widens what a stop may be, across dimensions too', async () => {
  const { CHIPS } = await import('../../outing/chips');
  const { matchesAny } = await import('../../outing/candidates');
  const by = (id: string) => CHIPS.find((c) => c.id === id)!;
  const thrift = shop('s', 0, 0, ['second_hand']);
  const mill = { id: 'p', at: at(0, 0), facets: { kind: ['history'] }, name: 'Old Mill' };
  assert.equal(matchesAny([by('thrifting')], thrift), true);
  assert.equal(matchesAny([by('thrifting')], mill), false);
  assert.equal(matchesAny([by('thrifting'), by('history')], mill), true, 'a second chip in another dimension adds, never narrows');
  assert.equal(matchesAny([by('thrifting'), by('history')], thrift), true);
  assert.equal(matchesAny([], thrift), false);
});

test('OJ15: the chips are in alphabetical order by label, and nothing orders them otherwise', async () => {
  const { CHIPS } = await import('../../outing/chips');
  const labels = CHIPS.map((c) => c.label);
  assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b)));
});

test('tend explore T63: each attraction chip reads its kind\'s name from the one table, "Views & oddities" among them', async () => {
  const { CHIPS } = await import('../../outing/chips');
  const { CATEGORIES, categoryOf } = await import('../../discovery/categories');
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  // Decision 0239: one table names the kinds on every screen; a chip over one kind says that kind's name.
  const attractions = CHIPS.filter((c) => (c.match.kind ?? []).length === 1 && CATEGORIES.some((k) => k.id === c.match.kind![0]));
  assert.deepEqual(attractions.map((c) => c.id).sort(), ['art', 'culture', 'history', 'parks', 'viewpoints']);
  for (const c of attractions) assert.equal(c.label, categoryOf(c.match.kind![0] as never).label, c.id);
  const views = CHIPS.find((c) => c.id === 'viewpoints')!;
  assert.equal(views.label, 'Views & oddities');
  // Its id, aliases, match and slot word are kept.
  assert.deepEqual(views.aliases, ['viewpoints', 'lookouts', 'oddities', 'curiosities']);
  assert.deepEqual(views.match, { kind: ['viewpoints'] });
  assert.equal(views.slotWord, 'a view or an oddity');
  // The name is read from the table, not copied into the chips.
  assert.doesNotMatch(readFileSync(join(__dirname, '../../outing/chips.ts'), 'utf8'), /'Views & oddities'|'Views'/);
  // Alphabetical by label, it stays last.
  assert.deepEqual(CHIPS.map((c) => c.label), ['Antiques', 'Art', 'Books', 'Culture', 'Green', 'History', 'Thrifting', 'Views & oddities']);
});

test('tend explore T63: the outing\'s sentences keep the noun, "views", never the chip\'s name with its "&"', async () => {
  const chips = (await import('../../outing/chips')) as Record<string, unknown>;
  const { CHIPS } = await import('../../outing/chips');
  const { townLine, cardSummary } = await import('../../outing/journeyWords');
  // Decision 0264: titles and spoken names take the label; sentences keep the noun "views".
  assert.equal(typeof chips.chipWord, 'function', 'a chip has its word for a sentence');
  const word = chips.chipWord as (w: (typeof CHIPS)[number]) => string;
  const by = (id: string) => CHIPS.find((c) => c.id === id)!;
  assert.equal(word(by('viewpoints')), 'Views');
  // Every other chip's word is its label, as the sentences said before.
  for (const c of CHIPS) if (c.id !== 'viewpoints') assert.equal(word(c), c.label, c.id);
  assert.equal(townLine([word(by('history')), word(by('viewpoints'))]), 'History and views here.');
  assert.equal(townLine([word(by('viewpoints')), word(by('parks'))]), 'Views and green here.');
  assert.equal(cardSummary({ places: ['Lyon'], labels: [word(by('antiques')), word(by('viewpoints'))], footM: 0 }, 'km'), 'Lyon. Antiques and Views.');
  // The page builds its sentences from that word, never from the label.
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const page = readFileSync(join(__dirname, '../../../components/outing/OutingPage.tsx'), 'utf8');
  assert.doesNotMatch(page, /labels\.push\(want\.label\)|\.map\(\(w\) => w\.label\)/, 'the town line and the card summary take chipWord');
});
