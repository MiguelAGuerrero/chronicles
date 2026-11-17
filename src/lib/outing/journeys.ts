// @layer core
import type { LngLat } from '../types';
import type { Leg } from '../walkPlanner/planner';
import { matchesAny, type Candidate, type Want } from './candidates';
import { planOuting, type Outing, type OutingReason } from './plan';

/*
 * The journeys a page offers (OJ17-OJ19, OJ22): one per leaning that the picked chips reach, in the leanings' given order, each planned
 * by the outing's one planner over that leaning's own picks. Nothing ranks them, and two that hold the same stops are one. This file
 * holds no word of a kind of place: the leanings and the chips are data it is handed.
 */
export interface Journey {
  leaning: string;
  name: string;
  /** The picked chips this journey draws its stops from. */
  wants: Want[];
  outing: Outing;
}

export interface JourneysInput {
  cands: readonly Candidate[];
  picked: readonly Want[];
  leanings: readonly { id: string; name: string; chips: readonly string[] }[];
  from: LngLat | null;
  ceilingM: number;
}

const stopsKey = (o: Outing) => o.stops.map((s) => s.id).sort().join('|');

export function planJourneys(input: JourneysInput, leg: Leg): { journeys: Journey[]; reasons: OutingReason[] } {
  if (!input.picked.length) return { journeys: [], reasons: [] };
  if (!input.from) return { journeys: [], reasons: ['noPosition'] };
  const journeys: Journey[] = [];
  const reasons: OutingReason[] = [];
  const seen = new Set<string>();
  for (const l of input.leanings) {
    const wants = input.picked.filter((w) => l.chips.includes(w.id)).sort((a, b) => (a.id < b.id ? -1 : 1));
    if (!wants.length) continue;
    const base = { cands: input.cands, match: (c: Candidate) => matchesAny(wants, c), from: input.from, ceilingM: input.ceilingM };
    // OJ7: a loop when one can be made, else one way.
    const loop = planOuting({ ...base, mode: 'loop' }, leg);
    const r = loop.outing ? loop : planOuting({ ...base, mode: 'oneway' }, leg);
    if (!r.outing) {
      for (const x of r.reasons) if (!reasons.includes(x)) reasons.push(x);
      continue;
    }
    const key = stopsKey(r.outing);
    if (seen.has(key)) continue;
    seen.add(key);
    journeys.push({ leaning: l.id, name: l.name, wants, outing: r.outing });
  }
  return journeys.length ? { journeys, reasons: [] } : { journeys, reasons: reasons.slice(0, 1) };
}
