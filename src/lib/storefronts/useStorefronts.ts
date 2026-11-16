// @layer view
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StorefrontsStatus } from '../layers/notes';
import { tilesNear } from '../tileMath';
import type { LngLat } from '../types';
import { storefronts } from '.';
import { thin, withinOf, type Mark, type Storefront } from './read';
import type { StorefrontState } from './shell';
import { NEAR_ZOOM } from './types';

/** How far around the map's middle a read reaches, and the most z14 tiles it asks for. */
const READ_M = 1500;
const READ_TILES = 9;

/** A centre to about 1 km: a read is tried once for it, and again only when the map moves that far (as Busy streets'). */
const areaKey = (c: LngLat) => `${c[0].toFixed(2)},${c[1].toFixed(2)}`;

const idOf = (s: Storefront) => `${s.type}|${s.name}|${s.at[0]}|${s.at[1]}`;

/**
 * The Storefronts layer's reads (SF1, SF2, SF6, SF7, SF10, SF12): the shops near `centre`, read from the pack only while `on` and
 * zoomed in, kept for the session, never stored, and handed to the map as marks. `near` (the walk maps) keeps only those within
 * its distance of you. Nothing is asked while off. `status` is what the panel's quiet line says (SF7).
 */
export function useStorefronts(o: {
  on: boolean;
  centre: LngLat | null;
  zoom: number | null;
  /** The walk maps: draw only within `m` of `at` (a hard cut from you, SF12). */
  near?: { at: LngLat | null; m: number } | null;
}): { marks: Mark[]; status: StorefrontsStatus | null } {
  const [places, setPlaces] = useState<Storefront[]>([]);
  const [state, setState] = useState<StorefrontState | null>(null);
  const [reading, setReading] = useState(false);
  const tried = useRef(new Set<string>());
  const seen = useRef(new Map<string, Storefront>());
  // A read is dropped only when the screen is gone, never because a render gave the centre a new identity (the live walk's fix does).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const zoomedIn = o.zoom != null && o.zoom >= NEAR_ZOOM;
  const key = o.centre ? areaKey(o.centre) : '';
  const centre = o.centre;
  useEffect(() => {
    if (!o.on || !zoomedIn || !centre || tried.current.has(key)) return;
    tried.current.add(key);
    setReading(true);
    storefronts
      .read(tilesNear([centre], READ_M, READ_TILES), centre)
      .then((r) => {
        if (!mounted.current) return;
        // A failed read is tried again at the next move of about a kilometre or the next time the layer is switched on.
        if (r.state === 'failed') tried.current.delete(key);
        for (const p of r.places) seen.current.set(idOf(p), p);
        setPlaces([...seen.current.values()]);
        setState(r.state);
        setReading(false);
      })
      .catch(() => {
        if (!mounted.current) return;
        tried.current.delete(key);
        setState('failed');
        setReading(false);
      });
  }, [o.on, zoomedIn, centre, key]);
  // Switching the layer off forgets what it tried, so switching it on asks again (and a failure is not remembered).
  useEffect(() => {
    if (!o.on) tried.current.clear();
  }, [o.on]);
  const nearAt = o.near?.at ?? null;
  const nearM = o.near?.m ?? 0;
  const zoom = o.zoom;
  const marks = useMemo(() => {
    if (!o.on || zoom == null || zoom < NEAR_ZOOM) return [];
    const shown = o.near ? (nearAt ? withinOf(places, nearAt, nearM) : []) : places;
    return thin(shown, zoom);
    // `o.near` is read through its two parts, which are what change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.on, zoom, places, nearAt, nearM]);
  const status: StorefrontsStatus | null = !o.on ? null : !zoomedIn ? 'far' : reading ? 'reading' : (state ?? null);
  return { marks, status };
}
