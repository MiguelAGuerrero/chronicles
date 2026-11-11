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

test('presence-readers audit 2: a carried code is only ever the previous presence code, judged unchanged, and listed once in presence', async () => {
  const p = await presence();
  assert.ok(Array.isArray(p.PRESENCE_CARRIED), 'presence lists the codes whose rows stand');
  const n = Number(String(p.PRESENCE_CODE).slice(1));
  for (const c of p.PRESENCE_CARRIED) assert.equal(c, `p${n - 1}`, `${c} is not the code just before ${p.PRESENCE_CODE}: empty the list at a bump that changes what rows derive`);
  // The atlas and the landing carry what presence lists, never a code of their own.
  for (const f of ['atlas/atlas.ts', 'landing/view.ts']) assert.ok(!/[.:'`]p\d+[:'`]/.test(readFileSync(join(lib, f), 'utf8')), `${f} spells a presence code`);
  const { ATLAS_CODE, rowCurrent } = await import('../../atlas/atlas');
  const own = ATLAS_CODE.split('.')[0];
  const { LANDING_CODE, rulesCurrent } = await import('../../landing/view');
  const { LANDING_RULES } = await import('../../landing/analyze');
  for (let k = 1; k < n; k++) {
    const carried: boolean = p.PRESENCE_CARRIED.includes(`p${k}`);
    assert.equal(rowCurrent({ build: 'b', code: `${own}.p${k}`, level: 'town' }, 'b'), carried, `${own}.p${k}`);
    assert.equal(rulesCurrent(`${LANDING_CODE}:p${k}:${JSON.stringify(LANDING_RULES)}`), carried, `landing p${k}`);
  }
});

test('presence-readers audit 3: a mark-category place with unknown markable counts toward no bar in the planner', async () => {
  const { createPlanner } = await import('../../walkPlanner/service');
  const { at, segs } = await import('../walk-planner/grid');
  // Five churches with no `markable` (a row read before it existed): before the slice the planner counted none of them.
  const places = [at(200, 200), at(220, 210), at(900, 300), at(910, 320), at(1000, 900)].map((p, i) => ({ key: `c${i}`, name: `St Paul Church ${i}`, category: 'history' as const, at: p, generic: false, build: 'b' }));
  const planner = createPlanner({ read: async () => ({ places, segments: segs }), reach: async () => ({ cars: [], unknown: false }), found: async () => [] } as never);
  const r = await planner.plan({ kind: 'history', area: { at: at(650, 650), reachM: 1200 }, from: at(130, 130), prefs: { budgetM: 3000, pref: 'warn', mode: 'oneway', density: 'anywhere' } } as never);
  assert.deepEqual(r.routes, []);
  assert.ok(r.reasons.includes('few'), r.reasons.join(', '));
});

test('presence-readers audit 4: a near read under a carried code needs no re-list, around you or for a town', async () => {
  const { needsNear } = await import('../../atlas/atlas');
  const p = await presence();
  const at: [number, number] = [-75.38, 40.62];
  for (const c of p.PRESENCE_CARRIED as string[]) {
    const code = `a8.${c}`;
    assert.equal(needsNear([{ at, build: 'b', code, radiusM: 2500 }], at, 'b', 2500), false, `${code} around you`);
    assert.equal(needsNear([{ at, build: 'b', code, town: 'T' }], at, 'b', undefined, 'T'), false, `${code} for a town`);
  }
  assert.equal(needsNear([{ at, build: 'b', code: 'a7', radiusM: 2500 }], at, 'b', 2500), true, 'an older code is listed again');
});
