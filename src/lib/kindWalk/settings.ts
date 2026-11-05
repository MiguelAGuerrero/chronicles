// @layer core
import type { Units } from '../units';

/*
 * The kind walk's two settings (KW8, KW11): how far the walker would like to walk, and what to do about a stretch built around
 * cars. A distance, never a time: the app knows no pace (decision 0095).
 */

const MI_M = 1609.344;

/** The default budget: about 2 km (KW8). */
export const DEFAULT_BUDGET_M = 2000;
const KM_STEPS_M = [1000, 1500, 2000, 3000, 5000] as const;
const MI_STEPS_M = [0.5, 1, 1.5, 2, 3].map((mi) => Math.round(mi * MI_M));

/** The steps a walker can set, in the displayed unit (KW8). */
export function budgetSteps(units: Units): readonly number[] {
  return units === 'mi' ? MI_STEPS_M : KM_STEPS_M;
}

/** The step nearest a stored budget, so a budget set in one unit still reads in the other. */
export function nearestStep(budgetM: number, units: Units): number {
  const steps = budgetSteps(units);
  return steps.reduce((best, s) => (Math.abs(s - budgetM) < Math.abs(best - budgetM) ? s : best), steps[0]);
}

/** One step shorter (-1) or longer (+1), stopping at the ends. */
export function stepBudget(budgetM: number, dir: -1 | 1, units: Units): number {
  const steps = budgetSteps(units);
  const at = steps.indexOf(nearestStep(budgetM, units));
  return steps[Math.min(steps.length - 1, Math.max(0, at + dir))];
}

/** What to do about a stretch built around cars (KW11): warn (the default) or don't suggest. */
export type WalkabilityPref = 'warn' | 'skip';
export const DEFAULT_PREF: WalkabilityPref = 'warn';
export const isPref = (v: unknown): v is WalkabilityPref => v === 'warn' || v === 'skip';
