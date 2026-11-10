import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCaptures } from '../../lib/useCaptures';
import { Icon, type IconName } from '../icons';
import { NoteEditor } from '../NoteEditor';
import { Ticking } from '../Ticking';
import { theme } from '../ui';
import { formatElapsed } from '../../lib/format';

/** The dock's height above the safe area: the moment's layout leaves this much clear at the bottom (OT27). */
export const DOCK_H = 60;

export type ReplyStage = 'sheet' | 'note' | null;

/**
 * The viewer's toolbar, docked under the moment (OT1, decision 0112): Respond, and Edit where the moment can be
 * edited. Respond opens a pull-down menu of kinds; the reply is kept by the capture's own path and linked to the moment
 * it answers (`useCaptures` `replyTo`). One per open viewer, so swiping builds no new recorder (audit 10). The sheet and
 * the note are the viewer's to close with Back (`stage`, audit 9). Drawn inside the viewer's Modal, never a second one.
 */
export function ReplyDock(props: {
  answeredId: string;
  threadId?: string | null;
  walkId?: string | null;
  bottomInset: number;
  stage: ReplyStage;
  setStage: (s: ReplyStage) => void;
  /** Says what went wrong, in the viewer's pill; a refused microphone or camera offers Open Settings (fix mic-settings). */
  say: (text: string, openSettings?: boolean) => void;
  /** Says a reply was kept, in the answered moment's info line (UC10; audit 10: the moment it answers, not the one shown). */
  kept: (answeredId: string, text: string) => void;
  /** A reply is being recorded: the viewer keeps its bars up, so Stop stays on screen (audit 16). */
  onRecording?: (on: boolean) => void;
  edit?: { label: string; testID: string; onPress: () => void } | null;
  /** The viewer's bars are hidden (UC7): nothing shows, and a memo being recorded goes on. */
  hidden?: boolean;
}) {
  const sayRef = useRef(props.say);
  const keptRef = useRef(props.kept);
  useEffect(() => {
    sayRef.current = props.say;
    keptRef.current = props.kept;
  }, [props.say, props.kept]);
  const replyTo = useMemo(() => ({ answeredId: props.answeredId, from: props.threadId ?? null }), [props.answeredId, props.threadId]);
  const walkId = props.walkId ?? null;
  const cap = useCaptures(walkId, null, null, (e) => sayRef.current(e.message, e.openSettings), {
    loose: !walkId,
    replyTo,
    onMoment: (_c, state, answered) => {
      if (state === 'kept') keptRef.current(answered ?? props.answeredId, 'Reply kept');
    },
  });
  const recording = cap.voiceStartedAt != null;
  const onRecording = props.onRecording;
  useEffect(() => {
    onRecording?.(recording);
  }, [recording, onRecording]);
  const tool = (testID: string, icon: IconName, label: string, onPress: () => void, disabled?: boolean) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.tool, (pressed || disabled) && styles.dim]}
    >
      <Icon name={icon} size={22} color="#ffffff" />
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
  const item = (testID: string, icon: IconName, label: string, onPress: () => void) => (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.dim]}>
      <Icon name={icon} size={22} color={theme.ink} />
      <Text style={styles.itemText}>{label}</Text>
    </Pressable>
  );
  const pick = (fn: () => void) => () => {
    props.setStage(null);
    fn();
  };
  if (props.hidden) return null;
  return (
    <>
      <View style={[styles.dock, { paddingBottom: props.bottomInset, height: DOCK_H + props.bottomInset }]} testID="viewer-toolbar">
        {recording ? (
          <View style={styles.row}>
            <View style={styles.rec} accessibilityLiveRegion="polite">
              <View style={styles.dot} />
              <Ticking style={styles.recText} text={(now) => `Recording a reply · ${formatElapsed(now - (cap.voiceStartedAt ?? now))}`} />
            </View>
            {tool('respond-voice-stop', 'stop', 'Stop and keep', () => void cap.finishVoice())}
          </View>
        ) : (
          <View style={styles.row}>
            {tool('viewer-respond', 'arrow-undo', 'Respond', () => props.setStage('sheet'), cap.busy != null)}
            {props.edit ? tool(props.edit.testID, 'create-outline', props.edit.label, props.edit.onPress) : null}
          </View>
        )}
      </View>
      {props.stage === 'sheet' && (
        // A pull-down menu from the Respond button (HIG: a button that asks what kind of thing to add, M3); a tap
        // outside dismisses it, as a menu does. Not an action sheet, which is for clarifying an action already started.
        <View style={StyleSheet.absoluteFill}>
          <Pressable testID="respond-dismiss" style={StyleSheet.absoluteFill} onPress={() => props.setStage(null)} accessibilityRole="button" accessibilityLabel="Close the menu" />
          <View style={[styles.menu, { bottom: DOCK_H + props.bottomInset + 6 }]} testID="respond-sheet" accessibilityRole="menu">
            {item('respond-photo', 'camera', 'Photo or video', pick(() => void cap.takePhoto()))}
            {item('respond-voice', 'mic', 'Voice memo', pick(() => void cap.startVoice()))}
            {item('respond-note', 'document-text-outline', 'Note', () => props.setStage('note'))}
          </View>
        </View>
      )}
      {props.stage === 'note' && (
        <NoteEditor
          key={props.answeredId}
          title="Reply"
          body=""
          onClose={() => props.setStage(null)}
          onSave={(text) => {
            props.setStage(null);
            void cap.saveNote(text);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#14181f', borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 8, width: '100%', maxWidth: 640, alignSelf: 'center', height: DOCK_H },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, minWidth: 96, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 12 },
  toolText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  dim: { opacity: 0.45 },
  rec: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.danger },
  recText: { color: '#ffffff', fontSize: 14 },
  menu: { position: 'absolute', left: 12, minWidth: 220, backgroundColor: theme.surface, borderRadius: 14, paddingVertical: 6, elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingHorizontal: 12, borderRadius: 12 },
  itemText: { color: theme.ink, fontSize: 16, fontWeight: '600' },
});
