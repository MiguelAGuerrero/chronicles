import { useMemo } from 'react';
import type { Story } from '../../lib/ceremony/types';
import type { Capture } from '../../lib/types';

/**
 * The story's captures whose pins are on the map (audit 10: by id, in any
 * order a ceremony likes), or all of them, or none. The same list until the
 * set changes, so the map isn't handed a new one every frame.
 */
export function useRevealed(story: Story | null, pins: string[] | 'all' | 'none'): Capture[] {
  const key = Array.isArray(pins) ? pins.join('\n') : pins;
  return useMemo(() => {
    if (!story || key === 'none') return [];
    if (key === 'all') return story.captures;
    const ids = new Set(key.split('\n'));
    return story.captures.filter((c) => ids.has(c.id));
  }, [story, key]);
}
