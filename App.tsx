import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import WalkRecorder, {
  isMarker,
  type Authorization,
  type RecorderStatus,
  type TracePoint,
} from './modules/walk-recorder';
import { createWalk, importTrace, listWalks, type WalkRow } from './src/db';
import { distance, haversine, isUsable, MAX_GAP_MS } from './src/trace';

function newWalkId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <WalkScreen />
    </SafeAreaProvider>
  );
}

function WalkScreen() {
  const dark = useColorScheme() === 'dark';
  const colors = dark ? DARK : LIGHT;

  const [auth, setAuth] = useState<Authorization>(() => WalkRecorder.getAuthorization());
  const [status, setStatus] = useState<RecorderStatus>(() => WalkRecorder.getStatus());
  const [meters, setMeters] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [walks, setWalks] = useState<WalkRow[]>([]);
  const [busy, setBusy] = useState(false);
  const lastUsable = useRef<TracePoint | null>(null);

  const refreshWalks = useCallback(async () => {
    setWalks(await listWalks());
  }, []);

  // Rebuild the live distance from the trace file, e.g. after a resume.
  const recomputeFromTrace = useCallback(async (walkId: string) => {
    const lines = await WalkRecorder.readTrace(walkId);
    const points = lines.filter((l): l is TracePoint => !isMarker(l));
    setMeters(distance(points));
    lastUsable.current = [...points].reverse().find(isUsable) ?? null;
  }, []);

  useEffect(() => {
    refreshWalks();
    const current = WalkRecorder.getStatus();
    if (current.recording && current.walkId) {
      createWalk(current.walkId, current.startedAt ?? Date.now());
      recomputeFromTrace(current.walkId);
    }

    const subs = [
      WalkRecorder.addListener('onLocation', (point) => {
        setStatus((s) => ({ ...s, pointCount: s.pointCount + 1, lastLocation: point }));
        if (!isUsable(point)) return;
        const prev = lastUsable.current;
        if (prev && point.t - prev.t <= MAX_GAP_MS) {
          const d = haversine(prev, point);
          setMeters((m) => m + d);
        }
        lastUsable.current = point;
      }),
      WalkRecorder.addListener('onStateChange', (next) => setStatus(next)),
      WalkRecorder.addListener('onAuthorizationChange', () => setAuth(WalkRecorder.getAuthorization())),
    ];
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setStatus(WalkRecorder.getStatus());
        setAuth(WalkRecorder.getAuthorization());
      }
    });
    return () => {
      subs.forEach((s) => s.remove());
      appState.remove();
    };
  }, [refreshWalks, recomputeFromTrace]);

  useEffect(() => {
    if (!status.recording) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status.recording]);

  const ensurePermission = useCallback(async () => {
    let current = WalkRecorder.getAuthorization().status;
    if (current === 'notDetermined') {
      current = await WalkRecorder.requestWhenInUse();
    }
    if (current === 'whenInUse') {
      // iOS shows this upgrade prompt only once per install.
      current = await WalkRecorder.requestAlways();
    }
    setAuth(WalkRecorder.getAuthorization());
    return current === 'whenInUse' || current === 'always';
  }, []);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      if (!(await ensurePermission())) {
        Alert.alert('Location is off', 'Allow location for Chronicles in Settings to record walks.');
        return;
      }
      const id = newWalkId();
      const startedAt = Date.now();
      await createWalk(id, startedAt);
      setMeters(0);
      lastUsable.current = null;
      setStatus(await WalkRecorder.startWalk(id));
    } finally {
      setBusy(false);
    }
  }, [ensurePermission]);

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      const walkId = await WalkRecorder.stopWalk();
      if (walkId) {
        await importTrace(walkId, await WalkRecorder.readTrace(walkId));
        await refreshWalks();
      }
      setStatus(WalkRecorder.getStatus());
    } finally {
      setBusy(false);
    }
  }, [refreshWalks]);

  const testNotification = useCallback(async () => {
    const granted = await WalkRecorder.requestNotificationPermission();
    if (!granted) {
      Alert.alert('Notifications are off', 'Allow notifications for Chronicles in Settings.');
      return;
    }
    await WalkRecorder.scheduleTestNotification(15, 'Test notification: delivered while the phone was locked.');
    Alert.alert('Scheduled', 'Lock the phone now. A notification should arrive in 15 seconds.');
  }, []);

  const last = status.lastLocation;
  const elapsed = status.recording && status.startedAt ? now - status.startedAt : 0;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]}>Chronicles</Text>
        <Text style={[styles.subtle, { color: colors.muted }]}>
          Location: {auth.status} ({auth.accuracy} accuracy)
        </Text>

        <View style={[styles.card, { borderColor: colors.border }]}>
          <Text style={[styles.big, { color: colors.text }]}>
            {status.recording ? formatDuration(elapsed) : 'Not walking'}
          </Text>
          {status.recording && (
            <>
              <Text style={[styles.line, { color: colors.text }]}>
                {formatDistance(meters)} · {status.pointCount} fixes
                {status.stationary ? ' · stationary' : ''}
              </Text>
              <Text style={[styles.subtle, { color: colors.muted }]}>
                {last
                  ? `Last fix ±${Math.round(last.acc)} m, ${Math.round((now - last.t) / 1000)} s ago`
                  : 'Waiting for the first fix…'}
              </Text>
            </>
          )}
        </View>

        <Pressable
          disabled={busy}
          onPress={status.recording ? stop : start}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: status.recording ? colors.stop : colors.accent, opacity: pressed || busy ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.primaryText}>{status.recording ? 'Stop walk' : 'Start walk'}</Text>
        </Pressable>

        <Pressable onPress={testNotification} style={[styles.secondary, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text }}>Send a test notification in 15 s</Text>
        </Pressable>

        <Text style={[styles.section, { color: colors.muted }]}>Walks</Text>
        <FlatList
          data={walks}
          keyExtractor={(w) => w.id}
          ListEmptyComponent={<Text style={{ color: colors.muted }}>No walks yet.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text }}>{new Date(item.started_at).toLocaleString()}</Text>
              <Text style={{ color: colors.muted }}>
                {item.open
                  ? 'in progress'
                  : `${formatDuration((item.ended_at ?? item.started_at) - item.started_at)} · ${item.points} fixes`}
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const LIGHT = { bg: '#ffffff', text: '#111111', muted: '#6b6b6b', border: '#dddddd', accent: '#2f6fde', stop: '#c2412d' };
const DARK = { bg: '#0f0f10', text: '#f2f2f2', muted: '#9a9a9a', border: '#2c2c2e', accent: '#4c86f0', stop: '#d9573f' };

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  subtle: { fontSize: 13 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 6 },
  big: { fontSize: 36, fontWeight: '600', fontVariant: ['tabular-nums'] },
  line: { fontSize: 16 },
  primary: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
  secondary: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  section: { marginTop: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, gap: 2 },
});
