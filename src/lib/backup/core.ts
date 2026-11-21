// @layer core
import type { ChecklistArea, ChecklistItem, Find } from '../explore/explore';
import type { Mark, Offered, Recall } from '../discovery/types';
import type { PendingJob } from '../deletion/pending';
import type { MetaFamily, MetaKey } from '../meta';
import type { StoredReaction } from '../reactions/core';
import type { ThreadsData } from '../threads/types';
import type { Transcript } from '../transcript/core';
import type { Capture, CaptureKind, GapDecision, Moment, Pause, Still, TracePoint, Walk } from '../types';
import { numberWord } from '../resurface/lines';
import { SPACE } from '../space/core';
import { thinThreads } from '../threads/rules';

/**
 * The whole-app backup (specs/back-up-everything, decisions 0241, 0248): one plain zip of every walk, trace, moment,
 * piece's file and kept row, with the person's choices. This module is its format, what is in it, the reader that
 * reads every version ever written into today's rows, and the page's words. Nothing here reads a clock or a store.
 */

export const BACKUP_FORMAT = 'chronicles-backup';
/** Whole numbers. A change to the file adds a version, an upgrade step from the one before, and a frozen sample (BK4). */
export const BACKUP_VERSION = 1;

/** Truth in the file; a cache recomputed from it; or the one cache carried because it cannot be made again here. */
export type Kept = 'backup' | 'cache' | 'carried';

/**
 * Every store, native and web (BK3): a new table or object store fails `npm test` until it is named here. `file` is
 * where a store's rows sit in the zip.
 */
export const STORES: Record<string, { kept: Kept; why: string; file?: string }> = {
  walk: { kept: 'backup', file: 'walks.json', why: 'a walk is truth: when it began and ended, its title and words' },
  trace_point: { kept: 'backup', file: 'trace/<walk id>.json', why: 'the raw trace is truth, one file per walk' },
  moment: { kept: 'backup', file: 'moments.json', why: 'a moment is truth: its walk, time and place' },
  capture: { kept: 'backup', file: 'moments.json', why: 'a moment\'s pieces are truth, held inside their moments' },
  media: { kept: 'backup', file: 'media/<ref>', why: 'the web\'s stored photos, videos and memos, as files at their refs' },
  pause: { kept: 'backup', file: 'pauses.json', why: 'a pause is a break in the trace, read with it' },
  still: { kept: 'backup', file: 'stills.json', why: 'a still spell is read with the trace (MO8)' },
  gap_fill: { kept: 'backup', file: 'gap_fills.json', why: 'a stretch kept or dismissed across a gap is the person\'s choice' },
  reaction: { kept: 'backup', file: 'reactions.json', why: 'a moment\'s reactions are truth (decision 0176)' },
  thread: { kept: 'backup', file: 'threads.json', why: 'the person\'s threads are truth (decision 0104)' },
  thread_member: { kept: 'backup', file: 'threads.json', why: 'a moment\'s place in a thread is truth' },
  moment_link: { kept: 'backup', file: 'threads.json', why: 'a reply between moments is truth' },
  recall: { kept: 'backup', file: 'recalls.json', why: 'Remind me here is the person\'s choice on a capture' },
  find: { kept: 'backup', file: 'finds.json', why: 'a capture that found a place is kept (E8)' },
  checklist_area: { kept: 'backup', file: 'checklist_areas.json', why: 'kept by the app with its finds (KEPT_STORES, E13)' },
  checklist_item: { kept: 'backup', file: 'checklist_items.json', why: 'kept by the app with its finds (KEPT_STORES, E13)' },
  mark: { kept: 'backup', file: 'marks.json', why: 'the retired scan\'s marks, which old walks\' replays still read' },
  offered: { kept: 'backup', file: 'offered.json', why: 'the retired scan\'s offered places, truth never cleared (KEPT_STORES)' },
  meta: { kept: 'backup', file: 'meta.json', why: 'the person\'s choices, by key (META_KEYS); this device\'s state stays' },
  transcript: {
    kept: 'carried',
    file: 'transcripts.json',
    why: 'a memo\'s words are a cache (decision 0169), carried because the web has no recognizer to make them again and a phone would recognise every memo again',
  },
  street_segment: { kept: 'cache', why: 'derived from the tiles, recomputed from the trace' },
  place: { kept: 'cache', why: 'places read from the tiles, read again' },
  explore_read: { kept: 'cache', why: 'where Explore read, under which build: read again' },
  atlas_area: { kept: 'cache', why: 'areas listed near you, read again' },
  outline_tile: { kept: 'cache', why: 'what each read tile held for town outlines, read again' },
  walk_tile: { kept: 'cache', why: 'walkability tiles, read again' },
  complex: { kept: 'cache', why: 'complexes derived from the tiles, derived again' },
  area: { kept: 'cache', why: 'areas a walk was placed in, recomputed from the trace' },
  walk_area: { kept: 'cache', why: 'a walk\'s area rows, recomputed from the trace' },
  walk_summary: { kept: 'cache', why: 'a walk\'s summary, recomputed from the trace' },
  visited_segment: { kept: 'cache', why: 'streets a walk credited, recomputed from the trace' },
  walk_line: { kept: 'cache', why: 'a walk\'s drawn line, recomputed from its trace (WB14)' },
  walk_line_tile: { kept: 'cache', why: 'the tiles a walk\'s line crosses, recomputed with it' },
  landing: { kept: 'cache', why: 'areas analysed for where to start, analysed again' },
};

