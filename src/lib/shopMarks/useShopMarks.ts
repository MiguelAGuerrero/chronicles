// @layer view
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ShopMarksStatus } from '../layers/notes';
import { shopMarksStatus } from './status';
import { tilesNear } from '../tileMath';
import type { LngLat } from '../types';
import { shopMarks } from '.';
import { thin, withinOf, type Mark, type Shop } from './read';
import type { ShopMarkState } from './shell';
import { NEAR_ZOOM } from './types';

/** How far around the map's middle a read reaches, and the most z14 tiles it asks for. */
const READ_M = 1500;
const READ_TILES = 9;

/** A centre to about 1 km: a read is tried once for it, and again only when the map moves that far (as the Storefronts layer's). */
const areaKey = (c: LngLat) => `${c[0].toFixed(2)},${c[1].toFixed(2)}`;

/** What the panel says: nothing while off, "zoom in" while too far out, "reading" until the first read answers, else its state. */
const statusOf = (on: boolean, zoomedIn: boolean, state: ShopMarkState | null): ShopMarksStatus | null => (!on ? null : !zoomedIn ? 'far' : state === null ? 'reading' : state);

const idOf = (s: Shop) => `${s.type}|${s.name}|${s.at[0]}|${s.at[1]}`;

/**
 * The Shop marks layer's reads (SM1, SM2, SM6, SM7, SM10, SM12): the shops near `centre`, read from the pack only while `on` and
 * zoomed in, kept for the session, never stored, and handed to the map as marks. `near` (the walk maps) keeps only those within
 * its distance of you. Nothing is asked while off. `status` is what the panel's quiet line says (SM7).
 */
export function useShopMarks(o: {
  on: boolean;
  centre: LngLat | null;
  zoom: number | null;
  /** The walk maps: draw only within `m` of `at` (a hard cut from you, SM12). */
  near?: { at: LngLat | null; m: number } | null;
}): { marks: Mark[] } {
  const [places, setPlaces] = useState<Shop[]>([]);
  // The last read's state lives in a ref and goes to the Layers panel through its own store: no render of the screen for it.
  const state = useRef<ShopMarkState | null>(null);
  const tried = useRef(new Set<string>());
  const seen = useRef(new Map<string, Shop>());
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
    shopMarks
      .read(tilesNear([centre], READ_M, READ_TILES), centre)
      .then((r) => {
        if (!mounted.current) return;
        // A failed read is tried again at the next move of about a kilometre or the next time the layer is switched on.
        if (r.state === 'failed') tried.current.delete(key);
        // A render only when something changed: Explore re-renders on every state change (explore-dense-city DC12, the render budget).
        const before = seen.current.size;
        for (const p of r.places) seen.current.set(idOf(p), p);
        if (seen.current.size !== before) setPlaces([...seen.current.values()]);
        state.current = r.state;
        shopMarksStatus.set(statusOf(o.on, zoomedIn, state.current));
      })
      .catch(() => {
        if (!mounted.current) return;
        tried.current.delete(key);
        state.current = 'failed';
        shopMarksStatus.set('failed');
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
  // Said to the Layers panel through its own store, so the screen under it does not render for it.
  useEffect(() => {
    shopMarksStatus.set(statusOf(o.on, zoomedIn, state.current));
  }, [o.on, zoomedIn]);
  return { marks };
}
