import type { ReactNode } from 'react';

/**
 * The safe area's insets under the root `SafeAreaProvider`. On a phone the library's own insets are
 * right, so this adds nothing; the web has its own (`SafeInsets.web.tsx`, fix memories-weird-state).
 */
export function SafeInsets({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
