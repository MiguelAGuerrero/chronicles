// @layer shell
import { type Faced, facedAll } from '../moment';
import type { Ports } from '../ports/types';
import { parseStartMode, START_MODE_KEY, type StartMode } from '../startPlan';
import type { Walk } from '../types';

/** Meta: the web's "keep this page open" note was dismissed (U9). */
const WEB_NOTE_KEY = 'web_note_dismissed';

/** What the ready screen reads as it comes to the front (NR1, NR7, NR13). */
export type ReadyChoices = {
  mode: StartMode;
  /** No walk kept yet: the web's one-time note may show (U9). */
  firstWalk: boolean;
  webNoteOff: boolean;
  /** Every capture row (never media), for the moments' pins (M16); null if the read failed. */
  captures: Faced[] | null;
};

/**
 * The ready walk screen's effects (Navigate, ready): its saved choices, the
 * web note, the recorder's background capability and a moment's edits. Views
 * call the app's instance, `ready` (`lib/ready`); tests call the factory with `fakePorts()`.
 */
export function createReady(p: Pick<Ports, 'db' | 'recorder'>) {
  return {
    async load(): Promise<ReadyChoices> {
      const [mode, walks, note, captures] = await Promise.all([
        p.db.getMeta(START_MODE_KEY).catch(() => null),
        p.db.listWalks().catch(() => [] as Walk[]),
        p.db.getMeta(WEB_NOTE_KEY).catch(() => null),
        p.db.momentsBetween(0, Number.MAX_SAFE_INTEGER).then(facedAll).catch(() => null),
      ]);
      return { mode: parseStartMode(mode), firstWalk: walks.length === 0, webNoteOff: !!note, captures };
    },
    setMode: (m: StartMode) => p.db.setMeta(START_MODE_KEY, m),
    dismissWebNote: () => p.db.setMeta(WEB_NOTE_KEY, '1'),
    /** Whether the recorder keeps tracing in the background (a phone), or only while the page is open (web). */
    background: () => p.recorder.capabilities.background,
    /** A note's text is its piece's own (decision 0123). */
    saveNote: (pieceId: string, body: string, _type?: string | null) => p.db.updatePiece(pieceId, { body }),
  };
}