/** Every meta key (BK3): the person's choices travel; what this device read, asked, showed or has open now stays. */
export const META_KEYS: Record<MetaKey, Exclude<Kept, 'carried'>> = {
  tile_build: 'cache',
  tile_url: 'cache',
  snap_rules: 'cache',
  overture_release: 'cache',
  overture_checked_at: 'cache',
  places_archive_manifest: 'cache',
  places_archive_checked_at: 'cache',
  street_code: 'cache',
  transcript_off: 'backup',
  nav: 'cache',
  route_leanings: 'backup',
  way_back: 'cache',
  web_note_dismissed: 'cache',
  deadzone_walk: 'cache',
  hint_go: 'cache',
  explore_hidden: 'backup',
  explore_kinds_known: 'backup',
  explore_range: 'backup',
  explore_pass: 'backup',
  complex_hidden: 'backup',
  explore_haptic: 'backup',
  atlas_press_seen: 'cache',
  map_layers: 'backup',
  walk_layer: 'backup',
  recall_open: 'cache',
  outline_nested: 'cache',
  kindwalk_budget: 'backup',
  kindwalk_mode: 'backup',
  kindwalk_density: 'backup',
  kindwalk_pref: 'backup',
  outing_chains: 'backup',
  outing_journey: 'cache',
  resurface_prefs: 'backup',
  gallery_view: 'backup',
  group_captures: 'backup',
  units: 'backup',
  space_said: 'cache',
  space_persist: 'cache',
  notify_off: 'backup',
  pending_delete: 'cache',
  backup_last: 'cache',
};

/** Every meta family: those kept per walk travel, read as `<family>:<walk id>`; a day's and a read's stay. */
export const META_FAMILY_KEYS: Record<MetaFamily, Exclude<Kept, 'carried'>> = {
  explored: 'backup',
  walk_layers: 'backup',
  places_spans: 'backup',
  walk_pass: 'backup',
  day_watched: 'cache',
  gaps_asked: 'backup',
  atlas_near: 'cache',
};

export const BACKED_KEYS = (Object.keys(META_KEYS) as MetaKey[]).filter((k) => META_KEYS[k] === 'backup');
export const WALK_FAMILIES = (Object.keys(META_FAMILY_KEYS) as MetaFamily[]).filter((k) => META_FAMILY_KEYS[k] === 'backup');

/** The file's JSON entries, in the order they are written. */
export const FILE = {
  walks: 'walks.json',
  moments: 'moments.json',
  pauses: 'pauses.json',
  stills: 'stills.json',
  gap_fills: 'gap_fills.json',
  reactions: 'reactions.json',
  threads: 'threads.json',
  recalls: 'recalls.json',
  finds: 'finds.json',
  checklist_areas: 'checklist_areas.json',
  checklist_items: 'checklist_items.json',
  marks: 'marks.json',
  offered: 'offered.json',
  transcripts: 'transcripts.json',
  meta: 'meta.json',
} as const;
export const MANIFEST = 'manifest.json';
export const traceEntry = (walkId: string) => `trace/${encodeURIComponent(walkId)}.json`;

