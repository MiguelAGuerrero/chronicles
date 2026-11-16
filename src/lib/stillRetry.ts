// @layer core
// A still spell's failed save, retried as the spell stands now (errors-handled audit 3): open while it is open,
// closed once it has ended. A bare retry of the start after the end inserted an open spell that never ended.
import type { Still } from './types';

export const stillRetry = (walkId: string, startedAt: number, endedAt: number | null): Still => ({ walk_id: walkId, started_at: startedAt, ended_at: endedAt });
