// @layer core
import type { RoadFeature } from '../streets';
import { outlinesOf } from './green';
import { communityParks } from './parkKind';
import { refine, type Refinement } from './refine';
import type { Kind, Place } from './types';

/*
 * The kind pipeline's registry and what reads it (community-parks PC18-PC23, decision 0144). To split a kind into finer
 * subsets, add an entry here and its child to the kinds of "What I'm into" (`explore/explore.ts`); the kind tree, the
 * switches and every consumer follow from it.
 */

/** The refinements, in the order they run. */
export const REFINEMENTS: readonly Refinement[] = [communityParks];

/** PC18: a read's places with the registry applied; `landcover` and the archive's places are what the read holds. */
export const refineRead = (places: readonly Place[], read: { landcover?: RoadFeature[]; archive?: readonly Place[] | null }): Place[] =>
  refine(places, { outlines: outlinesOf(read.landcover), archive: read.archive ?? [] }, REFINEMENTS);

/** PC20: a kind's parent, from the registry. */
export const kindParent = (kind: Kind, refinements: readonly Refinement[] = REFINEMENTS): Kind | undefined => refinements.find((r) => r.child === kind)?.parent;

/** PC20: the kind, then its parent, then its parent's parent. */
export function kindChain(kind: Kind, refinements: readonly Refinement[] = REFINEMENTS): Kind[] {
  const chain: Kind[] = [kind];
  for (let p = kindParent(kind, refinements); p && !chain.includes(p); p = kindParent(p, refinements)) chain.push(p);
  return chain;
}

/** PC20, PC22: whether a kind is switched off, by itself or by a parent. A place with no kind is never hidden by a kind. */
export const isKindHidden = (hidden: ReadonlySet<Kind>, kind: Kind | undefined): boolean => !!kind && kindChain(kind).some((k) => hidden.has(k));

/** PC20, PC23: how a kind's switch reads: `on` as seen, `locked` while a parent is off (it cannot be switched on under it). */
export function kindSwitch(hidden: ReadonlySet<Kind>, kind: Kind): { on: boolean; locked: boolean } {
  const locked = kindChain(kind).slice(1).some((k) => hidden.has(k));
  return { on: !isKindHidden(hidden, kind), locked };
}

/** PC23: the rows of "What I'm into", in order, each with its depth under its parent; a subset shows only while its parent is on. */
export function kindRows<T extends { id: Kind }>(kinds: readonly T[], hidden: ReadonlySet<Kind>): { kind: T; depth: number }[] {
  return kinds
    .filter((k) => !kindChain(k.id).slice(1).some((p) => hidden.has(p)))
    .map((kind) => ({ kind, depth: kindChain(kind.id).length - 1 }));
}
