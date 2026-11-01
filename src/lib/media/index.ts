// Metro resolves index.native.ts or index.web.ts per platform; this file only
// gives TypeScript a single module to type-check imports against.
export { dropTemp, keepFile, mediaBytes, releaseMedia, removeMedia, resolveMedia } from './index.native';
