import { forwardRef, useEffect, useRef, useState } from 'react';
import { deleteNoteNow } from '../../lib/deletion';
import { noteHead } from '../../lib/notePage/head';
import type { NoteType } from '../../lib/noteType';
import { typeForNewNote } from '../../lib/noteTypeChoice';
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
  /** The camera is offered on the page (NP14). */
  camera?: boolean;
}>(function NewNotePage(props, ref) {
  const { cap, onKept } = props;
  const [stamp] = useState(() => cap.beginNote(props.into));
  // A type chosen on the page (NY24): held until the note is kept, then written on it; never a reason to keep one.
  const typed = useRef<{ ids: { id: string; piece_id: string } | null; chosen: NoteType | null }>({ ids: null, chosen: null });
  const [store] = useState(() =>
    newNoteStore(
      async (body) => {
        const k = await cap.keepNote(stamp, body);
        if (k) {
          typed.current.ids = k;
          if (typed.current.chosen) await cap.setNote(k, body, typed.current.chosen, true);
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
      type={null}
      onType={async (t) => {
        const w = typed.current;
        w.chosen = t;
        if (typeForNewNote({ kept: !!w.ids, chosen: t }) === 'set' && w.ids) await cap.setNote(w.ids, '', t, true);
      }}
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
