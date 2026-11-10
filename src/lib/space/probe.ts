// @layer adapter
// Metro resolves probe.native.ts or probe.web.ts per platform; this file only
// gives TypeScript a single module to type-check imports against.
export { probe } from './probe.native';
