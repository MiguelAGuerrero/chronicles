import { mediaStore } from '../db/index.web';
import type { Capture } from '../types';
import { bundleName, walkBundle } from './bundle';

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** On the web a keeper downloads as a file; `bakedUri` is a captioned copy of a photo. */
export async function saveKeeper(capture: Capture, bakedUri?: string): Promise<void> {
  const blob = bakedUri ? await (await fetch(bakedUri)).blob() : capture.file_path ? await mediaStore.get(capture.file_path) : null;
  if (!blob) throw new Error('This capture has no file to save.');
  const ext = capture.file_path?.split('.').pop() ?? (blob.type.split('/')[1] || 'bin');
  download(blob, `chronicle-${capture.kind}-${new Date(capture.t).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${bakedUri ? 'jpg' : ext}`);
}

/** Zips the walk and downloads it. */
export async function exportWalk(walkId: string): Promise<void> {
  const { walk, zip } = await walkBundle(walkId, async (ref) => {
    const blob = await mediaStore.get(ref);
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  });
  download(new Blob([zip as BlobPart], { type: 'application/zip' }), bundleName(walk));
}
