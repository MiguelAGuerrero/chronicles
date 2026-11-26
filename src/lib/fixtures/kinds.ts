// @layer core
import { FIXTURE_KINDS } from '../presence/fixtureKinds';
import type { LngLat } from '../types';

export { FIXTURE_KINDS };

/*
 * A town's fixtures (specs/town-fixtures, TF1, TF5; decisions 0225, 0255, 0268): the staples a developed settlement is
 * expected to have, as chronicles-data's fixtures pack holds them. The kinds are the pack's contract's closed list, in its
 * order (the owner's thirteen, Nov 25), spelled in presence with the other sources' words (PS7); a kind the app does not
 * know is never shown. A fixture is a stop, never a find:
 * it carries its kind, its position and its name where it has one, and nothing a crowd says.
 */
export type FixtureKind = (typeof FIXTURE_KINDS)[number];

export interface Fixture {
  id: string;
  kind: FixtureKind;
  at: LngLat;
  /** Absent when the pack has none: an unnamed square is a square (decision 0268: the map shows it, a card names only the named). */
  name?: string;
  /** The pack's source code (`osm`, `wd`). */
  src: string;
}

const KINDS: ReadonlySet<string> = new Set(FIXTURE_KINDS);
const FIELDS = ['at', 'id', 'kind', 'src'];

/** TF5: true only for exactly these fields (a name optional, never empty), a known kind and a finite position. */
export function isFixture(x: unknown): x is Fixture {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => k !== 'name').sort();
  if (keys.join() !== FIELDS.join()) return false;
  if ('name' in o && (typeof o.name !== 'string' || !o.name.trim())) return false;
  if (typeof o.id !== 'string' || !o.id || typeof o.src !== 'string' || !o.src || typeof o.kind !== 'string' || !KINDS.has(o.kind)) return false;
  const at = o.at;
  return Array.isArray(at) && at.length === 2 && at.every((n) => typeof n === 'number' && Number.isFinite(n));
}
