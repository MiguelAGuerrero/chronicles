// Metro resolves audioMode.native.ts or audioMode.web.ts per platform; this file only
// gives TypeScript a single module to type-check imports against.
export { setAudioMode } from './audioMode.native';
export type { AudioMode } from './audioMode.types';
