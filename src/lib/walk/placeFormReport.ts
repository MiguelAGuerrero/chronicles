// @layer core
import type { FormWord } from './placeForm';
import type { Measures } from './placeSignals';

/** One place in the report (specs/place-form PF16). */
export interface ReportRow {
  id: string;
  set: 'calibration' | 'heldOut';
  expected: FormWord | null;
  /** A second word the owner accepts (null: silence too), or undefined. */
  accept?: FormWord | null;
  got: FormWord | null;
  measures: Measures | null;
}

const name = (w: FormWord | null) => w ?? 'no word';
const right = (r: ReportRow) => r.got === r.expected || (r.accept !== undefined && r.got === r.accept);
const pct = (n: number, d: number) => (d ? `${n}/${d} = ${(n / d).toFixed(2)}` : 'none');

/**
 * The text of the report: each place with the owner's word, the rule's word and its measures; then, for each set, the confusion table (the owner's word
 * down, the rule's across), the accuracy and the recall (the share of places the owner gave a word that got any word, so silence cannot pass). It lives
 * in the dev tooling and the tests, never in the app (PF11).
 */
export function formatReport(rows: readonly ReportRow[]): string {
  const out: string[] = [];
  for (const set of ['calibration', 'heldOut'] as const) {
    const mine = rows.filter((r) => r.set === set);
    if (!mine.length) continue;
    out.push(`== ${set} (${mine.length} places)`);
    for (const r of mine) {
      const m = r.measures;
      const measures = m ? `places ${m.placesPerKm2.toFixed(0)}/km2, junctions ${m.junctionsPerKm2.toFixed(0)}/km2, buildings ${m.buildingsPerKm2.toFixed(0)}/km2, highway ${m.highwayShare.toFixed(2)}, chain ${m.chainShare.toFixed(2)} over ${m.chainSpanM.toFixed(0)} m` : 'not measured (a tile unread, too little street, or places or buildings not read)';
      const mark = right(r) ? 'ok  ' : 'MISS';
      out.push(`${mark} ${r.id.padEnd(16)} owner: ${name(r.expected)}${r.accept !== undefined ? ` or ${name(r.accept)}` : ''}; rule: ${name(r.got)}; ${measures}`);
    }
    const words = [...new Set(mine.flatMap((r) => [name(r.expected), name(r.got)]))].sort();
    out.push('', `confusion, ${set} (owner down, rule across): ${words.join(' | ')}`);
    for (const a of words) out.push(`  ${a.padEnd(11)} ${words.map((b) => String(mine.filter((r) => name(r.expected) === a && name(r.got) === b).length).padStart(b.length)).join(' | ')}`);
    const asked = mine.filter((r) => r.expected !== null);
    out.push('', `accuracy, ${set}: ${pct(mine.filter(right).length, mine.length)}`, `recall, ${set}: ${pct(asked.filter((r) => r.got !== null).length, asked.length)}`, '');
  }
  return out.join('\n');
}
