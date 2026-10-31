import { PbfWriter as Pbf } from 'pbf';
import type { LngLat } from '../types';

/**
 * A tiny Mapbox Vector Tile encoder, for test fixtures only: points and
 * lines, string properties, one tile. Real tiles come from the tile host,
 * which tests can't reach.
 */
export interface FixtureFeature {
  layer: string;
  props: Record<string, string>;
  /** A point, or a line. */
  coords: LngLat | LngLat[];
}

const EXTENT = 4096;

function toTile([lon, lat]: LngLat, z: number, x: number, y: number): [number, number] {
  const n = 2 ** z;
  const tx = ((lon + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const ty = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  return [Math.round((tx - x) * EXTENT), Math.round((ty - y) * EXTENT)];
}

const zig = (v: number) => (v << 1) ^ (v >> 31);

function geometry(points: [number, number][], line: boolean): number[] {
  const out: number[] = [];
  let cx = 0;
  let cy = 0;
  points.forEach(([px, py], i) => {
    if (i === 0) out.push((1 & 0x7) | (1 << 3));
    else if (i === 1) out.push((2 & 0x7) | ((points.length - 1) << 3));
    out.push(zig(px - cx), zig(py - cy));
    cx = px;
    cy = py;
  });
  return line ? out : out.slice(0, 3);
}

export function encodeTile(features: FixtureFeature[], z: number, x: number, y: number): Uint8Array {
  const pbf = new Pbf();
  const layers = [...new Set(features.map((f) => f.layer))];
  for (const name of layers) {
    const fs = features.filter((f) => f.layer === name);
    const keys: string[] = [];
    const values: string[] = [];
    const index = (list: string[], v: string) => {
      const i = list.indexOf(v);
      if (i >= 0) return i;
      list.push(v);
      return list.length - 1;
    };
    const encoded = fs.map((f) => {
      const tags: number[] = [];
      for (const [k, v] of Object.entries(f.props)) tags.push(index(keys, k), index(values, v));
      const line = Array.isArray(f.coords[0]);
      const pts = (line ? (f.coords as LngLat[]) : [f.coords as LngLat]).map((p) => toTile(p, z, x, y));
      return { tags, type: line ? 2 : 1, geom: geometry(pts, line) };
    });
    pbf.writeMessage(3, (_: unknown, p: Pbf) => {
      p.writeVarintField(15, 2);
      p.writeStringField(1, name);
      for (const f of encoded) {
        p.writeMessage(2, (__: unknown, q: Pbf) => {
          q.writePackedVarint(2, f.tags);
          q.writeVarintField(3, f.type);
          q.writePackedVarint(4, f.geom);
        }, null);
      }
      for (const k of keys) p.writeStringField(3, k);
      for (const v of values) p.writeMessage(4, (__: unknown, q: Pbf) => q.writeStringField(1, v), null);
      p.writeVarintField(5, EXTENT);
    }, null);
  }
  return pbf.finish();
}
