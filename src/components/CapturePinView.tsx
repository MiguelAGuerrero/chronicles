import { StyleSheet, Text, View } from 'react-native';
import type { CapturePin } from '../lib/pins';
import { COLORS } from './map/types';
import { Icon, KIND_ICON } from './icons';

const PIN_COLOR: Record<CapturePin['kind'], string> = {
  photo: COLORS.photo,
  voice: COLORS.voice,
  text: COLORS.text,
  mixed: COLORS.trace,
};

/** A capture's marker on the map: its kind's icon, with a count when several share it. */
export function CapturePinView({ pin }: { pin: CapturePin }) {
  return (
    <View style={[styles.pin, { backgroundColor: PIN_COLOR[pin.kind] }]}>
      <Icon name={KIND_ICON[pin.kind]} size={18} color="#ffffff" />
      {pin.captures.length > 1 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pin.captures.length}</Text>
        </View>
      )}
    </View>
  );
}

export function pinLabel(pin: CapturePin): string {
  const n = pin.captures.length;
  if (n > 1) return `${n} captures here. Open`;
  return { photo: 'Photo', voice: 'Voice memo', text: 'Note' }[pin.captures[0].kind] + '. Open';
}

const styles = StyleSheet.create({
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#1d2430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
});
