// @layer shell
// @instance: the one holder of every unsaved capture, on the app's media files (decision 0196)
import { newId } from '../id';
import { dropTemp, removeMedia } from '../media';
import { createUnsaved } from './shell';

export const unsaved = createUnsaved({ dropTemp, removeMedia, newId });
export type { Unsaved, UnsavedKind } from './core';
