// Test harness only: writes a PMTiles v3 archive from z/x/y tiles, uncompressed, one root
// directory, so the e2e can serve a fake Overture release that the app's real reader
// (`pmtiles`, byte ranges) reads like the real one (AD3).
import { zxyToTileId } from 'pmtiles';

function varints(nums) {
  const out = [];
  for (let n of nums) {
    while (n >= 0x80) {
      out.push((n % 0x80) | 0x80);
      n = Math.floor(n / 0x80);
    }
    out.push(n);
  }
  return Buffer.from(out);
}

/** tiles: [{ z, x, y, data: Uint8Array }] → one archive as a Buffer. */
export function encodeArchive(tiles, bounds = [-180, -85, 180, 85]) {
  const sorted = tiles.map((t) => ({ ...t, id: zxyToTileId(t.z, t.x, t.y) })).sort((a, b) => a.id - b.id);
  let offset = 0;
  const entries = sorted.map((t) => {
    const e = { id: t.id, offset, length: t.data.length };
    offset += t.data.length;
    return e;
  });
  let last = 0;
  const dir = Buffer.concat([
    varints([entries.length]),
    varints(entries.map((e) => { const d = e.id - last; last = e.id; return d; })),
    varints(entries.map(() => 1)),
    varints(entries.map((e) => e.length)),
    // Contiguous with the previous entry: 0; else offset + 1.
    varints(entries.map((e, i) => (i > 0 && e.offset === entries[i - 1].offset + entries[i - 1].length ? 0 : e.offset + 1))),
  ]);
  const meta = Buffer.from('{}');
  const data = Buffer.concat(sorted.map((t) => Buffer.from(t.data)));
  const header = Buffer.alloc(127);
  header.write('PMTiles', 0, 'ascii');
  header.writeUInt8(3, 7);
  const u64 = (pos, v) => header.writeBigUInt64LE(BigInt(v), pos);
  const rootAt = 127;
  u64(8, rootAt);
  u64(16, dir.length);
  u64(24, rootAt + dir.length);
  u64(32, meta.length);
  u64(40, rootAt + dir.length + meta.length);
  u64(48, 0);
  u64(56, rootAt + dir.length + meta.length);
  u64(64, data.length);
  u64(72, entries.length);
  u64(80, entries.length);
  u64(88, entries.length);
  header.writeUInt8(1, 96); // clustered
  header.writeUInt8(1, 97); // internal compression: none
  header.writeUInt8(1, 98); // tile compression: none
  header.writeUInt8(1, 99); // MVT
  const zs = sorted.map((t) => t.z);
  header.writeUInt8(Math.min(...zs), 100);
  header.writeUInt8(Math.max(...zs), 101);
  header.writeInt32LE(Math.round(bounds[0] * 1e7), 102);
  header.writeInt32LE(Math.round(bounds[1] * 1e7), 106);
  header.writeInt32LE(Math.round(bounds[2] * 1e7), 110);
  header.writeInt32LE(Math.round(bounds[3] * 1e7), 114);
  header.writeUInt8(Math.max(...zs), 118);
  return Buffer.concat([header, dir, meta, data]);
}
