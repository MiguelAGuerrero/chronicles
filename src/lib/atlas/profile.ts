// @layer core
import type { CollectedFeatures } from '../../components/map/types';
import { activityFromTilePois, mergeSources, type ActivityPoint } from '../activity/points';
import type { TownOutline } from '../areas/types';
import { placesFromTiles } from '../areas/tilePlaces';
import type { ArchiveRead } from '../discovery/archive/shell';
import { placesFromTilePois, transitFromTilePois } from '../discovery/tilePois';
import { distanceM } from '../geo';
import { analyzeArea, LANDING_RULES } from '../landing/analyze';
import { deriveSegments } from '../streets';
import type { LngLat } from '../types';
import { ATLAS_RULES, ringOf, sketchOf, SKETCH, type AtlasProfile, type Within } from './atlas';
import { inExtent } from './extent';
import { findPockets, type Pocket } from './pockets';

// What an atlas ring read keeps, from its decoded tiles: pure, so it runs in the read's worker on the web like the Busy
// layer's (explore-dense-city audit 2). Moved here from atlas/read.ts, unchanged.

/** A town's whole outline, and whether the read took all its tiles (TP1-TP3). */
export interface Extent {
  outline: Pick<TownOutline, 'polygons' | 'bbox'>;
  partial: boolean;
}

/**
 * What one read keeps (AT4, AT6, AT7, AD14), from decoded tiles and Overture's places for the same
 * tiles (null without them, AD7). Pure apart from its inputs. The bars stay OpenStreetMap's (AD2), and the
 * findable kinds count only markable places (AG1). With an `extent` (a town's whole outline, TP1) the bars
 * and marks count across it, its pockets of activity are found (TP4) and its picture is drawn around the
 * busiest; without one, the 800 m ring around the point.
 */
export function profileFrom(at: LngLat, feats: CollectedFeatures, build: string, overture: { release: string; points: ActivityPoint[] } | null = null, extent: Extent | null = null, archive: ArchiveRead = null, finds: { key: string; name: string; at: LngLat }[] = []) {
  const segments = deriveSegments(feats.roads, feats.names, build);
  const places = placesFromTilePois(feats.pois, build);
  const within: Within = extent ? (p) => inExtent(p, extent.outline) : (p) => distanceM(p, at) <= ATLAS_RULES.ringM;
  // PW10: the map's places and the archive's (the owner's edits are already in it); thin from the map's alone.
  const counted = ringOf(places, archive?.places ?? null, at, within, finds, feats.landcover);
  const points = mergeSources(activityFromTilePois(feats.pois), overture?.points ?? []);
  const towns = placesFromTiles(feats.places);
  const transit = transitFromTilePois(feats.pois);
  // The analysis reads the landing radius around its centre: the segments near it are all it needs.
  const analyze = (centre: LngLat) =>
    analyzeArea({
      centre, points, towns, transit,
      segments: extent ? segments.filter((s) => s.geometry.some((l) => l.some((p) => distanceM(p, centre) <= LANDING_RULES.radiusM + 300))) : segments,
    });
  // TP4: a graded town's pockets, each named for the busiest street through it.
  const pockets: Pocket[] = extent ? findPockets(points.filter((p) => within(p.at))) : [];
  let first: ReturnType<typeof analyze> | null = null;
  const stripsAt: { name: string; peak: LngLat }[] = [];
  const named = pockets.map((pocket, i) => {
    const a = analyze(pocket.at);
    if (i === 0) first = a;
    const near = a.strips.find((s) => distanceM(s.peak, pocket.at) <= 800 && within(s.peak));
    if (near) stripsAt.push({ name: near.name, peak: near.peak });
    return { ...pocket, name: near?.name ?? null };
  });
  const view = named[0]?.at ?? at;
  const analysis = first ?? analyze(at);
  const strips = extent ? stripsAt : analysis.strips.filter((s) => within(s.peak)).map((s) => ({ name: s.name, peak: s.peak }));
  // What the frame can show: a little past the ring's corners.
  const frameM = (Math.hypot(SKETCH.w, SKETCH.h) / 2 / SKETCH.ringR) * ATLAS_RULES.ringM;
  const profile: AtlasProfile = {
    steps: counted.steps,
    thin: counted.thin,
    strips: [...new Set(strips.map((s) => s.name))],
    stripAt: strips[0]?.peak ?? (named[0]?.at ?? null),
    marks: counted.marks,
    sketch: sketchOf({
      centre: view,
      segments: segments.filter((s) => s.geometry.some((l) => l.some((p) => distanceM(p, view) <= frameM))),
      graded: analysis.graded,
      parks: places.filter((p) => p.category === 'parks').map((p) => p.at),
    }),
    overture: overture?.release ?? null,
    archive: archive?.version ?? null,
    ...(extent ? { extent: 'outline' as const, partial: extent.partial, pockets: named, ...(named[0] ? { sketchAt: view } : {}) } : { extent: 'ring' as const }),
  };
  return { profile, cache: { segments, places } };
}

