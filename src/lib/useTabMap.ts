import { useFocusEffect, useIsFocused } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type { LngLat } from './types';

export type Camera = { center: LngLat; zoom: number };

/**
 * A tab's map (NV3, NV4): JS tabs keep an unfocused screen mounted, so each
 * tab takes its own map down while it isn't in front (another tab, the walk, a
 * replay), and a phone's browser holds one live map. The camera it last
 * reported is kept and given back when the map returns, so it comes back where
 * it was. `areaH` is the height above the tab bar, for the tab's drawer.
 */
export function useTabMap(fit?: { key: number; refit: () => void }) {
  const focused = useIsFocused();
  // A fit the map was taken down in the middle of (a tab tapped while it moved) is redone when it comes back.
  const fitNow = useRef(fit);
  useEffect(() => {
    fitNow.current = fit;
  });
  const settled = useRef(0);
  const onFitSettled = useCallback((k: number) => {
    settled.current = Math.max(settled.current, k);
  }, []);
  useFocusEffect(
    useCallback(() => {
      const f = fitNow.current;
      if (!f || f.key <= settled.current) return;
      const t = setTimeout(() => f.refit(), 0);
      return () => clearTimeout(t);
    }, []),
  );
  const cameraNow = useRef<Camera | null>(null);
  const [savedCamera, setSavedCamera] = useState<Camera | null>(null);
  useFocusEffect(
    useCallback(
      () => () => {
        setSavedCamera(cameraNow.current);
      },
      [],
    ),
  );
  const onCameraChange = useCallback((c: Camera) => {
    cameraNow.current = c;
  }, []);
  const { height } = useWindowDimensions();
  const areaH = height - useBottomTabBarHeight();
  return { focused, cameraNow, savedCamera, onCameraChange, onFitSettled, areaH };
}
