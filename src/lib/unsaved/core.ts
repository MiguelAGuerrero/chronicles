// @layer core
/**
 * Unsaved captures have one owner (specs/unsaved-captures, UN1-UN15, decision 0196): the words and the decisions of
 * the one holder of every photo, video and voice memo whose save failed. Pure: no clock, no storage.
 */
import { heldLabel, saveFailLine } from '../space/core';

export type UnsavedKind = 'photo' | 'video' | 'voice';

/** A capture that could not be saved, as the holder keeps it: enough for any screen's Retry to keep it where it belongs. */
export interface Unsaved<S = unknown> {
  /** The entry's own id, never the capture's. */
  id: string;
  kind: UnsavedKind;
  /** The walk it was taken on; null outside a walk (UN4). */
  walkId: string | null;
  /** When and where it was begun, what it answers and the open moment it joins. */
  stamp: S;
  /** The picker's or the recorder's file, until it is kept. */
  uri: string | null;
  ext: string;
  /** A video's or a memo's length in ms, its body. */
  ms: number | null;
  /** The kept file, once kept: every later Retry uses it (UN12). */
  path: string | null;
  /** Why it failed: no room left, or anything else (SA9). */
  outOfSpace: boolean;
  /** Said on a screen in front already (UN9). */
  said: boolean;
  /** Taken by a Retry under way: another skips it (UN3). */
  retrying: boolean;
}

/** Folder for the media of moments made outside any walk. */
export const LOOSE_FOLDER = 'moments';

/** Where a held capture's file goes: its own walk's folder, or the loose moments' (UN4). */
export function folderOf(walkId: string | null): string {
  return walkId ?? LOOSE_FOLDER;
}

/** What is held, as a key of its kinds in the order taken: a store selector's primitive (the render budget). */
export function heldKey(list: readonly { kind: UnsavedKind }[]): string {
  return list.map((x) => x.kind).join(',');
}

/** The kinds back from a key. */
export function kindsOf(key: string): UnsavedKind[] {
  return key ? (key.split(',') as UnsavedKind[]) : [];
}

/** The photos and videos among them, for SA8's pill. */
export function shotKinds(list: readonly { kind: UnsavedKind }[]): ('photo' | 'video')[] {
  return list.flatMap((x) => (x.kind === 'voice' ? [] : [x.kind]));
}

/** The memo pill: one or several, in the screen's own noun ("Voice memo", Memories' "Voice note"), never a count (UN2). */
export function memoLabel(n: number, noun: 'Voice memo' | 'Voice note'): string | null {
  if (n <= 0) return null;
  return `${noun}${n > 1 ? 's' : ''} not saved`;
}

/** Whether Stop warns: something of the walk is held that it has not warned of (UN5). */
export function stopWarns(held: readonly string[], warned: readonly string[]): boolean {
  return held.some((id) => !warned.includes(id));
}

/** The walk screen's warning, naming what is held in words, as SA8 says it (UN5). */
export function stopWarning(kinds: readonly UnsavedKind[]): string {
  const memos = kinds.filter((k) => k === 'voice').length;
  const shots = shotKinds(kinds.map((kind) => ({ kind })));
  const several = kinds.length > 1;
  const end = `Retry, or hold Stop again to end the walk without ${several ? 'them' : 'it'}.`;
  if (!shots.length) return memos === 1 ? `The voice memo could not be saved. ${end}` : `Voice memos not saved yet. ${end}`;
  const nouns = heldLabel(shots).replace(/ not saved$/, '');
  if (!memos) return `${nouns} not saved yet. ${end}`;
  const memo = `voice memo${memos > 1 ? 's' : ''}`;
  return `${nouns.replace(' and ', ', ')} and ${memo} not saved yet. ${end}`;
}

/** The recording bar's warning: whole on one line at 320 px, and no Retry promised on a bar that has none (UN6). */
export function barWarning(several: boolean): string {
  return `Not saved yet. Hold Stop again to end without ${several ? 'them' : 'it'}.`;
}

/** Where a failure's Retry is: on this screen, on the walk screen, or on Memories. */
export type HeldWhere = 'here' | 'walk' | 'memories';

/**
 * Why a save failed, in words: SA9's where the pill shows, and where its Retry is from a screen with none (UN9, UN10).
 * `short`: the recording bar's own words, which fit beside its controls (the owner, Nov 17; unsaved-captures audit 7).
 */
export function heldWhere(kind: UnsavedKind, outOfSpace: boolean, where: HeldWhere, short = false): string {
  if (where === 'here' || !outOfSpace) return saveFailLine(kind, outOfSpace);
  const place = where === 'walk' ? 'the walk screen' : 'Memories';
  return short ? `No room left. Retry on ${place}.` : `Not saved: there is no room left. It is held for Retry on ${place}.`;
}

/**
 * A capture whose save fails after its walk ended: held as a moment of its own, at its time and place, outside the
 * ended walk (the owner, Nov 17: "Keep it as its own moment"; unsaved-captures audit 3).
 */
export function looseAfterEnd<S extends { walk: string | null; into?: string | null }>(s: S): S {
  return { ...s, walk: null, into: null };
}

/**
 * Keeps a capture in order: its file once (never again when kept, UN12), then its row. Once the row is written it is
 * kept, whatever fails after (unsaved-captures audit 6); before that, the kept path as far as it got and why.
 */
export async function keepInOrder(
  k: { uri: string | null; path: string | null },
  steps: {
    keepFile(uri: string): Promise<string>;
    write(path: string): Promise<string | null>;
    after(id: string | null, path: string): void | Promise<void>;
  },
): Promise<{ id: string | null } | { path: string | null; error: unknown }> {
  let path = k.path;
  let id: string | null;
  try {
    if (!path) {
      if (!k.uri) throw new Error('Nothing to keep.');
      path = await steps.keepFile(k.uri);
    }
    id = await steps.write(path);
  } catch (error) {
    return { path, error };
  }
  try {
    await steps.after(id, path);
  } catch {
    // The row is stored: what follows never makes it unsaved.
  }
  return { id };
}

/** The open moment a Retry joins: the one it was taken for, or none when that moment is gone (UN11). */
export function retryInto(into: string | null | undefined, exists: boolean): string | null {
  return into && exists ? into : null;
}

/** The files a capture let go leaves: a file never kept is dropped, a kept one removed (UN8, UN12). */
export function letGoFiles(list: readonly { uri: string | null; path: string | null }[]): { temps: string[]; kept: string[] } {
  const temps: string[] = [];
  const kept: string[] = [];
  for (const x of list) {
    if (x.path) kept.push(x.path);
    else if (x.uri) temps.push(x.uri);
  }
  return { temps, kept };
}

/** A memo lost at Stop, said while the walker is still there; the walk ends on a second hold (UN13). */
export function lostAtStop(line: string): string {
  return `${line} Hold Stop again to end the walk.`;
}
