import { useMemo } from 'react';
import { bordersFor, outlineIdAt } from '../../lib/areas/borders';
import { BORDER_ZOOM, OUTLINE_ZOOM } from '../../lib/areas/outlines';
import { useOutlineSet } from '../../lib/areas/useOutlineSet';
import { useBusyLayer } from '../../lib/layers/useBusyLayer';
import { useLayers } from '../../lib/layers/useLayers';
import type { LngLat } from '../../lib/types';
import { useRouteWarning } from '../../lib/walk/useRouteWarning';
import { useWalkability } from '../../lib/walk/useWalkability';

/**
 * The map's layers on both states (ML): town borders around you (TB4), walkability (WK13), busy streets,
 * and the quiet heads-up line before a stretch built around cars on the route (WK15).
 */
export function useWalkLayers(a: { walking: boolean; here: LngLat | null; readyWalker: LngLat | null; routePath: LngLat[] | null }) {
  const { here } = a;
  // Town borders around you on both states: the walker on the walk, the ready map's fix before it.
  const borderAt = a.walking ? here : a.readyWalker;
  // Town borders (TB4): thin lines around you, the town you're in firmer, no fill, so the trace and fog read as before.
  const drawnBorders = useOutlineSet([borderAt], BORDER_ZOOM);
  const decidedBorders = useOutlineSet([borderAt], OUTLINE_ZOOM);
  const hereTown = borderAt ? outlineIdAt(borderAt, decidedBorders) : null;
  // Ordered by distance from where you are to a few hundred metres, so the shapes aren't rebuilt per fix (TB9).
  const nearKey = borderAt ? `${borderAt[0].toFixed(2)},${borderAt[1].toFixed(2)}` : '';
  const borders = useMemo(() => {
    const near = nearKey ? (nearKey.split(',').map(Number) as LngLat) : null;
    return bordersFor(drawnBorders, { firm: hereTown ? [hereTown] : [], near });
  }, [drawnBorders, hereTown, nearKey]);
  // Walkability (WK13, WK15): the layer around you, and a quiet line before a stretch built around cars on the route.
  const layers = useLayers();
  const wk = useWalkability(here, !!layers.on.walkability);
  const busy = useBusyLayer(here, !!layers.on.busy);
  const aheadLine = useRouteWarning(a.routePath, here, !!layers.on.walkability);
  return { borders, layers, wk, busy, aheadLine };
}

export type WalkLayers = ReturnType<typeof useWalkLayers>;
