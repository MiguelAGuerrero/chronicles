import { useEffect, useMemo, useState } from 'react';
import { useHidden } from '../../lib/deletion/useDeletions';
import { memoWords } from '../../lib/voiceTrim';
import { GONE, mentioned, refIds } from '../../lib/refs';
import { fromLine } from '../../lib/resurface/views';
import { refCardLine } from '../../lib/threads/lines';
import { makePicture } from '../../lib/media/pictureData';
import { createPictureStore } from '../../lib/notePage/pictureStore';
import { pictureKey, pictureKind, pictureSpoken, picturesWanted, showsContext } from '../../lib/notePage/pictures';
import { shownStill } from '../../lib/thumbPlan';
import { thumbs } from '../../lib/thumbs';
import { useStore } from '../../lib/useStore';
import type { Faced } from '../../lib/moment';
import type { Baker } from '../Baker.types';
import type { MomentPool } from '../threads/useMomentPool';

const KIND_WORD = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' } as const;

/** A mention drawn as its photo or video (note pictures): its data, whether it is a video, its spoken name, and where it is from when that differs from the page's (NI16). */
export type MentionPicture = { src: string; video: boolean; spoken: string; context: string | null };

/** A mention as the page draws it (RF4, RF5): its words and line, or that it is no longer kept. JSON, for the DOM. */
export type MentionCard = { gone: true; text: string } | { gone: false; name: string; line: string; spoken: string; picture?: MentionPicture };

type Options = {
  /** Draw a photo's or video's mention as its picture (note pictures): the page's own time and walk say whether a line is due (NI16). */
  pictures?: { page: { t: number; walkId?: string | null } | null; baker: Baker | null };
};

/** What a page's moments are read by: the mentions it holds, so a keystroke never reads them again (NI11). */
export const mentionKey = (body: string): string => refIds(body).join('|');

/**
 * The cards of a note's mentions (RF4, RF5 on the page's reader; note pages NP5): each moment's kind and words, its
 * date, place and walk, as `NoteText` draws them; a moment gone or waiting in Undo reads "A moment no longer kept".
 * Undefined until the moments are read, so nothing is called gone while it loads. With `pictures`, a photo's or video's
 * card carries its picture too, made once per photo and edit and held in memory (NI11); the moments are read again only
 * when the set of mentions changes, never on a keystroke (NI11): the caller reads `pool` by `mentionKey(body)`.
 */
export function useMentionCards(body: string, pool: MomentPool, opts: Options = {}): Record<string, MentionCard> | undefined {
  const idsKey = mentionKey(body);
  const ids = useMemo(() => (idsKey ? idsKey.split('|') : []), [idsKey]);
  const hidden = useHidden();
  const [now] = useState(() => Date.now());
  const made = useStore(thumbs.store, (s) => s.made);
  const pictureOn = !!opts.pictures;
  const page = opts.pictures?.page ?? null;
  const pageT = page?.t;
  const pageWalk = page?.walkId;
  const baker = opts.pictures?.baker ?? null;
  const [store] = useState(() => createPictureStore<Faced, Baker | null>((c, bake) => makePicture(c, bake ?? undefined)));
  const [drawn, setDrawn] = useState<Record<string, string | null>>({});

  // The pieces to draw, a video with the still the thumbs made since its row was read (VS2).
  const pieces = useMemo(() => {
    if (!pictureOn || !pool.ready) return [];
    const out: Faced[] = [];
    for (const w of picturesWanted(ids, pool.every, hidden, true)) {
      const v = pool.every.get(w.id);
      if (w.how !== 'picture' || !v) continue;
      const c = v.capture;
      out.push(c.kind === 'video' ? { ...c, thumb_path: shownStill(c.thumb_path, made[c.piece_id]) } : c);
    }
    return out;
  }, [pictureOn, pool, ids, hidden, made]);

  useEffect(() => {
    let live = true;
    for (const c of pieces) {
      if (c.kind === 'video' && !c.thumb_path) {
        void thumbs.ask(c.id, c.piece_id);
        continue;
      }
      void store.ask(c, baker).then((u) => live && setDrawn((d) => (d[pictureKey(c)] === u ? d : { ...d, [pictureKey(c)]: u })));
    }
    return () => {
      live = false;
    };
  }, [pieces, store, baker]);

  return useMemo(() => {
    if (!pool.ready) return undefined;
    const out: Record<string, MentionCard> = {};
    for (const id of ids) {
      const v = mentioned(pool.every, hidden, id);
      if (!v) {
        out[id] = { gone: true, text: GONE[0].toUpperCase() + GONE.slice(1) };
        continue;
      }
      const line = refCardLine({ place: v.place, t: v.t, walkLine: fromLine(v.walkId ? pool.walks.get(v.walkId) : undefined) }, now);
      const what = v.kind === 'text' ? (v.words ?? KIND_WORD.text) : v.kind === 'voice' ? memoWords(v.capture) : (v.words ?? KIND_WORD[v.kind]);
      const card: MentionCard = { gone: false, name: `${KIND_WORD[v.kind]}: ${what}`, line, spoken: `${KIND_WORD[v.kind]}: ${what}. ${line}. Open` };
      const kind = pictureKind(v.kind);
      if (pictureOn && kind) {
        const c = v.capture;
        const piece = kind === 'video' ? { ...c, thumb_path: shownStill(c.thumb_path, made[c.piece_id]) } : c;
        const src = drawn[pictureKey(piece)];
        if (src) {
          const differs = pageT !== undefined && showsContext({ t: v.t, walkId: v.walkId }, { t: pageT, walkId: pageWalk });
          card.picture = { src, video: kind === 'video', spoken: pictureSpoken(kind, v.words, line), context: differs ? line : null };
        }
      }
      out[id] = card;
    }
    return out;
  }, [pool, ids, hidden, drawn, made, now, pictureOn, pageT, pageWalk]);
}
