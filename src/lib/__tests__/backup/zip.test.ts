import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { closeSync, ftruncateSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { strFromU8, strToU8, unzipSync, Zip, ZipPassThrough } from 'fflate';
import { BACKUP_VERSION, readBackup } from '../../backup/core';
import { centralHeader, createZipWriter, dosTime, endRecords, writeCentral, ZIP32, ZipError, zipEntries, zipEntryChunks, type ReadAt, type ZipEntry } from '../../backup/zip';

// The backup's zip records, ours around fflate's streams (specs/backup-zip64, BZ3, BZ4, BZ6; decisions 0256, 0266).

const root = join(__dirname, '..', '..', '..', '..');
const T = Date.UTC(2026, 10, 20, 15, 0, 7);
/** The DOS time fflate writes for `ms`, in the device's own time, as the shell gives it. */
const dosOf = (ms: number) => {
  const d = new Date(ms);
  return dosTime({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hours: d.getHours(), minutes: d.getMinutes(), seconds: d.getSeconds() });
};
const cat = (cs: Uint8Array[]) => {
  const o = new Uint8Array(cs.reduce((n, c) => n + c.length, 0));
  let p = 0;
  for (const c of cs) {
    o.set(c, p);
    p += c.length;
  }
  return o;
};
const readOf = (b: Uint8Array): ReadAt => (o, l) => b.subarray(o, o + l);

type Entries = [string, Uint8Array[]][];

/** fflate's `Zip` with `ZipPassThrough` entries, as the backup wrote until this slice, with its clock held at `T`. */
function fflateZip(files: Entries, clock: () => number = () => T): Uint8Array {
  const now = Date.now;
  Date.now = clock;
  try {
    const out: Uint8Array[] = [];
    const z = new Zip((e, c) => {
      if (e) throw e;
      out.push(c.slice());
    });
    for (const [n, cs] of files) {
      const f = new ZipPassThrough(n);
      z.add(f);
      cs.forEach((c, i) => f.push(c, i === cs.length - 1));
    }
    z.end();
    return cat(out);
  } finally {
    Date.now = now;
  }
}

function ourZip(files: Entries, clock: () => number = () => T, out: Uint8Array[] = []): Uint8Array {
  const w = createZipWriter((c) => out.push(c.slice()), () => dosOf(clock()));
  for (const [n, cs] of files) {
    const f = w.entry(n);
    cs.forEach((c, i) => f.push(c, i === cs.length - 1));
  }
  w.end();
  return cat(out);
}

/** Every entry's bytes by our reader, whole (its CRC checked). */
async function readAll(read: ReadAt, size: number): Promise<{ entries: ZipEntry[]; bytes: Record<string, Uint8Array> }> {
  const entries = await zipEntries(read, size);
  const bytes: Record<string, Uint8Array> = {};
  for (const e of entries) {
    const parts: Uint8Array[] = [];
    for await (const c of zipEntryChunks(read, e)) parts.push(c.slice());
    bytes[e.name] = cat(parts);
  }
  return { entries, bytes };
}

const hasZip64 = (b: Uint8Array) => {
  for (let i = 0; i + 4 <= b.length; i++) if (b[i] === 0x50 && b[i + 1] === 0x4b && b[i + 2] === 6 && (b[i + 3] === 6 || b[i + 3] === 7)) return true;
  return false;
};

const SETS: Record<string, Entries> = {
  'no entry': [],
  'one empty entry': [['empty', [new Uint8Array(0)]]],
  'the JSON stores': [['trace/w1.json', [strToU8('[{"t":1}]')]], ['walks.json', [strToU8('[]')]], ['manifest.json', [strToU8('{"format":"chronicles-backup","version":1}')]]],
  'a name that is not ASCII': [['media/walks/w1/café ü.jpg', [new Uint8Array([1, 2, 3])]], ['media/legacy/🙂.m4a', [new Uint8Array([4])]]],
  'a file in many chunks, the last push empty': [['media/walks/w1/memo.m4a', [new Uint8Array([1, 2]), new Uint8Array([3, 4]), new Uint8Array([5]), new Uint8Array(0)]]],
  'a 70 KB file': [['media/walks/w1/photo.jpg', [new Uint8Array(70_000).map((_, i) => i * 7), new Uint8Array([9])]], ['meta.json', [strToU8('{}')]]],
};

test('BZ3 within both limits the bytes are fflate\'s Zip\'s, for the same clock', () => {
  for (const [what, files] of Object.entries(SETS)) {
    const a = fflateZip(files);
    const b = ourZip(files);
    assert.equal(b.length, a.length, `${what}: the same length`);
    assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0, `${what}: the same bytes`);
    assert.equal(hasZip64(b), false, `${what}: no ZIP64 record`);
  }
  // Exactly 65,535 entries is within the limit: plain, as today.
  const many: Entries = Array.from({ length: ZIP32.entries }, (_, i) => [`media/m/${i}.jpg`, [strToU8(`photo ${i}`)]]);
  const a = fflateZip(many);
  const b = ourZip(many);
  assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0, '65,535 entries: the same bytes');
  assert.equal(hasZip64(b), false, '65,535 entries: no ZIP64 record');
});

