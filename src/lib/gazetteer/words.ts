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

export function searchWords(): SearchWords {
  throw new Error('place-search: not built');
}

/** What a screen reader is told when the status changes, else null: on none/some/loading changes only (GZ11). */
export function announceSearch(_from: SearchStatus, _to: SearchStatus): string | null {
  throw new Error('place-search: not built');
}

/** A row's one line under the name: region and country (GZ5). */
export function placeLine(_place: { region: string; country: string }): string {
  throw new Error('place-search: not built');
}

/** Whether the magnifier is drawn: not while the walk planner's page is open (GZ17). */
export function searchAvailable(_state: { plan: boolean }): boolean {
  throw new Error('place-search: not built');
}
