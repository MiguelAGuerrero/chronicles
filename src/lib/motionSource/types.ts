/** One motion sample: acceleration including gravity, m/s². */
export type Acceleration = { x: number; y: number; z: number };

/** Starts motion samples; returns a stop. */
export type SubscribeMotion = (cb: (a: Acceleration) => void) => () => void;
