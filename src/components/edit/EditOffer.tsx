import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { offerEdit, offerLeft, offerText, type EditOffer } from '../../lib/editOffer';
import { theme } from '../ui';

/**
 * The Edit offer after a capture (ME23): `show` it with what was kept; it
 * ends by itself after `EDIT_OFFER_MS`, and a new capture replaces it.
 */
export function useEditOffer() {
  const [offer, setOffer] = useState<EditOffer | null>(null);
  useEffect(() => {
    if (!offer) return;
    const t = setTimeout(() => setOffer(null), offerLeft(offer, Date.now()));
    return () => clearTimeout(t);
  }, [offer]);
  return {
    offer,
    show: (kept: { id: string; kind: 'photo' | 'video' }) => setOffer(offerEdit(kept, Date.now())),
    clear: () => setOffer(null),
  };
}

/** The Edit button itself (`capture-edit`), for a place with its own words around it. */
export function EditButton(props: { onPress: () => void; style?: StyleProp<ViewStyle>; light?: boolean }) {
  return (
    <Pressable testID="capture-edit" accessibilityRole="button" accessibilityLabel="Edit" onPress={props.onPress} hitSlop={10} style={[styles.btn, props.light && styles.btnLight, props.style]}>
      <Text style={[styles.btnText, props.light && styles.btnTextLight]}>Edit</Text>
    </Pressable>
  );
}

/** "Photo saved here · Edit" (ME23), in the pills' look. */
export function EditOfferPill(props: { offer: EditOffer; where: 'here' | 'walk' | 'moment'; onEdit: () => void; style?: StyleProp<ViewStyle> }) {
  const text = offerText(props.offer.kind, props.where);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(text);
  }, [text, props.offer.id]);
  return (
    <View style={[styles.pill, props.style]} accessibilityLiveRegion="polite" testID="capture-offer">
      <Text style={styles.text}>{text}</Text>
      <EditButton onPress={props.onEdit} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.ink, borderRadius: 999, maxWidth: '100%',
    paddingVertical: 8, paddingLeft: 16, paddingRight: 8,
  },
  text: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  btn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  btnLight: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnTextLight: { color: theme.ink },
});