/** Today's rows: what a backup holds and what the reader gives back. */
export interface BackupRows {
  walks: Walk[];
  traces: Record<string, TracePoint[]>;
  moments: Moment[];
  pauses: Pause[];
  stills: Still[];
  gap_fills: GapDecision[];
  reactions: StoredReaction[];
  threads: ThreadsData;
  recalls: Recall[];
  finds: Find[];
  checklist_areas: ChecklistArea[];
  checklist_items: ChecklistItem[];
  marks: Mark[];
  offered: Offered[];
  transcripts: Transcript[];
  meta: { keys: Record<string, string>; walks: Record<string, string> };
}

export interface Manifest {
  format: string;
  version: number;
  app: { version: string | null; platform: string };
  schema: { store: string; version: number | null };
  made_at: string;
  stores: string[];
  /** The pieces whose file was gone when the backup was made. */
  media_missing: string[];
}

/** A file as the upgrade chain sees it: its manifest and each JSON entry parsed. */
export interface BackupDoc {
  manifest: Manifest;
  files: Record<string, unknown>;
}

/** One step from a version to the next: `UPGRADES[n]` reads a version-n file as version n + 1. */
export type Upgrade = (doc: BackupDoc) => BackupDoc;
/** Empty while only version 1 is released. */
export const UPGRADES: Readonly<Record<number, Upgrade>> = {};

