// @layer core
import type { Measures } from './placeSignals';

/*
 * How a place is laid out, in plain words (specs/place-form PF1, PF2, PF5-PF9, PF17, PF18). The words are descriptive and unordered, with no default:
 * where none fits there is no word. One table of thresholds, found on the calibration set (18 real Pennsylvania places, `__tests__/walkability/
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

/** The thresholds, per km² of the 800 m ring unless a share. Each sits in the gap between confirmed places on either side (the comment gives the nearest on each). */
export const FORM = {
  /** Exit: mostly motorway and trunk, few streets crossing. (Bethel 0.45 and Breezewood 0.43; the mall, the nearest other, 0.28.) */
  exitHighwayShare: 0.35,
  exitJunctionsMax: 20,
  /** Grid: streets close together and many places. (Allentown's grid 54 and 201; Lower Paxton 45 and Kutztown's 106 below.) */
  gridJunctions: 50,
  gridPlaces: 150,
  /** Main street: streets crossing a little, built up, a run of places, no highway. (Jonestown 28 and 470 buildings; the mall 25 and 380; Lower Paxton 208.) */
  mainJunctions: 27,
  mainBuildings: 400,
  mainPlaces: 15,
  mainHighwayMax: 0.2,
  /** Village: few streets crossing, few buildings, almost no highway. (Friedensburg 11 and 169, Fredericksburg 16 and 267; Park City's 0.21 highway.) */
  villageJunctionsMin: 8,
  villageJunctionsMax: 20,
  villageBuildingsMin: 120,
  villageBuildingsMax: 350,
  villagePlacesMin: 5,
  villageHighwayMax: 0.15,
} as const;

/** The word for a ring's measures, or null: none fits, or it could not be measured (PF5-PF9, PF17). */
export function placeForm(m: Measures | null): FormWord | null {
  if (!m) return null;
  if (m.highwayShare >= FORM.exitHighwayShare && m.junctionsPerKm2 < FORM.exitJunctionsMax) return 'exit';
  if (m.junctionsPerKm2 >= FORM.gridJunctions && m.placesPerKm2 >= FORM.gridPlaces) return 'grid';
  if (m.junctionsPerKm2 >= FORM.mainJunctions && m.buildingsPerKm2 >= FORM.mainBuildings && m.placesPerKm2 >= FORM.mainPlaces && m.highwayShare < FORM.mainHighwayMax) return 'mainStreet';
  if (
    m.junctionsPerKm2 >= FORM.villageJunctionsMin &&
    m.junctionsPerKm2 < FORM.villageJunctionsMax &&
    m.buildingsPerKm2 >= FORM.villageBuildingsMin &&
    m.buildingsPerKm2 <= FORM.villageBuildingsMax &&
    m.placesPerKm2 >= FORM.villagePlacesMin &&
    m.highwayShare < FORM.villageHighwayMax
  )
    return 'village';
  return null;
}

/** The card's line, worded as the ring's, never the whole area's (PF18). */
export function cardLine(word: FormWord): string {
  const clause = FORM_WORDS.find((w) => w.id === word)!.clause;
  return `Around its middle: ${clause.charAt(0).toLowerCase()}${clause.slice(1)}`;
}
