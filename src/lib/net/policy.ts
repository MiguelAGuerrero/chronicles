// @layer core

/*
 * The rules every request to an outside service follows (fix net-rules, decision 0100): one table of the hosts
 * the app fetches from, the app's name for a phone's requests, and how long a host that refuses is left alone.
 * The network side is `net/shell.ts`; the app's instance is `net/index.ts`. `scripts/check-vision.js` keeps
 * ALLOWED_HOSTS, the list a reviewer reads; this table must stay inside it (a test checks).
 */

export interface HostPolicy {
  name: string;
  /**
   * Its reader keeps its own back-off, so the module never pauses it: Overpass (WK4; a second pause would spend its
   * session cap) and Overture (its reader's timeouts and the release check's 10-min wait; a pause on the bucket
   * would send walkability to Overpass, fix net-rules audit 2).
   */
  ownBackoff?: boolean;
  /** Switched off: never asked. Every host ships on; this is the switch the owner flips. */
  off?: boolean;
}

export const HOSTS: Record<string, HostPolicy> = {
  'tiles.openfreemap.org': { name: 'OpenFreeMap: the map tiles and their build' },
  'overturemaps-extras-us-west-2.s3.amazonaws.com': { name: 'Overture: places, divisions and transportation, by tile', ownBackoff: true },
  'overpass-api.de': { name: 'Overpass: the walkability fallback', ownBackoff: true },
  // PW16 (Nov 10): the chronicles-data Pages site, the places archive by byte range (decision 0103).
  'miguelaguerrero.github.io': { name: 'chronicles-data: the places archive and its manifest' },
};

/** What a phone's requests are signed with: the app and where it lives, never the person or the device. */
export const APP_AGENT = 'Chronicles (+github.com/MiguelAGuerrero/chronicles)';

/** Answers that ask the app to stay away for a while. */
export const REFUSED: readonly number[] = [429, 503];
export const PAUSE_MS = 60_000;
export const PAUSE_MAX_MS = 3_600_000;

export function hostOf(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * A Retry-After header as seconds to wait (its seconds form, or its HTTP-date form against `now`), or null when
 * absent or unreadable. Browsers hide the header on a cross-origin answer unless the server exposes it, so on
 * the web it is usually null.
 */
export function retryAfterS(header: string | null | undefined, now: number): number | null {
  if (header == null) return null;
  if (/^\s*\d+\s*$/.test(header)) return Number(header);
  // An HTTP date always says GMT; without a zone, Date.parse would read the device's time zone.
  if (!/\bGMT\b/.test(header)) return null;
  const at = Date.parse(header);
  return Number.isFinite(at) ? Math.max(0, Math.ceil((at - now) / 1000)) : null;
}

/** How long to leave a host alone after this answer: null unless it refused; a minute, or its Retry-After, up to an hour. */
export function pauseFor(status: number, retryAfter: number | null): number | null {
  if (!REFUSED.includes(status)) return null;
  return Math.min(Math.max(PAUSE_MS, retryAfter != null ? retryAfter * 1000 : 0), PAUSE_MAX_MS);
}

/**
 * The request's headers, with the app's name on a phone. Not on the web: browsers forbid setting User-Agent,
 * and any other custom header would make a cross-origin request send a preflight first.
 */
export function withAgent(headers: HeadersInit | undefined, platform: 'web' | 'native'): Headers {
  const h = new Headers(headers);
  if (platform === 'native' && !h.has('user-agent')) h.set('user-agent', APP_AGENT);
  return h;
}
