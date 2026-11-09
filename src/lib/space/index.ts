// @layer shell
// @instance: storage awareness, built from the app's ports and the platform's probe
import { ports } from '../ports';
import { probe } from './probe';
import { createSpace } from './shell';

/** The app's storage awareness (SA1-SA10): screens call it and read its store. */
export const space = createSpace(ports, probe);
