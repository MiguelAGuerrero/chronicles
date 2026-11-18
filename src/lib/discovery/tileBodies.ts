// @layer shell
/**
 * The z14 tile bodies the in-code reads fetch, shared (performance review, Nov 18): landing, Explore, the atlas, gaps,
 * the planner and scenic routes each fetched the same tiles again. One fetch serves every reader of a tile at once, and
 * the last `keep` bodies read are kept for the session, so a read moments later fetches nothing.
 *
 * A reader that stops (`shouldStop`) stops waiting at once; the fetch itself stops only when no reader waits on it any
 * more, so cancel still stops the download (the audit's rule) without failing another reader. Each reader gets its
 * own copy of the bytes: one handing its buffer to a worker leaves the kept body and the others whole. A failure is
 * never kept. The key is the tile's whole URL, which names the tile build, so a new build fetches afresh.
 */
export function createTileBodies(o: { fetch: (url: string, signal: AbortSignal) => Promise<ArrayBuffer>; keep: number }) {
  const kept = new Map<string, ArrayBuffer>();
  const flights = new Map<string, { body: Promise<ArrayBuffer>; ctl: AbortController; waiting: number }>();

  const remember = (url: string, b: ArrayBuffer) => {
    kept.delete(url);
    kept.set(url, b);
    while (kept.size > o.keep) kept.delete(kept.keys().next().value!);
  };

  function get(url: string, shouldStop?: () => boolean): Promise<ArrayBuffer> {
    const hit = kept.get(url);
    if (hit) {
      remember(url, hit);
      return Promise.resolve(hit.slice(0));
    }
    let f = flights.get(url);
    if (!f) {
      const ctl = new AbortController();
      const body = o.fetch(url, ctl.signal).then((b) => {
        remember(url, b);
        return b;
      });
      const flight = { body, ctl, waiting: 0 };
      // Gone once settled, kept or failed: a failure is fetched afresh by the next reader.
      body.then(() => flights.delete(url), () => flights.delete(url));
      flights.set(url, flight);
      f = flight;
    }
    const flight = f;
    flight.waiting++;
    return new Promise<ArrayBuffer>((resolve, reject) => {
      let done = false;
      const leave = () => {
        done = true;
        if (poll) clearInterval(poll);
        flight.waiting--;
      };
      const poll = shouldStop
        ? setInterval(() => {
            if (done || !shouldStop()) return;
            leave();
            if (flight.waiting === 0) flight.ctl.abort();
            reject(new Error('stopped'));
          }, 200)
        : null;
      flight.body.then(
        (b) => {
          if (done) return;
          leave();
          resolve(b.slice(0));
        },
        (e: unknown) => {
          if (done) return;
          leave();
          reject(e);
        },
      );
    });
  }

  return { get };
}
