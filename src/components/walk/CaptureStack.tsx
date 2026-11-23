import { forwardRef, type ComponentRef, type ForwardedRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatElapsed } from '../../lib/summary';
import { Icon, type IconName } from '../icons';
import { Ticking } from '../Ticking';
import { theme } from '../ui';
import { CAP, CAP_SMALL, STACK_GAP, useStackLayout, type CapSlot } from './layout';

type PressableRef = ComponentRef<typeof Pressable>;

export type StackIds = { photo: string; voice: string; note: string; save: string; discard: string; timer?: string };

type CaptureStackProps = {
  ids: StackIds;
  labels: { photo: string; voice: string; note: string };
  voiceStartedAt: number | null;
  busy: string | null;
  disabled?: boolean;
  /** While a gap's way is drawn, taps belong to the map (GW8). */
  hidden?: boolean;
  onPhoto: () => void;
  onVoice: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onNote: () => void;
};

/**
 * The capture stack (NR9, NR10 as T44 amends it, decision 0233): camera, mic and note, one above the other at the right
 * edge, above the strip, in the same place on the ready screen and on the walk. While a memo records, the camera keeps
 * its slot (a photo then goes with the memo, `photoMidMemo`), Stop & save takes the mic's, and Discard, smaller, sits
 * beside the timer, left of the stack; nothing in the stack moves. The forwarded ref is Save's, so focus can follow the
 * tap that started the memo.
 */
export const CaptureStack = forwardRef<PressableRef, CaptureStackProps>(function CaptureStack(props, saveRef) {
  return <Stack {...props} saveRef={saveRef} />;
});

type StackProps = CaptureStackProps & { saveRef: ForwardedRef<PressableRef> };

function Stack({ saveRef, ...props }: StackProps) {
  const at = useStackLayout();
  const recording = props.voiceStartedAt != null;
  const slot = (s: CapSlot, size: number, child: ReactNode) => (
    <View
      key={s}
      style={[styles.slot, { right: at.right + (CAP - size) / 2, bottom: at.capBottom(s) + (CAP - size) / 2, width: size, height: size }]}
      pointerEvents="box-none"
    >
      {child}
    </View>
  );
  return (
    <View style={[StyleSheet.absoluteFill, props.hidden && styles.hidden]} pointerEvents={props.hidden ? 'none' : 'box-none'}>
      {/* The camera keeps its slot mid-memo (T44): what it takes then goes with the memo. */}
      {slot('photo', CAP, (
        <Round
          testID={props.ids.photo}
          icon="camera"
          label={recording ? 'Add a photo to this memo' : props.labels.photo}
          onPress={props.onPhoto}
          busy={props.busy === 'photo'}
          disabled={props.disabled || props.busy === 'voice'}
          size={CAP}
        />
      ))}
      {recording ? (
        <>
          {slot('voice', CAP, (
            <Round ref={saveRef} testID={props.ids.save} icon="stop" label="Stop and save voice memo" onPress={props.onSave} voice busy={props.busy === 'voice'} size={CAP} />
          ))}
          {/* Discard, then the timer, beside Save and left of the stack, so the stack never moves (NR10, T44). Discard is
              the farther from Save, and smaller. */}
          <View
            style={[styles.memoRow, { right: at.right + CAP + STACK_GAP, bottom: at.capBottom('voice') + (CAP - CAP_SMALL) / 2, height: CAP_SMALL }]}
            pointerEvents="box-none"
          >
            <Round
              testID={props.ids.discard}
              icon="trash-outline"
              label="Discard voice memo"
              hint="Throws this recording away. You can undo for a few seconds."
              onPress={props.onDiscard}
              size={CAP_SMALL}
            />
            <View testID="voice-timer" style={styles.live} accessible accessibilityLabel="Recording voice memo">
              <View style={styles.recDot} />
              <Ticking style={styles.liveText} text={(t) => formatElapsed(t - props.voiceStartedAt!)} />
            </View>
          </View>
        </>
      ) : (
        <>
          {slot('voice', CAP, (
            <Round testID={props.ids.voice} icon="mic" label={props.labels.voice} onPress={props.onVoice} busy={props.busy === 'voice'} disabled={props.disabled} size={CAP} />
          ))}
          {slot('note', CAP, (
            <Round testID={props.ids.note} icon="document-text" label={props.labels.note} onPress={props.onNote} disabled={props.disabled} size={CAP} />
          ))}
        </>
      )}
    </View>
  );
}

const Round = forwardRef<PressableRef, {
  testID: string;
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
  size: number;
  busy?: boolean;
  disabled?: boolean;
  voice?: boolean;
}>(function Round(props, ref) {
  const inactive = props.disabled || props.busy;
  return (
    <Pressable
      ref={ref}
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityHint={props.hint}
      accessibilityState={{ disabled: !!inactive, busy: !!props.busy }}
      disabled={inactive}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.round,
        { width: props.size, height: props.size, borderRadius: props.size / 2 },
        props.voice && styles.roundVoice,
        inactive && styles.dim,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={props.icon} size={props.size >= CAP ? 26 : 22} color={props.voice ? '#ffffff' : theme.ink} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hidden: { display: 'none' },
  slot: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  round: {
    backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  roundVoice: { backgroundColor: '#6b21a8', borderColor: '#6b21a8' },
  dim: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  memoRow: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8 },
  live: {
    height: 40, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface,
    borderRadius: 999, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.line,
  },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.danger },
  liveText: { color: theme.ink, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
