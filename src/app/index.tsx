import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, Button, theme } from '../components/ui';
import { db } from '../lib/db';
import { recorder } from '../lib/recorder';
import { RecorderError } from '../lib/recorder/types';
import { startWalk } from '../lib/session';
import { formatCaptures, formatDistance, formatDuration, suggestTitle } from '../lib/summary';
import { pausedMs } from '../lib/geo';
import type { Pause, Walk, WalkSummary } from '../lib/types';

type Row = { walk: Walk; summary: WalkSummary | null };

export default function Log() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Walk | null>(null);
  const [pauses, setPauses] = useState<Pause[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<{ message: string; openSettings?: boolean } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      let live = true;
      // Reads walks and their stored summaries only: no traces, no media.
      // The open walk's pauses are a handful of rows, read so the time shown is walking time.
      Promise.all([db.listWalks(), db.listSummaries()])
        .then(async ([walks, summaries]) => {
          const openWalk = walks.find((w) => w.open) ?? null;
          const openPauses = openWalk ? await db.getPauses(openWalk.id) : [];
          if (!live) return;
          const byWalk = new Map(summaries.map((s) => [s.walk_id, s]));
          setOpen(openWalk);
          setPauses(openPauses);
          setRows(walks.filter((w) => !w.open).map((walk) => ({ walk, summary: byWalk.get(walk.id) ?? null })));
          setNow(Date.now());
        })
        .catch((e) => live && setError({ message: e instanceof Error ? e.message : String(e) }));
      return () => {
        live = false;
      };
    }, []),
  );

  const start = async () => {
    setError(null);
    setStarting(true);
    try {
      const { warning } = await startWalk();
      router.push(warning ? { pathname: '/walk', params: { warning } } : '/walk');
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : String(e),
        openSettings: e instanceof RecorderError && e.openSettings,
      });
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
          {!open && <Text style={styles.lede}>Tap start, walk, capture, then stop. The fog clears when you stop.</Text>}
          {!background && !open && (
            <Banner>
              On the web, your walk is traced while this page is open and on screen. Switching apps or locking the
              phone pauses it. The phone app keeps recording in your pocket.
            </Banner>
          )}
          {error && (
            <Banner
              tone="error"
              onDismiss={() => setError(null)}
              action={error.openSettings ? { label: 'Open Settings', onPress: () => Linking.openSettings() } : undefined}
            >
              {error.message}
            </Banner>
          )}
          {open ? (
            <Button testID="resume" label="Return to your walk" onPress={() => router.push('/walk')} tall>
              <View style={styles.recordingRow}>
                <View style={styles.dot} />
                <Text style={styles.resumeText}>
                  {pauses.some((p) => p.ended_at == null) ? 'Paused' : 'Recording'} ·{' '}
                  {formatDuration(now - open.started_at - pausedMs(pauses, open.started_at, now))} · Return to walk
                </Text>
              </View>
            </Button>
          ) : (
            <Button testID="start" label="Start walk" onPress={start} busy={starting} busyLabel="Starting…" tall />
          )}
          <Text style={styles.section} accessibilityRole="header">Walks</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No walks yet. Your first one will show up here.</Text>}
      renderItem={({ item }) => {
        const title = item.walk.title ?? suggestTitle(item.walk);
        const s = item.summary;
        const date = new Date(item.walk.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const meta = s
          ? [date, formatDistance(s.distance_m), formatDuration(s.duration_ms), `${s.new_streets} new ${s.new_streets === 1 ? 'street' : 'streets'}`]
              .concat(formatCaptures(s) || [])
              .join(' · ')
          : `${date} · Open to finish reading its streets`;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Replay ${title}`}
            accessibilityHint={meta}
            onPress={() => router.push(`/replay/${item.walk.id}?ceremony=0`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardMeta}>{meta}</Text>
            {item.walk.epilogue ? <Text style={styles.epilogue}>“{item.walk.epilogue}”</Text> : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { gap: 12, marginBottom: 4 },
  lede: { color: theme.muted, fontSize: 15, lineHeight: 21 },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accentInk },
  resumeText: { color: theme.accentInk, fontSize: 16, fontWeight: '600' },
  section: { marginTop: 12, fontSize: 13, fontWeight: '700', color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  empty: { color: theme.muted, fontSize: 15, paddingVertical: 24, textAlign: 'center' },
  card: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 14, gap: 4, borderWidth: 1, borderColor: theme.line },
  cardTitle: { fontSize: 17, fontWeight: '600', color: theme.ink },
  cardMeta: { fontSize: 14, color: theme.muted, lineHeight: 19 },
  epilogue: { fontSize: 15, color: theme.ink, fontStyle: 'italic', marginTop: 4 },
});
