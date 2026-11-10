import { useEffect, useMemo, useState, type RefObject } from 'react';
import { AccessibilityInfo, BackHandler, Platform } from 'react-native';
import type { WalkMapHandle } from '../map/types';
import { boundsOf, pausedMs } from '../../lib/geo';
import { feedback } from '../../lib/motion';
import { paceMps } from '../../lib/nav/eta';
import { routeAhead } from '../../lib/nav/navigator';
import { openInMaps } from '../../lib/nav/openInMaps';
import { useNavigation } from '../../lib/nav/useNavigation';
import type { LngLat, Pause, Walk } from '../../lib/types';
import type { SetNotice } from './useWalkNotice';

/**
 * Navigating (slice 4): inside the walk, which keeps recording. Going somewhere, Open in Maps, a
 * scenic preview's Back and Escape, the route ahead and the preview's other routes, and the line
 * that says you arrived (or found a place).
 */
export function useWalkNavigation(a: {
  walk: Walk | null;
  live: { here: LngLat | null; lastFixAt: number | null; heading: number | null; riding: boolean; distanceM: number };
  pauses: Pause[];
  mapRef: RefObject<WalkMapHandle | null>;
  setNotice: SetNotice;
}) {
  const { walk, live, pauses, mapRef, setNotice } = a;
  const [arrived, setArrived] = useState<string | null>(null);
  useEffect(() => {
    if (!arrived) return;
    const t = setTimeout(() => setArrived(null), 4000);
    return () => clearTimeout(t);
  }, [arrived]);
  const navigation = useNavigation({
    walk,
    here: live.here,
    lastFixAt: live.lastFixAt,
    paused: pauses.some((p) => p.ended_at == null),
    heading: live.heading,
    riding: live.riding,
    map: () => mapRef.current,
    onArrive: (dest) => {
      feedback('success');
      // Said once: the line on screen is announced by the screen reader here, not by a live region.
      setArrived(`You’re here: ${dest.label}`);
      AccessibilityInfo.announceForAccessibility(`You're here: ${dest.label}`);
    },
    // Errors stay up long enough to read at a glance, and can be dismissed. A route that
    // can't be found offers the phone's maps app (NH5).
    // It stays until dismissed: the destination is already forgotten, so it is the way back (audit 6).
    onError: (m, dest) => setNotice({ message: m, tone: 'error', maps: dest && { at: dest.at, label: dest.label }, sticky: !!dest }),
    onNotice: (m) => setArrived(m),
    // This walk's pace for the spoken time left (QL18), over its moving time as WalkStats counts it.
    pace: () => {
      const t = Date.now();
      return paceMps(live.distanceM, walk ? t - walk.started_at - pausedMs(pauses, walk.started_at, t) : 0);
    },
  });
  /** Going somewhere new: a failed route's banner (sticky, with Open in Maps) has had its say. */
  const goTo = (dest: Parameters<typeof navigation.goTo>[0]) => {
    setNotice((n) => (n?.maps ? null : n));
    void navigation.goTo(dest);
  };
  // Scenic routes' preview (SR8): Back (Android) and Escape (web) cancel it, setting no destination.
  const routePreview = navigation.preview;
  const dismissPreview = navigation.dismiss;
  useEffect(() => {
    if (!routePreview) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      dismissPreview();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissPreview();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, [routePreview, dismissPreview]);
  /**
   * Open in Maps (NH3-NH8): the destination to the phone's maps app, straight from the tap (a
   * browser opens a window only from one). Navigation and the walk go on as they were (NH7).
   */
  const handOff = (at: LngLat, label: string) => {
    feedback('tap');
    openInMaps(at, label).then(
      (ok) => {
        if (!ok) setNotice({ message: 'Couldn’t open a maps app.', tone: 'error' });
      },
      () => setNotice({ message: 'Couldn’t open a maps app.', tone: 'error' }),
    );
  };
  // The route ahead of you only; what is behind is walked. A preview shows its highlighted route whole (SR2).
  const routeLine = useMemo(
    () =>
      navigation.preview
        ? navigation.preview.options[navigation.preview.selected].route.path
        : navigation.nav
          ? live.here
            ? routeAhead(navigation.nav.route.path, live.here)
            : navigation.nav.route.path
          : null,
    [navigation.nav, navigation.preview, live.here],
  );
  // The preview's other routes, faint (SR2), and the map framed around all of them.
  const alternates = useMemo(
    () => (navigation.preview ? navigation.preview.options.filter((_, i) => i !== navigation.preview!.selected).map((o) => o.route.path) : null),
    [navigation.preview],
  );
  const previewFit = useMemo(() => (navigation.preview ? boundsOf(navigation.preview.options.flatMap((o) => o.route.path), 30) : null), [navigation.preview]);
  const previewKey = previewFit ? 300000 + (Math.abs(Math.round((previewFit[0] + previewFit[1]) * 1e5)) % 99999) : 0;
  return { navigation, goTo, handOff, routeLine, alternates, previewFit, previewKey, arrived, setArrived };
}

export type WalkNavigation = ReturnType<typeof useWalkNavigation>;
