// @layer core
// What a share came to (errors-handled audit 13): the sheet's own answer, or its error. A dismissed sheet and a
// cancelled one are neither shared nor a reason to copy; another failure copies where a clipboard is.

export type ShareResult = { action: string } | { error: { name?: unknown } };
export type ShareOutcome = 'shared' | 'cancelled' | 'copy' | 'failed';

export function shareOutcome(r: ShareResult, canCopy: boolean): ShareOutcome {
  if ('action' in r) return r.action === 'dismissedAction' ? 'cancelled' : 'shared';
  if (r.error.name === 'AbortError') return 'cancelled';
  return canCopy ? 'copy' : 'failed';
}
