// @layer shell
import { EtagMismatch, type RangeResponse, type Source } from 'pmtiles';
import { HOSTS, hostOf, pauseFor, retryAfterS, withAgent, type HostPolicy } from './policy';

/*
 * The network side of the rules in `net/policy.ts` (fix net-rules, decision 0100). Every request to an outside
 * service goes through `fetch` here, and every PMTiles archive through `source`: the app's name on a phone, a
 * host that refused left alone for a while (requests meanwhile fail at once, as an offline one does), a host
 * switched off never asked. A factory given its fetch and clock, so tests run it with fakes.
 */

export class NetPaused extends Error {
  constructor(readonly host: string, readonly until: number) {
    super(`${host} refused; left alone until ${new Date(until).toISOString()}`);
    this.name = 'NetPaused';
  }
}

export class NetOff extends Error {
  constructor(readonly host: string) {
    super(`${host} is switched off`);
    this.name = 'NetOff';
  }
}

export interface Net {
  fetch(url: string, init?: RequestInit): Promise<Response>;
  /** A PMTiles source over `fetch`: byte ranges, no credentials, no referrer. */
  source(url: string): Source;
}

export function createNet(p: {
  fetch: typeof fetch;
  now: () => number;
  platform: 'web' | 'native';
  hosts?: Record<string, HostPolicy>;
  /** The browser cache for byte ranges: 'no-store' on Chrome for Windows, whose range cache is broken (as pmtiles' FetchSource). */
  rangeCache?: RequestCache;
}): Net {
  const hosts = p.hosts ?? HOSTS;
  const pausedUntil = new Map<string, number>();

  async function netFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const host = hostOf(url);
    const policy = host ? hosts[host] : undefined;
    if (host && policy?.off) throw new NetOff(host);
    const paces = host != null && !policy?.ownBackoff;
    if (paces) {
      const until = pausedUntil.get(host) ?? 0;
      if (p.now() < until) throw new NetPaused(host, until);
    }
    const res = await p.fetch(url, { ...init, headers: withAgent(init.headers, p.platform) });
    if (paces) {
      const ms = pauseFor(res.status, retryAfterS(res.headers?.get?.('retry-after'), p.now()));
      if (ms != null) pausedUntil.set(host, p.now() + ms);
    }
    return res;
  }

  function source(url: string): Source {
    // As pmtiles' FetchSource: ranges, a changed ETag, an archive shorter than the first read, a server that
    // ignores ranges (fix net-rules audit 3-6).
    // After the archive changed under us, pmtiles retries: every later read skips the browser's cache (audit 7).
    let mustReload = false;
    const read = (range: string, signal: AbortSignal) => {
      const cache = mustReload ? 'reload' : p.rangeCache;
      return netFetch(url, { headers: { range }, signal, credentials: 'omit', referrerPolicy: 'no-referrer', ...(cache ? { cache } : {}) });
    };
    return {
      getKey: () => url,
      async getBytes(offset: number, length: number, outer?: AbortSignal, etag?: string): Promise<RangeResponse> {
        const ctl = new AbortController();
        const stop = () => ctl.abort();
        if (outer?.aborted) ctl.abort();
        outer?.addEventListener('abort', stop);
        try {
          let res = await read(`bytes=${offset}-${offset + length - 1}`, ctl.signal);
          const header = (name: string) => res.headers?.get?.(name) ?? undefined;
          if (offset === 0 && res.status === 416) {
            const whole = header('content-range');
            if (!whole?.startsWith('bytes */')) throw new Error('Missing content-length on 416 response');
            res = await read(`bytes=0-${Number(whole.slice(8)) - 1}`, ctl.signal);
          }
          const fresh = header('etag');
          const strong = fresh && !fresh.startsWith('W/') ? fresh : undefined;
          // A 416 past the first read, or a changed ETag: the archive changed (as FetchSource; audit 8).
          if (res.status === 416 || (etag && strong && strong !== etag)) {
            mustReload = true;
            throw new EtagMismatch(`The archive changed (ETag ${etag ?? 'none'} is now ${strong ?? 'none'}, status ${res.status})`);
          }
          // The status stays in the message: a 403 or 404 says the release is missing (activity/reader.ts).
          if (res.status >= 300) throw new Error(`Bad response code: ${res.status}`);
          const size = header('content-length');
          if (res.status === 200 && (!size || Number(size) > length)) {
            ctl.abort();
            throw new Error('The server ignored byte ranges (a 200 with the whole file)');
          }
          return { data: await res.arrayBuffer(), etag: strong, cacheControl: header('cache-control'), expires: header('expires') };
        } finally {
          outer?.removeEventListener('abort', stop);
        }
      },
    };
  }

  return { fetch: netFetch, source };
}