const extOf = (ref: string) => {
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(ref.split(/[?#]/)[0]);
  return m ? m[1].toLowerCase() : 'bin';
};

/**
 * Where a piece's file sits in the zip (BK2): at its stored ref under media/; a `data:` ref has none (its bytes are in
 * the row); an absolute, `file://` or climbing ref goes under media/legacy/, named by the piece.
 */
export function mediaEntry(ref: string, pieceId: string): string | null {
  if (ref.startsWith('data:')) return null;
  const plain = !/^[a-z]+:/i.test(ref) && !ref.startsWith('/') && !ref.split('/').some((p) => p === '..' || p === '.' || p === '');
  return plain ? `media/${ref}` : `media/legacy/${pieceId}.${extOf(ref)}`;
}

/** A piece as the file holds it: no small copy (a cache, 0038), and where its file is or that it was gone. */
export function pieceOut(p: Capture, entry: string | null, missing: boolean): Omit<Capture, 'thumb_path'> & { media: string | null; media_missing?: true } {
  const { thumb_path: _thumb, ...rest } = p;
  return { ...rest, media: missing ? null : entry, ...(missing ? { media_missing: true as const } : {}) };
}

const pieceIn = (p: Capture & { media?: unknown; media_missing?: unknown }): Capture => {
  const { media: _m, media_missing: _mm, ...rest } = p;
  return rest;
};

export type ReadResult = { ok: true; manifest: Manifest; rows: BackupRows } | { ok: false; words: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Reads a backup's JSON entries (name to text; media left out) into today's rows (BK4): a newer version is refused in
 * words, never half read; an older one goes through each upgrade step in turn.
 */
export function readBackup(entries: Record<string, string>, o: { steps?: Readonly<Record<number, Upgrade>>; current?: number } = {}): ReadResult {
  const steps = o.steps ?? UPGRADES;
  const current = o.current ?? BACKUP_VERSION;
  const parse = (text: string | undefined): unknown => {
    if (text === undefined) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  };
  const manifest = parse(entries[MANIFEST]);
  if (!isObject(manifest) || manifest.format !== BACKUP_FORMAT || typeof manifest.version !== 'number' || !Number.isInteger(manifest.version) || manifest.version < 1) {
    return { ok: false, words: NOT_A_BACKUP };
  }
  if (manifest.version > current) return { ok: false, words: NEWER };
  const files: Record<string, unknown> = {};
  for (const [name, text] of Object.entries(entries)) if (name !== MANIFEST && name.endsWith('.json')) files[name] = parse(text);
  let doc: BackupDoc = { manifest: manifest as unknown as Manifest, files };
  for (let v = manifest.version; v < current; v++) {
    const step = steps[v];
    if (!step) return { ok: false, words: NOT_A_BACKUP };
    doc = step(doc);
  }
  const list = <T>(name: string): T[] => (Array.isArray(doc.files[name]) ? (doc.files[name] as T[]) : []);
  const walks = list<Walk>(FILE.walks);
  const traces: Record<string, TracePoint[]> = {};
  for (const w of walks) traces[w.id] = list<TracePoint>(traceEntry(w.id));
  const th = doc.files[FILE.threads];
  const meta = doc.files[FILE.meta];
  return {
    ok: true,
    manifest: doc.manifest,
    rows: {
      walks,
      traces,
      moments: list<Moment>(FILE.moments).map((m) => ({ ...m, pieces: m.pieces.map(pieceIn) })),
      pauses: list(FILE.pauses),
      stills: list(FILE.stills),
      gap_fills: list(FILE.gap_fills),
      reactions: list(FILE.reactions),
      threads: isObject(th) ? (th as unknown as ThreadsData) : { threads: [], members: [], links: [] },
      recalls: list(FILE.recalls),
      finds: list(FILE.finds),
      checklist_areas: list(FILE.checklist_areas),
      checklist_items: list(FILE.checklist_items),
      marks: list(FILE.marks),
      offered: list(FILE.offered),
      transcripts: list(FILE.transcripts),
      meta: isObject(meta) ? (meta as BackupRows['meta']) : { keys: {}, walks: {} },
    },
  };
}

/** What a delete waiting for Undo names (BK14, decisions 0041, 0113): the file leaves it out as if it had gone. */
export interface PendingOmits {
  walks: Set<string>;
  moments: Set<string>;
  pieces: Set<string>;
  threads: Set<string>;
  /** `thread/moment` keys. */
  members: Set<string>;
  /** Moments whose finds stay, as a media delete keeps them. */
  keepFinds: Set<string>;
}

export function pendingOmits(jobs: readonly PendingJob[]): PendingOmits {
  const o: PendingOmits = { walks: new Set(), moments: new Set(), pieces: new Set(), threads: new Set(), members: new Set(), keepFinds: new Set() };
  for (const { spec } of jobs) {
    switch (spec.type) {
      case 'walk':
        o.walks.add(spec.walkId);
        break;
      case 'media':
        for (const id of spec.captureIds) {
          o.moments.add(id);
          o.keepFinds.add(id);
        }
        break;
      case 'moment':
        o.moments.add(spec.captureId);
        break;
      case 'piece':
        o.pieces.add(spec.pieceId);
        break;
      case 'thread':
        o.threads.add(spec.threadId);
        break;
      case 'remove':
        o.members.add(`${spec.threadId}/${spec.momentId}`);
        break;
      // A split or a join waiting loses nothing stored: the file holds the moment as stored.
      default:
        break;
    }
  }
  return o;
}

/**
 * The rows with a waiting delete's names taken out, and what hangs on them: a walk's moments and rows, a moment's
 * reactions, reminder, find, words, memberships and links, a moment left with no piece, a thread left with fewer than
 * two moments (OT15). Traces are the caller's (one walk at a time): it skips `omits.walks`.
 */
export function withoutPending(rows: Omit<BackupRows, 'traces'>, o: PendingOmits): Omit<BackupRows, 'traces'> {
  const walkGone = (id: string | null) => id != null && o.walks.has(id);
  const moments = rows.moments
    .filter((m) => !walkGone(m.walk_id) && !o.moments.has(m.id))
    .map((m) => ({ ...m, pieces: m.pieces.filter((p) => !o.pieces.has(p.id)) }))
    .filter((m) => m.pieces.length > 0);
  const kept = new Set(moments.map((m) => m.id));
  const pieces = new Set(moments.flatMap((m) => m.pieces.map((p) => p.id)));
  // A reminder, a find and a memo's words are kept on a piece's id (a moment's first piece shares the moment's).
  const momentOf = new Map(rows.moments.flatMap((m) => m.pieces.map((p) => [p.id, m.id] as const)));
  const gone = (pieceId: string) => momentOf.has(pieceId) && !pieces.has(pieceId);
  const members = rows.threads.members.filter((m) => kept.has(m.moment_id) && !o.threads.has(m.thread_id) && !o.members.has(`${m.thread_id}/${m.moment_id}`));
  const thin = new Set(thinThreads(rows.threads.threads.map((t) => t.id), members));
  const walkKey = (key: string) => key.slice(key.indexOf(':') + 1);
  return {
    ...rows,
    walks: rows.walks.filter((w) => !o.walks.has(w.id)),
    moments,
    pauses: rows.pauses.filter((r) => !walkGone(r.walk_id)),
    stills: rows.stills.filter((r) => !walkGone(r.walk_id)),
    gap_fills: rows.gap_fills.filter((r) => !walkGone(r.walk_id)),
    reactions: rows.reactions.filter((r) => kept.has(r.moment_id)),
    threads: {
      threads: rows.threads.threads.filter((t) => !o.threads.has(t.id) && !thin.has(t.id)),
      members: members.filter((m) => !thin.has(m.thread_id)),
      links: rows.threads.links.filter((l) => kept.has(l.from_id) && kept.has(l.to_id)),
    },
    recalls: rows.recalls.filter((r) => !gone(r.capture_id)),
    finds: rows.finds.filter((f) => !walkGone(f.walk_id) && (!gone(f.capture_id) || o.keepFinds.has(momentOf.get(f.capture_id)!))),
    marks: rows.marks.filter((m) => !walkGone(m.walk_id)),
    transcripts: rows.transcripts.filter((t) => !gone(t.capture_id)),
    meta: { keys: rows.meta.keys, walks: Object.fromEntries(Object.entries(rows.meta.walks).filter(([k]) => !o.walks.has(walkKey(k)))) },
  };
}

/** Room for the file on a phone (BK7): as much again as the media, and the very-low level kept clear. Unknown: go on. */
export function hasRoom(free: number | null, need: number): boolean {
  return free === null || free > need + SPACE.veryLowBytes;
}

export interface DateParts {
  year: number;
  /** 1 to 12. */
  month: number;
  day: number;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "chronicles-backup-2026-11-20.zip": the date only, no count, no size. */
export const backupName = (d: DateParts) => `chronicles-backup-${d.year}-${pad(d.month)}-${pad(d.day)}.zip`;

// The page's words (BK1, BK6-BK9, BK11; decision 0248).
export const YOUR_DATA = 'Your data';
export const YOUR_DATA_NOTE = 'Back up every walk and moment';
export const BACK_UP = 'Back up everything';
export const BACKING_UP = 'Backing up…';
export const FILE_LINE = 'One zip of every walk and moment you kept. Anyone with the file can see your walks, where they went, and your photos, videos and memos.';
export const NEWER = 'This backup was made by a newer Chronicles. Update the app to restore it.';
export const NOT_A_BACKUP = 'This file isn\'t a Chronicles backup.';
export const NO_ROOM = 'There isn\'t room on this phone to make the backup: it needs as much room again as your photos, videos and memos. Try again when the phone has more room.';
export const FAILED = 'The backup could not be made, and no file was kept. Try again.';
export const NO_SHARING = 'This phone has no way to share the file, so the backup was not made.';

/** "Last backup made October 3" (another year's with its year), or "Not backed up yet" (BK8). */
export function lastLine(made: DateParts | null, thisYear: number): string {
  if (!made) return 'Not backed up yet';
  const day = `${MONTHS[made.month - 1]} ${made.day}`;
  return `Last backup made ${made.year === thisYear ? day : `${day}, ${made.year}`}`;
}

const KIND_WORDS: Partial<Record<CaptureKind, [string, string]>> = { photo: ['photo', 'photos'], video: ['video', 'videos'], voice: ['memo', 'memos'] };
const KIND_ORDER: CaptureKind[] = ['photo', 'video', 'voice', 'text'];

/** The files that were gone, each kind named in words (BK6): "A photo and two memos could not be found and were left out." */
export function missingLine(kinds: readonly CaptureKind[]): string | null {
  if (!kinds.length) return null;
  const parts = KIND_ORDER.flatMap((k) => {
    const n = kinds.filter((x) => x === k).length;
    if (!n) return [];
    const [one, many] = KIND_WORDS[k] ?? ['note', 'notes'];
    return [n === 1 ? `a ${one}` : `${numberWord(n)} ${many}`];
  });
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `${list[0].toUpperCase()}${list.slice(1)} could not be found and ${kinds.length === 1 ? 'was' : 'were'} left out.`;
}

/** Raised where the backup stops with words for the person (no room, no share sheet). */
export class BackupRefusal extends Error {
  constructor(readonly words: string) {
    super(words);
  }
}
