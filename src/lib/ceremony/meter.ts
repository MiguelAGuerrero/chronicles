// @layer view
/**
 * A readout of the frames a replay really draws (replay ceremony RC6; decision 0206), for the owner's looks at the
 * engine on a phone: the test machine draws the map in software and cannot say what an iPhone does. It shows only at the
 * preview address, or when a replay's link asks (`meter=1`); the app itself never shows it, and it goes with the
 * link's `fps` once the engine's ceiling is chosen (docs/DEFERRED.md).
 *
 * The replay's loop notes every frame the display offers; once a second the meter says how many were drawn, the longest
 * wait between two drawn frames, and how long drawing one took. No React and no clock of its own (the time is the
 * loop's), so `npm test` loads it.
 */

export interface Meter {
  /** The last second, in words; empty until one has passed. */
  line(): string;
  /** A frame the display offered at `now`: whether the replay drew it, and how long that took. */
  note(now: number, drew: boolean, drawMs: number): void;
  /** Told when the line changes: once a second. */
  subscribe(listener: () => void): () => void;
}

/** How long a readout covers. */
const WINDOW_MS = 1000;

export function createMeter(): Meter {
  let line = '';
  let since = -1;
  let offered = 0;
  let drawn = 0;
  let drawMs = 0;
  let lastDrawn = -1;
  let longest = 0;
  const listeners = new Set<() => void>();
  return {
    line: () => line,
    note(now, drew, ms) {
      if (since < 0) {
        // The first frame begins the count; it is not counted itself, as a second's frames are the gaps between them.
        since = now;
        if (drew) lastDrawn = now;
        return;
      }
      offered++;
      if (drew) {
        drawn++;
        drawMs += ms;
        if (lastDrawn >= 0) longest = Math.max(longest, now - lastDrawn);
        lastDrawn = now;
      }
      const span = now - since;
      if (span < WINDOW_MS) return;
      const perSecond = (n: number) => Math.round((n * 1000) / span);
      const each = drawn ? Math.round((drawMs / drawn) * 10) / 10 : 0;
      line = `${perSecond(drawn)} frames a second drawn, ${perSecond(offered)} offered · longest wait ${Math.round(longest)} ms · ${each} ms to draw`;
      since = now;
      offered = 0;
      drawn = 0;
      drawMs = 0;
      longest = 0;
      for (const l of [...listeners]) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Whether the readout shows: at the preview address (the site's base path ends in `/preview`), or as the link asks. */
export function meterOn(base: string, asked?: string | null): boolean {
  if (asked === '1') return true;
  if (asked === '0') return false;
  return /\/preview\/?$/.test(base);
}
