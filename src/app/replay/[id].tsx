import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WalkMap } from '../../components/map/WalkMap';
import type { MapCapture } from '../../components/map/types';
import { Button, theme } from '../../components/ui';
import { db } from '../../lib/db';
import { positionAt } from '../../lib/geo';
import { cursorAt, FOG_MS, schedule, traceUntil, type Cursor } from '../../lib/replay';
import { formatDistance, formatDuration, loadSummary, suggestTitle, type WalkSummary } from '../../lib/summary';
import type { Capture, LngLat } from '../../lib/types';

type Beat = 'loading' | 'fog' | 'path' | 'card' | 'name';
const FRAME_MS = 66; // ~15 fps keeps the map responsive on a phone

export default function Replay() {
  const { id, ceremony } = useLocalSearchParams<{ id: string; ceremony?: string }>();
  const insets = useSafeAreaInsets();
  const [s, setS] = useState<WalkSummary | null>(null);
  const [beat, setBeat] = useState<Beat>('loading');
  const [clock, setClock] = useState(0);
  const [title, setTitle] = useState('');
  const [epilogue, setEpilogue] = useState('');
  const player = useRef<AudioPlayer | null>(null);
  const played = useRef(new Set<string>());
  // Opened from the log: the replay runs the same, and ends on the card.
  const rewatch = ceremony === '0';

  useEffect(() => {
    loadSummary(id).then((sum) => {
      setS(sum);
      if (sum) {
        setTitle(sum.walk.title ?? suggestTitle(sum.walk));
        setEpilogue(sum.walk.epilogue ?? '');
        setBeat('fog');
      }
    });
  }, [id]);

  const sched = useMemo(() => (s ? schedule(s.fixes, s.captures, s.walk.started_at) : null), [s]);
  const timedRuns = useMemo(() => {
    if (!s) return [];
    const runs: { t: number; p: LngLat }[][] = [];
    s.fixes.forEach((f, i) => {
      if (i === 0 || f.t - s.fixes[i - 1].t > 60_000) runs.push([]);
      runs[runs.length - 1].push({ t: f.t, p: [f.lon, f.lat] });
    });
    return runs;
  }, [s]);

  // One clock drives beats one to three; it restarts at each beat.
  useEffect(() => {
    if (beat !== 'fog' && beat !== 'path') return;
    const t0 = Date.now();
    setClock(0);
    const timer = setInterval(() => setClock(Date.now() - t0), FRAME_MS);
    return () => clearInterval(timer);
  }, [beat]);

  useEffect(() => {
    if (beat === 'fog' && clock >= FOG_MS) setBeat('path');
  }, [beat, clock]);

  const cursor: Cursor | null = sched && beat === 'path' ? cursorAt(sched, clock) : null;
  useEffect(() => {
    if (cursor?.kind === 'done') setBeat('card');
  }, [cursor?.kind]);

  // Voice memos play during their pause, in your own voice.
  const pausedIndex = cursor?.kind === 'paused' ? cursor.index : null;
  useEffect(() => {
    if (pausedIndex == null || cursor?.kind !== 'paused') return;
    const memo = cursor.group.captures.find((c) => c.kind === 'voice' && c.file_path);
    if (!memo || played.current.has(memo.id)) return;
    played.current.add(memo.id);
    player.current?.remove();
    player.current = createAudioPlayer(memo.file_path!);
    player.current.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pausedIndex]);
  useEffect(() => () => player.current?.remove(), []);

  const walkT = cursor?.walkT ?? (beat === 'card' || beat === 'name' ? sched?.end ?? 0 : sched?.start ?? 0);
  const trace = useMemo(
    () => (beat === 'fog' || beat === 'loading' ? [] : traceUntil(timedRuns, walkT)),
    [beat, timedRuns, walkT],
  );
  const walker = beat === 'path' && s ? positionAt(s.fixes, walkT) : null;

  // Beat one: the walked streets light up out of the grey, in the order walked.
  const shownWalked = useMemo(() => {
    if (!s) return [];
    if (beat !== 'fog') return s.walked;
    return s.walked.slice(0, Math.ceil(s.walked.length * Math.min(1, clock / (FOG_MS * 0.8))));
  }, [s, beat, clock]);
  const fog = useMemo(() => {
    if (!s) return [];
    if (beat !== 'fog') return s.fog;
    const lit = new Set(shownWalked.map((w) => w.id));
    return [...s.fog, ...s.walked.filter((w) => !lit.has(w.id))];
  }, [s, beat, shownWalked]);

  const passed: MapCapture[] = useMemo(
    () =>
      (s?.captures ?? [])
        .filter((c) => c.lat != null && c.lon != null && (beat === 'card' || beat === 'name' || c.t <= walkT))
        .map((c) => ({ id: c.id, kind: c.kind, lngLat: [c.lon!, c.lat!] as LngLat })),
    [s, beat, walkT],
  );

  if (!s || !sched) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.muted}>{beat === 'loading' && s === null ? 'Clearing the fog…' : 'Walk not found.'}</Text>
      </View>
    );
  }

  const counts = { photo: 0, voice: 0, text: 0 };
  for (const c of s.captures) counts[c.kind]++;

  const save = async () => {
    await db.updateWalk(s.walk.id, { title: title.trim() || suggestTitle(s.walk), epilogue: epilogue.trim() || null });
    router.replace('/');
  };

  return (
    <View style={styles.screen}>
      <WalkMap
        trace={trace}
        walked={shownWalked}
        fog={fog}
        captures={passed}
        walker={walker}
        follow={beat === 'path' ? walker : null}
        fitBounds={beat === 'fog' || beat === 'card' ? s.bounds : null}
        initialCenter={s.fixes[0] ? [s.fixes[0].lon, s.fixes[0].lat] : undefined}
        veil
      />

      {beat === 'fog' && (
        <View style={[styles.headline, { top: insets.top + 24 }]} pointerEvents="none">
          <Text style={styles.headlineNumber}>{s.newStreets}</Text>
          <Text style={styles.headlineLabel}>{s.newStreets === 1 ? 'new street' : 'new streets'}</Text>
        </View>
      )}

      {cursor?.kind === 'paused' && <CaptureMoment captures={cursor.group.captures} />}

      {(beat === 'fog' || beat === 'path') && (
        <View style={[styles.skip, { top: insets.top + 12 }]}>
          <Button testID="skip" variant="secondary" label="Skip" onPress={() => setBeat('card')} />
        </View>
      )}

      {(beat === 'card' || beat === 'name') && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
          pointerEvents="box-none"
        >
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={[styles.sheetContent, { paddingBottom: 16 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
          >
            {beat === 'card' ? (
              <>
                <Text style={styles.cardTitle}>{s.walk.title ?? suggestTitle(s.walk)}</Text>
                <View style={styles.grid}>
                  <Stat value={String(s.newStreets)} label={s.newStreets === 1 ? 'new street' : 'new streets'} strong />
                  <Stat value={String(s.streetsWalked)} label="streets walked" />
                  <Stat value={formatDistance(s.distanceM)} label="distance" />
                  <Stat value={formatDuration(s.durationMs)} label="time" />
                  <Stat value={String(counts.photo)} label={counts.photo === 1 ? 'photo' : 'photos'} />
                  <Stat value={String(counts.voice)} label={counts.voice === 1 ? 'voice memo' : 'voice memos'} />
                  <Stat value={String(counts.text)} label={counts.text === 1 ? 'note' : 'notes'} />
                </View>
                {s.walk.epilogue ? <Text style={styles.epilogue}>“{s.walk.epilogue}”</Text> : null}
                <View style={styles.row}>
                  <Button variant="secondary" style={styles.flex} label="Watch again" onPress={() => { played.current.clear(); setBeat('fog'); }} />
                  {rewatch ? (
                    <Button testID="done" style={styles.flex} label="Done" onPress={() => router.back()} />
                  ) : (
                    <Button testID="to-name" style={styles.flex} label="Name it" onPress={() => setBeat('name')} />
                  )}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Name this walk</Text>
                <TextInput testID="title-input" value={title} onChangeText={setTitle} style={styles.input} />
                <Text style={styles.label}>One line, while the feeling is fresh</Text>
                <TextInput
                  testID="epilogue-input"
                  value={epilogue}
                  onChangeText={setEpilogue}
                  placeholder="The bakery was closed, the river was not."
                  placeholderTextColor={theme.muted}
                  style={styles.input}
                />
                <Button testID="save" label="Keep it" onPress={save} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function CaptureMoment({ captures }: { captures: Capture[] }) {
  const photo = captures.find((c) => c.kind === 'photo' && c.file_path);
  const notes = captures.filter((c) => c.kind === 'text');
  const voices = captures.filter((c) => c.kind === 'voice');
  return (
    <View style={styles.moment} pointerEvents="none">
      {photo && <Image source={{ uri: photo.file_path! }} style={styles.photo} resizeMode="cover" />}
      <View style={styles.momentText}>
        {notes.map((n) => (
          <Text key={n.id} style={styles.note}>{n.body}</Text>
        ))}
        {voices.map((v) => (
          <Text key={v.id} style={styles.voice}>
            ▶ Voice memo, {Math.round((Number(v.body) || 0) / 1000)} s
          </Text>
        ))}
        <Text style={styles.momentTime}>
          {new Date(captures[0].t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

function Stat({ value, label, strong }: { value: string; label: string; strong?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, strong && { color: theme.accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { color: theme.muted, fontSize: 16 },
  headline: { position: 'absolute', alignSelf: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 24 },
  headlineNumber: { fontSize: 56, fontWeight: '800', color: theme.accent, fontVariant: ['tabular-nums'] },
  headlineLabel: { fontSize: 16, color: theme.ink, fontWeight: '600' },
  skip: { position: 'absolute', right: 12 },
  moment: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,24,32,0.55)', justifyContent: 'flex-end' },
  photo: { ...StyleSheet.absoluteFill },
  momentText: { margin: 16, padding: 16, gap: 8, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: theme.radius, maxWidth: 560, alignSelf: 'center', width: '92%' },
  note: { fontSize: 20, lineHeight: 27, color: theme.ink },
  voice: { fontSize: 16, color: '#7b2cbf', fontWeight: '600' },
  momentTime: { fontSize: 13, color: theme.muted },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '70%' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetContent: { padding: 16, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: theme.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { minWidth: 96, flexGrow: 1, flexBasis: '30%', backgroundColor: theme.bg, borderRadius: 12, padding: 10 },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.ink, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, color: theme.muted },
  epilogue: { fontSize: 15, fontStyle: 'italic', color: theme.ink },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: theme.muted },
  input: { borderWidth: 1, borderColor: theme.line, borderRadius: 10, padding: 12, fontSize: 16, color: theme.ink },
});
