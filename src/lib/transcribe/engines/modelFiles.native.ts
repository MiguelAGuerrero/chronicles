// @layer adapter
import { Directory, File, Paths } from 'expo-file-system';
import type { ModelSpec } from '../engine';
import type { ModelFiles } from '../types';

/**
 * The phone's model files (MX11-MX15, MX32): the cache directory, which the system may clear (an evicted model reads
 * as not installed, MX13) and which no backup keeps. A download is written beside the model under a `.part` name,
 * hashed, and moved into place only when it is the pinned file (MX12). Never run on a device.
 */
const dir = () => new Directory(Paths.cache, 'models');
const nameOf = (spec: ModelSpec) => `${spec.tag.replace(/[^A-Za-z0-9._-]/g, '_')}.bin`;
const plain = (uri: string) => uri.replace(/^file:\/\//, '');

export const modelFiles: ModelFiles = {
  async free() {
    const n: unknown = Paths.availableDiskSpace;
    return typeof n === 'number' ? n : null;
  },
  async find(spec) {
    const f = new File(dir(), nameOf(spec));
    return f.exists ? { ref: plain(f.uri) } : null;
  },
  async download(spec) {
    dir().create({ idempotent: true });
    const part = new File(dir(), `${nameOf(spec)}.part`);
    if (part.exists) part.delete();
    const got = await File.downloadFileAsync(spec.url, part);
    const hash = await got.digest('SHA-256');
    return {
      hash,
      async commit() {
        const final = new File(dir(), nameOf(spec));
        if (final.exists) final.delete();
        await got.move(final);
        return { ref: plain(final.uri) };
      },
      async discard() {
        if (got.exists) got.delete();
      },
    };
  },
  async remove(spec) {
    const f = new File(dir(), nameOf(spec));
    if (!f.exists) return false;
    f.delete();
    return true;
  },
  async removeOthers(keep) {
    if (!dir().exists) return;
    for (const item of dir().list()) if (item instanceof File && item.name !== nameOf(keep)) item.delete();
  },
};
