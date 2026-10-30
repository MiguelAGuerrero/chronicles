import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, Button, theme } from '../components/ui';
import { db } from '../lib/db';
import { newId } from '../lib/id';
import { recorder } from '../lib/recorder';
import { formatDistance, formatDuration, loadSummary, suggestTitle, type WalkSummary } from '../lib/summary';
import type { Walk } from '../lib/types';

type Row = Pick<WalkSummary, 'walk' | 'distanceM' | 'durationMs' | 'newStreets'> & { captures: number };

export default function Log() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Walk | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        const walks = await db.listWalks();
        const openWalk = walks.find((w) => w.open) ?? null;
        const done = await Promise.all(walks.filter((w) => !w.open).map((w) => loadSummary(w.id)));
        if (!live) return;
        setOpen(openWalk);
        setRows(
          done
            .filter((s): s is WalkSummary => s != null)
            .map((s) => ({ walk: s.walk, distanceM: s.distanceM, durationMs: s.durationMs, newStreets: s.newStreets, captures: s.captures.length })),
        );
      })();
      return () => {
        live = false;
      };
    }, []),
  );

  const start = async () => {
    setError(null);
    setStarting(true);
    const id = newId();
    try {
      await recorder.start(id);
      await db.createWalk({ id, started_at: Date.now(), ended_at: null, title: null, epilogue: null, open: true, area: null });
      router.push('/walk');
    } catch (e) {
      await recorder.stop().catch(() => {});
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  };

  const { background } = recorder.capabilities;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={rows}
      keyExtractor={(r) => r.walk.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.lede}>Tap start, walk, capture, tap stop. The fog clears when you stop.</Text>
          {!background && (
            <Banner>
              Web version: your walk is traced live while this tab is open and visible, and the screen is kept awake.
              Hiding the tab or locking the phone pauses tracing. The phone app keeps recording in your pocket.
            </Banner>
          )}
          {error && <Banner tone="error">{error}</Banner>}
          {open ? (
            <Button testID="resume" label="Return to the open walk" onPress={() => router.push('/walk')} />
          ) : (
            <View style={styles.actions}>
              <Button testID="start" label="Start walk" onPress={start} busy={starting} />
            </View>
          )}
          <Text style={styles.section}>Walks</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No walks yet. Your first one will show up here.</Text>}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/replay/${item.walk.id}?ceremony=0`)}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.cardTitle}>{item.walk.title ?? suggestTitle(item.walk)}</Text>
          <Text style={styles.cardMeta}>
            {new Date(item.walk.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}{formatDistance(item.distanceM)} · {formatDuration(item.durationMs)}
            {' · '}{item.newStreets} new {item.newStreets === 1 ? 'street' : 'streets'}
            {item.captures ? ` · ${item.captures} ${item.captures === 1 ? 'capture' : 'captures'}` : ''}
          </Text>
          {item.walk.epilogue ? <Text style={styles.epilogue}>“{item.walk.epilogue}”</Text> : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { gap: 12, marginBottom: 4 },
  lede: { color: theme.muted, fontSize: 15, lineHeight: 21 },
  actions: { gap: 10 },
  section: { marginTop: 12, fontSize: 13, fontWeight: '700', color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  empty: { color: theme.muted, fontSize: 15, paddingVertical: 24, textAlign: 'center' },
  card: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 14, gap: 4, borderWidth: 1, borderColor: theme.line },
  cardTitle: { fontSize: 17, fontWeight: '600', color: theme.ink },
  cardMeta: { fontSize: 13, color: theme.muted },
  epilogue: { fontSize: 14, color: theme.ink, fontStyle: 'italic', marginTop: 4 },
});
