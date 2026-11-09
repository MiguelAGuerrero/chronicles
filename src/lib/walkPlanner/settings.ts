// @layer core
import { DEFAULT_BUDGET_M, nearestStep } from '../kindWalk/settings';
import type { Units } from '../units';

/*
 * The planner's settings (WP8, WP10-WP12): a loop or a one-way, a hard distance ceiling (steps in kindWalk/settings), and how much
 * of the kind a route must pass, in words that never imply a number.
 */

export type Mode = 'loop' | 'oneway';
export const DEFAULT_MODE: Mode = 'loop';
export const isMode = (v: unknown): v is Mode => v === 'loop' || v === 'oneway';

/** How much of the kind a route must pass to be offered (WP11). The thresholds are never shown. */
export type Density = 'anywhere' | 'some' | 'plenty';
export const DENSITIES: readonly Density[] = ['anywhere', 'some', 'plenty'];
export const DEFAULT_DENSITY: Density = 'anywhere';
export const isDensity = (v: unknown): v is Density => v === 'anywhere' || v === 'some' || v === 'plenty';

/** The share of a route's length that must lie in the kind's cells for each setting. */
export const DENSITY_SHARE: Record<Density, number> = { anywhere: 0, some: 0.15, plenty: 0.4 };

export const DEFAULT_CEILING_M = DEFAULT_BUDGET_M;

/** The ceiling in force: the step the settings show in the displayed unit, so what is shown is what is enforced (walk planner audit 6). */
export const ceilingFor = (budgetM: number, units: Units): number => nearestStep(budgetM, units);
