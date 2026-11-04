import { useMemo } from 'react';
import type { Story } from '../../lib/ceremony/types';
import type { Capture } from '../../lib/types';

/** The story's captures whose pins are on the map: the first `count`, kept the same list until the count moves (the render budget). */
export function useRevealed(story: Story | null, count: number): Capture[] {
  return useMemo(() => (story ? story.captures.slice(0, count) : []), [story, count]);
}
