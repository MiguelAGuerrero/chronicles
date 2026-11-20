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
  p11: '97f1b1134c5b0b0c680c76664a92dcf829e25cff9a189d4ebd6eb98dfe439654',
};

const NAMES = [
  'Old Town Museum', 'Old-Town Museum', 'Oldtown Historic Museum', 'Old Quarters Museum', 'Olde Towne Hall', 'Old & New Gallery',
  'Historic Depot Museum', 'Discovery Museum', 'St. Mary’s Cathedral', 'Old City Playground', 'Old Mill Playground', 'Meeting House',
  '', 'Ελληνικό Μουσείο', 'Mission San Jose', 'constructor',
];

/** A plain sort, the same on every machine (tend presence audit 5: never `localeCompare`, which follows the locale). */
const plain = <T>(xs: readonly T[], key: (x: T) => string): T[] => [...xs].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));

function answers(): string {
  const tags = plain([...new Set([...p.SOURCE_TAGS, ...p.OSM_RULES.map((r) => r.cls), 'x', ''])], (t) => t);
  const classes = plain(Object.keys(p.CLASSES), (c) => c) as p.PresenceClass[];
  const out: unknown[] = [p.PRESENCE_CARRIED, plain(Object.entries(p.CLASSES), ([c]) => c), notable.words, p.ARCHIVE_CLASS_NAMES];
  // Every class list a table gives, and every pair of classes, go through every reader (tend presence audit 5: a reader that
  // reads a list otherwise, `find` for `findLast`, moved no answer of a one-class list).
  const lists = new Map<string, readonly p.PresenceClass[]>();
  const keep = (cs: readonly p.PresenceClass[]) => {
    lists.set(cs.join(','), cs);
    return cs;
  };
  for (const a of tags) {
    out.push(a, keep(p.classesOfArchive(a)), p.archiveUnnamedLabel(a), p.unnamedLabel(a), keep(p.classesOfOverture([a])), p.archiveClassOf(a, 'osm'));
    for (const b of tags) {
      out.push(keep(p.classesOfOsm(a, b)), keep(p.classesOfOverture([a, b])), p.isTransitStop(a, b), keep(p.classesOfLandcover({ class: a, subclass: b })));
    }
  }
  // Three levels of Overture's taxonomy under each root presence knows.
  const roots = tags.filter((t) => p.classesOfOverture([t]).length > 0);
  for (const r of roots) for (const b of tags) for (const c of tags) out.push(keep(p.classesOfOverture([r, b, c])));
  for (const n of NAMES) {
    out.push(n, notableName(n), notableBeyondNeighbourhood(n), readPastNeighbourhood(n), readPastNeighbourhood(n, (rest) => /playground/.test(rest)));
    for (const c of classes) out.push(keep(p.named([c], n)), keep(p.named([c, 'recorded'], n)), keep(p.named([c, 'by_type'], n)));
  }
  for (const c of classes) for (const d of classes) keep([c, d]);
  for (const c of classes) keep([c]);
  for (const [k, cs] of plain([...lists.entries()], ([k]) => k)) {
    out.push(k, p.storefrontWeight(cs), p.densityWeight(cs), p.markClassOf(cs), p.subsetOf(cs), p.barWeight(cs), p.isArtworkClass(cs));
  }
  return createHash('sha256').update(JSON.stringify(out)).digest('hex');
}

// tend presence audit 5 (2026-11-20, the diff review's auditor 4): the readers met only one-class lists, Overture only one and
// two levels, and the sort followed the locale; each now reaches every list, three levels, and a plain sort.
test('tend presence 3: a change to a presence table fails until PRESENCE_CODE moves', () => {
  const now = answers();
  assert.equal(
    now,
    FINGERPRINTS[p.PRESENCE_CODE],
    `presence answers differently under ${p.PRESENCE_CODE}: bump PRESENCE_CODE (presence.ts) and record ${now} under the new code`,
  );
  assert.equal(new Set(Object.values(FINGERPRINTS)).size, Object.keys(FINGERPRINTS).length, 'one fingerprint per code');
});
