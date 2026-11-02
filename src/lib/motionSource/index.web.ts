import type { SubscribeMotion } from './types';

/**
 * The browser's own `devicemotion` event (Motion). expo-sensors 58's web
 * DeviceMotion has no `addListener` (its web module only starts and stops
 * observing), so subscribing through it threw and took the walk screen down.
 * Its permission and availability calls work on the web and are still used.
 */
export const subscribeMotion: SubscribeMotion = (cb) => {
  const on = (e: DeviceMotionEvent) => {
    const g = e.accelerationIncludingGravity;
    if (g && g.x != null && g.y != null && g.z != null) cb({ x: g.x, y: g.y, z: g.z });
  };
  window.addEventListener('devicemotion', on);
  return () => window.removeEventListener('devicemotion', on);
};
