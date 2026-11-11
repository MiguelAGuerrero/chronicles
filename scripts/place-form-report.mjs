// The place-form report (specs/place-form PF16): each real place, the owner's word, the rule's word and its measures, then the confusion table, the
// accuracy and the recall of each set. A dev tool; nothing here ships in the app.
//
//   npm run report:place-form
import { loadSet, readOf } from '../src/lib/__tests__/walkability/placeFormFixtures';
import { placeForm } from '../src/lib/walk/placeForm';
import { formatReport } from '../src/lib/walk/placeFormReport';
import { measureRings } from '../src/lib/walk/placeSignals';

const rows = [];
for (const [name, set] of [['Calibration', 'calibration'], ['HeldOut', 'heldOut']]) {
  const s = loadSet(name);
  if (!s) continue;
  for (const p of s.places) {
    const rings = measureRings(readOf(p));
    rows.push({ id: p.id, set, expected: p.word, accept: p.accept, got: placeForm(rings), measures: rings[0] });
  }
}
console.log(formatReport(rows));
