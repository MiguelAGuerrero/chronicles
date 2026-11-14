// @layer shell
import { capturesToFind, readJoin, type ChecklistArea, type ChecklistItem } from './explore';
import type { LngLat } from '../types';

/** `stopped`: the caller stopped it (tend explore audit 13): no failure, so no failure's wait. */
export type ExploreResult = { ok: true; areas: ChecklistArea[] } | { ok: false; stopped?: boolean };
const STOPPED: ExploreResult = { ok: false, stopped: true };
type Read = (centre: LngLat, opts: { remember: boolean }, shouldStop: () => boolean) => Promise<ExploreResult>;

/**
 * The explore reads' queue (E5; tend explore 15, audit 11), its read passed in, so a test runs it with a fake: one read
 * at a time, the same centre sharing the running read (`readJoin`), another centre waiting for it, then reading its own.
 * `hold` marks a read on its way from the moment a caller starts deciding where to read (the build, the archive, the
 * kept reads come first), so `pending` is true before `running` is: a capture made meanwhile waits for that read. A
 * caller that waited asks whether it was stopped before reading its own (a route dropped meanwhile reads nothing), and a
 * read its caller stopped says so (`stopped`, audit 13).
 */
export function createReadQueue(read: Read) {
  let running: Promise<ExploreResult> | null = null;
  let runningAt: LngLat | null = null;
  let held = 0;
  const run = (centre: LngLat, opts: { remember: boolean }, shouldStop: () => boolean): Promise<ExploreResult> => {
    const join = readJoin(running ? runningAt : null, centre);
    if (running && join === 'join') return running;
    if (running && join === 'wait') return running.then((): ExploreResult | Promise<ExploreResult> => (shouldStop() ? STOPPED : run(centre, opts, shouldStop)));
    runningAt = centre;
    const mine: Promise<ExploreResult> = read(centre, opts, shouldStop)
      .catch((): ExploreResult => ({ ok: false }))
      .then((r) => (!r.ok && shouldStop() ? STOPPED : r))
      .finally(() => {
        if (running === mine) {
          running = null;
          runningAt = null;
        }
      });
    running = mine;
    return mine;
  };
  return {
    read: run,
    /** Whether a read runs now. */
    running: () => running != null,
    /** Whether a read runs, or a caller holding the queue is still deciding where to read (tend explore audit 11). */
    pending: () => running != null || held > 0,
    async hold<T>(fn: () => Promise<T>): Promise<T> {
      held++;
      try {
        return await fn();
      } finally {
        held--;
      }
    },
  };
}

/**
 * The walk screen's captures finding places (E8, E9; tend explore 14, audits 11 and 12), the record passed in, so a test
 * runs it with a fake: each capture is handled once; one with nothing in reach waits while a read is `pending`; and a
 * place being recorded counts as taken until the finds say so, so a capture looked at meanwhile never reports it again.
 */
export function createCaptureFinds(p: { pending: () => boolean }) {
  const handled = new Set<string>();
  const recording = new Set<string>();
  return {
    /** Captures that already found a place (a reload's finds): never looked at again (audit 4). */
    seen(ids: Iterable<string>) {
      for (const id of ids) handled.add(id);
    },
    isHandled: (id: string) => handled.has(id),
    async look(
      captures: { id: string; at: LngLat }[], items: ChecklistItem[], found: ReadonlySet<string>,
      record: (item: ChecklistItem, captureId: string) => Promise<void>, alive: () => boolean = () => true,
    ) {
      for (const k of [...recording]) if (found.has(k)) recording.delete(k);
      const fresh = captures.filter((c) => !handled.has(c.id));
      if (!fresh.length) return;
      const { handled: done, finds } = capturesToFind({ captures: fresh, items, taken: new Set([...found, ...recording]), reading: p.pending() });
      for (const id of done) handled.add(id);
      for (const f of finds) recording.add(f.item.key);
      for (const f of finds) {
        await record(f.item, f.captureId);
        if (!alive()) return;
      }
    },
  };
}
