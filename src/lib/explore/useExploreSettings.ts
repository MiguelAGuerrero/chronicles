// @layer view
import { useEffect, useState } from 'react';
import type { Kind } from '../discovery/types';
import { loadSettings, onSettings, saveSettings, type ExploreSettings } from './settings';
import { withKind } from './settingsChange';

/**
 * What I'm into's page's own copy of Explore's settings (WI8, WI9): `null` until read; a switch saves at once, and every
 * screen that listens (the walk, the ready bar on its return) hears of it. A change from elsewhere reaches it too.
 */
export function useExploreSettings(): { settings: ExploreSettings | null; setKind: (k: Kind, on: boolean) => void } {
  const [settings, setSettings] = useState<ExploreSettings | null>(null);
  useEffect(() => {
    let alive = true;
    loadSettings().then((v) => alive && setSettings((cur) => cur ?? v), () => {});
    const off = onSettings((v) => alive && setSettings(v));
    return () => {
      alive = false;
      off();
    };
  }, []);
  const setKind = (k: Kind, on: boolean) => {
    const next = withKind(settings, k, on);
    if (!next) return;
    setSettings(next);
    saveSettings(next).catch(() => {});
  };
  return { settings, setKind };
}
