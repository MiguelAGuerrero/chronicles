// @layer shell
import { gpsLog } from '../gpsLog';
import type { Ports } from '../ports/types';

/**
 * A walk's GPS log (`gpsLog`) from storage: every raw reading and its placed
 * captures, open or finished (TD4). `device` names the phone or browser, passed
 * in so this module never loads React Native.
 */
export function createWalkLog(p: Pick<Ports, 'db'>, device: () => string) {
  return {
    async walkLogText(walkId: string, startedAt: number): Promise<string> {
      const [points, captures] = await Promise.all([p.db.getPoints(walkId), p.db.getCaptures(walkId)]);
      return gpsLog({ startedAt, points, captures, userAgent: device() });
    },
  };
}
