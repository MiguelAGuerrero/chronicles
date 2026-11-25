// @layer core
import { strFromU8, strToU8, ZipPassThrough } from 'fflate';

/**
 * The backup's zip records, written and read by us around fflate's pass-through streams (specs/backup-zip64, decision
 * 0256). Within a plain zip's limits the bytes are fflate 0.8.2's `Zip` byte for byte; past 65,535 entries, or where a
 * size or an offset reaches 4 GiB, the ZIP64 records are added where they are needed and nowhere else (APPNOTE 4.3.9,
 * 4.4, 4.5.3). Nothing here reads a clock: the caller passes each header's DOS date and time.
 */

/** The largest values a plain zip's 16- and 32-bit fields hold; at or past them a field is set to all ones and ZIP64 carries it. */
export const ZIP32 = { entries: 0xffff, bytes: 0xffffffff } as const;

const SIG = { local: 0x04034b50, central: 0x02014b50, descriptor: 0x08074b50, end: 0x06054b50, end64: 0x06064b50, locator: 0x07064b50 } as const;
const TWO32 = 2 ** 32;

const put16 = (d: Uint8Array, at: number, v: number) => {
  d[at] = v & 255;
  d[at + 1] = (v >>> 8) & 255;
};
const put32 = (d: Uint8Array, at: number, v: number) => {
  put16(d, at, v & 0xffff);
  put16(d, at + 2, (v >>> 16) & 0xffff);
};
const put64 = (d: Uint8Array, at: number, v: number) => {
  put32(d, at, v % TWO32);
  put32(d, at + 4, Math.floor(v / TWO32));
};
const get16 = (d: Uint8Array, at: number) => d[at] | (d[at + 1] << 8);
const get32 = (d: Uint8Array, at: number) => (d[at] | (d[at + 1] << 8) | (d[at + 2] << 16) | (d[at + 3] << 24)) >>> 0;
const get64 = (d: Uint8Array, at: number) => get32(d, at) + get32(d, at + 4) * TWO32;

