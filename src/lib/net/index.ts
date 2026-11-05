// @layer shell
// @instance: the app's network module (net/shell.ts) over the platform's fetch and clock
import { Platform } from 'react-native';
import { createNet } from './shell';

const web = Platform.OS === 'web';
const agent = web && typeof navigator !== 'undefined' ? navigator.userAgent : '';
// Chrome-family browsers on Windows cache byte ranges wrongly (as pmtiles' FetchSource works around).
const rangeCache: RequestCache | undefined = /Windows/.test(agent) && /Chrome|Chromium|Edg|OPR|Brave/.test(agent) ? 'no-store' : undefined;

export const net = createNet({ fetch: (...a) => fetch(...a), now: () => Date.now(), platform: web ? 'web' : 'native', rangeCache });
export { NetOff, NetPaused } from './shell';
