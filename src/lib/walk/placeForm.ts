// @layer core
import type { Measures } from './placeSignals';

/*
 * How a place is laid out, in plain words (specs/place-form PF1, PF2, PF5-PF9, PF17, PF18). The words are descriptive and unordered, with no default:
 * where none fits there is no word. One table of thresholds, found on the calibration set (35 real Pennsylvania places, `__tests__/walkability/
 * placeFormCalibration.json`), each set in the gap between the places the owner confirmed on either side, and held to the held-out set that was cut
 * after (PF6). A threshold changes only with the fixtures, as `form.ts`'s do. Pure.
 */

export type FormWord = 'exit' | 'grid' | 'mainStreet' | 'village';

export interface FormEntry {
  id: FormWord;
  /** The clause a person reads, naming a layout. */
  clause: string;
  /** The measures this word is read from (PF1: each is a PF4 measure). */
  inputs: readonly (keyof Measures)[];
}

/** The table, sorted by id (PF2): no order a person could read as better or worse. */
export const FORM_WORDS: readonly FormEntry[] = [
  { id: 'exit', clause: 'Services at a highway exit', inputs: ['highwayShare', 'junctionsPerKm2'] },
  { id: 'grid', clause: 'A street grid', inputs: ['junctionsPerKm2', 'placesPerKm2'] },
  { id: 'mainStreet', clause: 'A town along a main street', inputs: ['junctionsPerKm2', 'buildingsPerKm2', 'placesPerKm2', 'highwayShare'] },
  { id: 'village', clause: 'A village along one road', inputs: ['junctionsPerKm2', 'buildingsPerKm2', 'placesPerKm2', 'highwayShare'] },
];

/**
 * The thresholds, per km² of the 800 m ring unless a share. Street-first (the second and third reviews, 2026-11-11): the street network is the best-mapped
 * signal, so the words lean on junctions and the motorway share, and use buildings and places only coarsely (Overture's coverage is uneven, PF24). Each sits
 * in a gap between confirmed places, with room for a 300 m move of the centre (PF22) and half the places and buildings (PF24). Found on the 35 calibration
 * places; three of them it does not get (the known misses in PF5). The fresh held-out set is the measure.
 */
export const FORM = {
  /** Exit: mostly motorway or trunk, few streets crossing, a few places so a failed read is never an exit (PF17). (Bethel 0.45, Breezewood 0.43, Fogelsville 0.42; the mall 0.28.) */
  exitHighwayShare: 0.35,
  exitJunctionsMax: 26,
  exitPlacesMin: 3,
  /** Grid: streets very close together, or close together with a crowd of places. (Steelton 82 alone; Bethlehem 49 with 275 places, Allentown's grid 54 with 201; Hershey 49 with 125.) */
  gridJunctionsAlone: 70,
  gridJunctions: 48,
  gridPlaces: 100,
  /** Main street: streets crossing a little, built up, a run of places but not a crowd of them, no highway. (Jonestown 28 junctions and 23 places; the mall 25; Lower Paxton 208 buildings; Lititz 117 places against Penn State's 205.) */
  mainJunctions: 27,
  mainPlaces: 20,
  mainPlacesMax: 150,
  mainBuildings: 250,
  mainHighwayMax: 0.2,
  /** Village: few streets crossing, a few buildings, almost no highway. (Rehrersburg 10 and 142 buildings, Fredericksburg 16 and 267; Park City 0.21 highway; Grantville 18 buildings.) */
  villageJunctionsMin: 8,
  villageJunctionsMax: 20,
  villageBuildingsMin: 80,
  villagePlacesMin: 3,
  villageHighwayMax: 0.15,
} as const;

/** The word for a ring's measures, or null: none fits, or it could not be measured (PF5-PF9, PF17). */
export function placeForm(m: Measures | null): FormWord | null {
  if (!m) return null;
  const { highwayShare: hwy, junctionsPerKm2: jct, placesPerKm2: places, buildingsPerKm2: buildings } = m;
  if (hwy >= FORM.exitHighwayShare && jct < FORM.exitJunctionsMax && places >= FORM.exitPlacesMin) return 'exit';
  if (jct >= FORM.gridJunctionsAlone || (jct >= FORM.gridJunctions && places >= FORM.gridPlaces)) return 'grid';
  if (jct >= FORM.mainJunctions && jct < FORM.gridJunctions && places >= FORM.mainPlaces && places < FORM.mainPlacesMax && buildings >= FORM.mainBuildings && hwy < FORM.mainHighwayMax) return 'mainStreet';
  if (jct >= FORM.villageJunctionsMin && jct < FORM.villageJunctionsMax && buildings >= FORM.villageBuildingsMin && places >= FORM.villagePlacesMin && hwy < FORM.villageHighwayMax) return 'village';
  return null;
}

/** The card's line, worded as the ring's, never the whole area's (PF18). */
export function cardLine(word: FormWord): string {
  const clause = FORM_WORDS.find((w) => w.id === word)!.clause;
  return `Around its middle: ${clause.charAt(0).toLowerCase()}${clause.slice(1)}`;
}
