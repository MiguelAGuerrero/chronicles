import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, type GestureResponderEvent, type LayoutRectangle } from 'react-native';
import { typingFontSize } from '../lib/captionInput';

export const CAPTION_MAX = 80;
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
 * The Text tool's bar (ME13): the caption over the edited picture shown in
 * `rect`, typed into in place and dragged up or down. While typing it never
 * moves, so placing the cursor never drags it.
 */
export function CaptionField(props: {
  rect: LayoutRectangle;
  text: string;
  y: number;
  editing: boolean;
  onEditing: (on: boolean) => void;
  onChange: (text: string, y: number) => void;
}) {
  const { rect, text, y, editing } = props;
  const m = captionMetrics(rect.width);
  const [barH, setBarH] = useState(0);
  const drag = useRef({ pageY: 0, y: 0 });
  const latest = useRef({ text, y, rectH: rect.height, onChange: props.onChange });
  useEffect(() => {
    latest.current = { text, y, rectH: rect.height, onChange: props.onChange };
  });
  const step = (d: number) => props.onChange(text, clamp(y + d, 0.06, 0.94));
  const dragProps = {
    onStartShouldSetResponder: () => !editing,
    onMoveShouldSetResponder: () => !editing,
    onResponderGrant: (e: GestureResponderEvent) => {
      drag.current = { pageY: e.nativeEvent.pageY, y: latest.current.y };
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const l = latest.current;
      l.onChange(l.text, clamp(drag.current.y + (e.nativeEvent.pageY - drag.current.pageY) / l.rectH, 0.06, 0.94));
    },
  };
  if (!text && !editing) return null;
  return (
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
        else props.onEditing(true);
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
          onChangeText={(t) => props.onChange(t.replace(/\n/g, ' '), y)}
          onBlur={() => props.onEditing(false)}
          onSubmitEditing={() => props.onEditing(false)}
          returnKeyType="done"
          maxLength={CAPTION_MAX}
          placeholder="Add a caption"
          placeholderTextColor="rgba(255,255,255,0.7)"
          accessibilityLabel="Caption"
          style={[styles.barText, styles.input, { fontSize: typingFontSize(m.fontSize), lineHeight: Math.max(m.lineHeight, typingFontSize(m.fontSize) * (m.lineHeight / m.fontSize)) }]}
        />
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={`Caption: ${text}. Edit`} onPress={() => props.onEditing(true)}>
          <Text style={[styles.barText, { fontSize: m.fontSize, lineHeight: m.lineHeight }]}>{text}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center',
  },
  barText: { color: '#ffffff', fontWeight: '600', textAlign: 'center' },
  input: { padding: 0, margin: 0 },
});
