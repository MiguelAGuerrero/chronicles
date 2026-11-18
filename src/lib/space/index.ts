// @layer shell
// @instance: storage awareness, built from the app's ports, the platform's probe and where its line can be seen
import { ports } from '../ports';
import { barOfferUp, modalsUp } from '../tabsHidden';
import { probe } from './probe';
import { createSpace } from './shell';
import { sightOf, spaceLines } from './sight';

/**
 * The app's storage awareness (SA1-SA10): screens call it and read its store. A line is said only where it can be seen:
 * a SpaceLine mounted, no Modal up, and not while the bar's Edit pill is offered (tend tabs T37, audit 32).
 */
export const space = createSpace(ports, probe, sightOf({ pill: barOfferUp, lines: spaceLines, modals: modalsUp }));
