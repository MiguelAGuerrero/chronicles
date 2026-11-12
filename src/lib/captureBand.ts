// @layer core
import type { Capture } from './types';

/**
 * What is left of capture from Chronicle (HC7, HC15, decision 0112) now that Memories is a journal (decision
 * 0151): a loose moment's toast on Navigate's ready screen, and the recording bar's camera. The open line's own
 * decisions are in `lib/journal`.
 */

const KIND_NAME: Record<Capture['kind'], string> = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' };

/**
 * What a loose moment's toast says on the ready screen (M2, HC15): where it landed once its fix came, or that no
 * place came.
 */
export function momentToast(kind: Capture['kind'], reason?: 'denied' | 'timeout' | 'unavailable'): string {
  const what = KIND_NAME[kind];
  if (!reason) return `${what} kept here`;
  return reason === 'denied' ? `${what} kept · No location (location is off)` : `${what} kept · No location`;
}

/**
 * Whether the recording bar shows its camera (decision 0112): not on Chronicle's Memories, whose open line
 * already files into the walk, so the foot of the screen holds one camera, not two. Everywhere else it does.
 */
export function barCamera(path: string, section: string): boolean {
  return !(path.split('?')[0] === '/' && section === 'memories');
}
