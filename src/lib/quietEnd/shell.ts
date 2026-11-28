// @layer shell
import type { Ports } from '../ports/types';
import { readTrace } from '../rides';
import type { Walk } from '../types';
import { quietEndAt, untilEnd, type QuietInput } from './core';

export interface QuietEndDeps {
  /** Snaps the walk again from the tiles in code (`snapWalk` with `tileCollector()`), as Keep or Not this way does. */
  snap(walk: Walk): Promise<unknown>;
  /** Builds its Where I've been line again (`pastLines.build`). */
  rebuildLine(walkId: string): Promise<unknown>;
  /** Tells the screens the walk changed (`notifyWalkChanged`). */
  changed(): void;
}

/**
 * A walk left running (specs/forgotten-stop, decision 0272): reads where a walk went quiet, at a Stop (quiet up to now)
 * or for a kept walk (quiet up to its own end), and moves a kept walk's end back to that point when the walker taps End
 * it in its More (⋯) (QE7). Nothing here runs by itself, and nothing is notified (QE9).
 */
export function createQuietEnd(p: Pick<Ports, 'db' | 'clock'>, deps: QuietEndDeps) {
  async function input(walk: Walk): Promise<QuietInput> {
    const [points, pauses, stills, moments] = await Promise.all([
      p.db.getPoints(walk.id),
      p.db.getPauses(walk.id),
      p.db.getStills(walk.id).catch(() => []),
      p.db.getMoments(walk.id),
    ]);
    const tr = readTrace(untilEnd(points, walk.ended_at), walk.started_at, pauses, stills);
    return { tr, pauses, captures: moments.flatMap((m) => m.pieces.map((x) => x.t)) };
  }
  async function at(walkId: string): Promise<number | null> {
    const walk = await p.db.getWalk(walkId);
    if (!walk) return null;
    return quietEndAt(await input(walk), walk.ended_at ?? p.clock.now());
  }
  return {
    at,
    /** Moves a kept walk's end back to its quiet point, read again now: never forward, never to any other time. */
    async endAt(walkId: string, point: number): Promise<void> {
      const walk = await p.db.getWalk(walkId);
      if (!walk || walk.open) throw new Error('That walk is not finished.');
      if ((await at(walkId)) !== point) throw new Error('That walk changed. Open it again.');
      await p.db.updateWalk(walkId, { ended_at: point });
      // Derived rows follow from the trace read up to the new end, never patched (truth vs cache).
      await deps.snap({ ...walk, ended_at: point }).catch(() => p.db.updateWalk(walkId, { snapped_build: null }).catch(() => {}));
      await deps.rebuildLine(walkId).catch(() => {});
      deps.changed();
    },
  };
}

export type QuietEnd = ReturnType<typeof createQuietEnd>;
