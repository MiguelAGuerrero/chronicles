import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

// CX13: a complex is named only in the arrival line (Memories and the gallery viewer), never stored, never in a replay, search,
// the share reel, a thread entry or a title suggestion.

const LIB = join(__dirname, '..', '..');
function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== '__tests__') walk(p, out); } else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

test('CX13: only the arrival line, the card, the map and the settings reach complexes; nothing stores one on a capture, moment, thread entry or walk', () => {
  const importers = walk(LIB).filter((f) => /from '(\.\.?\/)+(complexes|lib\/complexes)(\/[^']*)?'/.test(readFileSync(f, 'utf8')) && !relative(LIB, f).startsWith('complexes'));
  assert.ok(importers.length > 0, 'something reads them');
  const allowed = /^(resurface|atlas|discovery|db|ports|explore|moments?|gallery)\//;
  for (const f of importers) assert.ok(allowed.test(relative(LIB, f)), `${relative(LIB, f)} may not reach complexes`);
  for (const banned of ['replay', 'ceremony', 'share', 'export', 'search', 'threads', 'walk']) {
    assert.equal(importers.some((f) => relative(LIB, f).startsWith(`${banned}/`)), false, banned);
  }
  for (const f of ['types.ts', 'moment.ts']) assert.equal(/complex/i.test(readFileSync(join(LIB, f), 'utf8')), false, `${f} stores no complex`);
});
