// @layer adapter
// The shared text's header on the web (EH3, EH3a): the app, its version and the platform, never the device.
import Constants from 'expo-constants';
import { browserOf } from './core';
import type { DiagnosticsHeader } from './shell';

/** The browser and its major version, never the device (errors-handled audit 11). */
export const diagnosticsHeader = (): DiagnosticsHeader => ({
  app: 'Chronicles',
  version: Constants.expoConfig?.version ?? 'unknown',
  platform: `web, ${browserOf(typeof navigator === 'undefined' ? '' : navigator.userAgent)}`,
});
