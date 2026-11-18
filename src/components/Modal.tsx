import { useEffect } from 'react';
import { Modal as RNModal, type ModalProps } from 'react-native';
import { holdModal } from '../lib/tabsHidden';

/**
 * A Modal that is only in the tree while it shows. react-native-web's Modal
 * makes its portal's container during render and drops it in an effect's
 * cleanup; a screen kept hidden under another (the home under the walk,
 * which React keeps rendered but disconnected) then re-renders it with no
 * container, and every render appends a new one to <body>, each carrying
 * React's full set of event listeners. During a walk that was about three a
 * second, and an iPhone's browser tab eventually died (the owner's crash,
 * Nov 1). Never import Modal from react-native directly; use this.
 */
export function Modal(props: ModalProps) {
  const up = props.visible !== false;
  // While it shows, whatever is beneath is out of sight: the recording bar's reminder waits (tend explore 22).
  useEffect(() => (up ? holdModal() : undefined), [up]);
  if (!up) return null;
  return <RNModal {...props} />;
}
