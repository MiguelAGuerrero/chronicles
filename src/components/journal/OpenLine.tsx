import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ComponentRef, type ForwardedRef, type ReactNode } from 'react';
import { AccessibilityInfo, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { accessoryRoom, floatsAccessory, lineLift } from '../../lib/journal/keyboard';
import { useKeyboardHeight } from '../../lib/threads/useKeyboardHeight';
import { deleteNoteNow } from '../../lib/deletion';
import { KEPT_AS_YOU_WRITE, LINE_LABELS, NOT_KEPT } from '../../lib/journal/lines';
import { noteHead } from '../../lib/notePage/head';
import { PEN_START, hasWords, penStep, type PenEffect, type PenEvent, type PenState } from '../../lib/journal/pen';
import { captureTarget } from '../../lib/journal/target';
import type { Faced } from '../../lib/moment';
import { momentPill } from '../../lib/momentPill';
import { feedback } from '../../lib/motion';
import { hideTabs } from '../../lib/tabsHidden';
import { NOTE_MAX } from '../../lib/noteEdit';
import { editRefs, type EditorRef, fromEditor, insertRef, typedAt } from '../../lib/refs';
import { space } from '../../lib/space';
import { heldLabel } from '../../lib/space/core';
import { formatElapsed } from '../../lib/summary';
import { refLabel } from '../../lib/threads/lines';
import type { LngLat } from '../../lib/types';
import { useCaptures, type MomentState } from '../../lib/useCaptures';
import { useStore } from '../../lib/useStore';
import { EditOfferPill, useEditOffer } from '../edit/EditOffer';
import { MediaEditor } from '../edit/MediaEditor';
import { Icon, type IconName } from '../icons';
import { Modal } from '../Modal';
import { useOpenWalk, useOpenWalkInfo } from '../OpenWalk';
import { SpaceLine } from '../SpaceLine';
import { NewNotePage } from '../notePage/NewNotePage';
import { NotePage, type NotePageHandle } from '../notePage/NotePage';
import { MomentPicker } from '../threads/MomentPicker';
import { useMomentPool } from '../threads/useMomentPool';
import { Ticking } from '../Ticking';
import { theme } from '../ui';
import { OWNER_FONT } from './type';

/** What is typed is written this long after the last keystroke, and at once when the line lets go. */
const SAVE_AFTER_MS = 400;
const ERROR_MS = 6000;
/** The line counts as still being typed in this long after its field loses focus, so a tap on a control of its own row lands. */
const BLUR_HOLD_MS = 200;
const timeOf = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const TOAST_MS = 4000;
/** The line at rest: one row of 44 pt controls and its padding (the page pads its foot by this). */
export const LINE_REST_H = 61;
const FIELD_MIN = 44;
const FIELD_MAX = 132;

/** What the page asks of the line: a tap on the empty page gives the field the keyboard (JN32). */
export type OpenLineHandle = { write: () => void };

type LineProps = {
  /** Memories is in front and nothing is open over it: leaving, or opening something, saves a note being recorded (JN14). */
  focused: boolean;
  /** Something on the page changed (an entry begun, a piece kept, the line let go): the page reads again. */
  onChanged: () => void;
  /** A loose moment's place came, or why it did not (JN5). */
  onMoment: (c: Faced, state: MomentState) => void;
  /** The piece the line is writing, drawn here and not on the page; null when none. */
  onWriting: (pieceId: string | null) => void;
  /** What the line wrote to a piece, and a piece (or its whole moment) it removed: the page's own copy follows (audit 6). */
  onWritten?: (e: { momentId: string; pieceId: string }, body: string, format?: 'md') => void;
  onDropped?: (e: { momentId: string; pieceId: string }, gone: 'moment' | 'piece') => void;
  /** Whether a voice note is recording: the page holds a viewer back until it stops. */
  onRecording?: (on: boolean) => void;
  /** A tap in the line, or a capture from it: today's foot comes into view (JN9, JN11). */
  onFoot: () => void;
  /** Something was kept and should be seen (an entry let go, a photo, a voice note): from a thread or Hidden the page comes back (audit 15). */
  onSeen?: () => void;
  /** The line's own height, as it changes (its status row comes and goes): the sheet pads its foot by it (ui 1). */
  onHeight?: (h: number) => void;
  /** No page is shown (a thread, the threads, Hidden): the field sits in the bar. On the page it is the page's last line (JN28). */
  inBar: boolean;
  /** The screen's body, given the field and what the page needs to grow round it (null when the field is in the bar). */
  children: (page: { field: ReactNode; writing: boolean; entryOpen: boolean } | null) => ReactNode;
  /** The page's own messages (Undo): first in the column above the line (JN18). */
  above?: ReactNode;
};

/**
 * The journal's open line (chronicle journal JN9-JN19, decision 0155): a text field, the camera and the mic, fixed
 * at the foot of Memories. Writing in it is the capture: the first character stores an entry, which is kept as it
 * is typed. With a walk minimized, what it keeps is the walk's; only that case reads the live trace.
 */
export const OpenLine = forwardRef<OpenLineHandle, LineProps>(function OpenLine(props, ref) {
  const info = useOpenWalkInfo();
  const target = captureTarget(info.walk, info.known);
  if ('walkId' in target) return <WalkLine key={target.walkId} {...props} handle={ref} />;
  // Until the keeper knows whether a walk is open, the line waits rather than keep a loose moment for a walk that is.
  return <Line key="loose" {...props} handle={ref} walk={null} disabled={'wait' in target} />;
});

type Handle = { handle: ForwardedRef<OpenLineHandle> };

function WalkLine(props: LineProps & Handle) {
  const open = useOpenWalk();
  const walk = open.walk ? { id: open.walk.id, here: open.live.here, lastFixAt: open.live.lastFixAt, distanceM: open.live.distanceM } : null;
  return <Line {...props} walk={walk} />;
}

function Line(props: LineProps & Handle & { walk: { id: string; here: LngLat | null; lastFixAt: number | null; distanceM: number } | null; disabled?: boolean }) {
  const { walk, onChanged, onMoment, onWriting, onFoot, onRecording, focused } = props;
  const told = useRef({ written: props.onWritten, dropped: props.onDropped });
  useEffect(() => {
    told.current = { written: props.onWritten, dropped: props.onDropped };
  });
  const [error, setError] = useState<{ message: string; openSettings?: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const onError = useCallback((e: { message: string; openSettings?: boolean }) => setError(e), []);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), ERROR_MS);
    return () => clearTimeout(t);
  }, [error]);
  useEffect(() => {
    if (!toast) return;
    AccessibilityInfo.announceForAccessibility(toast);
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const changed = useRef(onChanged);
  const seen = useRef(props.onSeen);
  useEffect(() => {
    changed.current = onChanged;
    seen.current = props.onSeen;
  });
  const cap = useCaptures(walk?.id ?? null, walk?.here ?? null, walk?.lastFixAt ?? null, onError, {
    loose: !walk,
    // The entry's two minutes (JN15): a new moment opens it, a piece keeps it open. The page shows it at once.
    onKept: (id, piece) => {
      if (piece) momentPill.piece(id);
      else momentPill.kept(id, !!walk);
      changed.current();
    },
    onMoment,
  });
  const capRef = useRef(cap);
  useEffect(() => {
    capRef.current = cap;
  });
  const openId = useStore(momentPill.store, (st) => st.id);
  // The room left (storage awareness), as the band asked.
  const walking = !!walk;
  useEffect(() => {
    if (focused) void space.check({ recording: walking });
  }, [focused, walking]);
  // On a walk the entry also ends 100 m on (JN15): the walk's own trace says how far.
  const walked = useRef<number | null>(null);
  const distanceM = walk?.distanceM ?? null;
  useEffect(() => {
    if (distanceM == null) return;
    if (walked.current != null && distanceM > walked.current) momentPill.walked(distanceM - walked.current);
    walked.current = distanceM;
  }, [distanceM]);

  // The pen: its state in a ref, so each event is decided against the latest, and its effects run in order.
  const [text, setText] = useState('');
  const [refs, setRefs] = useState<EditorRef[]>([]);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const [pen, setPen] = useState<PenState>(PEN_START);
  const penRef = useRef<PenState>(PEN_START);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; save: Extract<PenEffect, { k: 'save' }> } | null>(null);
  const send = useRef<(e: PenEvent) => void>(() => {});
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [typing, setTyping] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);
  // The field is one line at rest and grows with what is written, to five lines.
  const [fieldH, setFieldH] = useState(FIELD_MIN);

  useEffect(() => {
    const write = (save: Extract<PenEffect, { k: 'save' }>) => {
      queue.current = queue.current.then(() =>
        capRef.current.writeLine(save, save.body).then(
          () => {
            told.current.written?.(save, save.body);
            send.current({ k: 'saved', body: save.body });
          },
          () => send.current({ k: 'saveFailed' }),
        ),
      );
    };
    const flush = () => {
      const p = pending.current;
      if (!p) return;
      clearTimeout(p.timer);
      pending.current = null;
      write(p.save);
    };
    const run = (fx: PenEffect) => {
      switch (fx.k) {
        case 'begin': {
          // The open entry is read when the begin runs, after any drop or write queued before it (audit 3): a
          // moment an emptied line just removed is never begun into.
          queue.current = queue.current.then(() =>
            capRef.current.beginLine(fx.body, momentPill.target()).then(
              (e) => {
                if (!e) return send.current({ k: 'beginFailed' });
                onWriting(e.pieceId);
                send.current({ k: 'began', ...e, body: fx.body });
              },
              () => send.current({ k: 'beginFailed' }),
            ),
          );
          return;
        }
        case 'save': {
          // A keystroke is the entry's last piece: its two minutes start again (JN15).
          momentPill.piece(fx.momentId);
          if (pending.current) clearTimeout(pending.current.timer);
          pending.current = null;
          // Letting go, or Retry: written at once, so the line knows whether it was kept (audit 4).
          if (fx.now) write(fx);
          else pending.current = { save: fx, timer: setTimeout(flush, SAVE_AFTER_MS) };
          return;
        }
        case 'drop': {
          if (pending.current) clearTimeout(pending.current.timer);
          pending.current = null;
          onWriting(null);
          queue.current = queue.current
            .then(() => capRef.current.dropLine(fx))
            .then((gone) => {
              // The moment went with its only piece: the next capture begins another.
              if (gone === 'moment') momentPill.newMoment();
              told.current.dropped?.(fx, gone);
            }, () => {})
            .then(() => changed.current());
          return;
        }
        case 'clear': {
          flush();
          setText('');
          setRefs([]);
          setSelection(undefined);
          // Once what was typed is written, the page draws it as an entry.
          queue.current = queue.current.then(() => {
            onWriting(null);
            changed.current();
            seen.current?.();
          });
          return;
        }
        case 'end':
          // At once: a capture begun right after Done starts its own entry (audit 3).
          momentPill.newMoment();
          return;
      }
    };
    send.current = (e) => {
      const r = penStep(penRef.current, e);
      penRef.current = r.state;
      setPen(r.state);
      r.effects.forEach(run);
    };
    // Leaving the page, or the page being hidden or closed, writes what is typed at once (JN13).
    const hide = () => flush();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('pagehide', hide);
      document.addEventListener('visibilitychange', hide);
    }
    return () => {
      flush();
      // The line is going (a walk began or ended, the screen changed): the page draws every piece again (audit 10).
      onWriting(null);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('pagehide', hide);
        document.removeEventListener('visibilitychange', hide);
      }
    };
  }, [onWriting]);

  // The entry closed by itself (two minutes, 100 m on a walk): the line lets go of it (JN15).
  const writingMoment = pen.entry?.momentId ?? null;
  useEffect(() => {
    if (writingMoment && openId !== writingMoment) send.current({ k: 'closed' });
  }, [openId, writingMoment]);
  // Memories left, or something opened over it: the entry ends, and a note being recorded is saved (JN14, JN15).
  const recording = cap.voiceStartedAt != null;
  const saveVoice = async () => {
    const r = await cap.finishVoice();
    if (r === 'saved') {
      feedback('tap');
      send.current({ k: 'kept' });
      seen.current?.();
    } else if (r === 'dropped') setToast('Too short, not kept');
  };
  const saveVoiceRef = useRef(saveVoice);
  useEffect(() => {
    saveVoiceRef.current = saveVoice;
  });
  useEffect(() => {
    if (focused) return;
    if (recording) void saveVoiceRef.current();
    send.current({ k: 'closed' });
    momentPill.leave();
    input.current?.blur();
  }, [focused, recording]);
  useEffect(() => () => momentPill.leave(), []);
  useEffect(() => {
    onRecording?.(recording);
  }, [recording, onRecording]);
  // Android's back does nothing mid-note, and the web warns before closing: leaving would cut it short.
  useEffect(() => {
    if (!recording) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('beforeunload', warn);
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('beforeunload', warn);
    };
  }, [recording]);

  // Writing: a reference reads as "@" and its words and goes whole (RF3); what is stored puts its token back.
  const [picking, setPicking] = useState<number | null>(null);
  const onChangeText = (next: string) => {
    const edited = editRefs(text, next, refs);
    setText(edited.text);
    setRefs(edited.refs);
    setSelection(undefined);
    const at = typedAt(text, next);
    if (at != null && edited.text === next) setPicking(at);
    send.current({ k: 'type', body: fromEditor(edited.text, edited.refs) });
  };
  const pick = (id: string, words: string | null) => {
    if (picking == null) return;
    const r = insertRef(text, picking, refs, id, words);
    setText(r.text);
    setRefs(r.refs);
    setSelection({ start: r.cursor, end: r.cursor });
    setPicking(null);
    send.current({ k: 'type', body: fromEditor(r.text, r.refs) });
    input.current?.focus();
  };
  // The line opens into a page (JN25): on the entry being written, with its words already there, or a new page from an
  // empty line. The page is the note's own editor (decision 0151); what it writes is that same entry's.
  const [page, setPage] = useState<{ key: number; into: string | null; entry: { momentId: string; pieceId: string; body: string; t: number; placed: boolean } | null } | null>(null);
  const pageRef = useRef<NotePageHandle>(null);
  const [pageNow] = useState(() => Date.now());
  const openPage = () => {
    const s = penRef.current;
    if (s.beginning || recording) return;
    input.current?.blur();
    const key = (page?.key ?? 0) + 1;
    if (!s.entry || !hasWords(s.body)) {
      setPage({ key, into: momentPill.target(), entry: null });
      return;
    }
    const entry = s.entry;
    const body = s.body;
    const kept = cap.captures.find((c) => c.id === entry.momentId);
    // What is typed is written first, after anything queued before it; only once that write has landed does the line
    // let go and the page take the entry (audit 4). A write that fails is said in the line, with Retry: no page opens
    // over words the store does not hold.
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
    queue.current = queue.current.then(() =>
      capRef.current.writeLine(entry, body).then(
        () => {
          told.current.written?.(entry, body);
          // Typed on meanwhile: the line keeps its entry, and the page is asked for again.
          if (penRef.current.entry?.pieceId !== entry.pieceId || penRef.current.body !== body) return;
          penRef.current = PEN_START;
          setPen(PEN_START);
          setText('');
          setRefs([]);
          setSelection(undefined);
          onWriting(null);
          changed.current();
          keptOnPage.current = true;
          setPage({ key, into: null, entry: { ...entry, body, t: kept?.t ?? pageNow, placed: kept?.lat != null } });
        },
        () => send.current({ k: 'saveFailed' }),
      ),
    );
  };
  // Whether the page kept anything: only then is there something to be seen on the sheet (audit 10).
  const keptOnPage = useRef(false);
  const closePage = () => {
    setPage(null);
    changed.current();
    if (keptOnPage.current) seen.current?.();
    keptOnPage.current = false;
  };
  const pageCamera = async () => {
    // On the page a photo is its own moment, mentioned in the note (NP14); in the line it joins the entry (JN15).
    const k = await cap.takePhoto(null);
    // Its own moment, and not the entry the line writes into next (audit 10).
    if (k) momentPill.newMoment();
    return k ? { id: k.momentId, label: k.kind === 'video' ? 'A video' : 'A photo' } : null;
  };

  const done = () => {
    input.current?.blur();
    send.current({ k: 'done' });
  };

  // The camera and the mic: what they keep joins the open entry, and the words typed so far stand as their own piece.
  const editOffer = useEditOffer();
  const [editing, setEditing] = useState<Faced | null>(null);
  const photo = async () => {
    onFoot();
    // Mid-note, the camera is still one tap (audit 1): the note is saved first, then the camera opens.
    if (recording) await saveVoice();
    void cap.takePhoto(momentPill.target()).then((k) => {
      if (!k) return;
      feedback('tap');
      send.current({ k: 'kept' });
      seen.current?.();
      if (k.id === k.momentId) editOffer.show(k);
    });
  };
  const voice = () => {
    onFoot();
    void cap.startVoice(momentPill.target()).then((ok) => {
      if (!ok) return;
      feedback('tap');
      // The words typed so far stand as their own piece from here: emptying the line can no longer remove the
      // moment the note is being recorded into (audit 3).
      send.current({ k: 'kept' });
    });
  };
  // The viewer's Add to this moment (MS12) is run here, where the camera, the mic and the line are.
  const asked = useStore(momentPill.store, (st) => st.ask?.seq ?? 0);
  const onAsk = useRef<(kind: 'photo' | 'voice' | 'text') => void>(() => {});
  useEffect(() => {
    onAsk.current = (kind) => (kind === 'photo' ? void photo() : kind === 'voice' ? voice() : input.current?.focus());
  });
  useEffect(() => {
    const ask = momentPill.store.get().ask;
    if (!asked || !ask) return;
    momentPill.asked();
    onAsk.current(ask.kind);
  }, [asked]);

  // The line rides above the keyboard (JN19, audit 1): it rises by what the keyboard covers above whatever sits
  // under it (the tab bar, the recording bar), measured while the keyboard is down.
  const keyboard = useKeyboardHeight();
  const { height: windowH } = useWindowDimensions();
  const wrap = useRef<ComponentRef<typeof View>>(null);
  const [below, setBelow] = useState(0);
  const measure = () => {
    // Only at rest: while writing the bars under the line are folded away, and that is not its resting place.
    if (keyboard > 0 || typing) return;
    wrap.current?.measureInWindow((_x: number, y: number, _w: number, h: number) => setBelow(Math.max(0, Math.round(windowH - (y + h)))));
  };
  // While the field has the keyboard, the tab bar and the recording bar fold away (JN30): nothing stands between
  // the entry and the keys, and the bar sits on the keyboard itself.
  useEffect(() => {
    if (!typing) return;
    return hideTabs();
  }, [typing]);
  const lift = lineLift(keyboard, typing ? 0 : below);
  // An iPhone's browser floats the keyboard's own row (previous, next, a tick) over the page, on whatever sits
  // just above the keys: the bar keeps that much of itself empty under its controls (fix keyboard-accessory).
  const [floating] = useState(
    () => Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof CSS !== 'undefined'
      && floatsAccessory({ ua: navigator.userAgent, touchPoints: navigator.maxTouchPoints, supports: (q) => CSS.supports(q) }),
  );
  const under = accessoryRoom({ keyboard, floating });
  const writing = text.length > 0 || pen.beginning || !!pen.entry;
  const entryOpen = writing || !!openId;
  const showDone = typing || entryOpen;
  const status = pen.failed ? NOT_KEPT : writing ? KEPT_AS_YOU_WRITE : null;
  const errorPill = error && (
    <View style={styles.pill} accessibilityLiveRegion="polite" testID="band-error">
      <Text style={styles.pillText}>{error.message}</Text>
      {error.openSettings && Platform.OS !== 'web' && (
        <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={styles.pillBtn}>
          <Text style={styles.pillBtnText}>Settings</Text>
        </Pressable>
      )}
    </View>
  );
  const retryPill = (id: string, words: string, onPress: () => void, label = 'Retry') => (
    <View style={styles.pill} accessibilityLiveRegion="polite" testID={id}>
      <Text style={styles.pillText}>{words}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.pillBtn} testID={`${id}-act`}>
        <Text style={styles.pillBtnText}>{label}</Text>
      </Pressable>
    </View>
  );

  const { inBar } = props;
  // A tap on the empty page: the field takes the keyboard in the tap itself, so a phone raises it.
  useImperativeHandle(props.handle, () => ({
    write: () => {
      input.current?.focus();
      onFoot();
    },
  }));
  // The field (JN28). On the page it is the last line of today's page, as wide as the column, in the owner's serif,
  // with no box: the words are written where they will stay. Where no page shows, it sits in the bar.
  const fieldEl = (
    <View key="field" style={inBar ? styles.fieldInBar : styles.fieldOnPage}>
      {/* Room for the dateline that arrives with the first character, so the line being written does not jump. */}
      {!inBar && !entryOpen && <View style={styles.datelineRoom} />}
      <View>
        {/* A still mark where writing begins: the page says "here" without a hint or a prompt (JN10). */}
        {!typing && text.length === 0 && <View style={styles.mark} pointerEvents="none" />}
        <TextInput
          ref={input}
          testID="line-input"
          multiline
          value={text}
          onChangeText={onChangeText}
          selection={selection}
          editable={!props.disabled}
          accessibilityLabel={LINE_LABELS.write}
          maxLength={NOTE_MAX}
          rows={1}
          onContentSizeChange={(e) => setFieldH(Math.max(FIELD_MIN, Math.ceil(e.nativeEvent.contentSize.height)))}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            setTyping(true);
            onFoot();
          }}
          onBlur={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            blurTimer.current = setTimeout(() => setTyping(false), BLUR_HOLD_MS);
          }}
          style={[styles.field, { height: text.length ? (inBar ? Math.min(FIELD_MAX, fieldH) : fieldH) : FIELD_MIN }]}
        />
      </View>
    </View>
  );
  const active = typing || writing;
  const timer = (
    <View testID="band-voice-timer" style={styles.timer} accessible accessibilityLabel="Recording voice note">
      <View style={styles.recDot} />
      <Ticking style={styles.timerText} text={(t) => formatElapsed(t - cap.voiceStartedAt!)} />
    </View>
  );
  const discard = (
    <Pressable testID="band-voice-discard" accessibilityRole="button" accessibilityLabel="Discard voice note" accessibilityHint="Throws this recording away. You can undo for a few seconds." onPress={() => cap.discardVoice()} style={styles.textBtn}>
      <Text style={styles.textBtnText}>Discard</Text>
    </Pressable>
  );
  const bar = (
    <View key="line" style={styles.layer} pointerEvents="box-none">
      <View ref={wrap} onLayout={measure} style={[styles.wrap, { bottom: lift }]} pointerEvents="box-none" testID="open-line-wrap">
        {/* Messages sit above the bar, in one column, so nothing covers it or each other (JN18). */}
        <View style={styles.above} pointerEvents="box-none">
          {props.above}
          {errorPill}
          {editOffer.offer && !recording && (
            <EditOfferPill
              offer={editOffer.offer}
              where="moment"
              onEdit={() => {
                const id = editOffer.offer?.id;
                setEditing(cap.captures.find((c) => c.id === id) ?? null);
                editOffer.clear();
              }}
            />
          )}
          {toast && (
            <View style={styles.pill} accessibilityLiveRegion="polite" testID="band-toast">
              <Text style={styles.pillText}>{toast}</Text>
            </View>
          )}
          {cap.discarded && !recording && retryPill('band-voice-undo', 'Voice note discarded', () => cap.undoDiscard(), 'Undo')}
          {cap.unsaved && retryPill('band-voice-retry', 'Voice note not saved', () => cap.retrySave())}
          {cap.held.length > 0 && retryPill('held-captures', heldLabel(cap.held), () => cap.retryHeld())}
          {!recording && focused && <SpaceLine />}
        </View>
        {/* One bar, one row (JN29). The whole strip is the bar's: a tap between its controls never lands on an entry beneath. */}
        <View style={[styles.line, under > 0 && { paddingBottom: 8 + under }]} testID="open-line" pointerEvents="auto" onLayout={(e) => props.onHeight?.(Math.round(e.nativeEvent.layout.height))}>
          <View style={styles.row}>
            {inBar ? (
              fieldEl
            ) : recording ? (
              <View style={styles.lead}>{timer}{discard}</View>
            ) : active || pen.failed ? (
              <Text style={styles.status} numberOfLines={1} testID="line-status" accessibilityLiveRegion="polite">{status ?? ''}</Text>
            ) : (
              // At rest the bar holds no pen: the empty page is the pen (JN32).
              <View style={styles.lead} />
            )}
            {inBar && recording ? <>{timer}{discard}</> : null}
            {pen.failed ? (
              <Pressable testID="line-retry" accessibilityRole="button" onPress={() => send.current({ k: 'retry' })} style={styles.textBtn}>
                <Text style={styles.textBtnText}>Retry</Text>
              </Pressable>
            ) : active && !recording ? (
              // The line opens into the note's page (JN25): for a long entry, or one with a shape.
              <IconButton testID="line-page" icon="document-text-outline" label="Open as a page" onPress={openPage} disabled={pen.beginning} />
            ) : null}
            <IconButton testID="band-photo" icon="camera-outline" label={LINE_LABELS.photo} onPress={() => void photo()} busy={cap.busy === 'photo'} disabled={props.disabled || (cap.busy === 'voice' && !recording)} />
            {recording ? (
              <IconButton testID="band-voice-save" icon="stop" label="Stop and save voice note" onPress={() => void saveVoice()} busy={cap.busy === 'voice'} voice />
            ) : (
              <IconButton testID="band-voice" icon="mic-outline" label={LINE_LABELS.voice} onPress={voice} busy={cap.busy === 'voice'} disabled={props.disabled} />
            )}
            {showDone && (
              <Pressable testID="line-done" accessibilityRole="button" accessibilityLabel="Done" onPress={done} style={styles.done}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
  // Keyed, so the bar and the screen keep their state when their order changes: the bar comes first for a screen
  // reader on the page, and after a thread's or Hidden's own Back.
  const body = <View key="body" style={styles.body}>{props.children(inBar ? null : { field: fieldEl, writing: typing, entryOpen })}</View>;
  return (
    <>
      {inBar ? [body, bar] : [bar, body]}
      <Modal visible={page != null} animationType="slide" onRequestClose={() => pageRef.current?.requestClose()}>
        {page && !page.entry && (
          <NewNotePage key={page.key} ref={pageRef} cap={cap} into={page.into} onWalk={walking} camera onKept={() => { keptOnPage.current = true; }} onClose={closePage} />
        )}
        {page?.entry && (
          <NotePage
            key={page.key}
            ref={pageRef}
            body={page.entry.body}
            // Typed in the line: literal until the page writes it (NP7).
            bodyFormat={null}
            head={noteHead({ t: page.entry.t, now: pageNow, time: timeOf(page.entry.t), context: null, placing: false, draft: null, placed: page.entry.placed, onWalk: walking })}
            self={page.entry.momentId}
            onClose={closePage}
            onCamera={pageCamera}
            store={{
              kept: true,
              create: async () => {},
              save: async (body) => {
                const e = page.entry!;
                await cap.setNote({ id: e.momentId, piece_id: e.pieceId }, body);
                told.current.written?.(e, body, 'md');
              },
              remove: () => {
                // The entry is going: what is written next begins another, never a piece of this one (audit 1).
                momentPill.newMoment();
                keptOnPage.current = false;
                deleteNoteNow({ id: page.entry!.momentId, piece_id: page.entry!.pieceId });
              },
            }}
          />
        )}
      </Modal>
      {picking != null && (
        <Mention self={pen.entry?.momentId ?? null} onPick={pick} onClose={() => { setPicking(null); input.current?.focus(); }} />
      )}
      {editing && <MediaEditor key={editing.id} capture={editing} initialTool="crop" onClose={() => setEditing(null)} onSave={(patch) => cap.setEdit(editing, patch)} />}
    </>
  );
}

/** The moment picker for an @ in the line (JN16), in its own Modal; the moments are read only while it is open. */
function Mention(props: { self: string | null; onPick: (id: string, words: string | null) => void; onClose: () => void }) {
  const pool = useMomentPool();
  const [now] = useState(() => Date.now());
  return (
    <Modal visible transparent animationType="fade" onRequestClose={props.onClose}>
      <MomentPicker pool={pool} self={props.self} title="Mention a moment" onPick={(v) => props.onPick(v.id, refLabel(v, now))} onClose={props.onClose} />
    </Modal>
  );
}

function IconButton(props: { testID: string; icon: IconName; label: string; onPress: () => void; busy?: boolean; disabled?: boolean; voice?: boolean }) {
  const inactive = props.disabled || props.busy;
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: !!inactive, busy: !!props.busy }}
      disabled={inactive}
      onPress={props.onPress}
      style={({ pressed }) => [styles.icon, props.voice && styles.iconVoice, inactive && styles.dim, pressed && styles.dim]}
    >
      <Icon name={props.icon} size={24} color={props.voice ? '#ffffff' : theme.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 2 },
  body: { flex: 1 },
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  above: { paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: 'center' },
  // An edge that reads as a control's boundary (3:1 on the ground): shape says "write here", with no hint (ui 5).
  line: { backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.edge, paddingHorizontal: 8, paddingVertical: 8 },
  status: { flex: 1, color: theme.muted, fontSize: 13, paddingLeft: 8 },
  lead: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, width: '100%', maxWidth: 624, alignSelf: 'center' },
  // On the page: the column's own width, no box (JN28). In the bar: what the row leaves.
  fieldOnPage: { width: '100%' },
  fieldInBar: { flex: 1, minHeight: 44, justifyContent: 'center', paddingLeft: 8 },
  datelineRoom: { height: 58 },
  mark: { position: 'absolute', left: 0, top: 9, width: 2, height: 26, backgroundColor: theme.ink },
  // 16 px or more, or iOS Safari zooms the page on focus; no outline: the mark and the caret say where.
  field: { color: theme.ink, fontFamily: OWNER_FONT, fontSize: 19, lineHeight: 26, paddingVertical: 9, paddingHorizontal: 0, textAlignVertical: 'top', ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconVoice: { backgroundColor: '#6b21a8' },
  dim: { opacity: 0.5 },
  done: { minWidth: 44, height: 44, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.danger },
  timerText: { color: theme.ink, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  textBtn: { minHeight: 44, minWidth: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  textBtnText: { color: theme.ink, fontSize: 15, fontWeight: '700' },
  pill: { width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.ink, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, minHeight: 48 },
  pillText: { color: theme.bg, fontSize: 14, flex: 1 },
  pillBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 },
  pillBtnText: { color: theme.bg, fontSize: 14, fontWeight: '700' },
});
