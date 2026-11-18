// @layer adapter
/**
 * The in-memory copy of a trimmed memo's kept part (decision 0169): the local native module writes it to the cache
 * directory, the recognizer reads it, and `remove` deletes it. It is never kept beside the memo. NEVER RUN ON A DEVICE.
 */
import { File, Paths } from 'expo-file-system';
import { exportTrimmedAudio } from '../../../modules/chronicles-video-edit';
import type { Cutter } from './shell';

let seq = 0;

export const cutter: Cutter = {
  async cut(uri, startMs, endMs) {
    const out = new File(Paths.cache, `memo-read-${Date.now()}-${seq++}.m4a`);
    return exportTrimmedAudio({ source: uri, output: out.uri, start_ms: startMs, end_ms: endMs });
  },
  async remove(uri) {
    const f = new File(uri);
    if (f.exists) f.delete();
  },
};
