import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { EnterKind } from '../lib/enter';
import { foundLabel } from '../lib/explore/foundFace';
import { choiceLabel } from '../lib/explore/placeOffer';
import type { MarkSpread } from '../lib/markNames';
import type { CaptureKind } from '../lib/types';
import { Enter } from './Enter';
import type { IconName } from './icons';
import { Icon, KIND_ICON } from './icons';

/** An explore mark on the map (E6-E8, E22): what the pin needs. */
export interface MarkPin {
  id: string;
  at: [number, number];
  /** Within 60 m once: the category icon and the name show (E7). */
  revealed: boolean;
  /** Found by a capture (E8): the icon, at any distance, with the glyph of the moment that found it. */
  found?: boolean;
  /** The kind of the kept moment that found it: its glyph (decision 0172, O26: never a tick) and its words; none until known. */
  foundKind?: CaptureKind;
  /** On the way, beyond your range (E22): a faint "?". */
  faint?: boolean;
  /** Its name would be written over another's (lib/markNames): the pin shows without it. */
  nameHidden?: boolean;
  /** Its head would cover another's (lib/markNames): moved off its point, on a leg back to a dot there (fix mark-overlap). */
  spread?: MarkSpread;
  /**
   * Offered after a moment of this kind (specs/moment-assignment-fallback PO3): drawn as a choice, an ink ring around the
   * head (a shape, never colour alone), and a tap ties that moment to it.
   */
  choice?: CaptureKind;
  /** Hidden from a screen reader: the map speaks for it in one summary (Explore, WT11). */
  quiet?: boolean;
  icon: IconName;
  name: string;
  /** Spoken with the name: "Food & drink". */
  category: string;
}

/** Ink, not a capture colour: a mark is something to find, not something kept. */
export const MARK_COLOR = '#1d2430';
const NAME_WIDTH = 140;

/**
 * A mark: a rounded square (captures are round, places walked are stars) with
 * a "?" until it is revealed, then the category's icon and the name below.
 * Anchored at its bottom, like a capture pin.
 */
/**
 * `enter` is the map's call: both maps rebuild a mark's view on each change, and know what it
 * showed before (M11 turns, M12 pulses). Kept from mount, so a later render can't cut it short.
 */
/** `below`: how far the pin's foot stands below its point (the web marker's offset), so a spread pin's leg ends on it. */
export function MarkPinView({ pin, enter, below = 0 }: { pin: MarkPin; enter?: EnterKind | null; below?: number }) {
  const [kind] = useState(enter ?? null);
  const body = <MarkBody pin={pin} below={below} />;
  if (kind === 'flip' || kind === 'pulse')
    return (
      <Enter kind={kind} ring={[styles.ringAt, pin.found && styles.ringFound]}>
        {body}
      </Enter>
    );
  return body;
}

/** The pin's foot: the bottom of its 36 x 44 box, where it stands. */
const FOOT = { x: 18, y: 44 };
const LEG_W = 1.5;
/** The point's mark: a small rounded square, a mark's own shape, never the walker's round dot (fix mark-overlap ux U1). */
const DOT = 6;

/** A spread pin's leg from its foot back to its point, and the dot on the point (fix mark-overlap). */
function Leg({ spread, below }: { spread: MarkSpread; below: number }) {
  const vx = -spread.dx;
  const vy = -spread.dy - below;
  const len = Math.hypot(vx, vy);
  return (
    <>
      <View
        style={[
          styles.leg,
          { left: FOOT.x + vx / 2 - LEG_W / 2, top: FOOT.y + vy / 2 - len / 2, height: len, transform: [{ rotate: `${Math.atan2(-vx, vy)}rad` }] },
        ]}
      />
      <View style={[styles.dot, { left: FOOT.x + vx - DOT / 2, top: FOOT.y + vy - DOT / 2 }]} />
    </>
  );
}

