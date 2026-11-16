// @layer core
/** What the search says (GZ2, GZ5, GZ8, GZ11): no digit, no rank word, no apology. */
export type SearchStatus = 'idle' | 'loading' | 'none' | 'some' | 'unavailable';

export interface SearchWords {
  open: string;
  close: string;
  clear: string;
  label: string;
  prompt: string;
  loading: string;
  none: string;
  wayOn: string;
  unavailable: string;
  retry: string;
  more: string;
}

const WORDS: SearchWords = {
  open: 'Search places',
  close: 'Close search',
  clear: 'Clear',
  label: 'Search towns and cities',
  prompt: 'Type the start of a name.',
  loading: 'Getting ready…',
  none: 'No towns or cities start like that.',
  wayOn: 'Smaller places are reached by Move map.',
  unavailable: 'Search is unavailable.',
  retry: 'Try again',
  more: 'Keep typing to narrow it.',
};

export function searchWords(): SearchWords {
  return WORDS;
}

/** What a screen reader is told when the status changes, else null: on none/some/loading changes only (GZ11). */
export function announceSearch(from: SearchStatus, to: SearchStatus): string | null {
  if (from === to) return null;
  if (to === 'some') return 'Matches listed';
  if (to === 'none') return 'No matches';
  if (to === 'loading') return WORDS.loading;
  if (to === 'unavailable') return WORDS.unavailable;
  return null;
}

/** A row's one line under the name: region and country (GZ5). */
export function placeLine(place: { region: string; country: string }): string {
  return [place.region, place.country].filter(Boolean).join(', ');
}

/** Whether the magnifier is drawn: not while the walk planner's page is open (GZ17). */
export function searchAvailable(state: { plan: boolean }): boolean {
  return !state.plan;
}
