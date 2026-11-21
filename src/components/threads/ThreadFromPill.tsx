import { useRef } from 'react';
import { Modal } from '../Modal';
import { AddToThread, type AddToThreadHandle } from './AddToThread';

/**
 * Add to a thread from the Add to this moment pill (TK3, decision 0253): the card over the walk screen or Navigate,
 * ready, in the app's own `Modal`, transparent, opened only while nothing else is (the pill hides under the note page,
 * a card and the drawer), so never a Modal over a Modal. Escape and Back close it; the pill and the stack stay as they
 * were. The host says the card's line ("Connected", "Could not connect"); null when the card already said it.
 */
export function ThreadFromPill(props: { momentId: string | null; onClose: () => void; onDone: (message: string | null, ok: boolean) => void }) {
  const card = useRef<AddToThreadHandle>(null);
  if (!props.momentId) return null;
  return (
    // Back and Escape go a step back, or finish the name step (threading-at-capture audit 5, ui 2).
    <Modal visible transparent animationType="fade" onRequestClose={() => card.current?.requestClose()}>
      <AddToThread ref={card} moment={{ id: props.momentId }} onClose={props.onClose} onDone={props.onDone} />
    </Modal>
  );
}
