// @layer core
/** Easing a ceremony and its views share. */
export const easeOut = (u: number) => 1 - (1 - u) ** 3;
/** Slow at both ends; a higher power keeps more of the change for the middle. */
export const easeInOut = (u: number, p = 2) => (u < 0.5 ? 0.5 * (2 * u) ** p : 1 - 0.5 * (2 * (1 - u)) ** p);
/**
 * A steady pace (replay pace RY8): up to speed over the first `a` of the way, steady, and slowing over the last `b`.
 * The ground covered at `u` of the time, 0 to 1; between the ramps equal time covers equal ground.
 */
export const steady = (u: number, a: number, b: number) => {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const v = 1 / (1 - (a + b) / 2);
  if (a > 0 && u < a) return (v * u * u) / (2 * a);
  if (b > 0 && u > 1 - b) return 1 - (v * (1 - u) * (1 - u)) / (2 * b);
  return v * (u - a / 2);
};
