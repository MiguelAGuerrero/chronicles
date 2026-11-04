// @layer shell
import type { Ports } from '../ports/types';
import { parseStartMode, START_MODE_KEY, type StartMode } from '../startPlan';
import type { Capture, Walk } from '../types';

/** Meta: the web's "keep this page open" note was dismissed (U9). */
const WEB_NOTE_KEY = 'web_note_dismissed';

/** What the ready screen reads as it comes to the front (NR1, NR7, NR13). */
export type ReadyChoices = {
  mode: StartMode;
  /** No walk kept yet: the web's one-time note may show (U9). */
  firstWalk: boolean;
  webNoteOff: boolean;
  /** Every capture row (never media), for the moments' pins (M16); null if the read failed. */
  captures: Capture[] | null;
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
        p.db.capturesBetween(0, Number.MAX_SAFE_INTEGER).catch(() => null),
      ]);
      return { mode: parseStartMode(mode), firstWalk: walks.length === 0, webNoteOff: !!note, captures };
    },
    setMode: (m: StartMode) => p.db.setMeta(START_MODE_KEY, m),
    dismissWebNote: () => p.db.setMeta(WEB_NOTE_KEY, '1'),
    /** Whether the recorder keeps tracing in the background (a phone), or only while the page is open (web). */
    background: () => p.recorder.capabilities.background,
    saveCaption: (id: string, caption: string | null, y: number | null) => p.db.updateCapture(id, { caption, caption_y: caption ? y : null }),
    saveNote: (id: string, body: string) => p.db.updateCapture(id, { body }),
  };
}
