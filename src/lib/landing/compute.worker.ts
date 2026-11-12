// @layer adapter
// The read's background thread on the web (explore-dense-city DC7, decision 0151): a compute input in, its output (or an
// error) out. Built by Expo's export as a file of its own from `new Worker(new URL('./compute.worker', import.meta.url))`
// in runOffPage.web.ts; imports only core.
import { handleComputeMessage } from './compute';

const scope = self as unknown as { onmessage: ((e: { data: unknown }) => void) | null; postMessage(data: unknown): void };
scope.onmessage = (e) => scope.postMessage(handleComputeMessage(e.data));
