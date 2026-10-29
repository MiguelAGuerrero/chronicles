import { NativeModule, requireNativeModule } from 'expo';

import type {
  Authorization,
  AuthorizationStatus,
  RecorderStatus,
  TraceLine,
  WalkRecorderModuleEvents,
} from './WalkRecorder.types';

declare class WalkRecorderModule extends NativeModule<WalkRecorderModuleEvents> {
  getStatus(): RecorderStatus;
  startWalk(walkId: string): Promise<RecorderStatus>;
  /** Resolves with the id of the walk that was stopped, or null if none was open. */
  stopWalk(): Promise<string | null>;
  readTrace(walkId: string): Promise<TraceLine[]>;

  getAuthorization(): Authorization;
  requestWhenInUse(): Promise<AuthorizationStatus>;
  requestAlways(): Promise<AuthorizationStatus>;

  requestNotificationPermission(): Promise<boolean>;
  scheduleTestNotification(seconds: number, body: string): Promise<void>;
}

export default requireNativeModule<WalkRecorderModule>('WalkRecorder');