test('BZ4 our reader lists a plain zip and a ZIP64 one alike', async () => {
  const frozen = new Uint8Array(readFileSync(join(__dirname, 'fixtures', 'backup-v1.zip')));
  const plain = await readAll(readOf(frozen), frozen.length);
  const theirs = unzipSync(frozen);
  assert.deepEqual(plain.entries.map((e) => e.name).sort(), Object.keys(theirs).sort(), 'the frozen sample (fflate\'s, plain): every entry');
  for (const [n, b] of Object.entries(theirs)) assert.equal(Buffer.compare(Buffer.from(plain.bytes[n]), Buffer.from(b)), 0, `${n}: its bytes`);
  // The same entries with enough more after them to need ZIP64: read alike, into the same rows.
  const files: Entries = [...plain.entries.map((e): [string, Uint8Array[]] => [e.name, [plain.bytes[e.name]]]), ...Array.from({ length: ZIP32.entries }, (_, i): [string, Uint8Array[]] => [`media/fill/${i}`, [strToU8(String(i))]])];
  const big = ourZip(files);
  assert.equal(hasZip64(big), true, 'past 65,535 entries the file carries ZIP64');
  const wide = await readAll(readOf(big), big.length);
  assert.equal(wide.entries.length, files.length);
  for (const e of plain.entries) assert.equal(Buffer.compare(Buffer.from(wide.bytes[e.name]), Buffer.from(plain.bytes[e.name])), 0, `${e.name}: the same bytes`);
  const texts = (r: { bytes: Record<string, Uint8Array> }) => Object.fromEntries(Object.entries(r.bytes).filter(([n]) => !n.startsWith('media/')).map(([n, b]) => [n, strFromU8(b)]));
  const one = readBackup(texts(plain));
  const two = readBackup(texts(wide));
  assert.equal(one.ok && two.ok, true);
  assert.deepEqual(two, one, 'the same rows from either');
});

/** A file of `size` bytes holding only `tail` at its end: a directory read without any data written. */
const sparse = (tail: Uint8Array, size: number): ReadAt => (o, l) => {
  const out = new Uint8Array(l);
  const from = size - tail.length;
  for (let i = 0; i < l; i++) if (o + i >= from) out[i] = tail[o + i - from];
  return out;
};

