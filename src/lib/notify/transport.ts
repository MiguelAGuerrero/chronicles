// Metro resolves transport.native.ts or transport.web.ts per platform; this file only
// gives TypeScript a single module to type-check imports against.
export { transport } from './transport.native';
