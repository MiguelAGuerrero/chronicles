import { StyleSheet, Text, View } from 'react-native';
import type { Star } from '../lib/places';
import { starSpoken } from '../lib/quietLines';
import { starEnter } from '../lib/enter';
import { Enter, useOwnEnter } from './Enter';
import { Icon } from './icons';
import { theme } from './ui';

/** Every star is this size, whatever its walks (criterion 14): a star marks "walked here", not how much. */
export const STAR_SIZE = 36;
/** At most this many stars carry their name, the busiest first, so the map stays readable. */
export const NAMED_STARS = 8;
const NAME_WIDTH = 140;
/** The selected star's ring, outside its white edge (tend places audit 1). */
const RING = 3;

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
 * A place walked, on the home map: a white star on an ink disc (tend places
 * T15, decision 0154: ink, never the accent), the same for places merged at
 * this zoom, which draw no numeral (their spoken name says how many, in words).
 * The selected one keeps its disc and gains an ink ring outside its white edge
 * (ink, white, ink: filled stays chosen, tend places audit 1); the busiest carry
 * their name.
 */
const ownStar = (prev: boolean, next: boolean) => starEnter(prev, next);

/** `enter` is the map's call on web; without it the view notices its own selection (native). M9. */
export function StarView({ star, selected, named, enter }: { star: Star; selected?: boolean; named?: boolean; enter?: 'bounce' | null }) {
  const own = useOwnEnter(!!selected, ownStar);
  const kind = enter === undefined ? own.kind : enter;
  const head = (
    <View style={styles.head}>
      {selected && <View testID="star-ring" style={styles.ring} />}
      <View testID="star-disc" style={styles.star}>
        <Icon name="star" size={18} color="#ffffff" />
      </View>
    </View>
  );
  return (
    <View style={styles.wrap} pointerEvents="none">
      {kind === 'bounce' ? (
        <Enter key={own.n} kind="bounce">
          {head}
        </Enter>
      ) : (
        head
      )}
      {named && (
        <Text style={styles.name}>
          {star.label}
        </Text>
      )}
    </View>
  );
}

/** Its spoken name, the counts in words (`starSpoken`, tend places T15). */
export const starLabel = starSpoken;

const styles = StyleSheet.create({
  // The star's own box is what the marker centers on; the name hangs below it.
  wrap: { width: STAR_SIZE, height: STAR_SIZE, alignItems: 'center', overflow: 'visible' },
  head: { width: STAR_SIZE, height: STAR_SIZE, overflow: 'visible' },
  star: {
    width: STAR_SIZE,
    height: STAR_SIZE,
    borderRadius: STAR_SIZE / 2,
    backgroundColor: theme.ink,
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
  // Selected: an ink ring behind the disc, showing RING past its white edge (tend places audit 1).
  ring: {
    position: 'absolute', left: -RING, top: -RING, width: STAR_SIZE + 2 * RING, height: STAR_SIZE + 2 * RING,
    borderRadius: STAR_SIZE / 2 + RING, backgroundColor: theme.ink,
  },
  // Centered under the star, wider than it. maxWidth too: on the web a one-line
  // Text is otherwise held to its parent's width, the 36 px star.
  name: {
    position: 'absolute', top: STAR_SIZE + 2, left: (STAR_SIZE - NAME_WIDTH) / 2, width: NAME_WIDTH, maxWidth: NAME_WIDTH, textAlign: 'center',
    fontSize: 13, fontWeight: '600', color: theme.ink,
    textShadowColor: '#ffffff', textShadowRadius: 2, textShadowOffset: { width: 0, height: 0 },
  },
});
