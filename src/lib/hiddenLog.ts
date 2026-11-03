/**
 * When the page was out of front, so a gap in the trace can be told apart: the page hidden
 * (the browser stops sending positions) or on screen with no usable GPS (the status chip's
 * "Weak GPS" says that one). Pure: the walk's live trace feeds it from AppState.
 */

/** Spells kept: enough for any gap the walk screen still reports (the last minute). */
const MAX_SPELLS = 20;

export class HiddenLog {
  private spells: { from: number; to: number }[] = [];
  private openFrom: number | null = null;

  /** `loadedAt`: when this page started. Before it, the page was closed or reloading. */
  constructor(private readonly loadedAt: number) {}

  hide(t: number): void {
    if (this.openFrom == null) this.openFrom = t;
  }

  show(t: number): void {
    if (this.openFrom == null) return;
    this.spells.push({ from: this.openFrom, to: t });
    if (this.spells.length > MAX_SPELLS) this.spells.shift();
    this.openFrom = null;
  }

  /** Whether the page was out of front, or not yet loaded, at any time between t0 and t1. */
  hiddenDuring(t0: number, t1: number): boolean {
    if (t0 < this.loadedAt) return true;
    if (this.openFrom != null && this.openFrom < t1) return true;
    return this.spells.some((s) => s.from < t1 && s.to > t0);
  }

  spellCount(): number {
    return this.spells.length;
  }
}
