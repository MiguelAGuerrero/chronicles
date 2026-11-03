# 0039. React Native's own Animated, not Reanimated

Date: 2026-11-01 · Status: accepted · Area: motion polish

## Context
The concept doc's "Polish: motion" tab. After the audit: Reanimated added 723 KB raw, 140 KB gzipped, +36% to the web bundle, for four effects, and its web layer read reduce motion once and cloned exiting nodes.

## Decision
The owner's call, Nov 1: React Native's own Animated, not Reanimated. Reanimated is still in node_modules through expo-router, but never import it; the bundle only pays for what is imported. Revisit it only for gesture-driven animation. Restraint holds: effects are short and physical (a press, a settle, a lift), never celebratory. No sounds yet.

## Consequences
- One set of timings: `lib/motionTokens.ts` (pure: `MOTION`, `PRESS_SCALE`, `durationFor`) and `lib/motion.ts` (`useReducedMotion`, `nativeDriver`, `feedback(kind)`). Never hard-code a duration or call the haptics directly.
- `Button` presses to 0.97 on the native driver; `HomeSheet` springs its height in JavaScript; `LiftIn` and `Banner`; the deferred four entrances (M9-M12, `lib/enter.ts`, `components/Enter.tsx`).
- Testing on the web: `emulateMedia({ reducedMotion: 'reduce' })`; drag a moving sheet with CDP touch events.
- Native unverified: the native-driver press and lift, the sheet spring.
