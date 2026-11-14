import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

// Who may read reactions (RX30, RX35; carried over from note-types audit 15): a reaction is the owner's mark on their
// own moment. A file that mentions reactions must be on this list; a new reader edits the list, and that edit is the
// gate (`/vision`). Only the lens gathers moments by a reaction; nothing sums one up for a walk, day, thread or place.

const SRC = join(__dirname, '..', '..', '..');
const ALLOWED = new Set([
  // The model, its storage, its shell and the lens.
  'lib/reactions/core.ts', 'lib/reactions/lens.ts', 'lib/reactions/shell.ts', 'lib/reactions/index.ts', 'lib/reactions/useReactions.ts',
  'lib/db/types.ts', 'lib/db/index.web.ts', 'lib/db/sqliteStore.ts', 'lib/db/migrations.ts', 'lib/export/bundle/shell.ts', 'lib/pins.ts',
  // Where a reaction is set or drawn on its own moment.
  'components/reactions/ReactionPanel.tsx', 'components/reactions/ReactionMarks.tsx', 'components/reactions/ReactionSign.tsx',
  'components/reactions/ReactionsScreen.tsx', 'components/reactions/LensScreen.tsx',
  'components/journal/Entry.tsx', 'components/journal/OpenLine.tsx', 'components/chronicle/MemoriesScreen.tsx', 'components/chronicle/MemoriesMenu.tsx',
  'components/chronicle/MemoryMenu.tsx', 'components/chronicle/MomentCard.tsx', 'components/CaptureView.tsx',
  'components/notePage/NotePage.tsx', 'components/notePage/NewNotePage.tsx', 'components/threads/NoteBubble.tsx',
  'components/map/WalkMap.web.tsx', 'components/map/WalkMap.native.tsx', 'components/CapturePinView.tsx',
]);
const WORDS = /\b(listReactions|setReaction|useReactions|reactionSet|REACTIONS|lensMoments|lensRows|pinReactions|ReactionMarks|ReactionPanel|ReactionSign)\b|lib\/reactions|\.\/reactions|\.\.\/reactions/;
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : files(p);
    return /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
const rel = (f: string) => relative(SRC, f).split('\\').join('/');

test('RX30: only the listed files mention reactions', () => {
  const mentions = files(SRC).filter((f) => WORDS.test(readFileSync(f, 'utf8'))).map(rel);
  assert.deepEqual(mentions.filter((f) => !ALLOWED.has(f)), [], 'a new reader of reactions goes through the vision gate and then onto this list');
  assert.ok(mentions.includes('lib/reactions/lens.ts'));
});

test('RX30: nothing about places, routes, areas, discovery, landing, walkability, resurfacing, the replay or recall reads reactions', () => {
  const bad = files(join(SRC, 'lib')).map(rel)
    .filter((f) => /^lib\/(explore|places|areas|atlas|discovery|landing|walkability|walk|nav|presence|complexes|layers|resurface|ceremony|threads|journal|recall)\//.test(f) || /^lib\/(summary|replay|days)\.ts$/.test(f))
    .filter((f) => WORDS.test(readFileSync(join(SRC, f), 'utf8')));
  assert.deepEqual(bad, []);
});

test('RX30: only the lens filters, sorts or groups moments by a reaction', () => {
  const gather = /\.(filter|sort|reduce)\([^)]*\b(reaction|thought|feeling|taste)\b/;
  const bad = [...ALLOWED].filter((f) => f !== 'lib/reactions/lens.ts' && f !== 'lib/reactions/core.ts')
    .filter((f) => { try { return gather.test(readFileSync(join(SRC, f), 'utf8')); } catch { return false; } });
  assert.deepEqual(bad, []);
});

test('RX35: no walk, day, week, thread, area or place is shown or said to have a reaction: none of their screens reads one', () => {
  const screens = ['app/(tabs)/index.tsx', 'app/replay/[id].tsx', 'app/day/[key].tsx', 'components/HomeSheet.tsx', 'components/chronicle/ThreadScreen.tsx',
    'components/threads/OwnThreadScreen.tsx', 'components/chronicle/ThreadsRail.tsx', 'components/threads/MyThreads.tsx', 'components/ceremony/Cards.tsx', 'components/journal/Slip.tsx'];
  const bad = screens.filter((f) => { try { return WORDS.test(readFileSync(join(SRC, f), 'utf8')); } catch { return false; } });
  assert.deepEqual(bad, []);
});

test('RX16: a reaction is spoken only where it is drawn: the card speaks them through the same marks it draws, the slip speaks none', () => {
  const card = readFileSync(join(SRC, 'components/chronicle/MomentCard.tsx'), 'utf8');
  assert.match(card, /<ReactionMarks /, 'the card that says them draws them');
  const slip = readFileSync(join(SRC, 'components/journal/Slip.tsx'), 'utf8');
  assert.doesNotMatch(slip, WORDS);
});

test('RX36: every reaction glyph is drawn in the one ink colour, and the chosen state is no tint', () => {
  for (const f of ['components/reactions/ReactionPanel.tsx', 'components/reactions/ReactionMarks.tsx', 'components/reactions/ReactionSign.tsx']) {
    const src = readFileSync(join(SRC, f), 'utf8');
    const colours = [...src.matchAll(/color=\{([^}]+)\}/g)].map((m) => m[1].trim());
    assert.ok(colours.length > 0, `${f} draws a glyph`);
    // Ink, or the page's white where a glyph sits on ink (the sign's plus, the viewer's dark strip): nothing else.
    const named = colours.flatMap((c) => (c === 'ink' ? ['theme.ink', 'theme.bg'] : c.match(/theme\.\w+|#[0-9a-f]+|rgba?\(/gi) ?? [c]));
    assert.deepEqual([...new Set(named)].filter((c) => c !== 'theme.ink' && c !== 'theme.bg'), [], `${f}: ink only`);
    assert.doesNotMatch(src, /accent|tint|backgroundColor:\s*theme\.(accent|wash)/, `${f}: no accent or tint`);
  }
});

test('reactions audit 21: the bubbles on a pin and the lens screens are in ink too (RX36)', { todo: 'test first' }, () => {
  for (const f of ['components/reactions/LensScreen.tsx', 'components/reactions/ReactionsScreen.tsx']) {
    const glyphs = [...readFileSync(join(SRC, f), 'utf8').matchAll(/<Icon name=\{[^}]*glyph[^}]*\}[^>]*color=\{([^}]+)\}/g)].map((m) => m[1].trim());
    assert.ok(glyphs.length > 0, `${f} draws a reaction's glyph`);
    assert.deepEqual(glyphs.filter((c) => c !== 'theme.ink'), [], `${f}: the reaction's glyph in ink`);
  }
  const pin = readFileSync(join(SRC, 'components/CapturePinView.tsx'), 'utf8');
  assert.match(pin, /reaction: \{[^}]*backgroundColor: theme\.ink/);
  assert.match(pin, /<Icon name=\{r\.glyph as IconName\} size=\{\d+\} color="#ffffff"/);
});