export interface DosParts {
  year: number;
  /** 1 to 12. */
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** A header's MS-DOS date and time, as fflate writes it: 1980 to 2099, seconds to the even second below. */
export function dosTime(t: DosParts): number {
  const y = t.year - 1980;
  if (y < 0 || y > 119) throw new Error('a zip can only hold dates from 1980 to 2099');
  return ((y << 25) | (t.month << 21) | (t.day << 16) | (t.hours << 11) | (t.minutes << 5) | (t.seconds >> 1)) >>> 0;
}

/** One entry as the central directory names it. */
export interface Written {
  name: Uint8Array;
  utf8: boolean;
  crc: number;
  size: number;
  offset: number;
}

const concat = (a: Uint8Array, b: Uint8Array) => {
  const o = new Uint8Array(a.length + b.length);
  o.set(a);
  o.set(b, a.length);
  return o;
};

/**
 * An entry's central header: fflate's within a plain zip's limits; a size of 0xFFFFFFFF or more, or a local header at
 * that offset or past it, reads all ones there and carries the value in the ZIP64 extra field (0x0001), sizes first,
 * version 45.
 */
export function centralHeader(w: Written, dos: number): Uint8Array {
  const big = w.size >= ZIP32.bytes;
  const far = w.offset >= ZIP32.bytes;
  const extra = (big ? 16 : 0) + (far ? 8 : 0);
  const h = new Uint8Array(46 + w.name.length + (extra ? 4 + extra : 0));
  put32(h, 0, SIG.central);
  h[4] = extra ? 45 : 20;
  h[6] = extra ? 45 : 20;
  h[8] = 8;
  h[9] = w.utf8 ? 8 : 0;
  put32(h, 12, dos);
  put32(h, 16, w.crc);
  put32(h, 20, big ? ZIP32.bytes : w.size);
  put32(h, 24, big ? ZIP32.bytes : w.size);
  put16(h, 28, w.name.length);
  put16(h, 30, extra ? 4 + extra : 0);
  put32(h, 42, far ? ZIP32.bytes : w.offset);
  h.set(w.name, 46);
  if (extra) {
    let x = 46 + w.name.length;
    put16(h, x, 1);
    put16(h, x + 2, extra);
    x += 4;
    if (big) {
      put64(h, x, w.size);
      put64(h, x + 8, w.size);
      x += 16;
    }
    if (far) put64(h, x, w.offset);
  }
  return h;
}

/**
 * The directory's end: fflate's plain record while the count, the directory's size and its place fit; past any of
 * them, ZIP64's end record and its locator before it, and in the plain record only the fields that overflow read all
 * ones. Exactly 65,535 entries stays plain, as fflate wrote it.
 */
export function endRecords(count: number, size: number, start: number): Uint8Array {
  const zip64 = count > ZIP32.entries || size >= ZIP32.bytes || start >= ZIP32.bytes;
  const d = new Uint8Array((zip64 ? 56 + 20 : 0) + 22);
  let o = 0;
  if (zip64) {
    put32(d, 0, SIG.end64);
    put64(d, 4, 44);
    d[12] = 45;
    d[14] = 45;
    put64(d, 24, count);
    put64(d, 32, count);
    put64(d, 40, size);
    put64(d, 48, start);
    put32(d, 56, SIG.locator);
    put64(d, 64, start + size);
    put32(d, 72, 1);
    o = 76;
  }
  put32(d, o, SIG.end);
  put16(d, o + 8, Math.min(count, ZIP32.entries));
  put16(d, o + 10, Math.min(count, ZIP32.entries));
  put32(d, o + 12, Math.min(size, ZIP32.bytes));
  put32(d, o + 16, Math.min(start, ZIP32.bytes));
  return d;
}

/**
 * A zip written in order, one entry at a time, each entry stored as it is (fflate's `ZipPassThrough`, which keeps the
 * CRC): its local header when it is begun, its bytes as they are pushed, a data descriptor when the last is pushed, and
 * the central directory at `end()`. `out` takes every byte in order; `stamp` gives each header's DOS time when it is
 * written (`dosTime`), local headers as they begin and central ones at the end, where fflate read its clock.
 */
export function createZipWriter(out: (chunk: Uint8Array) => void, stamp: () => number) {
  let at = 0;
  let open = false;
  let ended = false;
  const written: Written[] = [];
  const emit = (c: Uint8Array) => {
    at += c.length;
    out(c);
  };

  /** Begins an entry; push its bytes into the stream returned, the last with `final`. */
  function entry(filename: string): ZipPassThrough {
    if (open || ended) throw new Error('a zip entry is begun only when the one before it is done');
    const name = strToU8(filename);
    if (name.length > 0xffff) throw new Error('a zip entry\'s name is 65,535 bytes at most');
    const utf8 = name.length !== filename.length;
    const offset = at;
    const header = new Uint8Array(30 + name.length);
    put32(header, 0, SIG.local);
    header[4] = 20;
    header[6] = 8;
    header[7] = utf8 ? 8 : 0;
    put32(header, 10, stamp());
    put16(header, 26, name.length);
    header.set(name, 30);
    emit(header);
    open = true;
    let length = 0;
    const f = new ZipPassThrough(filename);
    f.ondata = (err, chunk, final) => {
      if (err) throw err;
      length += chunk.length;
      emit(chunk);
      if (!final) return;
      // Past 4 GiB the sizes take eight bytes each (APPNOTE 4.3.9.2); the local header, written before the size was
      // known, has no ZIP64 field, as Go's archive/zip and Java's ZipOutputStream write it.
      const big = length >= ZIP32.bytes;
      const d = new Uint8Array(big ? 24 : 16);
      put32(d, 0, SIG.descriptor);
      put32(d, 4, f.crc);
      if (big) {
        put64(d, 8, length);
        put64(d, 16, length);
      } else {
        put32(d, 8, length);
        put32(d, 12, length);
      }
      emit(d);
      written.push({ name, utf8, crc: f.crc >>> 0, size: length, offset });
      open = false;
    };
    return f;
  }

  /** Writes the central directory and its end, each central header's time read now. */
  function end(): void {
    if (open || ended) throw new Error('a zip is ended once, after its last entry is done');
    ended = true;
    const start = at;
    const headers = written.map((w) => centralHeader(w, stamp()));
    const size = headers.reduce((n, h) => n + h.length, 0);
    const tail = new Uint8Array(size);
    let o = 0;
    for (const h of headers) {
      tail.set(h, o);
      o += h.length;
    }
    emit(concat(tail, endRecords(written.length, size, start)));
  }

  return { entry, end };
}

/** Reads `length` bytes at `offset` of the file (a file handle, a Blob's slice, an array). */
export type ReadAt = (offset: number, length: number) => Uint8Array | Promise<Uint8Array>;

/** An entry as the central directory lists it. */
export interface ZipEntry {
  name: string;
  crc: number;
  size: number;
  /** Where its local header begins. */
  offset: number;
}

export class ZipError extends Error {}

/**
 * Lists a zip's entries from its central directory, plain or ZIP64 alike (BZ4): the end record found within the last
 * 65,557 bytes, ZIP64's end record by its locator, each header's ZIP64 field for the values it set to all ones. Only
 * stored entries (ours are); a count or a directory size that does not agree with what is there is refused.
 */
export async function zipEntries(read: ReadAt, fileSize: number): Promise<ZipEntry[]> {
  const span = Math.min(fileSize, 22 + 0xffff);
  const tail = await read(fileSize - span, span);
  let e = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (get32(tail, i) === SIG.end && i + 22 + get16(tail, i + 20) === tail.length) {
      e = i;
      break;
    }
  }
  if (e < 0) throw new ZipError('no end of central directory');
  const endAt = fileSize - span + e;
  let count = get16(tail, e + 10);
  let size = get32(tail, e + 12);
  let start = get32(tail, e + 16);
  let dirEnd = endAt;
  if (endAt >= 20) {
    const loc = await read(endAt - 20, 20);
    if (get32(loc, 0) === SIG.locator) {
      const at = get64(loc, 8);
      const z = await read(at, 56);
      if (get32(z, 0) !== SIG.end64) throw new ZipError('a ZIP64 locator names no ZIP64 end record');
      count = get64(z, 32);
      size = get64(z, 40);
      start = get64(z, 48);
      dirEnd = at;
    }
  }
  if (start + size !== dirEnd) throw new ZipError('the central directory is not where its end says');
  const dir = await read(start, size);
  const entries: ZipEntry[] = [];
  let o = 0;
  while (o < dir.length) {
    if (o + 46 > dir.length || get32(dir, o) !== SIG.central) throw new ZipError('a central header is broken');
    const method = get16(dir, o + 10);
    const crc = get32(dir, o + 16);
    let csize = get32(dir, o + 20);
    let usize = get32(dir, o + 24);
    const n = get16(dir, o + 28);
    const x = get16(dir, o + 30);
    const c = get16(dir, o + 32);
    let offset = get32(dir, o + 42);
    if (o + 46 + n + x + c > dir.length) throw new ZipError('a central header runs past the directory');
    const name = strFromU8(dir.subarray(o + 46, o + 46 + n));
    for (let p = o + 46 + n; p + 4 <= o + 46 + n + x; p += 4 + get16(dir, p + 2)) {
      if (get16(dir, p) !== 1) continue;
      let q = p + 4;
      if (usize === ZIP32.bytes) {
        usize = get64(dir, q);
        q += 8;
      }
      if (csize === ZIP32.bytes) {
        csize = get64(dir, q);
        q += 8;
      }
      if (offset === ZIP32.bytes) offset = get64(dir, q);
    }
    if (method !== 0 || csize !== usize) throw new ZipError(`${name} is not stored as it is`);
    entries.push({ name, crc, size: usize, offset });
    o += 46 + n + x + c;
  }
  if (entries.length !== count) throw new ZipError(`the directory holds ${entries.length} entries where its end says ${count}`);
  return entries;
}

/** An entry's bytes in chunks, whole: its local header checked against the directory, its CRC checked at the end. */
export async function* zipEntryChunks(read: ReadAt, e: ZipEntry, chunk = 1 << 20): AsyncGenerator<Uint8Array> {
  const h = await read(e.offset, 30);
  if (get32(h, 0) !== SIG.local) throw new ZipError(`${e.name} has no local header`);
  const n = get16(h, 26);
  const name = await read(e.offset + 30, n);
  if (strFromU8(name) !== e.name) throw new ZipError(`${e.name}'s local header names another entry`);
  const start = e.offset + 30 + n + get16(h, 28);
  const crc = new ZipPassThrough(e.name);
  crc.ondata = () => {};
  for (let o = 0; o < e.size; o += chunk) {
    const c = await read(start + o, Math.min(chunk, e.size - o));
    crc.push(c);
    yield c;
  }
  crc.push(new Uint8Array(0), true);
  if (crc.crc >>> 0 !== e.crc) throw new ZipError(`${e.name} does not read back whole`);
}
