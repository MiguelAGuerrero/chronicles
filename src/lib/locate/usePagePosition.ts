// @layer view
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';
import { getLastFix } from '../lastFix';
import type { LngLat } from '../types';
import { openWalkLast } from '../walkPlanner/app';
import { locateOnce } from '.';
import { aged, newerFix, pagePosition, positionAt, positionLine, settle, startFrom, type PagePosition } from './pagePosition';

/** How often an open page looks at its fix's age (audit 1): its line counts minutes, and a fix past thirty is dropped. */
const AGE_TICK_MS = 15_000;

/**
 * A planning page's own position (fix outing-current-position, decision 0273): one fresh fix read as the page opens, through
 * the app's one-fix path (foreground permission only; its watch cleared as the fix comes, after ten seconds, or as the page
 * closes), and once more when the app comes back to the front (the owner's "a fresh fix whenever a screen that uses your
 * position opens or the app comes back to the front"), on Try again, and at Start when the fix has aged or a walk records.
 * Nothing watches in between. Nothing is written back: the fix stays the page's, so Explore's own fix is untouched.
 *
 * `said` is the line as it settled, for the page's one live region (audit 9); a phone is told it once, as Explore does.
 */
export function usePagePosition() {
  const [pos, setPos] = useState<PagePosition>({ state: 'finding' });
  const [said, setSaid] = useState({ text: '', n: 0 });
  const posRef = useRef(pos);
  useEffect(() => {
    posRef.current = pos;
  });
  const ctl = useRef<AbortController | null>(null);
  const platform = Platform.OS === 'web' ? 'web' : 'native';
  /** One read; the newer of the fix held and the recording walk's last walked one stands in when it does not come. */
  const read = useCallback(async (): Promise<PagePosition | null> => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    const r = await locateOnce(undefined, { fresh: true, signal: c.signal }).catch(() => ({ at: null, reason: 'unavailable' as const }));
    if (c.signal.aborted) return null;
    const held = r.at || r.reason === 'denied' ? null : newerFix(getLastFix(), await openWalkLast().catch(() => null));
    if (c.signal.aborted) return null;
    const next = pagePosition(r, held, Date.now());
    setPos((p) => settle(p, next));
    const text = positionLine(next, platform) ?? '';
    // A line said once as it settles; none, and the region is emptied, so no old line is left for a screen reader to find.
    if (!text) setSaid((s) => (s.text ? { text: '', n: s.n } : s));
    else if (positionLine(posRef.current, platform) !== text) {
      setSaid((s) => ({ text, n: s.n + 1 }));
      if (platform === 'native') AccessibilityInfo.announceForAccessibility(text);
    }
    return next;
  }, [platform]);
  // The read is reached through a ref from the effect, which only subscribes: its state is set when the fix comes back.
  const readRef = useRef(read);
  useEffect(() => {
    readRef.current = read;
  });
  useEffect(() => {
    void readRef.current();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void readRef.current();
    });
    const tick = setInterval(() => setPos((p) => aged(p, Date.now())), AGE_TICK_MS);
    return () => {
      ctl.current?.abort();
      sub.remove();
      clearInterval(tick);
    };
  }, []);
  /** Try again (audit 8): finding you once more. */
  const retry = useCallback(() => {
    setPos({ state: 'finding' });
    void read();
  }, [read]);
  /**
   * Where Start routes from (audit 1, WP24): the page's fix while fresh enough and no walk records, else one more read; null
   * when none came, and the page then says so.
   */
  const startAt = useCallback(async (walking: boolean): Promise<LngLat | null> => {
    const p = posRef.current;
    if (startFrom(p, Date.now(), walking) === 'use') return positionAt(p);
    const next = await read();
    return next ? positionAt(next) : null;
  }, [read]);
  return { pos, said, retry, startAt };
}
