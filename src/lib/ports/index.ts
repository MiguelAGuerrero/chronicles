import { db } from '../db';
import { newId } from '../id';
import { notifier } from '../notify';
import { recorder } from '../recorder';
import type { Ports } from './types';

export type { Clock, Ports } from './types';

/**
 * The app's real ports: the composition root. Hooks and screens pass this to
 * a feature's shell; shells and core never import it. Built at module load,
 * so the background location task (registered from `index.js`) and the
 * screens share one instance.
 */
export const ports: Ports = {
  db,
  recorder,
  notifier,
  clock: { now: () => Date.now() },
  newId,
};
