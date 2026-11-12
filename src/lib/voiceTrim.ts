// @layer core
/** A voice memo's kept part (VT6-VT12, decision 0090): stub for the tests first; the code follows. */
import type { MediaEdit, Trim } from './mediaEdit';

export interface VoiceSpan { startMs: number; endMs: number; lengthMs: number }
export type VoiceState = 'before' | 'inside' | 'end';
type Memo = { body: string; edit?: MediaEdit | null };

const todo = (): never => {
  throw new Error('voiceTrim: not written yet');
};
export const voiceSpan = (_trim: Trim | null | undefined, _durationMs: number): VoiceSpan => todo();
export const voiceClock = (_posS: number, _span: VoiceSpan): { atMs: number; ofMs: number } => todo();
export const voiceState = (_posS: number, _span: VoiceSpan): VoiceState => todo();
export const memoLengthMs = (_m: Memo): number => todo();
export const memoWords = (_m: Memo): string => todo();
export const trimmedLine = (_m: Memo): string | null => todo();
