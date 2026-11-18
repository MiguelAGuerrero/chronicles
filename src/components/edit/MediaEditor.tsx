import type { Faced } from '../../lib/moment';
import { useEventListener } from 'expo';
import { useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import { useVideoPlayer } from 'expo-video';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CapturePatch } from '../../lib/captureBus';
import { FULL_LINES_TEXT, openSession, step, TOOLS, type EditTool, type Session, type SessionEvent } from '../../lib/editSession';
import { removeMedia } from '../../lib/media';
import { keepEditedThumb } from '../../lib/media/thumb';
import { thumbs } from '../../lib/thumbs';
import { ASPECTS, aspectRatio, cropFromRotated, cropToRotated, editedSize, PEN_COLORS, rotatedSize, SIZE_LABELS, type MediaEdit } from '../../lib/mediaEdit';
import { stillChanged, THUMB } from '../../lib/thumbPlan';
import { formatElapsed } from '../../lib/format';
import { voiceReachedEnd, voiceSpan, wholeMs } from '../../lib/voiceTrim';

import { useMediaUri } from '../../lib/useMediaUri';
import { useBaker } from '../Baker';
import { CaptionBar, CaptionField } from '../Caption';
import { Icon, type IconName } from '../icons';
import { Modal } from '../Modal';
import { Button, theme } from '../ui';
import { EditedPicture, fitRect, useNaturalSize, webData } from './EditedPhoto';
import { seekTo, useVideoSize, VideoPicture } from './EditedVideo';
import { CropFrame, DrawLayer, FilterStrip, TrimBar } from './tools';

const TOOL_META: Record<EditTool, { label: string; icon: IconName }> = {
  crop: { label: 'Crop', icon: 'crop' },
  filter: { label: 'Filter', icon: 'color-filter' },
  draw: { label: 'Draw', icon: 'brush' },
  text: { label: 'Text', icon: 'text' },
  trim: { label: 'Trim', icon: 'cut' },
};

// Module level, so the compiler lint does not see a player mutated in a component (captures-and-media rules).
function seekAudio(player: AudioPlayer, s: number) {
  void player.seekTo(s);
}
function playAudio(player: AudioPlayer) {
  player.play();
}
function pauseAudio(player: AudioPlayer) {
  player.pause();
}

const DRAW_TOOLS: { id: 'pen' | 'marker' | 'eraser'; label: string; icon: IconName }[] = [
  { id: 'pen', label: 'Pen', icon: 'pencil' },
  { id: 'marker', label: 'Marker', icon: 'color-wand' },
  { id: 'eraser', label: 'Eraser', icon: 'backspace' },
];

/**
 * The Edit screen (ME1-ME3, ME5-ME15, ME22): one editor for a photo or a
 * video moment, with a row of tools. Nothing is saved until Done, which
 * saves every change at once, then remakes a photo's small copy from the
 * edited photo (ME20). As an `overlay` it draws inside the screen it is on
 * (the viewer): iOS can't present a Modal over a Modal. Elsewhere it is its
 * own Modal.
 */
/** What a host may ask of the editor: Escape or Back goes through its own Close, which asks first (media-editing audit 5). */
export type MediaEditorHandle = { requestClose(): void };

