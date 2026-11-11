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
  photo: 'a capture\'s kind',
  art: 'a category\'s id (Art)',
  station: 'the landing\'s nearest station, a local name',
  gallery: 'the media gallery (a meta key\'s owner)',
};

/**
 * presence-readers audit 9: words plain only in the files (or folders, ending in /) listed, each in the sense noted, so a raw
 * `'park'` or `'wood'` tag read anywhere else fails the guard. Paths are relative to src/lib.
 */
const PLAIN_IN: Readonly<Record<string, readonly string[]>> = {
  // a green's kind (`GreenArea['kind']`), and the atlas sketch's park colour
  park: ['discovery/green.ts', 'nav/scenic.ts', '../components/atlas/kinds.ts'],
  wood: ['discovery/green.ts'],
  // a style's or a component's bar (a scale bar, a section bar), in views only
  bar: ['../components/'],
};
const plainIn = (w: string, rel: string) => !!PLAIN_IN[w]?.some((p) => (p.endsWith('/') ? rel.startsWith(p) : rel === p));

/** Every module of the app outside presence and the tests: src/lib, and the views in src/app and src/components. */
function appFiles(): string[] {
  const out: string[] = [...libFiles()];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f)) out.push(p);
    }
  };
  for (const d of ['app', 'components']) walk(join(lib, '..', d));
  return out;
}

