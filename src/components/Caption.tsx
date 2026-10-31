import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, type GestureResponderEvent, type LayoutRectangle } from 'react-native';
import { Modal } from './Modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Capture } from '../lib/types';
import { useMediaUri } from '../lib/useMediaUri';
import { Icon } from './icons';
import { Button, theme } from './ui';

export const CAPTION_MAX = 80;
const DEFAULT_Y = 0.6;
/**
 * Caption type and padding as fractions of the photo's width, with no pixel
 * minimums, so the bar covers the same share of the photo on any screen and
 * in the saved file. The bakers use the same numbers.
 */
export const CAPTION_STYLE = { fontFrac: 0.045, lineFrac: 0.058, padYFrac: 0.02, padXFrac: 0.04 };

export function captionMetrics(photoWidth: number) {
  return {
    fontSize: photoWidth * CAPTION_STYLE.fontFrac,
    lineHeight: photoWidth * CAPTION_STYLE.lineFrac,
    padY: photoWidth * CAPTION_STYLE.padYFrac,
    padX: photoWidth * CAPTION_STYLE.padXFrac,
  };
}

/** Offset into the photo of a bar `h` tall, centered on `y` (0 top, 1 bottom) and kept inside the photo. */
export function captionTop(photoHeight: number, y: number, h: number): number {
  return Math.max(0, Math.min(clamp(y, 0, 1) * photoHeight - h / 2, photoHeight - h));
}

/**
 * Where a photo actually sits inside a box when shown with resizeMode
 * "contain": captions are placed against the photo, not the box, so they
 * land on the same spot at any screen size and when baked into the image.
 */
export function usePhotoRect(uri: string | null, box: LayoutRectangle | null): LayoutRectangle | null {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!uri) return;
    let alive = true;
    Image.getSize(uri, (w, h) => alive && setSize({ w, h }), () => {});
    return () => {
      alive = false;
    };
  }, [uri]);
  if (!size || !box || !box.width || !box.height) return null;
  const scale = Math.min(box.width / size.w, box.height / size.h);
  const width = size.w * scale;
  const height = size.h * scale;
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
}

/** The caption bar, drawn over a photo shown in `rect`: full photo width, translucent black, white text. */
export function CaptionBar(props: { text: string; y: number; rect: LayoutRectangle }) {
  const m = captionMetrics(props.rect.width);
  // Centered on y by its real height once measured; one line until then.
  const [h, setH] = useState(m.lineHeight + 2 * m.padY);
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setH(e.nativeEvent.layout.height)}
      style={[
        styles.bar,
        { left: props.rect.x, width: props.rect.width, top: props.rect.y + captionTop(props.rect.height, props.y, h), paddingVertical: m.padY, paddingHorizontal: m.padX },
      ]}
      accessible
      accessibilityLabel={`Caption: ${props.text}`}
    >
      <Text style={[styles.barText, { fontSize: m.fontSize, lineHeight: m.lineHeight }]}>{props.text}</Text>
    </View>
  );
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * The opt-in caption editor: the photo with an "Aa" bar to type into and drag
 * up or down. Saving with an empty caption removes it. As a `overlay` it
 * draws inside the screen it is on instead of opening a Modal: iOS cannot
 * present a second Modal over the capture viewer.
 */