test('BZ4 at the boundaries: a size or an offset of 0xFFFFFFFE stays plain, 0xFFFFFFFF goes to ZIP64, and both read back', async () => {
  const name = strToU8('media/walks/w1/long.mov');
  for (const size of [ZIP32.bytes - 1, ZIP32.bytes, ZIP32.bytes + 1, 2 ** 40]) {
    for (const offset of [0, ZIP32.bytes - 1, ZIP32.bytes, 2 ** 40 + 3]) {
      const h = centralHeader({ name, utf8: false, crc: 0x1234abcd, size, offset }, dosOf(T));
      const plain = size < ZIP32.bytes && offset < ZIP32.bytes;
      assert.equal(h.length, 46 + name.length + (plain ? 0 : 4 + (size >= ZIP32.bytes ? 16 : 0) + (offset >= ZIP32.bytes ? 8 : 0)), `size ${size}, offset ${offset}: its extra field holds only what overflows`);
      const start = offset + 30 + name.length + size + (size >= ZIP32.bytes ? 24 : 16);
      const tail = cat([h, endRecords(1, h.length, start)]);
      const [e] = await zipEntries(sparse(tail, start + tail.length), start + tail.length);
      assert.deepEqual(e, { name: 'media/walks/w1/long.mov', crc: 0x1234abcd, size, offset });
    }
  }
  for (const count of [ZIP32.entries, ZIP32.entries + 1]) {
    const end = endRecords(count, 0, 100);
    assert.equal(end.length, count > ZIP32.entries ? 56 + 20 + 22 : 22, `${count} entries: the ZIP64 end only past 65,535`);
  }
});

/** fflate's own file of 70,000 entries: its count wraps to 4,464. */
function wrapped(): Uint8Array {
  return fflateZip(Array.from({ length: 70_000 }, (_, i): [string, Uint8Array[]] => [`media/m/${i}.jpg`, [strToU8('x')]]));
}

test('BZ4 a zip whose directory disagrees with its end is refused, never half listed', async () => {
  const w = wrapped();
  assert.equal(Object.keys(unzipSync(w)).length, 4_464, 'fflate\'s reader stops at 4,464 (the auditor\'s probe)');
  await assert.rejects(zipEntries(readOf(w), w.length), ZipError, 'the wrapped count is refused');
  const good = ourZip(SETS['the JSON stores']);
  await assert.rejects(zipEntries(readOf(good.subarray(0, good.length - 5)), good.length - 5), ZipError, 'a cut tail is refused');
  const bad = good.slice();
  bad[30 + 'trace/w1.json'.length] ^= 1; // the first entry's first byte
  const entries = await zipEntries(readOf(bad), bad.length);
  await assert.rejects(async () => {
    for await (const _ of zipEntryChunks(readOf(bad), entries[0])) void _;
  }, ZipError, 'a byte changed fails its CRC');
  const other = good.slice();
  other.set(strToU8('x'), 30); // the local header names another entry
  await assert.rejects(async () => {
    for await (const _ of zipEntryChunks(readOf(other), entries[0])) void _;
  }, ZipError, 'a local header naming another entry is refused');
});

test('BZ6 the records are ours, over fflate\'s streams: no new dependency, no file past a limit committed (a text check of the sources)', () => {
  const dir = join(root, 'src', 'lib', 'backup');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
    const src = readFileSync(join(dir, f), 'utf8');
    const packages = [...src.matchAll(/^import[^'"]*from '([^'.][^']*)'/gm)].map((m) => m[1]);
    assert.deepEqual(packages.filter((p) => p !== 'fflate'), [], `${f} imports no package but fflate`);
  }
  const zipSrc = readFileSync(join(dir, 'zip.ts'), 'utf8');
  const fromFflate = /^import \{([^}]*)\} from 'fflate'/m.exec(zipSrc);
  assert.ok(fromFflate, 'backup/zip.ts is built around fflate');
  assert.deepEqual(fromFflate[1].split(',').map((s) => s.trim()).filter(Boolean).sort(), ['ZipPassThrough', 'strFromU8', 'strToU8'], 'its streams and its text, not its Zip or its unzip');
  assert.equal(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dependencies.fflate, '^0.8.2');
  assert.deepEqual(readdirSync(join(__dirname, 'fixtures')).sort(), ['backup-v1.sha256', 'backup-v1.zip'], 'no file past a limit is committed');
});

test('backup-zip64 audit 7: ZIP64 is the container\'s, outside BACKUP_VERSION, and every reader of a backup goes through backup/zip.ts (a text check of the rule and the sources)', () => {
  assert.equal(BACKUP_VERSION, 1, 'the format stays version 1');
  const rule = readFileSync(join(root, '.claude', 'rules', 'backup.md'), 'utf8');
  assert.match(rule, /ZIP64 is the container's, outside `BACKUP_VERSION`; every reader of a backup goes through `backup\/zip\.ts`/);
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__tests__' && e.name !== 'node_modules') walk(p);
      } else if (/\.tsx?$/.test(e.name)) files.push(p);
    }
  };
  walk(join(root, 'src'));
  const readers = files.filter((f) => /from 'fflate'/.test(readFileSync(f, 'utf8')) && /\b(unzipSync|unzip|Unzip|UnzipInflate|UnzipPassThrough)\b/.test(readFileSync(f, 'utf8').match(/^import \{[^}]*\} from 'fflate'/m)?.[0] ?? ''));
  assert.deepEqual(readers, [], 'no module reads a zip with fflate\'s unzip');
});

