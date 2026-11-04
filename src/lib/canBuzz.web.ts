// @layer adapter
import { buzzOffered } from './motionTokens';

/**
 * Whether this browser can give the pocket alert (PA6): reads the pointer and
 * `navigator.vibrate`; `buzzOffered` decides. expo-haptics has no availability
 * call (a web exception, `docs/ARCHITECTURE.md`).
 */
export const canBuzz = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return buzzOffered({ vibrate: 'vibrate' in navigator, coarse });
};
