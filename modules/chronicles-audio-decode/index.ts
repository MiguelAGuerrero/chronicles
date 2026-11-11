// The JS face of the local native module `ChroniclesAudioDecode` (ios/, android/): a memo's audio file (AAC in .m4a)
// decoded to a 16 kHz mono 16-bit PCM WAV, the form an offline transcriber reads (specs/memo-transcripts, MX20).
// Never compiled or run on a device: see README.md and docs/NATIVE_UNVERIFIED.md.
//
// requireOptionalNativeModule returns null where the module isn't linked (web, Expo Go, a build made before this
// module existed), so importing this file never crashes; isAvailable() is false there and decodeToPcm rejects.
import { requireOptionalNativeModule } from 'expo';

interface NativeAudioDecode {
  decodeToPcm(source: string, output: string): Promise<void>;
}

const native = requireOptionalNativeModule<NativeAudioDecode>('ChroniclesAudioDecode');

/** False where the native module isn't linked (web, Expo Go). */
export function isAvailable(): boolean {
  return native != null;
}

/**
 * Writes `output` (a file path or file:// URI, overwritten if present) as 16 kHz mono 16-bit PCM WAV from `source`
 * (a file path or file:// URI). The source is only read. Rejects with a message on failure, after deleting any
 * partial output.
 */
export async function decodeToPcm(source: string, output: string): Promise<void> {
  if (!native) throw new Error('ChroniclesAudioDecode is not linked in this build.');
  await native.decodeToPcm(source, output);
}
