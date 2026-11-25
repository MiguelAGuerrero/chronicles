// @layer shell
import { strToU8 } from 'fflate';
import type { PendingJob } from '../deletion/pending';
import type { Ports } from '../ports/types';
import { createStore } from '../store';
import type { CaptureKind, Moment } from '../types';
import {
  BACKED_KEYS,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupName,
  BackupRefusal,
  byteLimit,
  FAILED,
  FILE,
  hasRoom,
  MANIFEST,
  mediaEntry,
  missingLine,
  NO_ROOM,
  TOO_LARGE,
  pendingOmits,
  pieceOut,
  traceEntry,
  WALK_FAMILIES,
  withoutPending,
  type BackupRows,
  type DateParts,
  type Manifest,
} from './core';
import { createZipWriter, dosTime } from './zip';

/** Where the zip goes, and the platform it is made on: the share sheet on a phone, a download on the web. */
export interface BackupIO {
  app: { version: string | null; platform: string };
  schema: { store: string; version: number | null };
  /** A piece's file, in chunks, or null when it is gone. */
  readMedia(ref: string): Promise<AsyncIterable<Uint8Array> | null>;
  /** A phone's room left and the media's size, asked before anything is written (BK7). */
  room?(refs: string[]): Promise<{ free: number | null; need: number }>;
  /** Starts the file. */
  open(name: string): void | Promise<void>;
  /** Takes the zip's bytes, in order, as they are made. */
  write(chunk: Uint8Array): void;
  /** Hands the finished file over (the share sheet, a download); resolves once that is done with. */
  deliver(): Promise<void>;
  /** Drops a file begun and not finished. */
  discard(): void | Promise<void>;
}

export interface BackupState {
  making: boolean;
  /** When this device last made a backup file (ms), or null. */
  last: number | null;
  /** Said after a backup: the files that were gone, in words. */
  after: string | null;
  /** Said after a backup that could not be made. */
  failed: string | null;
}

/** A zip header's DOS date and time for `ms`, in the device's own time, as fflate read it from its clock (BZ3). */
export function dosStamp(ms: number): number {
  const d = new Date(ms);
  return dosTime({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hours: d.getHours(), minutes: d.getMinutes(), seconds: d.getSeconds() });
}

