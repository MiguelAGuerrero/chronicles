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
  // Revealed marks, grown fix by fix: not every fix of a long walk against every mark (audit).
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [scanning, setScanning] = useState(false);
  // The first scan asks preferences first (S14).
  const [asking, setAsking] = useState(false);
  const cancelled = useRef(false);
  const starting = useRef(false);
  // Leaving the screen stops a scan between views; nothing is set on an unmounted screen.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
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
  // Once the walk's fixes are in (a reload), every one counts; after that, each new fix alone.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !marks.length || !opts.fixes.length) return;
    seeded.current = true;
    const fixes = opts.fixes;
    // Not cleared on a rerun: seeded is already set, so this is the one pass.
    setTimeout(() => setRevealed((r) => new Set([...r, ...marks.filter((x) => x.state === 'open' && isRevealed(x, fixes)).map((x) => x.id)])), 0);
  }, [marks, opts.fixes]);
  useEffect(() => {
    const here = opts.here;
    if (!here) return;
    const fresh = open.filter((m) => !revealed.has(m.id) && isRevealed(m, [here]));
    if (!fresh.length) return;
    const t = setTimeout(() => setRevealed((r) => new Set([...r, ...fresh.map((m) => m.id)])), 0);
    return () => clearTimeout(t);
  }, [opts.here, open, revealed]);
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
    // A ref, set before the first await: a double tap starts one scan, not two (audit).
    if (!walkId || starting.current || !m) return;
    if (!here) return onNotice('Waiting for your position');
    starting.current = true;
    try {
      if (!force && !(await loadPrefs().catch(() => null))) {
        setAsking(true);
        return;
      }
      cancelled.current = false;
      setScanning(true);
      const r = await runScan({ center: here, walkId, map: m, shouldStop: () => cancelled.current || !mounted.current });
      if (!mounted.current || r.outcome === 'cancelled' || r.outcome === 'closed') return;
      if (r.outcome === 'busy') return onNotice('Finding a route first. Scan again in a moment.');
      const note = r.outcome === 'full' || r.outcome === 'few' ? scanNote(r.outcome, r.marks.length) ?? `${r.marks.length} marks nearby` : scanNote(r.outcome, 0)!;
      onNotice(note, r.outcome === 'failed' ? 'error' : 'info');
      AccessibilityInfo.announceForAccessibility(note);
      await reload();
    } catch (e) {
      onNotice(`The scan didn’t finish: ${e instanceof Error ? e.message : e}`, 'error');
    } finally {
      starting.current = false;
      if (mounted.current) setScanning(false);
    }
  }, [reload]);
  const cancel = useCallback(() => {
    cancelled.current = true;
  }, []);

  const dismiss = useCallback(async (id: string) => {
    await db.updateMark(id, { state: 'dismissed', resolved_at: Date.now() }).catch(() => {});
    await reload();
  }, [reload]);

  // A capture within 60 m of an open mark finds the nearer one (S8). Only a
  // capture with its own place (an unstamped one has none until stop), made
  // after the scan; a reload re-reads the old ones, which find nothing new.
  // Each capture and each mark is handled once, whatever the effect's reruns.
  const handled = useRef(new Set<string>());
  const resolved = useRef(new Set<string>());
  useEffect(() => {
    const fresh = opts.captures.filter((c) => !handled.current.has(c.id) && c.lat != null && c.lon != null);
    if (!fresh.length || !open.length) return;
    for (const c of fresh) handled.current.add(c.id);
    (async () => {
      let found = false;
      for (const c of fresh) {
        const left = open.filter((x) => !resolved.current.has(x.id) && x.created_at <= c.t);
        const m = foundBy([c.lon!, c.lat!], left);
        if (!m) continue;
        resolved.current.add(m.id);
        found = true;
        await db.updateMark(m.id, { state: 'found', resolved_at: Date.now(), capture_id: c.id }).catch(() => {});
        latest.current.onFound(m);
      }
      if (found) await reload();
    })();
  }, [opts.captures, open, reload]);

  return { marks, open, pins, revealed, scanning, scan, cancel, dismiss, asking, setAsking, reload };
}