function MarkBody({ pin, below }: { pin: MarkPin; below: number }) {
  const shown = pin.revealed || pin.found;
  // A choice always writes its name (moment-assignment-fallback ui 1): the line names it, so the map must too.
  const named = shown && !pin.faint && !pin.found && (!pin.nameHidden || !!pin.choice);
  const side = pin.spread ? pin.spread.side : 'below';
  return (
    <View style={[styles.wrap, pin.faint && styles.faint, pin.found && styles.wrapFound]} pointerEvents="none">
      {pin.spread && <Leg spread={pin.spread} below={below} />}
      {pin.choice && !pin.found && <View testID="mark-choice" style={styles.choiceRing} />}
      <View style={[styles.head, pin.found && styles.headFound]}>
        {shown ? <Icon name={pin.icon} size={pin.found ? 13 : 18} color="#ffffff" /> : <Text style={styles.q}>?</Text>}
        {pin.found && pin.foundKind && (
          <View style={styles.badge} testID={`found-kind-${KIND_ICON[pin.foundKind]}`}>
            <Icon name={KIND_ICON[pin.foundKind]} size={11} color={FOUND_COLOR} />
          </View>
        )}
      </View>
      <View style={[styles.stem, pin.found && styles.stemFound]} />
      {named && side === 'below' && (
        <Text style={styles.name}>
          {pin.name}
        </Text>
      )}
      {named && pin.choice && side === null && (
        // In the middle of a row a name beside it would run over its neighbours: a choice's goes above its head.
        <Text style={[styles.name, styles.nameAbove]}>
          {pin.name}
        </Text>
      )}
      {named && (side === 'left' || side === 'right') && (
        // Beside the head on a spread row's outer side, so two names of one spot both stay readable.
        <View style={[styles.beside, side === 'left' ? styles.besideLeft : styles.besideRight]}>
          <Text style={[styles.name, styles.nameBeside, { textAlign: side === 'left' ? 'right' : 'left' }]}>{pin.name}</Text>
        </View>
      )}
    </View>
  );
}

export function markLabel(pin: MarkPin): string {
  if (pin.found) return foundLabel(pin.name, pin.category, pin.foundKind);
  if (pin.faint) return 'A place on the way. Open';
  if (pin.choice) return choiceLabel(pin.name, pin.category, pin.choice);
  return pin.revealed ? `${pin.name}, ${pin.category}. Open` : 'A place to find. Open';
}

/** What changes a pin's look, for re-rendering a marker only when it changes. */
export const markKey = (pin: MarkPin) =>
  `${pin.revealed ? 'r' : ''}${pin.found ? 'f' : ''}${pin.faint ? 'w' : ''}${pin.nameHidden ? 'n' : ''}${pin.foundKind ?? ''}${pin.choice ? `c${pin.choice}` : ''}`;

/** Found places: the trace's green family, so a find reads as walked, not as a capture. */
export const FOUND_COLOR = '#1f7a4d';

const styles = StyleSheet.create({
  wrap: { width: 36, height: 44, alignItems: 'center', overflow: 'visible' },
  head: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: MARK_COLOR,
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
  q: { color: '#ffffff', fontSize: 19, fontWeight: '800', lineHeight: 22 },
  // A choice (PO3): an ink ring around the head's white edge, a white gap between, so it reads on any tiles.
  choiceRing: {
    position: 'absolute', top: -5, left: -4, width: 44, height: 44, borderRadius: 14,
    borderWidth: 3, borderColor: MARK_COLOR, backgroundColor: '#ffffff',
  },
  faint: { opacity: 0.45 },
  // Smaller than a "?", and without a name: a find is a quiet note on the map, not a target (audit, UI).
  wrapFound: { width: 26, height: 32 },
  headFound: { backgroundColor: FOUND_COLOR, width: 24, height: 24, borderRadius: 7 },
  stemFound: { backgroundColor: FOUND_COLOR },
  // A find's ring grows from the head (M12).
  ringAt: { top: 0, left: 1, width: 34, height: 34, borderRadius: 9 },
  ringFound: { left: 1, width: 24, height: 24, borderRadius: 7 },
  // The kept moment's glyph on a white disc at the head's corner, where a tick was (O26).
  badge: {
    position: 'absolute', right: -6, top: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  stem: { width: 3, height: 8, backgroundColor: MARK_COLOR, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  // Hangs below the anchor, as a star's name does; an explicit width so web doesn't clip it to the pin.
  name: {
    position: 'absolute',
    top: 46,
    width: NAME_WIDTH,
    maxWidth: NAME_WIDTH,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: MARK_COLOR,
    textShadowColor: '#ffffff',
    textShadowRadius: 3,
  },
  // A choice's name in the middle of a row, over its ring (moment-assignment-fallback ui 1).
  nameAbove: { top: -24 },
  // A spread pin's name, beside its head and centred on it (fix mark-overlap).
  beside: { position: 'absolute', top: 0, height: 34, width: NAME_WIDTH, justifyContent: 'center' },
  besideLeft: { right: 36 + 4 },
  besideRight: { left: 36 + 4 },
  nameBeside: { position: 'relative', top: 0 },
  // The leg and the dot are the mark's ink, thin and small: they say where the place is, the head says what.
  leg: { position: 'absolute', width: LEG_W, backgroundColor: MARK_COLOR, opacity: 0.7 },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: 1.5, backgroundColor: MARK_COLOR },
});
