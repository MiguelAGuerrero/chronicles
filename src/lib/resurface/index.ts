// @layer shell
// @instance: Chronicle's Memories, on the app's ports
import { ports } from '../ports';
import { transcripts } from '../transcript';
import { createResurface } from './shell';

export type { ResurfaceState } from './shell';
// A memo's words are what the phone read from it (TX10): its piece's stored transcript, while it fits the memo's trim.
export const resurface = createResurface(ports, {
  transcript: (c) => (c.kind === 'voice' ? transcripts.words(c.piece_id, { id: c.piece_id, t: c.t, body: c.body, edit: c.edit }) : null),
});
// Words that arrive later reach Memories at its next read.
transcripts.store.subscribe(() => void resurface.refresh());
