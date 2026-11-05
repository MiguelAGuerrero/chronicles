// @layer core
import type { Band } from './types';

/*
 * What each band is called and why (WK21-WK23). The words are the icon's tooltip and its accessible
 * label; the reason is one short clause with no number in it. `unknown` has none: it draws nothing.
 */

const WORDS: Partial<Record<Band, string>> = { foot: 'Easy on foot', mixed: 'Mixed', car: 'Built around cars' };
const WHY: Partial<Record<Band, string>> = {
  foot: 'streets close together, with crossings.',
  mixed: 'some of both, or too little mapped to say.',
  car: 'streets far apart and busy.',
};

/** The badge on the pedestrian: none for easy on foot (the pedestrian alone), a caution, a car (WK21). */
export const BAND_BADGE: Partial<Record<Band, 'caution' | 'car' | null>> = { foot: null, mixed: 'caution', car: 'car' };

export const bandWords = (b: Band): string | null => WORDS[b] ?? null;

/** What the band means, as a sentence with no name in it, for a row that already carries the name (the legend, layers audit 12). */
export function bandWhy(b: Band): string | null {
  const w = WHY[b];
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : null;
}

/** The tooltip: the words, then why (WK22, WK23). */
export function bandTip(b: Band): string | null {
  const w = WORDS[b];
  return w ? `${w}: ${WHY[b]}` : null;
}
