// @layer view
import { useStore } from '../useStore';
import { refValues } from './index';

const same = (on: boolean) => on;

/** Whether a reference's value shows in parentheses beside its word (RK19): on unless the owner turned it off. */
export const useRefValues = (): boolean => useStore(refValues.store, same);
