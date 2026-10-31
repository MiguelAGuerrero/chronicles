// Metro resolves notify.native.ts or notify.web.ts per platform; this file only
// gives TypeScript a single module to type-check imports against.
export { notifier, PAUSE_REMIND_MS } from './notify.native';
