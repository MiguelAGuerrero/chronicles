import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { boundsOf } from '../../lib/geo';
import { getLastFix } from '../../lib/lastFix';
import { refResolver } from '../../lib/refPlaces';
import { pointPayload } from '../../lib/refKeywords';
import type { LngLat } from '../../lib/types';
import { Icon } from '../icons';
import { WalkMap } from '../map/WalkMap';
import { Button, theme } from '../ui';

const NONE: never[] = [];
/** What a spot picked on the map is called when the owner gives it no name. */
const UNNAMED_SPOT = 'a spot on the map';

/**
 * The resolution picker (specs/reference-keywords RK10, RK18): the notable places near the moment's fix, nearest first,
 * each with how far in words, never a number or "closest"; and "Choose on the map", one tap on a point, named if the
 * owner likes. It opens at the moment's fix or the last one known and never reads a new one (RK15). Drawn inside the
 * editor's or the viewer's Modal, never as a second one.
 */
export function RefResolve(props: {
  fix: { saved: LngLat | null; stamp: LngLat | null };
  title: string;
  onPick: (r: { value: string; payload: string }) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState<{ name: string; at: LngLat; how: string }[] | null>(null);
  const [mapping, setMapping] = useState(false);
  const [point, setPoint] = useState<LngLat | null>(null);
  const [name, setName] = useState('');
  const { saved, stamp } = props.fix;
  useEffect(() => {
    let alive = true;
    void refResolver.nearby({ saved, stamp }).then((list) => alive && setPlaces(list));
    return () => {
      alive = false;
    };
  }, [saved, stamp]);
  const around = saved ?? stamp ?? getLastFix()?.at ?? null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.back, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.card} testID="ref-resolve" accessibilityViewIsModal>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">{mapping ? 'Choose on the map' : props.title}</Text>
          <Pressable testID="ref-resolve-close" accessibilityRole="button" accessibilityLabel="Close" onPress={props.onClose} hitSlop={8} style={styles.x}>
            <Icon name="close" size={22} color={theme.ink} />
          </Pressable>
        </View>
        {mapping ? (
          <>
            <View style={styles.map} testID="ref-map">
              <WalkMap
                trace={NONE}
                walked={NONE}
                fog={NONE}
                captures={NONE}
                fitBounds={around ? boundsOf([around], 300) : null}
                fitKey={1}
                ring={point ? { center: point, radiusM: 12 } : null}
                onPress={(at) => setPoint(at)}
              />
            </View>
            <Text style={styles.sub}>{point ? 'Name it if you like, then use it.' : 'Tap the spot you meant.'}</Text>
            <TextInput
              testID="ref-map-name"
              value={name}
              onChangeText={setName}
              placeholder={UNNAMED_SPOT}
              placeholderTextColor={theme.muted}
              accessibilityLabel="Name this spot"
              style={styles.input}
            />
            <View style={styles.actions}>
              <Button variant="ghost" label="Back" onPress={() => setMapping(false)} />
              <Button testID="ref-map-use" label="Use this spot" disabled={!point} onPress={() => point && props.onPick({ value: name.trim() || UNNAMED_SPOT, payload: pointPayload(point) })} />
            </View>
          </>
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
            {places?.map((p, i) => (
              <Pressable
                key={`${p.name}${i}`}
                testID="ref-resolve-row"
                accessibilityRole="button"
                accessibilityLabel={`${p.name}, ${p.how}`}
                onPress={() => props.onPick({ value: p.name, payload: pointPayload(p.at) })}
                style={styles.row}
              >
                <Text style={styles.name} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.sub}>{p.how}</Text>
              </Pressable>
            ))}
            {places && places.length === 0 ? <Text style={styles.sub}>No place close by.</Text> : null}
            <Pressable testID="ref-choose-map" accessibilityRole="button" onPress={() => setMapping(true)} style={styles.row}>
              <Text style={styles.name}>Choose on the map</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { backgroundColor: 'rgba(20,24,32,0.7)', paddingHorizontal: 12, alignItems: 'center' },
  card: { width: '100%', maxWidth: 520, flex: 1, backgroundColor: theme.surface, borderRadius: 18, padding: 12, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: theme.ink, fontSize: 17, fontWeight: '700', flex: 1 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  pad: { gap: 6, paddingBottom: 8 },
  row: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.line, gap: 2 },
  name: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  sub: { color: theme.muted, fontSize: 13 },
  map: { flex: 1, borderRadius: 12, overflow: 'hidden', minHeight: 240 },
  input: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.edge, borderRadius: 12, paddingHorizontal: 12, minHeight: 48, color: theme.ink, fontSize: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
