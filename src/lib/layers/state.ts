// @layer core
import { distanceM } from '../geo';
import { nearAreas, type LandingRow } from '../landing/view';
import type { LngLat } from '../types';
import { LAYERS, type LayerDef } from './registry';

/*
 * What is on (ML2, ML7): one value per layer, kept as one setting for every map. Built from the registry, so
 * a layer added later gets its default and nothing already chosen moves.
 */

export type LayerState = Record<string, boolean>;

export function layerDefaults(layers: readonly LayerDef[] = LAYERS): LayerState {
  return Object.fromEntries(layers.map((l) => [l.id, l.defaultOn]));
}

export const encodeLayers = (s: LayerState): string => JSON.stringify(s);

/**
 * The stored setting, read tolerantly: junk, missing parts and unknown layers read as defaults. With no stored setting,
 * the old walkability switch (`walk_layer`, '1' on) seeds Walkability once, so nobody who turned it on has it turned off.
 */
export function decodeLayers(raw: string | null, legacyWalk: string | null, layers: readonly LayerDef[] = LAYERS): LayerState {
  const out = layerDefaults(layers);
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  const stored = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  if (!stored && (legacyWalk === '1' || legacyWalk === '0') && 'walkability' in out) out.walkability = legacyWalk === '1';
  if (stored) for (const l of layers) if (typeof stored[l.id] === 'boolean') out[l.id] = stored[l.id] as boolean;
  return out;
}

/** ML9: Busy streets are read once when nothing remembered lies within this of the map's centre. */
export const BUSY_READ_M = 1500;

export const needsBusyRead = (rows: readonly { centre: LngLat }[], at: LngLat): boolean => !rows.some((r) => distanceM(r.centre, at) <= BUSY_READ_M);

/**
 * Which remembered areas are near a centre, as a key: a walker's fix a few metres on is the same key, so the busy streets
 * are drawn again only when the set of areas near changes (layers audit 2), never once a fix.
 */
export const nearKey = (rows: readonly LandingRow[], centre: LngLat | null): string => (centre ? nearAreas([...rows], centre).map((r) => r.key).join('|') : '');

/**
 * Whether the Busy layer's read starts now (DC9): it is on, no remembered area covers the centre, this place was not tried
 * yet, and the map is still. A move before it starts waits for that move to settle.
 */
export const busyReadDue = (s: { on: boolean; needs: boolean; tried: boolean; moving: boolean }): boolean => s.on && s.needs && !s.tried && !s.moving;
