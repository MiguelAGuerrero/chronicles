// @layer core

/*
 * The urban-form rule (specs/walkability-urban-form UF4-UF7): how an area treats someone on foot, judged from how the
 * ground is built, not from how well it is mapped. One table of starting values, pinned by real fixtures (five places
 * cut from Overture's tiles, walkForm.test.ts) and changed only with them. Pure. Nothing here is shown as a number (UF12).
 */

export const FORM = {
  /** A cell is a square of about this (m); its neighbourhood is the ground within `radiusM` of its centre. */
  cellM: 250,
  radiusM: 450,
  /** Under this much street in a neighbourhood there is too little to say: a park, water, open land (UF7). */
  minStreetM: 300,
  /** Street junctions per km² (UF4): high, and middling. A gridded walkable place has about 50 to 150; a car park's connectors are not counted (UF3). */
  junctionHigh: 45,
  junctionMid: 30,
  /** Mapped evidence that raises a middling cell: crosswalks per km², or sidewalk metres per metre of local street. */
  crosswalksPerKm2: 15,
  sidewalkRatio: 0.3,
  /**
   * A foot cell is at most this much arterial road, more where crossings or sidewalks are mapped (a downtown's main streets
   * are arterial by class and still walkable); over `arterialCar` of it is car, over the second with evidence.
   */
  arterialMax: 0.5,
  arterialMaxEvidence: 0.75,
  arterialCar: 0.6,
  arterialCarEvidence: 0.85,
  /** Weighted places per km² that lift a middling cell to foot (UF6). */
  placesPerKm2: 150,
} as const;

export type CellBand = 'foot' | 'car' | 'neither' | 'empty';

/** What is measured of a cell's neighbourhood. */
export interface Signals {
  /** Metres of street: local streets and arterials, nothing else (UF2). */
  streetM: number;
  junctionsPerKm2: number;
  /** Arterial length over all street length, 0 to 1. */
  arterialShare: number;
  crosswalksPerKm2: number;
  /** Mapped sidewalk metres per metre of local street. */
  sidewalkRatio: number;
  /** Weighted places per km², or null when none were read (UF6). */
  placesPerKm2: number | null;
}

/** UF4-UF7: the band of one cell. Evidence only raises a reading; places only lift a middle one. */
export function judge(s: Signals): CellBand {
  if (s.streetM < FORM.minStreetM) return 'empty';
  const evidence = s.crosswalksPerKm2 >= FORM.crosswalksPerKm2 || s.sidewalkRatio >= FORM.sidewalkRatio;
  const notArterial = s.arterialShare <= (evidence ? FORM.arterialMaxEvidence : FORM.arterialMax);
  if (s.arterialShare > (evidence ? FORM.arterialCarEvidence : FORM.arterialCar)) return 'car';
  if (notArterial && (s.junctionsPerKm2 >= FORM.junctionHigh || (s.junctionsPerKm2 >= FORM.junctionMid && evidence))) return 'foot';
  if (s.junctionsPerKm2 < FORM.junctionMid && !evidence) return 'car';
  if (s.placesPerKm2 !== null && s.placesPerKm2 >= FORM.placesPerKm2 && notArterial) return 'foot';
  return 'neither';
}
