// @layer shell
// @instance: the whole-app backup's writer, on the app's ports
import { ports } from '../ports';
import { createBackupWriter } from './shell';

export { datePartsOf, type BackupIO, type BackupState } from './shell';

/** Your data's backup (specs/back-up-everything): the page reads its store and calls `backUp` with the platform's io. */
export const backup = createBackupWriter(ports);
