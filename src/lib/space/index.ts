// @layer shell
// @instance: storage awareness, built from the app's ports, the platform's probe and the recording bar's Edit pill
import { ports } from '../ports';
import { barOfferUp } from '../tabsHidden';
import { probe } from './probe';
import { createSpace } from './shell';

/** The app's storage awareness (SA1-SA10): screens call it and read its store; it waits while the bar's Edit pill is up (tend tabs T37). */
export const space = createSpace(ports, probe, barOfferUp);
