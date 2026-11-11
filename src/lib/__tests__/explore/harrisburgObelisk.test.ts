import assert from 'node:assert/strict';
import { test } from 'node:test';
import { archivePlace } from '../../discovery/archivePois';
import { isMarkFor } from '../../discovery/curation';
import { isMarkable } from '../../discovery/noise';
import { classesOfOsm, markClassOf } from '../../presence/presence';

// The Harrisburg obelisk was missed (Nov 11): which data routes put it on the map without an app change.
const NAME = 'Dauphin County Veterans Memorial Obelisk';
const AT: [number, number] = [-76.8872, 40.2688]; // near Division St and N 4th St; a stand-in for the test

test('obelisk: a Wikidata obelisk reaches the app as an archive monument and is a mark (data update only)', () => {
  const p = archivePlace(NAME, 'monument', AT, 'v1');
  assert.ok(p);
  assert.equal(p.category, 'history');
  assert.equal(p.kind, 'monuments');
  assert.equal(isMarkable(p), true);
});

test('obelisk: an unnamed monument is kept as A monument (decision 0142), while an unnamed place of a class that needs a name is left out', () => {
  assert.equal(archivePlace('', 'monument', AT, 'v1')?.name, 'A monument');
  assert.equal(archivePlace('', 'folly', AT, 'v1'), null);
});

test('obelisk: an OpenStreetMap historic=monument is a mark whatever its name', () => {
  const c = markClassOf(classesOfOsm('monument', 'monument'));
  assert.ok(c);
  assert.equal(isMarkFor(c, NAME), true);
});

test('obelisk: an OpenStreetMap historic=memorial is a mark only by a notable word, so this name is not (known gap)', () => {
  const c = markClassOf(classesOfOsm('memorial', 'memorial'));
  assert.ok(c);
  assert.equal(isMarkFor(c, NAME), false);
});
