import { Redirect } from 'expo-router';

/**
 * Explore was `/explore` until Nov 3; it is `/` now (NV2, decision 0064). A
 * bookmark, or a Home Screen app reopening on its last page, still lands there.
 */
export default function OldExplore() {
  return <Redirect href="/" />;
}
