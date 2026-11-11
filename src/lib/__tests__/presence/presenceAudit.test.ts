import assert from 'node:assert/strict';
import test from 'node:test';
import { LANDING_RULES } from '../../landing/analyze';
import { isStale, LANDING_CODE, LANDING_VERSION, rulesCurrent, type LandingRow } from '../../landing/view';

// presence audit 1: PR6 put PRESENCE_CODE into LANDING_VERSION, so every area remembered before the slice dropped out of
// the Busy layer and said "Analyzed before an update" though presence p1 changed no density weight (PR4, PR8). A row
// from just before presence stands; one from an older landing code does not.

const before = `${LANDING_CODE}:${JSON.stringify(LANDING_RULES)}`;
const row = (rules: string): LandingRow => ({ key: 'k', centre: [-75.47, 40.6], analysis: { basis: 'density', reason: 'Busiest area', pockets: [], strips: [], graded: [], landing: null } as never, build: 'b1', rules, analyzed_at: 0, overture: null });

test('presence audit 1: a landing row from before presence still lists and is not stale', () => {
  assert.notEqual(before, LANDING_VERSION, 'the version did change (PR6)');
  assert.equal(rulesCurrent(before), true);
  assert.equal(isStale(row(before), 'b1'), false);
  assert.equal(rulesCurrent(LANDING_VERSION), true);
});

test('presence audit 1: an older landing code is still stale', () => {
  const older = `l3:${JSON.stringify(LANDING_RULES)}`;
  assert.equal(rulesCurrent(older), false);
  assert.equal(isStale(row(older), 'b1'), true);
});

// presence audit 2: PR2 looked for three words only, so a second table keyed by other poi classes would have passed.
// These are the names only a tag table spells (OpenMapTiles poi classes and Overture roots presence maps). A module may
// spell one only as a presence class (curation) or as the places archive's own contract class (archivePois, which moves
// onto presence in the second slice: docs/DEFERRED.md).
const TAG_WORDS = ['restaurant', 'fast_food', 'art_gallery', 'theme_park', 'dog_park', 'picnic_site', 'town_hall', 'community_centre', 'nature_reserve',
  'place_of_worship', 'ice_cream', 'alcohol_shop', 'clothing_store', 'department_store', 'arts_and_entertainment', 'cultural_and_historic',
  'lifestyle_services', 'services_and_business', 'food_and_drink', 'memorial', 'cemetery', 'museum'];
const spells = (text: string, w: string) => new RegExp(`(['"]${w}['"]|\\b${w}:)`).test(text);
const ALLOWED: Record<string, (w: string) => boolean> = {
  'discovery/curation.ts': (w) => ['nature_reserve', 'memorial', 'cemetery'].includes(w),
  'discovery/archivePois.ts': (w) => ['memorial', 'cemetery', 'museum'].includes(w),
};

test('presence audit 2: the matcher finds a table keyed by poi classes', () => {
  assert.ok(spells('const T = { restaurant: 1, cafe: 1 };', 'restaurant'));
  assert.ok(spells("if (cls === 'town_hall') return 2;", 'town_hall'));
  assert.ok(!spells('const restaurants = 1; // a restaurant', 'restaurant'));
});

test('presence audit 2: no module outside presence spells a poi class or an Overture root but as allowed', async () => {
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join, relative } = await import('node:path');
  const lib = join(__dirname, '..', '..');
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) { if (f !== '__tests__' && f !== 'presence') walk(p); } else if (/\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk(lib);
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    const rel = relative(lib, f);
    for (const w of TAG_WORDS) if (spells(text, w)) assert.ok(ALLOWED[rel]?.(w), `${rel} spells "${w}": a tag table outside presence`);
  }
});
