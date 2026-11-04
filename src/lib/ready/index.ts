// @layer shell
// @instance: the ready walk screen's shell, on the app's ports
import { ports } from '../ports';
import { createReady } from './shell';

export type { ReadyChoices } from './shell';

/** The ready walk screen's shell, built from the app's real ports (Navigate, ready). */
export const ready = createReady(ports);
