// @layer shell
import { db } from '../db';
import { hiddenToMeta, parseHiddenKinds } from './kinds';
import type { ComplexKind } from './types';

/** CX10: the kinds switched off, kept in meta `complex_hidden`; an open screen hears of a change at once. */
const KEY = 'complex_hidden';
const listeners = new Set<(hidden: ComplexKind[]) => void>();

export async function loadHiddenKinds(): Promise<ComplexKind[]> {
  return parseHiddenKinds(await db.getMeta(KEY));
}

export async function saveHiddenKinds(hidden: ComplexKind[]): Promise<void> {
  await db.setMeta(KEY, hiddenToMeta(hidden));
  for (const fn of listeners) fn(hidden);
}

export function onHiddenKinds(fn: (hidden: ComplexKind[]) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
