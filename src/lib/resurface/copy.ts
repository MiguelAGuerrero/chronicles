// @layer core
/**
 * Every sentence Memories writes about its own controls (MC11, MC14, MC16), in one place so a test can read
 * each one. They state a fact: no "Okay,", no instruction, and none says hiding is private, because it is not.
 */
export const HIDDEN_TOAST = 'Hidden. It stays in Lately and in its walk.';
export const NOT_A_THREAD = 'That is not a thread.';
export const EMPTY = 'Nothing kept yet.';
export const BRING_BACK = 'Bring back';
export const OFF_LINE = 'Bringing moments back is off';
export const NEWEST_FIRST = 'Newest first';
export const FORGET_CONFIRM = 'Hidden moments, removed threads and softened words will be offered again.';
export const FAILED_SAVE = "Couldn't keep this choice; it may come back.";
export const NO_PLACE = 'No place kept';
export const ON_ITS_OWN = 'On its own';

/** "Fewer like this: harbor", naming at most one word, or the bare form for a moment with none (MC11). */
export const fewerLike = (word: string | null): string => (word ? `Fewer like this: ${word}` : 'Fewer like this');

/** The first word the owner wrote among those a choice set, or none (MC11). */
export const fewerWord = (words: string[]): string | null => words[0] ?? null;

/** A choice's sentence, with the failed-save note when it could not be kept (audit 10, MC14). */
export const withSaveNote = (message: string, saved: boolean): string => (saved ? message : `${message} ${FAILED_SAVE}`);
