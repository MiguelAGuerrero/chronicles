// @layer shell
import { ports } from '../ports';
import { createCaptureEdits } from './shell';

/** Saving a moment's edits, built from the app's real ports (ME21). */
export const captureEdits = createCaptureEdits(ports);
