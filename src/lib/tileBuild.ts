/**
 * Reads the served tile build from a TileJSON, within a time limit. Pure (no
 * db), so it can be tested. A phone's fetch can stall for minutes on a weak
 * signal, and the replay waits on this, so it gives up and the caller falls
 * back to the last build seen (bug, Nov 1: a blank screen after Stop).
 */
export const TILEJSON_MS = 5000;

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export async function fetchTileBuild(
  fetchFn: Fetch,
  timeoutMs = TILEJSON_MS,
  url = 'https://tiles.openfreemap.org/planet',
): Promise<{ build: string; url: string } | null> {
  const ctl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // The race covers a body that never finishes too, where an abort may not reach.
  const late = new Promise<null>((res) => {
    timer = setTimeout(() => {
      ctl.abort();
      res(null);
    }, timeoutMs);
  });
  const read = (async () => {
    const res = await fetchFn(url, { signal: ctl.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as { tiles?: string[] };
    const tile = json.tiles?.[0] ?? '';
    if (!tile) return null;
    const m = /\/([0-9]{8}_[0-9A-Za-z_]+)\/\{z\}/.exec(tile);
    return { build: m ? m[1] : tile, url: tile };
  })().catch(() => null);
  try {
    return await Promise.race([read, late]);
  } finally {
    clearTimeout(timer);
  }
}
