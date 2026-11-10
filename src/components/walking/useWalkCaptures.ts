import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, BackHandler, Platform, type Pressable } from 'react-native';
import { useEditOffer } from '../edit/EditOffer';
import { useVisible } from '../../lib/deletion/useDeletions';
import { focusOn } from '../../lib/focus';
import { distanceM } from '../../lib/geo';
import type { Faced } from '../../lib/moment';
import { momentPill } from '../../lib/momentPill';
import { feedback } from '../../lib/motion';
import { space } from '../../lib/space';
import type { LngLat } from '../../lib/types';
import { useCaptures } from '../../lib/useCaptures';
import { useStore } from '../../lib/useStore';
import type { SetNotice } from './useWalkNotice';

type PressableRef = ComponentRef<typeof Pressable>;

/**
 * The walk's captures: a photo or video (Edit offered for a new moment's, ME23), a voice memo (Save,
 * Discard with Undo, Retry), a note, the Add to this moment pill (MS1-MS6, MS12) and the room left
 * (SA3, SA4). While a memo records, Android's back does nothing and the web warns before a reload.
 */
export function useWalkCaptures(a: {
  walkId: string | null;
  live: { here: LngLat | null; lastFixAt: number | null };
  setNotice: SetNotice;
  setToast: (t: string | null) => void;
}) {
  const { walkId, live, setNotice, setToast } = a;
  const onCaptureError = useCallback(
    (e: { message: string; openSettings?: boolean }) => {
      setNotice({ message: e.message, tone: 'error', openSettings: e.openSettings });
    },
    [setNotice],
  );
  const cap = useCaptures(walkId, live.here, live.lastFixAt, onCaptureError, {
    // The pill (moment stacks MS2, MS5): a new moment opens it; a piece keeps it.
    onKept: (id, piece) => (piece ? momentPill.piece(id) : momentPill.kept(id, true)),
  });
  // A walk started or stopped closes the pill (MS4); on a walk, the trace walked counts toward its 100 m.
  const pillWalkId = walkId;
  useEffect(() => {
    momentPill.walk();
  }, [pillWalkId]);
  const lastHere = useRef<LngLat | null>(null);
  useEffect(() => {
    const h = live.here;
    if (h && lastHere.current && pillWalkId) momentPill.walked(distanceM(lastHere.current, h));
    lastHere.current = h;
  }, [live.here, pillWalkId]);
  // The note's sheet; every way out keeps the draft, only Save clears it.
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  // The open moment a note being written joins, fixed when it was begun (MS4); null for a new moment.
  const [noteInto, setNoteInto] = useState<string | null>(null);
  const openNote = (into: string | null) => {
    setNoteInto(into);
    setNoteOpen(true);
  };
  // The memo whose save failed at Stop; holding Stop again ends the walk without it.
  const giveUpMemo = useRef(false);
  const saveRef = useRef<PressableRef>(null);
  // After a photo or video, Edit is offered for a few seconds (ME23); it is opt-in.
  const editOffer = useEditOffer();
  const [editingKept, setEditingKept] = useState<Faced | null>(null);

  /** With `into`, the photo joins that open moment (MS2); Edit is offered for a new moment's photo only. */
  async function photo(into: string | null = null) {
    const kept = await cap.takePhoto(into);
    if (!kept) return;
    feedback('tap');
    if (kept.id === kept.momentId) editOffer.show(kept);
  }

  async function startVoice(into: string | null = null) {
    if (await cap.startVoice(into)) {
      feedback('tap');
      giveUpMemo.current = false;
      AccessibilityInfo.announceForAccessibility('Recording voice memo');
    }
  }

  async function saveVoice() {
    const r = await cap.finishVoice();
    if (r === 'saved') {
      feedback('tap');
      setToast('Voice memo saved here');
      AccessibilityInfo.announceForAccessibility('Voice memo saved');
    } else if (r === 'dropped') {
      setToast('Too short, not kept');
      AccessibilityInfo.announceForAccessibility('Too short, not kept');
    }
  }

  async function discardVoice() {
    if ((await cap.discardVoice()) === 'discarded') AccessibilityInfo.announceForAccessibility('Voice memo discarded. Undo is available.');
  }

  async function saveNote() {
    const ok = await cap.saveNote(note, noteInto);
    if (ok) {
      setNote('');
      setNoteOpen(false);
      setNoteInto(null);
      feedback('tap');
      setToast('Note saved here');
    }
  }

  // The viewer's Add to this moment (MS12), run here where the camera, the mic and the note are; on a walk only
  // (the ready screen's capture row runs its own).
  const asked = useStore(momentPill.store, (st) => st.ask?.seq ?? 0);
  const onAsk = useRef<(kind: 'photo' | 'voice' | 'text') => void>(() => {});
  useEffect(() => {
    onAsk.current = (kind) => {
      const into = momentPill.target();
      if (kind === 'photo') void photo(into);
      else if (kind === 'voice') void startVoice(into);
      else openNote(into);
    };
  });
  useEffect(() => {
    const ask = momentPill.store.get().ask;
    if (!asked || !ask || !pillWalkId) return;
    momentPill.asked();
    onAsk.current(ask.kind);
  }, [asked, pillWalkId]);
  // A walk shown: the room left, said beside the captures (SA3, SA4); nothing is asked mid-walk (SA10).
  useEffect(() => {
    if (walkId) void space.check({ recording: true });
  }, [walkId]);
  // A deleted moment leaves the pins, Explore and the viewer at once (D3, D5).
  const captures = useVisible(cap.captures);

  // While a memo records, Android's back button does nothing, and the web
  // warns before a reload or close; leaving would cut the memo short.
  const recordingVoice = cap.voiceStartedAt != null;
  useEffect(() => {
    if (!recordingVoice) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    if (Platform.OS === 'web') window.addEventListener('beforeunload', warn);
    // Focus moves to Save, which replaced the mic the person just tapped.
    const t = setTimeout(() => focusOn(saveRef), 300);
    return () => {
      sub.remove();
      clearTimeout(t);
      if (Platform.OS === 'web') window.removeEventListener('beforeunload', warn);
    };
  }, [recordingVoice]);

  return {
    cap,
    captures,
    recordingVoice,
    photo,
    startVoice,
    saveVoice,
    discardVoice,
    note: { open: noteOpen, setOpen: setNoteOpen, text: note, setText: setNote, openFor: openNote, save: saveNote },
    editOffer,
    editingKept,
    setEditingKept,
    saveRef,
    /** Stop's guard: a memo that failed to save is said once; holding Stop again ends the walk without it. */
    memoGivenUp: () => giveUpMemo.current,
    giveUpMemo: () => {
      giveUpMemo.current = true;
    },
  };
}

export type WalkCaptures = ReturnType<typeof useWalkCaptures>;
