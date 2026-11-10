import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons';
import { Ticking } from '../Ticking';
import { HoldButton, theme } from '../ui';
import { ReadyBar } from '../walk/ReadyBar';
import { pausedMs } from '../../lib/geo';
import { formatDistance, formatDuration, formatElapsed } from '../../lib/summary';
import type { Pause, Walk } from '../../lib/types';
import type { WalkLifecycle } from './useWalkLifecycle';

/** Time walked (paused time left out) and distance, in the bottom strip; a ride's distance after it (R6). */
function WalkStats(props: { startedAt: number | null; pauses: Pause[]; distanceM: number; rideM: number }) {
  const { startedAt, pauses, distanceM, rideM } = props;
  const elapsed = (now: number) => (startedAt == null ? 0 : now - startedAt - pausedMs(pauses, startedAt, now));
  // The ride on a second, smaller line, so the strip keeps its width at 390 px (rides audit, UI).
  const ride = rideM >= 1 ? `\n+ ${formatDistance(rideM)} ride` : '';
  return (
    <Ticking
      testID="walk-stats"
      style={styles.stats}
      numberOfLines={ride ? 2 : 1}
      text={(now) => `${formatElapsed(elapsed(now))} · ${formatDistance(distanceM)}${ride}`}
      label={(now) => `${formatDistance(distanceM)} walked in ${formatDuration(elapsed(now))}${rideM >= 1 ? `, plus ${formatDistance(rideM)} by ride` : ''}`}
    />
  );
}

/**
 * The walk's strip is the ready bar's twin (NR7): pull it up for the walk's options, which are no button
 * of their own. Pause and Stop stay at its foot at every height; a quick tap on Stop says to hold it.
 */
export function WalkStrip(props: {
  walk: Walk | null;
  pauses: Pause[];
  live: { distanceM: number; rideM: number };
  life: WalkLifecycle;
  up: boolean;
  onUp: (up: boolean) => void;
  areaHeight: number;
  locked: boolean;
  exploring: boolean;
  onHoldTap: () => void;
  children: ReactNode;
}) {
  const { walk, life } = props;
  const { paused, pausing, stopping } = life;
  return (
    <ReadyBar
      idPrefix="walk"
      up={props.up}
      onUp={props.onUp}
      areaHeight={props.areaHeight}
      locked={props.locked}
      summaryLabel={props.exploring ? 'The walk, exploring' : 'The walk'}
      summary={<WalkStats startedAt={walk?.started_at ?? null} pauses={props.pauses} distanceM={props.live.distanceM} rideM={props.live.rideM} />}
      actions={
        <View style={styles.barActions}>
          <Pressable
            testID={paused ? 'resume-walk' : 'pause-walk'}
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume the walk' : 'Pause the walk'}
            accessibilityHint={paused ? undefined : 'Stops recording until you resume'}
            onPress={life.togglePause}
            disabled={pausing || stopping || !walk}
            style={({ pressed }) => [styles.pauseBtn, paused && styles.pauseBtnOn, pressed && styles.pressed]}
          >
            <Icon name={paused ? 'play' : 'pause'} size={20} color={paused ? '#ffffff' : theme.ink} />
          </Pressable>
          <HoldButton
            testID="stop"
            label="Hold to stop"
            busyLabel="Stopping…"
            onHold={life.stop}
            onTap={props.onHoldTap}
            busy={stopping}
            disabled={!walk || pausing}
          >
            <View style={styles.stopInner}>
              <Icon name="stop" size={18} color={theme.ink} />
              <Text style={styles.stopText} selectable={false}>Hold</Text>
            </View>
          </HoldButton>
        </View>
      }
    >
      {props.children}
    </ReadyBar>
  );
}

const styles = StyleSheet.create({
  stats: { color: theme.ink, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], flexShrink: 1 },
  stopInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  pauseBtn: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.ink, backgroundColor: theme.surface,
  },
  // Resume is the one thing to do while paused.
  pauseBtnOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  pressed: { opacity: 0.8 },
  stopText: { color: theme.ink, fontSize: 15, fontWeight: '600' },
});
