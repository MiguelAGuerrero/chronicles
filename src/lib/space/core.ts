// @layer core
/**
 * Storage awareness (specs/storage-awareness, SA1-SA10, decision 0104): how much room is left, when to
 * say so, and the words. Pure: the room is read by the probe and remembered by the shell.
 */

const MB = 1024 * 1024;

/** The two levels, in bytes left (SA2), the same on every platform. */
export const SPACE = { lowBytes: 500 * MB, veryLowBytes: 100 * MB } as const;

export type SpaceLevel = 'low' | 'very-low';

/** The platform's side: the room left, and (on the web) the browser's answer to "keep this app's data". */
export interface SpaceProbe {
  /** Bytes left for the app, or null when it can't be read (SA1). */
  free(): Promise<number | null>;
  /** Asks to be kept: true granted, false refused, null where there is nothing to ask (a phone). */
  persist(): Promise<boolean | null>;
  /** An iPhone or iPad browser outside the Home Screen app, where the Home Screen can be named (SA10). */
  homeScreen(): boolean;
}

/** The level for a reading; nothing for plenty, or for a reading that isn't a count of bytes (SA1, SA2). */
export function spaceLevel(free: number | null): SpaceLevel | null {
  if (free == null || !Number.isFinite(free) || free < 0) return null;
  if (free < SPACE.veryLowBytes) return 'very-low';
  if (free < SPACE.lowBytes) return 'low';
  return null;
}

const RANK: Record<SpaceLevel, number> = { low: 1, 'very-low': 2 };

/** Said once for each level; again only when it is worse than the level last said (SA4). */
export function shouldSay(said: SpaceLevel | null, level: SpaceLevel | null): boolean {
  if (!level) return false;
  return said == null || RANK[level] > RANK[said];
}

/** The line beside the captures (SA3): room for moments, never "this device", never a number (SA7). */
export function spaceLine(level: SpaceLevel): string {
  return level === 'low'
    ? 'Room for new photos and videos is running low.'
    : 'There is almost no room left for new photos, videos and memos.';
}

/** The browser refused to keep the app's data (SA10); the Home Screen is named only where there is one. */
export function persistLine(homeScreen: boolean): string {
  const line = 'This browser may clear Chronicles’ moments when it needs room.';
  return homeScreen ? `${line} The Home Screen app is less likely to.` : line;
}

const OUT_OF_SPACE = [
  /quota/i, // the web's QuotaExceededError
  /ENOSPC/, // Android, node
  /no space left/i,
  /SQLITE_FULL|disk is full/i,
  /(isn.t|not) enough (space|storage|room)/i, // iOS NSFileWriteOutOfSpaceError
  /NSCocoaErrorDomain\D+640\b/, // iOS, by its code
];

/** Whether a failed save failed for lack of room (SA9). */
export function isOutOfSpace(e: unknown): boolean {
  if (typeof e !== 'object' || e == null) return false;
  const { name, message } = e as { name?: unknown; message?: unknown };
  const text = `${typeof name === 'string' ? name : ''} ${typeof message === 'string' ? message : ''}`;
  return OUT_OF_SPACE.some((r) => r.test(text));
}

export type SaveKind = 'photo' | 'video' | 'voice';

const KIND_WORD: Record<SaveKind, string> = { photo: 'photo', video: 'video', voice: 'voice memo' };

/** Why a save failed, in words; never the platform's raw error (SA9). */
export function saveFailLine(kind: SaveKind, outOfSpace: boolean): string {
  return outOfSpace ? 'Not saved: there is no room left. It is held here for Retry.' : `Couldn’t save this ${KIND_WORD[kind]}.`;
}

/** What is held for Retry, in words, never a count (SA8). */
export function heldLabel(kinds: ('photo' | 'video')[]): string {
  const photos = kinds.includes('photo');
  const videos = kinds.includes('video');
  if (kinds.length === 1) return photos ? 'Photo not saved' : 'Video not saved';
  if (photos && videos) return 'Photos and videos not saved';
  return photos ? 'Photos not saved' : 'Videos not saved';
}

/**
 * An iPhone or iPad browser outside the Home Screen app: the one place the refusal names the Home Screen
 * (SA10). An iPad asking for the desktop site reports a Mac with touch, as in `nav/handoff`.
 */
export function homeScreenNamed(env: { ua?: string; touchPoints?: number; standalone?: boolean }): boolean {
  const ua = env.ua ?? '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (env.touchPoints ?? 0) > 1);
  return ios && !env.standalone;
}
