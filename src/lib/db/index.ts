// Metro resolves index.native.ts or index.web.ts per platform; this file only
// gives TypeScript a single module to type-check imports against.
export { db } from './index.native';
export type { Db } from './types';
