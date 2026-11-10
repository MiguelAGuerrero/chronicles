import type { Faced } from '../../lib/moment';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { bandLabels, captureTarget } from '../../lib/captureBand';

import type { MomentState } from '../../lib/useCaptures';
import { MomentBar } from '../MomentBar';
import { useOpenWalk, useOpenWalkInfo } from '../OpenWalk';
import { theme } from '../ui';

const ERROR_MS = 6000;

type BandProps = {
  /** Memories is in front and nothing is open over it: leaving, or opening something, saves a memo (HC11). */
  focused: boolean;
  onMoment: (c: Faced, state: MomentState) => void;
  /** Whether a memo is recording from the band: Memories holds a viewer back until it stops (audit 8). */
  onRecording?: (on: boolean) => void;
  /** Memories' own toast (Undo): stacked with the band's pills in one column, never over them (audit 2). */
  above?: ReactNode;
};

/**
 * Memories' capture band (HC6-HC11, decision 0112): camera, mic and note at the foot, one tap from launch.
 * With no walk open each keeps a moment of its own; with a walk minimized, each files into that walk (HC10).
 * Only the walk's band reads the live trace, so Memories itself isn't re-rendered by every fix.
 */
export function MemoriesBand(props: BandProps) {
  const info = useOpenWalkInfo();
  const [error, setError] = useState<{ message: string; openSettings?: boolean } | null>(null);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), ERROR_MS);
    return () => clearTimeout(t);
  }, [error]);
  const onError = useCallback((e: { message: string; openSettings?: boolean }) => setError(e), []);
  // An error said above the band, in the pills' column, so it never covers a Retry or a toast (audit 3). The
  // web has no settings to open, so it says where to allow it and offers no button (audit 4).
  const errorPill = error && (
    <View style={styles.error} accessibilityLiveRegion="polite" testID="band-error">
      <Text style={styles.errorText}>{error.message}</Text>
      {error.openSettings && Platform.OS !== 'web' && (
        <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>Settings</Text>
        </Pressable>
      )}
    </View>
  );
  const above = (props.above || errorPill) ? <>{props.above}{errorPill}</> : null;
  const target = captureTarget(info.walk, info.known);
  if ('walkId' in target) return <WalkBand key={target.walkId} {...props} onError={onError} above={above} />;
  return (
    <MomentBar
      // A walk that ended under Memories: the band starts again on moments of their own.
      key="loose"
      layout="band"
      idPrefix="band"
      labels={bandLabels(false)}
      // Until the keeper knows whether a walk is open, the band waits (audit 7).
      disabled={'wait' in target}
      onMoment={props.onMoment}
      onError={onError}
      onRecording={props.onRecording}
      focused={props.focused}
      above={above}
    />
  );
}

function WalkBand(props: BandProps & { onError: (e: { message: string; openSettings?: boolean }) => void; above: ReactNode }) {
  const open = useOpenWalk();
  const walk = open.walk ? { id: open.walk.id, here: open.live.here, lastFixAt: open.live.lastFixAt } : null;
  return (
    <MomentBar
      layout="band"
      idPrefix="band"
      labels={bandLabels(!!walk)}
      walk={walk}
      onMoment={props.onMoment}
      onError={props.onError}
      onRecording={props.onRecording}
      focused={props.focused}
      above={props.above}
    />
  );
}

const styles = StyleSheet.create({
  error: {
    width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.ink, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14,
  },
  errorText: { color: theme.bg, fontSize: 14, flex: 1 },
  errorBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 },
  errorBtnText: { color: theme.bg, fontSize: 14, fontWeight: '700' },
});
