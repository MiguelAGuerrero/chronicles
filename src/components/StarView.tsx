import { StyleSheet, Text, View } from 'react-native';
import { starGlyphs, type Star } from '../lib/places';
import { starSpoken } from '../lib/quietLines';
import { starEnter } from '../lib/enter';
import { Enter, useOwnEnter } from './Enter';
import { Icon } from './icons';
import { theme } from './ui';

/** Every star is this size, whatever its walks (criterion 14): a star marks "walked here", not how much. */
export const STAR_SIZE = 36;
/** At most this many stars carry their name, the fullest first, so the map stays readable. */
export const NAMED_STARS = 8;
const NAME_WIDTH = 140;
/** The selected star's ring, outside its white edge (tend places audit 1). */
const RING = 3;
/** Each of a merged star's two stars (decision 0172, O14). */
const GLYPH = 14;

/** The ids of the stars that show their name: the fullest NAMED_STARS single places. */
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
 * T15, decision 0154: ink, never the accent); places merged at this zoom draw
 * two stars fanned in the same disc and no numeral (decision 0172, O14; their
 * spoken name says how many, in words).
 * The selected one keeps its disc and gains an ink ring outside its white edge
 * (ink, white, ink: filled stays chosen, tend places audit 1); the fullest carry
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
        {starGlyphs(star) === 2 ? (
          // Places merged at this zoom: two stars fanned in the one disc, top left to bottom right, as a pin of several
          // fans its kinds (decision 0172, O14).
          <>
            <View testID="star-glyph" style={[styles.glyph, styles.glyphBack]}>
              <Icon name="star" size={GLYPH} color="#ffffff" />
            </View>
            <View testID="star-glyph" style={[styles.glyph, styles.glyphFront]}>
              <Icon name="star" size={GLYPH} color="#ffffff" />
            </View>
          </>
        ) : (
          <Icon name="star" size={18} color="#ffffff" />
        )}
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
  // A merged star's two stars, inside the disc's 2 pt white edge: back at the top left, front at the bottom right, each
  // turned a little, as a pin of several's kinds are (tend map T14).
  glyph: { position: 'absolute', width: GLYPH, height: GLYPH, alignItems: 'center', justifyContent: 'center' },
  glyphBack: { left: 3, top: 3, transform: [{ rotate: '-12deg' }] },
  glyphFront: { right: 3, bottom: 3, transform: [{ rotate: '12deg' }] },
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
