// @layer adapter
// The shared text's header on the web (EH3, EH3a): the app, its version and the platform, never the device.
import Constants from 'expo-constants';
import type { DiagnosticsHeader } from './shell';

export const diagnosticsHeader = (): DiagnosticsHeader => ({ app: 'Chronicles', version: Constants.expoConfig?.version ?? 'unknown', platform: 'web' });
