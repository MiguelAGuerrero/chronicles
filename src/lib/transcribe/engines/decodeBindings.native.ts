// @layer adapter
import { Directory, File, Paths } from 'expo-file-system';
import { decodeToPcm, isAvailable } from '../../../../modules/chronicles-audio-decode';
import { resolveMedia } from '../../media';
import type { NativeDecode, TempFiles } from '../decoder';

/** The phone's decoder parts (MX20): the local module, a temporary file in the cache, a memo's media reference as a URI. */
export const nativeDecode: NativeDecode = { isAvailable, decodeToPcm };

let n = 0;
export const tempFiles: TempFiles = {
  tempPath() {
    const d = new Directory(Paths.cache, 'transcribe');
    d.create({ idempotent: true });
    return `${d.uri}${Date.now()}-${n++}.wav`.replace(/^file:\/\//, '');
  },
  async remove(path) {
    const f = new File(`file://${path}`);
    if (f.exists) f.delete();
  },
  async resolve(ref) {
    const uri = await resolveMedia(ref);
    if (!uri) throw new Error('The memo\'s file is not there.');
    return uri;
  },
};
