import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CapturePin } from '../lib/pins';
import { COLORS } from './map/types';
import { Enter } from './Enter';
import { Icon, KIND_ICON, KIND_LABEL } from './icons';

/** A neutral for pins holding several kinds, distinct from the trace's navy. */
const MIXED = '#3f3f46';

const PIN_COLOR: Record<CapturePin['kind'], string> = {
  photo: COLORS.photo,
  video: COLORS.video,
  voice: COLORS.voice,
  text: COLORS.text,
  mixed: MIXED,
};

/** Height of the pin view; it is anchored at its bottom, the point it marks. */
export const PIN_HEIGHT = 44;

/**
 * A capture's marker on the map: a head with its kind's icon (or, for several
 * captures, their count) on a short stem, so the point it marks, and the
 * walker's dot there, stay visible beneath it.
 */
export function CapturePinView({ pin, faint = false, drop: dropNow = false }: { pin: CapturePin; faint?: boolean; drop?: boolean }) {
  // Kept from mount, so a later render can't cut the drop short.
  const [drop] = useState(dropNow);
  const n = pin.captures.length;
  const color = n > 1 ? (pin.kind === 'mixed' ? MIXED : PIN_COLOR[pin.kind]) : PIN_COLOR[pin.kind];
  const view = (
    // A memory from an earlier walk: the same round pin, smaller and faded (MR3), with a clock (MR10).
    <View style={[styles.wrap, faint && styles.faint]} pointerEvents="none">
      <View style={[styles.head, { backgroundColor: color }]}>
        {n > 1 ? <Text style={styles.count}>{n}</Text> : <Icon name={KIND_ICON[pin.kind]} size={18} color="#ffffff" />}
        {faint && (
          <View testID="memory-badge" style={styles.badge}>
            <Icon name="time" size={12} color="#1d2430" />
          </View>
        )}
      </View>
      <View style={[styles.stem, { backgroundColor: color }]} />
    </View>
  );
  // A capture just taken drops into place (M10).
  return drop ? <Enter kind="drop">{view}</Enter> : view;
}

export function pinLabel(pin: CapturePin, interactive = true, memory = false): string {
  const n = pin.captures.length;
  const what = memory
    ? n > 1 ? `${n} memories here` : `Memory: ${KIND_LABEL[pin.captures[0].kind]}`
    : n > 1 ? `${n} captures here` : KIND_LABEL[pin.captures[0].kind];
  return interactive ? `${what}. Open` : what;
}

const styles = StyleSheet.create({
  wrap: { width: 36, height: PIN_HEIGHT, alignItems: 'center' },
  // Shrunk toward the stem's foot, so it still marks its point (audit 7).
  faint: { opacity: 0.55, transform: [{ scale: 0.75 }], transformOrigin: 'bottom' },
  badge: {
    position: 'absolute', right: -7, top: -7, width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  head: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  stem: { width: 3, height: 8, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  count: { color: '#ffffff', fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
