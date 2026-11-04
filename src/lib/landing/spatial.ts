/** Planar helpers for the area analysis, in metres in a local frame. Pure. */

export type XY = [number, number];

/** Nearest point on a polyline (metres in the local frame), with its distance. */
export function nearestOn(p: XY, line: XY[]): { q: XY; d: number } {
  let best: XY = line[0];
  let bestD = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    const q: XY = [a[0] + t * dx, a[1] + t * dy];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < bestD) [best, bestD] = [q, d];
  }
  return { q: best, d: bestD };
}

/** Points bucketed by a square grid, for "what's within r of here". */
export class Buckets<T> {
  private cells = new Map<number, { p: XY; v: T }[]>();
  constructor(private size: number) {}
  private key(cx: number, cy: number) {
    return (cx + 50_000) * 100_003 + (cy + 50_000);
  }
  add(p: XY, v: T) {
    const k = this.key(Math.floor(p[0] / this.size), Math.floor(p[1] / this.size));
    const list = this.cells.get(k);
    if (list) list.push({ p, v });
    else this.cells.set(k, [{ p, v }]);
  }
  /** Calls `fn` for each point within r. */
  each(p: XY, r: number, fn: (v: T, q: XY, d: number) => void) {
    const x0 = Math.floor((p[0] - r) / this.size);
    const x1 = Math.floor((p[0] + r) / this.size);
    const y0 = Math.floor((p[1] - r) / this.size);
    const y1 = Math.floor((p[1] + r) / this.size);
    const r2 = r * r;
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const list = this.cells.get(this.key(x, y));
        if (!list) continue;
        for (const e of list) {
          const dx = e.p[0] - p[0];
          const dy = e.p[1] - p[1];
          const d2 = dx * dx + dy * dy;
          if (d2 <= r2) fn(e.v, e.p, Math.sqrt(d2));
        }
      }
  }
  near(p: XY, r: number): { p: XY; v: T }[] {
    const out: { p: XY; v: T }[] = [];
    this.each(p, r, (v, q) => out.push({ p: q, v }));
    return out;
  }
}

export function hull(points: XY[]): XY[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: XY[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: XY[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * Groups points by single linkage within `gap` (metres), using buckets. Each
 * group's length is its shortest joining tree (the Kruskal edges, all within
 * `gap`): along a street, how far the run goes, bends and loops included.
 */
export function linkWithin(points: XY[], gap: number, withLength = true): { members: number[]; length: number }[] {
  const parent = points.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  {
    // Points in one cell of side gap/√2 are all within the gap: join them at once, then join
    // neighbouring cells at their first pair within the gap.
    const side = gap / Math.SQRT2;
    const cells = new Map<number, number[]>();
    const keyOf = (cx: number, cy: number) => (cx + 50_000) * 100_003 + (cy + 50_000);
    points.forEach((p, i) => {
      const k = keyOf(Math.floor(p[0] / side), Math.floor(p[1] / side));
      const list = cells.get(k);
      if (list) {
        parent[find(i)] = find(list[0]);
        list.push(i);
      } else cells.set(k, [i]);
    });
    const g2 = gap * gap;
    for (const [k, list] of cells) {
      const cx = Math.floor(k / 100_003) - 50_000;
      const cy = (k % 100_003) - 50_000;
      for (let dx = -2; dx <= 2; dx++)
        for (let dy = -2; dy <= 2; dy++) {
          if (dx < 0 || (dx === 0 && dy <= 0)) continue;
          const other = cells.get(keyOf(cx + dx, cy + dy));
          if (!other || find(list[0]) === find(other[0])) continue;
          outer: for (const i of list)
            for (const j of other) {
              const ex = points[i][0] - points[j][0];
              const ey = points[i][1] - points[j][1];
              if (ex * ex + ey * ey <= g2) {
                parent[find(i)] = find(j);
                break outer;
              }
            }
        }
    }
  }
  const groups = new Map<number, number[]>();
  points.forEach((_, i) => {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(i);
    else groups.set(r, [i]);
  });
  return [...groups.values()].map((members) => ({ members, length: withLength ? treeLength(members.map((i) => points[i])) : 0 }));
}

/**
 * The length of the shortest tree joining the points, on points thinned to
 * one per 10 m: along a street, how far a run goes, bends and loops included.
 */
export function treeLength(all: XY[]): number {
  const seen = new Set<number>();
  const pts: XY[] = [];
  for (const p of all) {
    const k = (Math.floor(p[0] / 10) + 50_000) * 100_003 + (Math.floor(p[1] / 10) + 50_000);
    if (seen.has(k)) continue;
    seen.add(k);
    pts.push(p);
  }
  const n = pts.length;
  if (n < 2) return 0;
  const inTree = new Uint8Array(n);
  const best = new Float64Array(n).fill(Infinity);
  best[0] = 0;
  let total = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u < 0 || best[i] < best[u])) u = i;
    inTree[u] = 1;
    total += best[u];
    for (let i = 0; i < n; i++) {
      if (inTree[i]) continue;
      const dx = pts[i][0] - pts[u][0];
      const dy = pts[i][1] - pts[u][1];
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < best[i]) best[i] = d;
    }
  }
  return total;
}

/** The longest distance between two of the points (over their hull). */
export function longest(points: XY[]): number {
  const h = hull(points);
  let d = 0;
  for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) d = Math.max(d, Math.hypot(h[i][0] - h[j][0], h[i][1] - h[j][1]));
  return d;
}

/** Where two segments cross, if they do. */
export function cross(a: XY, b: XY, c: XY, d: XY): XY | null {
  const r = [b[0] - a[0], b[1] - a[1]];
  const s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= -0.01 && t <= 1.01 && u >= -0.01 && u <= 1.01 ? [a[0] + t * r[0], a[1] + t * r[1]] : null;
}

