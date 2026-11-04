// @layer shell
// @instance: a moment's find, on the app's ports and the Undo window
import { deletions } from '../../deletion';
import { ports } from '../../ports';
import { createMomentFind } from './shell';

export const { findForMoment } = createMomentFind({ ...ports, hidden: () => deletions.hidden() });