test('presence-readers audit 1: the guard\'s words are every key of presence\'s tables, and no module outside presence spells one', async () => {
  const p = await presence();
  const words: string[] = p.SOURCE_TAGS;
  assert.ok(Array.isArray(words) && words.length > 100, 'presence lists every tag its tables are keyed by');
  for (const w of ['artwork', 'viewpoint', 'railway', 'bus', 'ferry_terminal', 'cinema', 'castle', 'theatre', 'zoo', 'attraction', 'grass', 'folly', 'food_and_drink'])
    assert.ok(words.includes(w), `${w} is a tag presence reads`);
  // presence-readers audit 9: template literals count as spelling a word too; park and wood are plain only where listed.
  const spells = (text: string, w: string) => new RegExp(`(['"\`]${w}['"\`]|\\b${w}:)`).test(text);
  const bad: string[] = [];
  for (const f of appFiles()) {
    const text = readFileSync(f, 'utf8');
    const rel = relative(lib, f);
    for (const w of words) if (!(w in PLAIN_WORDS) && !plainIn(w, rel) && spells(text, w)) bad.push(`${rel}: ${w}`);
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
  const { ATLAS_CODE, needsNear } = await import('../../atlas/atlas');
  const p = await presence();
  const at: [number, number] = [-75.38, 40.62];
  const own = ATLAS_CODE.split('.')[0];
  for (const c of p.PRESENCE_CARRIED as string[]) {
    const code = `${own}.${c}`;
    assert.equal(needsNear([{ at, build: 'b', code, radiusM: 2500 }], at, 'b', 2500), false, `${code} around you`);
    assert.equal(needsNear([{ at, build: 'b', code, town: 'T' }], at, 'b', undefined, 'T'), false, `${code} for a town`);
  }
  assert.equal(needsNear([{ at, build: 'b', code: 'a7', radiusM: 2500 }], at, 'b', 2500), true, 'an older code is listed again');
  // T8: a carried presence code stands only under the atlas's own part; a8's reads, from before community parks (PC13), are listed again.
  assert.equal(needsNear([{ at, build: 'b', code: 'a8.p1', radiusM: 2500 }], at, 'b', 2500), true, 'a8.p1 is listed again');
});

test('presence-readers audit 5: a poi or Overture place named for an Object.prototype key is no place, and nothing throws', async () => {
  const p = await presence();
  const { placesFromTilePois, transitFromTilePois } = await import('../../discovery/tilePois');
  const { placesFromArchive } = await import('../../discovery/archivePois');
  const { osmWeight, overtureWeight } = await import('../../activity/weights');
  const keys = ['constructor', 'toString', 'hasOwnProperty', '__proto__', 'valueOf'];
  for (const k of keys) {
    for (const [cls, sub] of [['shop', k], [k, k], [k, ''], ['museum', k], ['art_gallery', k]]) {
      assert.deepEqual(p.classesOfOsm(cls, sub).filter((c: unknown) => typeof c !== 'string'), [], `${cls}/${sub}`);
      assert.doesNotThrow(() => osmWeight(cls, sub), `${cls}/${sub} weight`);
      const pt = { geometry: { type: 'Point', coordinates: [-75.47, 40.6] }, properties: { class: cls, subclass: sub, name: '' }, zoom: 14 } as never;
      assert.doesNotThrow(() => placesFromTilePois([pt], 'b'), `${cls}/${sub} as a place`);
      assert.doesNotThrow(() => transitFromTilePois([pt]), `${cls}/${sub} as transit`);
    }
    assert.deepEqual(p.classesOfOsm(k, k), [], k);
    assert.deepEqual(p.classesOfOverture([k]), [], `Overture ${k}`);
    assert.doesNotThrow(() => overtureWeight(['shopping', k]), `Overture shopping/${k}`);
    assert.equal(overtureWeight([k]), 0);
    assert.deepEqual(p.classesOfArchive(k), [], `archive ${k}`);
    assert.deepEqual(placesFromArchive([{ geometry: { type: 'Point', coordinates: [-75.47, 40.6] }, properties: { name: 'A place', class: k } } as never], 'v'), []);
    assert.deepEqual(p.classesOfLandcover({ class: k, subclass: k }), []);
    assert.equal(p.unnamedLabel(k), null);
    assert.equal(p.isTransitStop(k, k), false);
  }
});

test('presence-readers audit 8: the golden rings hold each mark\'s kind, with outlines', () => {
  const g = JSON.parse(readFileSync(join(__dirname, 'readers.golden.json'), 'utf8')) as { steps: { marks: string[] }[]; outlined?: { marks: string[] }[] };
  assert.ok(g.steps.every((s) => s.marks.every((m) => m.includes('|'))), 'each golden mark is key|kind');
  assert.ok(Array.isArray(g.outlined) && g.outlined.length === g.steps.length, 'a ring fed outlines for every fixture area');
  const kinds = new Set(g.outlined!.flatMap((s) => s.marks.map((m) => m.split('|')[1])));
  for (const k of ['parks', 'community_parks']) assert.ok(kinds.has(k), `the outlined rings hold ${k}, so a kind flip between them shows`);
  assert.match(readFileSync(join(__dirname, 'readers.test.ts'), 'utf8'), /golden\.outlined\[/, 'PS8 compares the outlined rings');
});

test('presence-readers audit 7: a park named with a notable.json word stays a park (Old Mill Playground, Historic Ball Field)', async () => {
  const { refineRead } = await import('../../discovery/refinements');
  const { placesFromTilePois } = await import('../../discovery/tilePois');
  const { notableName } = await import('../../presence/notable');
  const notable = JSON.parse(readFileSync(join(lib, 'presence/notable.json'), 'utf8')) as { words: string[] };
  const parkWords = JSON.parse(readFileSync(join(lib, 'discovery/parkNotable.json'), 'utf8')) as { words: string[] };
  const kindOf = (name: string) =>
    refineRead(placesFromTilePois([{ geometry: { type: 'Point', coordinates: [-75.47, 40.6] }, properties: { class: 'park', subclass: 'park', name }, zoom: 14 } as never], 'b'), {})[0]?.kind;
  assert.equal(kindOf('Old Mill Playground'), 'parks');
  assert.equal(kindOf('Historic Ball Field'), 'parks');
  assert.equal(kindOf('Elm Street Playground'), 'community_parks', 'a plain name with a community word is the subset');
  // Every word of presence's list keeps a park a park, through presence's own rule, whichever list the word is not in.
  for (const w of notable.words) {
    const name = `${w} Playground`;
    if (!notableName(name) || parkWords.words.includes(w)) continue;
    assert.equal(kindOf(name), 'parks', name);
  }
});

test('presence-readers audit 9: park and wood are plain only where a green\'s kind is spelled; the guard reads views and template literals', async () => {
  const p = await presence();
  const words: string[] = p.SOURCE_TAGS;
  for (const w of Object.keys(PLAIN_IN)) assert.ok(words.includes(w) && !(w in PLAIN_WORDS), `${w} is a tag, plain only per file`);
  const files = appFiles().map((f) => relative(lib, f));
  assert.ok(files.some((f) => f.startsWith('../app/')) && files.some((f) => f.startsWith('../components/')), 'the guard reads src/app and src/components');
  // The auditor's inputs: a raw tag read in a module not listed, as a string, a template literal or destructured.
  const spells = (text: string, w: string) => new RegExp(`(['"\`]${w}['"\`]|\\b${w}:)`).test(text);
  assert.ok(spells("if (String(f.properties?.class) === 'wood') continue;", 'wood') && !plainIn('wood', 'atlas/read.ts'));
  assert.ok(spells('if (sub === `park`) return 1;', 'park'));
  const destructures = /\{[^}]*\bclass\s*:/;
  assert.ok(destructures.test("const { class: c } = f.properties ?? {};"));
  for (const f of ['discovery/refine.ts', 'discovery/refinements.ts', 'discovery/parkKind.ts', 'discovery/green.ts'])
    assert.ok(!destructures.test(readFileSync(join(lib, f), 'utf8')), `${f} destructures a feature's class`);
});

test('presence-readers audit 10: a refined community park keeps its classes and counts toward Parks', async () => {
  const { refineRead } = await import('../../discovery/refinements');
  const { placesFromTilePois } = await import('../../discovery/tilePois');
  const { barsOf } = await import('../../discovery/bars');
  const { countsToward } = await import('../../discovery/curation');
  const { presenceSteps } = await import('../../atlas/atlas');
  const at: [number, number] = [-75.47, 40.6];
  const [p] = refineRead(placesFromTilePois([{ geometry: { type: 'Point', coordinates: at }, properties: { class: 'park', subclass: 'park', name: 'Elm Street Playground' }, zoom: 14 } as never], 'b'), {});
  assert.equal(p.kind, 'community_parks');
  assert.ok(p.classes?.includes('park'), 'the refinement changes the kind, never the classes');
  assert.deepEqual(barsOf(p), ['parks']);
  assert.equal(countsToward(p), true);
  assert.ok(presenceSteps([p, { ...p, key: 'k2' }, { ...p, key: 'k3' }], at).parks > 0, 'it lights Parks');
  const plain = { ...p, kind: 'parks' as const };
  for (const n of [1, 3, 6, 12]) {
    const many = (q: typeof p) => Array.from({ length: n }, (_, i) => ({ ...q, key: `k${i}` }));
    assert.deepEqual(presenceSteps(many(p), at), presenceSteps(many(plain), at), `${n} community parks light Parks as ${n} parks do`);
  }
});

test('presence-readers audit 11: a8.p1 town rows and town near reads are read again; a row without a level stands only under the current code', async () => {
  const { ATLAS_CODE, needsNear, rowCurrent } = await import('../../atlas/atlas');
  const at: [number, number] = [-75.38, 40.62];
  for (const level of ['neighborhood', 'town'] as const) assert.equal(rowCurrent({ build: 'b', code: 'a8.p1', level }, 'b'), false, `a8.p1 ${level} row`);
  assert.equal(needsNear([{ at, build: 'b', code: 'a8.p1', town: 'T' }], at, 'b', undefined, 'T'), true, 'a8.p1 town near read');
  const carried = `${ATLAS_CODE.split('.')[0]}.p1`;
  assert.equal(rowCurrent({ build: 'b', code: carried }, 'b'), false, 'a row with no level stands only under the current code');
  assert.equal(rowCurrent({ build: 'b', code: ATLAS_CODE }, 'b'), true);
});

test('presence-readers audit 12: presence\'s data notes name presence\'s normalizer, and the slice\'s plan names the live codes', () => {
  for (const f of ['presence/notable.json', 'discovery/parkNotable.json', 'discovery/communityWords.json']) {
    const note = (JSON.parse(readFileSync(join(lib, f), 'utf8')) as { _note: string })._note;
    assert.ok(note.includes('normalizeWords') && !note.includes('normalizeBrand'), `${f}'s note names normalizeWords`);
  }
  const plan = readFileSync(join(lib, '..', '..', 'specs', 'presence-readers', 'plan.md'), 'utf8');
  assert.ok(!/a8\.p[12]/.test(plan), 'the plan names a9.p1 and a9.p2, the codes that landed (T8)');
});
