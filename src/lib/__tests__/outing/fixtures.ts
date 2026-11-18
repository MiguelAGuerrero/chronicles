import { at } from '../walk-planner/grid';
import type { Candidate } from '../../outing/candidates';

// Antiques and books shops on the 12 x 12 street grid of the planner's tests (120 m blocks), the same every run.
export const shop = (id: string, e: number, n: number, what: string[], name = `Shop ${id}`): Candidate => ({ id, at: at(e, n), facets: { what }, name });
export const SHOPS: Candidate[] = [
  shop('a1', 360, 120, ['antiques']),
  shop('a2', 600, 360, ['antiques']),
  shop('a3', 240, 480, ['antiques']),
  shop('a4', 840, 120, ['antiques']),
  shop('b1', 480, 240, ['books']),
  shop('b2', 1200, 1200, ['books']),
];
export const FROM = at(0, 0);
export { at };
