// @layer core
import { distanceM, projector } from '../geo';
import { inRings } from './green';
import { onTileEdge } from '../tileMath';
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
 * is a park; a demotion needs a name that says playground, playfield or the like, or an outline under 2 ha (fix
 * community-park, 0163), and nothing notable inside or near it. Nothing says why a park is one kind or the other.
 */

export const PARK_RULES = {
  /** An outline this big is never a community park (PC2): 5 ha. */
  largeM2: 50_000,
  /** An outline under this is a small neighbourhood park, community with no sign of more (fix community-park, 0163): 2 ha. */
  smallM2: 20_000,
  /** An outline under this is a sliver (a park cut at a tile edge) and says nothing of size: 500 m2. */
  sliverM2: 500,
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
 * The phrases presence reads past for a museum (presence-and-kinds audit 5, `notableBeyondNeighbourhood`), as written there,
 * before `normalizeWords`.
 */
const NEIGHBOURHOOD = /\bold\s+(?:town|city|quarter|village|(?:and|&)\s+new)\b/gi;
/**
 * T9, tend explore audit 1: a neighbourhood's "Old Town" says nothing of a park only where a community word follows it at
 * once ("Old Town Playground", "Old City Tot Lot"); before anything else it names a building or a site ("Old Town Hall
 * Playground", "Site of the Old City Spring Ball Fields") and its "Old" is read. The refinement's own curation (0146).
 */
const pastNeighbourhood = (name: string): string =>
  name.replace(NEIGHBOURHOOD, (phrase: string, at: number) => {
    const next = ` ${normalizeWords(name.slice(at + phrase.length))} `;
    return COMMUNITY.some((w) => next.startsWith(` ${w} `)) ? ' ' : phrase;
  });
/**
 * PC2: the name says it is more: a park word of the refinement's own curation (`parkNotable.json`: a state park, a memorial,
 * an arboretum), or a name presence calls notable (`notableName`, the one rule; specs/presence-readers PS3, T8), read past a
 * neighbourhood's name just before a community word (T9).
 */
const notablePark = (name: string): boolean => hasWord(name, NOTABLE) || notableName(pastNeighbourhood(name));

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
      if (notablePark(p.name)) return false;
      // Every outline that holds the point decides together, in no order (fix community-park audit 2): the largest area, any signal
      // inside any one's outer ring (a hole is no reason to miss it), and a cut at a z14 tile edge says nothing of size (audit 1).
      const held = ctx.outlines.filter((o) => inRings(p.at, o.rings));
      const area = held.length ? Math.max(...held.map((o) => areaM2(o.rings))) : null;
      const cut = held.some((o) => o.rings[0].some((v) => onTileEdge(v)));
      // A name that says play is evidence; so is a small outline (fix community-park): a park with neither stays a park.
      const small = area !== null && !cut && area >= PARK_RULES.sliverM2 && area < PARK_RULES.smallM2;
      if (!communityName(p.name) && !small) return false;
      if (held.length && (area! >= PARK_RULES.largeM2 || held.some((o) => signals.some((s) => inRings(s.at, [o.rings[0]]))))) return false;
      if (signals.some((s) => distanceM(s.at, p.at) <= PARK_RULES.signalNearM)) return false;
      return !ctx.archive.some((a) => distanceM(a.at, p.at) <= PARK_RULES.archiveNearM);
    };
  },
};
