// @layer shell
// @instance: a walk's backup bundle, on the app's ports
import { ports } from '../../ports';
import { createBundleWriter } from './shell';

export { bundleName, extensionOf, KeeperError, type BundleIO } from './shell';

export const { writeWalkBundle } = createBundleWriter(ports);