export const MediaEditor = forwardRef<MediaEditorHandle, {
  capture: Faced;
  initialTool?: EditTool;
  overlay?: boolean;
  /** Stores a change to the capture: the edits and caption on Done, then the new small copy. */
  onSave: (patch: CapturePatch) => Promise<void>;
  onClose: () => void;
}>(function MediaEditor(props, ref) {
  const c = props.capture;
  const kind = c.kind === 'video' ? 'video' : c.kind === 'voice' ? 'voice' : 'photo';
  const insets = useSafeAreaInsets();
  const uri = useMediaUri(c);
  const [s, setS] = useState<Session>(() => openSession(kind, { edit: c.edit ?? null, caption: c.caption ?? null, caption_y: c.caption_y ?? null }, props.initialTool));
  // The latest trim, for the preview's time updates.
  const trimRef = useRef(s.edit.trim);
  useEffect(() => {
    trimRef.current = s.edit.trim;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(() => !c.caption && props.initialTool === 'text');
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const [baker, bakers] = useBaker();
  const photoSize = useNaturalSize(kind === 'photo' ? uri : null);
  const player = useVideoPlayer(kind === 'video' ? uri : null, (p) => {
    p.loop = false;
    p.muted = true;
    p.timeUpdateEventInterval = 0.1;
  });
  const videoSize = useVideoSize(player, kind === 'video' ? uri : null);
  const size = kind === 'photo' ? photoSize : videoSize;
  // A voice memo previews through its own player: no picture, only the kept part (VT3).
  const voice = useAudioPlayer(kind === 'voice' ? (uri ?? undefined) : undefined, { updateInterval: 100 });
  const voiceStatus = useAudioPlayerStatus(voice);
  // A memo with no length on record is measured by its file (audit 3, 4).
  const durationMs = kind === 'voice' ? wholeMs(c.body, (voiceStatus.duration || 0) * 1000) : Number(c.body) || 0;
  // The press that restarts the preview names the position it left: until it moves, that is not the end (audit 2).
  const [restartedFrom, setRestartedFrom] = useState<number | null>(null);

  const save = async (patch: CapturePatch) => {
    setSaving(true);
    setError(null);
    try {
      await props.onSave(patch);
    } catch {
      setError('The edits could not be saved');
      setSaving(false);
      return;
    }
    // The small copy shows the edits, not the caption (ME20); never worth failing the save over.
    if (kind === 'photo' && uri) {
      try {
        const baked = await bakers.bake(uri, { edit: patch.edit ?? null, caption: null, captionY: null }, { maxLong: THUMB.edge });
        const path = await keepEditedThumb(c, baked, patch.edit ?? null);
        const old = c.thumb_path;
        if (path !== old) {
          await props.onSave({ thumb_path: path });
          // The copy it replaced, under its own name, goes (best effort).
          if (old && old !== THUMB.none) void removeMedia([old]).catch(() => {});
        }
      } catch {
        // The old copy stays; the photo itself shows the edits.
      }
    }
    // A video's still is taken again where the new kept part starts, with its crop and rotation (VS6), only when
    // the trim, crop or turn moved (audit 8), on the thumbs shell's queue after the editor closes (audit 6): it
    // replaces the still stored now, read fresh (audit 3), or drops it if none can be made (audit 9).
    const nextEdit = patch.edit === undefined ? c.edit : patch.edit;
    if (kind === 'video' && stillChanged(c.edit, nextEdit)) void thumbs.remake(c.id, c.piece_id, nextEdit ?? null);
    props.onClose();
  };

  const dispatch = (e: SessionEvent) => {
    if (saving) return;
    const r = step(s, e);
    setS(r.state);
    if (r.effect?.type === 'close') props.onClose();
    else if (r.effect?.type === 'save') void save({ edit: r.effect.saved.edit, caption: r.effect.saved.caption, caption_y: r.effect.saved.caption_y });
  };

  useImperativeHandle(ref, () => ({ requestClose: () => dispatch({ type: 'close' }) }));

  // The trim preview plays only the kept part.
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const t = trimRef.current;
    if (t && player.playing && currentTime >= t.end_ms / 1000) player.pause();
  });

  const edit = s.edit;
  // The preview stops at the end handle (VT3).
  const span = voiceSpan(edit.trim, durationMs);
  const restarting = restartedFrom !== null && voiceStatus.currentTime === restartedFrom;
  const voiceAtEnd = kind === 'voice' && voiceStatus.playing && voiceReachedEnd(voiceStatus.currentTime, span, restarting);
  useEffect(() => {
    if (voiceAtEnd) pauseAudio(voice);
  }, [voiceAtEnd, voice]);
  const cropping = s.tool === 'crop';
  // Cropping shows the whole turned picture with the frame over it; every other tool shows the result.
  const stageEdit: MediaEdit = cropping ? { ...edit, crop: null } : edit;
  const shown = size ? (cropping ? rotatedSize(size.w, size.h, edit.rotate) : editedSize(size.w, size.h, edit)) : null;
  const rect = fitRect(box, shown);
  const empty = !edit.rotate && !edit.crop && edit.filter === 'original' && !edit.strokes.length && !edit.trim && !s.caption.trim();

  const top = (
    <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
      <Pressable testID="edit-close" accessibilityRole="button" accessibilityLabel="Close" onPress={() => dispatch({ type: 'close' })} style={styles.roundBtn} hitSlop={8}>
        <Icon name="close" size={24} color={theme.ink} />
      </Pressable>
      <View style={styles.topMid}>
        {s.tool === 'draw' && (
          <>
            <Pressable testID="edit-undo" accessibilityRole="button" accessibilityLabel="Undo" accessibilityState={{ disabled: !s.past.length }} disabled={!s.past.length} onPress={() => dispatch({ type: 'undo' })} style={[styles.iconBtn, !s.past.length && styles.dim]} hitSlop={6}>
              <Icon name="arrow-undo" size={22} color="#ffffff" />
            </Pressable>
            <Pressable testID="edit-redo" accessibilityRole="button" accessibilityLabel="Redo" accessibilityState={{ disabled: !s.future.length }} disabled={!s.future.length} onPress={() => dispatch({ type: 'redo' })} style={[styles.iconBtn, !s.future.length && styles.dim]} hitSlop={6}>
              <Icon name="arrow-redo" size={22} color="#ffffff" />
            </Pressable>
          </>
        )}
        <Pressable testID="edit-revert" accessibilityRole="button" accessibilityLabel="Revert to original" accessibilityState={{ disabled: empty }} disabled={empty} onPress={() => dispatch({ type: 'revert' })} style={[styles.textBtn, empty && styles.dim]} hitSlop={6}>
          <Text style={styles.textBtnText}>Revert</Text>
        </Pressable>
      </View>
      <Pressable testID="edit-done" accessibilityRole="button" accessibilityLabel="Done" accessibilityState={{ busy: saving }} onPress={() => dispatch({ type: 'done' })} style={styles.doneBtn} hitSlop={8}>
        {saving ? <ActivityIndicator color={theme.ink} /> : <Text style={styles.doneText}>Done</Text>}
      </Pressable>
    </View>
  );

  const stage = (
    <View style={styles.stage} onLayout={(e) => setBox(e.nativeEvent.layout)} testID="edit-stage" {...webData({ edit: JSON.stringify(edit), tool: s.tool })}>
      {kind === 'voice' && (
        <View style={styles.voiceCard} testID="voice-card">
          <Icon name="mic" size={40} color="#ffffff" />
          <Text style={styles.hint}>Voice memo</Text>
        </View>
      )}
      {rect && size && (
        <View style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height, overflow: 'hidden' }} pointerEvents="none">
          {kind === 'photo' ? (
            <EditedPicture uri={uri} W={size.w} H={size.h} edit={stageEdit} width={rect.width} height={rect.height} />
          ) : (
            <VideoPicture player={player} W={size.w} H={size.h} edit={stageEdit} width={rect.width} height={rect.height} />
          )}
        </View>
      )}
      {rect && size && cropping && (
        <CropFrame
          rect={rect}
          crop={cropToRotated(edit.crop, edit.rotate)}
          ratio={aspectRatio(s.aspect)}
          onChange={(r) => dispatch({ type: 'crop', crop: cropFromRotated(r, edit.rotate) })}
        />
      )}
      {rect && size && s.tool === 'draw' && (
        <DrawLayer
          rect={rect}
          W={size.w}
          H={size.h}
          edit={edit}
          tool={s.pen.tool}
          color={s.pen.color}
          size={s.pen.tool === 'marker' ? s.pen.size.marker : s.pen.size.pen}
          full={s.full}
          onStroke={(stroke) => dispatch({ type: 'stroke', stroke })}
          onErase={(indexes) => dispatch({ type: 'erase', indexes })}
        />
      )}
      {rect && s.tool === 'text' && (
        <CaptionField rect={rect} text={s.caption} y={s.captionY} editing={typing} onEditing={setTyping} onChange={(text, y) => dispatch({ type: 'caption', text, y })} />
      )}
      {rect && !cropping && s.tool !== 'text' && s.caption.trim() ? <CaptionBar text={s.caption.trim()} y={s.captionY} rect={rect} /> : null}
    </View>
  );

  // A choice among several is a radio, so the web says which is chosen (media-editing audit 11); an action is a button.
  const chip = (testID: string, label: string, on: boolean, onPress: () => void, icon?: IconName, choice = false) => (
    <Pressable
      key={testID}
      testID={testID}
      accessibilityRole={choice ? 'radio' : 'button'}
      accessibilityLabel={label}
      {...(choice ? { 'aria-checked': on } : {})}
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
      hitSlop={4}
    >
      {icon && <Icon name={icon} size={18} color={on ? theme.ink : '#ffffff'} />}
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );

  const controls = (() => {
    if (s.tool === 'crop') {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {chip('edit-rotate', 'Rotate', false, () => dispatch({ type: 'rotate' }), 'refresh')}
          {ASPECTS.map((a) => chip(`edit-aspect-${a.id}`, a.label, s.aspect === a.id, () => size && dispatch({ type: 'aspect', aspect: a.id, W: size.w, H: size.h }), undefined, true))}
          {chip('edit-crop-reset', 'Reset', false, () => dispatch({ type: 'resetCrop' }))}
        </ScrollView>
      );
    }
    if (s.tool === 'filter' && kind === 'photo' && uri && size) {
      return <FilterStrip uri={uri} W={size.w} H={size.h} edit={edit} onPick={(id) => dispatch({ type: 'filter', id })} />;
    }
    if (s.tool === 'draw') {
      const sizeNow = s.pen.tool === 'marker' ? s.pen.size.marker : s.pen.size.pen;
      return (
        <View style={styles.drawControls}>
          {s.full && (
            <Text style={styles.hint} accessibilityLiveRegion="polite">
              {FULL_LINES_TEXT}
            </Text>
          )}
          {s.pen.sizesOpen && s.pen.tool !== 'eraser' && (
            <View style={styles.row} testID="pen-sizes">
              {SIZE_LABELS.map((l, i) => chip(`edit-size-${i}`, l, sizeNow === i, () => dispatch({ type: 'penSize', size: i }), undefined, true))}
            </View>
          )}
          <View style={styles.row}>
            {DRAW_TOOLS.map((t) =>
              chip(`edit-pen-${t.id}`, t.label, s.pen.tool === t.id, () => dispatch({ type: 'penTool', tool: t.id }), t.icon, true),
            )}
          </View>
          <View style={styles.row}>
            {PEN_COLORS.map((p) => {
              const on = s.pen.color === p.id && s.pen.tool !== 'eraser';
              return (
                <Pressable
                  key={p.id}
                  testID={`edit-color-${p.id}`}
                  accessibilityRole="radio"
                  accessibilityLabel={p.label}
                  aria-checked={on}
                  onPress={() => dispatch({ type: 'penColor', color: p.id })}
                  style={[styles.swatchRing, on && styles.swatchRingOn]}
                  hitSlop={4}
                >
                  <View style={[styles.swatch, { backgroundColor: p.hex }]} />
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }
    if (s.tool === 'text') {
      return (
        <View style={styles.row}>
          <Text style={styles.hint}>{s.caption ? 'Drag the caption to move it' : 'Add a caption to this moment'}</Text>
          {chip('caption-toggle', s.caption ? 'Edit text' : 'Add text', false, () => setTyping(true), 'text')}
        </View>
      );
    }
    if (s.tool === 'trim' && kind === 'voice') {
      return (
        <View style={styles.trimRow}>
          <TrimBar
            durationMs={durationMs}
            trim={edit.trim}
            onChange={(start, end) => dispatch({ type: 'trim', start, end, duration: durationMs })}
            onSeek={(ms) => {
              pauseAudio(voice);
              seekAudio(voice, ms / 1000);
            }}
          />
          <Text testID="trim-whole" style={styles.hint}>{`of ${formatElapsed(durationMs)}`}</Text>
          {chip('trim-play', voiceStatus.playing ? 'Pause' : 'Play kept part', false, () => {
            if (voiceStatus.playing) {
              pauseAudio(voice);
              return;
            }
            setRestartedFrom(voiceStatus.currentTime);
            seekAudio(voice, span.startMs / 1000);
            playAudio(voice);
          }, 'play')}
        </View>
      );
    }
    if (s.tool === 'trim' && kind === 'video') {
      const dur = durationMs || Math.round((player.duration || 0) * 1000);
      return (
        <View style={styles.trimRow}>
          <TrimBar
            durationMs={dur}
            trim={edit.trim}
            onChange={(start, end) => dispatch({ type: 'trim', start, end, duration: dur })}
            onSeek={(ms) => {
              player.pause();
              seekTo(player, ms / 1000);
            }}
          />
          {chip('trim-play', player.playing ? 'Pause' : 'Play kept part', false, () => {
            if (player.playing) {
              player.pause();
              return;
            }
            seekTo(player, (edit.trim?.start_ms ?? 0) / 1000);
            player.play();
          }, 'play')}
        </View>
      );
    }
    return null;
  })();

  const body = (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.screen, props.overlay && StyleSheet.absoluteFill]} testID="media-editor">
      {/* The baker draws behind everything; the screen's own background hides it. */}
      {baker}
      <View style={[StyleSheet.absoluteFill, styles.screenBg]} pointerEvents="none" />
      {top}
      {stage}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        {s.confirming ? (
          <View style={styles.confirm} accessibilityLiveRegion="polite">
            <Text style={styles.hint}>Discard these edits?</Text>
            <View style={styles.row}>
              <Button testID="edit-keep" label="Keep editing" variant="secondary" onPress={() => dispatch({ type: 'keepEditing' })} />
              <Button testID="edit-discard" label="Discard" variant="danger" onPress={() => dispatch({ type: 'discard' })} />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.controls}>{controls}</View>
            <View style={styles.tools} accessibilityRole="tablist">
              {TOOLS[kind].map((t) => {
                const on = s.tool === t;
                return (
                  <Pressable
                    key={t}
                    testID={`edit-tool-${t}`}
                    accessibilityRole="tab"
                    accessibilityLabel={TOOL_META[t].label}
                    aria-selected={on}
                    onPress={() => {
                      dispatch({ type: 'tool', tool: t });
                      // Text with no caption yet goes straight to typing one.
                      if (t === 'text' && !s.caption) setTyping(true);
                    }}
                    style={styles.tool}
                    hitSlop={4}
                  >
                    <Icon name={TOOL_META[t].icon} size={24} color={on ? '#ffd60a' : '#ffffff'} />
                    <Text style={[styles.toolText, on && styles.toolTextOn]}>{TOOL_META[t].label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
  if (props.overlay) return body;
  return (
    <Modal visible animationType="fade" onRequestClose={() => dispatch({ type: 'close' })}>
      {body}
    </Modal>
  );
});

const styles = StyleSheet.create({
  // A drag on the web must never start a text selection: react-native-web ends the gesture on one.
  screen: { flex: 1, ...(Platform.OS === 'web' ? ({ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as object) : {}) },
  screenBg: { backgroundColor: '#14181f' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  topMid: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  textBtn: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  textBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  doneBtn: { minHeight: 44, minWidth: 72, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#ffd60a', alignItems: 'center', justifyContent: 'center' },
  doneText: { color: theme.ink, fontSize: 16, fontWeight: '800' },
  dim: { opacity: 0.4 },
  stage: { flex: 1 },
  voiceCard: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 8 },
  bottom: { paddingTop: 10, gap: 10 },
  controls: { minHeight: 56, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, flexWrap: 'wrap' },
  drawControls: { gap: 10 },
  trimRow: { gap: 10, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)' },
  chipOn: { backgroundColor: '#ffffff' },
  chipText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  chipTextOn: { color: theme.ink },
  swatchRing: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchRingOn: { borderColor: '#ffffff' },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  tools: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8 },
  tool: { alignItems: 'center', gap: 2, minWidth: 64, minHeight: 48, justifyContent: 'center' },
  toolText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  toolTextOn: { color: '#ffd60a' },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center' },
  error: { color: '#ff8a80', fontSize: 14, textAlign: 'center' },
  confirm: { gap: 10, alignItems: 'center', paddingVertical: 8 },
});
