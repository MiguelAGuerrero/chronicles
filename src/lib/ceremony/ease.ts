// @layer core
/** Easing a ceremony and its views share. */
export const easeOut = (u: number) => 1 - (1 - u) ** 3;
/** Slow at both ends; a higher power keeps more of the change for the middle. */
export const easeInOut = (u: number, p = 2) => (u < 0.5 ? 0.5 * (2 * u) ** p : 1 - 0.5 * (2 * (1 - u)) ** p);