/** A moment of the device's own calendar, as date parts (the shell reads the time zone; the core never does). */
export function datePartsOf(ms: number): DateParts {
  const d = new Date(ms);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

const isJobs = (v: unknown): v is PendingJob[] => Array.isArray(v) && v.every((j) => typeof j === 'object' && j !== null && 'spec' in j);

/**
 * The whole-app backup's writer (specs/back-up-everything, decisions 0241, 0249): every truth store read through the
 * `Db`, one walk's trace at a time, zipped as it is read and handed to `io`; the date kept only once the file is
 * handed over. Media pass through in chunks, stored as they are (photos and videos are compressed already). The zip's
 * records are ours (`./zip`, specs/backup-zip64): fflate's bytes within a plain zip's limits, ZIP64 past them.
 */
export function createBackupWriter(p: Pick<Ports, 'db' | 'clock'>) {
  const store = createStore<BackupState>({ making: false, last: null, after: null, failed: null });

  async function load(): Promise<void> {
    const raw = await p.db.getMeta('backup_last');
    const n = raw ? Number(raw) : NaN;
    store.set((s) => ({ ...s, last: Number.isFinite(n) ? n : null }));
  }

  /** The rows of every store but the traces, which are read one walk at a time as the zip is written. */
  async function readRows(): Promise<Omit<BackupRows, 'traces'>> {
    const db = p.db;
    const walks = await db.listWalks();
    // Every moment once, whatever its walk (back-up-everything audit 16): a moment saved after its walk went (the
    // delete's late saves, deletion/runner) is written as loose, so the file names no walk it does not hold. The one
    // read over all time the storage rule allows, once per tap (docs/DEFERRED.md, "Back up everything").
    const held = new Set(walks.map((w) => w.id));
    const moments: Moment[] = (await db.momentsBetween(0, Number.MAX_SAFE_INTEGER)).map((m) => (m.walk_id != null && !held.has(m.walk_id) ? { ...m, walk_id: null } : m));
    const rows: Omit<BackupRows, 'traces' | 'walks' | 'moments'> = {
      pauses: [], stills: [], gap_fills: [], reactions: [], threads: { threads: [], members: [], links: [] }, recalls: [], finds: [],
      checklist_areas: [], checklist_items: [], marks: [], offered: [], transcripts: [], meta: { keys: {}, walks: {} },
    };
    for (const w of walks) {
      rows.pauses.push(...(await db.getPauses(w.id)));
      rows.stills.push(...(await db.getStills(w.id)));
      rows.gap_fills.push(...(await db.getGapDecisions(w.id)));
      rows.marks.push(...(await db.listMarks(w.id)));
      for (const f of WALK_FAMILIES) {
        const key = `${f}:${w.id}`;
        const v = await db.getMeta(key);
        if (v) rows.meta.walks[key] = v;
      }
    }
    rows.marks.push(...(await db.listMarks(null)));
    rows.reactions = await db.listReactions();
    rows.threads = await db.listThreads();
    rows.recalls = await db.listRecalls();
    rows.finds = await db.listFinds();
    rows.checklist_areas = await db.listChecklistAreas();
    rows.checklist_items = await db.checklistItemsIn([-180, -90, 180, 90]);
    rows.offered = await db.listOffered();
    rows.transcripts = await db.listTranscripts();
    for (const k of BACKED_KEYS) {
      const v = await db.getMeta(k);
      if (v) rows.meta.keys[k] = v;
    }
    return { walks, moments, ...rows };
  }

  /** A delete waiting for Undo, as the Undo window saved it (decision 0113). */
  async function waiting(): Promise<PendingJob[]> {
    try {
      const v: unknown = JSON.parse((await p.db.getMeta('pending_delete')) || '[]');
      return isJobs(v) ? v : [];
    } catch {
      return [];
    }
  }

  /** Writes the zip to `io` and hands it over; throws a `BackupRefusal` with words, or any failure. */
  async function writeBackup(io: BackupIO, opened: () => void = () => {}): Promise<{ name: string; missing: CaptureKind[]; madeAt: number }> {
    const now = p.clock.now();
    const omits = pendingOmits(await waiting());
    const rows = withoutPending(await readRows(), omits);
    const pieces = rows.moments.flatMap((m) => m.pieces).filter((c) => c.file_path);
    if (io.room) {
      const { free, need } = await io.room(pieces.map((c) => c.file_path!));
      if (!hasRoom(free, need)) throw new BackupRefusal(NO_ROOM);
    }
    const name = backupName(datePartsOf(now));
    opened();
    await io.open(name);
    // Past 4 GiB the web, which holds the file in memory, writes nothing more and never hands it over (decision 0266);
    // elsewhere ZIP64 carries it (BZ2).
    const limit = byteLimit(io.app.platform);
    let written = 0;
    // Each header's time read from the clock as it is written, where fflate read its own (BZ3).
    const zip = createZipWriter(
      (chunk) => {
        if (limit !== null && written + chunk.length > limit) throw new BackupRefusal(TOO_LARGE);
        written += chunk.length;
        io.write(chunk);
      },
      () => dosStamp(p.clock.now()),
    );
    const add = (entry: string, value: unknown) => zip.entry(entry).push(strToU8(JSON.stringify(value)), true);
    const stores: string[] = [];
    // Each walk's trace on its own, so no walk's trace sits in memory beside another's (BK2).
    for (const w of rows.walks) {
      add(traceEntry(w.id), await p.db.getPoints(w.id));
      stores.push(traceEntry(w.id));
    }
    // Each piece's file, streamed through (BK6); one written once, however many pieces hold it.
    const entries = new Map<string, string | null>();
    const missing: { id: string; kind: CaptureKind }[] = [];
    const done = new Set<string>();
    for (const c of pieces) {
      const entry = mediaEntry(c.file_path!, c.id);
      if (!entry) {
        entries.set(c.id, null);
        continue;
      }
      if (done.has(entry)) {
        entries.set(c.id, entry);
        continue;
      }
      const chunks = await io.readMedia(c.file_path!).catch(() => null);
      if (!chunks) {
        missing.push({ id: c.id, kind: c.kind });
        continue;
      }
      const f = zip.entry(entry);
      // One chunk behind, so the last one can be marked final.
      let prev: Uint8Array | null = null;
      for await (const chunk of chunks) {
        if (prev) f.push(prev);
        prev = chunk;
      }
      f.push(prev ?? new Uint8Array(0), true);
      done.add(entry);
      entries.set(c.id, entry);
    }
    const gone = new Set(missing.map((m) => m.id));
    const { walks, moments, meta, ...rest } = rows;
    add(FILE.walks, walks);
    add(FILE.moments, moments.map((m) => ({ ...m, pieces: m.pieces.map((c) => pieceOut(c, entries.get(c.id) ?? null, gone.has(c.id))) })));
    add(FILE.pauses, rest.pauses);
    add(FILE.stills, rest.stills);
    add(FILE.gap_fills, rest.gap_fills);
    add(FILE.reactions, rest.reactions);
    add(FILE.threads, rest.threads);
    add(FILE.recalls, rest.recalls);
    add(FILE.finds, rest.finds);
    add(FILE.checklist_areas, rest.checklist_areas);
    add(FILE.checklist_items, rest.checklist_items);
    add(FILE.marks, rest.marks);
    add(FILE.offered, rest.offered);
    add(FILE.transcripts, rest.transcripts);
    add(FILE.meta, meta);
    const manifest: Manifest = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      app: io.app,
      schema: io.schema,
      made_at: new Date(now).toISOString(),
      stores: [...Object.values(FILE), ...stores],
      media_missing: missing.map((m) => m.id),
    };
    add(MANIFEST, manifest);
    zip.end();
    await io.deliver();
    // Only once the file is handed over: the line claims that a file was made, no more (BK8, decision 0249).
    await p.db.setMeta('backup_last', String(now));
    return { name, missing: missing.map((m) => m.kind), madeAt: now };
  }

  /** The page's one action: one backup at a time; its outcome said in the store. */
  async function backUp(io: BackupIO): Promise<void> {
    if (store.get().making) return;
    store.set((s) => ({ ...s, making: true, after: null, failed: null }));
    let opened = false;
    try {
      const { missing, madeAt } = await writeBackup(io, () => {
        opened = true;
      });
      store.set((s) => ({ ...s, making: false, last: madeAt, after: missingLine(missing) }));
    } catch (e) {
      if (opened) await Promise.resolve(io.discard()).catch(() => {});
      store.set((s) => ({ ...s, making: false, failed: e instanceof BackupRefusal ? e.words : FAILED }));
    }
  }

  return { store, load, writeBackup, backUp };
}
