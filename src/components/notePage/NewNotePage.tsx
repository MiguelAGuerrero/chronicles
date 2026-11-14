import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { deleteNoteNow } from '../../lib/deletion';
import { noteHead } from '../../lib/notePage/head';
import type { ReactionId, ReactionSet } from '../../lib/reactions/core';
import { reactions } from '../../lib/reactions';
import { useReactions } from '../../lib/reactions/useReactions';
import type { CaptureKind } from '../../lib/types';
import type { useCaptures } from '../../lib/useCaptures';
import { NotePage, newNoteStore, type NotePageHandle } from './NotePage';

type Cap = Pick<ReturnType<typeof useCaptures>, 'beginNote' | 'keepNote' | 'setNote' | 'takePhoto'>;

const timeOf = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const KIND_WORDS: Partial<Record<CaptureKind, string>> = { photo: 'A photo', video: 'A video' };

/**
 * A note begun from a capture surface (NP1): the pencil, Respond, Add to this moment. Its time, fix and the moment
 * it answers are taken now, at the tap (the steward's S9); it becomes a moment once it has words (NP9); the page's
 * camera keeps a photo as its own moment and mentions it (NP14), on a reply's page too (note-pages audit 14). Keyed by
 * the host per page opened.
 */
export const NewNotePage = forwardRef<NotePageHandle, {
  cap: Cap;
  /** The open moment the note joins (MS2), or null for a moment of its own. */
  into: string | null;
  onWalk: boolean;
  onClose: () => void;
  /** It was kept (its first words landed): the host says so as it says any capture. */
  onKept?: () => void;
  /** The page carries the Reaction tool (RX13): a capture surface's page does; a response's does not. */
  reactable?: boolean;
  /** The camera is offered on the page (NP14). */
  camera?: boolean;
}>(function NewNotePage(props, ref) {
  const { cap, onKept } = props;
  const [stamp] = useState(() => cap.beginNote(props.into));
  // Reactions chosen on the page (RX13): held under the page's key until its moment is kept, then written on it;
  // never a reason to keep one. A page left without words drops them.
  const key = `page:${useId()}`;
  const kept = useRef<string | null>(null);
  const [held, setHeld] = useState<ReactionSet>(() => reactions.held(key));
  const [keptId, setKeptId] = useState<string | null>(null);
  const keptSet = useReactions(keptId);
  // A page that joins an open moment shows and changes that moment's reactions at once (reactions audit 2).
  const intoSet = useReactions(stamp.into);
  useEffect(() => () => {
    if (!kept.current) reactions.drop(key);
  }, [key]);
  const [store] = useState(() =>
    newNoteStore(
      async (body) => {
        const k = await cap.keepNote(stamp, body);
        if (k) {
          kept.current = k.id;
          // The note is kept whether or not its reactions are: a failed reaction write must never look like a failed
          // keep, or the page keeps the note a second time (note-types audit 58).
          await reactions.keep(key, k.id).catch(() => {});
          setKeptId(k.id);
          onKept?.();
        }
        return k;
      },
      (ids, body) => cap.setNote(ids, body),
      deleteNoteNow,
    ),
  );
  const [now] = useState(() => Date.now());
  // Its one fix is on the way (note-pages audit 3): the head says so until it lands.
  const [placing, setPlacing] = useState(() => !stamp.at && !!stamp.locating);
  useEffect(() => {
    let live = true;
    void stamp.locating?.finally(() => live && setPlacing(false));
    return () => {
      live = false;
    };
  }, [stamp]);
  const head = noteHead({ t: stamp.t, now, time: timeOf(stamp.t), context: null, placing, draft: { onWalk: props.onWalk } });
  return (
    <NotePage
      ref={ref}
      body=""
      bodyFormat="md"
      head={head}
      store={store}
      self={stamp.into ?? null}
      reaction={props.reactable ? {
        set: stamp.into ? intoSet : keptId ? keptSet : held,
        onPick: (id: ReactionId) => {
          if (stamp.into ? reactions.choose(stamp.into, id).catch(() => {}) : null) return;
          if (kept.current) void reactions.choose(kept.current, id).catch(() => {});
          else setHeld(reactions.hold(key, id));
        },
      } : undefined}
      onClose={props.onClose}
      onCamera={
        props.camera
          ? async () => {
              const k = await cap.takePhoto(null);
              return k ? { id: k.momentId, label: KIND_WORDS[k.kind] ?? 'A moment' } : null;
            }
          : undefined
      }
    />
  );
});
