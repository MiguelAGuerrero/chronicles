import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { stepAt } from '../../lib/ceremony/story';
import type { Capture } from '../../lib/types';
import { focusOn } from '../../lib/focus';
import { CaptureContent } from '../CaptureView';
import { KIND_LABEL } from '../icons';
import { theme } from '../ui';
import { timeOf } from './layout';

/** Taps this soon after a moment appears are ignored, so a double tap skips nothing. */
const TAP_GUARD_MS = 600;
/** On a re-watch, how long a photo or note stays up before moving on. */
const AUTO_MS = 4000;

/**
 * The screen reader's way through (RR17, RR22): the story's moments one at a
 * time, each until Continue, as both replays did before the rhythm. A
 * re-watch moves on by itself (0004 still holds here).
 */
export function StepThrough(props: {
  steps: Capture[][];
  auto: boolean;
  onDone: () => void;
  footer?: (c: Capture) => string | null;
  hint: string;
  testID: string;
  topInset: number;
}) {
  const [at, setAt] = useState(() => ({ step: 0, item: 0, shownAt: Date.now() }));
  // A moment deleted while it showed moves on to the next, or ends the steps (audit 18).
  const pos = stepAt(props.steps, at);
  const capture = pos ? props.steps[pos.step][pos.item] : null;
  const continueRef = useRef<ComponentRef<typeof Pressable>>(null);
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });
  const advance = (fromAuto = false) => {
    const t = Date.now();
    if (!fromAuto && t - at.shownAt < TAP_GUARD_MS) return;
    if (!pos) return;
    const next = stepAt(props.steps, { step: pos.step, item: pos.item + 1 });
    if (next) setAt({ ...next, shownAt: t });
    else props.onDone();
  };
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  });
  // Nothing (left) to step through: straight on.
  const done = pos == null;
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => live.current.onDone(), 0);
    return () => clearTimeout(t);
  }, [done]);
  const key = pos ? `${pos.step}:${pos.item}:${capture?.id}` : null;
  useEffect(() => {
    if (!props.auto || !capture) return;
    const media = capture.kind === 'voice' || capture.kind === 'video';
    const timer = setTimeout(() => advanceRef.current(true), media ? (Number(capture.body) || 0) + 2500 : AUTO_MS);
    return () => clearTimeout(timer);
    // Once per moment shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.auto, key]);
  useEffect(() => {
    if (!key) return;
    const t = setTimeout(() => focusOn(continueRef), 250);
    return () => clearTimeout(t);
  }, [key]);
  useEffect(() => {
    if (!capture) return;
    const what = capture.kind === 'text' ? `Note: ${capture.body ?? ''}` : `${KIND_LABEL[capture.kind]}, ${timeOf(capture.t)}`;
    AccessibilityInfo.announceForAccessibility(`${what}. ${props.auto ? '' : 'Continue when ready.'}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!capture || !pos) return null;
  const n = props.steps[pos.step].length;
  return (
    <View style={styles.moment}>
      {capture.kind !== 'voice' && capture.kind !== 'video' && <Pressable style={StyleSheet.absoluteFill} onPress={() => advance()} accessible={false} />}
      <CaptureContent
        key={capture.id}
        ref={continueRef}
        capture={capture}
        autoPlay
        topInset={props.topInset}
        onVoiceFinished={props.auto ? () => advance(true) : undefined}
        footer={[props.footer?.(capture) ?? null, n > 1 ? `${pos.item + 1} of ${n}` : null].filter(Boolean).join(' · ') || undefined}
        action={{ label: 'Continue', hint: props.hint, onPress: () => advance(), testID: props.testID }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  moment: { ...StyleSheet.absoluteFill, backgroundColor: theme.scrim },
});
