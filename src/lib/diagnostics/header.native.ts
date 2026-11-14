// @layer adapter
// The shared text's header on a phone (EH3, EH3a): the app, its version, the platform and its version, never the
// device's model.
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { DiagnosticsHeader } from './shell';

export const diagnosticsHeader = (): DiagnosticsHeader => ({ app: 'Chronicles', version: Constants.expoConfig?.version ?? 'unknown', platform: `${Platform.OS} ${String(Platform.Version)}` });