test('backup-zip64 audit 3, audit 5: the spec\'s verb is the backup\'s, and its precedent claims no more than is recorded (a text check of the spec)', () => {
  const spec = readFileSync(join(root, 'specs', 'backup-zip64', 'spec.md'), 'utf8');
  assert.match(spec, /^Verb: Return, Honour\b/m, 'the backup serves Return and Honour, not Earn');
  assert.doesNotMatch(spec, /whatever the library's size/, 'Apple Journal\'s one ZIP, its size limits unverified');
});

// The diff review (Nov 25): the auditor's F2, F4, F6, F7 (backup-zip64 audit 9, 11, 13, 14).

/** One central header (`edit` may change its bytes) and the end, at `start` in a file holding nothing else. */
async function listOne(w: Parameters<typeof centralHeader>[0], start: number, edit: (h: Uint8Array) => Uint8Array = (h) => h) {
  const h = edit(centralHeader(w, dosOf(T)));
  const tail = cat([h, endRecords(1, h.length, start)]);
  return zipEntries(sparse(tail, start + tail.length), start + tail.length);
}
const NAME = strToU8('media/walks/w1/long.mov');
const put32 = (d: Uint8Array, at: number, v: number) => Buffer.from(d.buffer, d.byteOffset, d.byteLength).writeUInt32LE(v >>> 0, at);
const put16 = (d: Uint8Array, at: number, v: number) => Buffer.from(d.buffer, d.byteOffset, d.byteLength).writeUInt16LE(v, at);

test('backup-zip64 audit 9: a header whose ZIP64 values are missing, short or past the directory is refused, never listed', async () => {
  // A size of all ones with no ZIP64 field to carry it.
  await assert.rejects(listOne({ name: NAME, utf8: false, crc: 1, size: 5, offset: 0 }, 2 ** 33, (h) => (put32(h, 20, ZIP32.bytes), put32(h, 24, ZIP32.bytes), h)), ZipError, 'a value left all ones');
  // A ZIP64 field of eight bytes where two sizes need sixteen.
  await assert.rejects(listOne({ name: NAME, utf8: false, crc: 1, size: 2 ** 32 + 5, offset: 0 }, 2 ** 34, (h) => (put16(h, 46 + NAME.length + 2, 8), h)), ZipError, 'a ZIP64 field shorter than its values');
  // An extra field longer than the header's extras.
  await assert.rejects(listOne({ name: NAME, utf8: false, crc: 1, size: 2 ** 32 + 5, offset: 0 }, 2 ** 34, (h) => (put16(h, 46 + NAME.length + 2, 40), h)), ZipError, 'an extra field running past its header');
  // An entry whose data would run past where the directory begins (the auditor's 2^50).
  await assert.rejects(listOne({ name: NAME, utf8: false, crc: 1, size: 2 ** 50, offset: 0 }, 1000), ZipError, 'data past the directory');
  // A short read of an entry's bytes.
  const good = ourZip(SETS['the JSON stores']);
  const [first] = await zipEntries(readOf(good), good.length);
  const short: ReadAt = (o, l) => good.subarray(o, o + (o >= 30 + first.name.length ? l - 1 : l));
  await assert.rejects(async () => {
    for await (const _ of zipEntryChunks(short, first)) void _;
  }, ZipError, 'a short read');
});

