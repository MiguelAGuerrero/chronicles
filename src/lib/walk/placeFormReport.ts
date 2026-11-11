// @layer core
import type { Measures } from './placeSignals';
import type { FormWord } from './placeForm';

/** One place in the report (specs/place-form PF16). */
export interface ReportRow {
  id: string;
  set: 'calibration' | 'heldOut';
  expected: FormWord | null;
  /** A second word the owner accepts, or undefined. */
  accept?: FormWord | null;
  got: FormWord | null;
  measures: Measures | null;
}

/** The text of the report: each place with both words and its measures, the confusion table, and the accuracy and recall of each set. Not built yet (tests first). */
export function formatReport(_rows: readonly ReportRow[]): string {
  throw new Error('not built: specs/place-form PF16');
}
