/** A raw location fix, exactly as Core Location reported it. Nothing is filtered. */
export type TracePoint = {
  /** Fix timestamp, milliseconds since the Unix epoch. */
  t: number;
  lat: number;
  lon: number;
  /** Horizontal accuracy in meters; negative means the fix is invalid. */
  acc: number;
  alt: number;
  altAcc: number;
  /** Meters per second; negative when unknown. */
  speed: number;
  speedAcc: number;
  /** Degrees from true north; negative when unknown. */
  course: number;
  courseAcc: number;
  floor?: number;
};

/** A marker line in the trace file. */
export type TraceMarker = {
  t: number;
  mark: 'start' | 'resume' | 'stop';
};

export type TraceLine = TracePoint | TraceMarker;

export function isMarker(line: TraceLine): line is TraceMarker {
  return 'mark' in line;
}

export type RecorderStatus = {
  recording: boolean;
  walkId?: string;
  startedAt?: number;
  pointCount: number;
  stationary: boolean;
  lastLocation?: TracePoint;
};

export type AuthorizationStatus =
  | 'notDetermined'
  | 'restricted'
  | 'denied'
  | 'whenInUse'
  | 'always'
  | 'unknown';

export type Authorization = {
  status: AuthorizationStatus;
  accuracy: 'full' | 'reduced';
};

export type WalkRecorderModuleEvents = {
  onLocation: (point: TracePoint) => void;
  onStateChange: (status: RecorderStatus) => void;
  onAuthorizationChange: (event: { status: AuthorizationStatus }) => void;
};
