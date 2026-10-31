import { useEffect, useRef, useState } from 'react';
import {
  Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View,
  type GestureResponderEvent, type LayoutRectangle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Capture } from '../lib/types';
import { useMediaUri } from '../lib/useMediaUri';
import { Icon } from './icons';
import { Button, theme } from './ui';

export const CAPTION_MAX = 120;
const DEFAULT_Y = 0.75;
/** The bar's height relative to the photo's, so it scales the same on screen and when baked into a file. */
export const CAPTION_BAR = { heightFrac: 0.085, fontFrac: 0.042 };

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
  const h = Math.max(36, props.rect.height * CAPTION_BAR.heightFrac);
  const top = props.rect.y + clamp(props.y, 0, 1) * props.rect.height - h / 2;
  return (
    <View
      pointerEvents="none"
      style={[styles.bar, { left: props.rect.x, width: props.rect.width, top: Math.max(props.rect.y, Math.min(top, props.rect.y + props.rect.height - h)), minHeight: h }]}
      accessible
      accessibilityLabel={`Caption: ${props.text}`}
    >
      <Text style={[styles.barText, { fontSize: Math.max(15, props.rect.height * CAPTION_BAR.fontFrac) }]}>{props.text}</Text>
    </View>
  );
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * The opt-in caption editor: the photo with an "Aa" bar to type into and drag
 * up or down. Saving with an empty caption removes it.
 */
export function CaptionEditor(props: {
  capture: Capture | null;
  onSave: (caption: string | null, y: number) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = props.capture;
  const uri = useMediaUri(c);
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const rect = usePhotoRect(uri, box);
  const [text, setText] = useState(c?.caption ?? '');
  const [y, setY] = useState(c?.caption_y ?? DEFAULT_Y);
  const [editing, setEditing] = useState(!c?.caption);
  // Dragging the bar moves it up and down the photo.
  const drag = useRef({ pageY: 0, y: 0 });
  const dragProps = {
    onStartShouldSetResponder: () => !editing,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      drag.current = { pageY: e.nativeEvent.pageY, y };
    },
    onResponderMove: (e: GestureResponderEvent) => {
      if (rect) setY(clamp(drag.current.y + (e.nativeEvent.pageY - drag.current.pageY) / rect.height, 0.06, 0.94));
    },
  };
  if (!c) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={props.onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <View style={styles.stage} onLayout={(e) => setBox(e.nativeEvent.layout)}>
          {uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel="Photo" />}
          {rect && (text || editing) && (
            <View
              {...dragProps}
              style={[
                styles.bar,
                {
                  left: rect.x,
                  width: rect.width,
                  top: rect.y + y * rect.height - Math.max(36, rect.height * CAPTION_BAR.heightFrac) / 2,
                  minHeight: Math.max(36, rect.height * CAPTION_BAR.heightFrac),
                },
              ]}
            >
              {editing ? (
                <TextInput
                  testID="caption-input"
                  autoFocus
                  value={text}
                  onChangeText={setText}
                  onBlur={() => setEditing(false)}
                  onSubmitEditing={() => setEditing(false)}
                  returnKeyType="done"
                  maxLength={CAPTION_MAX}
                  placeholder="Add a caption"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  accessibilityLabel="Caption"
                  style={[styles.barText, styles.input, { fontSize: Math.max(15, rect.height * CAPTION_BAR.fontFrac) }]}
                />
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel={`Caption: ${text}. Edit`} onPress={() => setEditing(true)}>
                  <Text style={[styles.barText, { fontSize: Math.max(15, rect.height * CAPTION_BAR.fontFrac) }]}>{text}</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        <View style={[styles.top, { top: insets.top + 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close without saving" onPress={props.onClose} style={styles.roundBtn} hitSlop={8}>
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
          <Text style={styles.hint}>{text ? 'Drag the caption to move it' : 'Tap Aa to add a caption'}</Text>
          <Button testID="caption-save" label="Done" onPress={() => props.onSave(text.trim() || null, y)} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#14181f' },
  stage: { flex: 1 },
  bar: {
    position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6,
  },
  barText: { color: '#ffffff', fontWeight: '600', textAlign: 'center' },
  input: { padding: 0, margin: 0 },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  roundBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  aa: { fontSize: 18, fontWeight: '800', color: theme.ink },
  bottom: { paddingHorizontal: 16, paddingTop: 12, gap: 10, alignItems: 'center' },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
});
