// @layer core
import { distanceM, projector } from '../geo';
import { inRings } from './green';
import type { LngLat } from '../types';
import community from './communityWords.json';
import { normalizeWords, notableName } from '../presence/notable';
import parkNotable from './parkNotable.json';
import type { Refinement } from './refine';
import type { Place } from './types';

/*
 * Community parks (specs/community-parks, PC1-PC5, PC11): the first refinement of the kind pipeline (`refine.ts`). The parks
 * of the map are one kind, `parks`, and a park that the data says is a plain neighbourhood one is the kind
 * `community_parks`, which the reader can switch off. The default
 * is a park; a demotion needs a name that says playground, playfield or the like, and nothing notable inside or near
 * it. Size never demotes (the tiles cannot see what makes a park worth the walk). Nothing says why a park is one kind or
 * the other.
 */

export const PARK_RULES = {
  /** An outline this big is never a community park (PC2): 5 ha. */
  largeM2: 50_000,
  /** With no outline, a notable place within this of the park's point keeps it a park (PC2). */
  signalNearM: 60,
  /** An archive place this near keeps a park a park (PC2, PC21: the context of the refinement, never of the merge). */
  archiveNearM: 150,
} as const;

const words = (list: readonly string[]) => list.map(normalizeWords);
const COMMUNITY = words(community.words);
const NOTABLE = words(parkNotable.words);
const hasWord = (name: string, list: readonly string[]): boolean => {
  const n = ` ${normalizeWords(name)} `;
  return list.some((w) => n.includes(` ${w} `));
};

/** PC1: the name says it is a ground for play. */
const communityName = (name: string): boolean => hasWord(name, COMMUNITY);
/**
 * PC2: the name says it is more: a park word of the refinement's own curation (`parkNotable.json`: a state park, a memorial,
 * an arboretum), or a name presence calls notable (`notableName`, the one rule; specs/presence-readers PS3, T8).
 */
const notablePark = (name: string): boolean => hasWord(name, NOTABLE) || notableName(name);

/** A place a park is not plain for (PC2): something to find that is not a park itself. */
const isSignal = (p: Place): boolean => p.markable === true && !!p.kind && p.kind !== 'parks' && p.kind !== 'community_parks' && p.kind !== 'community';

/** The area of a polygon's rings in square metres: the outside less its holes. */
function areaM2(rings: LngLat[][]): number {
  const proj = projector(rings[0][0]);
  const one = (ring: LngLat[]): number => {
    const pts = ring.map(proj);
    let s = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    return Math.abs(s) / 2;
  };
  return rings.reduce((t, r, i) => t + (i === 0 ? one(r) : -one(r)), 0);
}

/**
 * PC1-PC5, PC11: the refinement of Parks into community parks, from what the same read holds: the park outlines of the tiles'
 * `landcover` (none: judged by name and what is near the point, PC3), its other places and the places archive's. A place
 * that is not a park is never touched (`refine` judges only the parent kind).
 */
export const communityParks: Refinement = {
  id: 'community_parks',
  parent: 'parks',
  child: 'community_parks',
  judge(places, ctx) {
    const signals = places.filter(isSignal);
    return (p) => {
      if (!communityName(p.name) || notablePark(p.name)) return false;
      const outline = ctx.outlines.find((o) => inRings(p.at, o.rings));
      if (outline && (areaM2(outline.rings) >= PARK_RULES.largeM2 || signals.some((s) => inRings(s.at, outline.rings)))) return false;
      if (signals.some((s) => distanceM(s.at, p.at) <= PARK_RULES.signalNearM)) return false;
      return !ctx.archive.some((a) => distanceM(a.at, p.at) <= PARK_RULES.archiveNearM);
    };
  },
};
