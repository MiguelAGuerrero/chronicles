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
 * The thresholds, per km² of the 800 m ring unless a share. Each sits in the gap between confirmed places on either side (the comment names the nearest on
 * each). Retuned on 2026-11-11 on 35 places: the first 18, and the first held-out set of 17 folded in after it scored 0.71 (PF6); the fresh held-out set that
 * follows is the measure.
 */
export const FORM = {
  /** Exit: a quarter or more of the street is motorway or trunk, few streets cross and few places stand. (Morgantown 0.27, 25 and 38 places; Park City 0.21; the mall has 103 places; Bethel's 15 against none, which is a failed read and no layout, PF17.) */
  exitHighwayShare: 0.25,
  exitJunctionsMax: 26,
  exitPlacesMin: 5,
  exitPlacesMax: 60,
  /** Grid: streets close together with many places, or very close together with whatever places are mapped (a town of rowhouses). (Bethlehem 49 and 275; Hershey 49 and 125; Steelton 82 and 31; Lower Paxton 45.) */
  gridJunctions: 48,
  gridPlaces: 150,
  gridJunctionsAlone: 70,
  /** Main street: streets crossing a little, built up, a run of places but not a crowd of them, no highway. (Jonestown 28 and 470 buildings; the mall 25 and 380; Womelsdorf 410; Lower Paxton 208; Lititz 117 places against Penn State's 205.) */
  mainJunctions: 27,
  mainBuildings: 400,
  mainPlaces: 15,
  mainPlacesMax: 150,
  mainHighwayMax: 0.2,
  /** Village: few streets crossing, few buildings, almost no highway. (Rehrersburg 10 and 142, Fredericksburg 16 and 267; Park City 0.21 highway; Grantville 18 buildings.) */
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
  if (m.highwayShare >= FORM.exitHighwayShare && m.junctionsPerKm2 < FORM.exitJunctionsMax && m.placesPerKm2 >= FORM.exitPlacesMin && m.placesPerKm2 < FORM.exitPlacesMax) return 'exit';
  if ((m.junctionsPerKm2 >= FORM.gridJunctions && m.placesPerKm2 >= FORM.gridPlaces) || m.junctionsPerKm2 >= FORM.gridJunctionsAlone) return 'grid';
  if (
    m.junctionsPerKm2 >= FORM.mainJunctions &&
    m.buildingsPerKm2 >= FORM.mainBuildings &&
    m.placesPerKm2 >= FORM.mainPlaces &&
    m.placesPerKm2 < FORM.mainPlacesMax &&
    m.highwayShare < FORM.mainHighwayMax
  )
    return 'mainStreet';
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
