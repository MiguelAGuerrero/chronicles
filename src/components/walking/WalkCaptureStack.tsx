import { CaptureStack } from '../walk/CaptureStack';
import { momentPill } from '../../lib/momentPill';
import type { WalkCaptures } from './useWalkCaptures';

/**
 * The capture stack at the right edge (NR9): where it was on the ready screen. While recording, Save takes
 * the mic's own place, so tapping the mic again saves; Discard is smaller, in the camera's. It hides while a
 * gap's way is drawn, so taps belong to the map (GW8); the pills stay, so a memo's Undo isn't lost under the
 * drawing (gap-drawing audit 7). With Group captures on, the edge adds to the open moment (MS19); off, a new
 * moment (MS1).
 */
export function WalkCaptureStack(props: { captures: WalkCaptures; stopping: boolean; drawing: boolean }) {
  const { cap, saveRef, photo, startVoice, saveVoice, discardVoice, note } = props.captures;
  return (
    <CaptureStack
      ref={saveRef}
      ids={{ photo: 'cap-photo', voice: 'cap-voice', note: 'cap-note', save: 'voice-save', discard: 'voice-discard' }}
      labels={{ photo: 'Take a photo or video', voice: 'Record a voice memo', note: 'Write a note' }}
      voiceStartedAt={cap.voiceStartedAt}
      busy={cap.busy}
      disabled={props.stopping}
      hidden={props.drawing}
      onPhoto={() => void photo(momentPill.edgeTarget())}
      onVoice={() => void startVoice(momentPill.edgeTarget())}
      onSave={saveVoice}
      onDiscard={discardVoice}
      onNote={() => note.openFor(momentPill.edgeTarget())}
    />
  );
}
