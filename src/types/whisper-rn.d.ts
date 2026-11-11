// `whisper.rn`'s package.json maps only subpaths in `exports` (no "."), so TypeScript cannot resolve the bare name;
// Metro falls back to its `main`. This declares the small part `transcribe/engines/whisperRn.native.ts` uses, from the
// library's own types (node_modules/whisper.rn/lib/typescript/index.d.ts, 0.7.4). The one place that names it.
declare module 'whisper.rn' {
  export interface TranscribeResult {
    result: string;
    language: string;
    isAborted: boolean;
  }
  export interface WhisperContext {
    transcribe(
      filePathOrBase64: string | number,
      options?: { language?: string; translate?: boolean; maxThreads?: number },
    ): { stop: () => Promise<void>; promise: Promise<TranscribeResult> };
    release(): Promise<void>;
  }
  export function initWhisper(options: { filePath: string | number; isBundleAsset?: boolean; useGpu?: boolean }): Promise<WhisperContext>;
}