export function CaptionEditor(props: {
  capture: Capture | null;
  onSave: (caption: string | null, y: number) => void;
  onClose: () => void;
  overlay?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const c = props.capture;
  const uri = useMediaUri(c);
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const rect = usePhotoRect(uri, box);
  const [text, setText] = useState(c?.caption ?? '');
  const [y, setY] = useState(c?.caption_y ?? DEFAULT_Y);
  const [editing, setEditing] = useState(!c?.caption);
  const [barH, setBarH] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const changed = text.trim() !== (c?.caption ?? '') || (!!text.trim() && y !== (c?.caption_y ?? DEFAULT_Y));
  // Every way out with changes asks first; nothing typed is lost by accident.
  const close = () => (changed ? setConfirming(true) : props.onClose());
  const step = (d: number) => setY((v) => clamp(v + d, 0.06, 0.94));
  // Dragging the bar moves it up and down the photo; not while typing, so
  // placing the cursor never moves it.
  const drag = useRef({ pageY: 0, y: 0 });
  const dragProps = {
    onStartShouldSetResponder: () => !editing,
    onMoveShouldSetResponder: () => !editing,
    onResponderGrant: (e: GestureResponderEvent) => {
      drag.current = { pageY: e.nativeEvent.pageY, y };
    },
    onResponderMove: (e: GestureResponderEvent) => {
      if (rect) setY(clamp(drag.current.y + (e.nativeEvent.pageY - drag.current.pageY) / rect.height, 0.06, 0.94));
    },
  };
  if (!c) return null;
  const m = rect ? captionMetrics(rect.width) : null;
  const body = (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.screen, props.overlay && StyleSheet.absoluteFill]}>
      <View style={styles.stage} onLayout={(e) => setBox(e.nativeEvent.layout)}>
        {uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel="Photo" />}
        {rect && m && (text || editing) && (
          <View
            {...dragProps}
            onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
            accessible={!editing}
            accessibilityRole="adjustable"
            accessibilityLabel={`Caption: ${text}`}
            accessibilityHint="Swipe up or down to move it. Double tap to edit."
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'increment') step(-0.1);
              else if (e.nativeEvent.actionName === 'decrement') step(0.1);
              else setEditing(true);
            }}
            style={[
              styles.bar,
              {
                left: rect.x,
                width: rect.width,
                top: rect.y + captionTop(rect.height, y, barH || m.lineHeight + 2 * m.padY),
                paddingVertical: m.padY,
                paddingHorizontal: m.padX,
              },
            ]}
          >
            {editing ? (
              <TextInput
                testID="caption-input"
                autoFocus
                multiline
                submitBehavior="blurAndSubmit"
                value={text}
                onChangeText={(t) => setText(t.replace(/\n/g, ' '))}
                onBlur={() => setEditing(false)}
                onSubmitEditing={() => setEditing(false)}
                returnKeyType="done"
                maxLength={CAPTION_MAX}
                placeholder="Add a caption"
                placeholderTextColor="rgba(255,255,255,0.7)"
                accessibilityLabel="Caption"
                style={[styles.barText, styles.input, { fontSize: m.fontSize, lineHeight: m.lineHeight }]}
              />
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel={`Caption: ${text}. Edit`} onPress={() => setEditing(true)}>
                <Text style={[styles.barText, { fontSize: m.fontSize, lineHeight: m.lineHeight }]}>{text}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.roundBtn} hitSlop={8}>
          <Icon name="close" size={24} color={theme.ink} />
        </Pressable>
        <Pressable
          testID="caption-toggle"
          accessibilityRole="button"
          accessibilityLabel={text ? 'Edit caption' : 'Add caption'}
          onPress={() => setEditing(true)}
          style={styles.roundBtn}
          hitSlop={8}
        >
          <Text style={styles.aa}>Aa</Text>
        </Pressable>
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {confirming ? (
          <View style={styles.confirm} accessibilityLiveRegion="polite">
            <Text style={styles.hint}>Discard this caption change?</Text>
            <View style={styles.confirmRow}>
              <Button testID="caption-keep" label="Keep editing" variant="secondary" onPress={() => setConfirming(false)} />
              <Button testID="caption-discard" label="Discard" variant="danger" onPress={props.onClose} />
            </View>
          </View>
        ) : (
          <>
            {!editing && <Text style={styles.hint}>{text ? 'Drag the caption to move it' : 'Tap Aa to add a caption'}</Text>}
            <Button testID="caption-save" label="Done" onPress={() => props.onSave(text.trim() || null, y)} />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
  if (props.overlay) return body;
  return (
    <Modal visible animationType="fade" onRequestClose={close}>
      {body}
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#14181f' },
  stage: { flex: 1 },
  bar: {
    position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center',
  },
  barText: { color: '#ffffff', fontWeight: '600', textAlign: 'center' },
  input: { padding: 0, margin: 0 },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  roundBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  aa: { fontSize: 18, fontWeight: '800', color: theme.ink },
  bottom: { paddingHorizontal: 16, paddingTop: 12, gap: 10, alignItems: 'center' },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  confirm: { gap: 10, alignItems: 'center' },
  confirmRow: { flexDirection: 'row', gap: 10 },
});
