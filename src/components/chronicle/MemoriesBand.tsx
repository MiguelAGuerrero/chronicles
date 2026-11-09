import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { bandLabels, bandLayout } from '../../lib/captureBand';
import type { Capture } from '../../lib/types';
import type { MomentState } from '../../lib/useCaptures';
import { MomentBar } from '../MomentBar';
import { useOpenWalk, useOpenWalkInfo } from '../OpenWalk';
import { theme } from '../ui';

const ERROR_MS = 6000;

type BandProps = {
  /** Memories is in front and nothing is open over it: leaving, or opening something, saves a memo (HC11). */
  focused: boolean;
  onMoment: (c: Capture, state: MomentState) => void;
};

/**
 * Memories' capture band (HC6-HC11, decision 0106): camera, mic and note at the foot, one tap from launch.
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
  const { width } = useWindowDimensions();
  const bandH = bandLayout(width).height;
  return (
    <>
      {info.walk ? <WalkBand key={info.walk.id} {...props} onError={onError} /> : <MomentBar
        // A walk that ended under Memories: the band starts again on moments of their own.
        key="loose"
        layout="band"
        idPrefix="band"
        labels={bandLabels(false)}
        onMoment={props.onMoment}
        onError={onError}
        focused={props.focused}
      />}
      {error && (
        <View style={[styles.error, { bottom: bandH + 12 }]} accessibilityLiveRegion="polite" testID="band-error">
          <Text style={styles.errorText}>{error.message}</Text>
          {error.openSettings && (
            <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={styles.errorBtn}>
              <Text style={styles.errorBtnText}>Settings</Text>
            </Pressable>
          )}
        </View>
      )}
    </>
  );
}

function WalkBand(props: BandProps & { onError: (e: { message: string; openSettings?: boolean }) => void }) {
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
      focused={props.focused}
    />
  );
}

const styles = StyleSheet.create({
  error: {
    position: 'absolute', left: 16, right: 16, alignSelf: 'center', maxWidth: 480, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.ink, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14,
  },
  errorText: { color: theme.bg, fontSize: 14, flex: 1 },
  errorBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 },
  errorBtnText: { color: theme.bg, fontSize: 14, fontWeight: '700' },
});
