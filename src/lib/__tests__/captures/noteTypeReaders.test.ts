import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

// Who may read a note's type (decision 0149, note-types audit 15): a type is the owner's mark on their own note, and
// no feature may read one to say something about a place, a route, a recommendation, a count or a search. A file that
// mentions it must be on this list; a new reader edits the list, and that edit is the gate (`/vision`).

const SRC = join(__dirname, '..', '..', '..');
const ALLOWED = new Set([
  'lib/noteType.ts', 'lib/noteEdit.ts', 'lib/moment.ts', 'lib/types.ts', 'lib/captureBus.ts', 'lib/pins.ts', 'lib/useCaptures.ts',
  'lib/db/index.web.ts', 'lib/db/sqliteStore.ts', 'lib/db/migrations.ts', 'lib/resurface/shell.ts', 'lib/ready/shell.ts',
  'components/icons.tsx', 'components/NoteMark.tsx', 'components/NoteEditor.tsx', 'components/CaptureView.tsx',
  'components/CapturePinView.tsx', 'components/chronicle/MomentCard.tsx', 'components/chronicle/MomentPicture.tsx',
  'components/threads/NoteBubble.tsx',
  'components/map/WalkMap.web.tsx', 'components/map/WalkMap.native.tsx',
  'app/(tabs)/index.tsx', 'app/replay/[id].tsx', 'app/day/[key].tsx', 'components/walk/useReady.tsx',
]);
const WORDS = /\b(note_type|noteTypeOf|markOf|NOTE_TYPES|pinMark|pinNoteLabel|captureIcon|isFacePiece|patchFaced)\b|lib\/noteType|\.\/noteType/;
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : files(p);
    return /\.(ts|tsx)$/.test(n) ? [p] : [];
  });

test('note-types audit 15: only the listed files mention a note\'s type', () => {
  const mentions = files(SRC).filter((f) => WORDS.test(readFileSync(f, 'utf8'))).map((f) => relative(SRC, f).split('\\').join('/'));
  assert.deepEqual(mentions.filter((f) => !ALLOWED.has(f)), [], 'a new reader of types goes through the vision gate and then onto this list');
});

test('note-types audit 15: nothing about places, routes, areas, discovery, landing or walkability imports the type', () => {
  const bad = files(join(SRC, 'lib')).map((f) => relative(SRC, f).split('\\').join('/'))
    .filter((f) => /^lib\/(explore|places|areas|atlas|discovery|landing|walkability|walk|nav|presence|complexes|layers)\//.test(f))
    .filter((f) => WORDS.test(readFileSync(join(SRC, f), 'utf8')));
  assert.deepEqual(bad, []);
});

test('note-types audit 16: the spoken label says a type only where its mark is drawn: the resurfaced card, which draws none, says none', () => {
  const src = readFileSync(join(SRC, 'components/chronicle/Resurfaced.tsx'), 'utf8');
  assert.match(src, /momentSpoken\(m, props\.now, props\.context, false\)/);
  const card = readFileSync(join(SRC, 'components/chronicle/MomentCard.tsx'), 'utf8');
  assert.match(card, /export function momentSpoken\(m: MomentView, now: number, context\?: ContextEntry, typed = true\)/);
});
