import { StyleSheet, Text, View } from 'react-native';
import type { Star } from '../lib/places';
import { Icon } from './icons';
import { theme } from './ui';

/** Every star is this size, whatever its walks (criterion 14): a star marks "walked here", not how much. */
export const STAR_SIZE = 36;

/** A place walked, on the home map: a star, or a count when nearby places merged. */
export function StarView({ star }: { star: Star }) {
  return (
    <View style={styles.star} pointerEvents="none">
      {star.count > 1 ? <Text style={styles.count}>{star.count}</Text> : <Icon name="star" size={18} color="#ffffff" />}
    </View>
  );
}

export function starLabel(star: Star): string {
  const walks = `${star.walkIds.length} ${star.walkIds.length === 1 ? 'walk' : 'walks'}`;
  return star.count > 1 ? `${star.count} places, ${walks}. Open` : `${star.label}, ${walks}. Open`;
}

const styles = StyleSheet.create({
  star: {
    width: STAR_SIZE,
    height: STAR_SIZE,
    borderRadius: STAR_SIZE / 2,
    backgroundColor: theme.accent,
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
  count: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});
