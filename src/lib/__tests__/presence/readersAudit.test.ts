import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

// The review of presence readers (Nov 11): regression tests before their fixes (specs/presence-readers, Record).

const lib = join(__dirname, '..', '..');
const presence = async () => (await import('../../presence/presence')) as unknown as Record<string, any>;

/** Every module of src/lib but presence's own folder and the tests. */
function libFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) { if (p !== join(lib, '__tests__') && p !== join(lib, 'presence')) walk(p); } else if (/\.tsx?$/.test(f)) out.push(p);
    }
  };
  walk(lib);
  return out;
}

/**
 * Words a source's tables are keyed by that other modules use in their own sense, never as a source's tag, each with the
 * sense it has there.
 */
const PLAIN_WORDS: Readonly<Record<string, string>> = {
  car: 'streets built around cars (walk bands)',
  library: 'the store\'s own library',
  marker: 'an edit\'s or a pin\'s marker',
  statue: 'a word of resurfacing\'s terms',
  park: 'a scenic route\'s green kind',
  wood: 'a scenic route\'s green kind',
  photo: 'a capture\'s kind',
  art: 'a category\'s id (Art)',
  station: 'the landing\'s nearest station, a local name',
  gallery: 'the media gallery (a meta key\'s owner)',
};

test('presence-readers audit 1: the guard\'s words are every key of presence\'s tables, and no module outside presence spells one', async () => {
  const p = await presence();
  const words: string[] = p.SOURCE_TAGS;
  assert.ok(Array.isArray(words) && words.length > 100, 'presence lists every tag its tables are keyed by');
  for (const w of ['artwork', 'viewpoint', 'railway', 'bus', 'ferry_terminal', 'cinema', 'castle', 'theatre', 'zoo', 'attraction', 'grass', 'folly', 'food_and_drink'])
    assert.ok(words.includes(w), `${w} is a tag presence reads`);
  const spells = (text: string, w: string) => new RegExp(`(['"]${w}['"]|\\b${w}:)`).test(text);
  const bad: string[] = [];
  for (const f of libFiles()) {
    const text = readFileSync(f, 'utf8');
    for (const w of words) if (!(w in PLAIN_WORDS) && spells(text, w)) bad.push(`${relative(lib, f)}: ${w}`);
  }
  assert.deepEqual(bad, [], 'a table keyed by a source\'s tags outside presence');
  const tilePois = readFileSync(join(lib, 'discovery/tilePois.ts'), 'utf8');
  assert.ok(!/GENERIC|TRANSIT/.test(tilePois), 'tilePois holds no table of its own');
});
