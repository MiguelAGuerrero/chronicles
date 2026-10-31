// Metro resolves Baker.native.tsx or Baker.web.tsx per platform; this file only
// gives TypeScript a single module to type-check imports against.
export { useBaker } from './Baker.native';