test('backup-zip64 audit 11: a clock that moves on every read gives fflate\'s bytes, in zones far from UTC too', () => {
  const zone = process.env.TZ;
  try {
    for (const tz of ['UTC', 'Pacific/Chatham', 'America/St_Johns']) {
      process.env.TZ = tz;
      // Ten seconds before the year turns in Chatham (UTC+13:45), each read 997 ms on.
      const ticking = () => {
        let t = Date.UTC(2026, 11, 31, 10, 14, 50);
        return () => (t += 997);
      };
      for (const [what, files] of Object.entries(SETS)) {
        const a = fflateZip(files, ticking());
        const b = ourZip(files, ticking());
        assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0, `${tz}, ${what}: the same bytes`);
      }
    }
  } finally {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  }
});

test('backup-zip64 audit 13: the boundary records read by Python\'s zipfile, and 65,536 entries by unzip -t', () => {
  const dir = mkdtempSync(join(tmpdir(), 'chronicles-zip64-'));
  try {
    const cases: { path: string; size: number; offset: number }[] = [];
    for (const size of [ZIP32.bytes - 1, ZIP32.bytes, 2 ** 40]) {
      for (const offset of [0, ZIP32.bytes - 1, ZIP32.bytes, 2 ** 40 + 3]) {
        const h = centralHeader({ name: NAME, utf8: false, crc: 0x1234abcd, size, offset }, dosOf(T));
        const start = offset + 30 + NAME.length + size + (size >= ZIP32.bytes ? 24 : 16);
        const tail = cat([h, endRecords(1, h.length, start)]);
        const path = join(dir, `${cases.length}.zip`);
        const fd = openSync(path, 'w');
        try {
          writeSync(fd, tail, 0, tail.length, start);
          ftruncateSync(fd, start + tail.length);
        } finally {
          closeSync(fd);
        }
        cases.push({ path, size, offset });
      }
    }
    const script = 'import json,sys,zipfile\nprint(json.dumps([[[i.filename,i.file_size,i.compress_size,i.header_offset,i.CRC] for i in zipfile.ZipFile(p).infolist()] for p in sys.argv[1:]]))';
    const read: [string, number, number, number, number][][] = JSON.parse(execFileSync('python3', ['-I', '-c', script, ...cases.map((c) => c.path)], { encoding: 'utf8' }));
    cases.forEach((c, i) => assert.deepEqual(read[i], [['media/walks/w1/long.mov', c.size, c.size, c.offset, 0x1234abcd]], `size ${c.size}, offset ${c.offset}`));
    const many = ourZip(Array.from({ length: ZIP32.entries + 1 }, (_, i): [string, Uint8Array[]] => [`media/m/${i}.jpg`, [strToU8(`photo ${i}`)]]));
    const path = join(dir, 'many.zip');
    writeFileSync(path, many);
    assert.match(execFileSync('unzip', ['-tq', path], { encoding: 'utf8' }), /No errors detected/);
    assert.equal(execFileSync('unzip', ['-Z1', path], { encoding: 'utf8', maxBuffer: 64 * 2 ** 20 }).trim().split('\n').length, ZIP32.entries + 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('backup-zip64 audit 14: the directory and its end are written into one array, sized first, and handed over as one chunk', () => {
  const w = { name: NAME, utf8: false, crc: 7, size: 2 ** 33, offset: 2 ** 33 };
  const h = centralHeader(w, dosOf(T));
  const d = new Uint8Array(h.length + 11);
  assert.equal(writeCentral(d, 7, w, dosOf(T)), 7 + h.length, 'written in place, the next offset returned');
  assert.deepEqual([...d.subarray(7, 7 + h.length)], [...h]);
  const out: Uint8Array[] = [];
  ourZip(SETS['the JSON stores'], () => T, out);
  const last = out[out.length - 1];
  const entries = SETS['the JSON stores'].length;
  assert.equal(last.length, entries * 46 + SETS['the JSON stores'].reduce((n, [name]) => n + strToU8(name).length, 0) + 22, 'the directory and its end in one chunk');
});
