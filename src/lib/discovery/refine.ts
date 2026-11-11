// @layer core
import type { GreenArea } from './green';
import type { Kind, Place } from './types';

/*
 * The kind pipeline's engine (community-parks PC18-PC21, decision 0142): a stage that splits a kind into finer ones.
 *
 *   source adapters -> presence classes -> curation (marks) -> merge of sources -> refinement (here) -> the reader's switches
 *
 * Each stage is a pure function over data; the shells only feed it a read. A refinement says which places of a parent
 * kind belong to a child kind. A place keeps one kind. Nothing here knows a kind by name: a new subset is a new entry in a
 * registry (`refinements.ts`), plus its words in a JSON file where it has any.
 */

/** What a read holds besides the places themselves: the park outlines of its tiles, and the places archive's. */
export interface RefineContext {
  readonly outlines: readonly GreenArea[];
  readonly archive: readonly Place[];
}

/** Splits `parent` into `parent` and `child`. `judge` sees the whole run once and answers, per place, "is it the child?". */
export interface Refinement {
  readonly id: string;
  readonly parent: Kind;
  readonly child: Kind;
  judge(places: readonly Place[], ctx: RefineContext): (place: Place) => boolean;
}

/**
 * PC18, PC19: the places with each refinement applied in order, so a child may be the parent of a later one. Returns new
 * places and never changes its input; a place whose kind is not a refinement's parent is returned as it is.
 */
export function refine(places: readonly Place[], ctx: RefineContext, refinements: readonly Refinement[]): Place[] {
  return refinements.reduce<Place[]>((acc, r) => {
    const isChild = r.judge(acc, ctx);
    return acc.map((p) => (p.kind === r.parent && isChild(p) ? { ...p, kind: r.child } : p));
  }, [...places]);
}
