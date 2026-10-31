import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { WalkMapHandle } from '../../components/map/types';
import type { MarkPin } from '../../components/MarkPinView';
import { db } from '../db';
import type { Capture, LngLat } from '../types';
import { categoryOf } from './categories';
import { loadPrefs, runScan } from './runScan';
import { foundBy, isRevealed, scanNote } from './scan';
import type { Mark } from './types';

/**
 * Scan on the walk screen (S1-S12): the walk's marks, the scan itself behind
 * the map's cover, revealing within 60 m, a capture finding the nearest open
 * mark, and dismissing one.
 */
export function useScan(opts: {
  walkId: string | null;
  here: LngLat | null;
  /** Every accepted fix of this walk, for revealing (S7). */
  fixes: LngLat[];
  captures: Capture[];
  map: () => WalkMapHandle | null;
  onNotice: (message: string, tone?: 'info' | 'error') => void;
  onFound: (mark: Mark) => void;
}) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [scanning, setScanning] = useState(false);
  // The first scan asks preferences first (S14).
  const [asking, setAsking] = useState(false);
  const cancelled = useRef(false);
  const latest = useRef(opts);
  useEffect(() => {
    latest.current = opts;
  });

  const reload = useCallback(async () => {
    if (!opts.walkId) return;
    setMarks(await db.listMarks(opts.walkId).catch(() => []));
  }, [opts.walkId]);
  useEffect(() => {
    if (!opts.walkId) return;
    let alive = true;
    db.listMarks(opts.walkId).then((m) => alive && setMarks(m), () => {});
    return () => {
      alive = false;
    };
  }, [opts.walkId]);

  const open = useMemo(() => marks.filter((m) => m.state === 'open'), [marks]);
  const revealed = useMemo(() => new Set(open.filter((m) => isRevealed(m, opts.fixes)).map((m) => m.id)), [open, opts.fixes]);
  const pins = useMemo<MarkPin[]>(
    () =>
      open.map((m) => {
        const c = categoryOf(m.category);
        return { id: m.id, at: m.at, revealed: revealed.has(m.id), icon: c.icon as MarkPin['icon'], name: m.name, category: c.label };
      }),
    [open, revealed],
  );

  const scan = useCallback(async (force = false) => {
    const { walkId, here, map, onNotice } = latest.current;
    const m = map();
    if (!walkId || scanning || !m) return;
    if (!here) return onNotice('Waiting for your position');
    if (!force && !(await loadPrefs().catch(() => null))) {
      setAsking(true);
      return;
    }
    cancelled.current = false;
    setScanning(true);
    try {
      const r = await runScan({ center: here, walkId, map: m, shouldStop: () => cancelled.current });
      if (r.outcome === 'cancelled') return;
      const note = r.outcome === 'full' || r.outcome === 'few' ? scanNote(r.outcome, r.marks.length) ?? `${r.marks.length} marks nearby` : scanNote(r.outcome, 0)!;
      onNotice(note, r.outcome === 'failed' ? 'error' : 'info');
      AccessibilityInfo.announceForAccessibility(note);
      await reload();
    } catch (e) {
      onNotice(`The scan didn’t finish: ${e instanceof Error ? e.message : e}`, 'error');
    } finally {
      setScanning(false);
    }
  }, [scanning, reload]);
  const cancel = useCallback(() => {
    cancelled.current = true;
  }, []);

  const dismiss = useCallback(async (id: string) => {
    await db.updateMark(id, { state: 'dismissed', resolved_at: Date.now() }).catch(() => {});
    await reload();
  }, [reload]);

  // A new capture within 60 m of an open mark finds the nearer one (S8).
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(opts.captures.map((c) => c.id));
    if (seen.current == null) {
      seen.current = ids;
      return;
    }
    const fresh = opts.captures.filter((c) => !seen.current!.has(c.id));
    seen.current = ids;
    if (!fresh.length || !open.length) return;
    (async () => {
      let left = open;
      for (const c of fresh) {
        const at: LngLat | null = c.lat != null && c.lon != null ? [c.lon, c.lat] : latest.current.here;
        // Only a capture made after the scan finds its mark: a reload re-reads older ones.
        const m = at && foundBy(at, left.filter((x) => x.created_at <= c.t));
        if (!m) continue;
        left = left.filter((x) => x.id !== m.id);
        await db.updateMark(m.id, { state: 'found', resolved_at: Date.now(), capture_id: c.id }).catch(() => {});
        latest.current.onFound(m);
      }
      await reload();
    })();
  }, [opts.captures, open, reload]);

  return { marks, open, pins, revealed, scanning, scan, cancel, dismiss, asking, setAsking, reload };
}
