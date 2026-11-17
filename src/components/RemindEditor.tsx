import { forwardRef, useImperativeHandle, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { remindChoices, remindMenuLabel, type RemindChoice } from '../lib/discovery/recall';
import type { Recall, RecallFrequency } from '../lib/discovery/types';
import { Icon } from './icons';
import { Button, theme } from './ui';

const DAY = 86_400_000;
/** An Until span's end, read at the tap. */
const fromNow = (days: number) => Date.now() + days * DAY;
type MenuId = 'often' | 'until';
/** A menu's row, as the viewer's More menu draws them. */
const ITEM_H = 48;

export type RemindEditorHandle = { requestClose(): void };

/**
 * Remind me here (R1, R8): how often a capture comes back when a later walk
 * passes it, and until when. Drawn inside the viewer's Modal, never as a
 * second one (iOS can't present a Modal over a Modal). Each is a labelled
 * menu, "How often: Once", "Until: No end" (tend explore 18, decision 0172
 * O9; ui-patterns matrix 15: one choice from a short list is a menu), opened
 * over the card as the viewer's More menu opens over the moment; a tap
 * outside, Escape or Back closes the menu before the editor.
 */
export const RemindEditor = forwardRef<RemindEditorHandle, {
  current: Recall | null;
  /** How often, and the until-date (null: no end). */
  onSave: (frequency: RecallFrequency, until: number | null) => void;
  onStop: () => void;
  onClose: () => void;
}>(function RemindEditor(props, ref) {
  const [frequency, setFrequency] = useState<RecallFrequency>(props.current?.frequency ?? 'once');
  // An end already set is its own choice, "Ends Nov 2", kept to the day unless another is picked.
  const kept = props.current?.until ?? null;
  const [until, setUntil] = useState<string>(kept != null ? 'kept' : 'none');
  const choices = remindChoices(kept != null ? { month: new Date(kept).getMonth(), date: new Date(kept).getDate() } : null);
  const [open, setOpen] = useState<MenuId | null>(null);
  // Where the card and each button sit, so a menu opens from its button.
  const [frame, setFrame] = useState<{ back?: LayoutRectangle; card?: LayoutRectangle; often?: LayoutRectangle; until?: LayoutRectangle }>({});
  const placed = (k: keyof typeof frame) => (e: { nativeEvent: { layout: LayoutRectangle } }) => {
    const l = e.nativeEvent.layout;
    setFrame((f) => ({ ...f, [k]: l }));
  };
  useImperativeHandle(ref, () => ({ requestClose: () => (open ? setOpen(null) : props.onClose()) }));
  const save = () => {
    if (until === 'kept') return props.onSave(frequency, kept);
    const span = choices.until.find((x) => x.id === until)?.days ?? null;
    props.onSave(frequency, span == null ? null : fromNow(span));
  };
  const items = open === 'often' ? choices.often : choices.until;
  const value = open === 'often' ? frequency : until;
  const pick = (id: string) => {
    if (open === 'often') setFrequency(id as RecallFrequency);
    else setUntil(id);
    setOpen(null);
  };
  const at = open ? menuAt(frame, open, items.length) : null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.back]} onLayout={placed('back')}>
      <View testID="remind-editor" style={styles.card} accessibilityViewIsModal onLayout={placed('card')}>
        <Text style={styles.title} accessibilityRole="header">Remind me here</Text>
        <Text style={styles.sub}>When a later walk passes within 75 m, this comes back.</Text>
        <MenuButton id="often" label={remindMenuLabel('often', choices.often, frequency)} open={open === 'often'} onPress={() => setOpen('often')} onLayout={placed('often')} />
        <MenuButton id="until" label={remindMenuLabel('until', choices.until, until)} open={open === 'until'} onPress={() => setOpen('until')} onLayout={placed('until')} />
        <View style={styles.actions}>
          {props.current && <Button testID="remind-stop" variant="secondary" label="Stop reminding me" onPress={props.onStop} />}
          <View style={{ flex: 1 }} />
          <Button variant="ghost" label="Cancel" onPress={props.onClose} />
          <Button testID="remind-save" label={props.current ? 'Save' : 'Remind me'} onPress={save} />
        </View>
      </View>
      {open && at && (
        <>
          <Pressable testID="remind-menu-dismiss" style={StyleSheet.absoluteFill} onPress={() => setOpen(null)} accessibilityRole="button" accessibilityLabel="Close the menu" />
          <View
            testID={`remind-${open}-menu`}
            style={[styles.menu, at]}
            accessibilityRole="radiogroup"
            accessibilityLabel={open === 'often' ? 'How often' : 'Until'}
            accessibilityViewIsModal
          >
            {items.map((it: RemindChoice) => {
              const on = it.id === value;
              return (
                <Pressable
                  key={it.id}
                  testID={`remind-${it.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  aria-checked={on}
                  onPress={() => pick(it.id)}
                  style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                >
                  <Text style={styles.itemText}>{it.label}</Text>
                  {on ? <Icon name="checkmark" size={20} color={theme.ink} /> : null}
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
});

/** Under its button, or above it when the screen has no room below; as wide as the button. */
function menuAt(
  f: { back?: LayoutRectangle; card?: LayoutRectangle; often?: LayoutRectangle; until?: LayoutRectangle },
  open: MenuId,
  count: number,
): { top: number; left: number; width: number } | null {
  const b = f[open];
  if (!f.card || !b) return null;
  const h = count * ITEM_H + 12;
  const below = f.card.y + b.y + b.height + 4;
  const room = f.back ? f.back.height - 8 : Infinity;
  const top = below + h <= room ? below : Math.max(8, f.card.y + b.y - 4 - h);
  return { top, left: f.card.x + b.x, width: b.width };
}

function MenuButton(props: { id: MenuId; label: string; open: boolean; onPress: () => void; onLayout: (e: { nativeEvent: { layout: LayoutRectangle } }) => void }) {
  return (
    <Pressable
      testID={`remind-${props.id}`}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ expanded: props.open }}
      onPress={props.onPress}
      onLayout={props.onLayout}
      style={({ pressed }) => [styles.pick, pressed && styles.pressed]}
    >
      {/* Whole at 320 px, "How often: Monthly at most" too; at large text it wraps, never cut (tend explore audit 20). */}
      <Text testID={`remind-${props.id}-text`} style={styles.pickText}>{props.label}</Text>
      <Icon name="chevron-down" size={16} color={theme.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 14, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: theme.ink },
  sub: { fontSize: 14, color: theme.muted },
  pick: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.edge },
  pickText: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: theme.ink },
  pressed: { backgroundColor: theme.bg },
  menu: { position: 'absolute', backgroundColor: theme.surface, borderRadius: theme.radius, paddingVertical: 6, elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: ITEM_H, paddingHorizontal: 16 },
  itemText: { flexShrink: 1, fontSize: 16, fontWeight: '600', color: theme.ink },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
