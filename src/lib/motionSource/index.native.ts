import { DeviceMotion } from 'expo-sensors';
import type { SubscribeMotion } from './types';

/** Expo's DeviceMotion, at 20 Hz (Motion). */
export const subscribeMotion: SubscribeMotion = (cb) => {
  DeviceMotion.setUpdateInterval(50);
  const sub = DeviceMotion.addListener((e) => {
    const g = e.accelerationIncludingGravity;
    if (g) cb({ x: g.x, y: g.y, z: g.z });
  });
  return () => sub.remove();
};
