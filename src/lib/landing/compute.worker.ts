// @layer adapter
// The read's background thread on the web (explore-dense-city DC7, audit 2, decision 0159): a job (a read or an atlas
// ring) in, its result (or an error) out. Built by Expo's export as a file of its own from `new Worker(new URL('./compute.worker', import.meta.url))`
// in runOffPage.web.ts; imports only core.
import { handleWorkerMessage } from './workerJobs';

const scope = self as unknown as { onmessage: ((e: { data: unknown }) => void) | null; postMessage(data: unknown): void };
scope.onmessage = (e) => scope.postMessage(handleWorkerMessage(e.data));
