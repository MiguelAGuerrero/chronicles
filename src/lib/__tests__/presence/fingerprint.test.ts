// tend presence 3 (2026-11-19, the lenses' auditor 2): a presence table could change with every test green and no PRESENCE_CODE
// bump, so cached atlas and landing rows would stand on answers presence no longer gives (the rule: "Change a class or a table,
// bump PRESENCE_CODE"). This test reads what presence answers, not its source, and pins that to the code.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import notable from '../../presence/notable.json';
import { notableBeyondNeighbourhood, notableName, readPastNeighbourhood } from '../../presence/notable';
import * as p from '../../presence/presence';

/**
 * What presence answers, by code. A table, a class, a weight or the word list changed: bump `PRESENCE_CODE` (carrying the last
 * code only when nothing derived moved, `PRESENCE_CARRIED`), then record the new fingerprint under the new code. Never replace a
 * code's fingerprint.
 */
const FINGERPRINTS: Readonly<Record<string, string>> = {
  p11: '81bc1f2634a195d23ceefbe72c0793d6bdb465bbfb839e6e1749f05ea5527489',
};

const NAMES = [
  'Old Town Museum', 'Old-Town Museum', 'Oldtown Historic Museum', 'Old Quarters Museum', 'Olde Towne Hall', 'Old & New Gallery',
  'Historic Depot Museum', 'Discovery Museum', 'St. Mary’s Cathedral', 'Old City Playground', 'Old Mill Playground', 'Meeting House',
  '', 'Ελληνικό Μουσείο', 'Mission San Jose', 'constructor',
];

function answers(): string {
  const tags = [...new Set([...p.SOURCE_TAGS, ...p.OSM_RULES.map((r) => r.cls), 'x', ''])].sort();
  const out: unknown[] = [p.PRESENCE_CARRIED, Object.entries(p.CLASSES).sort(([a], [b]) => a.localeCompare(b)), notable.words, p.ARCHIVE_CLASS_NAMES];
  for (const a of tags) {
    out.push(a, p.classesOfArchive(a), p.archiveUnnamedLabel(a), p.unnamedLabel(a), p.classesOfOverture([a]), p.archiveClassOf(a, 'osm'));
    for (const b of tags) {
      out.push(p.classesOfOsm(a, b), p.classesOfOverture([a, b]), p.isTransitStop(a, b), p.classesOfLandcover({ class: a, subclass: b }));
    }
  }
  for (const n of NAMES) {
    out.push(n, notableName(n), notableBeyondNeighbourhood(n), readPastNeighbourhood(n), readPastNeighbourhood(n, (rest) => /playground/.test(rest)));
    for (const c of Object.keys(p.CLASSES) as p.PresenceClass[]) out.push(p.named([c], n), p.named([c, 'recorded'], n), p.named([c, 'by_type'], n));
  }
  for (const c of Object.keys(p.CLASSES) as p.PresenceClass[]) {
    out.push(p.storefrontWeight([c]), p.densityWeight([c]), p.markClassOf([c]), p.subsetOf([c]), p.barWeight([c]), p.isArtworkClass([c]));
  }
  return createHash('sha256').update(JSON.stringify(out)).digest('hex');
}

test('tend presence 3: a change to a presence table fails until PRESENCE_CODE moves', () => {
  const now = answers();
  assert.equal(
    now,
    FINGERPRINTS[p.PRESENCE_CODE],
    `presence answers differently under ${p.PRESENCE_CODE}: bump PRESENCE_CODE (presence.ts) and record ${now} under the new code`,
  );
  assert.equal(new Set(Object.values(FINGERPRINTS)).size, Object.keys(FINGERPRINTS).length, 'one fingerprint per code');
});
