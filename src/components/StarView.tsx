import { StyleSheet, Text, View } from 'react-native';
import type { Star } from '../lib/places';
import { starEnter } from '../lib/enter';
import { Enter, useOwnEnter } from './Enter';
import { Icon } from './icons';
import { theme } from './ui';

/** Every star is this size, whatever its walks (criterion 14): a star marks "walked here", not how much. */
export const STAR_SIZE = 36;
/** At most this many stars carry their name, the busiest first, so the map stays readable. */
export const NAMED_STARS = 8;
const NAME_WIDTH = 140;

/** The ids of the stars that show their name: the busiest NAMED_STARS single places. */
export function namedStars(stars: Star[]): Set<string> {
  return new Set(
    stars
      .filter((s) => s.count === 1)
      .sort((a, b) => b.walkIds.length - a.walkIds.length || a.label.localeCompare(b.label))
      .slice(0, NAMED_STARS)
      .map((s) => s.id),
  );
}

/**
 * A place walked, on the home map: a star, or for places merged at this
 * zoom, their count beside a small star (so it never reads as a group of
 * capture pins). The selected one is ringed; the busiest carry their name.
 */
const ownStar = (prev: boolean, next: boolean) => starEnter(prev, next);

/** `enter` is the map's call on web; without it the view notices its own selection (native). M9. */
export function StarView({ star, selected, named, enter }: { star: Star; selected?: boolean; named?: boolean; enter?: 'bounce' | null }) {
  const own = useOwnEnter(!!selected, ownStar);
  const kind = enter === undefined ? own : enter;
  const head = (
    <View style={[styles.star, selected && styles.selected]}>
        {star.count > 1 ? (
          <View style={styles.merged}>
            <Icon name="star" size={11} color="#ffffff" />
            <Text style={styles.count}>{star.count}</Text>
          </View>
        ) : (
          <Icon name="star" size={18} color="#ffffff" />
        )}
    </View>
  );
  return (
    <View style={styles.wrap} pointerEvents="none">
      {kind === 'bounce' ? <Enter kind="bounce">{head}</Enter> : head}
      {named && (
        <Text style={styles.name} numberOfLines={1}>
          {star.label}
        </Text>
      )}
    </View>
  );
}

export function starLabel(star: Star): string {
  const walks = `${star.walkIds.length} ${star.walkIds.length === 1 ? 'walk' : 'walks'}`;
  return star.count > 1 ? `${star.count} places, ${walks}, zoom in` : `${star.label}, ${walks}`;
}

const styles = StyleSheet.create({
  // The star's own box is what the marker centers on; the name hangs below it.
  wrap: { width: STAR_SIZE, height: STAR_SIZE, alignItems: 'center', overflow: 'visible' },
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
  selected: { borderWidth: 3, borderColor: theme.ink },
  merged: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  count: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  // Centered under the star, wider than it. maxWidth too: on the web a one-line
  // Text is otherwise held to its parent's width, the 36 px star.
  name: {
    position: 'absolute', top: STAR_SIZE + 2, left: (STAR_SIZE - NAME_WIDTH) / 2, width: NAME_WIDTH, maxWidth: NAME_WIDTH, textAlign: 'center',
    fontSize: 13, fontWeight: '600', color: theme.ink,
    textShadowColor: '#ffffff', textShadowRadius: 2, textShadowOffset: { width: 0, height: 0 },
  },
});
