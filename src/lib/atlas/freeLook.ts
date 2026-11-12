// @layer core
/*
 * Free look (FL1-FL21, decision 0147): the pure part. Signatures only until the slice's code: every function throws, so the
 * tests written first fail for the right reason ("not built"), never from a missing import.
 */
import type { LngLat } from '../types';
import type { Listed, NearRead } from './atlas';

const notBuilt = (): never => {
  throw new Error('free-look: not built');
};

export interface LookWords {
  /** The page's title while looking: what it is around, never where the reader is (FL7). */
  title: string;
  subtitle: string;
  /** Said once for each look (FL13). */
  announcement: string;
  /** The row's place when nothing is mapped around the middle (FL20). */
  empty: string;
}

export interface MoveMapLabel {
  label: string;
  hint: string;
  pressed: boolean;
}

/** The title, subtitle, announcement and empty line of a looked page (FL7, FL13, FL20). */
export function lookWords(): LookWords {
  return notBuilt();
}

/** The Move map toggle's name, hint and pressed state (FL2). */
export function moveMapLabel(_on: boolean): MoveMapLabel {
  return notBuilt();
}

/** The pill's label (FL5, FL11). */
export function showHereLabel(): string {
  return notBuilt();
}

/** The map canvas's accessible name, in snapping and in Move map (FL13). */
export function mapLabel(_free: boolean): string {
  return notBuilt();
}

/** The point Show areas here takes: the map's own settled middle, or null before the map has reported one (FL5, FL6). */
export function centreOf(_cam: { center: LngLat; zoom: number } | null): LngLat | null {
  return notBuilt();
}

/** A fix as `you`, only while it is fresh (0121's window); else null (FL12). */
export function youFresh(_fix: { at: LngLat; t: number } | null, _now: number): LngLat | null {
  return notBuilt();
}

/**
 * A list as a looked page lists it (FL6, FL7, FL12): plain distance order from `centre` (no outline-first move), `here` never
 * set, each distance measured from `you`, or `unplaced` (no distance said) when `you` is null.
 */
export function lookedList(_list: Listed[], _centre: LngLat, _you: LngLat | null): Listed[] {
  return notBuilt();
}

/** The newest read around you at this radius, never a read made for a look (FL15). */
export function listedAround(_reads: NearRead[], _radiusM: number): NearRead | null {
  return notBuilt();
}

/** The frame key of a look: each look is its own page, so a second one frames again (FL6). */
export function lookPage(_centre: LngLat): string {
  return notBuilt();
}

/** The empty line when a settled look has no area to show, else null (FL20). */
export function emptyLook(_shown: number, _status: 'idle' | 'listing' | 'reading' | 'offline'): string | null {
  return notBuilt();
}
