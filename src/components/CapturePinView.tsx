import { useState } from 'react';
import { hasMore } from '../lib/moment';
import { StackMark, STACK_SPOKEN } from './StackMark';
import { Image, StyleSheet, View } from 'react-native';
import { pinHeadKinds, pinSpoken, pinThumb, type CapturePin, type WalkClock } from '../lib/pins';
import { VideoMark } from './VideoMark';
import { useStill } from '../lib/thumbs/useStill';
import { useMediaUri } from '../lib/useMediaUri';
import { COLORS } from './map/types';
import { Enter } from './Enter';
import { captureIcon, Icon, KIND_ICON } from './icons';
import { theme } from './ui';

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
/** The ring of the photo colour around a pin's picture (QL26), inside the head's white edge. */
const THUMB_RING = 2.5;
const THUMB_SIZE = 36 - 2 * 2 - 2 * THUMB_RING;

/**
 * A capture's marker on the map: a head with its kind's icon (or, for several
 * moments, their kinds, two at most, fanned: never a numeral, tend map T14) on a
 * short stem, so the point it marks, and the walker's dot there, stay visible
 * beneath it. A pin with a reminder wears a bell in its corner (RB1).
 */
export function CapturePinView({ pin, faint = false, drop: dropNow = false, reminded = false }: {
  pin: CapturePin;
  faint?: boolean;
  drop?: boolean;
  /** Any of its captures has a live reminder (`pinReminded`). */
  reminded?: boolean;
}) {
  // Kept from mount, so a later render can't cut the drop short.
  const [drop] = useState(dropNow);
  const n = pin.captures.length;
  const fan = pinHeadKinds(pin);
  const color = n > 1 ? (pin.kind === 'mixed' ? MIXED : PIN_COLOR[pin.kind]) : PIN_COLOR[pin.kind];
  // One photo's small copy, never the full photo (QL26). The ref is resolved once per
  // change of it (useMediaUri's effect keys on it), never per render.
  // One capture's copy or still, the row's or one made since; a pin asks for none itself (VS2).
  const one = useStill(pin.captures[0], { ask: false });
  const thumb = pinThumb(n === 1 ? { ...pin, captures: [one] } : pin);
  const uri = useMediaUri(thumb ? { ...pin.captures[0], file_path: thumb } : null);
  // The icon shows until the picture has painted, and again if it won't load.
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const picture = uri && uri !== failed ? uri : null;
  const painted = !!picture && picture === loaded;
  const view = (
    <View style={styles.wrap} pointerEvents="none">
      {/* A memory from an earlier walk: the same round pin, smaller and faded (MR3). */}
      <View style={[styles.pin, faint && styles.faint]}>
        <View style={[styles.head, { backgroundColor: color }]}>
          {fan ? (
            fan.map((k, i) => (
              <View key={i} testID="pin-kind" style={[styles.fan, i ? styles.fanFront : styles.fanBack, { backgroundColor: PIN_COLOR[k] }]}>
                <Icon name={KIND_ICON[k]} size={11} color="#ffffff" />
              </View>
            ))
          ) : !painted && <Icon name={n === 1 ? captureIcon(pin.captures[0]) : KIND_ICON[pin.kind]} size={18} color="#ffffff" />}
          {picture && (
            <Image
              testID="pin-thumb"
              source={{ uri: picture }}
              style={styles.thumb}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
              onLoad={() => setLoaded(picture)}
              onError={() => setFailed(picture)}
            />
          )}
        </View>
        <View style={[styles.stem, { backgroundColor: color }]} />
      </View>
      {n === 1 && hasMore(pin.captures[0]) && <StackMark silent size={10} style={styles.stack} />}
      {/* A video's still keeps its play mark, bottom right of the head, clear of the stack, clock and bell (VS4). */}
      {n === 1 && pin.captures[0].kind === 'video' && painted && <VideoMark testID="pin-video-mark" size={faint ? 7 : 9} style={[styles.videoMark, faint && styles.videoMarkFaint]} />}
      {/* Its clock stays solid and full size, so it reads as from the past at a glance (MR10, audit UX). */}
      {faint && (
        <View testID="memory-badge" style={styles.badge}>
          <Icon name="time" size={12} color="#ffffff" />
        </View>
      )}
      {/* A reminder set here: a bell, never a number (RB1). Solid and full size like the clock;
          on a memory pin it takes the other corner, so both read (RB4). */}
      {reminded && (
        <View testID="pin-reminder" style={[styles.bell, faint ? styles.bellLeft : styles.bellRight]}>
          <Icon name="notifications" size={12} color="#ffffff" />
        </View>
      )}
    </View>
  );
  // A capture just taken drops into place (M10).
  return drop ? <Enter kind="drop">{view}</Enter> : view;
}

/** A pin's spoken name: its moments in words (`pinSpoken`; several with the minutes in, tend map T14), its stack, its bell, "Open". */
export function pinLabel(pin: CapturePin, interactive = true, memory = false, reminded = false, clocks?: readonly WalkClock[]): string {
  const n = pin.captures.length;
  const kind = pinSpoken(pin, { memory, clocks });
  // One moment with more than one piece says so in words, never how many (MS8, MS9).
  const stacked = n === 1 && hasMore(pin.captures[0]) ? `, ${STACK_SPOKEN}` : '';
  // The bell said in words (RB7).
  const what = reminded ? `${kind}${stacked}, reminder set` : `${kind}${stacked}`;
  return interactive ? `${what}. Open` : what;
}

const styles = StyleSheet.create({
  videoMark: { position: 'absolute', right: -3, top: 20, borderWidth: 1.5, borderColor: '#ffffff' },
  // The faint head shrinks to 75% toward its foot (its bottom right near x 31, y 38): the mark there, 2 px under the clock (ui 4).
  videoMarkFaint: { right: 1, top: 24 },
  stack: { position: 'absolute', top: -4, left: -4, width: 18, height: 18, borderRadius: 9 },
  wrap: { width: 36, height: PIN_HEIGHT, alignItems: 'center' },
  pin: { width: 36, height: PIN_HEIGHT, alignItems: 'center' },
  // Shrunk toward the stem's foot, so it still marks its point (audit 7).
  faint: { opacity: 0.55, transform: [{ scale: 0.75 }], transformOrigin: 'bottom' },
  // Over the faded head's top right corner (it shrinks toward its foot, to 75%).
  badge: {
    position: 'absolute', right: -2, top: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#1d2430',
    borderWidth: 1.5, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
  },
  // Ink, the clock's size: it reads on every pin colour (the owner's call after the audit; the
  // accent was as bright as a note's amber). The bell itself tells it from the clock.
  bell: {
    position: 'absolute', top: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: theme.ink,
    borderWidth: 1.5, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
  },
  bellRight: { right: -3 },
  // Over the faded head's top left, mirroring the clock (it shrinks toward its foot, to 75%).
  bellLeft: { left: -2, top: 4 },
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
  // Over the icon until it paints, leaving a ring of the head's photo colour (QL26).
  thumb: {
    position: 'absolute', left: THUMB_RING, top: THUMB_RING, width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
  },
  stem: { width: 3, height: 8, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  // A pin of several moments: its two kinds, each a small disc of its colour with a white edge, fanned across the
  // head from top left to bottom right (tend map T14).
  fan: {
    position: 'absolute', width: 19, height: 19, borderRadius: 9.5, borderWidth: 1.5, borderColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  fanBack: { left: 1, top: 2, transform: [{ rotate: '-12deg' }] },
  fanFront: { right: 1, bottom: 2, transform: [{ rotate: '12deg' }] },
});
